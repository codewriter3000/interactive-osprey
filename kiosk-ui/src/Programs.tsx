import { For, Show, createSignal, onMount } from "solid-js";
import { loadEPG, normId, normName, type EpgData } from "./lib/epg";
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
    const [loadFailed, setLoadFailed] = createSignal(false);

    onMount(async () => {
        try {
      const epgUrl = "http://127.0.0.1:8000/epg.xml";
        const data = await loadEPG(epgUrl);
        logger.info("Loaded EPG data", {
          channelCount: data.programmesByChannel?.size ?? 0,
        });
        setEpg(data);
        } catch (e: any) {
            logger.error("Failed to load EPG data", {
              error: e?.message ?? "Unknown error",
            });
            setLoadFailed(true);
        } finally {
          setLoading(false);
        }
    });

    const programmesForChannel = (channelId?: string | null, channelName?: string | null) => {
      const epgData = epg();
      if (!epgData?.programmesByChannel) return [];

      const id = normId(channelId);
      if (id) {
        const byId = epgData.programmesByChannel.get(id);
        if (byId && byId.length > 0) return byId;
      }

      const wantedName = normName(channelName);
      if (wantedName) {
        for (const [epgChannelId, epgDisplayName] of epgData.channels.entries()) {
          if (normName(epgDisplayName) === wantedName) {
            const byName = epgData.programmesByChannel.get(epgChannelId);
            if (byName && byName.length > 0) return byName;
          }
        }
      }

      return [];
    }

    return (<div class="programs">
            <Show when={!loading()} fallback={<div>Loading...</div>}>
              <Show when={!loadFailed()} fallback={<div>No program data available.</div>}>
              <For
                each={Array.from({ length: 5 }, (_, i) => topEntryIndex() + i)}
              >
                {(channelIdx) => {
                  const item = entries()[channelIdx % entries().length] as any;
                  const entry = item?.raw ? parseM3UEntry(item.raw) : {};
                  const inferredChannelId =
                    item?.tvg?.id ||
                    item?.["tvg-id"] ||
                    entry["channel-id"] ||
                    entry["tvg-id"];
                  const inferredChannelName = item?.name || entry?.title || null;
                  const progs = programmesForChannel(
                    inferredChannelId,
                    inferredChannelName
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
            </Show>
          </div>
    );
}

export default Programs;