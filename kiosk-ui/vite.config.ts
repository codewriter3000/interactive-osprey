// @ts-nocheck
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import solid from "vite-plugin-solid";
import http from "node:http";
import https from "node:https";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";

function isM3U(contentType: string | string[] | undefined, path: string) {
  const ct = (Array.isArray(contentType) ? contentType[0] : contentType || "").toLowerCase();
  return path.endsWith(".m3u8")
      || path.endsWith(".m3u")
      || ct.includes("application/vnd.apple.mpegurl")
      || ct.includes("audio/mpegurl")
      || ct.includes("application/x-mpegurl");
}

function extractProxyTarget(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;

  const qIndex = rawUrl.indexOf("?");
  if (qIndex < 0) return null;

  const query = rawUrl.slice(qIndex + 1);
  const marker = "u=";
  const markerIndex = query.indexOf(marker);
  if (markerIndex < 0) return null;

  const rawValue = query.slice(markerIndex + marker.length);
  if (!rawValue) return null;

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

function toAbsoluteUrl(value: string, base: string): string {
  return new URL(value, base).toString();
}

function toProxyUrl(absoluteUrl: string): string {
  return `/proxy?u=${encodeURIComponent(absoluteUrl)}`;
}

function rewritePlaylistLine(line: string, base: string): string {
  if (!line) return line;

  if (!line.startsWith("#")) {
    try {
      return toProxyUrl(toAbsoluteUrl(line, base));
    } catch {
      return line;
    }
  }

  if (!line.includes("URI=\"")) return line;

  return line.replace(/URI="([^"]+)"/g, (_match, rawValue: string) => {
    try {
      const abs = toAbsoluteUrl(rawValue, base);
      return `URI="${toProxyUrl(abs)}"`;
    } catch {
      return `URI="${rawValue}"`;
    }
  });
}

function isPlutoStitchUrl(url: URL): boolean {
  return url.hostname.includes("pluto.tv") && url.pathname.includes("/stitch/hls/channel/");
}

function withFreshPlutoSession(url: URL): URL {
  const next = new URL(url.toString());
  next.searchParams.set("sid", randomUUID());
  next.searchParams.set("deviceId", randomUUID());
  next.searchParams.set("clientTime", String(Date.now()));
  return next;
}

function playlistProxy(): Plugin {
  return {
    name: "playlist-proxy-rewrite",
    configureServer(server) {
      server.middlewares.use("/proxy", (req, res) => {
        const target = extractProxyTarget(req.url);
        if (!target) { res.statusCode = 400; return void res.end("Missing ?u="); }

        const requestUpstream = (requestUrl: URL, hasRetried = false) => {
          const client = requestUrl.protocol === "https:" ? https : http;

          const up = client.request(
            {
              protocol: requestUrl.protocol,
              hostname: requestUrl.hostname,
              port: requestUrl.port || (requestUrl.protocol === "https:" ? 443 : 80),
              path: requestUrl.pathname + requestUrl.search,
              method: "GET",
              headers: {
                "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
                "Accept": "*/*",
                "Referer": "https://pluto.tv/",
                "Origin": "https://pluto.tv",
              },
            },
            (ur) => {
              const status = ur.statusCode || 0;
              const shouldRetryPluto401 = status === 401 && !hasRetried && isPlutoStitchUrl(requestUrl);

              if (shouldRetryPluto401) {
                const retriedUrl = withFreshPlutoSession(requestUrl);
                console.warn("[playlist-proxy] retrying Pluto 401 with refreshed session", {
                  from: requestUrl.toString(),
                  to: retriedUrl.toString(),
                });
                ur.resume();
                requestUpstream(retriedUrl, true);
                return;
              }

              if (status >= 400) {
                console.warn("[playlist-proxy] upstream non-2xx", {
                  status,
                  target: requestUrl.toString(),
                });
              }

              const contentType = ur.headers["content-type"];
              const rewrite = isM3U(contentType, requestUrl.pathname);

              if (!rewrite) {
                res.statusCode = ur.statusCode || 502;
                for (const [k, v] of Object.entries(ur.headers)) if (v) res.setHeader(k, v as any);
                res.setHeader("Access-Control-Allow-Origin", "*");
                ur.pipe(res);
                return;
              }

              const bufs: Buffer[] = [];
              ur.on("data", (c) => bufs.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
              ur.on("end", () => {
                const text = Buffer.concat(bufs).toString("utf8");
                const base = ur.headers["content-location"]
                  ? new URL(ur.headers["content-location"] as string, requestUrl).toString()
                  : requestUrl.toString();

                const rewritten = text
                  .split(/\r?\n/)
                  .map((line) => rewritePlaylistLine(line, base))
                  .join("\n");

                res.statusCode = ur.statusCode || 200;
                res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.end(rewritten);
              });
            }
          );

          up.on("error", (e) => {
            if (!res.headersSent) {
              res.statusCode = 502;
              res.end("Proxy error: " + e.message);
            }
          });
          up.end();
        };

        requestUpstream(new URL(target));
      });
    },
  };
}

export default defineConfig({
  server: { port: 5173 },
  plugins: [solid(), playlistProxy()],
  optimizeDeps: {
    esbuildOptions: {
      jsx: "preserve",
      jsxImportSource: "solid-js",
    },
  },
  build: {
    sourcemap: true,
  },
});
