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
import { loadEPG, getNowNext, normId, normName, type EpgData } from "./lib/epg";
import { useTVContext, useScreenNavigation } from "./contexts/TVContext.tsx";

import "./ChannelGuide.css";

export function ChannelGuide() {
  const {
    currentChannel,
    setCurrentChannel,
    channelStreamUrl,
    setChannelStreamUrl
  } = useTVContext();

  const { goToWatchingTV } = useScreenNavigation();

  const [topEntryIndex, setTopEntryIndex] = createSignal(0);
  const [channelLogo, setChannelLogo] = createSignal<string | null>(null);
  const [channelName, setChannelName] = createSignal<string | null>(null);
  const [channelNumber, setChannelNumber] = createSignal<string | null>("10");

  const [epg, setEpg] = createSignal<EpgData | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [err, setErr] = createSignal<string | null>(null);

  const [selectedShowName, setSelectedShowName] = createSignal<string | null>(
    ""
  );
  const [selectedShowDescription, setSelectedShowDescription] = createSignal<
    string | null
  >("");

  onMount(async () => {
    try {
      const epgUrl =
        "/proxy?u=" + encodeURIComponent("http://localhost:8000/epg.xml");
      const data = await loadEPG(epgUrl);
      console.log("Loaded EPG data:", data);
      setEpg(data);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load data");
    }
  });

  createEffect(() => {
    console.log("epg:", epg());
    if (epg()) setLoading(false);
  });

  // const programmesForChannel = (cid: string) =>
  //   epg()?.programmesByChannel.get(cid.toLowerCase()) ?? [];

  const programmesForChannel = (id: number) =>
    [...Array.from(epg()?.programmesByChannel.values())][id] ?? [];

  const [entriesResource] = createResource(topEntryIndex, async (index) => {
    try {
      const items = await loadPlaylist(index);
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

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      setTopEntryIndex((prev) => {
        return prev < entries().length - 1 ? prev + 1 : 0;
      });
    } else if (e.key === "ArrowUp") {
      setTopEntryIndex((prev) => {
        return prev > 0 ? prev - 1 : entries().length - 1;
      });
      const currentIndex =
        topEntryIndex() === entries().length - 2
          ? 0
          : topEntryIndex() === entries().length - 1
          ? 1
          : topEntryIndex() + 2;
      console.log(programmesForChannel(
                    currentIndex % entries().length
                  ));
      setSelectedShowDescription(entries()[currentIndex]?.description ?? null);
    } else if (e.key === "Enter") {
      const currentIndex =
        topEntryIndex() === entries().length - 2
          ? 0
          : topEntryIndex() === entries().length - 1
          ? 1
          : topEntryIndex() + 2;

      const selectedEntry = entries()[currentIndex];
      if (selectedEntry) {
        // Update the TV context with the selected channel
        setCurrentChannel({
          name: selectedEntry.name ?? "Unknown Channel",
          number: extractChannelNumber(selectedEntry.raw) ?? "0",
          logo: selectedEntry.tvg?.logo,
          streamUrl: selectedEntry.url,
          raw: selectedEntry.raw,
          tvg: selectedEntry.tvg,
          group: selectedEntry.group,
          url: selectedEntry.url
        });

        // Set the stream URL (this will auto-navigate to watching TV)
        setChannelStreamUrl(selectedEntry.url ?? "");

        // Explicitly navigate to watching TV
        goToWatchingTV();
      }
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
      const currentEntry = entriesData[currentIndex];
      const channelNum = extractChannelNumber(currentEntry?.raw) ?? null;
      const channelNameValue = getChannelName(channelNum);

      // Update local state for display
      setChannelLogo(currentEntry?.tvg?.logo ?? null);
      setChannelNumber(channelNum);
      setChannelName(channelNameValue);

      // Update the context with current channel info (but don't set stream URL here)
      setCurrentChannel({
        name: currentEntry?.name ?? channelNameValue ?? "Unknown Channel",
        number: channelNum ?? "0",
        logo: currentEntry?.tvg?.logo,
        streamUrl: currentEntry?.url,
        raw: currentEntry?.raw,
        tvg: currentEntry?.tvg,
        group: currentEntry?.group,
        url: currentEntry?.url
      });
    } else {
      //console.log('invalid entries error');
    }
  });

  return (
    <div class="channel-guide" onKeyDown={handleKeyDown} tabindex="0">
      <div class="top-part">
        <div class="program-details">
          <div class="channel">
            <div class="channel-logo" style="background-color: black;">
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
            <div class="program-title">{selectedShowName()}</div>
            <div class="program-description">{selectedShowDescription()}</div>
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
          <TVStreamer mainMenu src={channelStreamUrl()} />
          <div class="status-bar">
            <div class="channel-number">{channelNumber()}</div>
            <div class="date">
              {getDayOfWeek(new Date().getDay())} {new Date().getMonth() + 1}/
              {new Date().getDate()}
            </div>
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
                    <span class="name">{e.name.length > 22 ? e.name.trim().split(' ')[0] : e.name ?? "Untitled"}</span>
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
            <span>
              {(() => {
                const timeStr = new Date()
                  .toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  .toLowerCase()
                  .replace(" ", "");
                return parseInt(timeStr.split(":")[1].substring(0, 2)) < 30
                  ? (parseInt(timeStr.split(":")[0])).toString() + ":00" + timeStr.split(":")[1].substring(2)
                  : (parseInt(timeStr.split(":")[0])).toString() + ":30" + timeStr.split(":")[1].substring(2);
              })()}
            </span>
            <span>
              {(() => {
                const timeStr = new Date()
                  .toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  .toLowerCase()
                  .replace(" ", "");
                return parseInt(timeStr.split(":")[1].substring(0, 2)) < 30
                  ? (parseInt(timeStr.split(":")[0])).toString() + ":30" + timeStr.split(":")[1].substring(2)
                  : (parseInt(timeStr.split(":")[0])+1).toString() + ":00" + timeStr.split(":")[1].substring(2);
              })()}
            </span>
            <span>
              {(() => {
                const timeStr = new Date()
                  .toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  .toLowerCase()
                  .replace(" ", "");
                return parseInt(timeStr.split(":")[1].substring(0, 2)) < 30
                  ? (parseInt(timeStr.split(":")[0])+1).toString() + ":00" + timeStr.split(":")[1].substring(2)
                  : (parseInt(timeStr.split(":")[0])+1).toString() + ":30" + timeStr.split(":")[1].substring(2);
              })()}
            </span>
          </div>
          <div class="programs">
            <Show when={!loading()} fallback={<div>Loading...</div>}>
              <For
                each={Array.from({ length: 5 }, (_, i) => topEntryIndex() + i)}
              >
                {(channelIdx) => {
                  const entry = entries()[channelIdx % entries().length];
                  const progs = programmesForChannel(
                    channelIdx % entries().length
                  ); // <-- this is an array
                  return (
                    <div
                      class={`program-row ${
                        channelIdx - topEntryIndex() === 2 &&
                        "selected-program-row"
                      }`}
                    >
                      <For each={progs}>
                        {(p) => {
                          const now = Date.now();
                          const start =
                            p.start instanceof Date
                              ? p.start.getTime()
                              : new Date(p.start).getTime();
                          const end =
                            p.stop instanceof Date
                              ? p.stop.getTime()
                              : new Date(p.stop).getTime();
                          const showLength = (end - start) / (60 * 1000);
                          // console.log(
                          //   "start time:",
                          //   new Date(start).toLocaleString()
                          // );
                          // console.log(
                          //   "now time:",
                          //   new Date(now).toLocaleString()
                          // );
                          // console.log(
                          //   "time diff (min):",
                          //   (now - start) / (60 * 1000)
                          // );
                          // console.log(
                          //   "end time: ",
                          //   new Date(end).toLocaleString()
                          // );
                          // console.log(
                          //   "show length (min): ",
                          //   Math.round((end - start) / (60 * 1000))
                          // );
                          // console.log("-------");
                          if (end < now) return <></>;
                          if (Math.abs((now - start) / (60 * 1000)) >= 120)
                            return <></>;
                          return (
                            <div
                              class="schedule-block"
                              style={{
                                width:
                                  showLength >= 90
                                    ? "100%"
                                    : `${Math.max(
                                        (showLength / 90) * 100,
                                        10
                                      )}%`, // minimum 10% width for visibility
                              }}
                            >
                              <span>{p.title}</span>
                            </div>
                          );
                        }}
                      </For>
                    </div>
                  );
                }}
              </For>
            </Show>
          </div>
        </div>
      </div>
      <div class="footer-channel-guide">
        <div>
          <img src="./images/buttons/A.png" />
          Browse By
        </div>
        <div>
          <img src="./images/buttons/B.png" />
          Date{" "}
          <span class="dark-date">
            {getDayOfWeek(new Date().getDay())} {new Date().getMonth() + 1}/
            {new Date().getDate()}
          </span>
        </div>
        <div>
          <img src="./images/buttons/C.png" />↻
        </div>
      </div>
    </div>
  );
}
