import { Show } from "solid-js";
import UnmutePromptOverlay from "./UnmutePromptOverlay";
import ChannelUnavailableMessage from "./ChannelUnavailableMessage";

function MainMenuTV({
  error,
  channelUnavailable,
  showUnmutePrompt,
  videoEl,
  setVideoReady,
  isMenuMode,
  onUnmute
}: {
  error: () => boolean;
  channelUnavailable: () => boolean;
  showUnmutePrompt: () => boolean;
  videoEl: any;
  setVideoReady: (ready: boolean) => void;
  isMenuMode: () => boolean;
  onUnmute: () => void;
}) {
  return (
    <div class="main-menu-tv">
      <Show
        when={!error()}
        fallback={
          <Show when={channelUnavailable()} fallback={<div class="channel-load-failed-message">Failed to load</div>}>
            <ChannelUnavailableMessage />
          </Show>
        }
      >
        <div style="position:relative;">
          <video
            ref={el => {
              if (videoEl && typeof videoEl === "object" && "current" in videoEl) {
                if (el && typeof el === "object" && "play" in el) {
                  videoEl.current = el;
                  setVideoReady(true);
                } else {
                  setVideoReady(false);
                  videoEl.current = null;
                }
              }
            }}
            class={isMenuMode() ? "menu-video" : "fullscreen-video"}
            autoplay
            playsinline
            preload="metadata"
            muted
          />
          <UnmutePromptOverlay show={showUnmutePrompt} onUnmute={onUnmute} />
        </div>
      </Show>
    </div>
  );
}

export default MainMenuTV;
