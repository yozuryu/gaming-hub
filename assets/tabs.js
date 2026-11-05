// Profile page tabs, shared by the three profile pages (ES module; styles in ui.css).
// TabBar: one sticky row (icon + label), scrolls sideways when the tabs don't fit, keeps the
// active tab in view, and slides its underline to the active tab.
// useSwipeTabs: on phones, the tab content follows a sideways drag like a carousel, with the
// neighbouring tab sliding in as a skeleton; it renders for real once the swipe has landed.
// Drags that start on something that scrolls sideways (chip rows, heatmaps, cover strips) or
// on a form control, and mostly vertical drags, are left alone.
import { createElement as h, useEffect, useLayoutEffect, useRef, useState } from 'react';

export function TabBar({ tabs, active, onChange, barRef }) {
  const rowRef = useRef(null);
  const btnRefs = useRef({});
  const [ind, setInd] = useState(null);   // underline { left, width, color }

  useLayoutEffect(() => {
    const btn = btnRefs.current[active], row = rowRef.current;
    if (!btn || !row) return;
    const place = () => setInd({ left: btn.offsetLeft, width: btn.offsetWidth, color: tabs.find(t => t.id === active)?.color });
    place();
    // Keep the active tab in view when the row scrolls sideways
    const l = btn.offsetLeft, r = l + btn.offsetWidth;
    if (l < row.scrollLeft + 8 || r > row.scrollLeft + row.clientWidth - 8) {
      row.scrollTo({ left: Math.max(0, l - (row.clientWidth - btn.offsetWidth) / 2), behavior: 'smooth' });
    }
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [active, tabs.map(t => t.id).join()]);

  return h('nav', { ref: barRef, className: 'ptabs', 'aria-label': 'Sections' },
    h('div', { ref: rowRef, className: 'ptabs-row', role: 'tablist' },
      tabs.map(t => h('button', {
        key: t.id, ref: el => { btnRefs.current[t.id] = el; },
        role: 'tab', 'aria-selected': active === t.id,
        className: `ptab ${active === t.id ? 'on' : ''}`,
        style: active === t.id ? { color: '#fff' } : undefined,
        onClick: () => onChange(t.id),
      }, h('span', { className: 'ptab-icon', style: active === t.id ? { color: t.color } : undefined }, t.icon), h('span', null, t.label))),
      ind && h('span', { className: 'ptabs-ind', style: { transform: `translateX(${ind.left}px)`, width: ind.width, background: ind.color || '#66c0f4' } })
    )
  );
}

const PHONE = '(max-width: 767px)';
const LOCK_AT = 8;           // px of movement before the gesture picks an axis
const LOCK_RATIO = 1.2;      // sideways must beat vertical by this much to count as a swipe
const COMMIT_SHARE = 0.25;   // share of the width past which a release moves to the next tab
const COMMIT_SPEED = 0.45;   // px/ms: a quick flick moves on from a shorter drag
const SLIDE_MS = 220;

// Something under the finger that scrolls sideways by itself, or takes input
const blocksSwipe = el => {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.matches?.('input, textarea, select, [data-no-swipe]')) return true;
    if (n.scrollWidth > n.clientWidth + 2) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
  }
  return false;
};

