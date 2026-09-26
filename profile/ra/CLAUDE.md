# RA Profile — Page Context

## Data Sources
- `../../data/ra/profile.json` — fetched on mount; passed through `transform.js`
- `../../data/ra/games.json` — fetched on mount alongside profile
- `../../data/ra/watchlist.json` — fetched separately (split from profile.json)
- `../../data/ra/series.json` — fetched for Series tab
- `../../data/ra/achievements/1.json` — fetched when Activity tab opens
- `../../data/ra/achievements/2–4.json` — lazy-loaded via IntersectionObserver as user scrolls

## transform.js
Critical data layer — merges multiple API response shapes into what the UI expects. Takes `rawData` (profile + games + watchlist + achievements) and returns `{ profile: PROFILE_DATA, games: ALL_GAMES, backlog: BACKLOG }`. Do not bypass it or duplicate its logic.

## Tabs
Five tabs: **Recent Games** (Clock) · **Completion Progress** (BarChart2) · **Series Progress** (Layers) · **Activity** (Activity) · **Watchlist** (Star)

- Series tab only renders if `seriesData.some(s => s.showProgress)`
- Tab state persists in URL: `?tab=progress`
- On mobile: icon + short label. On desktop: full text label.
- `tabBarRef` tracks the natural tab bar position. Scroll handler watches `getBoundingClientRect().bottom < 0` to show/hide floating pill.

## Completion Progress Filters
- Shared `ProgressFilterBar` + `applyProgressView()` (duplicated in RA and Steam `app.js` — keep them in sync)
- **Views** (first match wins, completed games excluded): **Nearly there** = 75%+ done, fewest achievements left first (ignores recency on purpose) · **In progress** = under 75%, played in the last 30 days, most recent first · **Abandoned** = under 75%, not played for 30+ days (or never), most recent first · **All** = everything, with the sort options and a **Mastered** toggle (hidden by default)
- Sort buttons only appear in the All view; the other views have a fixed order and show a one-line rule instead
- Mobile: views are a full-width 4-column segmented control; sort is a native `<select>` (chips on desktop)
- All-view sorts: Overall % or Progression % (progression + win-condition achievements)
- `raDateMs()` parses RA's `YYYY-MM-DD HH:MM:SS` (UTC) dates — Safari/iOS can't parse that format with `new Date()` directly

## Floating Tab Pill (mobile)
- Shows when natural tab bar scrolls off screen
- `showFloatingTabs` state + `pillLeaving` state for exit animation
- `pillLeaveTimer` ref: 210ms delay before unmounting so `slideDownPill` animation completes
- Positioned: `bottom: calc(68px + env(safe-area-inset-bottom, 0px))`
- Render condition: `{(showFloatingTabs || pillLeaving) && <div ...>}`

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
