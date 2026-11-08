# Series — Page Context

The shared series page: series across RA, Steam and Xbox (root CLAUDE.md "Shared Series").

## Data
- `../data/hub/series-games.json` for the cards and the series sheet (built by `scripts/build-series.js`)
- A game's own file (`../data/{ra,steam,xbox}/games/{id}.json`) when it's opened
- `?open=<series id>` opens that series' sheet on load (the hub cards link this way)

## Display
- Same pieces as the profile Series tabs (`.scard`, `.slist`, `.ssheet-*`, `.grow` in `assets/ui.css`): search, sort (Name, Most progress, Last played (default), Most games), All / Started / Not started
- Card: cover game's icon (Steam: banner), name, games · platform split (icon + count), started / completed / beaten, %, last activity, bar, icon strip (`.smooth`: mixed sources, no pixelated scaling)
- Sheet: the shared `SheetHead` (cover, name, games and the platform split, status tags, achievements and hours played, %, the Games meter; height animates), then "Latest unlock" (the newest `last` across the series' games, any platform; tapping it opens that game) and groups In progress · Completed · Beaten · Not started · No achievements. Rows show the platform icon, console (RA) or platform, playtime, last played. A row with `sheet` set (built by `build-series.js`: played RA games with a set, Steam / Xbox games with achievements) opens `GameSheet` on this page: one list for all three platforms (icon, name, description, points / gamerscore, rarity, Hardcore, unlock date; All / Unlocked / Locked; Xbox 360's unlisted locked count), a back pill to the series, and "Full details ›" to the profile sheet (`?game=`). The header's points / gamerscore and RA progression come from the game's `pts` / `prog` in `series-games.json`, so it doesn't change when the list loads; the panel height animates (`useAnimatedHeight`). Other rows open the game's page on its platform (RA want-to-play games, no achievements). Row styles `.gach*` in `assets/ui.css`
- **Sub-series** (`groups` in `series-games.json`, root CLAUDE.md "Shared Series"): `buildCards` gives a series `subs` (the same `buildCard` on each group's games, plus Other); the list wraps its card in `SubFold`; the sheet takes `__sub` on the opened card (`onScope` sets it), shows `SubChips` under the header and `SubStrip` on All, and scopes header, Latest unlock and games to the sub-series. `?open=<id>&sub=<group id>` opens one; search matches sub-series names
- Xbox images go through `xboxImg()` (copied here, as on every page)
- The bottom nav marks Home active (`assets/mobile-nav.js`): series is reached from the hub
