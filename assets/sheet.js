// Achievement modal behaviour shared by the three profile pages (ES module; layout in ui.css).
// Below the md breakpoint the modal is a bottom sheet: it slides up, and slides back down
// when closed (✕, backdrop, Escape, or dragging the header down). From md up it stays a
// centred dialog that closes at once. Closing always goes through the returned function.
import { createElement as h, useEffect, useRef, useCallback, useState } from 'react';

const PHONE = '(max-width: 767px)';
const isPhone = () => window.matchMedia(PHONE).matches;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CLOSE_MS     = 220;
const CLOSE_DRAG   = 120;  // px dragged down that closes the sheet
const CLOSE_FLING  = 0.5;  // px/ms downward speed that closes it from a shorter drag

// panelRef: the sheet panel; dragRef: the area that drags it (the art header);
// rootRef: the fixed root, faded out with the panel. Returns close().
export function useSheet({ panelRef, dragRef, rootRef, onClose }) {
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const el = panelRef.current;
    if (!el || !isPhone() || reducedMotion()) { onCloseRef.current(); return; }
    el.style.animation = 'none';
    el.style.transition = `transform ${CLOSE_MS}ms cubic-bezier(0.4, 0, 1, 1)`;
    el.style.transform = 'translateY(100%)';
    rootRef?.current?.classList.add('sheet-leaving');
    setTimeout(() => onCloseRef.current(), CLOSE_MS);
  }, []);

  // Escape closes; the page behind doesn't scroll. Only <html> is locked: with <body> hidden too,
  // body becomes its own scroll container and the pinned tab bar (position: sticky) jumps back to
  // its place in the page, out of view behind the sheet
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      html.style.overflow = prev;
    };
  }, [close]);

  // .settled once the panel's opening animation is over: only then may the header art fade in.
  // The art fading (blurred, opacity) while the panel slides blinked on Android
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const end = e => { if (e.target === el) el.classList.add('settled'); };
    el.addEventListener('animationend', end);
    return () => el.removeEventListener('animationend', end);
  }, []);

  // Drag the header down to close (phone only). Links and buttons in the header keep
  // working: a drag never starts on them.
  useEffect(() => {
    const area = dragRef.current, el = panelRef.current;
    if (!area || !el) return;
    let startY = null, lastY = 0, lastT = 0, speed = 0, dy = 0, pointer = null;
    const down = e => {
      if (!isPhone() || closing.current || e.target.closest('a, button')) return;
      startY = lastY = e.clientY; lastT = e.timeStamp; speed = dy = 0; pointer = e.pointerId;
      try { area.setPointerCapture(pointer); } catch { /* pointer already gone */ }
      el.style.animation = 'none';
      el.style.transition = 'none';
      el.classList.add('settled');
    };
    const move = e => {
      if (startY === null || e.pointerId !== pointer) return;
      dy = Math.max(0, e.clientY - startY);
      const dt = e.timeStamp - lastT;
      if (dt > 0) speed = (e.clientY - lastY) / dt;
      lastY = e.clientY; lastT = e.timeStamp;
      el.style.transform = dy ? `translateY(${dy}px)` : '';
    };
    const up = e => {
      if (startY === null || e.pointerId !== pointer) return;
      startY = null;
      if (dy > CLOSE_DRAG || (dy > 20 && speed > CLOSE_FLING)) { close(); return; }
      el.style.transition = 'transform 200ms cubic-bezier(0.2, 0.8, 0.3, 1)';
      el.style.transform = '';
    };
    area.addEventListener('pointerdown', down);
    area.addEventListener('pointermove', move);
    area.addEventListener('pointerup', up);
    area.addEventListener('pointercancel', up);
    return () => {
      area.removeEventListener('pointerdown', down);
      area.removeEventListener('pointermove', move);
      area.removeEventListener('pointerup', up);
      area.removeEventListener('pointercancel', up);
    };
  }, []);

  return close;
}

// Background image of a sheet or header: fades in once loaded, tries each URL in turn
// and hides itself if none loads.
export function useArtSrc(urls) {
  const list = (urls || []).filter(Boolean);
  const key = list.join('|');
  const [i, setI] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setI(0); setLoaded(false); }, [key]);
  return {
    src: list[i] ?? null,
    loaded,
    onLoad: () => setLoaded(true),
    onError: () => setI(n => n + 1),
    // A cached image can finish loading before React sees its load event: check on mount
    ref: el => { if (el && el.complete && el.naturalWidth) setLoaded(true); },
  };
}

