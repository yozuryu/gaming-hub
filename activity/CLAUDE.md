# Activity — Page Context

## Data Sources
- `../data/{ra,steam,xbox}/achievements/1–4.json` — all four fetched on mount (the heatmap is built in the browser from these chunks, in the viewer's timezone)
- `../data/{steam,xbox}/games/index.json` — game icons for Steam and Xbox sessions

All RA/Steam/Xbox achievements are normalized to a unified shape via `utils/normalizers.js`:
- `normalizeRA()` → `{ platform, gameId, gameName, achievementName, icon, unlockedAt, points, tags, ... }`
- `normalizeSteam()` → same shape
- `normalizeXbox()` → same shape (`gameId` = `titleId`, game links to xbox.com search)

## Key Features

### Heatmap
- 365-day GitHub-style grid
- Filterable by platform (All / RA / Steam / Xbox)
- RA peak color: `#e5b143` (gold). Steam peak color: `#66c0f4` (blue). Xbox peak color: `#52b043` (green).
- `overflow-x: auto` wrapper with `minWidth: ${53 * 14}px` inner — intentional, do not change.
- `scrollRef` on the wrapper div; `useEffect` auto-scrolls to `scrollWidth` on mount so the most recent weeks are visible immediately on mobile.

### Streak Panel
- Below heatmap
- Circle timeline showing last **5 days on mobile** / **14 days on desktop** — evaluated at render time via `window.innerWidth < 768 ? streakInfo.last14.slice(-5) : streakInfo.last14`
- Connector logic uses `arr[i-1]` (the rendered slice) not the original `streakInfo.last14[i-1]`
- Current/longest streak, animated flame icons (`flameFlicker` keyframe) on active days
- Gold connectors between consecutive active days
- Today is **never** counted as a streak break — the streak holds until the day ends with no achievements

### Timeline
- Achievement groups: by day → by game → individual achievements
- Reveals chunks 2–4 one at a time via IntersectionObserver with sentinel `ref` at bottom of list (already in memory; `nextChunk - 1` = chunks shown)
- Days, streaks and times use the viewer's timezone via `assets/time.js`; never group by `unlockedAt.substring(0, 10)` (that's the UTC day)

## CSS Animations
Defined in `<style>` tag inside the React return (established pattern):
- `flameFlicker` — flame icon wiggle on active streak days
- `pendingPulse` — border pulse on today's circle if no achievements yet
- `streakGlow` — glow on streak count number
