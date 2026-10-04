# Activity — Page Context

## Two views
One page, two views switched by the segmented control in the header (**Achievements | Playtime**). The view is kept in the URL (`?view=playtime`, absent = achievements) with `history.replaceState`. Both share the same layout (heatmap → streak → timeline), the platform filter and the selected day; only the metric changes. Switching view clears the selected day, and the Xbox filter falls back to All in Playtime (Xbox has no playtime; the header shows "Xbox n/a").

## Data Sources
- `../data/{ra,steam,xbox}/achievements/1–4.json` — all four fetched on mount (the heatmap is built in the browser from these chunks, in the viewer's timezone)
- `../data/{steam,xbox}/games/index.json` — game icons for Steam and Xbox sessions
- `../data/{ra,steam}/playtime/{YYYY}.json` — play sessions for the current and previous UTC year (covers the 365-day heatmap), fetched on mount; a missing year is treated as empty. Normalized by `normalizeSession()` (`startMs`, `endMs`, `minutes`, `approx`, game name/icon/url from the file's `games` map; RA icons get the `RA_MEDIA` prefix)

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
- Achievement groups: by day → session → individual achievements. A session is a run of consecutive unlocks in the same platform + game (same as cheevo-tracker), so A → B → A is three sessions; sessions and achievements are newest first. Never merge all of a game's unlocks for a day into one group — that breaks timeline order
- Reveals chunks 2–4 one at a time via IntersectionObserver with sentinel `ref` at bottom of list (already in memory; `nextChunk - 1` = chunks shown)
- Days, streaks and times use the viewer's timezone via `assets/time.js`; never group by `unlockedAt.substring(0, 10)` (that's the UTC day)

### Playtime view
- **Heatmap:** minutes per local day (`buildPlaytimeHeatmap`). Sessions crossing midnight are split with `splitByDay()` from `assets/time.js`, proportionally to the time on each side. Same palettes as the achievement heatmap; tooltip `2h 15m · 3 sessions`. "since {first session}" next to the title
- **Streak:** a day counts with at least `PLAYTIME_STREAK_MIN` (15) minutes. `computeStreak(heatmapData, minValue)` and `<StreakPanel>` are shared by both views (`describe` / `cellLabel` give the tooltip and circle text). Playtime circles show the largest whole unit only (`fmtMinutesShort`: `45m`, `2h`, `1d`, rounded down); the tooltip has the exact time
- **Timeline:** day → sessions, newest first (`PlaySessionRow`): game icon, name (RA titles through `parseTitle`), local start–end, duration, `≈` when `approx`, and a gold trophy count of unlocks from the achievement chunks for the same game between start and end (± `UNLOCK_GRACE_MS`, 5 min). A session crossing midnight is listed under both days with the start weekday shown; the day header total comes from the heatmap so it matches the split
- Reveals 30 days at a time via the same sentinel/IntersectionObserver (`hasMore` covers both views). A selected day shows all its sessions regardless

## CSS Animations
Defined in `<style>` tag inside the React return (established pattern):
- `flameFlicker` — flame icon wiggle on active streak days
- `pendingPulse` — border pulse on today's circle if no achievements yet
- `streakGlow` — glow on streak count number
