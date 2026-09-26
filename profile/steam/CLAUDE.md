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
