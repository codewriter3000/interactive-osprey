import { For, Show, createSignal, onMount, createEffect } from "solid-js";
import { loadEPG, getNowNext, normId, normName, type EpgData } from "./lib/epg";
import { parseM3UEntry } from "./lib/parser.js";

function Programs({ topEntryIndex, entries }) {
    const [epg, setEpg] = createSignal<EpgData | null>(null);
    const [loading, setLoading] = createSignal(true);

    onMount(async () => {
        try {
        const epgUrl =
            "/proxy?u=" + encodeURIComponent("http://localhost:8000/epg.xml");
        const data = await loadEPG(epgUrl);
        console.log("Loaded EPG data:", data);
        setEpg(data);
        } catch (e: any) {
            console.error(e?.message ?? "Failed to load data");
        }
        console.log("top entry index: ", topEntryIndex());
    });

    createEffect(() => {
        console.log("epg:", epg());
        if (epg()) setLoading(false);
    });

    const programmesForChannel = (id: number, channelId: string = "null") => {
      //console.log("channel id: ", channelId);
      //console.log("epg: ", epg());
      const epgData = epg();
      if (!epgData?.programmesByChannel) return [];

      const matchedChannels = [...Array.from(epgData.programmesByChannel.values())].filter(channel =>
        channel && channel.length > 0 && channel[0]["channel"] === channelId
      );
      // Return the first matched channel's programs (flattened), or empty array
      return matchedChannels.length > 0 ? matchedChannels[0] : [];
    }

    return (<div class="programs">
            <Show when={!loading()} fallback={<div>Loading...</div>}>
              <For
                each={Array.from({ length: 5 }, (_, i) => topEntryIndex() + i)}
              >
                {(channelIdx) => {
                  const entry = parseM3UEntry(entries()[channelIdx % entries().length].raw);
                  console.log("channel ID for entry:", entry["channel-id"]);
                  const progs = programmesForChannel(
                    channelIdx % entries().length, entry["channel-id"]
                  ); // <-- this is an array
                  console.log("progs: ", progs);
                  // console.log("channelIdx:", channelIdx);
                  //console.log("progs:", progs);
                  return (
                    <div
                      class={`program-row ${channelIdx - topEntryIndex() === 2 && "selected-program-row"}`}
                    >
                      <For each={progs}>
                        {(p) => {
                          console.log("p: ", JSON.stringify(p));
                          const now = Date.now();
                          const start =
                            p.start instanceof Date
                              ? p.start.getTime()
                              : new Date(p.start || 0).getTime();
                          const end =
                            p.stop instanceof Date
                              ? p.stop.getTime()
                              : new Date(p.stop || 0).getTime();
                          const showLength = (end - start) / (60 * 1000);

                          // Debug logging
                          console.log("Program:", p.title);
                          console.log("Now:", new Date(now).toISOString());
                          console.log("Start:", new Date(start).toISOString());
                          console.log("End:", new Date(end).toISOString());
                          console.log("End < now:", end < now);
                          console.log("Time diff from start (minutes):", (now - start) / (60 * 1000));
                          console.log("---");

                          // Temporarily disable filtering to see all programs
                          // TODO: Re-enable these filters once we confirm programs are showing

                          // Skip programs that have already ended
                          // if (end < now) {
                          //   console.log("Skipping - program ended");
                          //   return <></>;
                          // }

                          // Show programs that are currently on or starting within 2 hours
                          // const timeDiffFromStart = (now - start) / (60 * 1000);
                          // if (timeDiffFromStart > 120) { // More than 2 hours after start
                          //   console.log("Skipping - too far from start time");
                          //   return <></>;
                          // }                          console.log("Rendering program:", p.title);
                          return (
                            <div
                              class="schedule-block"
                              style={{
                                width:
                                  showLength >= 90
                                    ? "100%"
                                    : `${Math.max((showLength / 90) * 100, 10)}%`, // minimum 10% width for visibility
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
    );
}

export default Programs;