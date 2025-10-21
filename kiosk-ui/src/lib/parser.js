import { parse } from "iptv-playlist-parser";

async function loadPlaylist(topEntryIndex) {
  const resp = await fetch('http://127.0.0.1:8000/playlist.m3u');

  if (!resp.ok) {
    throw new Error(`Failed to fetch playlist: ${resp.statusText}`);
  }

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