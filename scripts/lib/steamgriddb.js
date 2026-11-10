// SteamGridDB (https://www.steamgriddb.com/api/v2): game search and art lookups, shared by the admin
// server and anything later (a pipeline step) that needs it. Needs an API key (SGDB_API_KEY in .env,
// generated under Preferences → API on steamgriddb.com), sent as a Bearer token.
//
// The API answers without CORS headers, so it can't be called from a web page; the images it points
// to (cdn2.steamgriddb.com) load from any site and are cached for a year, so the site stores only
// the URLs (data/ra/art.json).
//
//   const sgdb = createClient(process.env.SGDB_API_KEY);
//   await sgdb.search('Ring of Fates');           → [{ id, name, year, verified }]
//   await sgdb.grids(35083);                      → [{ id, url, thumb, width, height, style, score, … }]
//   await sgdb.heroes(35083);                     → same shape, ~1920×620
//   await sgdb.squares(35083);                    → same shape, square grids (512×512, 1024×1024)
//   await sgdb.icons(35083);                      → same shape, icons (PNG only, 64–1024 px)
const BASE = 'https://www.steamgriddb.com/api/v2';

// Banner grids in the shape of a Steam store header (460×215, 920×430 at 2×)
const GRID_DIMENSIONS = ['920x430', '460x215'];
// Square grids, for RA games without an icon of their own
const SQUARE_DIMENSIONS = ['512x512', '1024x1024'];

const image = x => ({
    id: x.id, url: x.url, thumb: x.thumb, width: x.width, height: x.height,
    style: x.style, mime: x.mime, score: x.score ?? 0, nsfw: !!x.nsfw, humor: !!x.humor,
    author: x.author?.name ?? null,
});

function createClient(apiKey) {
    if (!apiKey) throw new Error('SGDB_API_KEY is not set');
    const get = async (pathname, params = {}) => {
        const qs = new URLSearchParams(params).toString();
        const res = await fetch(`${BASE}${pathname}${qs ? `?${qs}` : ''}`, { headers: { Authorization: `Bearer ${apiKey}` } });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.success) throw new Error(body?.errors?.join(', ') || `SteamGridDB ${res.status}`);
        return body.data;
    };
    return {
        // Game search by name (RA games have no SteamGridDB id; Steam games could use /games/steam/{appId})
        search: async term => (await get(`/search/autocomplete/${encodeURIComponent(term)}`)).map(g => ({
            id: g.id, name: g.name, verified: !!g.verified,
            year: g.release_date ? new Date(g.release_date * 1000).getUTCFullYear() : null,
        })),
        // Banner grids, best voted first; NSFW and joke images left out
        grids: async gameId => (await get(`/grids/game/${gameId}`, { dimensions: GRID_DIMENSIONS.join(','), nsfw: 'false', humor: 'false' }))
            .map(image).sort((a, b) => b.score - a.score),
        // Wide hero art (blurred behind headers)
        heroes: async gameId => (await get(`/heroes/game/${gameId}`, { nsfw: 'false', humor: 'false' }))
            .map(image).sort((a, b) => b.score - a.score),
        // Square art and icons, for RA games RA has no icon for yet
        squares: async gameId => (await get(`/grids/game/${gameId}`, { dimensions: SQUARE_DIMENSIONS.join(','), nsfw: 'false', humor: 'false' }))
            .map(image).sort((a, b) => b.score - a.score),
        icons: async gameId => (await get(`/icons/game/${gameId}`, { mimes: 'image/png', nsfw: 'false', humor: 'false' }))
            .map(image).sort((a, b) => b.score - a.score),
    };
}

module.exports = { createClient, GRID_DIMENSIONS, SQUARE_DIMENSIONS };
