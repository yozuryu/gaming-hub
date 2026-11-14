# Share cards: the Fable 5.2 set

**Design by Fable 5.2** · 14 Nov 2026 · Status: idea, designed, not built

Forty share images in four groups: ten **stories** (1080 × 1920), ten **posts** (1080 × 1350), ten **wide cards** (1200 × 630) and ten **overlays** (transparent stickers). They sit next to the approved cards (Showcase, Trophy, Dashboard) and the six story stickers in [`../../share-card.md`](../../share-card.md); nothing here replaces those until it's picked.

- Sheet with all forty: [`samples/sheet.jpg`](samples/sheet.jpg)
- One file per design: `samples/{id}-{name}.jpg` (stories, posts, wide cards) and `.png` (overlays, 3×, transparent)
- Source: `cards.html` (every design is one entry of `D`), data from `build-data.cjs`

Every figure in the samples is real, read from the data branch on 14 Nov 2026.

## The designs

### Stories · 1080 × 1920

| | Name | Hero | Use it for |
|---|---|---|---|
| S1 | Poster | The portrait art, edge to edge | A game in progress with tall art (Steam `library_600x900`) |
| S2 | Window number | The percentage, with the art showing through the digits | Any progress; works on blurred art |
| S3 | Plate | A framed cover and three facts | Perfect / mastered |
| S4 | Spotlight | One unlock, lit | A single achievement and its rarity |
| S5 | Receipt | One session as a till receipt | A sitting with 3 to 8 unlocks |
| S6 | Wall | Every badge of the set | RA mastery (badges at 2×) |
| S7 | Road | First unlock, the quarters, the mastery | A finished game with a history |
| S8 | Diptych | Art above, a block of the state colour below | Beaten |
| S9 | Week | Hours of the last 7 days as bars | A weekly recap |
| S10 | Ring | The cover inside its progress ring | Now playing |

### Posts · 1080 × 1350

| | Name | Hero | Use it for |
|---|---|---|---|
| P1 | Cover story | The art as a magazine cover | Perfect / mastered with good wide art |
| P2 | Bento | Six tiles, one of them loud | A game in progress |
| P3 | Trading card | Gold foil frame, screenshot at 3× | RA mastery |
| P4 | One in a hundred | Rarity as a hundred dots | One rare unlock |
| P5 | Ledger | Type and one colour, no art | Any game; the fallback when art is poor |
| P6 | Series | A shared series, one row per game | Series progress across platforms |
| P7 | Month | A month as a calendar | Monthly recap |
| P8 | Rarest five | Five unlocks, one per game | Yearly or all-time brag |
| P9 | Shelf | Every finished game | Completions, gold and silver borders |
| P10 | Year | Three numbers and the months | The profile card |

### Wide · 1200 × 630

The landscape card for a normal feed post (Facebook, X, LinkedIn, Discord) and for a link preview. The layout is two columns or a strip, never a stack: there are only 630px of height.

| | Name | Hero | Use it for |
|---|---|---|---|
| W1 | Split | The tall cover on the left, the percentage on the right | A game in progress with portrait art |
| W2 | Banner | The hero art sharp, facts on a scrim | Perfect / mastered with wide art (Steam `library_hero`) |
| W3 | Wall | Every badge at its native 64px | RA mastery, sets up to 90 badges |
| W4 | Ticket | One unlock, its rarity on the stub | A single achievement with a picture (Xbox) or a badge |
| W5 | Road | First unlock to mastery, left to right | A finished game with a history |
| W6 | Week | The hours, a bar per day | A weekly recap |
| W7 | Series | Every game as a tile in its status colour | A shared series, up to 12 games |
| W8 | Year | Three numbers and the months | The profile card |
| W9 | Session | The count, then the badges at 2× | A sitting with 3 to 5 unlocks |
| W10 | Shelf | Every finished game | Completions, up to 28 icons |

### Overlays · transparent, 3×

| | Name | Size | Use it for |
|---|---|---|---|
| O1 | Ring | 200 × 200 | Progress, cover inside the ring |
| O2 | Toast | 320 × 160 | One unlock, the console pop-up at 2 : 1 |
| O3 | Counter | 210 × 150 | The count and nothing else |
| O4 | Stamp | 200 × 200 | Finished games only; round seal, tilted 9° |
| O5 | Bookmark | 150 × 240 | Progress, hung from the side of the frame |
| O6 | Meter | 320 × 160 | Progress as segments |
| O7 | Session | 320 × 160 | What one sitting added |
| O8 | Gem | 190 × 210 | Unlocks under 10% only |
| O9 | Lower third | 360 × 64 | Video and streams only |
| O10 | Bug | 128 × 64 | The corner mark that stays on screen |

## Rules

### 1. One hero

Each card has exactly one thing that is read from across the room: a number, the art or an unlock. Everything else is at most a third of its size. A card that needs two heroes is two cards.

### 2. Type

