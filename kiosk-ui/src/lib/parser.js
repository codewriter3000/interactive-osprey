import { parse } from "iptv-playlist-parser";

async function loadPlaylist(topEntryIndex) {
  const resp = await fetch('http://127.0.0.1:8000/playlist.m3u');

  console.log(resp);

  if (!resp.ok) {
    throw new Error(`Failed to fetch playlist: ${resp.statusText}`);
  }

  const text = await resp.text();
  const playlistObj = parse(text);
  console.log(playlistObj);

  const modTopEntryIndex = topEntryIndex % playlistObj.items.length;

  let items = playlistObj.items.slice(modTopEntryIndex, modTopEntryIndex + 5);
  if (items.length < 5) {
    const needed = 5 - items.length;
    const extraItems = playlistObj.items.slice(0, needed);
    items = items.concat(extraItems);
  }
  return items;
}

export { loadPlaylist };