import { parse } from "iptv-playlist-parser";

let preferredPlaylistUrl = "http://127.0.0.1:8000/playlist.m3u8";

async function loadPlaylist(topEntryIndex) {
  const candidates = [
    preferredPlaylistUrl,
    ...[
      "http://127.0.0.1:8000/playlist.m3u8",
      "http://127.0.0.1:8000/playlist.m3u",
    ].filter((url) => url !== preferredPlaylistUrl),
  ];

  let resp;
  let successfulUrl = "";
  for (const url of candidates) {
    const attempt = await fetch(url);
    if (attempt.ok) {
      resp = attempt;
      successfulUrl = url;
      break;
    }
  }

  if (!resp) {
    throw new Error("Failed to fetch playlist.m3u or playlist.m3u8 from backend");
  }

  preferredPlaylistUrl = successfulUrl;

  const text = await resp.text();
  const playlistObj = parse(text);

  return playlistObj.items;
}

function parseM3UEntry(entry) {
  const [metaLine, url] = entry.split('\n').map(l => l.trim());
  const attributesPart = metaLine.replace(/^#EXTINF:[^ ]+\s*/, '');
  const [, title] = attributesPart.split(',', 2);

  const attrRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;
  const attributes = {};
  let match;
  while ((match = attrRegex.exec(attributesPart)) !== null) {
    attributes[match[1]] = match[2];
  }

  return {
    duration: parseFloat(metaLine.match(/^#EXTINF:(\d+)/)?.[1] || 0),
    title: title?.trim() || '',
    url,
    ...attributes
  };
}

export { loadPlaylist, parseM3UEntry };