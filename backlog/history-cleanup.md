# Remove pipeline data from `main`'s history

**Status:** Blocked by [data-branch-migration.md](data-branch-migration.md) · **Run:** only after the `data` branch has been running cleanly for at least a day

## Why

Even after pipeline data moves to the `data` branch, `main`'s history still holds ~4,270 data-only commits and ~225MB of old JSON.

## Plan

1. **Backup:** `git clone --mirror` of GitHub + a tarball of the local folder.
2. **Pause** the data workflows so nothing pushes during the rewrite.
3. In a fresh clone (plus the local-only `feat/ra-markdown-guides` branch fetched into it), run `git filter-repo` with `--invert-paths` on the generated paths only (same list as the migration's file split). Keep hand-edited files (`data/hub/config.json`, `data/ra/series.json`, `data/ra/guides.json`, `data/steam/win-conditions.json`) and their history. `filter-repo` drops commits that become empty.
4. Check: ~80–100 commits remain, all code commits present, the site builds from the rewritten `main` + `data`.
5. Force-push `main` (and push the rewritten Notes branch if wanted). Ask before force-pushing.
6. Replace the local repo with the rewritten clone (move `.env`, `.agents/`, `.claude/`, `node_modules/` over); `git gc --prune=now`.
7. Re-enable the workflows.

## Expected result

- ~80–100 commits on `main` instead of ~4,350.
- Packed history from ~225MB to a few MB. GitHub may take a while to show the smaller size.

## Watch out for

- One-way: any other clone must be re-cloned after the force-push.
- The Notes branch exists only locally; it must be rewritten in the same pass or it will no longer share history with `main`.
- Commit hashes change, so hashes quoted in the changelog or elsewhere will no longer resolve.
