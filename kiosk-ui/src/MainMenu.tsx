import { createSignal, For, Show, onCleanup, onMount, createEffect } from "solid-js";
import Hls, { ErrorTypes, Events } from "hls.js";
import * as dashjs from "dashjs";
import { useChannelStream, useScreenNavigation, useTVContext } from "./contexts/TVContext.tsx";
import ChannelUnavailableMessage from "./ChannelUnavailableMessage";
import { createLogger } from "./lib/logger";
import "./MainMenu.css";
import MainMenuHeader from "./MainMenuHeader";
import MainMenuFooter from "./MainMenuFooter";
import MenuList from "./MenuList";
import MainMenuTV from "./MainMenuTV";

type Props = { onMainMenu?: boolean; inChannelGuide?: boolean; src?: string | null };
const logger = createLogger("MainMenu");

function MainMenu(props: Props) {
  const {
    currentChannel,
  } = useTVContext();
  const { channelStreamUrl } = useChannelStream();

  // Use a ref object for video element
  const videoElRef = { current: null as HTMLVideoElement | null };
  let containerEl!: HTMLDivElement;
  let hls: Hls | null = null;
  let dash: dashjs.MediaPlayerClass | null = null;
  let lastUrl: string | null = null;

  const [error, setError] = createSignal(false);
  const [channelUnavailable, setChannelUnavailable] = createSignal(false);
  const [showUnmutePrompt, setShowUnmutePrompt] = createSignal(false);
  const [videoReady, setVideoReady] = createSignal(false);
  const isMenuMode = () => props.onMainMenu ?? true;
  const inChannelGuideMode = () => props.inChannelGuide ?? false;
  const viewModeClass = () =>
    inChannelGuideMode() ? "guide-overlay-mode" : isMenuMode() ? "menu-mode" : "watching-mode";
  const streamUrl = () => props.src ?? channelStreamUrl();

  const isSafariLike = () =>
    typeof videoElRef.current?.canPlayType === "function" &&
    !!videoElRef.current?.canPlayType("application/vnd.apple.mpegURL");

  const cleanup = () => {
    if (hls) {
      hls.destroy();
      hls = null;
    }
    if (dash) {
      dash.reset();
      dash = null;
    }
    if (videoElRef.current) {
      try {
        videoElRef.current.pause();
        videoElRef.current.removeAttribute("src");
        videoElRef.current.load();
      } catch {}
    }
  };

  const isUnauthorizedError = (errorData: any) =>
    errorData.response?.code === 401 ||
    (typeof errorData.response?.text === "string" && errorData.response.text.includes("401"));

  const startPlayback = (rawUrl: string) => {
    setError(false);
    setChannelUnavailable(false);
    if (!videoReady() || !videoElRef.current || !rawUrl) return;
    if (rawUrl === lastUrl) return;
    lastUrl = rawUrl;

    cleanup();

    if (rawUrl.includes(".m3u8")) {
      if (isSafariLike() && !Hls.isSupported()) {
        videoElRef.current.src = rawUrl;
        videoElRef.current.play?.().catch(() => {});
        return;
      }

      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          debug: false,
        });

        hls.on(Events.MEDIA_ATTACHED, () => {
          const proxied = `/proxy?u=${encodeURIComponent(rawUrl)}`;
          hls!.loadSource(proxied);
        });

        hls.attachMedia(videoElRef.current);

        hls.on(Events.MANIFEST_PARSED, (_e, data) => {
          const idx = data.levels.findIndex((l) => {
            const c = (l.attrs?.CODECS || l.codecs || "").toLowerCase();
            return c.includes("avc1") && c.includes("mp4a");
          });
          if (idx >= 0) hls!.currentLevel = idx;
          videoElRef.current?.play?.().catch(() => {});
        });

        hls.on(Events.ERROR, (_e, d) => {
          if (!d.fatal) return;

          if (isUnauthorizedError(d)) {
            setChannelUnavailable(true);
            setError(true);
            return;
          }

          if (d.type === ErrorTypes.MEDIA_ERROR) {
            hls?.recoverMediaError();
            return;
          }

          if (d.type === ErrorTypes.NETWORK_ERROR) {
            const retryUrl = rawUrl;
            lastUrl = null;
            setTimeout(() => startPlayback(retryUrl), 500);
            return;
          }

          setError(true);
        });

        return;
      }

      return;
    }

    if (rawUrl.endsWith(".mpd")) {
      dash = dashjs.MediaPlayer().create();
      dash.initialize(videoElRef.current, rawUrl, true);
      return;
    }

    videoElRef.current.src = rawUrl;
    videoElRef.current.play?.().catch(() => {});
  };

  createEffect(() => {
    if (!videoReady() || !videoElRef.current) return;
    videoElRef.current.muted = true;
    const handlePlay = () => setShowUnmutePrompt(true);
    const handleVolumeChange = () => {
      if (videoElRef.current && !videoElRef.current.muted) setShowUnmutePrompt(false);
    };
    videoElRef.current.addEventListener("play", handlePlay);
    videoElRef.current.addEventListener("volumechange", handleVolumeChange);
    onCleanup(() => {
      videoElRef.current?.removeEventListener("play", handlePlay);
      videoElRef.current?.removeEventListener("volumechange", handleVolumeChange);
    });
  });

  onMount(() => {
    const onVideoPlaying = () => {
      setError(false);
      setChannelUnavailable(false);
    };
    const onVideoCanPlay = () => {
      setError(false);
      setChannelUnavailable(false);
    };

    createEffect(() => {
      if (!videoReady() || !videoElRef.current) return;
      videoElRef.current.addEventListener("playing", onVideoPlaying);
      videoElRef.current.addEventListener("canplay", onVideoCanPlay);
      onCleanup(() => {
        videoElRef.current?.removeEventListener("playing", onVideoPlaying);
        videoElRef.current?.removeEventListener("canplay", onVideoCanPlay);
      });
    });

    createEffect(() => {
      const url = streamUrl();
      if (!url) {
        cleanup();
        return;
      }
      startPlayback(url);
    });

    createEffect(() => {
      if (isMenuMode() && !inChannelGuideMode()) {
        containerEl?.focus();
      }
    });

    onCleanup(() => {
      videoElRef.current?.removeEventListener("playing", onVideoPlaying);
      videoElRef.current?.removeEventListener("canplay", onVideoCanPlay);
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
    if (!isMenuMode()) return;

    if (e.key === "ArrowDown") {
      setSelectedMenuItem((prev) => (prev < 0 ? 0 : (prev + 1) % menuItems.length));
    } else if (e.key === "ArrowUp") {
      setSelectedMenuItem((prev) => (prev < 0 ? 0 : (prev - 1 + menuItems.length) % menuItems.length));
    } else if (e.key === "Enter") {
      clickButton(selectedMenuItem() < 0 ? 0 : selectedMenuItem());
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
    <div ref={containerEl} tabindex={inChannelGuideMode() ? -1 : 0} onKeyDown={handleKeyDown} class={`container ${viewModeClass()}`}>
      <MainMenuHeader currentChannel={currentChannel()} />
      <div class="main">
        <MenuList
          menuItems={menuItems}
          selectedMenuItem={selectedMenuItem}
          isBeingClicked={isBeingClicked}
          setSelectedMenuItem={setSelectedMenuItem}
          clickButton={clickButton}
        />
        <MainMenuTV
          error={error}
          channelUnavailable={channelUnavailable}
          showUnmutePrompt={showUnmutePrompt}
          videoEl={videoElRef}
          setVideoReady={setVideoReady}
          isMenuMode={isMenuMode}
          onUnmute={() => {
            if (videoElRef.current) videoElRef.current.muted = false;
            setShowUnmutePrompt(false);
          }}
        />
      </div>
      <MainMenuFooter />
    </div>
  );
}

export default MainMenu;
