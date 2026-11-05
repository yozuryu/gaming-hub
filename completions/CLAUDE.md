# Completions — Page Context

## Data Sources
- `../data/ra/profile.json` — awards from `pageAwards.visibleUserAwards` (each game award carries `playtime` in minutes and `imageIngame`, each beaten award `winCondition` `{ name, pct }`, each mastery award `rarest` `{ name, badge, pct }`, all added by the RA pipeline); achievement totals from `gameAwardsAndProgress.results[].maxPossible`
- Rarest achievement of a completed game (`loadRarest`, only for games on screen): Steam / Xbox from `../data/{steam,xbox}/games/{id}.json` (lowest `globalPct`, with its icon); RA from the award's `rarest`, falling back to `../data/ra/history/{YYYY}.json` (no icon) for awards written before the field existed
- `../data/steam/profile.json` — `perfectGames` array
- `../data/xbox/profile.json` — `perfectGames` array (100% gamerscore)
- `../data/{steam,xbox}/win-conditions.json` + per-game files — beaten games (`loadWinConditionBeaten()` for Xbox; Steam has its own loader)

## Normalization
Two normalizers in `app.js`:
- `normalizeRA(awards, showBeaten, totals)` — returns entries with `type: 'mastered'` or `type: 'beaten'`, keyed by `gameId: a.awardData`; `artUrl` is the screenshot (null for RA's `000002.png` placeholder or a missing field), `hardcore` from `awardDataExtra`
- Every entry has `artUrl`: RA screenshot, Steam `header.jpg`, Xbox `heroUrl` (if any). RA entries with wide art (`../data/ra/art.json`) also get `wideUrl` (the banner thumbnail): `HighlightArt` shows it like a Steam banner; beaten rows keep the icon with `wideArt` (hero thumbnail, else the banner) faded behind, closed-year covers keep the icon
- `normalizeSteam(perfectGames)` — returns entries with `type: 'perfect'`
- `normalizeXbox(perfectGames)` — returns entries with `type: 'completed'` (label "Completed"); `normalizeXboxBeaten()` for beaten

## Deduplication
`dedupeCompletions()` runs on the combined RA + Steam + Xbox list, keyed by `platform-gameId`:
- One mastered/perfect entry per game
- A beaten entry is dropped only if the same game was mastered/perfected in the **same calendar year**; different years → both entries shown as separate milestones
- If the mastered/perfect date is unknown, the beaten entry is hidden

## Display
- Entries grouped by month (`groupByMonth`), then grouped by year for rendering
- **Open years** (the current year to start with; tap a year to toggle): the year line (`5 ★ complete · 4 beaten · 127h played`), then
  - phone: a month timeline (ring + line per month) with entries in date order
  - desktop: "Completed" highlights three across, then "Beaten" rows three across
- **Completed** (Mastered / Perfect / Completed) = `Highlight`: art banner (Steam banner uncropped; RA screenshot with the icon over it, or the icon zoomed and blurred when there's no screenshot; Xbox hero with icon), platform chip + Hardcore chip + date on the art, status chip, title, console, then a stats band in the Playing tile style (Achievements / Played, hidden without playtime / Rarest with the achievement icon). Gold left edge
- **Beaten** = `BeatenRow`: compact row using the shared `.grow` styles in `assets/ui.css` (icon or Steam banner, faded art, silver edge), every platform shows the achievement that beat the game: Steam/Xbox the hand-picked win condition with its rarity tier, RA its win condition with the unlock rate in red (hardcore, flame) or grey (softcore, feather)
- **Closed years**: one line each (★ / medal counts in fixed slots + all covers in a sideways-scrolling row, ★ on completed ones), two columns on desktop. Years always render in order: each run of consecutive closed years is one grid between the open ones
- A mastered and a beaten game must never look alike
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
