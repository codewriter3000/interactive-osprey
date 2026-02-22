import { createSignal, For, Show, onCleanup, onMount, createEffect } from "solid-js";
import Hls from "hls.js";
import * as dashjs from "dashjs";
import { useChannelStream, useScreenNavigation, useTVContext } from "./contexts/TVContext.tsx";
import { createLogger } from "./lib/logger";
import "./MainMenu.css";

type Props = { onMainMenu?: boolean; inChannelGuide?: boolean; src?: string | null };
const logger = createLogger("MainMenu");

function MainMenu(props: Props) {
  const {
    currentChannel,
  } = useTVContext();
  const { channelStreamUrl } = useChannelStream();

  let videoEl!: HTMLVideoElement;
  let hls: Hls | null = null;
  let dash: dashjs.MediaPlayerClass | null = null;
  let lastUrl: string | null = null;

  const [error, setError] = createSignal(false);
  const isMenuMode = () => props.onMainMenu ?? true;
  const inChannelGuideMode = () => props.inChannelGuide ?? false;
  const viewModeClass = () =>
    inChannelGuideMode() ? "guide-overlay-mode" : isMenuMode() ? "menu-mode" : "watching-mode";
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
        videoEl.load();
      } catch {}
    }
  };

  const startPlayback = (rawUrl: string) => {
    setError(false);
    if (!videoEl || !rawUrl) return;
    if (rawUrl === lastUrl) return;
    lastUrl = rawUrl;

    cleanup();

    if (rawUrl.includes(".m3u8")) {
      if (isSafariLike() && !Hls.isSupported()) {
        videoEl.src = rawUrl;
        videoEl.play().catch(() => {});
        return;
      }

      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          debug: false,
        });

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          const proxied = `/proxy?u=${encodeURIComponent(rawUrl)}`;
          hls!.loadSource(proxied);
        });

        hls.attachMedia(videoEl);

        hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
          const idx = data.levels.findIndex((l) => {
            const c = (l.attrs?.CODECS || l.codecs || "").toLowerCase();
            return c.includes("avc1") && c.includes("mp4a");
          });
          if (idx >= 0) hls!.currentLevel = idx;
          videoEl.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_e, d) => {
          if (d.type === Hls.ErrorTypes.OTHER_ERROR) hls!.recoverMediaError();
          if (d.fatal) {
            if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls!.recoverMediaError();
            if (d.type === Hls.ErrorTypes.NETWORK_ERROR) hls!.recoverMediaError();
            startPlayback(rawUrl);
          }
          setTimeout(() => {
            setError(true);
          }, 3000);
        });

        return;
      }

      return;
    }

    if (rawUrl.endsWith(".mpd")) {
      dash = dashjs.MediaPlayer().create();
      dash.initialize(videoEl, rawUrl, true);
      return;
    }

    videoEl.src = rawUrl;
    videoEl.play().catch(() => {});
  };

  onMount(() => {
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

  const { goToChannelGuide } = useScreenNavigation();
  const menuItems = [
    {
      id: 0,
      name: "CHANNEL GUIDE",
      color: "#63a3af"
    },
    {
      id: 1,
      name: "ON DEMAND",
      color: "#8889b5"
    },
    {
      id: 2,
      name: "ACTIVE RENTALS",
      color: "#846b95"
    },
    {
      id: 3,
      name: "iO GAMES",
      color: "#c58033"
    },
    {
      id: 4,
      name: "ENHANCED TV",
      color: "#6d8cb3"
    },
    {
      id: 5,
      name: "iO SHOWCASE",
      color: "#003d8b"
    }
  ];

  const [selectedMenuItem, setSelectedMenuItem] = createSignal(-1);
  const [isBeingClicked, setIsBeingClicked] = createSignal(false);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      setSelectedMenuItem((prev) => (prev + 1) % menuItems.length);
    } else if (e.key === "ArrowUp") {
      setSelectedMenuItem((prev) => (prev - 1 + menuItems.length) % menuItems.length);
    } else if (e.key === "Enter") {
      clickButton(selectedMenuItem());
    } else if (e.key === "Escape") {
      setSelectedMenuItem(-1);
    }
  }

  const clickButton = (index: number) => {
    if (index < 0 || index >= menuItems.length) return;
    setIsBeingClicked(true);
    setTimeout(() => {
      setIsBeingClicked(false);

      // Handle menu navigation
      switch (index) {
        case 0: // CHANNEL GUIDE
          goToChannelGuide();
          break;
        case 1: // ON DEMAND
        case 2: // ACTIVE RENTALS
        case 3: // iO GAMES
        case 4: // ENHANCED TV
        case 5: // iO SHOWCASE
          // These could navigate to different screens or show not implemented
          logger.info("Selected non-implemented menu item", { item: menuItems[index].name });
          break;
        default:
          break;
      }
    }, 100);
  }

  return (
    <div tabindex={inChannelGuideMode() ? -1 : 0} onKeyDown={handleKeyDown} class={`container ${viewModeClass()}`}>
      <div class="header">
        <div class="menu-heading">
          <div class="top-third">

          </div>
          <div class="middle-third">
            <div class="time">
            {(() => {
                const timeStr = new Date()
                  .toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  .toLowerCase()
                  .replace(" ", "");
                return timeStr[0] === "0" ? timeStr.substring(1) : timeStr;
              })()}
            </div>
          </div>
          <div class="bottom-third">
            <img src="./images/optimum logo white.png" width="50" />
            Select an iO service from the list below.
          </div>
        </div>
        <div class="channel-container">
          <div class="upper-part">

          </div>
          <div class="lower-part">
            <div class="channel-main-menu">
              {currentChannel()?.number}
            </div>
          </div>
        </div>
      </div>
      <div class="main">
        <div class="left-side">
          <div class="right-line"></div>
          <For each={menuItems}>
            {(item, index) => (
              <div
                style={`background-color: ${selectedMenuItem() === index() ? isBeingClicked() ? "#0b1301" : "#e6d318" : ""}; color: ${selectedMenuItem() === index() ? isBeingClicked() ? "#e6d318" : "#0b1301" : ""};`}
                class="menu-item"
              >
                <div>{item.name}</div>
                <div
                  style={`background-color: ${selectedMenuItem() === index() ? item.color : ""} !important;`}
                  class="square"
                  onMouseEnter={() => {
                    setSelectedMenuItem(index());
                  }}
                  onMouseLeave={() => {
                    setSelectedMenuItem(-1);
                  }}
                  onClick={() => {
                    clickButton(selectedMenuItem());
                  }}
                />
              </div>
            )}
          </For>
        </div>
        <div class="main-menu-tv">
          <Show when={!error()} fallback={<>Failed to load</>}>
            <video
              ref={videoEl}
              class={isMenuMode() ? "menu-video" : "fullscreen-video"}
              autoplay
              playsinline
              preload="metadata"
            />
          </Show>
        </div>
      </div>
      <div class="footer">
        <img src="./images/geico ad.png" />
      </div>
    </div>
  );
}

export default MainMenu;
