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
// Up to MAX_SEG segments, one per achievement; a longer chain groups them (52 → 18 segments of 3),
// the segment in progress lit by the share of its group already done
const MAX_SEG = 20;
const Steps = ({ steps }) => {
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
  return h('div', { className: 'shd-steps anim-fade' },
    steps.icon, h('span', { className: 'shd-steps-l' }, 'Progression'), meter,
    h('b', null, done, h('span', null, '/', n)));
};

const Fill = ({ bar }) => bar.pct > 0 && h('i', { style: { width: `max(${Math.min(100, bar.pct)}%, 8px)`, '--c': bar.color } });

export function SheetHead({ dragRef, back, art, cover, title, sub, meta = [], tags = [], stats = [], bar, steps }) {
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
    (bar || stats.length > 0) && h('div', { className: `shd-card${bar ? ' wash' : ''}`, style: bar ? { '--p': `${Math.min(100, bar.pct)}%`, '--c': bar.color } : null },
      h('div', { className: 'shd-hrow' },
        bar && h('div', { className: 'shd-big' },
          h('b', { style: { color: bar.color } }, Math.floor(bar.pct), h('small', null, '%')), h('span', null, 'Complete')),
        stats.length > 0 && h('div', { className: `shd-cells n${stats.length}` },
          stats.map((st, i) => h('div', { key: i, className: 'shd-stat' },
            st.value == null
              ? h('div', { className: 'shd-v' }, h('span', { className: 'shimmer shd-sk' }))
              : h('div', { key: 'v', className: 'shd-v anim-fade' }, h('b', { style: { color: st.color } }, st.value), st.total != null && h('em', null, '/', st.total)),
            h('div', { className: 'shd-l' }, st.label))))),
      hasSteps && h(Steps, { steps }),
      bar && h('span', { className: 'shd-track' }, h(Fill, { bar }))));
}
