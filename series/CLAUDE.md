# Series — Page Context

The shared series page: series across RA, Steam and Xbox (root CLAUDE.md "Shared Series").

## Data
- `../data/hub/series-games.json` only (built by `scripts/build-series.js`); no per-platform files
- `?open=<series id>` opens that series' sheet on load (the hub cards link this way)

## Display
- Same pieces as the profile Series tabs (`.scard`, `.slist`, `.ssheet-*`, `.grow` in `assets/ui.css`): search, sort (Name, Most progress, Last played (default), Most games), All / Started / Not started
- Card: cover game's icon (Steam: banner), name, games · platform split (icon + count), started / completed / beaten, %, last activity, bar, icon strip (`.smooth`: mixed sources, no pixelated scaling)
- Sheet: achievements earned / total, completed / tracked, %, then groups In progress · Completed · Beaten · Not started · No achievements. Rows show the platform icon, console (RA) or platform, playtime, last played, and link to the game's page on its platform (no achievement sheet here)
- Xbox images go through `xboxImg()` (copied here, as on every page)
- The bottom nav marks Home active (`assets/mobile-nav.js`): series is reached from the hub
