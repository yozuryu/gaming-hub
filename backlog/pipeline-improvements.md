# Pipeline fixes and improvements (RA + Steam)

**Status:** To do · **Priority:** Part A is urgent (1); Parts B–E are 3, after [xbox-integration.md](xbox-integration.md)

From a full read of `scripts/ra-pipeline.js` and `scripts/steam-pipeline.js` plus recent commits and workflow runs (2026-09-26). The Xbox pipeline should be built on the fixed patterns from Part A (shared HTTP helper with status checks and retries), not copied from today's Steam code.

---

## A. Data-integrity fixes (urgent) — done 2026-09-26

A1–A3 implemented (retrying HTTP helper in Steam, `withRetry` in RA, cache seeding in full refresh) and the 5 error sentinel entries cleared. Doki Doki Literature Club (698780) and Supraland (813630) are only re-checked by a Steam full refresh (`--refresh-games`) or when played again.

### A1. Steam: errors permanently mark games as "no achievements"

- `steamGet` (`scripts/steam-pipeline.js`, HTTP helper) never checks the status code. A Steam rate-limit or error page is HTML, `JSON.parse` fails, and the per-game `catch` adds the game to `sentinel.json` as if it had no achievements.
- Sentinel entries are never cleared, and `--refresh-games` skips every sentinel game forever.
- **Happening now:** 5 sentinel entries carry an error (`JSON parse failed: Unexpected token '<'`, `ECONNRESET`, `socket hang up`). Three of them have achievements: LEGO City Undercover (578330), WayOut (551110), Light Fairytale Episode 1 (539330). The other two may too; they were never successfully checked.
- The three calls per game run in parallel (`Promise.all`), which makes throttling more likely.

**Fix:**
- `steamGet`: reject on non-2xx status; retry 429/5xx/network errors with backoff (e.g. 2s, 5s, 15s); treat a non-JSON body as a retryable error.
- Only write a sentinel when Steam actually reports no achievements (empty schema, or `playerstats.success === false` with "no stats"). Never on a transport or parse error.
- On success, delete the game's sentinel entry if one exists.
- Run the three calls sequentially (or two at a time) with the existing pacing.
- One-time cleanup: remove the 5 error sentinel entries so the next unlocked refresh re-checks them.

### A2. RA: a failed fetch writes partial data

- Each of the four 91-day achievement fetches is wrapped in its own `try/catch` that logs and continues (`scripts/ra-pipeline.js`, chunk loop). A single failure writes a year of activity with a quarter missing; the heatmap and Activity page lose three months until the next run.
- Other critical calls (profile, summary, awards, completion progress) throw and abort, which is correct.

**Fix:** retry each chunk with backoff; if a chunk still fails, abort the run before writing (exit non-zero) so the previous files stay in place.

### A3. Full refresh drops games that fail

- Steam `--refresh-games` and RA `--refresh-games` don't seed from the cache, so a game whose fetch fails disappears from the output entirely.
- Exposure: Steam's full refresh is manual only; RA's full refresh runs every midnight.

**Fix:** always load the cache first; a failed fetch keeps the cached entry instead of dropping it.

---

## B. Stop committing noise (high value)

Most hourly commits are not your activity. Recent data commits change 44–486 lines even between hours with no play:

- **Steam:** almost all of the diff is `globalPct` (rarity) shifting by 0.1%, re-fetched for all 15 recently played games every hour.
- **RA:** mostly `numAwarded` / `numAwardedHardcore` (other players' unlock counts), `trueRatio`, `numDistinctPlayers*`, and `cumulScore`, because every recently played game's details are re-fetched every hour. `cumulScore` isn't used by the frontend.
- **Both:** the four 91-day achievement files are cut relative to the exact run time, so entries shift between files every run.
- **Both:** `metadata.extractionTimestamp` changes on every run, so there is always something to commit.

**Fix:**
- **B1.** Re-fetch a game's details only when your own progress changed.
  - RA: compare `getUserCompletionProgress` entries (`numAwarded`, `numAwardedHardcore`, `maxPossible`, `mostRecentAwardedDate`) with the cache. A change in `maxPossible` also catches set revisions, which today only the midnight full refresh picks up.
  - Steam: fetch player achievements for recently played games (1 call); fetch the schema and global % only if the unlocked or total count differs from the cache.
- **B2.** Refresh worldwide stats once a day (midnight run): Steam schema + global %, RA per-game details for all games.
- **B3.** Cut the 91-day chunk files at UTC midnight instead of the run time, so boundaries move once a day.
- **B4.** Strip unused churning fields (`cumulScore`; review others against the frontend before removing).
- **B5.** Skip the commit when only `metadata.extractionTimestamp` changed (compare with the previous file ignoring `metadata`, or do it in the workflow).

**Effect:** commits drop from ~48 a day to roughly "only when you played"; hourly runs make about a third of the Steam calls. This shrinks history growth, so the [data-branch migration](data-branch-migration.md) becomes less urgent (still worth doing).

**Trade-off:** "Last updated" / "Data as of" (hub card, RA and Steam profile pages) would then mean "last change", not "last check". Either relabel it, or accept it.

---

## C. Schedule reliability

- The workflows are hourly, but the last runs were every ~3–4 hours (e.g. Steam at 18:29, 22:13, 01:27, 04:50, 07:32 UTC). The "midnight" refreshes ran around 04:50 UTC. GitHub delays or drops scheduled runs, especially at the top of the hour.
- **Fix:** move crons off `:00` / `:10` (e.g. RA `:17`, Steam `:43`; midnight jobs `17 0` / `43 0`). If still unreliable, trigger `workflow_dispatch` from an external scheduler.

---

## D. Cleanup

- **D1.** Remove the unused Firestore sync from `scripts/ra-pipeline.js` (`synchronizeWithFirestore(false, …)`, `admin.initializeApp`, `db`) and drop `firebase-admin` from `package.json`. It's installed on every run of both workflows. Update the root `CLAUDE.md` ("Game details cached in Firestore" is no longer true).
- **D2.** Remove Steam's legacy `games.json` migration fallback (the `games/` directory format has been in place since March).
- **D3.** `package.json` `homepage` / `repository` / `bugs` still point at `yozuryu/achievement-data`; update to `yozuryu/gaming-hub`. Also update the git remote to `git@github.com:yozuryu/gaming-hub.git` (GitHub reports the repo moved).

---

## E. Smaller correctness fixes

- **E1.** RA `--debug` is documented as a dry run but still writes files (only the watchlist path checks `DEBUG`). Skip `serializeLocally` in debug mode.
- **E2.** Workflow push: `git commit && git push` fails if `main` moved since checkout (e.g. a manual push during the run), losing that run's data. Use `git pull --rebase` then push, with one retry. No failures seen in recent runs, so low urgency.
- **E3.** Shared HTTP helper: both pipelines use fixed `sleep()` pacing with no retry. After A1/A2, use one retry/backoff helper in both (and in the Xbox pipeline).

---

## Considered and rejected

- **Switching data sources:** the official Steam Web API and the RA API are the primary sources; third-party sites (Steam Hunters, Exophase, Completionist.me, AStats) have no stable personal-data API and read the same endpoints. SteamSpy has no per-user data.
- **Minifying JSON output:** GitHub Pages serves gzip, so whitespace barely affects transfer size; pretty JSON keeps diffs readable.
