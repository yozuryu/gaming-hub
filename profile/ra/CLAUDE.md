# RA Profile — Page Context

## Data Sources
- `../../data/ra/profile.json` — fetched on mount; passed through `transform.js`
- `../../data/ra/games.json` — fetched on mount alongside profile
- `../../data/ra/watchlist.json` — fetched separately (split from profile.json)
- `../../data/ra/series.json` — fetched for Series tab
- `../../data/ra/achievements/1–4.json` — all four fetched when Activity tab opens (the heatmap is built in the browser from these chunks, in the viewer's timezone); the timeline reveals them one at a time (`shownChunks`) as the user scrolls

## transform.js
Critical data layer — merges multiple API response shapes into what the UI expects. Takes `rawData` (profile + games + watchlist + achievements) and returns `{ profile: PROFILE_DATA, games: ALL_GAMES, backlog: BACKLOG }`. Do not bypass it or duplicate its logic.

## Tabs
Six tabs: **Overview** (User, the default) · **Recent** (Clock) · **Progress** (BarChart2) · **Series** (Layers) · **Activity** (Activity) · **Watchlist** (Star), in the shared `TabBar` (`assets/tabs.js`, see the root CLAUDE.md "Profile tabs")

- Series tab only renders if `seriesData.some(s => s.showProgress)`
- Tab state persists in URL: `?tab=progress`
- Overview holds what used to sit above the tabs: Last Played (the `GameListRow` with an `extra` line: rich presence with a cyan `Radio` marker), Most Recently Unlocked, User Stats as `StatTiles` (`STAT_LABELS` shortens the labels; `statsRight` behind "More stats"), Game Awards
- Sticky, scrolls sideways, swipe between tabs on phones (`useSwipeTabs`, order = `tabIds`)
- Recent: a search over every game, newest played first (up to 50); empty search = the latest 15. All searches use `fold()` (no accents or case: "pokemon" finds "Pokémon")

## Completion Progress Filters
- Shared `ProgressFilterBar` + `applyProgressView()` (duplicated in RA and Steam `app.js` — keep them in sync)
- **Views** (first match wins, completed games excluded): **Nearly there** = 75%+ done, fewest achievements left first (ignores recency on purpose) · **In progress** = under 75%, played in the last 30 days, most recent first · **Abandoned** = under 75%, not played for 30+ days (or never), most recent first · **All** = everything, with the sort options and a **Mastered** toggle (hidden by default)
- Sort buttons only appear in the All view; the other views have a fixed order and show a one-line rule instead
- Mobile: views are a full-width 4-column segmented control; sort is a native `<select>` (chips on desktop)
- All-view sorts: Overall % or Progression % (progression + win-condition achievements)
- `raDateMs()` parses RA's `YYYY-MM-DD HH:MM:SS` (UTC) dates — Safari/iOS can't parse that format with `new Date()` directly

## Game list: list / tiles
Recent Games and Completion Progress render `GameListRow` (icon, title, console, Hardcore flame / Softcore feather, tags, playtime · last played, count + bar, screenshot faded on the right, status stripe) or `GameTile` (icon over the blurred screenshot, last played, mode, title, console, bar, count + playtime, status colour on the bottom edge), switched by `ViewToggle` + `useGameView()` (`assets/game-view.js`, shared with Steam and Xbox). Tap opens the achievement sheet; the guide links (`GuideStrip inModal`) live in the sheet under the genre line. The Series tab has its own cards (see Series).

## Achievement modal and header art
- The modal shell is the shared sheet (`assets/sheet.js` `useSheet`, `.sheet-*` in `assets/ui.css`): bottom sheet below `md` that covers the bottom nav (z-index 210 > 200) and closes by dragging the header down; centred dialog from `md`
- **RA art fallback:** `raShot()` in `utils/helpers.js` treats RA's "no image" placeholder (`/Images/000002.png`, e.g. Poring Clicker) as missing. `transform.js` sets `game.artIsIcon` when the art fell back to the icon; the art then gets `.art-icon` (zoomed and blurred harder) wherever it sits behind something
- Profile header: the most recently played game's screenshot (or icon) blurred behind it (`HeaderArt`)

## Series
- `buildSeries()` → one entry per `showProgress` series: per-game status (from `games.json`, else the watchlist entry), counts, points/achievement totals, `latestAch`, `lastMs` (latest unlock or last played)
- Card (`.scard`): cover icon (`coverGameId`, else the first id), counts, % + `shortAgo(lastMs)`, bar, icon strip (`seriesIconOrder`: mastered, started by recency, not started, no achievements; classes `mastered` / `dim` / `noach`)
- **Art:** the cover's screenshot, else the most recently active series game with a `raShot`, else the cover icon (`.art-icon`). Watchlist-only covers have no screenshot (watchlist entries only carry `imageIcon`)
- `SeriesSheet` (shared sheet): stats, latest unlock, grouped games; played games are `GameListRow compact`, others `.wrow`. Sections `.ssheet-sec` (Latest unlock gold, Games blue) with the status groups (`.ssheet-group`) under Games. `.grow` is also Tailwind's `flex-grow: 1` utility, so `.sheet-scroll > .grow` resets it (rows stretched in short sheets). Opening a game sets `seriesBack`, so the achievement modal shows `.sheet-back` and returns to the series

## Watchlist
- A list in the profile game-row style (`.wlist` / `.wrow` in `assets/ui.css`), two columns on desktop: icon, title + subset / tilde tags, console · points, and the status once on the right (in progress: count + bar; Mastered tag; not started: trophy + achievement count; no achievements: dimmed). Status colour on the left edge
- **Subsets stack under their base game** (`stackSubsets()`): same title and console; a combined base "A | B" counts as each of its names. A stacked game is one card (`.wstack`): the name · console on one line (`.whead`), then one row per set (`SetRow`): "Base set" first, then each subset (gold name, wraps to two lines), each with its own icon, points, status and edge colour. A subset whose base isn't listed stays a normal row
- Grouping (Group dropdown): none · console (rows drop the repeated console) · status · series · subsets (With subsets open / Without subsets closed; counts are games, not sets)
- The row builders (`gameRow`, `setRow`, `stackCard`, `rows`) are **render functions, not components**: they're defined inside App's render, and as components React would remount all rows on every re-render (e.g. on scroll), replaying their fade. Don't turn them back into `<Components />` without moving them to module level

## User Stats (mobile)
- Stats split into `statsLeft` (Points, Rank, Beaten, Mastered) and `statsRight` (additional stats)
- On mobile: `statsRight` is hidden by default (`hidden sm:flex`)
- `statsExpanded` state controls visibility; toggled by a "Show more / Show less" button with `ChevronDown` rotation
- Toggle button has class `sm:hidden` — only visible on mobile

## Game Awards
- Sorted by type (Mastered first) then date desc
- Deduplicated: if a game has both Beaten and Mastered, only Mastered is shown
- Mastered icons: 2px solid gold border. Beaten: 1px solid silver border (`#b8c4ce`).
- Shows the first 2 rows of icons by default; a "Show all N / Show less" button at the bottom (only when there are more) reveals the rest. Row size follows the grid breakpoints via `useIconGridCols()` (5 / 8 at `sm` / 5 at `lg`), so 2 rows = 10 or 16 icons.

## RA Title Parsing
Game titles use special syntax:
- `~Tag~` prefix → tag (Homebrew, Demo, Prototype, Hack) — rendered as colored badge
- `[Subset - Name]` suffix → subset game; extract parent title and subset name
Handled by `utils/helpers.js:parseTitle()`.
