# Share card

**Status:** Planned, design approved for mockups · **Priority:** 8 · Written 2026-11-02 · Replaces the April `share-gamecard` branch (not merged)

A share image for one game: tap **Share**, get a picture of your progress or completion to post in a story, a chat or a feed. Drawn on a canvas in the browser, no server.

## Reference files

Everything in [`share-card/`](share-card/) is the design source of truth. Open it locally, it isn't deployed (`backlog/` is excluded in `deploy.yml`).

| File | What it is |
|---|---|
| [`share-card/plan.html`](share-card/plan.html) | The full mockup page (self-contained, images inlined; 2.8 MB). Every style, type and format with real games, the April comparison, the build plan. The card builders in its `<script>` (`cardA` Showcase, `cardB` Trophy, `cardC` Dashboard, `landA` landscape) and its CSS hold the exact geometry. Also published as a private artifact: https://claude.ai/code/artifact/6669f606-b986-4f60-9e0e-7f271e90bb2c |
| [`share-card/cards/`](share-card/cards/) | 30 full-size renders (JPEG, exact export size) to compare the canvas output against: `{style}-{type}-{game}-{format}.jpg`. Games: `d7` 7th Dragon 2020 (RA mastered, hardcore), `rof` FF Crystal Chronicles: Ring of Fates (RA in progress, DS screenshot), `so2` STAR OCEAN THE SECOND STORY R (Steam perfect). Every style × Detailed/Clean in portrait, story for `d7`, landscape for Showcase |
| [`share-card/april-vs-now/`](share-card/april-vs-now/) | The April branch's own output next to the new design: vertical → portrait (April \| Showcase \| Trophy) and horizontal → landscape (April \| Showcase) for `d7` and `rof` |

Mockups not covered by the renders (softcore RA, the no-screenshot fallback, Steam beaten/in progress, the wide-header Trophy fallback) are in `plan.html`.

## Decisions

Made 2026-11-01 / 02 while reviewing the mockups.

