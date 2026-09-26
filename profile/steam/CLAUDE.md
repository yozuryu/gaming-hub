# Steam Profile — Page Context

## Data Sources
- `../../data/steam/profile.json` — fetched on mount
- `../../data/steam/games/index.json` — fetched when any game tab opens (~200KB, no `achievements[]`)
- `../../data/steam/games/{appId}.json` — lazy-fetched per game when user opens achievement modal (`handleViewDetails`)
- `../../data/steam/achievements/heatmap.json` — fetched when Activity tab opens
- `../../data/steam/achievements/1.json` — fetched when Activity tab opens
- `../../data/steam/achievements/2–4.json` — lazy-loaded via IntersectionObserver

## Completions Panel (sidebar)
- Perfect games (2px gold border) then beaten-only games (from win conditions, 1px silver border `#b8c4ce`)
- Shows the first 2 rows of icons by default (perfect first, then beaten fill the remaining slots); "Show all N / Show less" button at the bottom reveals the rest. Row size follows the grid breakpoints via `useIconGridCols()` (5 / 8 at `sm` / 5 at `lg`).

## Tabs
Three tabs: **Recent Games** (Clock) · **Completion Progress** (BarChart2) · **Activity** (Activity)

- Tab state persists in URL: `?tab=progress`
- On mobile: icon + short label. On desktop: full text label.
- `tabBarRef` tracks the natural tab bar position. Same scroll-aware floating pill as RA profile.

## Completion Progress Filters
- Shared `ProgressFilterBar` + `applyProgressView()` (duplicated in RA and Steam `app.js` — keep them in sync)
- **Views** (first match wins, completed games excluded): **Nearly there** = 75%+ done, fewest achievements left first (ignores recency on purpose) · **In progress** = under 75%, played in the last 30 days, most recent first · **Abandoned** = under 75%, not played for 30+ days (or never), most recent first · **All** = everything, with the sort options and a **Perfect** toggle (hidden by default)
- Sort buttons only appear in the All view; the other views have a fixed order and show a one-line rule instead
- Mobile: views are a full-width 4-column segmented control; sort is a native `<select>` (chips on desktop)
- All-view sorts: `PROGRESS_SORTS` in `utils/constants.js` (Completion, Hours, Last Played)

## Floating Tab Pill (mobile)
Same architecture as RA profile:
- `showFloatingTabs` + `pillLeaving` + `pillLeaveTimer` ref
- `slideUpPill` / `slideDownPill` keyframes defined in inline `<style>` tag
- All three tabs use `#66c0f4` (blue) — no gold accent tabs on Steam

## SteamGameCard
Reused across both Recent Games and Completion Progress tabs. Uses pre-computed fields from `games/index.json`:
- `preview` — top 6 achievement icon hashes (not full URLs)
- `lastUnlockedAt` / `lastUnlockName` — shown without iterating `achievements[]`
Does NOT need `achievements[]` to render. Full achievement data only loaded on modal open.

## Achievement Modal
- `handleViewDetails` checks `gameDetails[appId]` cache first
- If not cached: sets `modalLoading` state, fetches `games/{appId}.json`, caches result, opens modal
- Fallback: opens modal with index data (no achievements) if fetch fails
- Do not change the modal game banner (`w-32 h-16` image) — previous attempts to resize it were rejected
