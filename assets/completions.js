// Completions / Game awards section shared by the three profile pages (ES module, no JSX; styles .cmp-* in ui.css).
// Two tier counts in the platform's own words, the newest completion as a card with its art behind, then a shelf
// of the rest (top tier first, then beaten, newest first in each) in the platform's art shape: two rows folded,
// "Show all" opens a box that scrolls (4 rows, 3 for tall posters). Tapping a game opens its achievement sheet.
// Two views, remembered per device (gh:awardsView): tiles (default, a showcase: art and tier only) and list
// (picture, name, console or fact, tier and date).
import { createElement as h, useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { toMs, fmtDate } from './time.js';

const ICON = {
  star:   [['path', { d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z', fill: 'currentColor', stroke: 'none' }]],
  medal:  [['path', { d: 'M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15' }], ['path', { d: 'M11 12 5.12 2.2' }], ['path', { d: 'm13 12 5.88-9.8' }], ['path', { d: 'M8 7h8' }], ['circle', { cx: 12, cy: 17, r: 5 }], ['path', { d: 'M12 18v-2h-.5' }]],
  flag:   [['path', { d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' }], ['path', { d: 'M4 22v-7' }]],
  trophy: [['path', { d: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6' }], ['path', { d: 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18' }], ['path', { d: 'M4 22h16' }], ['path', { d: 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22' }], ['path', { d: 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22' }], ['path', { d: 'M18 2H6v7a6 6 0 0 0 12 0V2Z' }]],
  clock:  [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M12 6v6l4 2' }]],
  chev:   [['path', { d: 'm6 9 6 6 6-6' }]],
  grid:   [['rect', { x: 3, y: 3, width: 7, height: 7 }], ['rect', { x: 14, y: 3, width: 7, height: 7 }], ['rect', { x: 14, y: 14, width: 7, height: 7 }], ['rect', { x: 3, y: 14, width: 7, height: 7 }]],
  list:   [['line', { x1: 8, x2: 21, y1: 6, y2: 6 }], ['line', { x1: 8, x2: 21, y1: 12, y2: 12 }], ['line', { x1: 8, x2: 21, y1: 18, y2: 18 }], ['line', { x1: 3, x2: 3.01, y1: 6, y2: 6 }], ['line', { x1: 3, x2: 3.01, y1: 12, y2: 12 }], ['line', { x1: 3, x2: 3.01, y1: 18, y2: 18 }]],
};
const Icon = ({ name, size = 12, ...rest }) => h('svg', {
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, ...rest,
}, ...ICON[name].map(([tag, attrs], i) => h(tag, { key: i, ...attrs })));

const hm = (m) => (m == null || m <= 0) ? null : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`;
const COLS = { sq: 4, pt: 4, wd: 3 };          // the same on phone and desktop
const OPEN_ROWS = { sq: 4, pt: 3, wd: 4 };     // rows visible in the open, scrolling box
const LIST_ROWS = 5, LIST_OPEN_ROWS = 8;       // list view: rows folded / visible in the open box

const VIEW_KEY = 'gh:awardsView';
const readView = () => { try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'tiles'; } catch { return 'tiles'; } };

// An <img> that moves to a fallback once, then hides itself
const Img = ({ src, fallback, className, style }) => h('img', {
  src, className, style, alt: '', loading: 'lazy',
  onError: (e) => { const t = e.currentTarget; if (fallback && t.dataset.fb !== '1') { t.dataset.fb = '1'; t.src = fallback; } else t.style.visibility = 'hidden'; },
});

// ext: the picture's bottom is padding (Xbox 360 posters): the art is faded out above it and a blurred,
// enlarged copy of the same art fills the space underneath, so there's no black bar
const Pic = ({ src, fallback, ext, className }) => ext
  ? h('span', { className: `${className} ext` },
      h(Img, { className: 'ext-bg', src, fallback }),
      h(Img, { className: 'ext-fg', src, fallback }))
  : h(Img, { className, src, fallback });

const Tag = ({ tier, labels }) => h('span', { className: `cmp-tag ${tier}` }, tier === 'gold' ? labels.gold : labels.silver);

function Latest({ g, labels, shape }) {
  return h('button', { type: 'button', className: `cmp-latest ${g.tier}`, onClick: g.onOpen },
    g.art && h(Img, { className: 'cmp-latest-bg', src: g.art, fallback: g.artFallback }),
    h('span', { className: 'cmp-latest-shade' }),
    h('span', { className: 'cmp-latest-in' },
      h(Pic, { className: `cmp-cov ${g.coverShape ?? shape} ${g.tier}${g.pixel ? ' pixel' : ''}`, src: g.cover, fallback: g.coverFallback, ext: g.coverExt }),
      h('span', { className: 'cmp-latest-b' },
        h('span', { className: 'cmp-latest-k' }, 'Latest ', h(Tag, { tier: g.tier, labels })),
        h('span', { className: 'cmp-latest-n' }, g.name, g.tags),
        h('span', { className: 'cmp-latest-m' },
          h('span', null, fmtDate(g.at)),
          g.sub && h('span', null, g.sub),
          hm(g.minutes) && h('span', null, h(Icon, { name: 'clock' }), hm(g.minutes)),
          g.score && h('span', null, g.score)),
        g.fact && h('span', { className: 'cmp-latest-m' },
          h('span', null, h(Icon, { name: g.fact.icon ?? 'flag' }), g.fact.label,
            g.fact.pct != null && h('span', { className: 'cmp-pct' }, ` · ${g.fact.pct}%`))))));
}

function Tile({ g, shape }) {
  return h('button', { type: 'button', className: 'cmp-item', onClick: g.onOpen, title: g.title ?? g.name, 'aria-label': g.title ?? g.name },
    h('span', { className: `cmp-tile ${shape} ${g.tier}${g.pixel ? ' pixel' : ''}` },
      g.ext ? h(Pic, { className: 'cmp-pic', src: g.tile, fallback: g.tileFallback, ext: true }) : h(Img, { src: g.tile, fallback: g.tileFallback }),
      h('span', { className: 'cmp-mk' }, h(Icon, g.tier === 'gold' ? { name: 'star', size: 11 } : { name: 'medal', size: 12 }))));
}

// List row: the Latest card's picture (Xbox: square box art, not the poster), name, console or fact, tier, date
function Row({ g, shape, labels }) {
  const cs = g.coverShape ?? shape;
  const second = g.sub ?? (g.fact ? `${g.fact.label}${g.fact.pct != null ? ` · ${g.fact.pct}%` : ''}` : null);
  return h('button', { type: 'button', className: `cmp-row ${g.tier}`, onClick: g.onOpen },
    h(Pic, { className: `cmp-rpic ${cs} ${g.tier}${g.pixel ? ' pixel' : ''}`, src: g.cover, fallback: g.coverFallback, ext: g.coverExt }),
    h('span', { className: 'cmp-row-b' },
      h('span', { className: 'cmp-row-n' }, g.name, g.tags),
      second && h('span', { className: 'cmp-row-s' }, second)),
    h('span', { className: 'cmp-row-r' }, h(Tag, { tier: g.tier, labels }), h('span', null, fmtDate(g.at))));
}

// items: [{ key, tier: 'gold' | 'silver', name, tags?, title?, at, sub?, minutes?, score?, fact?: { label, pct?, icon? },
//           cover, coverFallback?, coverShape? (the Latest picture's shape when it isn't the shelf's), coverExt?, ext?, art?, artFallback?, tile, tileFallback?, pixel?, onOpen }]
// shape: 'sq' (RA icons), 'wd' (Steam banners), 'pt' (Xbox posters); labels: { gold, silver }
export function CompletionsPanel({ title, labels, items, shape, loading, empty = 'Nothing completed yet' }) {
  const [open, setOpen] = useState(false);
  const [view, setViewState] = useState(readView);
  const setView = (v) => { setViewState(v); setOpen(false); try { localStorage.setItem(VIEW_KEY, v); } catch { /* storage unavailable */ } };
  const boxRef = useRef(null);
  const [boxH, setBoxH] = useState(null);
  const [atEnd, setAtEnd] = useState(false);
  const [atTop, setAtTop] = useState(true);

  const { latest, rest, gold, silver } = useMemo(() => {
    const byDate = [...items].sort((a, b) => toMs(b.at) - toMs(a.at));
    const rest = byDate.slice(1).sort((a, b) => (a.tier === b.tier ? 0 : a.tier === 'gold' ? -1 : 1) || toMs(b.at) - toMs(a.at));
    return { latest: byDate[0] ?? null, rest, gold: items.filter(x => x.tier === 'gold').length, silver: items.filter(x => x.tier !== 'gold').length };
  }, [items]);

  const list = view === 'list';
  const cols = list ? 1 : COLS[shape], folded = list ? LIST_ROWS : cols * 2, canOpen = rest.length > folded;
  const shown = open ? rest : rest.slice(0, folded);
  const openRows = list ? LIST_OPEN_ROWS : OPEN_ROWS[shape];

  // The open box shows OPEN_ROWS rows: its height ends just above the first tile of the next row
  useLayoutEffect(() => {
    if (!open) { setBoxH(null); return; }
    const box = boxRef.current, next = box?.children[cols * openRows];
    setBoxH(next ? next.offsetTop - box.offsetTop - 4 : null);
    setAtEnd(!next); setAtTop(true);
  }, [open, shown.length, cols, openRows]);
  // Fade the edge rows out at whichever edge has more to scroll to
  const onScroll = (e) => { const t = e.currentTarget; setAtTop(t.scrollTop <= 4); setAtEnd(t.scrollTop + t.clientHeight >= t.scrollHeight - 4); };
  // Folding again brings the section back into view if the open box had scrolled the page past it
  const toggle = () => {
    if (open) { const top = boxRef.current?.closest('.cmp')?.getBoundingClientRect().top; if (top < 0) boxRef.current.closest('.cmp').scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    setOpen(!open);
  };

  return h('section', { className: 'cmp' },
    h('h2', { className: 'cmp-h' },
      h('span', { className: 'cmp-h-bar' }), h('span', { className: 'cmp-h-t' }, title),
      !loading && items.length > 1 && h('span', { className: 'vtoggle', role: 'group', 'aria-label': 'View' },
        h('button', { type: 'button', className: list ? '' : 'on', 'aria-pressed': !list, title: 'Tiles', onClick: () => setView('tiles') }, h(Icon, { name: 'grid', size: 13 })),
        h('button', { type: 'button', className: list ? 'on' : '', 'aria-pressed': list, title: 'List', onClick: () => setView('list') }, h(Icon, { name: 'list', size: 14 })))),
    loading ? h('div', { className: 'cmp-sk' },
      h('div', { className: 'cmp-tiers' }, h('div', { className: 'shimmer cmp-sk-tier' }), h('div', { className: 'shimmer cmp-sk-tier' })),
      h('div', { className: 'shimmer cmp-sk-latest' }),
      h('div', { className: `cmp-grid ${shape}`, style: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } },
        ...Array.from({ length: cols }, (_, i) => h('div', { key: i, className: `shimmer cmp-tile ${shape}` }))))
    : h('div', { className: 'anim-in' },
      h('div', { className: 'cmp-tiers' },
        [['gold', gold, 'star'], ['silver', silver, 'medal']].map(([t, n, icon]) =>
          h('div', { key: t, className: `cmp-tier ${t}${n ? '' : ' zero'}` },
            h('span', { className: 'cmp-tier-ic' }, h(Icon, { name: icon, size: t === 'gold' ? 15 : 16 })),
            h('span', null, h('b', null, n), h('small', null, labels[t]))))),
      !items.length ? h('div', { className: 'cmp-empty' }, empty) : h(Latest, { g: latest, labels, shape }),
      rest.length > 0 && h('div', {
        ref: boxRef, key: `${view}-${open ? 'open' : 'folded'}`, onScroll: open ? onScroll : undefined,
        className: `cmp-grid ${list ? 'list' : shape} anim-fade${open ? ' open' : ''}${open && !atTop ? ' fade-t' : ''}${open && !atEnd ? ' fade-b' : ''}`,
        style: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxHeight: open && boxH ? boxH : undefined },
      }, shown.map(g => list ? h(Row, { key: g.key, g, shape, labels }) : h(Tile, { key: g.key, g, shape }))),
      canOpen && h('button', { type: 'button', className: 'cmp-more', onClick: toggle, 'aria-expanded': open },
        open ? 'Show less' : `Show all ${items.length}`, h(Icon, { name: 'chev', className: open ? 'rot' : '' }))));
}
