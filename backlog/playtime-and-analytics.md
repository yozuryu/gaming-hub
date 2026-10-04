# Playtime log, Activity views and Analytics page

**Status:** Done 2026-10-04 (all phases) · **Priority:** 6 · Written 2026-10-04

## Goal

1. **Playtime log:** turn the lifetime playtime totals the pipelines already fetch into timestamped play sessions, so playtime gets the same day-by-day treatment achievements have.
2. **Activity page with two views:** *Achievements* (today's page) and *Playtime* (new).
3. **Analytics page:** metrics across playtime and achievements, not just counts.

## Decisions (made 2026-10-04)

- **Platforms:** Steam and RA only for playtime. Xbox has no playtime (`stats` is null on OpenXBL), so Xbox appears in achievement metrics only and the Playtime view says so; it is never shown as zero hours.
- **Store sessions, not daily totals.** All data is UTC and the site displays the viewer's timezone. Daily totals bucketed at UTC midnight would put an evening session in UTC+7 on the wrong day, and the frontend could never fix it. Each record has a `start`/`end`; `assets/time.js` groups records into local days (splitting sessions that cross midnight).
- **No monthly/yearly rollup.** About 150 KB per year, so ten years of full detail is ~1.5 MB. Rolling up would permanently delete the detail and make old data timezone-wrong to save a few hundred KB. Instead: **one file per calendar year**; pages load only the years they need. If a year file ever gets too heavy, add a summary file *next to* it, never instead of it.
- **Backfill from git history.** Every hourly snapshot since 2026-03-25 (Steam, 2,169 commits of `profile.json`) and 2026-03-27 (RA, 2,104 commits of `games.json`) is in git. A one-off script replays them, so the log starts with ~6 months of history.
- **Activity: one page, two views** (segmented control under the header), not two pages. Both views have the same layout (heatmap → streak → timeline) and share the platform filter, so it's one component set with a different metric. It takes one bottom-nav slot, not two. View is kept in the URL (`?view=playtime`) so it can be linked and survives reload.
- **Analytics is a new page** at `/analytics/`. In the mobile nav it takes the **Log** slot as **Stats**; the changelog moves to a link on the hub page (mobile header + the existing desktop footer). The Refresh app button stays on the changelog page, so it is still reachable.
- **Charts are hand-written SVG components** (bar, stacked bar, punchcard, histogram), not a chart library: the stack is CDN-only, there are only ~4 chart types, and hand SVG matches the compact dashboard style.

---

## Data

### Playtime sessions: `data/{steam,ra}/playtime/{YYYY}.json`

```json
{
  "metadata": { "generatedAt": "2026-10-04T10:10:00Z", "year": 2026 },
  "games": { "550": { "name": "Left 4 Dead 2", "icon": "https://…" } },
  "sessions": [
    { "start": "2026-09-29T11:20:04Z", "end": "2026-09-29T12:50:04Z", "gameId": 550, "minutes": 90, "approx": false }
  ]
}
```

- `games` holds name + icon for every game in the file. Steam's `games/index.json` only lists games with achievements, so it can't be the lookup.
- A session belongs to the year of its `end` (UTC). Rare cross-year sessions are split by the frontend like any midnight crossing.
- Sorted by `end`, newest last (append-friendly, stable diffs).

### Baseline: `data/{steam,ra}/playtime/state.json` (pipeline-only)

`{ "asOf": <ms>, "games": { "<id>": { "total", "lastPlayed", "lastEnd" } } }`. `total` in raw units (Steam minutes, RA seconds, so rounding never drifts); `lastEnd` = end of the last logged session, used to avoid overlaps; `asOf` = the last run that *changed* the state (so idle runs write nothing). Both paths are in `_config.yml` `exclude`. `approx` is only written when true.

### Unlock history: `data/{ra,steam,xbox}/history/{YYYY}.json`

The achievement chunks only cover 364 days and carry display fields for the timeline. Analytics needs **all-time** unlocks, but small. Loading 170 Steam game files per visit isn't acceptable, so each pipeline writes a compact log from data it already holds:

```json
{ "unlocks": [ { "t": "2026-09-29T12:41:00Z", "g": 550, "p": 10, "r": 3.2, "hc": true } ] }
```

- `p`: RA points / Xbox gamerscore (omitted for Steam). `r`: rarity % (Steam global %, Xbox `rarity.currentPercentage`, RA `numAwarded / numDistinctPlayersCasual`). `hc`: RA hardcore only.
- ~4,000 unlocks all-time today (RA 797, Steam 2,829, Xbox 368), so the whole history is a few hundred KB.
- Completions history already exists (Completions page sources) and is reused, not duplicated.

---

## Phase 0: Verify (before writing pipeline code)

Use the git history the backfill will replay:

- [ ] **Steam `rtime_last_played`:** is it session **end** (or last activity), and does `playtime_forever` update mid-session or only at the end? Compare consecutive snapshots of a known session. The session model depends on this.
- [ ] **RA `userTotalPlaytime` and `recentlyPlayedGames[].lastPlayed`:** how often does the total move during a session, and is `lastPlayed` the last rich-presence ping? Check whether RA counts idle time.
- [ ] RA rarity fields (`numAwarded`, `numDistinctPlayersCasual`) are present for every game in `games.json`.
- [ ] Count how many hourly runs had a Steam/RA playtime delta, to confirm the size estimate.

If Steam turns out to report `rtime_last_played` as session *start*, flip the model to `start = last_played, end = start + delta`. Everything else stays.

### Findings (2026-10-04, from 2,169 Steam and 2,107 RA snapshots)

- **Steam:** `rtime_last_played` is set when a session **starts** and moved to the session **end** when it closes. `playtime_forever` only changes at session end, never mid-session (80 increases, every one with `lastPlayed` moving too). When a snapshot catches a session in progress (`lastPlayed` moved, playtime unchanged; 9 times), the next increase ends exactly at the new `lastPlayed` and starts exactly at the old one (e.g. 08:38 → 09:43, delta 65). So `start = lastPlayed − delta` is exact for single sessions.
- **RA:** `lastPlayed` behaves as session end; the delta always fits the run window (0 of 228 too large). 5 cases changed playtime by ≤ 150 s with `lastPlayed` unchanged (one was −16 s): server-side corrections, not play. 43 cases moved `lastPlayed` with no playtime change (sub-minute sessions or playtime landing a run later).
- **Rarity:** `numDistinctPlayersCasual` is present for every RA game.
- **Volume:** 80 Steam + 233 RA playtime changes in ~6 months, so ~630 sessions a year (~60 KB), less than estimated.
- **Snapshot spacing:** median ~110 min, p90 ~220–245 min, max ~10 h. The pushed workflows still run on GitHub's late `schedule`; the cron-job.org hourly dispatch is only in the uncommitted working tree. Until it lands, several sessions of one game between two runs merge into one block ending at the last session's end.

### Rules this changes in Phase 1

- **`approx` is not "started before the previous run".** Sessions legitimately span runs (Steam's in-progress case above). Instead: `start = max(lastPlayed − delta, previous logged end for that game)`; if it had to be clamped, set `approx: true` (offline sync, or RA splitting a session across runs).
- **`lastPlayed` unchanged since the baseline → correction, not play:** update the baseline, log nothing (RA's small corrections, and negatives).

## Phase 1: Playtime log in the pipelines — done 2026-10-04

Built as `scripts/lib/playtime.js` (diff + writer), called from `logPlaytime()` in both pipelines after the other files are written; respects `--debug` (dry run). One addition to the plan below: **unknown games** count as new play only when last-played is after `state.asOf`, otherwise they're added to the baseline silently. Needed because the backfilled Steam baseline only knows 714 of 1,292 owned games (verified with a live dry run: 578 unknown, 0 sessions logged).

Same logic in `steam-pipeline.js` and `ra-pipeline.js`, as a small shared-shaped function in each (they don't share modules today):

1. Read `state.json`. **If missing:** write the current totals as the baseline and log nothing (otherwise the first run logs lifetime playtime as "today").
2. For each game, `delta = current − baseline`.
   - `delta < 0` (refund, RA recalculation): log nothing, reset the baseline.
   - Under 1 minute: carry it (baseline isn't advanced for that game) so short bursts aren't lost to rounding.
   - Game new to the baseline: baseline 0. Only safe because step 1 seeds every known game.
3. Build the session: `end = last played` (Steam `rtime_last_played`, RA `recentlyPlayedGames[].lastPlayed`, parsed as UTC), `start = end − delta`. If `start` is earlier than the previous run's `asOf` minus a tolerance (missed runs, Steam offline sync), still log it but set `approx: true`.
4. Append to the year file of `end`, update `games` names/icons, write `state.json`. Only rewrite files whose content changed (existing pattern, so idle runs make no commit).
5. Failure handling as today: if the owned-games / recently-played call fails, the run already exits before writing, so the baseline can't be corrupted.

Sources per platform:
- **Steam:** `GetOwnedGames` (`playtime_forever`, `rtime_last_played`) already runs every time for every owned game. Covers no-achievement games too.
- **RA:** `userTotalPlaytime` in `detailedGameProgress` is re-fetched every run for recently played games (`ra-pipeline.js:306`), which is every game whose total can change. `lastPlayed` comes from `recentlyPlayedGames`.

## Phase 2: Backfill script — done 2026-10-04

Ran against `origin/main` at 2026-10-03 17:11 UTC: Steam 103 sessions / 76.5 h (lifetime playtime grew 77.7 h over the same span), RA 331 sessions / 85.3 h, 3 approx, no session over 4 h. Unknown games are seeded before the diff: Steam `total − playtime_2weeks` when the game just entered a non-full recently played list, RA 0 only when the total fits in the time since the previous snapshot. A full refresh on 2026-06-07 (before the Part A cache fix) dropped some RA games from `games.json`; their sessions are kept.

**Deploy order:** commit the code and the backfilled `playtime/` files together. Any live runs between the backfill and the push are caught up by the first run with the new code.

`scripts/backfill-playtime.js`, run once locally, committed output. Not part of any workflow.

- Walk `git log --reverse` for `data/steam/profile.json` (its `recentlyPlayed[]` has `playtimeForever` + `lastPlayedTs`, which covers every game played in the last 2 weeks, i.e. every game with a delta) and `data/ra/games.json` + `data/ra/profile.json` at the same commits.
- Feed each snapshot through the **same delta function as Phase 1** (import or copy it; it must be the identical logic).
- First snapshot = baseline. End by writing `state.json` equal to the latest snapshot, so the live pipeline continues seamlessly.
- Expect ~2,100 `git show` calls per platform; fine locally (minutes).
- Spot-check a few sessions you remember against the output before committing.

Run it after Phase 1 is merged but **with the hourly workflows paused** (or in the gap between runs), so the live pipeline doesn't seed its own baseline first. If it does, delete `state.json` and the year files before running the backfill.

## Phase 3: Unlock history in the pipelines — done 2026-10-04

Built as `scripts/lib/history.js`. Every pipeline loads all per-game files already, so each run simply rebuilds the full list (no incremental merge needed). Achievement id `a` and name `n` added so Analytics can list the rarest unlocks without loading game files. One unlock per line in the file. RA 797, Steam 2,829 (2015–2026), Xbox 368; 388 KB total.

- **RA:** from `games.json` (`dateEarned` / `dateEarnedHardcore` per achievement). Full rebuild every run is cheap (~800 rows).
- **Steam:** from the per-game files' achievement lists, at the point the pipeline writes them; games not touched this run keep their rows (rebuild from the existing year files + changed games).
- **Xbox:** from the per-title files, same approach. 360 titles only list unlocked achievements, which is all history needs.
- Written per calendar year of `t`; unchanged files not rewritten.

## Phase 4: Activity page, Playtime view — done 2026-10-04

As planned. A session crossing midnight is listed under both days (start weekday shown), and the day total comes from the split heatmap so the two always match. Unlock count per session uses the achievement chunks with a 5-minute grace on both ends. Many RA sessions are 1 minute (rich presence reports in whole minutes and short launches count); they're shown as-is.

- Segmented control **Achievements | Playtime** under the page header; `?view=` in the URL. Platform filter shared; in Playtime view the filter is All / RA / Steam with a small note that Xbox doesn't report playtime.
- **Heatmap:** same component, metric = minutes per local day. Peak colors as today (RA gold, Steam blue). Tooltip: `2h 15m · 3 sessions`.
- **Streak panel:** a day counts if it has ≥ 15 minutes of play (one constant, easy to change). Same "today never breaks the streak" rule.
- **Timeline:** day → sessions (game icon, name, start–end in local time, duration, `≈` mark when `approx`). Optional, cheap and nice: show the unlock count earned inside each session's time range, linking the two views.
- Loads current + previous year files (covers the 365-day heatmap); older years via the same sentinel/IntersectionObserver pattern as the achievement chunks.
- Update `activity/CLAUDE.md`.

## Phase 5: Analytics page (`/analytics/`) — done 2026-10-04

Built as planned, documented in `analytics/CLAUDE.md`. Changes: genre dropped (only in the 5 MB `games.json`); RA console names come from `profile.json` plus a `console` field now stored in RA playtime `games`; RA funnel starts at "Started" (RA's progress list only has games with an unlock); the punchcards are two side-by-side cards instead of a toggle; `history/index.json` added so the page knows which years exist; `?period=` in the URL. The validator's lightness-band check fails for the brand platform colors (too light for its dark band); CVD separation and contrast pass, so they're kept, with legends on every multi-series chart.

Period selector at the top: **30 days · 12 months · this year · all time** (playtime "all time" means since 2026-03-25 and is labelled so; lifetime totals per game still come from the existing profile data).

| Section | Metrics | Source |
|---|---|---|
| Overview tiles | Hours played, active days, sessions, avg session; unlocks, RA points / gamerscore earned, completions; each with change vs previous period | playtime + history + completions |
| Playtime trend | Hours per week (≤ 12 months) or month (longer), stacked by platform | playtime |
| Achievement trend | Unlocks per month stacked by platform, completions as markers | history + completions |
| When you play | Day-of-week × hour punchcard; toggle playtime / unlocks (unlocks include Xbox) | playtime, history |
| Top games | By hours, by unlocks, and **minutes per achievement** for the period | playtime + history |
| Sessions | Length histogram (<30m, 30m–1h, 1–2h, 2–4h, 4h+), longest session, median | playtime |
| Rarity profile | Share of unlocks per rarity tier per platform over time; rarest unlocks in the period | history |
| Completion funnel | Per platform: owned → played → started → beaten → completed; median days from first unlock to completion | profiles + history + completions |
| RA breakdown | Hours and unlocks by console and by genre (RA `games.json` has both) | playtime + games.json |

- Same design system: section headers (blue for general, gold for achievement sections), stat colors from root `CLAUDE.md`, shimmer skeletons, `pt-8 pb-5 md:pt-5` header.
- Shared SVG chart components defined at module level in `analytics/app.js`, same as other pages. Load the `dataviz` skill before building them.
- Every metric computed in the browser from the files above, in the viewer's timezone (`TZ` label shown, like Activity and Completions).
- Add `analytics/CLAUDE.md` and list it in `_config.yml`.

Later, not in this plan: a Year in review page, and "this week" playtime on the hub cards.

## Phase 6: Navigation, hub, docs — done 2026-10-04

- `assets/mobile-nav.js`: **Log → Stats** (`/analytics/`, chart icon).
- Hub: link to the changelog on mobile (header) and keep the desktop footer link; add an Analytics link in the desktop nav/footer.
- `sw.js`: add the new page to `PRECACHE` if the other pages are listed there, and bump `CACHE_NAME` (required when `PRECACHE` changes).
- `viewport-fit=cover`, favicon links, `page-topbar` class on the new page.
- Root `CLAUDE.md`: directory structure (new data folders + `analytics/`), pipeline outputs, nav tabs. `changelog.md` entry per phase.

## Order and size

| Phase | Depends on | Size |
|---|---|---|
| 0 Verify | — | Small |
| 1 Playtime pipeline | 0 | Small–medium |
| 2 Backfill | 1 | Medium (one-off) |
| 3 Unlock history | — | Small–medium |
| 4 Activity Playtime view | 1 (2 for history) | Medium |
| 5 Analytics | 1, 3 (2 for history) | Large |
| 6 Nav / docs | 4, 5 | Small |

Phases 1 and 3 can ship together; 4 can ship before 5. Unaffected by [data-branch-migration.md](data-branch-migration.md): the new files live under `data/` and move with it.

## Known limits

- **Session times are reconstructed**, not recorded: one session per game per run window. Two short sessions of the same game within an hour become one. Fine at hourly runs.
- **RA playtime depends on rich presence**; it only counts while an RA-enabled emulator is connected and may include idle time.
- **Steam offline play** arrives as one lump when the client syncs (`approx: true`).
- **No playtime history before 2026-03-25.** Charts start there; lifetime totals per game are still correct.
