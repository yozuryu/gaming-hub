# Activity — Page Context

## Three views
One page, three views switched by the segmented control in the header (**Unlocks | Playtime | Playing**; on mobile it's its own full-width row under the title). The view is kept in the URL (`?view=playtime` / `?view=playing`, absent = achievements) with `history.replaceState`. Achievements and Playtime share the same layout (filter → summary card → timeline), the platform filter and the selected day; only the metric changes. Switching view clears the selected day, and the Xbox filter falls back to All in Playtime and Playing (both are measured in play time, which Xbox doesn't report; Playtime says so beside the filter and shows Xbox n/a in the split). The header holds only the title and the switch, plus the group counts in Playing.

### Playing view
Games in rotation from `loadPlaying()` in `assets/playing.js` (rules in the root CLAUDE.md, "Playing"), loaded the first time the view opens. No heatmap: header pills with the group counts, then "In Rotation" with the platform filter (All / RA / Steam) and one section per group (Playing, On hold, Drifting: coloured dot, label, count, the group's hint), each a grid of `PlayingTile`s sorted by last played (2 across on mobile, 4 on desktop). A group with no games is left out; its 0 stays in the header pills. A tile: cover (`TileCover`: box at Steam's 460×215 header ratio; RA, or a missing header, shows the icon centered on a blurred copy of itself), last-played tag on the cover (no status chip: the section heading says it); platform badge, title, achievement progress bar, the 13-week play strip with its "13 weeks ago → now" axis; then a stats band: avg session and sessions (last 13 weeks), all-time playtime (`–` until known). The whole tile links to the game's page. The hub's Playing section links here