// Placeholder for the neighbouring tab while dragging: shimmer blocks in the tab's own shape
// (same layout classes as the real content), so a drag never waits for a heavy tab to render;
// the real tab renders once the swipe has landed. Pages describe each tab as a list of parts.
const sh = (cls, style = '') => `<div class="shimmer ${cls}" style="${style}"></div>`;
const rows = (n, row) => Array.from({ length: n }, (_, i) => row(i)).join('');
const PEEK_PARTS = {
  h2:      () => `<div class="pk-h2">${sh('pk-line', 'width:42%;height:13px')}</div>`,
  fbar:    () => `<div class="fbar">${sh('pk-search')}${sh('pk-toggle')}</div>`,
  chips:   () => `<div class="frow">${[58, 92, 86, 84].map(w => sh('pk-chip', `width:${w}px`)).join('')}</div>`,
  meta:    () => sh('pk-line', 'width:55%;height:10px'),
  row:     () => `<div class="grow">${sh('grow-icon')}<div class="grow-main">${sh('pk-line', 'width:70%')}${sh('pk-line', 'width:45%;height:9px')}</div></div>`,
  unlock:  () => `<div class="grow">${sh('grow-icon')}<div class="grow-main">${sh('pk-line', 'width:55%')}${sh('pk-line', 'width:80%;height:9px')}${sh('pk-line', 'width:40%;height:9px')}</div></div>`,
  list:    () => `<div class="glist">${rows(6, i => `<div class="grow">${sh('grow-icon')}<div class="grow-main">${sh('pk-line', `width:${60 + (i % 3) * 10}%`)}${sh('pk-line', 'width:40%;height:9px')}</div><div class="grow-prog">${sh('pk-line', 'width:34px;height:10px')}${sh('pk-line', 'width:100%;height:4px')}</div></div>`)}</div>`,
  tiles:   () => `<div class="gtiles">${rows(4, () => `<div class="gtile"><div class="gtile-art shimmer"></div><div class="gtile-body">${sh('pk-line', 'width:80%')}${sh('pk-line', 'width:50%;height:9px')}${sh('pk-line', 'width:100%;height:4px')}</div></div>`)}</div>`,
  stats:   () => `<div class="stiles">${rows(6, () => `<div class="stile">${sh('pk-line', 'width:45%;height:15px')}${sh('pk-line', 'width:70%;height:9px')}</div>`)}</div>`,
  wlist:   () => `<div class="wlist">${rows(6, i => `<div class="wrow">${sh('wrow-icon')}<div class="wrow-main">${sh('pk-line', `width:${55 + (i % 3) * 12}%`)}${sh('pk-line', 'width:35%;height:9px')}</div></div>`)}</div>`,
  cards:   () => `<div class="slist">${rows(4, () => `<div class="scard"><div class="scard-top">${sh('scard-cover')}<div class="scard-main">${sh('pk-line', 'width:55%')}${sh('pk-line', 'width:40%;height:9px')}</div></div>${sh('pk-line', 'width:100%;height:5px')}<div class="sicons">${rows(5, () => sh('pk-icon'))}</div></div>`)}</div>`,
  heatmap: () => sh('pk-heat'),
  timeline:() => rows(5, () => `<div class="pk-tl">${sh('pk-dot')}<div class="grow" style="flex:1">${sh('grow-icon')}<div class="grow-main">${sh('pk-line', 'width:60%')}${sh('pk-line', 'width:40%;height:9px')}</div></div></div>`),
};
const peekHtml = parts => `<div class="tab-peek-in">${(parts?.length ? parts : ['row', 'list']).map(p => (PEEK_PARTS[p] ?? PEEK_PARTS.row)()).join('')}</div>`;

