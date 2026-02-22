import { For, Show, createSignal, onMount, createEffect } from "solid-js";
import { loadEPG, type EpgData } from "./lib/epg";
import { parseM3UEntry } from "./lib/parser.js";
import { createLogger } from "./lib/logger";

type ProgramsProps = {
  topEntryIndex: () => number;
  entries: () => Array<{ raw: string }>;
};

const logger = createLogger("Programs");

function Programs({ topEntryIndex, entries }: ProgramsProps) {
    const [epg, setEpg] = createSignal<EpgData | null>(null);
    const [loading, setLoading] = createSignal(true);

    onMount(async () => {
        try {
        const epgUrl =
            "/proxy?u=" + encodeURIComponent("http://localhost:8000/epg.xml");
        const data = await loadEPG(epgUrl);
        logger.info("Loaded EPG data", {
          channelCount: data.programmesByChannel?.size ?? 0,
        });
        setEpg(data);
        } catch (e: any) {
            logger.error("Failed to load EPG data", {
              error: e?.message ?? "Unknown error",
            });
        }
    });

    createEffect(() => {
        if (epg()) setLoading(false);
    });

    const programmesForChannel = (channelId: string = "null") => {
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
                  const progs = programmesForChannel(
                    entry["channel-id"]
                  ); // <-- this is an array
                  return (
                    <div
                      class={`program-row ${channelIdx - topEntryIndex() === 2 && "selected-program-row"}`}
                    >
                      <For each={progs}>
                        {(p) => {
                          const start =
                            p.start instanceof Date
                              ? p.start.getTime()
                              : new Date(p.start || 0).getTime();
                          const end =
                            p.stop instanceof Date
                              ? p.stop.getTime()
                              : new Date(p.stop || 0).getTime();
                          const showLength = (end - start) / (60 * 1000);

                          // Temporarily disable filtering to see all programs
                          // TODO: Re-enable these filters once we confirm programs are showing

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