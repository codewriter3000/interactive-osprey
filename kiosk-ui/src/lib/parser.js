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

export { loadPlaylist };