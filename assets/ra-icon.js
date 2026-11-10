// RA game icons with the stand-in picked in the admin (ES module). RA serves one placeholder icon for every game
// that has none yet (RA_NO_ICON); for those, data/ra/art.json can hold a square image from SteamGridDB
// (`games[id].icon`). The stand-in shows only while RA still sends the placeholder, so once RA adds a real icon it
// wins without anyone removing the pick. Copies of the rule: index.html (classic script) and
// scripts/build-series.js (Node); keep them in step.
export const RA_NO_ICON = '/Images/000001.png';

// url: the RA icon URL (or path) as the page built it; id: the RA game id; artGames: art.json's `games`
export const raIcon = (url, id, artGames) =>
    (!url || url.endsWith(RA_NO_ICON)) && artGames?.[id]?.icon ? artGames[id].icon.thumb : url;

// Stand-ins are smooth art, not pixel art: assets/ui.css turns pixelated scaling off for SteamGridDB images
