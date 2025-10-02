import { createSignal, onMount, For, Show, createEffect } from "solid-js";
import { loadPlaylist } from "./lib/parser.js";
import TVStreamer from "./TVStreamer.tsx";
import './ChannelGuide.css';

export function ChannelGuide() {
  const [entries, setEntries] = createSignal<any[]>([]);
  const [topEntryIndex, setTopEntryIndex] = createSignal(0);
  const [err, setErr] = createSignal<string | null>(null);
  const [channelLogo, setChannelLogo] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const items = await loadPlaylist(topEntryIndex());
      setEntries(items);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load playlist");
    }
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      setTopEntryIndex((prev) => prev + 1);
    } else if (e.key === "ArrowUp") {
      setTopEntryIndex((prev) => prev - 1);
    }
  }

  createEffect(() => {
    setChannelLogo(entries()[2]?.tvg?.logo ?? null);
  });

  createEffect(async () => {
    try {
      const items = await loadPlaylist(topEntryIndex());
      setEntries(items);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load playlist");
    }
  });

  return (
    <div class="channel-guide" onKeyDown={handleKeyDown} tabindex="0">
      <div class="top-part">
        <div class="program-details">
          <div class="channel">
            <div class="channel-logo">
              <img src={channelLogo() ?? ""} alt="Channel Logo" width="100" height="100" />
              {/* <img src="./images/WPVI-TV_logo.png" alt="WPVI-TV Logo" width="100" height="100" /> */}
            </div>
            <div class="channel-info">
              <div class="channel-id">WPVI</div>
              <div class="channel-number">6</div>
            </div>
          </div>
          <div class="program">
            <div class="program-title">Action News at 6</div>
            <div class="program-description">Mon 6:00-7:00pm<br />Jim Gardner, Rick Williams,<br />Monica Malpass</div>
          </div>
        </div>
        <div class="tv-streamer">
          <TVStreamer />
          <div class="status-bar">
            <div class="channel-number">6</div>
            <div class="date">Mon 9/29</div>
            <div class="time">6:17pm</div>
          </div>
        </div>
      </div>
      <div class="bottom-part">
        <div class="channel-list">
          <div class="channel-header">CHANNEL</div>
          <div class="channels">
            <Show when={!err()} fallback={<div class="error">{err()}</div>}>
              <For each={entries()}>
                {(e, index) => (
                  <div class={`channel-row ${index() === 2 ? 'selected-channel' : ''}`}>
                    {/* <img src={e.tvg?.logo} alt="" width="24" height="24" /> */}
                    <span class="name">{e.name ?? "Untitled"}</span>
                    {/* <span class="group">{e.group?.title}</span> */}
                    {/* <a href={e.url} target="_blank" rel="noreferrer">{e.url}</a> */}
                  </div>
                )}
              </For>
              <Show when={entries().length === 0}>
                <div>No channels found.</div>
              </Show>
            </Show>
          </div>
        </div>
        <div class="program-list">
          <div class="program-header">
            <span>6:00pm</span>
            <span>6:30pm</span>
            <span>7:00pm</span>
          </div>
          <div class="programs">

          </div>
        </div>
      </div>
      <div class="footer">
        <div>
          <img src="./images/buttons/A.png" />
          Browse By
        </div>
        <div>
          <img src="./images/buttons/B.png" />
          Date
        </div>
        <div>
          <img src="./images/buttons/C.png" />
          ↻
        </div>
      </div>
    </div>
  );
}