import { parse } from "iptv-playlist-parser";

async function loadPlaylist() {
  const resp = await fetch('http://127.0.0.1:8000/playlist.m3u');

  console.log(resp);

  if (!resp.ok) {
    throw new Error(`Failed to fetch playlist: ${resp.statusText}`);
  }

  const text = await resp.text();
  const playlistObj = parse(text);
  console.log(playlistObj);
  return playlistObj.items;
}

export { loadPlaylist };