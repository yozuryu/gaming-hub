# my-savepoint (Savepoint) — Project Context for Claude

## Working Style

- **Be honest with opinions.** When asked for a preference or recommendation, give a direct, genuine answer — not a diplomatic non-answer.
- **Push back before implementing bad ideas.** If asked to add or change something that seems like a poor UX, visual, or technical decision, say so clearly and explain why before doing it. Do not silently implement something you think is wrong — always confirm first.
- **Discuss before building when uncertain.** For UI/UX decisions especially, a short discussion upfront saves rework.
- **Mobile first.** The site is used mostly on a phone (installed as a PWA). Design every feature for the phone layout first, decide where it lives in the mobile view (hub order, bottom nav, profile tabs) before the desktop one, and check it at phone width. Desktop-only placements (like the hub's Completions and Analytics strips) are fine for extras, never for a feature's main entry point.
- **The owner's phone is the reference screen:** an Android phone, about **450 CSS px wide** (screenshots arrive at 900×2000). Design and judge every UI change at that width before showing it or calling it done — spacing, alignment and truncation, with real data, including short and long values (short playtimes, long titles and achievement names). A layout that only looks right on desktop or in a 400px mockup frame isn't done. There's no hover on the phone, so anything only in a tooltip is invisible there.
- **How to check it locally:** `python3 -m http.server 8765` from the repo root (after `npm run data:pull`), then view pages in a same-origin `<iframe>` 450px wide on `http://localhost:8765/` (the Chrome window can't be resized below desktop width). Load iframes with a cache-busting query (`?x=<timestamp>`) and refetch changed files with `fetch(url, { cache: 'reload' })`, or the browser shows stale code. The owner can open the same server on the phone at `http://<Mac LAN IP>:8765/` (same Wi-Fi), in the browser rather than the installed app.

---

Personal gaming statistics dashboard aggregating RetroAchievements (RA) and Steam data. Static site with no build tool — React, Tailwind, and Lucide are all loaded via CDN. Data is fetched by Node.js pipelines running on GitHub Actions every 30 minutes (triggered by cron-job.org), stored as JSON files on the repo's `data` branch, and consumed directly by the browser. The site is deployed by a GitHub Actions workflow that combines `main` (code) with the `data` branch.

---

## Directory Structure

```
gaming-hub/
├── index.html                      # Hub landing page (vanilla JS, no React)
├── 404.html                        # Not-found page for /my-savepoint/* (menu style from the root site's /assets/noah-ui.css; absolute URLs only)
├── manifest.json                   # PWA manifest
├── sw.js                           # Service worker (network-first data, stale-while-revalidate assets)
├── changelog.md                    # Project changelog (Markdown, parsed by changelog app)
├── backlog/                        # Planned work (not published)
├── CLAUDE.md                       # This file
│
├── assets/
│   ├── mobile-nav.js               # Shared bottom nav bar, injected into all pages via <script>
│   ├── playing.js                  # "Playing" games in rotation (ES module), used by the hub and Activity; see Playing
│   ├── sheet.js                    # Achievement modal behaviour for the profile pages: sheet on phone, dialog on desktop, drag to close, art fallback chain, the shared sheet header `SheetHead` (ES module)
│   ├── tabs.js                     # Profile tab bar (sticky, sideways scroll, sliding underline) + swipe between tabs (ES module)
│   ├── art-fallback.js             # Offsets the shared art-fallback mosaic per game (classic script, every page with art); see Game art behind things
│   ├── ra-icon.js                  # raIcon(): RA's placeholder icon → the square picked in the admin (ES module); see RA icon stand-ins
│   ├── art-fallback.webp           # Library icon mosaic behind games with no art (scripts/build-fallback-art.js)
│   ├── subseries.js                # Sub-series pieces of the Series page and RA Series tab (SubFold, SubChips, SubStrip, SubRow; no JSX; .sub* in ui.css); see Shared Series
│   ├── completions.js              # Completions / Game awards section of the three profile Overviews (CompletionsPanel, no JSX; .cmp-* in ui.css); see Profile tabs
│   ├── activity-ui.js              # Activity timeline pieces for the profile Activity tabs (computeStreak, useSummaryOpen, ActivitySummary, DayHead, RunCard, UnlockRow, and the loading skeletons SummarySkeleton / TimelineSkeleton / ActivitySkeleton, also used by the Activity page; no JSX). Styles: the "Activity timelines" block in ui.css, shared with the Activity page
│   ├── game-view.js                # Remembered list / tiles choice of the profile game lists (`gh:gameView`) + shortAgo (ES module)
│   ├── ui.css                      # Shared component styles: sheet, blurred art backgrounds, game list rows and tiles (profile pages, Completions)
│   ├── avatar.png                  # User avatar
│   ├── appicon.svg / appicon.png   # App icon ("Save Crystal": three platform shards, one save crystal). SVG is the source; PNG 1024×1024, full-bleed, art at 90% for the maskable safe zone
│   ├── icon-192.png / icon-512.png # PWA icons (rendered from appicon.svg)
│   ├── favicon.svg / favicon.ico   # Browser-tab icon (rounded tile, crystal enlarged to read at 16 px); linked from every page
│   └── icon-ra.png / icon-steam.png / icon-xbox.png
│
├── data/                           # JSON read by the browser. Pipeline output is NOT on main: it lives on the `data` branch
│                                   #   (scripts/data-paths.json, gitignored here, `npm run data:pull` to get it locally).
│                                   #   On main: hub/config.json, hub/idle-games.json, hub/farm-games.json, {ra,steam,xbox}/series.json, {steam,xbox}/win-conditions.json
│   ├── hub/config.json             # Username, motto, tags, platform visibility flags
│   ├── hub/series.json             # Shared series across platforms (admin: Shared Series); hub/series-games.json is built from it (gitignored, see Shared Series)
│   ├── ra/
│   │   ├── profile.json            # RA profile, stats, awards, recently played
│   │   ├── games/                  # index.json (every played game, no achievement lists, + `summary`) and {gameId}.json (one game with its achievements)
│   │   ├── watchlist.json          # Want-to-play list (fetched separately by profile page)
│   │   ├── series.json             # Named series with game ID arrays
│   │   ├── playtime/               # Play sessions: {YYYY}.json + state.json (pipeline-only baseline); see Playtime Log
│   │   ├── history/                # All-time unlocks, {YYYY}.json + index.json, for Analytics; see Unlock History
│   │   └── achievements/
│   │       └── 1.json – 4.json     # Recent achievements chunked by 91-day windows (the site builds heatmaps from these)
│   ├── xbox/
│   │   ├── profile.json            # Xbox profile, stats, recently played, perfectGames
│   │   ├── history/                # All-time unlocks, {YYYY}.json + index.json, for Analytics; see Unlock History
│   │   ├── games/
│   │   │   ├── index.json          # All titles with achievements, no achievements[] (includes syncKey)
│   │   │   └── {titleId}.json      # Full title data + achievements[]
│   │   └── achievements/
│   │       └── 1.json – 4.json     # Recent unlocks in 91-day chunks (anchored at UTC midnight)
│   └── steam/
│       ├── profile.json            # Steam profile, stats, recently played
│       ├── playtime/               # Play sessions: {YYYY}.json + state.json (pipeline-only baseline); see Playtime Log
│       ├── history/                # All-time unlocks, {YYYY}.json + index.json, for Analytics; see Unlock History
│       ├── games/
│       │   ├── index.json          # All games, no achievements[] — fast initial load (~200KB)
│       │   ├── {appId}.json        # Full game data + achievements[], lazy-fetched per game
│       │   └── sentinel.json       # Pipeline-only: no-achievement game cache (never loaded by frontend)
│       └── achievements/
│           └── 1.json – 4.json     # Recent achievements chunked by 91-day windows
│
├── profile/
│   ├── ra/                         # CLAUDE.md in this directory
│   ├── steam/                      # CLAUDE.md in this directory
│   └── xbox/                       # CLAUDE.md in this directory
│
├── activity/                       # CLAUDE.md in this directory
├── analytics/                      # CLAUDE.md in this directory
├── completions/                    # CLAUDE.md in this directory
├── series/                         # Shared series page (CLAUDE.md in this directory)
├── changelog/                      # CLAUDE.md in this directory
│
├── admin/
│   └── index.html                  # Admin panel (series management, config)
│
├── scripts/
│   ├── ra-pipeline.js              # RA ETL: API → data/ra/ (~600 LOC)
│   ├── steam-pipeline.js           # Steam ETL: API → data/steam/ (~800 LOC)
│   ├── xbox-pipeline.js            # Xbox ETL (OpenXBL): API → data/xbox/
│   ├── backfill-playtime.js        # One-off: rebuilds data/{steam,ra}/playtime/ from git history (snapshots up to 2026-11-01, on backup/main-2026-11-01)
│   ├── data-paths.json             # The generated paths that live on the `data` branch (+ pipeline-only caches never deployed)
│   ├── data-pull.js                # `npm run data:pull`: data branch → data/ (+ .data-snapshot/ for the admin Data Diff)
│   └── lib/
│       ├── playtime.js             # Playtime diff + file writer shared by RA, Steam and the backfill
│       └── history.js              # Unlock history writer shared by all three pipelines
│
└── .github/workflows/
    ├── fetch-data.yml               # All three pipelines in sequence, output committed to the `data` branch; dispatched by cron-job.org every 30 min + midnight, 6h fallback schedule
    └── deploy.yml                   # Builds the site (main + data branch, private files excluded) and deploys it to Pages
```

---

## Hub Page (`index.html`)

Vanilla JS, no React. Reads `data/hub/config.json`, `data/ra/profile.json`, `data/steam/profile.json`.

**Desktop layout (≥1024px):** main `lg:max-w-[79rem]`; `.hub-grid` puts `#playing-section` and `#activity-section` in the main column and `.hub-rail` (340px, spans both rows) on the right with the Platforms header, `.pstrip` stacked as separate cards (8px apart, a 3px left edge in the platform colour: RA gold, Steam blue, Xbox green), and the Completions and Analytics strips restyled as cards (CSS in `index.html`). DOM order is the phone order, so below 1024px it is one column as before

**Platform strip** (`.pstrip`, one `a.pcell` per platform): three headline numbers per platform. On mobile one row each (icon, numbers, chevron); on tablets three cells side by side with the name on top (stacked in the rail at ≥1024px) and the three most recently played covers below. A platform is hidden if `platforms[key].visible` is false in config.json (the strip then uses fewer columns). The other counts (rank, beaten, games…) are on the profiles.

**Numbers and colors:**
- RA: Points (gold) · Mastered (gold) · Unlocks (blue)
- Steam: Hours (blue) · Perfect (gold) · Unlocks (blue)
- Xbox: Gamerscore (gold) · Completed (gold) · Unlocks (blue)

**Completions strip** (desktop only, hidden on mobile via CSS):
- Shows: N total · N Completed (gold) · N Beaten (silver)
- "Completed" = RA Mastered + Steam Perfect + Xbox Completed merged — they are the same concept
- Most recent completion shown with icon, name, and time ago

**Analytics strip** (desktop only, below the Completions strip; the header no longer links Analytics), linking to `analytics/`, with a `30 days` pill: hours played and unlocks with their change vs the 30 days before (green ▲ / red ▼, like Analytics), the 30 days as small bars (RA gold under Steam blue), the time-of-day bar in Analytics' `DAY_PARTS` colours with the busiest part named (`Mostly evening 17–22 · 34%`), and the top game (icon, name, time, share). In the rail it stacks (`.ast-*` CSS in `index.html`); on tablets (768–1023px) it is one row without the time-of-day bar. `loadAnalyticsStrip()` repeats the Analytics page's default view (30 days, farms and idle games hidden (`data/hub/idle-games.json`), viewer's timezone) from `playtime/{YYYY}.json` and achievement chunk 1 (91 days, so it covers the previous 30 days too); farms use the same rule as `analytics/utils.js` but only fetch the per-game files of the Steam games active in the 60 days (the Steam index is 1.8 MB). Keep both in sync. `fetchJsonOnce` shares the chunk requests with the activity feed

**Sections switched off in the admin** (Site Config → Hub sections, `data/hub/config.json` `<id>.visible: false`): `playing`, `series`, `activity`, `completions`, `analytics`, applied in `loadHubProfile()`. Playing and Series start loading before the config arrives and are hidden again when off; the platform `active` flag in the file is unused (sync is `XBOX_ENABLED` in `fetch-data.yml`)

**Header** (`.phead` in `assets/ui.css`, the same pattern as the profile headers): avatar, name, "Last change · Changelog", motto, the genre tags in one sideways-scrolling row, and a totals strip across platforms: Hours played (RA + Steam), Unlocks (all three), Completed (RA mastered + Steam perfect + Xbox completed). Each stat loader calls `reportHubTotals()`; the strip fills in once all three answered (a failed platform counts as zero). The latest played game's art (RA or Steam, whichever is newer, `offerHeaderArt()`; for RA the hero from `data/ra/art.json` when picked, else the screenshot) is blurred behind it.

**Playing section** (first on the page, mobile and desktop): the 4 most recent games from the Playing group of `assets/playing.js` as mini tiles (Activity's tiles without the stats band: cover, chip, last played, title, progress, 13-week strip), 2×2 on mobile and one row on desktop, then one link line (`+N more playing · N on hold · N drifting`, **All playing ›**) to `activity/?view=playing`. The three section bars (Playing, Series, Activity) end in a blue `.hub-go` label. Loaded with `import('./assets/playing.js')` from the classic script, sharing `fetchJsonOnce`. Shows its skeleton at once; hidden only when nothing is in rotation at all

**Series section** (after Playing; `loadSeriesSection()`): the shared series (see Shared Series) from `data/hub/series-games.json`, most recently active first, as `.scard` cards from `assets/ui.css`: 3 on a phone without the icon strip (`.hub-slist`), 4 in two columns on desktop (the 4th has `.hub-desk`), then a bar (`N series` + platform icons, **All series ›**) to `series/`. Each card links to `series/?open=<id>`. Hidden when there are none

**Recent Activity feed** (`loadActivityFeed()`, `.aday` / `.arow` CSS in `index.html`): one row per game per local day, newest first, under day labels. A row adds up that day's play sessions (`playtime/{YYYY}.json`, RA + Steam) and unlocks (achievement chunk 1; chunks 2–4 only when that gives fewer than 6 rows), shows the badges (up to 10, then `+N`) with the newest unlock's name, and a Mastered / Completed / Beaten (RA awards) or Perfect (Steam/Xbox `perfectGames`) tag on the day it happened. Left border in the platform colour; the row links to the game's page on RA / Steam / Xbox. 6 rows; on mobile 4, with a "Show more / Show less" toggle (rows and day labels past 4 carry `data-activity-extra`). On md+ a bar under the feed (`#activity-more`, hidden on phones, which have the Activity tab) links to `activity/`: the last 7 local days as cells lit on active days, hours played and unlocks in them, and "All activity"; the header chevron stays. Profiles, chunks and playtime files go through `fetchJsonOnce`, shared with the stats loaders, Completions and Analytics strips

---

## Mobile / PWA

### Bottom navigation (`assets/mobile-nav.js`)
Self-contained IIFE injected into every page via `<script src="...assets/mobile-nav.js">`. Visible only on screens < 768px. It also styles the desktop top bar's wordmark on every page (`.sp-brand`: favicon and a plain white "Savepoint" in Oxanium 700, loaded from Google Fonts here; the gradient is for promotion only, not the app). Top bars read **Savepoint › Yozuryu › Page**: the display name is Savepoint (manifest, titles, footers, 404), and the repo and Pages path are `my-savepoint` (renamed from `gaming-hub` on 2026-11-12; the local folder is still `gaming-hub`). The public template it was cut from is `yozuryu/savepoint`.

- 5 tabs: Home, Profile (popup), Activity, Done (Completions), Stats (Analytics). New features join an existing tab (e.g. Playing is a view of Activity) rather than adding a sixth: five is what fits at 400px. The changelog has no tab: the hub header links to it on mobile; the desktop footer links it too; Analytics is reached from the hub's Analytics strip on desktop
- **Profile tab** fetches `data/hub/config.json` and builds a vertical pill popup showing only `visible: true` platforms. Popup slides up/down via CSS transition (no JS animation). If only one platform, navigates directly.
- `BASE` is derived from `document.currentScript.src` — works on any host (GitHub Pages `/my-savepoint/`, local `/`, etc.)
- Mobile CSS injected via `<style>`: hides `.page-topbar` and `footer`, adds `padding-bottom` to body, repositions `.scroll-top-btn`
- All pages must have `class="page-topbar"` on the breadcrumb topbar div
- Safe area: `env(safe-area-inset-bottom)` used on nav, body padding, scroll-top button and floating pills; `env(safe-area-inset-top)` on the sticky profile tab bar

### PWA
- `manifest.json` + `sw.js` at root
- `viewport-fit=cover` on every page's `index.html` viewport meta tag
- Icons: `assets/icon-192.png` and `assets/icon-512.png` rendered from `assets/appicon.svg` (full-bleed; the OS applies its own mask). Every page links `favicon.ico` + `favicon.svg` and `icon-192.png` as the Apple touch icon
- Service worker: network-first for `data/**` and `changelog.md`, stale-while-revalidate for all other static assets (cached copy served instantly, refreshed in the background — a deploy shows up on the next load). Bumping `CACHE_NAME` is no longer required for code changes; bump it only when the `PRECACHE` list changes
- **Refresh app** button clears all SW caches, calls `registration.update()` and reloads (data untouched). Lives in the hub header's status line as an icon button after "Last change" (`.hub-icons`, mobile + desktop; a Changelog icon beside it on mobile) and the Changelog page header

### Page headers (mobile)
Page headers use `pt-8 pb-5 md:pt-5` — extra top padding on mobile compensates for the hidden breadcrumb bar. Desktop keeps the original `pt-5`. Apply this to any new pages.
- The Hub and profile headers use the shared `.phead` pattern (`assets/ui.css`): avatar beside name and status lines, motto, a three-number strip, the latest game's art blurred behind. Phone: stacked and left-aligned, the meta fact ("Member since…", "Last change…") with the status lines (`.phone-only`); desktop: the numbers on the right with the meta line under them. Its top padding already covers the hidden breadcrumb

### Hub page (mobile)
- Platform strip: one row per platform; the name and covers (`.pc-name`, `.pc-covers`) are hidden via `@media (max-width: 767px)` CSS in `index.html`
- Completions and Analytics strips (`#completions-strip`, `#analytics-strip`): hidden on mobile entirely via same media query — redundant with the Done and Stats nav tabs
- Activity feed: collapses to 4 rows on mobile; rows 4+ have `data-activity-extra="1"` attribute and class `activity-row-hidden`; toggle button `#activity-toggle-btn` shown/hidden by JS after feed renders

### RA Profile stats (mobile)
- Stats are split into `statsLeft` and `statsRight` columns in `transform.js`
- On mobile, `statsRight` is hidden by default (`hidden sm:flex`)
- `statsExpanded` state + "Show more / Show less" toggle button (`sm:hidden`) controls visibility
- Toggle button has a rotating `ChevronDown` icon

### Profile tabs (RA, Steam and Xbox)
- `assets/tabs.js`: `TabBar` (one row, icon + label, active tab white with its icon in the platform colour, sliding underline, scrolls sideways when the tabs don't fit, keeps the active tab in view) and `useSwipeTabs()`; styles `.ptabs*` in `assets/ui.css`
- **Sticky:** pins below the status bar on phones (`top: env(safe-area-inset-top)`) and below the breadcrumb bar on desktop (`top: 26px`). A `.ptabs-anchor` marks its natural spot; `scrollToTabs()` brings a newly picked tab to its top with the bar pinned
- **`?game=<id>`** opens that game's achievement sheet on load (RA loads the game's own file, Steam / Xbox wait for the index), then the parameter is dropped with `replaceState`; the shared series page links games this way
- **Overview** is the first and default tab: the old top section (Last played, Recent unlocks, User stats, Game Awards / Completions)
- **Desktop (≥1024px):** main `lg:max-w-[79rem]` (header `.phead-in` matches); Overview is `lg:grid-cols-[minmax(0,1fr)_360px]` with Last played + Recent unlocks on the left and a `.prail` (User stats two across, then Awards / Completions) on the right. Recent unlocks adds up to 5 compact `.urow` rows (`.ulist`, hidden below 1024px) from achievement chunk 1, fetched by an `ovUnlocks` effect only when `matchMedia('(min-width: 1024px)')` matches, so phones download nothing extra. The tab bar on md+ lines up with the content (`.ptabs` margin 0)
- **Swipe (phones), carousel style:** the tab content follows a sideways drag (`touchmove` non-passive, axis locked after 8px, `touch-action: pan-y`); the neighbouring tab slides in one page-gap (32px) beside it as a skeleton (`.tab-peek`, placed under the pinned bar, capped to the screen height) in that tab's own shape: each page passes `tabPeeks` ({ tabId: [part, …] }, parts from `PEEK_PARTS` in `assets/tabs.js`: `h2`, `fbar`, `chips`, `row`, `unlock`, `list`, `tiles`, `stats`, `wlist`, `cards`, `heatmap`, `timeline`). The real tab renders only after the swipe lands, so a drag never waits on a heavy tab. Release past 25% of the width or with a flick commits, otherwise it springs back; rubber band past the first / last tab. Ignored when it starts on something that scrolls sideways itself (chip rows, heatmap, cover strips) or on a form control, or when it's mostly vertical. The listener sits on a stable wrapper around the keyed tab content (a keyed element is replaced on every switch); the wrapper's parent gets `overflow-x: clip`. Reduced motion: follows the finger, release is instant
- There is no floating tab pill any more: the sticky bar replaced it
- **Completions / Game awards** (Overview, in the rail on desktop): one shared `CompletionsPanel` (`assets/completions.js`), each page passing its own words and art. The gold section header with the platform's title (*Game awards* on RA, *Completions* on Steam and Xbox) and the game count; two tier counts (gold *Mastered* / *Perfect* / *Completed*, silver *Beaten*); **Latest**: the newest completion of either tier as a card with its art sharp behind (RA picked hero or screenshot, Steam `library_hero` → header, Xbox hero), tier tag, date, playtime or gamerscore, and one fact (the rarest / final achievement with ★ for the top tier, the win condition with a flag for beaten, rarity in gold); then a shelf of the rest, top tier first then beaten, newest first in each, in one of two views, switched in the section header (`vtoggle`) and remembered per device (`gh:awardsView`, separate from `gh:gameView`): **tiles** (default, a showcase like the old icon wall: art, tier border and mark, no text; the name is the tile's `title` / `aria-label`) and **list** (rows with the Latest picture, name and tags, console or fact, tier tag and full date; 5 rows folded, 8 in the open box). The tier is a border on every picture: gold 2px with a soft glow, silver 2px. Art shape per platform (`shape`): RA square icons (`sq`), Steam store banners (`wd`), Xbox posters (`pt`); the Latest picture uses the same shape, except Xbox, which keeps its square box art there (`coverShape`). Grid the same on phone and desktop: 4 per row (RA, Xbox), 3 (Steam banners, too wide for 4 in the 360px rail); two rows of tiles folded; **Show all N** turns the shelf into a box that scrolls, 4 rows high (3 for posters), its top and bottom edges fading out while there's more to scroll that way (`fade-t` / `fade-b`, a CSS mask); **Show less** folds it and scrolls the section back into view. No button when everything fits (RA's 9). Tapping any game opens its achievement sheet. A skeleton until the win-condition games (and, on Xbox, the games index for posters and gamerscore) are in

---

## Data Pipelines

### RA Pipeline (`scripts/ra-pipeline.js`)
Env vars: `RA_USERNAME`, `RA_API_KEY`. Uses `@retroachievements/api` package.
- Default (incremental): fetches profile + recent achievements + progress
- `--refresh-games`: re-fetches per-game achievement details
- `--watchlist-only`: fetches only want-to-play list → `watchlist.json`
- Game details cached in Firestore to avoid re-fetching unchanged games
- Outputs: `profile.json`, `games/index.json` + `games/{gameId}.json`, `watchlist.json`, `achievements/1-4.json`
- **Per-game split** (like Steam): `games/index.json` holds every game without its achievement list plus a `summary` (`count`, `earned`, `points`, `pointsEarned`, `prog`, `progEarned`, `lastUnlock`), ~12 KB compressed instead of the old 5 MB `games.json`; each `games/{id}.json` is the full game, loaded when its sheet opens. The cache is read back from these files (the old `games.json` is the fallback and is deleted once the split is written). Files of games no longer tracked are removed
- **Removed games:** a cached game with unlocks that RA no longer lists (not in completion progress or recently played) was reset or removed on RA, and is dropped (index, file, history) and counted as activity. Games without unlocks come only from recently played, so they stay once seen. Skipped if completion progress comes back empty

### Steam Pipeline (`scripts/steam-pipeline.js`)
Env vars: `STEAM_API_KEY`, `STEAM_USER_ID`.
- Default: recently played games only
- `--refresh-unlocked-games`: re-fetches games with any unlocked achievements
- `--refresh-games`: all owned games
- `games/index.json` pre-computes `lastUnlockedAt`, `lastUnlockName`, `preview` (top 6 icon hashes) per game
- `games/sentinel.json` tracks no-achievement games (pipeline-only, never fetched by frontend)
- **Moved store banners:** newer games keep `header.jpg` only under a hashed path (`store_item_assets/steam/apps/<id>/<hash>/header.jpg`), so the fixed `/steam/apps/<id>/header.jpg` is a 404. `resolveHeaders()` HEAD-checks the fixed address (every game in midnight / full runs, only the fetched ones otherwise) and saves the store API's `header_image` as `headerUrl` on the game (index, game file, `perfectGames`). The site uses it wherever it builds a banner (Steam profile through `setMovedHeaders` + `headerUrl()`, Completions, Playing, `build-series.js`, the fallback mosaic); a banner that still fails tries the hero art (`bannerError`, the hub's `coverImg` fallback). 1 of 713 games on 2026-11-08 (SpongeBob: Titans of the Tide)
- Outputs: `profile.json`, `games/index.json`, `games/{appId}.json`, `games/sentinel.json`, `achievements/1-4.json`

### Xbox Pipeline (`scripts/xbox-pipeline.js`)
Env vars: `XBOX_API_KEY` (OpenXBL). The XUID is read from `GET /account`; `XBOX_XUID` is optional and only compared.
- Uses [OpenXBL](https://xbl.io/) (`https://xbl.io/api/v2`), free tier 150 requests/hour. Every request needs `Accept-Language: en-US`
- OpenXBL returns errors as HTTP 200 with the real status in the body's `code` (and `content` as a JSON string) — the HTTP helper checks both
- Default (incremental): account + title list (2 calls), then achievement lists only for titles whose `syncKey` (current achievements, current/total gamerscore, last played) changed
- `--refresh-games`: re-fetch every title with achievements (midnight; refreshes rarity). ~85 calls for 83 titles, fits in one run; a 130-request cap defers the rest to the next run if the library grows
- `--debug`: dry run, writes nothing
- Xbox 360 titles (`sourceVersion 1` or `Xbox360` in `devices`) use `/achievements/x360/…`, which **only lists unlocked achievements** — `partial: true` in the title file; totals come from the title list. 360 icons are built from `t.{titleId hex}/ach/0/{imageId hex}`
- Modern totals come from the achievement list (the title list's `totalAchievements` is often 0)
- No sentinel file: titles without achievements are known from the title list every run
- No playtime (the API's `stats` is null)
- Image URLs are stored as full-size originals; every page resizes them with an `xboxImg(url, width)` helper (duplicated in the Xbox page, Activity, Completions, hub and admin). Never render an Xbox image URL without it
- Files are only rewritten when their content changes (ignoring `metadata`), so runs with no activity make no commit
- Outputs: `profile.json`, `games/index.json`, `games/{titleId}.json`, `achievements/1-4.json`

### Playtime Log (`scripts/lib/playtime.js`)
Steam and RA only (Xbox has no playtime). Each run compares lifetime playtime per game (Steam `playtime_forever` minutes, RA `userTotalPlaytime` seconds) with `playtime/state.json` and appends the difference as a session to `playtime/{YYYY}.json` (year of the session's end, UTC):
`{ metadata, games: { id: { name, icon, console? } }, sessions: [{ start, end, gameId, minutes, approx? }] }`
- **Session times:** `end` = the game's last-played time, `start = end − minutes`. Steam moves last-played to the session start when it begins and to the end when it closes; RA's last-played is the session end (verified against the git history, see `backlog/playtime-and-analytics.md`). `approx: true` when the start had to be moved to avoid overlapping the game's previous session (offline play synced late, RA splitting one session across runs) or no last-played time was known
- **Steam checkpoints:** while a game runs, Steam saves playtime every 30 minutes and moves last-played to the checkpoint, so a run landing mid-session logs a finished chunk. A session starting within 5 minutes (`MERGE_GAP_MS`) of the same game's previous session end extends that session instead of adding one (the writer finds it by its `end`). This also joins RA sessions split across runs
- **Launches aren't logged:** a new session of 5 minutes or less (`MIN_SESSION_MINUTES`) is dropped: a wrong game, checking an RA hash. A piece that continues a logged session is always kept, so the only loss is the first ≤5 min of an RA session when a run lands right after it starts (the next piece then starts the session). The baseline still advances, so dropped minutes are gone for good
- **Not play:** a negative change, or a change while last-played didn't move (RA corrections), only updates the baseline. Under a minute is carried until it adds up
- **Unknown games** count as new play only when last-played is after `state.asOf`; otherwise they're added to the baseline silently. The first run with no `state.json` only seeds it
- Store sessions, never daily totals: the frontend groups them into the viewer's local days. No rollups; one file per year
- RA's snapshot is every tracked game, but last-played is only known for recently played games (the only ones re-fetched)
- `state.json` is pipeline-only (`private` in `scripts/data-paths.json`: on the data branch, never deployed) and only rewritten when it changes
- `scripts/backfill-playtime.js [--ref origin/backup/main-2026-11-01] [--platform steam|ra] [--dry-run]` replays the hourly snapshots in git through the same diff and replaces the playtime files. History starts 2026-03-25 (Steam) / 2026-03-27 (RA) and ends 2026-11-01: since then data lives on the `data` branch, squashed daily, so the backup branch (and the local bundle in `~/projects/personal/gaming-hub-backups/`) holds the only snapshots

### Playing (`assets/playing.js`)
Games in rotation, so games played in parallel don't get lost. Computed in the browser (no pipeline file), so "3d ago" is never stale. `loadPlaying(fetchJson, base)` reads play sessions, achievement chunk 1, RA awards and progress from `ra/profile.json`, and the per-game file + `win-conditions.json` of each Steam candidate. **RA and Steam only:** rotation is measured in play time, which Xbox doesn't report (judging Xbox by unlocks misses games played without unlocking anything).
- **Window** 13 weeks (91 days), so the weekly strip and the session stats cover the same days. **Groups** by local days since the last session end or unlock: Playing ≤14, or ≤45 with 5h+ in the window (a long game you come back to); On hold ≤45; Drifting ≤91
- **Counts only with real time:** 60+ minutes of sessions in the window (RA, Steam), 30 for a game touched in the last 14 days (one you just started). Drops tryouts, demos and RA hash checks
- **Per game:** `sessions`, `minutes` and `weeks` (13 week cells of minutes, oldest first, 7-day blocks back from today) over the window; `progress` (Steam/Xbox per-game file, RA `gameAwardsAndProgress`); `totalMinutes` lifetime (Steam `playtimeForever`, RA `playtime` that the RA pipeline adds to each `gameAwardsAndProgress` entry); `cover` (Steam header from the CDN; RA: the banner from `data/ra/art.json` if picked, else none)
- **Excluded:** Mastered/Completed/Perfect games, achievement farms (same rule as Analytics, plus the marks in `data/hub/farm-games.json`). A **Beaten** game counts only activity more than 30 min after the beat (RA award date, or the win-condition unlock) and only in Playing: finishing it and moving on is not "drifting"
- Thresholds are the constants at the top of the file; check a change against real data before shipping it

### Unlock History (`scripts/lib/history.js`)
Every unlocked achievement, all time, rebuilt by each pipeline on every run from the per-game data it already loads, into `data/{ra,steam,xbox}/history/{YYYY}.json` (UTC year of the unlock). The achievement chunks only cover 364 days; this is the all-time source for Analytics.
`{ metadata, unlocks: [{ t, g, a, n, p?, r?, hc? }] }`: `t` ISO UTC, `g` game id, `a` achievement id, `n` name, `p` RA points / Xbox gamerscore, `r` rarity % (Steam/Xbox global %, RA `numAwarded / numDistinctPlayersCasual`), `hc` RA hardcore. `history/index.json` (`{ years: { YYYY: count } }`) lists the year files. One unlock per line; unchanged years are not rewritten, empty years are deleted. `r` (0.1 precision) is only refreshed by the midnight run; other runs keep each stored unlock's `r` and only add new ones. ~390 KB for all years.

### Shared behavior
- **One workflow** (`fetch-data.yml`) runs RA → Steam → Xbox in one job and makes at most one commit, **on the `data` branch** (`chore: update data (ra, steam) …`, listing the platforms that changed). `main` gets no pipeline commits. Each pipeline step has `continue-on-error`, so one platform failing doesn't stop the others; the commit step still runs (a failed pipeline wrote nothing) and a last step fails the job so GitHub emails. Inputs: `mode` (`incremental` · `midnight` = RA full, Steam unlock refresh, Xbox full · `full-refresh` = every game everywhere, Steam `--refresh-games` · `watchlist-only` = RA want-to-play list) and `platforms` (`all` / `ra` / `steam` / `xbox`)
- **Xbox sync is paused** (`XBOX_ENABLED: 'false'` in `fetch-data.yml`, since 2026-10-10): scheduled runs skip Xbox; a manual dispatch with `platforms: xbox` still syncs it. OpenXBL intermittently returns 429 on the first request even with quota left (5 of ~100 runs on 8–9 Oct). Set it back to `'true'` to resume
- **Scheduling:** GitHub's `schedule` trigger ran hours late, so cron-job.org POSTs to the `workflow_dispatch` API with an explicit `mode`: `incremental` every 30 minutes (:15 and :45, off the midnight slot), `midnight` at 00:00 UTC. The mode comes only from `inputs.mode`, never from `github.event.schedule`. A 6-hourly `schedule` stays as a fallback and always runs incremental
- Concurrency group `data-pipeline` prevents overlapping runs
- `--debug` flag prints API responses without writing files
- **Failure handling:** API calls retry with backoff. If profile-level data (profile, awards, RA achievement chunks, Steam owned/recent games) still fails, the run exits non-zero before writing, so the previous files stay and nothing is committed. A single game that fails keeps its cached entry (in every mode, including full refresh)
- Steam `games/sentinel.json` ("no achievements") is only written when Steam says a game has no stats or an empty schema — never on a network/HTTP error — and an entry is removed when the game later returns achievements
- **Regular runs write only on activity:** incremental runs compare with the committed files and exit before writing anything unless you did something — RA: a game's unlock count or playtime, a new unlock, recently played times or the want-to-play list; Steam: playtime / last played against `playtime/state.json`, or an unlocked count against `games/index.json`; Xbox: a title's `syncKey`. No activity = no commit. Everything else (rarity, RA rank, rolling 7/30-day points, Steam presence and `playtime2Weeks`) refreshes in the midnight run, or along with an activity run. The site labels the timestamp "Last change" for that reason
- Files are only rewritten when their content changes, ignoring `metadata`
- Chunk files split by 91-day windows anchored at the next UTC midnight (boundaries move once a day): chunk 1 = 0–91 days, chunk 2 = 91–182, etc. RA chunks drop the unused `cumulScore`

---

## Shared Series
Series across platforms, made by hand in the admin (General → Shared Series) in `data/hub/series.json` (on main): `{ id, name, gameIds, showProgress, coverGameId, groups? }` with ids prefixed by platform (`ra:2688`, `steam:223870`, `xbox:1297287153`), same editor as the platform series.
- **Sub-series:** `groups: [{ id, name, gameIds }]` (one level; a game in at most one; games in none show as "Other"). Shown on the Series page and the RA and Steam Series tabs through `assets/subseries.js`: `SubFold` (list: a bar under the card, folded by default, opening one `SubRow` per sub-series; on desktop an open one spans both columns, `grid-auto-flow: dense`), `SubChips` (sheet: All + each sub-series, a gold bar on each chip's bottom edge for its achievement %) and `SubStrip` (sheet, All only: a strip that opens the rows). Each `SubRow` has its cover game's art faded in from the right like the series cards (`art`, `artIcon` for the mosaic fallback; `.subrow-art`). Games in no sub-series form a last "Other", which is counted and stacked like the others. Status counts in series cards and sub-series rows are `statusPills()` (`assets/sheet.js`, `.spill` in ui.css: ★ done, medal beaten, ▶ in progress; the words in the tooltip) Each page builds the sub-series cards with its own series builder on the group's games, and keeps the picked one on the opened card (`__sub`), so a game opened from it comes back to it. `build-series.js` passes them on as `groups: [{ id, name, keys }]` (known games only). Edited in the admin's Shared Series / RA Series / Steam Series pages (Suggest, Move to…; Steam's suggestions are the shared series' sub-series); Xbox series don't support them yet
- `scripts/build-series.js [siteRoot]` turns it into `data/hub/series-games.json` (~115 KB): each game's title, icon, art, unlocked / total, beaten, playtime, last activity and latest unlock (`last`: name, icon, date), from the RA games index + watchlist + awards, the Steam / Xbox indexes + win conditions. The hub and the series cards read only that file, never the per-platform lists; a game opened on `series/` loads its own file (`data/{ra,steam,xbox}/games/{id}.json`) 
- Built in `deploy.yml` (after the site is assembled, so every data run and every push rebuilds it), by `npm run data:pull`, and by the admin server whenever the series file is saved. The output is gitignored
- A series shows with 3+ games the platform data knows; games missing from it (unplayed Steam games aren't in the index) are left out

## Publishing / Private Files

Pages source is **GitHub Actions** (`deploy.yml`), not a branch build: the site is `main`'s files plus `data/` from the `data` branch, at the same paths as always. Every file on `main` is public unless excluded in `deploy.yml`'s **Assemble site** step (an rsync exclude list: every `CLAUDE.md` at any depth, `backlog/`, `docs/`, `admin/`, `scripts/`, `README.md`, `TODO.md`, `package*.json`, `.github/`, …) and the pipeline-only caches listed as `private` in `scripts/data-paths.json`. **When adding a private folder or notes file, add it to that list.** There is no Jekyll and no `_config.yml` any more.

### Data branch
- `data` holds only pipeline output (`scripts/data-paths.json`). `fetch-data.yml` restores it into `data/` before the pipelines (they read their previous output as cache), copies the generated paths back after, and commits to `data`. The **midnight** run squashes the branch into one parentless commit (`chore: data snapshot …`, force-push with lease), so it never holds more than a day of history
- A run that changed data calls `deploy.yml` as a second job (pushes made with `GITHUB_TOKEN` don't trigger workflows); every push to `main` deploys too. Deploys share the `pages` concurrency group
- **Local:** a checkout of `main` has no pipeline output. `npm run data:pull` extracts the `data` branch into `data/` and an untouched copy into `.data-snapshot/` (both gitignored); the admin **Data Diff** compares generated files against that copy and hand-edited files against git. Local pipeline runs are for testing; publishing data only happens from Actions
- Moving a file between `main` and `data`: update `scripts/data-paths.json` and `.gitignore` together
- Before the move (2026-11-01) data was committed to `main`: that history is on `backup/main-2026-11-01` and in the local bundle `~/projects/personal/gaming-hub-backups/gaming-hub-2026-11-01-pre-data-branch.bundle`

---

## Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| UI framework | React 18.2 | Via CDN (`esm.sh`), no build step |
| Styling | Tailwind CSS | Via CDN, arbitrary values used heavily |
| Icons | Lucide React 0.263.1 | Via CDN |
| JS transform | Babel standalone | Transpiles JSX in-browser |
| Node scripts | Node.js 20 | Pipelines only, not frontend |
| CI/CD | GitHub Actions | Data fetch every 30 min + commit to the `data` branch on activity, triggered by cron-job.org; `deploy.yml` deploys main + data |
| Hosting | GitHub Pages | Static files served as-is, deployed by Actions (no Jekyll) |

There is **no bundler, no npm for the frontend, no TypeScript**. All frontend files are plain `.js` (JSX transpiled in-browser by Babel).

---

## Code Conventions

### Styling
- **Tailwind className** for fixed/structural styles
- **Inline `style={{}}`** for dynamic values (colors from data, animations with delays)
- **`<style>` tag with `@keyframes`** for CSS animations — injected inside the React return. Established pattern across all pages.
- Arbitrary Tailwind values are used extensively: `text-[11px]`, `w-[140px]`, `tracking-[0.07em]`

### Component patterns
- All functional components with hooks (`useState`, `useEffect`, `useMemo`, `useRef`, `useCallback`)
- `useMemo` used aggressively for derived data
- Large `app.js` files contain all components for that page — no separate component files
- Sub-components defined at module level, not inline

### Data flow
- Data fetched on mount with `useEffect` + `fetch()`
- Loading skeletons shown while data is `null`/loading
- Chunk-based lazy loading via `IntersectionObserver` with a sentinel `ref` at the bottom of the list

### Dates and times
- All data is stored in UTC. RA uses `YYYY-MM-DD HH:MM:SS` with no zone marker; Steam/Xbox use ISO with `Z`
- Everything shown uses the **viewer's timezone**, through `assets/time.js`: `toDate`/`toMs` (parses both formats as UTC), `dayKey` (local `YYYY-MM-DD`), `addDays`, `fmtDate`, `fmtClock`, `buildHeatmap`, `TZ` (IANA name, shown as a small label on Activity views and Completions)
- Never `new Date(raString)` (parsed as local time; Safari rejects it) and never `.substring(0, 10)` to get a day (that's the UTC day)
- The hub page (classic script) has its own small `toDate`/`daysAgo`

### RA title parsing
RA game titles use special syntax handled by `parseTitle()`:
- `~Tag~` prefix → tag (Homebrew, Demo, Prototype, Hack)
- `[Subset - Name]` suffix → subset game, extract parent title and subset name

---

## Design System

### Color palette
```
Background:        #171a21   (page bg)
Card bg:           #1b2838   (primary card)
Card bg darker:    #202d39   (secondary card, hover)
Card bg dark:      #131a22   (topbar, FAB buttons)
Border:            #2a475e   (standard border)
Border dark:       #101214   (inner/inset border)
Text primary:      #c6d4df
Text secondary:    #8f98a0
Text muted:        #546270

RA gold:           #e5b143
Steam blue:        #66c0f4
Xbox green:        #52b043   (marks Xbox only: hub/activity borders, Xbox filters, avatar; not a section or status color)
Cyan accent:       #57cbde
```

### Completion status colors
Game-card left stripes use the same ladder everywhere (RA/Steam/Xbox cards, RA watchlist rows): gold → silver (beaten) → blue (in progress) → `#323f4c` (not started) → `#1e2a35` (no achievements). Hub recently-played badges: gold ★ completed, silver % beaten, blue % in progress.
- Mastered / Perfect / Completed: `#e5b143` (gold)
- Beaten: `#b8c4ce` (silver) — second tier, pairs with gold like a medal; badge bg `#2a3440`, badge text `#c6d4df`
- In Progress: `#66c0f4` (blue)
- Not started / border: `#323f4c`

### Stat number colors (hub cards + profile stats)
- Gold `#e5b143` — earned value: Points, Mastered, Perfect
- White `#c6d4df` — identity: Rank
- Blue `#66c0f4` — engagement: Hours, Achievements
- Silver `#b8c4ce` — second tier: Beaten
- Muted `#546270` — context/breadth: Games, Played, w/ Unlocks

### Rarity colors (Steam achievements)
- Ultra Rare (<5%): `#e5b143` (gold)
- Very Rare (<10%): `#c8901a` (dark gold)
- Rare (<25%): `#66c0f4` (blue)
- Uncommon (<50%): `#8f98a0` (gray)
- Common (≥50%): `#546270` (muted)

### Tilde tag colors
- Hack: red `#ff6b6b`
- Homebrew: blue `#66c0f4`
- Demo: cyan `#57cbde`
- Prototype: gray `#8f98a0`

### Filters and search
One look on every page, from the classes in `assets/ui.css`:
- Filters = `.fchip` (28px, sentence case, `.on` = blue tint) in a `.frow` that scrolls sideways instead of wrapping; `.fsep` between groups. Include-toggles show `+` off and `✓` on
- Search = `.fsearch` (icon + clear button) with sort / group as a `.fselect` beside it in a `.fbar`
- Counts and hints = `.fmeta`, a plain muted line. Never draw a count as a chip, or a filter in the small uppercase tag style
- Explanations, rules and scope are never a grey sentence: see **Info text** below
- View switches (Unlocks / Playtime / Playing, list / tiles) stay segmented controls

### Info text
**Rule: never write information as a bland grey sentence.** Anything that explains (what a card counts, its rules and thresholds, which platforms it covers, how much is loaded, what a colour or arrow means) gets a real visual treatment, or is removed. First ask whether it's needed at all; then pick the treatment that fits *what the information is*. Chips are one tool, not the answer to everything: a page where every heading grows a chip row is as monotonous as one full of grey lines.

| The information is… | Treatment | Example |
|---|---|---|
| A repeat of the title, the filter chips or the period | **Remove it** | "30 days · 7 farms hidden" under chips that already say both |
| Rules / thresholds of a list (2–3 short facts) | **Criteria chips**: `.crits` row of `.crit` (icon + short text, number in `<b>`; `.gold` for ★ completed, `<i>` dot for a group colour, `<img>` for a platform icon) | Most progress: `Sets of 10+` `★ Completed` |
| One rule on a heading with a divider line | **One chip at the end of the heading line** | Playing groups `Idle 2–6 weeks`; Analytics Rarity |
| Which platforms something covers | **Platform icons**, not their names in a sentence | Hub "All 31 series" + the three icons |
| How much of something is loaded / done | **A small meter or segmented bar** with a short label | RA activity "3 of 12 months" as four 3-month steps |
| What colours, arrows or marks mean | **A key drawn with the real marks** | Overview: stacked green ▲ / red ▼ "vs previous 30 days" |
| A scope beside a title | **`.cpill`** | "All time" on the funnels |
| Data (a count, a median, a date) | **Plain text is fine**, sized and coloured as data, not as a hint | "37 · median 42m" |
| Nothing to show | **Empty state text** stays, short and specific | "None yet: a game needs 30 idle days to count" |
| A how-to ("tap a day to filter", "scroll to load more") | **Remove**: make the thing look tappable or show the meter instead | — |

- **Vary it.** Before adding chips, look at what's already on the screen: if the section above already has a chip row, prefer another treatment (an icon, a key, a meter, folding it into the data's own label) or nothing. More than two chip rows in one phone screen is too many
- Chips hold short facts (2–4 words each, at most 3 in a row). If it needs a sentence, the design is wrong: split it into facts or drop it
- No info behind a tap-only icon either (the ⓘ button was tried and dropped): what matters is visible, what doesn't is removed
- Check it at 450px like everything else: chips must not wrap into a second line under a heading on the phone

### Game art behind things
- Blurred art backgrounds (`.art-bg` in `assets/ui.css`) bleed 30px past every edge so the blur never shows a dark rim; `max-width: none` beats Tailwind's img reset
- **Art fallback:** a game with no screenshot or wide art (RA's "no image" placeholder `/Images/000002.png` counts as none) gets `.art-icon` on its art `<img>`, everywhere art sits behind something (profile lists, tiles, headers and sheets, series cards, Activity strips, Completions, Analytics). It no longer shows the icon blown up and blurred: `img.art-icon` in `assets/ui.css` moves the icon out of its box (`object-position`) and shows **one shared mosaic of library art** instead (`assets/art-fallback.webp`, like RetroAchievements' fallback banner: big and small square RA / Xbox icons and wide Steam covers, uneven on purpose), tilted −12° in CSS (a tilt baked into the image would stop it repeating) and scaled 2.3× so the turned corners stay covered on boxes up to ~6.5:1, dimmed, and blurred in sheets and page headers (`.art-sheet`, `.art-header`) like real art there. `assets/art-fallback.js` (on every page with art) starts each image at a patch picked from its icon URL, so neighbouring cards differ and a game always shows the same patch. Markup and fallback chains stay as they were: just add or keep the class
- **Rebuilding the mosaic:** `node scripts/build-fallback-art.js [--cols 30 --rows 22 --seed 7]` after `npm run data:pull`: packs a grid of 40px cells (4px gaps) row by row with RA / Xbox icons at 2×2 or 1×1 and Steam `header.jpg` covers at 4×2 or 2×1 (every RA game, Steam / Xbox games with an unlock; the grid takes what fits), seeded so a rebuild of the same library gives the same picture; no piece crosses the edge, so it repeats seamlessly. 1320×968 WebP (~360 KB; needs the `sharp` dev dependency). If the grid size changes, update `background-size` in `ui.css` and `W`/`H` in `art-fallback.js`

### RA icon stand-ins
RA serves one placeholder icon (`/Images/000001.png`) for every game without one (22 on 2026-11-10, mostly want-to-play games with no set yet). The admin's RA Art page (**no icon** button in the list footer, **Icon** section: SteamGridDB square grids and icons) saves a pick as `icon` in `data/ra/art.json`. `raIcon(url, id, artGames)` (`assets/ra-icon.js`) returns the pick's thumb only while the icon is still the placeholder, so a real RA icon replaces it with nothing to clean up (the admin then offers to remove the unused pick). Applied in the RA profile (games, Watchlist, Series, Activity), Activity, Analytics, Completions and Playing; the hub (`index.html`) and `scripts/build-series.js` have their own copy of the rule. Every `img` from steamgriddb.com is scaled smoothly (`assets/ui.css`), never pixelated like RA's pixel-art icons

### Typography
- Font: `'Segoe UI', Arial, sans-serif`
- Sizes: 7–15px (very compact, dashboard-style)
- **Letter case follows the role**, the same on every page:
  - UPPERCASE, small and letter-spaced (`uppercase tracking-[0.07em]`), only for **structure and status**: section headers, page tabs, table headers, chart/card titles, and status tags (Hardcore, Softcore, Mastered, Beaten, Perfect, platform chips, tilde tags, OFFLINE)
  - Sentence case for **everything read or tapped**: filter chips, buttons, search placeholders, dropdown options, stat and field labels (Achievements, Played, Hours played, Member since), hints, empty states, day and axis labels
  - Never Title Case ("Not Started", "Hours Played") except proper names (game titles, RetroAchievements, GameFAQs). Never uppercase a game name
  - A label moved from uppercase to sentence case gets 1–2px more size: sentence case at 8–9px reads smaller than uppercase did
- Border radius: mostly 2–3px (sharp, minimal)

### Section headers
Consistent pattern across all pages:
```jsx
<span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0" />
<span className="text-[13px] text-white tracking-wide uppercase font-medium">Title</span>
```
General sections (Most Recently Played, User Stats, Activity) use `#66c0f4` on every profile page; achievement sections (Recent unlocks, Completions/Game Awards) use `#e5b143`. Xbox green is not a section color.

### Shimmer skeleton
Defined in each `index.html` `<style>` block (not in app.js). Class name: `.shimmer`. Used on loading placeholders before data arrives.

### Motion (`assets/motion.css`)
Linked from every page's `index.html`. Short and quiet: fades with a few pixels of lift, nothing bouncy; all of it is off under `prefers-reduced-motion`.

**Rule: every component animates.** Anything that appears, disappears, fills in after loading, expands, or swaps content on a filter, tab or toggle gets one of the classes below (or, on the vanilla hub, a `motion-fade` CSS rule). Nothing pops in. Check this for every new component and every new conditional render. Exceptions: hover/focus color transitions, text typed into a search box (no fade per keystroke), and pointer-following tooltips.
- **No late jumps:** a section that loads after the page shows its skeleton at once (hidden again if it ends up empty) instead of appearing later and pushing content down. The hub's Completions and Analytics strips work this way
- **Admin** is same-origin only: the page calls `/api` on the server that serves it, the server sends no CORS headers, refuses requests carrying another site's `Origin` and any `Host` that isn't localhost / 127.0.0.1 (DNS rebinding), because the API returns `.env` keys and can push. Keep it that way
- **Admin** (`admin/index.html`) has its own copy of the `.anim-*` classes: `scripts/admin-server.js` serves only that page and the images in `assets/` (`/assets/*.png|svg|ico|webp`), so it can't link `assets/motion.css`. Keep the copy in step. Its own styles are the tokens and classes in its `<style>` (`.btn`, `.input`, `.search`, `.lrow`, `.pane-*`, `.card`, `.chip`, `.seg`, `.empty`, `.shimmer`, `.nav-*`); icons are Lucide (same version as the site). Pages are `MODULES` (label, icon, group, `desc`, `file`): the shell draws the header from them, and a page's Save goes into the header through `SaveBar` (a portal, ⌘S saves). Loading states use `SkPage` / `SkSplit` / `SkRows`, nothing-selected states `Empty`. Pipelines starts real runs of `fetch-data.yml` (mode + platforms, after a confirm step) and lists the last 12 runs through the server's `/api/gh/runs` and `/api/gh/dispatch` (GitHub API with `GH_DISPATCH_TOKEN` from `.env`, inputs checked against the workflow's choices), runs `data:pull` and `build-series.js` locally, and labels the local fetch runs as test-only. `/api/sync-state` reads `XBOX_ENABLED` for the paused-sync chips. Credentials lists every `.env` key grouped by what uses it. Pipelines' Schedule shows the cron-job.org jobs (`/api/cron/jobs`, `CRON_JOB_API_KEY`, 100 calls a day so no polling), pauses / resumes them (`/api/cron/enable`) and has Run now (`/api/cron/run`: cron-job.org has no run-now call, so it dispatches the job's own inputs; the job headers hold the GitHub token and never leave the server). Data Diff: `edit` files (tracked on main under `data/`, against HEAD: not committed), `local` files (`scripts/data-paths.json` output, against `.data-snapshot/`) and the commits main lacks (`/api/publish/status` fetches first, `/api/git/show?sha=` for one of them: per-file diffs for data commits, message and `--numstat` only for code commits). Commit (`/api/git/commit`: `git commit --only` of exactly the data files the page showed), Push (`/api/git/push`: every unpushed commit, code too) and Publish (`/api/publish`: both); pushing refuses when behind or off main. `/api/git/identity` shows the author from git config and, for an SSH remote, the key `ssh -G` resolves and the GitHub user `ssh -T` answers with (cached 10 min). It's plain `git`, so it pushes with whatever the terminal does, not `GH_DISPATCH_TOKEN`. `mobile-nav.js` animates its popup and backdrop with its own CSS transitions
- **Hub (vanilla):** sections shown by lifting `display:none` (`#completions-strip`, `#analytics-strip`, `#activity-section`) fade through a CSS rule on the element itself; containers filled with `innerHTML` fade their children (`#x > *`). Skeletons inside such a container are wrapped in a plain `<span>` so the fade rule doesn't override their shimmer
- **Page switch:** cross-document View Transitions (`@view-transition { navigation: auto; }`): old page fades out (120ms), new one fades in with a 6px lift (220ms). `.page-topbar` and the mobile nav (`view-transition-name` in `mobile-nav.js`) stay in place. Unsupported browsers just navigate
- **Classes:** `.anim-in` (content replacing a skeleton, a new tab/view/period), `.anim-fade` (lists changing in place, expanded sections), `.anim-pop` (modal panels), `.anim-backdrop` (modal backdrops). Fill mode is `backwards`, never `both`/`forwards`: a transform animation left in effect makes the element the containing block for `position: fixed` children (it broke the floating tab pill)
- **Re-run on change** by giving the container a React `key` tied to what changed (e.g. `key={activeTab}` on profile tab content, `key={view}` on Activity, `key={`${period}-${hideFarms}`}` on Analytics, filters on Completions)
- The hub (vanilla) animates children of its filled containers in CSS: `innerHTML` inserts new nodes, which replays the animation
- **Achievement modals** use the shared sheet (`assets/sheet.js` + `.sheet-*` in `assets/ui.css`): below `md` the panel slides up from the bottom (`sheet-up`, covers the bottom nav at z-index 210) and slides back down on close (✕, backdrop, Escape, or dragging the header down: 120px or a fling); from `md` it stays a centred dialog with `motion-pop`. The header has the game's art blurred behind it and a round close button. Its content is the shared `SheetHead` (`assets/sheet.js`, `.shd-*`): cover, title, meta line, status tags, then one card with the completion % big on the left, up to three numbers beside it (Achievements first), RA's progression as a gold segmented meter (one segment per achievement up to 20; longer chains in equal groups, `ceil(n / 20)` per segment, the group in progress lit partly), the card tinted up to the % in the status colour with a hard edge (`.shd-card.wash`, gold over the whole card when complete), and the progress bar along the card's bottom edge (lit track, glowing fill in the status colour, min 8px). Every game sheet uses it (RA, Steam, Xbox, the Series page), and so do the series sheets (the profile Series tabs and the Series page): status counts as tags (`seriesTags`), achievements plus points / gamerscore / played, and a Games meter instead of progression (`games`: one segment per game with achievements, done gold, beaten silver, started dim blue lit to its %; over 20 games one segment per status, as wide as its count; the count is games done). Pages pass their nodes (art, cover, tags) and data (stats, bar, steps, games). The bar and the tint don't animate on open: a fill from 0 (first as `width`, then as `transform: scaleX`) blinked on the owner's Android phone both ways and was removed. Header values fade in only after a shimmer (`hadPending`), never on a normal open. The header art fades in only after the panel's opening animation ends (`.settled` on the panel, set by `useSheet`): the blurred art fading while the panel slid blinked on Android (bisected: either alone is fine). Don't animate anything inside the header during the slide-up The page behind is locked by `overflow: hidden` on `<html>` only: hiding `<body>` too makes it a scroll container and the pinned tab bar jumps out of view
- **Modal height:** `useAnimatedHeight(ref)` (`assets/sheet.js`) animates a panel's height whenever its content grows or shrinks: loading done, filter change. FLIP via ResizeObserver (runs after layout, before paint), so there is no jump. Used on all four game sheets (RA, Steam, Xbox, Series)
- **Sheet header while loading:** the header never pops in. Everything it shows comes from data the page already has (the games indexes, `series-games.json`: RA points and progression from the index `summary`, Series `pts` / `prog`); a value that is still unknown (RA opened before its index) is passed as `value: null` / `steps.pending` and `SheetHead` draws a shimmer in its place, then fades the real value in
- Steam/Xbox achievement modals open immediately in a loading state (skeleton list) and fill in place when the game file arrives, so one panel animates from skeleton to list
- **Filter changes** re-key the list they change so it fades: modal lock/type filters, profile Progress sort/view/completed toggles (not search, to avoid a fade per keystroke), RA watchlist status/grouping, Activity and profile Activity day selection, Activity heatmap platform filter, Analytics chart ↔ table toggle. "Show all"/"Show more" items fade in as they appear
- Every load state uses a shimmer skeleton, never "Loading…" text

### Scroll-to-top button
Rounded FAB: `w-10 h-10 rounded-full bg-[#131a22] border border-[#2a475e] active:scale-90`. Has class `scroll-top-btn` so mobile-nav.js can reposition it above the nav bar.

---

## Overflow / Mobile Notes

- `html, body { overflow-x: clip }` must be on **both** `html` and `body` — `clip` on `body` alone does not propagate to the viewport scroller.
- The RA profile `index.html` has no overflow rule (its content fits without it).
- Heatmaps use `overflow-x: auto` wrapper with `minWidth: ${53 * 14}px` inner — intentional.
- Page headers use `pt-8 pb-5 md:pt-5` — extra top padding on mobile compensates for the hidden breadcrumb.

---

## Changelog Convention

**Always update `changelog.md` after making any code changes.** Every feature, fix, or improvement must be logged — do not wait for the user to ask.

Version format: `## vYY.MM.DD` (e.g. `## v26.04.11`). **If an entry for today's date already exists, add to it — never create a second `## vYY.MM.DD` header for the same date.** Check the top of `changelog.md` before adding a new header.

Structure (parsed by `changelog/app.js`, see `changelog/CLAUDE.md`):
- One-line summary after the version: what a reader gets from this release, shown while it's folded
- `### SectionName` subsections matching the page changed
- One entry per change: `- new: **Thing** short headline` (kind `new`, `improved` or `fix`), at most ~12 words, written for the person using the site
- Optional detail on the indented line(s) below it, shown when the entry is tapped: one or two sentences on what it looks like or why. Implementation detail belongs in commit messages and CLAUDE.md, not here

```md
### Hub

- new: **All activity** bar under Recent activity on desktop
  The last 7 days as squares, their hours and unlocks, and a link to the Activity page.
- fix: **Series** cards show the picked art for want-to-play games
```

Section order (matches `SECTION_ORDER` in `changelog/app.js`): RetroAchievements, Steam, Xbox, Hub, Completions, Activity, Analytics, Pipelines, Structure, Admin. Each section has its own heading color (`SECTION_COLORS`, see `changelog/CLAUDE.md`).
