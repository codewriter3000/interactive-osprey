import { defineConfig, Plugin } from "vite";
import solid from "vite-plugin-solid";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

function isM3U(contentType: string | string[] | undefined, path: string) {
  const ct = (Array.isArray(contentType) ? contentType[0] : contentType || "").toLowerCase();
  return path.endsWith(".m3u8")
      || path.endsWith(".m3u")
      || ct.includes("application/vnd.apple.mpegurl")
      || ct.includes("audio/mpegurl")
      || ct.includes("application/x-mpegurl");
}

function playlistProxy(): Plugin {
  return {
    name: "playlist-proxy-rewrite",
    configureServer(server) {
      server.middlewares.use("/proxy", (req, res) => {
        const reqUrl = new URL(req.url!, "http://localhost");
        const target = reqUrl.searchParams.get("u");
        if (!target) { res.statusCode = 400; return void res.end("Missing ?u="); }

        const upstreamUrl = new URL(target);
        const client = upstreamUrl.protocol === "https:" ? https : http;

        const up = client.request(
          {
            protocol: upstreamUrl.protocol,
            hostname: upstreamUrl.hostname,
            port: upstreamUrl.port || (upstreamUrl.protocol === "https:" ? 443 : 80),
            path: upstreamUrl.pathname + upstreamUrl.search,
            method: "GET",
            headers: {
              "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
              "Accept": "*/*",
              "Referer": "https://pluto.tv/",
              "Origin": "https://pluto.tv",
            },
          },
          (ur) => {
            const contentType = ur.headers["content-type"];
            const rewrite = isM3U(contentType, upstreamUrl.pathname);

            if (!rewrite) {
              // pass-through (segments/keys/mp4/etc.)
              res.statusCode = ur.statusCode || 502;
              for (const [k, v] of Object.entries(ur.headers)) if (v) res.setHeader(k, v as any);
              res.setHeader("Access-Control-Allow-Origin", "*");
              ur.pipe(res);
              return;
            }

            // Buffer playlist text, rewrite each non-# line to /proxy?u=<abs-url>
            const bufs: Buffer[] = [];
            ur.on("data", (c) => bufs.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
            ur.on("end", () => {
              const text = Buffer.concat(bufs).toString("utf8");
              const base = ur.headers["content-location"]
                ? new URL(ur.headers["content-location"] as string, upstreamUrl).toString()
                : upstreamUrl.toString();

              const rewritten = text.split(/\r?\n/).map((line) => {
                if (!line || line.startsWith("#")) return line;
                try {
                  const abs = new URL(line, base).toString();
                  return `/proxy?u=${encodeURIComponent(abs)}`;
                } catch {
                  return line;
                }
              }).join("\n");

              res.statusCode = ur.statusCode || 200;
              res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.end(rewritten);
            });
          }
        );

        up.on("error", (e) => { res.statusCode = 502; res.end("Proxy error: " + e.message); });
        up.end();
      });
    },
  };
}

export default defineConfig({
  server: { port: 5173 },
  plugins: [solid(), playlistProxy()],
  build: {
    sourcemap: true,
  },
});
