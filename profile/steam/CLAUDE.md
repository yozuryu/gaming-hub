# Steam Profile — Page Context

## Data Sources
- `../../data/steam/profile.json` — fetched on mount
- `../../data/steam/games/index.json` — fetched when any game tab opens (~200KB, no `achievements[]`)
- `../../data/steam/games/{appId}.json` — lazy-fetched per game when user opens achievement modal (`handleViewDetails`)
- `../../data/steam/achievements/1–4.json` — all four fetched when Activity tab opens (the heatmap is built in the browser from these chunks, in the viewer's timezone); the timeline reveals them one at a time (`shownChunks`) via IntersectionObserver

## Completions Panel (sidebar)
- Perfect games (2px gold border) then beaten-only games (from win conditions, 1px silver border `#b8c4ce`)
- Shows the first 2 rows of icons by default (perfect first, then beaten fill the remaining slots); "Show all N / Show less" button at the bottom reveals the rest. Row size follows the grid breakpoints via `useIconGridCols()` (5 / 8 at `sm` / 5 at `lg`).

## Tabs
Four tabs: **Overview** (User, the default) · **Recent** (Clock) · **Progress** (BarChart2) · **Activity** (Activity), in the shared `TabBar` (`assets/tabs.js`)

- Tab state persists in URL: `?tab=progress`
- Overview holds what used to sit above the tabs: Last Played (`GameListRow` with the game's latest unlock as its `extra` line), Most Recently Unlocked, User Stats as `StatTiles` (header numbers left out), Completions. `games/index.json` loads on every tab, Overview included; sticky bar and swipe as on RA
- Recent: a search over every game in `games/index.json`, newest played first (up to 50); empty = Steam's recently played list. Searches ignore accents and case (`fold()`)

## Completion Progress Filters
- Shared `ProgressFilterBar` + `applyProgressView()` (duplicated in RA and Steam `app.js` — keep them in sync)
- **Views** (first match wins, completed games excluded): **Nearly there** = 75%+ done, fewest achievements left first (ignores recency on purpose) · **In progress** = under 75%, played in the last 30 days, most recent first · **Abandoned** = under 75%, not played for 30+ days (or never), most recent first · **All** = everything, with the sort options and a **Perfect** toggle (hidden by default)
- Sort buttons only appear in the All view; the other views have a fixed order and show a one-line rule instead
- Mobile: views are a full-width 4-column segmented control; sort is a native `<select>` (chips on desktop)
- All-view sorts: `PROGRESS_SORTS` in `utils/constants.js` (Completion, Hours, Last Played)

- All tabs use `#66c0f4` (blue) — no gold accent tabs on Steam

## Game list: list / tiles
Recent Games and Completion Progress render `GameListRow` (full store banner, title, playtime · last played, count + bar, hero art faded on the right, status stripe) or `GameTile` (banner uncropped on top, last played, title, bar, count + playtime, status colour on the bottom edge), switched by `ViewToggle` and `useGameView()` (`assets/game-view.js`, `localStorage['gh:gameView']`, shared with RA and Xbox). Styles are the `.glist/.grow/.gtiles/.gtile` classes in `assets/ui.css`. Both only need `games/index.json` fields; full achievement data loads when the sheet opens.

## Achievement Modal
- `handleViewDetails` checks `gameDetails[appId]` cache first
- If not cached: opens the modal right away with `loading: true` (header from the card's index data, `ModalListSkeleton` in place of the filter bar + list), fetches `games/{appId}.json`, caches it, then fills the same modal (skipped if it was closed meanwhile). The panel height animates from the skeleton to the list (`useAnimatedHeight`)
- Fallback: opens modal with index data (no achievements) if fetch fails
- Do not change the modal game banner (`w-32 h-16` image) — previous attempts to resize it were rejected
- The modal shell is the shared sheet (`assets/sheet.js` `useSheet`, `.sheet-*` in `assets/ui.css`): bottom sheet below `md` (drag the header down to close), centred dialog from `md`. Header art: `library_hero.jpg`, falling back to `header.jpg` (`useArtSrc`)
- Profile header: the most recently played game's hero art blurred behind it (`HeaderArt`)
