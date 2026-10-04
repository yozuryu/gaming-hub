# Analytics — Page Context

Metrics across playtime and achievements. Everything is computed in the browser, in the viewer's timezone (`assets/time.js`), from the files below.

## Data Sources (all fetched on mount, `loadAll()`)
- `../data/{ra,steam,xbox}/history/index.json` → the listed `{YYYY}.json` files: all-time unlocks `{ t, g, a, n, p?, r?, hc? }`
- `../data/{ra,steam}/playtime/{YYYY}.json` for every year from `PLAYTIME_FIRST_YEAR` (2026) to now: play sessions + `games` name/icon (RA also `console`)
- `../data/{ra,steam,xbox}/profile.json`: completions (RA `Mastery/Completion` awards, Steam/Xbox `perfectGames`), funnel counts, RA console names (`gameAwardsAndProgress`, `recentlyPlayedGames`, awards)
- `../data/{steam,xbox}/games/index.json`: names, icons and current `unlocked`/`total` per game; Steam "started" count and farm detection (`playtimeForever`). RA current progress comes from `gameAwardsAndProgress` (`numAwarded` / `maxPossible`)
- Not `data/ra/games.json` (5 MB). No genre breakdown for that reason

Game metadata is merged into `meta[platform][id]` (string ids) from all of the above.

## Period
One selector in the header scopes every section: 30 days · 3 months · 12 months · This year · All time, kept in the URL as `?period=` (absent = 30 days). Ranges are inclusive local day keys (`buildRange`); the previous period is the same length before it ("This year" compares with the same days of last year; All time has none). 3 months and 12 months are calendar months including the current one. Trend buckets: day (30 days), week keyed by its Monday (3 months; the first week can start before the range, only in-range days count), month (12 months, this year), year (all time; playtime falls back to months since tracking started).

**Hide achievement farms** (checkbox next to the period, on by default; `?farms=show` turns it off) removes farm games from every section: unlocks, sessions, completions, and the per-game lists. A farm is a Steam game with `FARM_MIN_UNLOCKS` (10)+ unlocks earning more than `FARM_PER_HOUR` (15) achievements per hour of lifetime playtime (`games/index.json` `playtimeForever`). Real games stay at or under ~6/h; farms (Slash It, Lines X, …) run 20–700/h. Steam only: RA sets are curated, and Xbox has no playtime but a fixed 1,000 gamerscore per game. The checkbox tooltip lists the detected games. The all-time funnel uses profile counts and is not filtered.

Playtime only exists since logging started (2026-03-26). Playtime tiles show "since …" when the period starts earlier, and their change vs the previous period is hidden unless that period was fully tracked.

## Sections
- **Overview:** 8 stat tiles (hours, active days = days with play or an unlock, sessions, avg session, achievements, RA points, gamerscore, completed) with % change
- **Trends:** stacked columns, hours played (RA/Steam) and achievements unlocked (RA/Steam/Xbox)
- **When you play:** two punchcards (day of week × hour): playtime minutes (sessions split across hours) and unlock counts
- **Top games:** most played; **most progress** (share of each game's set earned in the period, sets of 10+, ties → bigger set, gold ★ if completed in the period); **almost complete** (current progress of unfinished games, ignores the period, sets of 10+, ties → fewest left); minutes per achievement (3+ unlocks and 30m+ played, slowest first). "Most unlocks" was dropped: it rewarded achievement farms, and rarity weighting doesn't fix that (farm achievements look rare because few owners grind them)
- **Sessions:** length histogram (<5m … 4h+), longest session, median
- **Rarity:** 100% stacked bar of rarity tiers per platform (site rarity colors, `RARITY_TIERS`), rarest unlocks in the period
- **Completion:** all-time funnel per platform (RA started → beaten → mastered; Steam owned → played → started → perfect; Xbox owned → started → completed), plus completions in the period and median days from a game's first unlock to completion
- **RA by console:** hours and achievements per console

## Charts (hand-written, no chart library)
- `StackedColumns` / `Column`: bars cap at 24px, 2px surface gap between segments, rounded top only, 3 recessive gridlines, labels thinned to ~8
- `TitleMarks`: RA subset badge + subset name + tilde tags (`TILDE_TAG_COLORS`), shown wherever an RA game name appears (Top games rows via `gameRow`'s `marks`, rarest unlocks, longest session); pair it with `parseTitle(name).baseTitle`
- `BarList`, `Punchcard` (`HEAT_RAMP`, one hue), `RarityBar`, `Funnel`, `StatTile`
- Platform colors in fixed order (`PLATFORMS`: RA gold, Steam blue, Xbox green), so filtering never repaints a series. Text never uses series colors (except rarity % in the rarest list, matching the Steam page)
- One page-level fixed `Tooltip` via `TipContext`; marks get hover + keyboard focus through `useTip()`. Every chart card (`ChartCard`) has a **Table** toggle so no value is hover-only
- Helpers live in `analytics/utils.js` (copies of Activity's `fmtMinutes`, `parseTitle`, `xboxImg`; pages don't share modules)
