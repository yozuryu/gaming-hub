# Design fold-in

**Status:** Done 2026-11-03 · **Priority:** 9 · Written 2026-11-03

**Shipped differently from this plan:** the Completions header and filter bar stayed as they were live (the plan text said so; the mockup also showed a new totals strip and sentence-case filter chips, not built). RA achievement totals for the highlights come from `gameAwardsAndProgress.maxPossible`, so the pipeline only adds `imageIngame`. The guide links sit in their own strip under the genre line rather than inside it.

Five pieces from the set-aside redesign, folded into today's site. Everything else (type, chips, tabs, colours, card art gradients, page structure) stays as it is live. Each piece ships on its own; none depends on another.

1. [Swipe-up achievement modal](#1-achievement-modal-swipe-up-sheet-on-phone-dialog-on-desktop) (all three profiles)
2. [Simpler console strip](#2-hub-console-strip) (Hub)
3. [Header with blurred background](#3-profile-header-with-blurred-background) (all three profiles)
4. [List / tiles toggle](#4-game-list-list--tiles-toggle) (profile game lists)
5. [New Completions view](#5-completions-view) (Completions)

The order is the build order: smallest blast radius first, the one page rewrite last.

## Reference files

Everything in [`fold-in/`](fold-in/) is the design source of truth. It isn't deployed (`backlog/` is excluded in `deploy.yml`).

| File | What it is |
|---|---|
| [`fold-in/plan.html`](fold-in/plan.html) | The fold-in page (self-contained, images inlined; 5.2 MB). Every piece on phone and desktop, "Now" next to "Folded in". In every "Folded in" view everything except the new piece is a crop of the live site. Its CSS holds the exact sizes. Also published as a private artifact: https://claude.ai/code/artifact/3fdaed80-3500-4747-ad76-a3d1d3d36eb7 |
| [`fold-in/mockups/`](fold-in/mockups/) | Every frame of `plan.html` as a JPEG at 2×: `{piece}-{phone\|desktop}-{now\|folded-in}[-variant].jpg`. Pieces: `strip`, `completions`, `header` (variants `ra`, `steam`, `xbox`), `sheet`, `views` (variants `list`, `tiles`). Compare the built pages against these |
| [`fold-in/live/`](fold-in/live/) | Full-page captures of the live site before the change (2026-11-02), phone (800 px at 2×) and desktop (1280 px): Hub, Completions, RA, Steam, Xbox, plus the achievement modals |

The full redesign this came from is the overhaul artifact (https://claude.ai/code/artifact/d314219a-8f6e-4e47-84c0-e3ddd336edca, v15). Only use it to look up a component; it isn't the target.

## Rules that hold for all five

- Steam identity stays: 2–3 px corners (the sheet's top corners are the only rounding, 12 px), the site font, art gradients, every meaning colour (status ladder, Hardcore red + flame / Softcore grey + feather, rarity tiers, platform colours, tilde tags).
- RA entries always show the console name.
- Calm type: 11 px floor on new components, titles about 14 px semibold, bold only in chips.
- **RA art fallback:** RA's "no image" placeholder is `/Images/000002.png` (standalone games such as Poring Clicker have it as both `imageIngame` and `imageTitle`). Today `imageIngame || imageTitle || imageIcon` picks the placeholder, because it is truthy. Add a `raArt(game)` helper that treats `000002.png` as missing and falls back to the icon. Where the icon is used as a background, zoom it to cover the area and blur it harder than a screenshot. Use it everywhere RA art sits behind something: the list and tiles (already designed this way, see Poring Clicker), the header, the sheet header, and the Completions highlights and rows.
- Motion rules from `CLAUDE.md` apply: every new conditional render animates, no late jumps, `backwards` fill only, all of it off under `prefers-reduced-motion`.
- Update `changelog.md` with each piece.

---

## 1. Achievement modal: swipe-up sheet on phone, dialog on desktop

Mockups: `sheet-phone-*`, `sheet-desktop-*`.

The content of the modal is unchanged from the genre line down: meta row, status and type filters, rows. The header gets the blurred art and a round close button. On phone the modal opens as a sheet.

### Where

`RAchievementModal` (`profile/ra/app.js` ~445), `AchievementModal` (`profile/steam/app.js` ~248, `profile/xbox/app.js` ~263). All three share the same shell today (`fixed inset-0 z-[100]`, `max-w-xl`, `max-h-[90vh]`, `anim-pop`, Escape handler, `useAnimatedHeight(panelRef)`).

### Shell

- Below `md` (768 px): the panel is anchored to the bottom, full width, `top: 48px` (plus `env(safe-area-inset-top)`), top corners 12 px, `border-top` only. It opens with a new `.anim-sheet` class (translateY(100%) → 0, about 260 ms, ease-out; add it to `assets/motion.css`; admin has no sheet, so its copy of the classes doesn't need it). The backdrop keeps `anim-backdrop`.
- `md` and up: stays the centred dialog it is today (same width, `anim-pop`). It gets the new header too. No grab handle.
- **z-index:** the bottom nav is `z-index: 200` (`assets/mobile-nav.js`), above today's modal at 100, so the nav shows over the modal. The sheet must cover the nav: raise the modal root to `z-[210]`. Check the floating tab pill and the scroll-to-top button stay under it.
- **Scroll:** header and filters stay pinned, only the list scrolls (the panel is already `flex flex-col`; give the list `overflow-y-auto min-h-0`). Lock body scroll while open (`overflow: hidden` on `html` and `body`, restored on close) so iOS doesn't scroll the page behind.
- `useAnimatedHeight` keeps working for the dialog. For the sheet the height is fixed by `top`/`bottom`, so skip the height animation below `md` (pass a flag, or let the hook no-op when the panel has a fixed height).

### Closing

- ✕, a tap on the backdrop, Escape (all as today).
- **Swipe down (phone):** pointer events on the header area only (grab handle plus art header), not on the list, so scrolling the list never drags the sheet. Follow the finger with `transform: translateY(dy)` (no transition while dragging), clamp at 0 upwards. On release: close if `dy > 120px` or velocity > 0.5 px/ms, otherwise spring back (transition 200 ms). Closing animates to `translateY(100%)` and then calls `onClose` (same deferred-unmount idea as the floating pill's `pillLeaving`). `touch-action: none` on the drag area.
- Put the drag logic in one hook, `useSheetDrag(panelRef, onClose)`, duplicated in each profile `app.js` like `useAnimatedHeight` is today.

### Header (all sizes)

- Background: blurred art fading into the panel. RA: `raArt(game)` (screenshot, or the icon zoomed and blurred more); Steam: store hero `library_hero.jpg` from the CDN, falling back to `header.jpg` on error; Xbox: `xboxImg(heroUrl, 640)`. Fold-in CSS: `filter: blur(6px) saturate(1.2) brightness(0.8)`, image inset −6% / −12% so the blur edge stays outside, gradient from transparent at the top to `#1b2838` at the bottom.
- Grab handle (phone only): 40 × 4 px, `rgba(255,255,255,0.45)`, centred, 8 px from the top.
- Close button: 30 px circle, `rgba(16,18,20,0.72)`, 1 px `rgba(255,255,255,0.12)` border, white ✕, 12 px from the top and right. It replaces today's small grey ✕.
- Content: today's header content (icon 66 px, title 15 px / 17 px desktop with `text-shadow`, console, Hardcore/Softcore chip, Mastered/Beaten chip, the two progress bars), aligned to the bottom of the art, with about 34 px of art showing above the title.

### Guides and badges

The list view (piece 4) drops the RA guide strip and the badge previews from the cards, so both move into the modal: the guide links go into the meta row (after genre · developer · year), and the badges are the achievement rows themselves. Do this in piece 4, not here.

### Check

iPhone width with the PWA installed (safe-area insets), long lists (Steam 1,000+ achievement games), the loading state of the Steam/Xbox modal (skeleton → list inside the sheet), swipe vs list scroll, reduced motion, desktop Escape / click outside.

---

## 2. Hub console strip

Mockups: `strip-phone-*`, `strip-desktop-*`.

Replaces the three tall platform cards on the Hub. Everything else on the Hub stays.

### Where

`index.html`: the `.platform-grid` markup (~line 209–380), its CSS (`.card-hdr`, `.stat-grid`, `.recent-label`, `.card-ftr`, the `@media (max-width: 767px)` rules), and `loadRAStats` / `loadSteamStats` / `loadXboxStats` (~550–840), which fill `#ra-stats` and the recent rows.

### Phone

One compact row per visible platform (config `platforms[key].visible` still decides): platform icon + name, three headline numbers, a chevron; the whole row links to the profile.

| Platform | Numbers (colour) |
|---|---|
| RA | Points (gold) · Mastered (gold) · Unlocks (blue) |
| Steam | Hours (blue, `5.9k` style above 1,000) · Perfect (gold) · Unlocks (blue) |
| Xbox | Gamerscore (gold) · Completed (gold) · Unlocks (blue) |

About a third of today's height. The other numbers (rank, beaten, games, played, w/ unlocks) move off the Hub; they are on each profile.

### Desktop

The same three cells side by side in one strip (`.pstrip`: 3-column grid, `#1b2838`, 1 px border, cells divided by a soft line). Each cell: name + chevron, the three numbers, and its three most recently played covers in place of today's recent-games rows (RA icon, Steam capsule, Xbox `xboxImg`).

### Code

- Keep the load functions; they now write three numbers and the covers instead of six numbers and the rows. Keep the skeletons in place from first paint (no late jump).
- `CLAUDE.md` "Hub Page" documents the stat order and colours: rewrite that part.
- Hidden platforms: with one or two visible, the desktop strip uses that many columns.

---

## 3. Profile header with blurred background

Mockups: `header-phone-*`, `header-desktop-*`.

Today's header layout and content stay exactly. The most recently played game's art sits behind it, blurred, fading into the page.

### Where

The `<header className="bg-[#1b2838] … pt-8 pb-5 md:pt-5 shadow-md anim-fade">` in each profile `App` (`profile/ra/app.js` ~1582, `profile/steam/app.js` ~1300, `profile/xbox/app.js` ~1293). The loading skeletons (`ProfileLoadingSkeleton`) stay flat.

### Art source

| Page | Image | From |
|---|---|---|
| RA | `raArt(recentlyPlayedGames[0])`: screenshot, or the icon zoomed and blurred more | `ra/profile.json` (already loaded) |
| Steam | `library_hero.jpg` of the most recent game, `header.jpg` on error | `steam/profile.json` `recentlyPlayed[0].appId` |
| Xbox | `xboxImg(recentlyPlayed[0].heroUrl, 640)` | `xbox/profile.json` (has `heroUrl`) |

No pipeline change.

### Layering

- `header` gets `relative overflow-hidden`. First child: an absolutely positioned layer with the `<img>` (inset −6% / −10%, `object-cover`, `blur(6px) saturate(1.1) brightness(0.6)`, `image-rendering: pixelated` for RA) and a gradient overlay `rgba(23,26,33,0.35) → 0.55 → 0.95`. Content goes above it with `relative`.
- Text gets `text-shadow: 0 1px 6px rgba(0,0,0,0.7)`. The pills get a dark backing (`rgba(11,17,26,0.72)`, 1 px border).
- The image fades in (`anim-fade`) once loaded (`onLoad`); until then the header is today's flat `#1b2838`, so a slow image never changes the layout.
- Phone keeps the centred layout, desktop the left-aligned one.

---

## 4. Game list: list / tiles toggle

Mockups: `views-phone-*`, `views-desktop-*`.

The profile game lists get a list/tiles switch. Today's detailed cards (`GameCard`, `SteamGameCard`, `XboxGameCard`) are replaced by the two clean views.

### Where

- RA: `GameCard` (~207) used in the Recent and Progress tabs (~2201). Series keeps its own layout.
- Steam: `SteamGameCard` (~10) in `ProgressTab` (~844, ~921) and the Recent list (~1695).
- Xbox: `XboxGameCard` (~27) in `ProgressTab` (~867, ~917) and ~1659.

### Toggle

- A segmented two-icon switch (lucide `List` / `LayoutGrid`), right-aligned on the count line ("Recently played · 85 games"). On the Progress tab it sits on the count line of `ProgressFilterBar`.
- State: `useState` initialised from `localStorage['gh:gameView']` (`'list'` default), written on change, one key shared by all three profiles. Wrap reads and writes in `try/catch`.
- Re-key the list container with the view so it fades (`key={`${view}-…`}` alongside the existing sort/filter key).

### List row (`GameRow`)

Icon (RA, 48 px, pixelated) or full Steam store banner `header.jpg` (uncropped, 460:215) / Xbox `xboxImg` box art. Title, console (RA: always) + Hardcore flame / Softcore feather + tilde tags, playtime · last played, overall `x/y` and one bar. Art gradient on the right (RA `raArt`, Steam hero) and the status stripe on the left stay. Tap opens the modal. Desktop: two columns.

### Tile (`GameTile`)

Art on top: RA icon over its blurred screenshot, or over its own zoomed blurred icon (Poring Clicker); Steam banner uncropped; Xbox hero. Last played on the art, Hardcore flame, title (2 lines max), console, one bar, two numbers (`x/y` and playtime). Status colour on the bottom edge. Phone: two across; desktop: four across.

### What moves

Badge previews, the second (progression) bar and the RA guide strip leave the cards. Guides go into the modal meta row (see piece 1); the progression bar is already in the modal header.

### Skeletons

New `GameRowSkeleton` and `GameTileSkeleton` matching each view; the skeleton follows the stored view.

---

## 5. Completions view

Mockups: `completions-phone-*`, `completions-desktop-*`.

The page body is rewritten. Header, totals strip, platform filters, Beaten toggle, tag hiding and nav stay.

### Where

`completions/app.js` (604 lines): `CompletionCard` (~229) and the year/month rendering in `App` (~313) are replaced. `normalize*`, `dedupeCompletions`, `loadWinConditionBeaten` stay and gain fields.

### Layout

- **Year line:** `2026  5 ★ complete · 4 beaten · 127h played` (complete in gold, beaten count white, the rest muted).
- **Phone:** a month timeline (month name + count, line and ring per month like Activity's day timeline). Inside a month, in date order:
  - **Completed** (Mastered / Perfect / Xbox Completed) = **highlight**: art banner (RA icon over `raArt`; Steam store banner uncropped; Xbox hero), platform chip + Hardcore tag + date on the art, `★ MASTERED` / `★ PERFECT` chip, title, console, then three cells: Achievements `x/x` (gold), Played, Rarest (rarity colour and icon, name below). Gold left edge.
  - **Beaten** = **compact row**: icon, title, `BEATEN` + platform chip + console + flame, date and playtime on the right, art faded behind, silver left edge. Steam rows keep the winning achievement with its rarity.
- **Desktop:** per year, "Completed N" as three highlights per row, then "Beaten N" rows three across.
- **Earlier years** collapse to one line: year, `2 ★ · 5 beaten`, a row of covers with a ★ on completed ones, chevron. Tap expands it into the same layout. Desktop puts collapsed years in two columns. The current year starts expanded (as `expandedYears` does today).
- A mastered and a beaten game must never look alike.

### Data

| Field | RA | Steam | Xbox |
|---|---|---|---|
| Art | `imageIngame` (new on the award, see below) via `raArt`, icon fallback | `header.jpg` from `appId` | `heroUrl` (check it is on `perfectGames` / beaten entries; add in the pipeline if not) |
| Achievements | `numAchievements` (new on the award) | `total` | `achTotal` |
| Played | `playtime` (minutes, already on the award) | `playtimeForever` | none (hide the cell) |
| Rarest | lowest `r` for the game in `history/{YYYY}.json` | same | same |
| Hardcore | `awardDataExtra === 1` | — | — |

- **RA pipeline:** add `imageIngame` and `numAchievements` to each `pageAwards.visibleUserAwards` entry from `games.json` `detailedGameProgress` (all 12 current mastery/beaten awards are in it, checked 2026-11-03), the same way `playtime` is added to `gameAwardsAndProgress`. Loading the 5 MB `games.json` in the browser for this is not an option.
- **Rarest achievement:** read the history year files for the years shown (`history/index.json` lists them; about 390 KB for everything) and take the unlock with the lowest `r` per game. Load the expanded years only; collapsed years need no rarity. RA history starts in 2024, so older RA highlights hide the Rarest cell when there's no match. Use the shared rarity tiers (Steam/Xbox `rarityLabel`/`rarityColor`; RA shows the % in the hardcore red with the flame, as in the mockup).
- **Year totals:** count completed and beaten from the filtered list; hours = sum of `playtime` of that year's entries (RA + Steam).

### Check

Filters (platform, Beaten off, hidden tags) re-key the body so it fades; a year with only beaten games shows no "Completed" group; Xbox highlights without playtime; games with no rarity data.

---

## Docs to update when shipping

- `CLAUDE.md`: Hub page (strip replaces cards, stat colours), Motion (`.anim-sheet`, sheet z-index), Design System (RA art fallback rule).
- `profile/*/CLAUDE.md`: modal shell, header art, list/tiles views and the `gh:gameView` key.
- `completions/CLAUDE.md`: new layout and data sources.
- `scripts` notes / `CLAUDE.md` RA pipeline: the two new award fields.
- `changelog.md` for every piece.
