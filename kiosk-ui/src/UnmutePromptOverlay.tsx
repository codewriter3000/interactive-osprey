import { Show } from "solid-js";

function UnmutePromptOverlay({ show, onUnmute }: { show: () => boolean; onUnmute: () => void }) {
  return (
    <Show when={show()}>
      <div class="unmute-prompt-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;z-index:2;">
        <button
          onClick={onUnmute}
          class="unmute-button"
          style="font-size:2rem;padding:1rem 2rem;background:rgba(255,255,0,0.85);border:none;border-radius:1rem;cursor:pointer;"
        >
          Click to unmute
        </button>
      </div>
    </Show>
  );
}

export default UnmutePromptOverlay;