// Animates a sheet panel's height when its content grows or shrinks (loading done,
// a filter change). FLIP: the ResizeObserver callback runs after layout and before
// paint, so the old height is restored and transitioned to the new one with no jump.
export const useAnimatedHeight = (ref, duration = 220) => {
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.ResizeObserver || reducedMotion()) return;
    let prev = el.offsetHeight, run = 0;
    const ro = new ResizeObserver(() => {
      if (el.style.height) return;   // our own animation is resizing it
      const next = el.offsetHeight;
      if (Math.abs(next - prev) < 2) { prev = next; return; }
      const from = prev, id = ++run;
      prev = next;
      el.style.overflow = 'hidden';
      el.style.height = `${from}px`;
      void el.offsetHeight;
      el.style.transition = `height ${duration}ms cubic-bezier(0.2, 0.7, 0.3, 1)`;
      el.style.height = `${next}px`;
      setTimeout(() => {
        if (id !== run) return;
        el.style.height = el.style.transition = el.style.overflow = '';
        prev = el.offsetHeight;
      }, duration + 30);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
};


// Header of a game's achievement sheet, the same on every page (styles: .shd-* in ui.css): cover,
// title, meta line and status tags, then one card with the % big on the left, the numbers beside it
// and the progress bar along its bottom edge. Pages pass ready-made nodes for what differs (art,
// cover, tags) and plain data for the rest:
//   stats  [{ value, total?, label, color }]  up to three numbers, Achievements first; value null =
//                                             not known yet (the game's file is loading): a shimmer
//   bar    { pct, color }                     overall progress
//   steps  { done, total, icon, pending? }    RA progression: a gold segmented meter in the card;
//                                             pending = a shimmer row until the file is in
//   games  { items: [{ state, pct }], icon }  a series: one segment per game with achievements, in its
//                                             status colour (done gold, beaten silver, started blue lit
//                                             to its %, none dim), done first; over MAX_SEG games, one
//                                             segment per status sized by its count; the count is games done
// Up to MAX_SEG segments, one per achievement; a longer chain groups them (52 → 18 segments of 3),
// the segment in progress lit by the share of its group already done
const MAX_SEG = 20;
const Steps = ({ steps, fade }) => {
  const n = steps.total, done = steps.done;
  if (steps.pending) {
    return h('div', { className: 'shd-steps' },
      steps.icon, h('span', { className: 'shd-steps-l' }, 'Progression'),
      h('span', { className: 'shd-meter shimmer' }), h('b', null, h('span', { className: 'shimmer shd-sk n' })));
  }
  let meter;
  if (n <= MAX_SEG) {
    meter = h('span', { className: 'shd-meter' }, Array.from({ length: n }, (_, i) => h('i', { key: i, className: i < done ? 'on' : '' })));
  } else {
    const per = Math.ceil(n / MAX_SEG), segs = Math.ceil(n / per);
    meter = h('span', { className: 'shd-meter' }, Array.from({ length: segs }, (_, i) => {
      const size = Math.min(per, n - i * per), part = Math.max(0, Math.min(size, done - i * per)) / size;
      return h('i', { key: i, className: part >= 1 ? 'on' : '' }, part > 0 && part < 1 && h('u', { style: { width: `${part * 100}%` } }));
    }));
  }
  return h('div', { className: `shd-steps ${fade ? 'anim-fade' : ''}` },
    steps.icon, h('span', { className: 'shd-steps-l' }, 'Progression'), meter,
    h('b', null, done, h('span', null, '/', n)));
};

const STATE_ORDER = { done: 0, beaten: 1, started: 2, none: 3 };
const Games = ({ games }) => {
  const items = games.items.filter(g => g.state !== 'noach').sort((a, b) => (STATE_ORDER[a.state] - STATE_ORDER[b.state]) || (b.pct - a.pct));
  // Over MAX_SEG games the segments would be hairlines: one segment per status instead, as wide as its
  // number of games (started lit to their average %)
  const segs = items.length <= MAX_SEG ? items : Object.keys(STATE_ORDER).map(state => {
    const of = items.filter(g => g.state === state);
    return of.length && { state, n: of.length, pct: of.reduce((t, g) => t + g.pct, 0) / of.length };
  }).filter(Boolean);
  return h('div', { className: 'shd-steps shd-games' },
    games.icon, h('span', { className: 'shd-steps-l' }, 'Games'),
    h('span', { className: 'shd-meter' }, segs.map((g, i) => h('i', { key: i, className: g.state, style: g.n > 1 ? { flex: g.n } : undefined },
      g.state !== 'done' && g.pct > 0 && h('u', { style: { width: `${Math.min(100, g.pct)}%` } })))),
    h('b', null, items.filter(g => g.state === 'done').length, h('span', null, '/', items.length)));
};

// Status counts of a series as the sheet's tags (sentence counts, the usual colours): ★ done gold,
// beaten silver, in progress blue
const TAG = 'shrink-0 text-[9px] px-1.5 py-[1px] rounded-sm font-bold uppercase tracking-wider flex items-center gap-1';
export const seriesTags = ({ done, doneLabel, beaten, started }) => [
  done > 0 && h('span', { key: 'd', className: `${TAG} text-[#101214] bg-[#e5b143]` }, `★ ${done} ${doneLabel}`),
  beaten > 0 && h('span', { key: 'b', className: TAG, style: { background: '#2a3440', color: '#c6d4df', border: '1px solid rgba(184,196,206,0.3)' } }, `${beaten} Beaten`),
  started > 0 && h('span', { key: 's', className: `${TAG} text-[#66c0f4] border border-[#66c0f4]/30 bg-[#101214]/60` }, `${started} In progress`),
];

// The same counts as compact pills for list rows (series cards, sub-series rows): icon + number in the
// status colour, the words in the tooltip / label. ★ done (the platform's word), medal beaten, ▶ in progress
const PILL_ICON = {
  done:    [['path', { d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z', fill: 'currentColor', stroke: 'none' }]],
  beaten:  [['path', { d: 'M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15' }], ['path', { d: 'M11 12 5.12 2.2' }], ['path', { d: 'm13 12 5.88-9.8' }], ['path', { d: 'M8 7h8' }], ['circle', { cx: 12, cy: 17, r: 5 }]],
  started: [['path', { d: 'M6 4l14 8-14 8z', fill: 'currentColor', stroke: 'none' }]],
};
const pill = (kind, n, label) => h('span', { key: kind, className: `spill ${kind}`, title: label, 'aria-label': label },
  h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    ...PILL_ICON[kind].map(([tag, attrs], i) => h(tag, { key: i, ...attrs }))), n);
export const statusPills = ({ done = 0, doneLabel = 'completed', beaten = 0, started = 0 }) => [
  done > 0 && pill('done', done, `${done} ${doneLabel.toLowerCase()}`),
  beaten > 0 && pill('beaten', beaten, `${beaten} beaten`),
  started > 0 && pill('started', started, `${started} in progress`),
].filter(Boolean);

// Under 1% (shown as 0%) nothing is lit: no fill nub, no tint edge
const lit = bar => !!bar && Math.floor(bar.pct) > 0;
const Fill = ({ bar }) => lit(bar) && h('i', { style: { width: `max(${Math.min(100, bar.pct)}%, 8px)`, '--c': bar.color } });

export function SheetHead({ dragRef, back, art, cover, title, sub, meta = [], tags = [], stats = [], bar, steps, games }) {
  // Values fade in only when they replace a shimmer; on a normal open they're simply there
  const hadPending = useRef(false);
  if (stats.some(st => st.value == null) || steps?.pending) hadPending.current = true;
  const fade = hadPending.current;
  const metaLine = meta.filter(Boolean);
  const tagLine = tags.filter(Boolean);
  const hasSteps = steps && (steps.total > 0 || steps.pending);
  return h('div', { ref: dragRef, className: `sheet-head shd ${back ? 'has-back' : ''}` },
    art,
    h('span', { className: 'sheet-grab' }),
    h('div', { className: 'shd-top' },
      cover,
      h('div', { className: 'shd-id' },
        h('div', { className: 'shd-title sheet-title' }, title),
        sub && h('div', { className: 'shd-sub' }, sub),
        metaLine.length > 0 && h('div', { className: 'shd-meta' }, metaLine.map((m, i) => h('span', { key: i, className: 'shd-m' }, m))),
        tagLine.length > 0 && h('div', { className: 'shd-tags' }, tagLine))),
    (bar || stats.length > 0) && h('div', { className: `shd-card${lit(bar) ? ' wash' : ''}`, style: bar ? { '--p': `${Math.min(100, bar.pct)}%`, '--c': bar.color } : null },
      h('div', { className: 'shd-hrow' },
        bar && h('div', { className: 'shd-big' },
          h('b', { style: { color: bar.color } }, Math.floor(bar.pct), h('small', null, '%')), h('span', null, 'Complete')),
        stats.length > 0 && h('div', { className: `shd-cells n${stats.length}` },
          stats.map((st, i) => h('div', { key: i, className: 'shd-stat' },
            st.value == null
              ? h('div', { className: 'shd-v' }, h('span', { className: 'shimmer shd-sk' }))
              : h('div', { key: 'v', className: `shd-v ${fade ? 'anim-fade' : ''}` }, h('b', { style: { color: st.color } }, st.value), st.total != null && h('em', null, '/', st.total)),
            h('div', { className: 'shd-l' }, st.label))))),
      hasSteps && h(Steps, { steps, fade }),
      games?.items.length > 0 && h(Games, { games }),
      bar && h('span', { className: 'shd-track' }, h(Fill, { bar }))));
}
