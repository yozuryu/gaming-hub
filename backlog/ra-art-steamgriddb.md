# RA wide art from SteamGridDB

**Status:** Admin built (2026-11-05); site: RA profile tiles + backgrounds, hub / Activity Playing tiles, Completions highlights (2026-11-06). Rows and sheets keep the square icon (decided 2026-11-06) · **Priority:** 10 · Written 2026-11-04

RA games only have a square icon and an in-game screenshot, so every wide spot on the site fakes a banner for them (icon over a blurred screenshot, or a zoomed icon when there's no screenshot). This adds an optional **wide image per RA game**, picked by hand in the admin from [SteamGridDB](https://www.steamgriddb.com/), used wherever a Steam game shows its store banner. A game without an override keeps today's design.

## What was checked (2026-11-04)

- The API is `https://www.steamgriddb.com/api/v2` with a personal **API key** (generated under Preferences on steamgriddb.com), sent as `Authorization: Bearer <key>`. Without a key it answers **401** (probed).
- It **can't be called from a browser page**: the CORS preflight comes back without any `Access-Control-*` headers (probed). The calls have to go through a server, which the admin already has.
- Lookup is **by name** for RA (search, then a SteamGridDB game id); only Steam games can be looked up by their app id. Grid sizes include **460×215** and **920×430**, the shape of a Steam header banner (confirmed in the official Node client's docs). Heroes are wide background art (about 1920×620). Other sizes and styles: confirm against the live API once there's a key.
- Not checked: SteamGridDB's terms on hotlinking their CDN. The plan avoids the question by keeping copies (below).

## Decisions

Recommended defaults, change before building if needed:

1. ~~Copies, not hotlinks.~~ **Changed 2026-11-05: URLs only.** `cdn2.steamgriddb.com` serves images to any site (no hotlink check, `max-age` one year), so `data/ra/art.json` keeps `grid` / `hero` as `{ id, url, thumb, width, height }`; rows and tiles use `thumb` (~54 KB JPEG; the full 920×430 PNG is ~440 KB), headers `url`. Original plan: The admin downloads the chosen image into the repo, `assets/art/ra/{gameId}-grid.jpg` (and `-hero.jpg`), about 50 KB each. The site then doesn't depend on SteamGridDB's uptime or on an upload being deleted.
2. **Used everywhere RA fakes a banner** (see [Where it shows](#where-it-shows)).
3. **Picked by hand, with a suggestion.** The admin pre-fills the best match (top result for the title, then the top-voted 460×215 grid) for you to confirm or change. Hacks, homebrew, prototypes and subsets often aren't on SteamGridDB, so nothing is saved without a confirm.

## Data

New hand-edited file on `main`, next to `guides.json` and `series.json` (not pipeline output, so it is **not** added to `scripts/data-paths.json`; deploy copies main's `data/` as is):

`data/ra/art.json`
```json
{
  "metadata": { "updatedAt": "2026-11-04T00:00:00Z" },
  "games": {
    "16244": { "grid": "assets/art/ra/16244-grid.jpg", "hero": "assets/art/ra/16244-hero.jpg", "sgdbGameId": 5254017, "sgdbGridId": 123456 }
  }
}
```
- Paths are relative to the site root; pages build the URL from their own base (`../`, `../../`).
- `sgdb*` ids are kept so the admin can show what was picked and re-pick.
- Subsets: keyed by the subset's own game id; an entry can point at the parent's image.

## Admin

**Built:** `scripts/lib/steamgriddb.js` (`createClient(key)`: `search`, `grids` (920×430, 460×215, best voted first, no NSFW / humor), `heroes`), admin server routes `GET /api/sgdb/search?q=` and `GET /api/sgdb/images?gameId=&kind=grid|hero` (key read from `.env` per call), RetroAchievements → Art module (pick a banner and an optional hero per game, top match suggested, Save writes `data/ra/art.json`). Probed: grids are PNG, thumbs JPEG.

`scripts/admin-server.js` (local only, port 3131) gets:
- `SGDB_API_KEY` in `.env`, editable through the existing `/api/credentials` route (never printed, never sent to the page).
- `GET /api/sgdb/search?q=` → `/search/autocomplete/{term}`
- `GET /api/sgdb/images?gameId=&kind=grid|hero` → `/grids/game/{id}?dimensions=460x215,920x430` / `/heroes/game/{id}`
- `POST /api/sgdb/save { raGameId, kind, url, sgdbGameId, imageId }` → downloads the image to `assets/art/ra/`, resizes nothing (460×215 or 920×430 as served; prefer 920×430 for sharpness), updates `data/ra/art.json`
- `DELETE /api/sgdb/save?raGameId=&kind=` → removes the override (file and entry)
- `data/ra/art.json` added to the `ALLOWED` whitelist

`admin/index.html`, new **RA art** section:
- List of RA games (from `/api/games/ra`), filter "without art / with art", search
- Per game: current look vs. override preview at tile size, a SteamGridDB search box pre-filled with the parsed title (`parseTitle`: no `~Hack~` tags, no `[Subset …]`), results as a thumbnail grid, pick grid and optional hero, Save / Remove
- Suggest button fills the top match; nothing saves until confirmed
- Keep the admin's own `.anim-*` copy in step (see CLAUDE.md Motion)

## Where it shows

One helper per page (or a shared `assets/ra-art.js`) loads `data/ra/art.json` once and returns `{ grid, hero }` or null. With an override:

| Place | Today (RA) | With override |
|---|---|---|
| Profile list row (`GameListRow`) | icon 44px + faded screenshot | banner 94×44 like Steam (`.grow-banner`) |
| Profile tile (`GameTile`) | icon over blurred screenshot | banner uncropped (`.gtile-art .banner`) |
| Completions highlight | screenshot + icon (or blurred icon) | banner uncropped like Steam |
| Completions beaten row / closed-year covers | icon | banner like Steam |
| Playing tiles (Hub, Activity) | `cover: null` → icon over blur | `cover` = grid (`assets/playing.js`; `TileCover` already prefers a wide cover) |
| Achievement modal header background | blurred screenshot | blurred hero, else grid |
| Profile header background | blurred screenshot of the latest game | blurred hero, else grid |

- RA identity stays: console name, Hardcore / Softcore tags, gold for mastery. The banner replaces only the art.
- Pixel art: grids are usually painted art, so no `image-rendering: pixelated` on them (keep it on icons and screenshots).
- Fallback is today's design for any game without an entry, or if the file fails to load (`onError` → icon path).
- Later: the share card plan (`share-card.md`) can use the hero for RA backgrounds.

## Steps

1. Get a SteamGridDB API key; add `SGDB_API_KEY` to `.env` (and the credentials UI).
2. Admin server routes + whitelist; probe the real responses (dimensions, styles, nsfw/humor flags, rate limit) and note them here.
3. Admin RA art section; pick art for a handful of games (Ring of Fates, 7th Dragon 2020, Tomba! 2, Poring Clicker as the no-match case).
4. Site: helper + the places above, one page at a time, checked at the phone width (CLAUDE.md: ~450 px).
5. Docs: CLAUDE.md (data file, assets folder, fallback rule), `profile/ra/CLAUDE.md`, `completions/CLAUDE.md`, `admin` notes; changelog.

## Open questions

- Hotlinking vs copies: copies recommended; revisit only if repo size becomes a concern (a few hundred games × 50 KB ≈ 15 MB).
- Whether to also allow overrides for Steam games whose store banner is poor (same file shape, `data/steam/art.json`). Not in scope now.