// Carousel swipe between tabs on phones. ref: the stable wrapper around the keyed tab content
// (it moves with the finger); ready: true once it is rendered (pages show a skeleton first);
// peeks: { tabId: [part, ...] } describing each tab's skeleton (PEEK_PARTS).
// Returns [dir, setDir]: dir is 'swipe' right after a swiped change (the page shows the new tab
// without its entrance animation, it has just slid in), null otherwise.
export function useSwipeTabs(ref, ids, active, onChange, ready = true, peeks = {}) {
  const [dir, setDir] = useState(null);
  const state = useRef({ ids, active, onChange, peeks });
  state.current = { ids, active, onChange, peeks };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.position = 'relative';
    el.style.touchAction = 'pan-y';
    // The dragged content and the skeleton beside it must not make the page scroll sideways
    // (clip, unlike hidden, creates no scroll container, so the sticky tab bar keeps working)
    if (el.parentElement) el.parentElement.style.overflowX = 'clip';
    let g = null;   // the current gesture
    let peek = null;

    const removePeek = () => { peek?.remove(); peek = null; };
    // The neighbouring tab, in its own box one page-gap away (so it reads as a separate tab sliding
    // in), shaped like its content, placed where the user is looking and no taller than the screen
    const GAP = 32;
    const placePeek = (side, id) => {
      if (peek && peek.dataset.id === id) return;
      removePeek();
      peek = document.createElement('div');
      peek.className = 'tab-peek';
      peek.dataset.id = id;
      peek.innerHTML = peekHtml(state.current.peeks[id]);
      peek.style.left = side === 'next' ? `calc(100% + ${GAP}px)` : `calc(-100% - ${GAP}px)`;
      const barBottom = document.querySelector('.ptabs')?.getBoundingClientRect().bottom ?? 0;
      const top = Math.max(0, barBottom - el.getBoundingClientRect().top);
      peek.style.top = `${top}px`;
      peek.style.maxHeight = `${window.innerHeight - Math.max(barBottom, el.getBoundingClientRect().top) - 8}px`;
      el.appendChild(peek);
    };
    // Reduced motion: the content still follows the finger (that motion is the user's own), but a
    // release switches or snaps back at once
    const slideMs = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : SLIDE_MS;
    const setX = (x, animate) => {
      el.style.transition = animate && slideMs() ? `transform ${slideMs()}ms cubic-bezier(0.2, 0.8, 0.3, 1)` : 'none';
      el.style.transform = x ? `translateX(${x}px)` : '';
    };

    const start = e => {
      if (!window.matchMedia(PHONE).matches || e.touches.length !== 1 || blocksSwipe(e.target)) { g = null; return; }
      const t = e.touches[0];
      g = { x: t.clientX, y: t.clientY, axis: null, dx: 0, lastX: t.clientX, lastT: e.timeStamp, speed: 0 };
    };
    const move = e => {
      if (!g) return;
      const t = e.touches[0];
      const dx = t.clientX - g.x, dy = t.clientY - g.y;
      if (!g.axis) {
        if (Math.abs(dx) < LOCK_AT && Math.abs(dy) < LOCK_AT) return;
        g.axis = Math.abs(dx) > Math.abs(dy) * LOCK_RATIO ? 'x' : 'y';
        if (g.axis === 'y') { g = null; return; }   // a vertical scroll: leave the whole gesture alone
      }
      e.preventDefault();
      const dt = e.timeStamp - g.lastT;
      if (dt > 0) g.speed = (t.clientX - g.lastX) / dt;
      g.lastX = t.clientX; g.lastT = e.timeStamp; g.dx = dx;
      const { ids, active } = state.current;
      const i = ids.indexOf(active);
      const target = dx < 0 ? ids[i + 1] : ids[i - 1];
      if (target) placePeek(dx < 0 ? 'next' : 'prev', target); else removePeek();
      setX(target ? dx : dx * 0.25, false);   // past the first / last tab: a little rubber band
    };
    const end = () => {
      if (!g || g.axis !== 'x') { g = null; return; }
      const { ids, active, onChange } = state.current;
      const i = ids.indexOf(active), dx = g.dx, speed = g.speed;
      g = null;
      const target = dx < 0 ? ids[i + 1] : ids[i - 1];
      const w = el.offsetWidth;
      const commit = target && (Math.abs(dx) > w * COMMIT_SHARE || (Math.abs(dx) > 30 && Math.abs(speed) > COMMIT_SPEED && Math.sign(speed) === Math.sign(dx)));
      if (!commit) { setX(0, true); setTimeout(removePeek, slideMs()); return; }
      setX(dx < 0 ? -(w + GAP) : w + GAP, true);
      setTimeout(() => {
        setX(0, false);
        removePeek();
        setDir('swipe');
        onChange(target);
      }, slideMs());
    };

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end, { passive: true });
    el.addEventListener('touchcancel', end, { passive: true });
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
      removePeek();
    };
  }, [ready]);

  return [dir, setDir];
}

// After a tab change, bring the top of the tab content back into view if the page is scrolled
// past the tab bar, so the new tab starts at its top with the bar pinned above it.
export function scrollToTabs(barRef) {
  const bar = barRef.current;
  if (!bar) return;
  const marker = bar.previousElementSibling;   // .ptabs-anchor: where the bar sits when not stuck
  const top = (marker ?? bar).getBoundingClientRect().top + window.scrollY;
  const offset = parseFloat(getComputedStyle(bar).top) || 0;
  if (window.scrollY > top - offset) window.scrollTo({ top: top - offset, behavior: 'instant' });
}
