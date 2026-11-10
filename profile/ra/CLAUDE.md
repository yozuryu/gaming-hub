# RA Profile — Page Context

## Data Sources
- `../../data/ra/profile.json` — fetched on mount; passed through `transform.js`
- `../../data/ra/games/index.json` — every played game without its achievement list (+ `summary`), loaded when Recent, Progress or Series opens (`loadGames`; falls back to the old `games.json`)
- `../../data/ra/games/{id}.json` — one game with its achievements, loaded when its sheet opens (`openGame` → `loadGameFile`, from any tab); merged over the index entry in `rawData`, so `transform.js` gives that game its `achievements`. Until then the sheet shows `ModalListSkeleton`. Progress's progression sort and the Series totals use `summary` (`progTotal` / `progEarned`, points, `lastUnlock`)
- `../../data/ra/watchlist.json` — fetched separately (split from profile.json)
- `../../data/ra/series.json` — fetched for Series tab
- `../../data/ra/achievements/1–4.json` — all four fetched when Activity tab opens (the heatmap is built in the browser from these chunks, in the viewer's timezone); the timeline reveals them one at a time (`shownChunks`) as the user scrolls

## transform.js
Critical data layer — merges multiple API response shapes into what the UI expects. Takes `rawData` (profile + games + watchlist + achievements) and returns `{ profile: PROFILE_DATA, games: ALL_GAMES, backlog: BACKLOG }`. Do not bypass it or duplicate its logic.

## Tabs
Six tabs: **Overview** (User, the default) · **Recent** (Clock) · **Progress** (BarChart2) · **Series** (Layers) · **Activity** (Activity) · **Watchlist** (Star), in the shared `TabBar` (`assets/tabs.js`, see the root CLAUDE.md "Profile tabs")

- Series tab only renders if `seriesData.some(s => s.showProgress)`
- Tab state persists in URL: `?tab=progress`
- Overview holds what used to sit above the tabs: Last Played (the `GameListRow` with an `extra` line: rich presence with a cyan `Radio` marker), Recent unlocks (plus the `ovUnlocks` rows on wide screens, excluding the newest one by id), User Stats as `StatTiles` (`STAT_LABELS` shortens the labels; `statsRight` behind "More stats"), Game Awards. On ≥1024px User Stats and Game Awards sit in the right rail (`.prail`, see the root CLAUDE.md "Profile tabs")
- Sticky, scrolls sideways, swipe between tabs on phones (`useSwipeTabs`, order = `tabIds`)
- Recent: a search over every game, newest played first (up to 50); empty search = the latest 15. All searches use `fold()` (no accents or case: "pokemon" finds "Pokémon")

## Completion Progress Filters
- Shared `ProgressFilterBar` + `applyProgressView()` (duplicated in RA and Steam `app.js` — keep them in sync)
- **Views** (first match wins, completed games excluded): **Nearly there** = 75%+ done, fewest achievements left first (ignores recency on purpose) · **In progress** = under 75%, played in the last 30 days, most recent first · **Abandoned** = under 75%, not played for 30+ days (or never), most recent first · **All** = everything, with the sort options and a **Mastered** toggle (hidden by default)
- Sort buttons only appear in the All view; the other views have a fixed order and show a one-line rule instead
- Mobile: views are a full-width 4-column segmented control; sort is a native `<select>` (chips on desktop)
- All-view sorts: Overall % or Progression % (progression + win-condition achievements)
- `raDateMs()` parses RA's `YYYY-MM-DD HH:MM:SS` (UTC) dates — Safari/iOS can't parse that format with `new Date()` directly

## Game list: list / tiles
Recent Games and Completion Progress render `GameListRow` (icon, title, console, Hardcore flame / Softcore feather, tags, playtime · last played, count + bar, screenshot faded on the right, status stripe) or `GameTile` (icon over the blurred screenshot, last played, mode, title, console, bar, count + playtime, status colour on the bottom edge), switched by `ViewToggle` + `useGameView()` (`assets/game-view.js`, shared with Steam and Xbox). Tap opens the achievement sheet. The Series tab has its own cards (see Series).

## Achievement modal and header art
- The modal shell is the shared sheet (`assets/sheet.js` `useSheet`, `.sheet-*` in `assets/ui.css`), its header the shared `SheetHead` (stats: Achievements, Points from the game's achievements or the index `summary` (`transform.js` puts it on the game), Played; progression from `progTotal` / `progEarned`, so the header is whole before the file loads; opened before the index, `pending` shimmers stand in for points, played and progression; the console, year, developer and genre in the meta line): bottom sheet below `md` that covers the bottom nav (z-index 210 > 200) and closes by dragging the header down; centred dialog from `md`
- **RA art fallback:** `raShot()` in `utils/helpers.js` treats RA's "no image" placeholder (`/Images/000002.png`, e.g. Poring Clicker) as missing. `transform.js` sets `game.artIsIcon` when the art fell back to the icon; the art then gets `.art-icon` (zoomed and blurred harder) wherever it sits behind something
- Profile header: the most recently played game's screenshot (or icon) blurred behind it (`HeaderArt`); its hero (or banner) when it has wide art
- **Wide art** (`../../data/ra/art.json`, picked in the admin from SteamGridDB, URLs only): `ALL_GAMES` entries get `wide: { banner (grid thumb), art (hero thumb, else banner), header (hero, else banner, full size) }`. Tiles show the banner (`WideBanner`, falls back to the icon if it fails); rows and the achievement sheet keep the square icon, with `art` faded behind rows and `header` blurred behind the sheet header. A banner only goes where Steam shows its store header

## Series
- **`data/ra/series.json` rules** (same as Steam / Xbox): only real games, no `[Subset …]` entries; `showProgress` on for every series with 3+ games, except sub-series fully nested in a bigger one (Mega Man X / Zero / Battle Network / Star Force, Final Fantasy Crystal Chronicles, Final Fantasy Tactics, Pokémon Mystery Dungeon, Summon Night Swordcraft Story), whose games are also in the parent
- **Sub-series** (`groups` on a series, see the root CLAUDE.md "Shared Series"): `buildSeries()` builds each group with `buildSeriesCards()` (the same per-series builder) into `card.subs`, plus Other; the tab wraps the card in `SubFold`, `SeriesSheet` scopes to `card.__sub` with `SubChips` / `SubStrip` (`assets/subseries.js`). The nested series above (showProgress off) are the source the admin's Suggest uses for Mega Man's groups
- `buildSeries()` → one entry per `showProgress` series: per-game status (from the games index, else the watchlist entry), counts, points/achievement totals, `latestAch`, `lastMs` (latest unlock or last played)
- Card (`.scard`): cover icon (`coverGameId`, else the game with the most unlocks, else the first game with achievements, else the first id; same rule on Steam / Xbox and in `build-series.js`), counts, % + `shortAgo(lastMs)`, bar, icon strip (`seriesIconOrder`: mastered, started by recency, not started, no achievements; classes `mastered` / `dim` / `noach`)
- **Art:** the wide art picked in the admin (cover first, else the most recently active series game with one), else the cover's screenshot, else the most recently active series game with a `raShot`, else the cover icon (`.art-icon`). Watchlist-only games have no screenshot (entries only carry `imageIcon`) and aren't in `ALL_GAMES`, so `buildSeriesCards` reads their pick from `artData` (`wideArt()`)
- `SeriesSheet` (shared sheet): the shared `SheetHead` (cover icon, `N games`, status tags, achievements and points, the Games meter), latest unlock, grouped games; played games are `GameListRow compact`, others `.wrow`. Mastered games use `MasteredRow` (`.smast`): the row plus a band with the award date and `rarest` (from `PROFILE_DATA.gameAwards`, which carries `gameId`, `awardedAt`, `hardcore`, `rarest`). Sections `.ssheet-sec` (Latest unlock gold, Games blue) with the status groups (`.ssheet-group`: In progress · Mastered · Beaten · Not started · No achievements; beaten = a Game Beaten award, `beatenIds`) under Games. `.sheet-scroll > *` never shrinks (the `.smast` card collapsed onto its row in long sheets). `.grow` is also Tailwind's `flex-grow: 1` utility, so `.sheet-scroll > .grow` resets it (rows stretched in short sheets). Opening a game sets `seriesBack`, so the achievement modal shows `.sheet-back` and returns to the series

## Watchlist
- A list in the profile game-row style (`.wlist` / `.wrow` in `assets/ui.css`), two columns on desktop: icon, title + subset / tilde tags, console · points, and the status once on the right (in progress: count + bar; Mastered tag; not started: trophy + achievement count; no achievements: dimmed). Status colour on the left edge
- **Subsets stack under their base game** (`stackSubsets()`): same title and console; a combined base "A | B" counts as each of its names. A stacked game is one card (`.wstack`): the name · console on one line (`.whead`), then one row per set (`SetRow`): "Base set" first, then each subset (gold name, wraps to two lines), each with its own icon, points, status and edge colour. A subset whose base isn't listed stays a normal row
- Grouping (Group dropdown): none · console (rows drop the repeated console) · status · series · subsets (With subsets open / Without subsets closed; counts are games, not sets)
- The row builders (`gameRow`, `setRow`, `stackCard`, `rows`) are **render functions, not components**: they're defined inside App's render, and as components React would remount all rows on every re-render (e.g. on scroll), replaying their fade. Don't turn them back into `<Components />` without moving them to module level

## User Stats (mobile)
- Stats split into `statsLeft` (Points, Rank, Beaten, Mastered) and `statsRight` (additional stats)
- On mobile: `statsRight` is hidden by default (`hidden sm:flex`)
- `statsExpanded` state controls visibility; toggled by a "Show more / Show less" button with `ChevronDown` rotation
- Toggle button has class `sm:hidden` — only visible on mobile

## Game Awards
- The shared `CompletionsPanel` (`assets/completions.js`, see the root CLAUDE.md "Profile tabs"), `shape="sq"`: square icons (pixelated), `awardItems` built from `PROFILE_DATA.gameAwards`
- Deduplicated: if a game has both Beaten and Mastered, only Mastered is shown (`transform.js`)
- `transform.js` also carries each award's `shot` (in-game screenshot), `playtime` and `winCondition` (`{ name, pct }`, beaten games) from `pageAwards`; the Latest card uses the picked hero from `art.json`, else the screenshot. Its fact: the rarest achievement (mastered, `rarest`) or the win condition (beaten)
- Tilde tags and Subset show after the name. Tapping a game opens it through `openGame` (from `ALL_GAMES`)

## RA Title Parsing
Game titles use special syntax:
- `~Tag~` prefix → tag (Homebrew, Demo, Prototype, Hack) — rendered as colored badge
- `[Subset - Name]` suffix → subset game; extract parent title and subset name
Handled by `utils/helpers.js:parseTitle()`.

## Activity tab
Same design as the Activity page, from `assets/activity-ui.js`: `ActivitySummary` (folded by default on phones: the last 14 days' unlocks and games and the 14 days as bars; open: past-year numbers, the 14 days with streak tiles, this page's heatmap), sticky `DayHead`s under the tab bar (`.tl-tabs`), one `RunCard` per run of unlocks in one game (art band, icon, title, time range, trophy count; long runs fold after 4) with `UnlockRow`s. RA rows keep hardcore gold titles, points and ratio, and the progression / win-condition / missable icons; the strip art is the hero picked in the admin (`artData`), else the blurred icon; day headings add the day's points. The hooks sit above the early loading / empty returns (React error #310 otherwise)
