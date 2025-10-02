import { createSignal, onMount, For, Show } from "solid-js";
import { loadPlaylist } from "./lib/parser.js";
import TVStreamer from "./TVStreamer.tsx";
import './ChannelGuide.css';

export function ChannelGuide() {
  const [entries, setEntries] = createSignal<any[]>([]);
  const [err, setErr] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const items = await loadPlaylist();
      setEntries(items);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load playlist");
    }
  });

  return (
    <div class="channel-guide">
      <div class="top-part">
        <div class="program-details">
          <div class="channel">
            <div class="channel-logo">
              <img src="./images/WPVI-TV_logo.png" alt="WPVI-TV Logo" width="100" height="100" />
            </div>
            <div class="channel-info">
              <div class="channel-id">WPVI</div>
              <div class="channel-number">6</div>
            </div>
          </div>
          <div class="program">
            <div class="program-title">Action News at 6</div>
            <div class="program-description">Mon 6:00-7:00pm</div>
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
      <Show when={!err()} fallback={<div class="error">{err()}</div>}>
        <For each={entries()}>
          {(e) => (
            <div class="row">
              <img src={e.tvg?.logo} alt="" width="24" height="24" />
              <span class="name">{e.name ?? "Untitled"}</span>
              <span class="group">{e.group?.title}</span>
              <a href={e.url} target="_blank" rel="noreferrer">{e.url}</a>
            </div>
          )}
        </For>
        <Show when={entries().length === 0}>
          <div>No channels found.</div>
        </Show>
      </Show>
    </div>
  );
}