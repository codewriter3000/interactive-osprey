// src/lib/epg.ts
import { XMLParser } from "fast-xml-parser";
import dayjs from "dayjs";

export type EpgProgramme = {
  channel: string; // xmltv channel id
  start: Date;
  stop: Date | null;
  title: string;
  desc?: string;
};

export type EpgData = {
  channels: Map<string, string>; // channelId -> display name
  programmesByChannel: Map<string, EpgProgramme[]>; // channelId -> sorted programmes
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  // XMLTV often uses repeated elements; fast-xml-parser handles arrays automatically
});

/** Parse XMLTV date like 20251002 180000 +0000 or 20251002180000 +0000 */
function parseXmltvDate(s?: string): Date | null {
  if (!s) return null;
  // XMLTV formats vary. Common: "YYYYMMDDHHmmss Z" or "YYYYMMDDHHmmssZ"
  // Normalize by removing non-digits except +/- for timezone
  const m = s.match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s?([+\-]\d{4}))?/
  );
  if (!m) return null;
  const [, Y, M, D, h, m2, s2, tz] = m;
  const base = `${Y}-${M}-${D}T${h}:${m2}:${s2}${
    tz ? tz.slice(0, 3) + ":" + tz.slice(3) : "Z"
  }`;
  const d = new Date(base);
  return isNaN(d.getTime()) ? null : d;
}

export async function loadEPG(url: string): Promise<EpgData> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`EPG HTTP ${resp.status} ${resp.statusText}`);
  const xml = await resp.text();

  const obj = parser.parse(xml);
  // Expected structure: obj.tv.channel[] and obj.tv.programme[]
  const tv = obj?.tv ?? {};
  const channelArr = Array.isArray(tv.channel)
    ? tv.channel
    : tv.channel
    ? [tv.channel]
    : [];
  const progArr = Array.isArray(tv.programme)
    ? tv.programme
    : tv.programme
    ? [tv.programme]
    : [];

  const channels = new Map<string, string>();
  for (const ch of channelArr) {
    const id = ch?.id?.toString?.() ?? "";
    // display-name can be string or array; take first
    const dn = Array.isArray(ch?.["display-name"])
      ? ch["display-name"][0]
      : ch?.["display-name"] ?? "";
    if (id) channels.set(id.toLowerCase(), String(dn));
  }

  const programmesByChannel = new Map<string, EpgProgramme[]>();
  for (const p of progArr) {
    const ch = p?.channel?.toString?.();
    if (!ch) continue;
    const start = parseXmltvDate(p?.start);
    const stop = parseXmltvDate(p?.stop);
    function textify(node: any): string {
      if (!node) return "";
      if (typeof node === "string") return node;
      if (typeof node === "object" && "#text" in node)
        return String(node["#text"]);
      return String(node);
    }

    const title = textify(Array.isArray(p?.title) ? p.title[0] : p?.title);
    const desc = textify(Array.isArray(p?.desc) ? p.desc[0] : p?.desc);
    if (!start) continue;

    const entry: EpgProgramme = {
      channel: ch.toLowerCase(),
      start,
      stop,
      title: String(title),
      desc: desc ? String(desc) : undefined,
    };
    if (!programmesByChannel.has(entry.channel))
      programmesByChannel.set(entry.channel, []);
    programmesByChannel.get(entry.channel)!.push(entry);
  }

  // Sort each channel’s programmes by start time
  for (const arr of programmesByChannel.values()) {
    arr.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  return { channels, programmesByChannel };
}

/** Find the current and next programme for a channelId (xmltv channel id, lowercase) */
export function getNowNext(epg: EpgData, channelId: string, now = new Date()) {
  const arr = epg.programmesByChannel.get(channelId.toLowerCase()) ?? [];
  let nowProg: EpgProgramme | undefined;
  let nextProg: EpgProgramme | undefined;

  for (let i = 0; i < arr.length; i++) {
    const p = arr[i];
    const ends = p.stop ? p.stop.getTime() : Number.POSITIVE_INFINITY;
    if (p.start.getTime() <= now.getTime() && now.getTime() < ends) {
      nowProg = p;
      nextProg = arr[i + 1];
      break;
    }
    if (p.start.getTime() > now.getTime()) {
      nextProg = p;
      break;
    }
  }
  return { now: nowProg, next: nextProg };
}

export function normId(s?: string | null) {
  return (s ?? "").trim().toLowerCase();
}

export function normName(s?: string | null) {
  return (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}
