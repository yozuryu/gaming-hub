# Analytics — Page Context

Metrics across playtime and achievements. Everything is computed in the browser, in the viewer's timezone (`assets/time.js`), from the files below.

## Data Sources (all fetched on mount, `loadAll()`)
- `../data/{ra,steam,xbox}/history/index.json` → the listed `{YYYY}.json` files: all-time unlocks `{ t, g, a, n, p?, r?, hc? }`
- `../data/{ra,steam}/playtime/{YYYY}.json` for every year from `PLAYTIME_FIRST_YEAR` (2026) to now: play sessions + `games` name/icon (RA also `console`)
- `../data/{ra,steam,xbox}/profile.json`: completions (RA `Mastery/Completion` awards, Steam/Xbox `perfectGames`), funnel counts, RA console names (`gameAwardsAndProgress`, `recentlyPlayedGames`, awards)
- `../data/{steam,xbox}/games/index.json`: names and icons; Steam "started" count
- Not `data/ra/games.json` (5 MB). No genre breakdown for that reason

Game metadata is merged into `meta[platform][id]` (string ids) from all of the above.

## Period
One selector in the header scopes every section: 30 days · 12 months · This year · All time, kept in the URL as `?period=` (absent = 30 days). Ranges are inclusive local day keys (`buildRange`); the previous period is the same length before it ("This year" compares with the same days of last year; All time has none). Trend buckets: day (30 days), month (12 months, this year), year (all time; playtime falls back to months since tracking started).

Playtime only exists since logging started (2026-03-26). Playtime tiles show "since …" when the period starts earlier, and their change vs the previous period is hidden unless that period was fully tracked.

## Sections
- **Overview:** 8 stat tiles (hours, active days = days with play or an unlock, sessions, avg session, achievements, RA points, gamerscore, completed) with % change
- **Trends:** stacked columns, hours played (RA/Steam) and achievements unlocked (RA/Steam/Xbox)
- **When you play:** two punchcards (day of week × hour): playtime minutes (sessions split across hours) and unlock counts
- **Top games:** most played, most unlocks, minutes per achievement (3+ unlocks and 30m+ played, fastest first)
- **Sessions:** length histogram (<5m … 4h+), longest session, median
- **Rarity:** 100% stacked bar of rarity tiers per platform (site rarity colors, `RARITY_TIERS`), rarest unlocks in the period
- **Completion:** all-time funnel per platform (RA started → beaten → mastered; Steam owned → played → started → perfect; Xbox owned → started → completed), plus completions in the period and median days from a game's first unlock to completion
- **RA by console:** hours and achievements per console

## Charts (hand-written, no chart library)
- `StackedColumns` / `Column`: bars cap at 24px, 2px surface gap between segments, rounded top only, 3 recessive gridlines, labels thinned to ~8
- `BarList`, `Punchcard` (`HEAT_RAMP`, one hue), `RarityBar`, `Funnel`, `StatTile`
- Platform colors in fixed order (`PLATFORMS`: RA gold, Steam blue, Xbox green), so filtering never repaints a series. Text never uses series colors (except rarity % in the rarest list, matching the Steam page)
- One page-level fixed `Tooltip` via `TipContext`; marks get hover + keyboard focus through `useTip()`. Every chart card (`ChartCard`) has a **Table** toggle so no value is hover-only
- Helpers live in `analytics/utils.js` (copies of Activity's `fmtMinutes`, `parseTitle`, `xboxImg`; pages don't share modules)