- **Oxanium** (the wordmark's face) for numerals and small uppercase labels, always with tabular figures.
- **System sans** for game titles and anything read as a sentence. Game names are never uppercased by the card (a store name that is uppercase stays as it is).
- **Monospace** only on the Receipt.
- Titles shrink to fit (`data-fit="max,min,lines"`), then truncate. A title never pushes the hero.
- Smallest text: 22px on a story, post or wide card (about 9px on a phone), 9px on an overlay at 1×.

### 3. Colour

- One accent per card, and it is the state: in progress = platform colour (Steam `#66c0f4`, RA `#e5b143`, Xbox `#52b043`), beaten = silver `#b8c4ce`, mastered / perfect / completed = gold `#e5b143`.
- Base `#080c14`; text `#fff` / `#c6d4df` / `#8f98a0`. No second accent, no gradients between accents.
- Rarity is gold only under 10%.

### 4. Art

- Sharp only when the source is at least as large as the box. Otherwise blurred behind the content, centred, `cover`, bleeding past every edge (no black bars).
- RA icons (96px) and badges (64px) only at whole-number scales, `image-rendering: pixelated`. Screenshots too.
- Xbox images always through a width parameter; widths the CDN refuses return 400 (832 did, 800 works).
- Steam `library_600x900.jpg` is missing for some games: fall back to `header.jpg`. No art at all: P5 Ledger, or the mosaic fallback.
- Text over art sits on a scrim, never directly on the picture.

### 5. Identity

- Avatar, name, crystal mark, "Savepoint", in that order, on one line.
- Stories: directly above the bottom safe band. Posts: the bottom edge. Wide: bottom left, at 24px. Same place on every card of a group, so a row of them reads as one set.
- Overlays: the mark only, or nothing. A sticker sits on the owner's own story; the name is already there.
- "Design by Fable 5.2" is on the sheet and in this folder, never on a card.

### 6. Safe areas and sizes

- Story: all text and the identity between y 250 and y 1670. Art and texture may run under the bands.
- Post: 1080 × 1350, 64px margins. The samples use the full width; a profile grid that crops the sides would cut into them (see Open questions).
- Wide: 1200 × 630, margins 56px at the sides and 48px top and bottom. A 16 : 9 crop of the middle (1120 wide) only touches those margins, so text survives it; a square crop does not, so a wide card is never offered where the feed shows squares.
- Wide cards carry 22px text at the smallest: on a phone feed the card is about 400px wide, a third of its size, so nothing below 22px.
- Stories, posts and wide cards export at 1×; overlays at 3× PNG with their own dark fill (`rgba(8,12,20,.93)`), 1px light border and a soft shadow, so they hold on any footage.

### 7. Overlay shapes

Square, or horizontal and no wider than 2 : 1, as the sticker rule already says. Two exceptions, each with a reason:

- **O5 Bookmark** is portrait (5 : 8). It hangs from the frame edge like a tag; it is not a tower floating mid-screen, which is what the rule was written against.
- **O9 Lower third** is 5.6 : 1. It is for video editors and streams, where a lower third is the convention. Not offered for stories.

If the exceptions aren't wanted, drop both; the other eight follow the rule.

### 8. Which design for which state

- A design that claims a finish (Plate, Wall, Road, Trading card, Stamp, Cover story, Banner) is offered only for mastered / perfect / completed. Diptych for beaten.
- Xbox has no playtime: its cards show gamerscore in that slot.
- Receipt and Session need a session with unlocks; Wall needs the full badge list (RA); Series needs a shared series with 3+ known games.

## Kept from the existing plan, and what changes

- Kept: transparent 3× stickers with their own fill, the 250px story bands, centred cover backgrounds, whole-number pixel art, the state colours.
- Changed: Oxanium for numerals (the approved cards use the site font throughout); the two overlay exceptions above; identity reduced to the mark on overlays.

## Open questions

- **Not verified:** how Instagram crops a 4 : 5 post in the profile grid today. If the grid shows 3 : 4, it cuts about 34px off each side of a 1080 × 1350 post, inside the 64px margin, but full-bleed art (P1, P6) loses its edges. Check on the phone before building.
- **Not verified:** the samples were judged as rendered files and contact sheets on a desktop, not on the 450px phone or inside Instagram's editor.
- **Not verified:** the wide size. 1200 × 630 (1.91 : 1) is the link-preview size as I remember it; I didn't check Facebook's current documentation, nor how each feed crops an uploaded photo of that shape today. The existing Showcase landscape in the plan uses the same size.
- The wide Showcase in the plan and W1 / W2 overlap; if the set is built, pick one.
- Forty is a menu, not a feature list. A build should ship four to six; my picks are S2, S6, P2, P4, W1, W3, O1, O2.
- Fonts in canvas: Oxanium must be loaded before drawing (`document.fonts.load`), or the first export falls back.

## Rebuilding

```sh
npm run data:pull                      # from the repo root
cd backlog/share-card/fable-5.2
node build-data.cjs                    # data/ → data.js
PLAYWRIGHT=/path/to/node_modules/playwright node render.cjs            # everything
PLAYWRIGHT=/path/to/node_modules/playwright node render.cjs s6 sheet   # some
```

`render.cjs` needs Playwright, Chrome and the network (art and fonts are remote). It prints every image that failed to load.