## Data Sources
- `../data/{ra,steam,xbox}/achievements/1–4.json` — all four fetched on mount (the heatmap is built in the browser from these chunks, in the viewer's timezone)
- `../data/{steam,xbox}/games/index.json` — game icons for Steam and Xbox sessions
- `../data/ra/art.json` — RA wide art picked in the admin (hero, else banner) behind the unlock cards' game strip
- `../data/{ra,steam}/playtime/{YYYY}.json` — play sessions for the current and previous UTC year (covers the 365-day heatmap), fetched on mount; a missing year is treated as empty. Normalized by `normalizeSession()` (`startMs`, `endMs`, `minutes`, `approx`, game name/icon/url from the file's `games` map; RA icons get the `RA_MEDIA` prefix)

All RA/Steam/Xbox achievements are normalized to a unified shape via `utils/normalizers.js`:
- `normalizeRA()` → `{ platform, gameId, gameName, achievementName, icon, unlockedAt, points, tags, ... }`
- `normalizeSteam()` → same shape
- `normalizeXbox()` → same shape (`gameId` = `titleId`, game links to xbox.com search)

## Key Features

### Layout (Unlocks and Playtime)
Platform filter (`.frow`) at the top, then `SummaryCard`, then the timeline. Styles are in `index.html` (`.asum*`, `.astat`, `.split*`, `.rday*`, `.sline`, `.tday`, `.tcard*`, `.trow*`, `.prow*`, `.ptrack`, `.paxis`)
- **Summary card:** three past-year numbers from the filtered heatmap (`summaryStats`: total, active days, best day), `SplitBar` (each platform's share of the year, `splitParts`; the filtered one stays lit, Playtime shows Xbox n/a), `RecentDays` (last 14 days as bars against the busiest of them: current streak gold, other counting days blue, days under the streak minimum dim; tapping a bar selects the day) with `StreakTiles` (current streak, gold and glowing while one runs, and best streak with its dates; Playtime's 15-minute rule is in the 14-days heading), and the year `Heatmap`. Side by side from `md`. **Folded** by default on phones (`summaryOpen`, saved as `gh:activitySummary` in localStorage; open by default from `md`): `.asum-fold`: the last 14 days' total (`recentTotal`), the games played in them (`recentGames`: distinct games with an unlock, or a session ending, in those days; no streak here, it's nearly always 0 for someone playing in bursts) and from `sm` the past-year total as small `.astat`s, then the 14 days as bars (`RecentDays slim`, still tappable) capped at 336px wide and 28px tall so they never stretch flat on desktop, captioned "Last 14 days" (the stat labels stay one word; the past-year stat sits behind a divider), and a chevron. Opened, each part has its own heading (Past year, Last 14 days, Heatmap) and `.asum-less` sits in the card's top-right corner. Activity is read for the timeline first, so it must start on the phone's first screen
- **Day headings** (`DayHead`) are sticky: `top: env(safe-area-inset-top)` on phones, `26px` (under the breadcrumb bar) from `md`

### Heatmap
- 365-day GitHub-style grid inside the summary card
- RA peak color: `#e5b143` (gold). Steam peak color: `#66c0f4` (blue). Xbox peak color: `#52b043` (green).
- `overflow-x: auto` wrapper with `minWidth: ${53 * 14}px` inner — intentional, do not change.
- `scrollRef` on the wrapper div; `useEffect` auto-scrolls to `scrollWidth` on mount so the most recent weeks are visible immediately on mobile.

### Streak
- `computeStreak(heatmapData, minValue)`: current / longest run and the last 14 days. Today is **never** counted as a streak break — the streak holds until the day ends with no activity

### Timeline
- Achievement groups: by day → session → individual achievements. A session is a run of consecutive unlocks in the same platform + game (same as cheevo-tracker), so A → B → A is three sessions; sessions and achievements are newest first. Never merge all of a game's unlocks for a day into one group — that breaks timeline order
- `GameSession`: one `.tcard` per session. The header (`.tcard-head`) must read as a heading, not another row: a darker-blue band with the game's art faded in from the right (`StripArt`, `.tcard-art`: Steam `library_hero.jpg`, else `header.jpg` (some games have no hero); RA the hero picked in the admin, `data/ra/art.json`, else its banner; otherwise the icon blurred; at most 380px wide. Heroes over banners: no logo behind the title), a 28px icon and a 13.5px bold title, a subset's name on its own gold line under the title (`.tcard-subset`), and a sub-line with platform, console, time range and the unlock count (kept on the plain left side, never over the art where it washes out). Achievements are `.trow`s with 36px badges, bigger than the game icon (RA points, Steam rarity % in the tier colour). More than `SESSION_FOLD` (5) folds after 4 with "Show N more"
- Reveals chunks 2–4 one at a time via IntersectionObserver with sentinel `ref` at bottom of list (already in memory; `nextChunk - 1` = chunks shown). The summary uses every chunk
- Days, streaks and times use the viewer's timezone via `assets/time.js`; never group by `unlockedAt.substring(0, 10)` (that's the UTC day)

### Playtime view
- **Heatmap:** minutes per local day (`buildPlaytimeHeatmap`). Sessions crossing midnight are split with `splitByDay()` from `assets/time.js`, proportionally to the time on each side. Same palettes as the achievement heatmap; tooltip `2h 15m · 3 sessions`
- **Streak:** a day counts with at least `PLAYTIME_STREAK_MIN` (15) minutes; bar labels show the largest whole unit only (`fmtMinutesShort`)
- **Timeline:** day → games (`PlayDay`, `playDayGames()`): one `PlayGameRow` per game, latest played first, with a 24-hour `.ptrack` (a segment per session, clipped to the day; `approx` sessions hatched), the day's share of its minutes (same split as the heatmap), session count and first start – last end (`≈` when any is approx, the start weekday when it began the day before) and a gold trophy count of unlocks from the achievement chunks for the same game between start and end (± `UNLOCK_GRACE_MS`, 5 min). The day heading total comes from the heatmap so it matches the split
- Reveals 30 days at a time via the same sentinel/IntersectionObserver (`hasMore` covers both views). A selected day shows all its sessions regardless

## CSS Animations
Defined in `<style>` tag inside the React return (established pattern):
- `flameFlicker` — the current-streak tile's flame while a streak is running
