# Move pipeline data to a `data` branch

**Status:** To do · **Priority:** 2 (after [xbox-integration.md](xbox-integration.md)) · **Scope:** plan steps 1–6 · **Follow-up:** [history-cleanup.md](history-cleanup.md)

> If Xbox has landed, include it: `data/xbox/` generated files move to `data` (like Steam), `data/xbox/win-conditions.json` stays on `main`, the Xbox workflow gets the same data-branch + deploy changes, and its pipeline-only cache file joins the deploy exclusions.

## Why

98% of commits (4,269 of 4,347 as of 2026-09-26) are hourly pipeline data updates. `.git` is 487MB (225MB packed) after six months and grows by ~48 commits a day. The code itself is ~50 files.

Goal: pipeline output stops accumulating in `main`'s history, with no change to site URLs, the frontend, or the service worker.

## Decisions

- **Same repo, separate branch.** A second repo was considered and rejected: it would bloat at the same rate unless it also dropped history, and it would change every data path and split `data/` across two repos.
- **Daily squash safety net** on the `data` branch: normal commits during the day (up to ~48), squashed to a single orphan commit once a day. Gives same-day rollback while keeping the branch bounded.
- **Pages deploys via GitHub Actions**, assembling `main` + the `data` branch.

## File split

| Stays on `main` (hand-edited via admin) | Moves to `data` branch (pipeline output) |
|---|---|
| `data/hub/config.json` | `data/ra/profile.json`, `games.json`, `watchlist.json` |
| `data/ra/series.json` | `data/ra/achievements/*` |
| `data/ra/guides.json` (+ `data/ra/guides/*.md` from the Notes branch) | `data/steam/profile.json` |
| `data/steam/win-conditions.json` | `data/steam/games/*` (index, sentinel, per-game files) |
| | `data/steam/achievements/*` |

Delete `data/steam/achievements.json`: legacy, last updated 2026-03-27, not referenced anywhere.

Paths stay identical on the live site.

## Design

### `data` branch

Each pipeline run (RA and Steam workflows):

1. Check out `main` (scripts).
2. Overlay the current `data` branch into `data/` (`git fetch origin data` + `git archive origin/data data | tar -x`) so incremental caching still reads the previous `games.json` / `games/index.json` / `sentinel.json`.
3. Run the pipeline.
4. Commit only that pipeline's generated paths on top of `data` and push (no force). RA and Steam never clobber each other: the existing `data-pipeline` concurrency group serializes them, and each run starts from the latest `data`.

Daily squash: a small scheduled workflow (e.g. 00:30 UTC, after RA 00:00 and Steam 00:10 midnight refreshes), in the same `data-pipeline` concurrency group, creates an orphan commit of the current `data` tree and force-pushes it.

### Deploy (`deploy.yml`)

- Triggers: `push` to `main`, `workflow_dispatch`, `workflow_call`.
- **Gotcha:** pushes made with `GITHUB_TOKEN` do not trigger other workflows. The data workflows must call `deploy.yml` as a second job (`needs: fetch`, `uses: ./.github/workflows/deploy.yml`), not rely on a push trigger.
- Assemble `_site`: `main` minus private files, plus `data/` from the `data` branch. Exclusions must match `_config.yml`'s `exclude` list today: `CLAUDE.md` (all of them), `TODO.md`, `backlog/`, `admin/`, `scripts/`, `package*.json`, `_config.yml`, `.github/`, `.env`, `assets/appicon.png`, `data/steam/games/sentinel.json`, `data/steam/achievements.json`.
- `actions/upload-pages-artifact` + `actions/deploy-pages`; permissions `pages: write`, `id-token: write`; concurrency group `pages`.
- Repo is public, so Actions minutes are free. Load is unchanged (~48 Pages builds a day already).
- `_config.yml` becomes unused once the source switches away from branch builds; keep the exclusion list in `deploy.yml` as the single source of truth and delete `_config.yml`.

### Local dev and admin

- Add the generated paths to `.gitignore` on `main`; `git rm --cached` them.
- New `npm run data:pull`: extracts the latest `data` branch into `data/` and a snapshot copy (e.g. `.data-snapshot/`, gitignored) for diffing.
- Admin **Data Diff** currently runs `git diff data/`, which shows nothing for ignored files. Change it to diff generated files against `.data-snapshot/` (`git diff --no-index`) and keep plain `git diff` for hand-edited files.
- Local pipeline runs are for testing only. Publishing data = "Run workflow" on GitHub.

## Steps

1. **Backup:** `git clone --mirror` of GitHub + a tarball of the local folder (includes untracked `.env`, `.agents/`, `.claude/`).
2. **Pause** both data workflows (`gh workflow disable`).
3. **Create and push `data`:** orphan branch containing only the generated files at current contents.
4. **Switch Pages source** to GitHub Actions (`gh api -X POST/PUT repos/yozuryu/gaming-hub/pages` with `build_type=workflow`). Ask before doing this.
5. **Push `main` changes:** updated data workflows, `deploy.yml`, squash workflow, `.gitignore`, `git rm --cached` generated files, delete `data/steam/achievements.json`, `data:pull`, Data Diff change, docs (`CLAUDE.md` Directory Structure, Data Pipelines, Shared behavior; changelog). Ask before pushing. The push triggers the first deploy; verify the live site loads data on every page.
6. **Re-enable** both workflows; watch one RA and one Steam run end to end (pipeline → `data` branch → deploy → live data updated), then one midnight squash.

Steps 1–6 are reversible: revert the `main` commits, switch Pages back to "Deploy from branch: main", re-add the data files.

## Acceptance

- Live site identical (all pages load data; PWA still works offline).
- `main` gets no pipeline commits.
- `data` branch never exceeds one day of commits.
- No `CLAUDE.md`, backlog, admin, or script files are publicly served.
- `npm run data:pull && npm start` gives a working local site; admin Data Diff shows pipeline changes.

## Watch out for

- The Notes branch (`feat/ra-markdown-guides`, local only) adds `data/ra/guides/` (hand-edited, stays on `main`) and edits `sw.js` precache; rebase it after this lands.
- The admin server allowlist includes `data/steam/games/index.json` (read by the Win Conditions module); it's generated, so it must come from `data:pull` locally.
