# Completions — Page Context

## Data Sources
- `../data/ra/profile.json` — awards from `pageAwards.visibleUserAwards` (each game award carries `playtime` in minutes, added by the RA pipeline)
- `../data/steam/profile.json` — `perfectGames` array
- `../data/xbox/profile.json` — `perfectGames` array (100% gamerscore)
- `../data/{steam,xbox}/win-conditions.json` + per-game files — beaten games (`loadWinConditionBeaten()` for Xbox; Steam has its own loader)

## Normalization
Two normalizers in `app.js`:
- `normalizeRA(awards, showBeaten)` — returns entries with `type: 'mastered'` or `type: 'beaten'`, keyed by `gameId: a.awardData`
- `normalizeSteam(perfectGames)` — returns entries with `type: 'perfect'`
- `normalizeXbox(perfectGames)` — returns entries with `type: 'completed'` (label "Completed"); `normalizeXboxBeaten()` for beaten

## Deduplication
`dedupeCompletions()` runs on the combined RA + Steam + Xbox list, keyed by `platform-gameId`:
- One mastered/perfect entry per game
- A beaten entry is dropped only if the same game was mastered/perfected in the **same calendar year**; different years → both entries shown as separate milestones
- If the mastered/perfect date is unknown, the beaten entry is hidden

## Display
- Entries grouped by month (`groupByMonth`), then grouped by year for rendering
- `showBeaten` toggle controls whether beaten-only games appear
- Platform filter: All / RA / Steam / Xbox
- Hidden tags filter (Homebrew, Demo, Prototype, Hack tilde tags)
- Mastered/Perfect → gold `#e5b143`. Beaten → `#b8c4ce` silver (badge `#2a3440` / `#c6d4df`).

## Terminology
- RA Mastered = full 100% achievement completion (hardcore)
- Steam Perfect = 100% achievements unlocked
- Xbox Completed = 100% gamerscore
- Both are the same concept — "Completed" — shown with gold color
- RA Beaten = game story completed without full achievement set — shown with silver color