- **Three styles**, switchable in the share sheet: **Showcase** (default), **Trophy**, **Dashboard**. The last style picked is remembered.
- **Two types per style:** **Detailed** and **Clean**. Clean drops pieces rather than restyling them (see [Card anatomy](#card-anatomy)).
- **Formats:** portrait **1080×1350** (default, all styles), story **1080×1920** (all styles), landscape **1200×630** (Showcase only; no Trophy/Dashboard landscape).
- **RA art:** the game icon (96 px) drawn big over the blurred in-game screenshot (`imageIngame`). No screenshot → the icon itself zoomed to cover the area, blurred. RA icons only at whole-number scales (2× = 192, 3× = 288) with smoothing off.
- **Steam art:** store hero (`library_hero`) for Showcase/landscape, header for Dashboard, the tall cover (`library_600x900`) inside a **progress frame** for Trophy, with the wide header in the same frame when there's no tall cover.
- **Backgrounds** always cover the area and are centred (object-fit cover, centred source rect), bleeding past the edges so the blur's soft edge stays outside. Never black bars.
- **Blur:** Trophy background 16 px, Showcase/Dashboard art 30 px (icon fallback 40 px), landscape screenshot 4 px. 6 px on the landscape screenshot reads as a bad upscale; darkening instead of blurring changed nothing.
- **RA mode:** every RA card carries a **Hardcore** (red) or **Softcore** (grey) tag next to the platform badge, as on the RA profile page; landscape uses **HC** / **SC** so the row fits. Softcore 100% is **★ Completed** in silver; hardcore 100% is **★ Mastered** in gold.
- **Steam perfect** is gold like RA mastered (bar, frame, timeline, chips), not Steam blue.
- **Dashboard labels** (platform, mode, status, date) all sit on the cover, so the title gets the full width (wraps to 2 lines).
- **Story:** Instagram/WhatsApp UI covers about the top and bottom 250 px. Art may run under it; text, numbers and identity stay in the middle.

## Card anatomy

All sizes are in export pixels. `plan.html` has the rest (font sizes, gaps); the renders in `cards/` are the visual check.

### Showcase (portrait / story)

- Art band at the top, 540 px tall (Clean 760 px; story 1080 / 1180), fading into the base `#0b111a` (gradient from 35% to 100%). RA icon 288 px centred at `top: 102` (Clean 170, story 360).
- Top row at `top: 36`, 52 px side margin: platform badge (+ mode tag) left, status chip right.
- Body from `top: 440` (Clean 640, story 900 / 1060) to 44 px above the bottom, 52 px sides:
  - Detailed: title (54 px, 2 lines max) + meta line · `NN%` + `x / y achievements` + bar · 3 stat boxes · play strip (13 weeks) or the timeline · rarest achievement box · footer (identity left, date right, rule above)
  - Clean: title (64 px) + meta · `NN%` (76 px) + bar · **two** plain numbers · footer

### Trophy (portrait / story)

- Background: Steam hero / RA screenshot / RA icon (40 px blur) covering the card, blur 16 px, `brightness(0.5)`, plus a radial vignette.
- Centred column inset 60 px (story: top 290, bottom 270): platform badge (+ mode) · art · status seal (`In progress · 1%`, no % at 100) · title (58 px, Clean 66) · Detailed only: date/count line and 3 stats · identity at the bottom.
- **RA:** icon inside a 420 px completion ring (stroke 18, track `rgba(255,255,255,0.12)`, arc from 12 o'clock clockwise, round cap, minimum visible length). Clean: 500 px ring, icon 288. The mockup's Detailed icon is 280 px: **use 288** in the renderer (whole-number scale).
- **Steam:** tall cover 300×450 (Clean 360×540) inside a rounded-rect progress frame, 16 px padding, stroke 14, radius 26; the line is traced clockwise from the top-left corner's end, filled to the percentage of the perimeter. Wide header fallback 520×243 (Clean 640×299).
- Clean: no date line, no stats; the art block is vertically centred between the badge and the footer.

### Dashboard (portrait / story)

- Panel inset 44 px (bottom 76 for the footer; story: top 270, bottom 330), `#1b2838`, border 3 px `#2a475e`, radius 12.
- Cover 460:215 at panel width: Steam header, or the RA icon (288) over the 30 px blurred screenshot. Labels on the cover: badge + mode + status top-left (wrap if needed, `right: 180`), date top-right.
- Body (26 px top, 32 px sides, gap 22): title (46 px, 2 lines) · bar + `NN%` + `x/y` · Detailed only: strip or timeline · recent unlocks (8 badges, empty dashed slots for fewer) · Detailed only: rarest achievement · stats band (3 columns) pinned to the panel bottom.
- Clean: no strip, no rarest achievement, larger title/progress.
- Footer under the panel: identity left, platform name right.
- Recommendation from the review: Dashboard Clean barely differs from Detailed. Ship Dashboard as Detailed-only unless that changes.

### Landscape (Showcase, 1200×630)

- Art across the card, masked `linear-gradient(90deg, #000 30%, transparent 56%)` (no seam). RA: screenshot at 4 px blur + `brightness(0.75)`, icon 192 px at `left: 300, top: 219`. Steam: hero at 66% width.
- Text column `left: 600, right: 40`, top 34 / bottom 30: badge + HC/SC + status · title (40 px, Clean 50, one line) + meta · bar · Detailed: 3 stat boxes, strip or timeline, rarest achievement · footer.
- Clean: two plain numbers (50 px), the column's content sits just above the footer.
- Long titles: shrink to fit (down to a floor), then ellipsis. The mockup only truncates.

### Shared pieces

- **Status chips:** mastered/perfect gold `#e5b143` on dark text; completed (RA softcore) silver `#b8c4ce`; beaten `#2a3440` with a silver border; in progress blue text on dark with a blue border. Uppercase, letter-spacing 0.12em, weight 800.
- **Mode tag:** hardcore `#ff6b6b` text, `rgba(255,107,107,0.4)` border; softcore `#c6d4df`, `rgba(143,152,160,0.5)`.
- **Progress colour** per card: gold for 100% hardcore/perfect, silver for softcore completed, RA gold / Steam blue `#66c0f4` otherwise.
- **Play strip:** 13 weekly cells, oldest first, alpha by minutes (0 → empty, <60 → 0.3, ≥60 → 0.5, ≥150 → 0.75, ≥300 → 1) in the progress colour.
- **Timeline** (finished games without recent play): `Beaten date ——— ★ Mastered date`. When beaten and 100% are the same day (Star Ocean: 5 s apart), start from the first unlock instead: `Started date ——— ★ Perfect date`.
- **Identity:** avatar (`assets/avatar.png`), name, `yozuryu.github.io/gaming-hub`.

## Card data

One plain object per card, built by a per-platform adapter from data the pages already load. The renderer only knows this shape.

```js
{
  platform: 'ra' | 'steam' | 'xbox',
  title, meta,                      // meta: genre · year, or a status line for Steam
  console,                          // RA console name for the badge
  mode: 'hc' | 'sc' | null,         // RA only
  status: 'mastered' | 'completed' | 'perfect' | 'beaten' | 'progress',
  statusLabel, date,                // 'Mastered 8 Apr 2026', 'Played today'
  unlocked, total, pct,
  color, rgb,                       // progress colour (see above)
  stats: [[value, label] × 3],      // Clean uses the first two
  weeks: [13 × minutes] | null,     // play strip; null → timeline
  road: { from: 'Beaten' | 'Started', start, end } | null,
  rare: { name, desc, pct, img, label: 'Rarest achievement' | 'First achievement' } | null,
  recent: [img × ≤8], locked,       // badges + empty slots
  art: { icon, shot, hero, header, cover },   // URLs; missing ones are null
}
```

- **RA** (`data/ra/games.json` `detailedGameProgress[id]`, `profile.json` `gameAwardsAndProgress` and awards): icon `imageIcon`, screenshot `imageIngame` (fall back to `imageTitle`, then the icon-blur fallback), mode from `numAwardedToUserHardcore` vs `numAwardedToUser`. Rarity per achievement: hardcore `numAwardedHardcore / numDistinctPlayersHardcore`, softcore `numAwarded / numDistinctPlayersCasual`. Stats: played (`playtime` from `gameAwardsAndProgress`), points, and sessions in 13 weeks (or HC players when finished). Status from the award kind (`mastered`, `completed`, `beaten-hardcore`, `beaten-softcore`).
- **Steam** (`games/{appId}.json` + `win-conditions.json`): `unlockedAt`, `globalPct`, icon hash. Status: perfect at 100%, beaten via the win condition (same rule as the profile page's `beatenInfo`), otherwise in progress. Stats: played (`playtimeForever`), sessions in 13 weeks, average session; perfect: played, achievement count, days start → perfect.
- **Xbox** (`games/{titleId}.json`): no mockup yet. Same layout as Steam with Xbox art through `xboxImg()`, no play strip (no playtime), stats: gamerscore, achievements, rarest %. Xbox's "Completed" is gold (site convention), unlike RA softcore Completed.
- **Play strip and sessions:** from `playtime/{YYYY}.json`, the same 13-week window and week cells as `assets/playing.js`. Reuse its helpers rather than recomputing.

## Images and CORS

A canvas that draws a cross-origin image without CORS headers is tainted, and `toBlob` then throws. Checked 2026-11-01:

| Source | Host | CORS |
|---|---|---|
| RA icons, screenshots, badges | `media.retroachievements.org` | Direct |
| Steam store art (header, `library_hero`, `library_600x900`) | `cdn.akamai.steamstatic.com`, `shared.akamai.steamstatic.com` | Direct |
| Steam achievement icons | `steamcdn-a.akamaihd.net/steamcommunity/...` | **No**, proxy via `https://wsrv.nl/?url=…` |
| Xbox art | store-images / `xboxImg()` URLs | **No**, proxy via wsrv.nl |

Load with `img.crossOrigin = 'anonymous'`. A failed image is skipped (the piece is left out, or the fallback art is used), never a failed card. Steam games without a tall cover: detect a 404 on `library_600x900` and use the header frame.

## Renderer: `assets/sharecard.js`

ES module, same pattern as `assets/playing.js`. No build step.

- `drawCard(canvas, data, { style, type, format })` draws at export size (1080×1350 / 1080×1920 / 1200×630). The preview is the same canvas scaled down with CSS.
- `loadCardImages(data)` resolves every URL (proxying where needed) into `HTMLImageElement`s before drawing, so drawing is synchronous.
- `await document.fonts.ready` before drawing. The site's `'Segoe UI', Arial` isn't on iOS/Android: use the system stack (`-apple-system, 'Segoe UI', Roboto, Arial, sans-serif`), and measure text, never assume widths from the mockup.
- **Cover-fit helper:** `drawCover(ctx, img, x, y, w, h, bleed)` computes the centred source rect for object-fit cover, with bleed so blurred edges stay outside.
- **Blur:** `ctx.filter = 'blur(…)'` is the simple path, but check iOS Safari first: canvas `filter` support there is the main unknown (it was missing for a long time). Fallback that works everywhere: draw the image small (for example 1/8 size) and scale back up with smoothing on, repeated once or twice; or a small box blur on `ImageData`. Decide after testing on the phone.
- **Pixel art:** `ctx.imageSmoothingEnabled = false` for RA icons (whole-number scales only) and the landscape screenshot before its blur.
- **Text:** a `fitText(ctx, text, maxWidth, maxLines, sizes)` helper: try the size, shrink down to a floor, then clamp lines with an ellipsis. Titles use it everywhere; `text-wrap: balance` behaviour for Trophy titles (split near the middle).
- **Shapes:** `ctx.roundRect` for chips, boxes, panels; the ring is an `arc` from −90°; the Steam frame is a rounded-rect path with `setLineDash([pct × perimeter, perimeter])`, perimeter = `2(w + h) − 8r + 2πr`, starting at the top-left corner's end like SVG `rect`.
- **Masks:** the landscape fade is a `destination-in` gradient on an offscreen canvas holding the art, then drawn onto the card.
- **Export:** `canvas.toBlob('image/png')`.

## Share sheet UI

Vanilla DOM in the same module (`openShareSheet(data)`), so the React pages and the vanilla hub share one implementation. Tailwind classes work because the Tailwind CDN scans the DOM at runtime; motion uses `.anim-pop` / `.anim-backdrop` from `assets/motion.css`.

- Mobile first (~400 px): preview on top, then three segmented controls: **style** (Showcase · Trophy · Dashboard), **format** (Portrait · Story, + Landscape when Showcase), **type** (Detailed · Clean; landscape opens on Clean, portrait and story on Detailed).
- Actions: **Share** (`navigator.share({ files: [new File([blob], 'name.png')] })` when `navigator.canShare` allows it; on phones this is also how you save to Photos), **Download** (blob URL + `<a download>`, desktop), **Copy image** (`ClipboardItem`, desktop).
- The preview shows a shimmer skeleton while images load and the card draws, then fades in. Redraws on every switch; the canvas is reused.
- Remember the last style (and type per format) in `localStorage`, wrapped in try/catch.
- File name: `{title-slug}-{style}-{format}.png`.

## Entry points

- **RA:** `RAchievementModal` (`profile/ra/app.js`), a Share button in the modal header.
- **Steam:** `AchievementModal` (`profile/steam/app.js`); `beatenInfo` is already passed in.
- **Xbox:** `AchievementModal` (`profile/xbox/app.js`).
- **Completions:** `CompletionCard` (`completions/app.js`), a small share icon per entry.
- Always visible, never hover-only (the April branch's button was invisible on a phone).
- Optional, undecided: the Playing tiles on Activity and the hub.

## Steps

1. **Renderer core:** `sharecard.js` with the helpers above, Showcase portrait for RA and Steam from hard-coded card data. Compare against `cards/showcase-*-portrait.jpg` side by side at the same size. Settle the blur method on the iPhone PWA here.
2. **Adapters:** `fromRA`, `fromSteam`, `fromXbox` producing card data from what the pages already load (+ the playtime log for the strip).
3. **Remaining styles and formats:** Trophy (ring, frame), Dashboard, story, landscape; Clean for each. Check every render against `cards/`.
4. **Share sheet** and the **entry points**; check at phone width in the installed PWA (share sheet, save to Photos).
5. **States:** mastered, completed (softcore), perfect, beaten, in progress, 1 unlock ("First achievement"), no screenshot, DS (portrait screenshot), subsets and hacks (tilde tags, `[Subset - …]` titles), long titles, Steam without a tall cover, Xbox, a failed image.
6. Changelog (Hub / profiles / Completions sections), `CLAUDE.md` (shared module, entry points), delete the `share-gamecard` branch once nothing is left to take from it.

## Idea: overlay stickers for video stories

**Status:** Idea, designed (six shapes, every state) · Added 2026-11-14 · Instagram keeps the PNG's transparency (checked on the phone, 2026-11-14)

A fourth output next to the full cards: a small sticker that goes on top of a video, such as an Instagram story, a Reel, a TikTok or a clip edited in CapCut. A full card takes over the whole story, while a sticker shares the screen with the gameplay. Each one is a single rounded card on a **transparent background** with a soft shadow, exported at 3× so it stays sharp when it's pinched to size in the story editor.

### Shape rule

**Square, or a horizontal rectangle no wider than 2 : 1.** Long thin strips (pills, tickers, toasts), vertical towers and round coins were tried and dropped: on a story they look stretched. Keep it horizontal where there's a choice.

### The six shapes

The design source is [`share-card/overlay/stickers.html`](share-card/overlay/stickers.html): open it for the design sheet, or add `?shape=cover&game=rof9` for one sticker alone on a transparent page. Its `GAMES` array uses the [card data](#card-data) shape (trimmed), with real numbers from the site's data. [`overlay/stickers/`](share-card/overlay/stickers/) has the renders: `sheet.jpg` and a transparent 3× image per shape and game (`cover-rof9.png`, `stack-d7.webp`, …). The renderer writes PNGs; the committed copies are WebP (lossy, alpha kept) except the download set, to keep the repo small. `PUPPETEER=/path/to/node_modules/puppeteer node render-stickers.cjs` rebuilds them.

| Shape | Size (CSS px, exported 3×) | Ratio | What it shows |
|---|---|---|---|
| **Cover** | 320 × 240 | 4 : 3 | Tall cover on the left (RA: blurred screenshot + icon at 96), then chips, title (3 lines), big `pct%` (★ when finished) + `x/y`, bar, time played, latest or rarest badge with a short label (`Latest · 35.8%`) |
| **Stacked** | 340 × ~300 | ≈ 1.1 : 1 | Art band with chips and avatar, cover/icon + title, then ring · `x/y achievements` · played, then the achievement box |
| **Square** | 240 × 240 | 1 : 1 | A small trophy: chips, the art inside the completion ring with the percentage on a tab under it (★ Mastered / ★ Perfect when finished), title, `x/y · played` |
| **Unlock** | 300 × 200 | 3 : 2 | The moment itself: `Achievement unlocked` (finished: `Rarest unlock`), the badge big (85, RA at 4×) with a gold glow when rarer than 10%, its name and rarity, then a footer with the game, `x/y` and a small ring |
| **Shelf** | 320 × 200 | 16 : 10 | The badges so far: title row, then 12 slots holding the latest unlocks in order (empty slots dashed), then the bar and `pct% · x/y`. Only offered with 3 or more unlocks |
| **Stub** | 320 × 170 | ≈ 1.9 : 1 | One session as a ticket with a perforated side stub: `+5 achievements · 8 Nov` with that day's badges, ring + `x/y` on the stub. Finished games show `★ Mastered 8 Apr 2026` instead. Only offered when there's a session or a finish |

Samples: the stacked card in every state (Steam in progress / perfect / beaten, RA mastered hardcore / completed softcore / just started with a long title and a portrait DS screenshot / no screenshot, Xbox), the other five for Eiyuden Chronicle: Rising, Ring of Fates (9/76), 7th Dragon 2020, STAR OCEAN 2 R and Soul Hackers 2.

**States**, the same in every shape:

| State | Colour | Frame | Chip / kicker |
|---|---|---|---|
| In progress | platform: Steam `#66c0f4`, RA `#e5b143`, Xbox `#52b043` | hairline | outlined, platform colour |
| Beaten | silver `#b8c4ce` | silver hairline | dark with silver border |
| Completed (RA softcore) | silver | silver 1.5 px + glow | solid silver, **★ Completed** |
| Mastered (RA hardcore) / Perfect (Steam) | gold `#e5b143` | gold 1.5 px + glow | solid gold, **★ Mastered** / **★ Perfect** |

- RA in progress and mastered share gold, as in the full cards. The frame, glow, solid chip and ★ are what set mastered apart, and they read at story size.
- Xbox has no playtime, so gamerscore takes the time's place. `<1%` when one unlock rounds to 0.
- Rarity under 10% is `rare, X%` in gold and rings the badge in gold.
- RA icons and badges only at whole-number scales with smoothing off (64 → 2×, 3×, 4× at export).
- **Over video:** everything that floats on footage has its own dark fill.
- **Safe area:** Instagram's UI covers about the top and bottom 250 px of a 1080 × 1920 story; the sheet shows placements clear of both bands.
- **Session data** (stub): the unlocks sharing the latest unlock's date (Eiyuden: 4 on 7 Nov; Ring of Fates: 5 on 8 Nov), `session: { date, gained, imgs }`. **Recent** (shelf): the latest 12 unlocked badges in order, `recent: [img]`. Both come from the achievement lists the adapters already read.
- **Fit with the renderer:** a fourth format in `drawCard` (`format: 'sticker'`, `style: 'cover' | 'stacked' | 'square' | 'unlock' | 'shelf' | 'stub'`) that sizes the canvas to the sticker and draws on a cleared, transparent canvas. Export as PNG; JPEG would flatten the alpha to black. In the share sheet, a **Sticker** format next to Portrait, Story and Landscape, showing only the shapes the game can fill. The stub's notches are two `arc` cut-outs with `destination-out`; everything else is boxes, rings and text already in the plan.
- **Download set:** `stickers/{shape}-eiyuden.png` and `{shape}-rof9.png` are real, current stickers for posting; `stickers/download-sheet.jpg` shows all twelve.
- **Still open:** subsets and hacks (`[Subset - …]` and tilde tags in the title), a Steam game without a tall cover (Cover and Square would use the header, cropped).

### First round (history)

[`overlay/compact/`](share-card/overlay/compact/): the six first-round mockups for LEGO 2K Drive (`sheet.jpg`, renders committed as WebP), from before the shape rule. Four of them (original, poster, cover-ring, logo-bar, all about 2.8 : 1) and the pill (6.6 : 1) are wider than the rule allows; the stacked one became **Stacked** above. `python3 genc.py .` and `node renderc.cjs` in `overlay/` rebuild them.

## Open decisions

- Keep Detailed/Clean as a switch, or ship one type. Recommended: keep the switch, landscape opens on Clean.
- Dashboard Clean: drop it (recommended) or keep.
- Entry points: modal + Completions only, or also the Playing tiles.
- Identity on every card, or optional.
- A Trophy landscape format (not designed).

## From the April branch

`share-gamecard` (2026-04-05) is the starting point that was reviewed, not merged: 7 months behind (the RA page it edits has been rewritten), RA only, Share only on hover, every image through a third-party proxy, and its cards had text collisions ("100%PLETION"), an in-progress game shown with a gold HARDCORE badge, half-empty vertical layout and muddy half-opacity art (see `april-vs-now/`). Kept from it: canvas in the browser, preview + native share sheet + download, the content mix, skipping missing images.
