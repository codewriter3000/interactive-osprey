import {
  createSignal,
  onMount,
  For,
  Show,
  createEffect,
  createResource,
  createMemo,
} from "solid-js";
import { loadPlaylist } from "./lib/parser.js";
import { getDayOfWeek, getMonth } from "./lib/time.js";
import { getChannelName } from "./lib/channelName.js";
import TVStreamer from "./TVStreamer.tsx";
import "./ChannelGuide.css";

export function ChannelGuide() {
  const [topEntryIndex, setTopEntryIndex] = createSignal(0);
  const [channelLogo, setChannelLogo] = createSignal<string | null>(null);
  const [channelName, setChannelName] = createSignal<string | null>(null);
  const [channelNumber, setChannelNumber] = createSignal<string | null>("6");

  const [entriesResource] = createResource(topEntryIndex, async (index) => {
    try {
      //console.log("Loading playlist with topEntryIndex:", index);
      const items = await loadPlaylist(index);
      //console.log("Loaded items:", items);
      return items;
    } catch (error) {
      console.error("Failed to load playlist", error);
      throw error;
    }
  });

  // Memoize the entire entries list
  const entries = createMemo(() => {
    const resourceData = entriesResource();
    return resourceData || [];
  });

  // Memoize the viewable entries slice
  const viewableEntries = createMemo(() => {
    const allEntries = entries();
    if (!allEntries || allEntries.length === 0) return [];
    const itemsCalculated =
      topEntryIndex() > allEntries.length - 5
        ? [
            ...allEntries.slice(topEntryIndex(), allEntries.length),
            ...allEntries.slice(0, 5 - (allEntries.length - topEntryIndex())),
          ]
        : allEntries.slice(topEntryIndex(), topEntryIndex() + 5);

    return itemsCalculated;
  });

  // onMount(async () => {
  //   try {
  //     const items = await loadPlaylist(topEntryIndex());
  //     setEntries(items);
  //   } catch (e: any) {
  //     setErr(e?.message ?? "Failed to load playlist");
  //   }
  // });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      setTopEntryIndex((prev) => {
        return prev < entries().length - 1 ? prev + 1 : 0;
      });
    } else if (e.key === "ArrowUp") {
      setTopEntryIndex((prev) => {
        return prev > 0 ? prev - 1 : entries().length - 1;
      });
    } else if (e.key === "Enter") {
      // Handle channel selection (e.g., change the TV stream)
      console.log("Channel selected:", channelNumber());
    }
  };

  const extractChannelNumber = (raw: string) => {
    const match = raw.match(/channel-number="(\d+)"/);
    return match ? match[1] : null;
  };

  createEffect(() => {
    const entriesData = entries();
    const currentIndex =
      topEntryIndex() === entriesData.length - 2
        ? 0
        : topEntryIndex() === entriesData.length - 1
        ? 1
        : topEntryIndex() + 2;

    if (entriesData && entriesData.length > currentIndex) {
      setChannelLogo(entriesData[currentIndex]?.tvg?.logo ?? null);
      setChannelNumber(
        extractChannelNumber(entriesData[currentIndex]?.raw) ?? null
      );
      setChannelName(getChannelName(channelNumber()));
    } else {
      //console.log('invalid entries error');
    }
  });

  return (
    <div class="channel-guide" onKeyDown={handleKeyDown} tabindex="0">
      <div class="top-part">
        <div class="program-details">
          <div class="channel">
            <div class="channel-logo">
              <img
                src={channelLogo() ?? ""}
                alt="Channel Logo"
                width="100"
                height="100"
              />
              {/* <img src="./images/WPVI-TV_logo.png" alt="WPVI-TV Logo" width="100" height="100" /> */}
            </div>
            <div class="channel-info">
              <div class="channel-id">{channelName()}</div>
              <div class="channel-number">{channelNumber()}</div>
            </div>
          </div>
          <div class="program">
            {/* <div class="program-title">Action News at 6</div>
            <div class="program-description">
              Mon 6:00-7:00pm
              <br />
              Jim Gardner, Rick Williams,
              <br />
              Monica Malpass
            </div> */}
          </div>
        </div>
        <div class="tv-streamer">
          <TVStreamer />
          <div class="status-bar">
            <div class="channel-number">{channelNumber()}</div>
            <div class="date">
              {getDayOfWeek(new Date().getDay())}{" "}
              {getMonth(new Date().getMonth())}/{new Date().getDate()}
            </div>
            <div class="time">
              {new Date()
                .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                .substring(1)
                .toLowerCase()
                .replace(" ", "")}
            </div>
          </div>
        </div>
      </div>
      <div class="bottom-part">
        <div class="channel-list">
          <div class="channel-header">CHANNEL</div>
          <div class="channels">
            <Show
              when={!entriesResource.error}
              fallback={
                <div class="error">
                  {entriesResource.error?.message ?? "Failed to load playlist"}
                </div>
              }
            >
              <For each={viewableEntries() ?? []}>
                {(e, index) => (
                  <div
                    class={`channel-row ${
                      index() === 2 ? "selected-channel" : ""
                    }`}
                  >
                    {/* <img src={e.tvg?.logo} alt="" width="24" height="24" /> */}
                    <span class="name">{e.name ?? "Untitled"}</span>
                    {/* <span class="group">{e.group?.title}</span> */}
                    {/* <a href={e.url} target="_blank" rel="noreferrer">{e.url}</a> */}
                  </div>
                )}
              </For>
              <Show
                when={
                  !entriesResource.loading &&
                  (!viewableEntries() || viewableEntries().length === 0)
                }
              >
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
          <div class="programs"></div>
        </div>
      </div>
      <div class="footer">
        <div>
          <img src="./images/buttons/A.png" />
          Browse By
        </div>
        <div>
          <img src="./images/buttons/B.png" />
          Date{" "}
          <span class="dark-date">
            {getDayOfWeek(new Date().getDay())}{" "}
            {getMonth(new Date().getMonth())}/{new Date().getDate()}
          </span>
        </div>
        <div>
          <img src="./images/buttons/C.png" />↻
        </div>
      </div>
    </div>
  );
}
