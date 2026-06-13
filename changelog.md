# Changelog

## v26.06.13

Fix mobile horizontal scroll and bottom nav on RA profile page.

### RetroAchievements

- Fixed horizontal scroll on mobile — added `overflow-x: clip` to `html, body` in `profile/ra/index.html`; the missing rule caused the heatmap's wide min-width to leak outside the viewport, which also broke the `position: fixed` bottom nav bar

## v26.05.02

RA profile game awards update and beaten filter default.

### RetroAchievements

- Game Awards sidebar: removed unreliable Site Awards section; added Trophy + mastered count and Medal + beaten count to the Game Awards header

### Steam

- Completions page: Beaten filter now defaults to on

---

## v26.05.01

Steam win conditions, admin module, and app icon update.

### Steam

- Admin: new **Win Conditions** module under the Steam group — select any Steam game with achievements, click achievements to mark them as win conditions (multi-select); saved to `data/steam/win-conditions.json` as arrays
- Win conditions support OR / AND mode per game — **OR** (default): any one condition unlocked counts, beaten date = earliest unlock; **AND**: all conditions must be unlocked, beaten date = latest unlock
- Win condition data format updated to `{ mode: "or"|"and", achievements: [...] }`; old array format is read as OR for backward compatibility
- Admin Win Conditions: OR/AND toggle pill added to the toolbar when conditions are set; saves in new object format
- Completions: loads win conditions on mount, fetches game files to check unlock status, and shows beaten Steam games alongside RA beaten and Steam perfect entries; beaten games excluded if already in `perfectGames`
- Steam profile: sidebar renamed to **Completions**; flat single grid — perfect games first (gold `border-2`) then beaten-only games (no border); header shows ★ + count (gold) and 🏅 + count (gray); beaten games use their win condition achievement icon as thumbnail; games that are both perfect and beaten show only as perfect
- Completions page: beaten Steam game cards now show the win condition achievement icon instead of the game icon, and rarity label/percentage for that achievement
- Steam profile sidebar: beaten game tooltip now includes a Rarity row (win condition achievement's `globalPct`); perfect count prefixed with ★, beaten count prefixed with 🏅
- Hub completions strip: beaten count now includes beaten Steam games (from win conditions, excluding already-perfect games); fetches game files in parallel to check unlock status
- Game cards (Recent Games + Completion Progress tabs): show a gray **Beaten** badge next to the game title when a win condition has been unlocked; badge hidden if the game is already Perfect; left stripe turns gray `#8f98a0` for beaten games
- Achievement modal: shows the same gray Beaten badge under the game title when opened for a beaten game

### Structure

- Added `data/steam/win-conditions.json` (empty, populated via admin)
- Updated `assets/appicon.png` with new icon
- Regenerated `assets/icon-192.png` (192×192) and `assets/icon-512.png` (512×512) from new source

## v26.04.11

Mobile polish pass — floating tab pills, platform popup redesign, Steam tab parity, stats collapse, Completions deduplication, icon refresh, hub page simplification, heatmap/streak mobile improvements, and stat color/order refinements.

### RetroAchievements

- User Stats: right column hidden on mobile by default; "Show more / Show less" toggle expands it; always both columns on `sm:` and up
- Series tab icon changed from `Trophy` to `Layers` — better represents grouped series content
- Floating tab pill: slides up on appear and slides down on disappear (`slideUpPill` / `slideDownPill` keyframes); exit animation deferred 210ms so it completes before unmount
- Scroll-to-top button: `rounded-full` FAB (`w-10 h-10`, `bg-[#131a22]`, `active:scale-90`); `bottom` shifts from `3.5rem` to `120px` when floating pill is visible

### Steam

- Tab bar on mobile: icons (Clock / BarChart2 / Activity) with short labels, full text on desktop — matches RA tab bar layout
- Tab bar no longer sticky on mobile; scroll-aware floating pill appears when the bar scrolls off screen, with same slide-up / slide-down animations as RA
- Scroll-to-top button shifts up when floating pill is visible

### Hub

- Profile platform popup redesigned as vertical stacked pills: frosted glass rounded-rect container, each platform is a horizontal pill (icon + full label), active platform highlighted with color tint
- Popup slides up on open and slides down on close via CSS transition
- Mobile: platform cards reduced to header + stats grid only — recently played rows and card footers hidden; navigation handled by bottom nav bar
- Mobile: completions strip and activity "View all →" link hidden — redundant with bottom nav tabs
- Mobile: Recent Activity feed collapses to 4 rows by default; "Show N more / Show less" toggle button reveals the rest
- Desktop layout unchanged

### Activity

- Heatmap: auto-scrolls to the rightmost (most recent) position on mount on all three pages (Activity, RA profile, Steam profile) — fires after `heatmapData` is populated using `requestAnimationFrame` to ensure DOM has rendered full width first
- Streak panel: shows 5 circles on mobile (last 5 days) instead of 14 — fits without horizontal scroll on any phone; desktop still shows all 14

### Hub

- Completions strip: merged RA Mastered + Steam Perfect into single "Completed" count (gold); Beaten shown separately in blue; these are the same concept across platforms
- RA stats order updated by relevance: Points → Rank → Mastered → Beaten → Achievements → Games; stat colors: gold (Points/Mastered), white (Rank), blue (Achievements), gray (Beaten), muted (Games)
- Steam stats order updated by relevance: Hours → Perfect → Achievements → Games → Played → w/ Unlocks; same color logic applied
- RA card: Wishlist stat replaced with Achievements (sum of `numAwarded` across all tracked games)
- Changelog version headers changed from date format (`2026-04-11`) to short CalVer (`v26.04.11`)

### Completions

- Deduplicate RA entries by `gameId`: when a game is both mastered and beaten, only the mastered entry is shown — prevents the same game appearing twice when "Show Beaten" is enabled

### Structure

- All page headers: `pt-8 pb-5 md:pt-5` — extra top padding on mobile to compensate for hidden breadcrumb bar; applied to RA, Steam, Activity, Completions, Changelog, and Hub
- PWA icons (`assets/icon-192.png`, `assets/icon-512.png`) replaced: sourced from new `assets/appicon.png` (gaming controller + trophy logo); cropped to 860×860px to remove outer padding and bottom-right watermark, then resized to 192 and 512
- Per-page `CLAUDE.md` files added to `profile/ra/`, `profile/steam/`, `activity/`, `completions/`, `changelog/` — root `CLAUDE.md` updated to reflect current architecture

## v26.04.10

Mobile UX overhaul — bottom navigation bar, safe area support, scroll-to-top repositioning, and three mobile bug fixes.

### RetroAchievements

- Tab bar: icon + short label on mobile (`Clock`/Recent, `BarChart2`/Progress, `Layers`/Series, `Activity`, `Star`/Watchlist), text-only on desktop; tabs distribute evenly with `flex-1` on mobile
- Tab bar on mobile: sits at natural in-flow position; once scrolled off screen a floating icon pill appears centered above the bottom nav (`z-190`, frosted glass background with `backdrop-filter: blur`)
- Floating pill shows active tab with accent-colored background circle and dot indicator; desktop unchanged (`md:sticky md:top-[26px]`)
- Scroll-to-top button shifts up (`bottom: 120px`) when floating pill is visible to prevent overlap

### Steam

- Fixed tab bar clipping on mobile: wrapped tab buttons in `overflow-x-auto scrollbar-none` inner div so hidden tabs are reachable by horizontal scroll (matches existing RA tab bar pattern)

### Hub

- Completions strip: mobile view now shows Mastered / Beaten / Perfect breakdown (colored counts) instead of just a plain total count; `flex-1 min-w-0` + `text-overflow: ellipsis` prevents overflow

### Structure

- Added `assets/mobile-nav.js` — shared bottom navigation bar injected into all pages via `<script>` tag; visible only on screens < 768px
- Bottom nav has 5 tabs: Home, Profile (dynamic platform picker), Activity, Completions, Changelog (cyan accent)
- Topbar breadcrumb and `footer` elements hidden on mobile via `.page-topbar` and `footer` CSS rules — bottom nav replaces them; class `page-topbar` added to topbar divs in all 5 React app.js files and `index.html`
- Profile tab fetches `data/hub/config.json` and shows only `visible: true` platforms in a popup; navigates directly if only one platform is configured
- Platform popup slides up above the nav; backdrop tap dismisses it; active platform highlighted in its accent color
- Active tab is auto-detected from `window.location.pathname`; active state shows accent color + top indicator bar
- Safe area insets applied to nav height via `env(safe-area-inset-bottom)` for notched iPhones
- `viewport-fit=cover` added to all 6 `index.html` viewport meta tags to enable safe area CSS variables
- Scroll-to-top buttons in `profile/ra/app.js`, `profile/steam/app.js`, `activity/app.js` given `.scroll-top-btn` class; mobile-nav CSS repositions them above the nav bar on mobile

## v26.04.09

Tab sizing unified across RA and Steam; GameCard and modal label styles aligned; series card icon sort improved. PWA support added — installable on mobile with offline fallback.

### Structure

- Added `manifest.json` — PWA web app manifest with name, icons, theme color, start URL and scope set to `/gaming-hub/`
- Added `sw.js` — service worker with network-first caching for `data/**` and `changelog.md`, cache-first for all static assets; old caches deleted on activation
- Generated `assets/icon-192.png` and `assets/icon-512.png` from `avatar.png` for PWA icon sizes
- Added `<link rel="manifest">` and SW registration script to all six `index.html` files

### RetroAchievements

- Tab bar: fixed inconsistent text size on mobile — changed from fixed `text-[14px]` to `text-[11px] md:text-[14px]` and `gap-3 md:gap-6` with `whitespace-nowrap`, matching Steam's implementation
- GameCard: status row (`Hardcore`/`Softcore`/`Mastered`/`Beaten` labels) now wraps on narrow screens instead of truncating — changed outer div from `truncate` to `flex-wrap`; console name and separator get `shrink-0`
- Game modal: status labels now use the same badge style as GameCard (`border`, `bg`, `font-bold uppercase tracking-wider`) instead of plain colored text; `Hardcore` and `Mastered` are shown as independent badges (a hardcore mastered game shows both)
- Series card icon strip: icons now sorted into four buckets — mastered (desc by mastery date) → in progress (desc by last unlock date) → no progress (alphabetical) → no achievement (alphabetical)

### Steam

- Achievement modal: moved Perfect badge from beside the progress bar to under the game title, matching RA modal layout

## v26.04.08

Series Progress tab added with rich cards — background image, points, latest achievement, icon strip, and per-series progress tracking; admin gets Show Progress flag, cover game selector, gold dot indicator, and console names in all game lists. Game awards deduplicated so mastered game shows single Mastered award with solid gold border. Series card icon strip now sorted by mastery status with gold borders; award type corrected to `Mastery/Completion`.

### RetroAchievements

- Added Series Progress tab — shows per-series cards for series with **Show Progress** enabled; tab only appears when at least one series has the flag set
- Series card design mirrors GameCard: left-border gold accent, background image (from cover game), cover icon (links to RA game page), series name, GameCard-style layout
- Series card stats: **Games** (total in series) · **Tracked** (games with an achievement set, sourced from `detailedGameProgress.numAchievements` or `watchlist.achievementsPublished`) · **In Progress** · **Mastered** (`numAwardedToUser === numAchievements`, no page awards dependency) — shown as inline badge labels
- Series card progress bar: `mastered / tracked` with percentage; gold fill, gradient at 100%
- Series card icon strip: game icons below the bar; games without achievement sets shown dimmed (`brightness-[0.35] grayscale`) after games that have sets
- Series card points: earned / total points shown under series name, sourced from per-achievement `points` field and watchlist `pointsTotal`
- Series card latest achievement: badge icon + achievement name (links to RA achievement page) + game title (links to RA game page) + time ago; achievement and game title are clickable
- Fixed Series Progress tab showing all zeros when navigated to directly — `games.json` was only fetched for the `recent` and `progress` tabs; added `series` to the trigger condition
- Admin Series module: added **Show Progress** toggle in series editor header — gold when enabled, stored as `showProgress` in `data/ra/series.json`
- Admin Series module: added ★ cover game selector — hover any assigned game row to reveal the star; clicking sets `coverGameId`; clicking again clears it; cover game falls back to first game in series if unset; cover game resolves from `detailedGameProgress` or watchlist so unplayed games work
- Admin Series module: series list now shows a gold dot next to series with `showProgress` enabled
- Admin Series module + Guides module: all game rows now show console name as a muted subtitle under the title for disambiguation
- Admin server: `/api/games/ra` now includes `consoleName` in each game entry
- Game Awards panel: deduplicate awards per game — if a game has both Beaten and Mastered awards, only Mastered is shown; dedup key is `awardData` (game ID), Mastery/Completion wins over Game Beaten
- Fixed award type strings throughout — RA API returns `"Mastery/Completion"` not `"Game Mastered"`; corrected in `transform.js` (siteAwards filter, gameAwards filter, beatenGamesCount) and `app.js` (icon border condition, tooltip label)
- Mastered award icons now have a 2px solid gold border (`border-2 border-[#e5b143]`); Beaten awards keep the original dimmed border
- Series card icon strip: icons now sorted — mastered games first (desc by mastery date) → in-progress games (desc by last unlock date) → no-progress games (alphabetical) → no-achievement games (alphabetical)
- Series card icon strip: mastered game icons get a 2px gold border matching the Game Awards panel style
- Series card stats labels: `games` (total) is now muted, `tracked` (games with achievement set) is lighter — visually prioritises the actionable subset

## v26.04.07

Hub mobile layout fixed for fewer than 3 visible platforms.

### Hub

- Fixed platform grid layout on mobile when fewer than 3 platforms are visible — the JS `gridTemplateColumns` inline style was overriding the CSS media query, causing 2-column side-by-side layout on mobile instead of single column; fixed by using a CSS custom property (`--platform-cols`) for the desktop/reduced-count layout and `!important` on the mobile `1fr` breakpoint

## v26.04.06

Watchlist split into its own JSON file with independent pipeline refresh; RA Series admin gets unassigned games panel, delete persistence fix, and alphabetical sorting.

### Pipelines

- RA pipeline: split `wantToPlayList` out of `profile.json` into its own `data/ra/watchlist.json`; profile page fetches it as a separate request and merges it before rendering the backlog tab
- RA pipeline: added `--watchlist-only` flag — fetches only the want-to-play list and writes `watchlist.json`, skipping profile/achievements/games entirely; exposed as `npm run ra-fetch:watchlist`
- RA pipeline: replaced two boolean `workflow_dispatch` inputs (`refresh_games`, `watchlist_only`) with a single `mode` choice dropdown (`incremental` / `full-refresh` / `watchlist-only`)
- Admin server: `/api/games/ra` now reads watchlist from `data/ra/watchlist.json` instead of `data/ra/profile.json`

### RetroAchievements

- Admin Series module: added Unassigned Games panel — 📋 badge in left panel footer shows count of games not in any series; clicking opens a searchable right-panel view listing all unassigned games with icon, title link, WL badge, and a "New Series" button that pre-fills the series name and pre-assigns the game; badge count reflects live state as games get assigned
- Admin Series module: fixed delete not persisting — deletion now immediately writes to `data/ra/series.json` (previously the save button was hidden after deselecting, so changes were lost on refresh)
- Admin Series module: series list is now sorted alphabetically after create and rename
- Watchlist series grouping: groups are now sorted alphabetically (was file order)

## v26.04.05

RA Series Hub launched — admin module with game assignment, recommendations, per-series suggestions, and watchlist grouping in profile.

### RetroAchievements

- Admin panel RA Guides module now includes watchlist (Want to Play) games in the game list, merged with played games and deduplicated by ID; watchlist-only entries are labeled **WL** in the sidebar
- Added RA Series Hub: new `data/ra/series.json` stores named series with game ID arrays (supports multi-series per game); admin panel Series module (two-panel: series list + game assignment with search); watchlist tab gains a **Series** grouping option — unassigned games fall into an "Other" group
- Admin Series module: added series recommendations — analyzes unassigned watchlist/played games, groups by shared name prefix (strips subtitles, roman numerals, numbers), shows 💡 badge with count in left panel footer; suggestions view lists each group with a "Create Series" button that pre-fills the name and pre-assigns the games; minimum 3 games required to surface a recommendation
- Admin Series module: per-series add panel now shows suggested games (unassigned games whose name prefix matches the series name) before the search prompt
- Admin Series module: all game titles are clickable links to the RA game page in all lists (assigned, suggestions, search results, global recommendations)
- Admin Series module: fixed `fromWatchlist` flag — games that are both played and on the watchlist were incorrectly missing the WL badge; fixed by building a watchlist ID set before merging
- Admin Series module: search bar no longer clears after adding a game to a series
- Watchlist series grouping: series with more than 3 games are collapsed by default

## v26.04.03

Admin panel expanded with Credentials, Data Diff, and server controls; Steam/RA filter UI buttons standardized; guide strip dropdown fix.

### Steam

- Replaced "Show Perfect" checkbox in Progress tab with a button matching the filter bar style — gold when active, divider separating it from sort buttons, labelled under "Filter"

### Completions

- Added tag filter buttons (Hack, Homebrew, Prototype) to filter bar — hidden by default, click to show; styled with each tag's color
- Replaced "Also show beaten games" checkbox with a button matching the platform filter style
- Rearranged filter bar order: All · RA · Steam · Beaten | Hack · Homebrew · Prototype

### RetroAchievements

- Guide strip now always shows dropdown for custom categories (even with 1 link); fallback categories remain direct links

### Admin

- Added Credentials module — form editor for `.env` (RA username/API key, Steam user ID/API key); password fields masked with show/hide toggle; writes directly to `.env`
- Added Data Diff module — per-file side-by-side diff view of `data/` changes; new untracked files shown as pure additions
- Added server Restart and Stop buttons in sidebar footer; Restart polls `/api/health` until back up
- Added hash-based routing (`#module-id`) so page refresh preserves active section
- Guide search link in RA Guides game header opens GameFAQs search in new tab

## v26.04.03

Steam games data split into per-game files for faster initial load.

### Admin

- Added local admin panel (`admin/`) — run `npm run admin`, opens at `http://localhost:3131`; excluded from GitHub Pages via `_config.yml`
- Site Config module: form editor for `data/hub/config.json` (username, motto, tags, platform/page visibility toggles)
- RA Guides module: per-game guide editor for `data/ra/guides.json` with fixed Guides/Videos categories and dropdown link lists
- Pipelines module: run any RA/Steam pipeline mode with live SSE log streaming and stop button; pipelines unchanged and still usable from CLI

### RetroAchievements

- Added guide links strip to `GameCard` — shows below progress bars, above the achievement preview strip
- Each card shows fallback links: GameFAQs search and YouTube longplay search, auto-generated from the game title
- Custom per-game guides supported via `data/ra/guides.json` — entries keyed by game ID, each an array of `{ category, icon, links: [{ label, url }] }`; categories with 1 link open directly, 2+ links show a dropdown; custom categories appear first, fallbacks fill in missing ones

### Steam

- Added loading overlay when fetching per-game achievement data from `games/{appId}.json` — shows spinner and game name so the UI doesn't appear frozen on slow connections; dismissible by clicking the backdrop
- `data/steam/games.json` (5.3MB) replaced with `data/steam/games/index.json` — index only (no `achievements[]`), plus `data/steam/games/{appId}.json` per game containing full achievement data
- `data/steam/sentinel-cache.json` moved to `data/steam/games/sentinel.json`
- Pipeline cache loading now reads individual `games/{appId}.json` files; falls back to legacy `games.json` on first migration run
- `games/index.json` pre-computes `lastUnlockedAt`, `lastUnlockName`, and `preview` (top 6 achievement icons) per game — previously computed at runtime in the frontend
- Frontend fetches `games/index.json` on mount (~200KB instead of 5.3MB); full `games/{appId}.json` lazy-fetched only when a game modal is opened
- `SteamGameCard` and `ProgressTab` updated to use pre-computed fields from the index instead of iterating `achievements[]`

---

## v26.04.02

Streak panel redesigned with circles, 14-day window, connectors, and per-day achievement counts; streak UTC date bug fixed; Steam mobile overflow fixed.

### Activity

- Streak day cells changed from squares to circles — better visual separation from the heatmap above
- Expanded from 7-day to 14-day window for more meaningful streak context
- Gold connector lines drawn between consecutive active days, sitting at circle center height; transparent on broken days
- Streak panel fills full width — connectors use `flex: 1` to distribute remaining space evenly
- Circle size 36px; flame icon 16px — sized down from previous oversized squares
- Current streak count reduced from 30px to 22px; panel padding tightened
- Best streak line moved to left-aligned and bumped to 10px (from centered 8px)
- Achievement count for each day shown below the day label — gold on active days, hidden on missed/pending
- Today excluded from streak breaking — streak holds until midnight if no achievements yet (shown as pending dot, not ✕)
- `flameFlicker` animation staggered per day index so flames don't all pulse in sync
- Header flame icon animates; streak count glows gold when active streak > 0

### Steam

- Streak date key calculation switched from `toISOString()` (UTC) to local `getFullYear/getMonth/getDate` — in UTC+ timezones, `toISOString()` returned yesterday's date late at night, causing today's achievements to not match the heatmap and the flame to never show for today
- `html` element added to `overflow-x: clip` rule in `index.html` — `clip` on `body` alone does not propagate to the viewport scroller, leaving the page horizontally scrollable
- Tab bar font size reduced to `11px` on mobile (from `14px`) and gap tightened to `12px` (from `24px`) — "Completion Progress" tab label was wide enough to overflow the viewport at small screen widths

---

## v26.04.01

RA game awards sorted by type then date; combined activity page gains achievement unlock streak tracking with a 14-day visual.

### RetroAchievements

- Game awards (Mastered / Beaten) now sorted by type first — Mastered before Beaten — then by award date descending within each group

### Activity

- Achievement unlock streak added below the heatmap — tracks consecutive days with at least one unlock; today is excluded from the streak breaking (pending until day ends)
- Streak panel shows current streak count, a 14-day circle timeline with animated flame icons on active days, and gold connector lines between consecutive streak days
- Longest streak recorded with its date range shown at the bottom of the streak panel

---

## v26.03.29

RA achievement display simplified; Steam game images upgraded; sticky headers fixed; heatmap platform filter corrected; pipelines now hourly with concurrent queue and debug mode; search added to completion progress on both platforms.

### RetroAchievements

- RA pipeline `--debug` flag added — prints raw API responses after each fetch, matching Steam pipeline behavior; `npm run ra-fetch:debug` script added
- `RAchievementModal` HC flame icon removed from achievement title row — the gold left border strip already conveys hardcore unlock; applied to activity tab rows and Most Recently Unlocked card as well
- Rarity pills (`UR`/`VR`/`R`/`UC`) replaced with plain colored `×N.N` ratio text — same color tiers, no border or background; shown for all achievements with valid data; locked achievements rendered at 40% opacity
- Completion Progress search bar and game count added — matches Steam toolbar layout

### Steam

- Activity tab session header game image switched from wide capsule (`capsule_sm_120`) to square game icon from `games.json` — matches Most Recently Played and avoids cropping
- Most Recently Played card image switched from square icon to `capsule_616x353.jpg` (high-res wide capsule) at natural aspect ratio — no crop, significantly sharper than the 32×32 icon
- Most Recently Unlocked game name row image switched to square game icon matching activity tab
- Combined activity Steam session headers now use square game icon from `games.json` — `games.json` fetched on mount, icons patched into loaded achievements
- Completion Progress search bar added — filters by game name, clears with ×; toolbar persists when search returns zero results; "Name" sort removed

### Activity

- Combined activity heatmap now stores RA and Steam heatmaps separately and derives the active heatmap from the platform filter — previously always showed merged data regardless of filter
- Platform filter label unified to `RA` across combined activity and completions pages (was `RetroAchievements` in combined activity)

### Hub

- Completions strip latest game now only considers Mastered (RA) and Perfect (Steam) — Beaten games excluded from the latest slot

### Pipelines

- Concurrent queue (`concurrency: group: data-pipeline, cancel-in-progress: false`) added to both RA and Steam GitHub Actions workflows — prevents push conflicts when both pipelines trigger simultaneously
- RA and Steam GitHub Actions schedules changed from every 3 hours to every 1 hour — public repo has no Actions minute limits

### Structure

- `overflow-x: hidden` on `html, body` replaced with `overflow-x: clip` on `body` across Steam, combined activity, completions, and changelog pages — `hidden` creates a scroll container that breaks `position: sticky`; `clip` prevents horizontal overflow without this side effect

---

## v26.03.28

RA bug fixes; lazy loading across all activity pages; Steam progress hides perfect games by default; tilde tag and subset parsing extended site-wide; game card playtime row redesigned with clock icon and dot separator.

### RetroAchievements

- `RAchievementModal` HC/SC progress bars now show correct percentages — `numDistinctPlayersCasual` and `numDistinctPlayersHardcore` were mistakenly stripped by the pipeline; restored and re-fetched via `--refresh-games` full refresh; `totalPlayersHC` added as a separate denominator for the HC bar; bars hidden when player data is unavailable
- HC/SC labels replaced with `Flame`/`Feather` icons colored to match their respective bar fills (`#ff6b6b` HC, `#546270` SC); label row constrained to `max-w-[180px]` matching the bar so SC aligns to the right edge
- `mostRecentAchievement` now runs through `parseTitle()` — game name in the Overview card renders `baseTitle` and tilde tag badges instead of raw title
- All RA date strings (`"YYYY-MM-DD HH:MM:SS"` UTC) are now normalized to ISO UTC before `new Date()` parsing, fixing a 7-hour timezone offset for UTC+7 users; applied to both `formatTimeAgo` and `formatDate`
- Game awards popup (Completion Progress hover) now parses tilde tags and subset names via `parseTitle()` — renders `baseTitle` with inline tilde tag badges, or a `Subset` badge with the subset name as a subline
- Game card playtime row replaced with clock icon + playtime · Last Played value, matching Steam's layout; "Last Played" label capitalized on both RA and Steam game cards

### Steam

- Completion Progress tab hides perfect games (100%) by default; "Show Perfect" checkbox in the toolbar toggles them back in

### Activity

- Combined activity (`/activity/`) heatmap now uses precomputed `heatmap.json` from both platforms merged by day — complete data from mount regardless of loaded chunks
- All three activity pages (RA, Steam, combined) now use `IntersectionObserver` scroll sentinel for lazy loading — next chunk auto-loads when scrolled within 300px of the bottom, replacing the manual "Load more" button on Steam and the silent background streaming on the combined page
- Clicking a heatmap day that isn't in the loaded data auto-loads chunks until the day's achievements are available — implemented on Steam Activity tab and combined activity page (RA already had this)
- RA activity tab session headers now render tilde tag badges inline alongside the game name
- Combined activity session headers now render tilde tag badges — `parseTitle` in `activity/utils/helpers.js` was discarding tags instead of collecting them; fixed to capture tags; `TILDE_TAG_COLORS` added to `activity/utils/constants.js`

### Hub

- Activity feed rows now show achievement description between the achievement name and the game line (falls back to achievement name if empty); platform-specific badges (points, rarity) removed in favour of a universal unlock time shown right-aligned on the game row
- Game name color changed to `#66c0f4` (blue) with hover-to-white; subset/tilde tag badges moved inline on the game name row
- Row separator border moved from Tailwind arbitrary-value class to inline style — Tailwind CDN does not reliably process arbitrary classes on dynamically injected HTML

### Completions

- Hub breadcrumb links (`../../`) corrected to `../` — one level deep from root; was breaking on non-root domain deployments
- Completions page (`/completions/`) now parses tilde tags and subset names — `CompletionCard` renders `baseTitle` with inline tilde tag badges or a `Subset` badge + subset name subline
- Hub completions strip parses the latest RA completion title and renders `baseTitle` + badges + subset subline; shared `_parseTitle`/`_tildeBadgesHtml`/`_BADGE_BASE` helpers moved to script scope so they're accessible outside `loadHubProfile`

## v26.03.27

Achievement detail modals for RA and Steam; achievement preview strips on game cards; completions page with hub strip; activity shimmer loading; data restructured with sharded achievement chunks and ~2.4MB pipeline savings.

### Completions

- New `/completions/` page listing all perfect (Steam) and mastered/beaten (RA) games grouped by month under collapsible year headers
- Current year expanded by default; past years collapsed
- Two-level hierarchy: year (bold, lighter) → months (indented with left border, muted) → cards
- Platform filter (All / RA / Steam) and "Also show beaten games" checkbox (default unchecked)
- Mastered and completed unified under single "Mastered" type; HC marker removed from beaten badge
- Each card shows game icon, name, type badge (Mastered / Beaten / Perfect), platform icon, console or last achievement name + rarity subline, and playtime / date
- Shimmer skeleton loading state mirrors year header → month header → card layout
- Linked from hub via completions strip

### Hub

- Completions strip added between platform grid and activity section: `★ Completions | N total · X Perfect · Y Mastered · Z Beaten | [icon] latest game ★ TYPE · time ago | View all →`
- Latest completion shows game icon, name, uppercase type badge, and time ago
- Mobile view simplified to `★ Completions | N total | View all →` — breakdown and latest hidden
- Strip visibility controlled by `completions.visible` in `config.json` (defaults to visible)
- Completions link removed from footer (replaced by strip)

### Activity

- Shimmer skeleton loading state added — heatmap grid, filter bar, day headers, session rows, and achievement rows all shimmer while data loads (previously just showed `Loading…`)

### Pipelines

- RA `games.json` strips unused fields before writing — removes `richPresencePatch`, `imageBoxArt`, `forumTopicId`, `flags`, `isFinal`, `releasedAtGranularity`, `numDistinctPlayers*`, `userCompletion*` from game objects and `memAddr`, `authorUlid`, `dateCreated`, `dateModified`, `author` from achievement objects (~1MB saved); `imageIngame` and `imageTitle` were mistakenly stripped in a prior run (causing game card backgrounds to show icons instead of screenshots) — restored to pipeline output
- Steam achievement icon URLs stored as filename hash only in `games.json` instead of full CDN URLs (~1.4MB saved); `achIconUrl(appId, hash)` helper in `helpers.js` reconstructs full URLs at render time; `achievements.json` and `profile.json` continue to store full URLs
- `appId` now embedded in each Steam achievement progress object so the Activity tab can reconstruct icon URLs without a separate lookup

### Structure

- RA data directory renamed `data/retroachievements/` → `data/ra/`
- RA achievement chunk files moved from `data/ra/achievements_N.json` → `data/ra/achievements/N.json`
- `activityHeatmap` extracted from `profile.json` into `data/ra/achievements/heatmap.json`; frontend fetches it separately when the Activity tab opens
- Steam achievements split into quarterly chunks at `data/steam/achievements/N.json` mirroring RA structure; `data/steam/achievements/heatmap.json` added with precomputed day→count map
- `mostRecentUnlock` moved from `achievements.json` into `profile.json` so it's available on mount without loading any chunk
- Steam `ActivityTab` now receives `heatmapData` as a prop (precomputed) instead of deriving it client-side from loaded achievements; chunks lazy-loaded when Activity tab opens
- Steam profile Activity tab now loads one chunk at a time via `loadNextChunk` (matching RA pattern) with a "Load more" button and shimmer skeleton; previously loaded all 4 chunks at once
- Combined activity page (`/activity/`) loads chunk 1 of both RA and Steam first for fast initial render, then streams chunks 2–4 in the background; previously loaded all 8 chunks concurrently on mount

### RetroAchievements

- `RAchievementModal` header now shows subset name as a subtext line (e.g. `Sonic the Hedgehog [Subset - Bonus]`) matching the `GameCard` display
- `GameCard` now shows a preview strip of up to 6 achievement badge icons (unlocked first) with hover tooltips showing name, description, points, and HC badge; clicking opens the detail modal
- `RAchievementModal`: full-screen achievement detail modal with game header (icon, console, status, progress bars), optional genre/developer/released meta row, Status (All/Unlocked/Locked) and Type (All/Progression/Missable) filter rows, and per-achievement rarity ratio badge (UR/VR/R/UC), type icons (Progression/Win Condition/Missable), HC/SC completion bars, and unlock date
- Modal popovers (rarity badge, type icons) use `position: fixed` + `getBoundingClientRect` — escapes the scroll container so tooltips are never clipped regardless of scroll position
- Progress percentage labels on `GameCard` now have text shadow to match Steam

### Steam

- `SteamGameCard` now shows the same achievement preview strip with hover tooltips showing name, description, and rarity gem + label + %; clicking opens the detail modal
- `AchievementModal`: achievement detail modal with game header image, progress bar, Status filter, and per-achievement rarity bar + gem + label + % and unlock date

---

## v26.03.26

Combined activity feed launched at `/activity/`, hub gets a recent activity snippet, project restructured under `/profile/` and renamed to `gaming-hub`. Changelog page added.

### Hub

- Recent Activity section added: 8 most recent combined achievements with "View all →" link to `/activity/`
- Activity section toggled by `activity.visible` in `config.json`; hidden by default until config loads (no skeleton flash when disabled)
- Hub activity `timeAgo` now shows minute/hour granularity (`5m ago`, `2h ago`) instead of day-only (`today`)
- Steam horizontal overflow on mobile fixed (`overflow-x: hidden` on `html, body`)

### Activity

- New combined activity page at `/activity/` — heatmap, platform filter (All / RA / Steam), timeline grouped by day → game session → achievement
- Day headers are collapsible; click any heatmap cell to filter to that day
- Game sessions show platform icon, game icon, console name (RA only), and unlock time range
- Achievement rows show icon, name, description, and unlock time; left border colored by platform (gold = RA, blue = Steam)
- RA game names parsed for subset and tilde tags; subset badge + name rendered inline in session header
- Heatmap colors switch to gold/blue palette based on active platform filter

### Structure

- Platform profiles moved under `/profile/` — RA at `/profile/ra/`, Steam at `/profile/steam/`
- `/profile/index.html` added as an instant redirect to hub (prevents directory listing)
- `profile.js` renamed to `app.js` across all pages for consistency
- Steam `app.js` split into `utils/constants.js` (`STEAM_STATUS`, `PROGRESS_SORTS`) and `utils/helpers.js` (formatting, URL, and rarity helpers)
- Activity `app.js` split into `utils/constants.js`, `utils/helpers.js`, and `utils/normalizers.js` (`normalizeRA`, `normalizeSteam`)
- Repo and app renamed from `gaming-profile` to `gaming-hub`; all "Gaming Profile" references updated to "Gaming Hub"
- Changelog page added at `/changelog/` — fetches and parses `changelog.md`, renders releases with collapsible sections, platform color coding, and per-release summaries
- Changelog linked from hub footer

### Pipelines

- RA and Steam workflows now use differentiated commit messages: `update` for incremental, `full refresh` for full game refresh, `unlock refresh` for Steam unlock-only runs

---

## v26.03.25

Steam profile fully built out with achievement rarity system and pipeline automation; hub overhauled with dynamic config and per-platform visibility controls.

### Hub

- Sticky topbar added
- `data/hub/profile.json` renamed to `data/hub/config.json`
- Per-platform config with `visible` and `active` flags; active/coming soon counts derived dynamically
- Active/coming soon text hidden when count is 0
- Cards with `visible: false` are hidden; grid recenters for fewer than 3 visible platforms
- Header subtitle size bumped from 9px to 11px
- Back-to-top button added (same as RA page)
- Recently played row spacing improved; rows use `flex:1` to fill card height evenly on both RA and Steam cards
- Row text gap added (2px) between title and sub lines

### RetroAchievements

- Recently played games with 0 earned achievements now always fetched so they appear in the dashboard
- Most Recently Unlocked game name hover color changed to soft white (`#c6d4df`) for clearer feedback
- Sticky topbar and tab bar added

### Steam

- Achievement rarity system: Very Rare (<10%), Rare (<10–30%), Common (≥30%) with gold/blue/gray color coding via left border, title color, and gem icon
- Global achievement % fetched per game via `GetGlobalAchievementPercentagesForApp` API; stored as `globalPct` on each achievement
- Most Recently Unlocked card: 4-line layout (name, description with fallback, rarity, game+time); game name links to store page
- Most Recently Played card: latest achievement row added; consistent row spacing
- Activity tab: rarity gem icon + label + % shown per achievement; game name links to store page
- Game card: removed "Latest:" label; library portrait (`library_600x900.jpg`) used as card background with correct mask fade; portrait fallback to `header.jpg`
- Achievement expanded view: "Global: X%" replaced with rarity gem + label + %; locked achievement bar uses neutral color
- Completion tab: tiebreaker sort by last achievement unlocked date when pct is equal
- Perfect games sidebar: sorted by rarity ascending; shows rarity label + % with gem icon; available on all tabs (moved to `profile.json`)
- `sentinel-cache.json` separated from `games.json` — pipeline-only, not loaded by frontend
- Zero-unlock recently played games now cached with full locked achievement list
- `recentAchievements` entries include `globalPct` for Activity tab rarity display
- Sticky topbar and tab bar added
- Fixed inverted `mask-fade` CSS in `steam/index.html` (was fading wrong direction)
- GitHub Actions workflow added (`fetch-steam-data.yml`): incremental every 3h at :10, unlock refresh at midnight :10
- Env var renamed from `STEAM_ID` to `STEAM_USER_ID` to match GitHub Actions workflow secret name

---

## v26.03.24

Hub rendered dynamically from config file; RA dashboard improvements including lazy-loaded activity, tilde tag badges, and refactored utils; automated data pipeline introduced.

### Hub

- Hub profile data (`username`, `motto`, `tags`, `platforms`) moved to `data/hub/config.json`; `index.html` renders it dynamically

### RetroAchievements

- Want-to-play list now paginates to fetch all items beyond the 500-item API limit
- `app.js` refactored: non-JSX code extracted into `utils/constants.js`, `utils/helpers.js`, and `utils/transform.js`
- Stats pills: points shown in gold to improve visual hierarchy
- Activity tab now lazy-loads achievements in 3-month chunks; heatmap stays complete using precomputed data from `profile.json`
- Game title tilde tags (`~Homebrew~`, `~Hack~`, etc.) displayed as badges across dashboard and hub

### Structure

- Pipeline supports incremental mode (skips cached games) and splits achievement data into quarterly files
- Automated GitHub Actions workflow — fetches data every 3 hours and does a full refresh at midnight, commits results to main
- Scripts reorganized into `scripts/` folder; `package.json` at root with `npm run` commands for all tasks

---

## v25.03.23 — Initial release

First release — hub page with RA card, full RA dashboard with heatmap and timeline, and ETL pipeline for data fetching.

### Hub

- Hub page with RetroAchievements card; Steam and Xbox coming-soon placeholders

### RetroAchievements

- RA dashboard: Overview, Recent Games, Completion Progress, Activity (heatmap + timeline), Watchlist
- Shimmer skeleton loading, mobile-responsive layout

### Structure

- ETL pipeline with 1-year achievement fetch, Firebase Firestore sync (disabled)
