import { onCleanup, onMount, createEffect, createSignal, Show } from "solid-js";
import Hls from "hls.js";
import dashjs from "dashjs";
import ErrorMessage from "./ErrorMessage";
import { useChannelStream } from "./contexts/TVContext.tsx";
import "./TVStreamer.css";

type Props = { src?: string | null, mainMenu?: boolean };

export default function TVStreamer(props: Props) {
  const { channelStreamUrl } = useChannelStream();
  let videoEl!: HTMLVideoElement;
  let hls: Hls | null = null;
  let dash: dashjs.MediaPlayerClass | null = null;
  let lastUrl: string | null = null;
  const [error, setError] = createSignal(false);

  // Use prop src if provided, otherwise use context
  const streamUrl = () => props.src ?? channelStreamUrl();

  const isSafariLike = () =>
    typeof videoEl?.canPlayType === "function" &&
    !!videoEl.canPlayType("application/vnd.apple.mpegURL");

  const cleanup = () => {
    if (hls) {
      hls.destroy();
      hls = null;
    }
    if (dash) {
      dash.reset();
      dash = null;
    }
    if (videoEl) {
      try {
        videoEl.pause();
        videoEl.removeAttribute("src");
        videoEl.load(); // detach previous resource
      } catch {}
    }
  };

  const startPlayback = (rawUrl: string) => {
    setError(false);
    console.log("Starting playback for URL:", rawUrl);
    if (!videoEl || !rawUrl) return;
    if (rawUrl === lastUrl) return; // debounce same URL
    lastUrl = rawUrl;

    console.log("Starting cleanup before playback");
    cleanup();

    if (rawUrl.includes(".m3u8")) {
        console.log("Ends with .m3u8, using HLS playback");
      // Safari: native HLS
      if (isSafariLike() && !Hls.isSupported()) {
        videoEl.src = rawUrl;
        videoEl.play().catch(() => {});
        return;
      }

      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          // no custom loader here
          debug: true,
        });

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          // IMPORTANT: load the PROXIED URL here
          const proxied = `/proxy?u=${encodeURIComponent(rawUrl)}`; // rawUrl is the Pluto master m3u8
          hls!.loadSource(proxied);
        });

        hls.attachMedia(videoEl);

        hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
          // Prefer AVC/AAC variant (Chrome/Firefox friendly)
          const idx = data.levels.findIndex((l) => {
            const c = (l.attrs?.CODECS || l.codecs || "").toLowerCase();
            return c.includes("avc1") && c.includes("mp4a");
          });
          if (idx >= 0) hls!.currentLevel = idx;
          videoEl.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_e, d) => {
          console.error("[HLS ERROR]", d.type, d.details, d);
          if (d.fatal) {
            if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls!.recoverMediaError();
            else hls!.destroy();
          }
          setTimeout(() => {
            setError(true);
          }, 3000);
        });

        return;
      }

      console.warn("HLS not supported in this browser.");
      return;
    }

    if (rawUrl.endsWith(".mpd")) {
      dash = dashjs.MediaPlayer().create();
      dash.initialize(videoEl, rawUrl, true);
      return;
    }

    // Progressive MP4/WEBM fallback
    videoEl.src = rawUrl;
    videoEl.play().catch(() => {});
  };

  onMount(() => {
    // react to URL changes after the element exists
    createEffect(() => {
      const url = streamUrl();
      if (!url) {
        cleanup();
        return;
      }
      startPlayback(url);
    });
  });

  onCleanup(cleanup);

  return (
    <div
      class={`${props?.mainMenu ? "main-menu-tv" : "television"}`}
    >
      <Show when={!error()} fallback={<></>}>{/*<ErrorMessage />*/}
        <video
            ref={videoEl}
            autoplay
            playsinline
            preload="metadata"
        />
      </Show>
    </div>
  );
}
