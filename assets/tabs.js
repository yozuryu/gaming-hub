// Profile page tabs, shared by the three profile pages (ES module; styles in ui.css).
// TabBar: one sticky row (icon + label), scrolls sideways when the tabs don't fit, keeps the
// active tab in view, and slides its underline to the active tab.
// useSwipeTabs: on phones, a clearly sideways swipe on the tab content moves to the next or
// previous tab. Swipes that start on something that scrolls sideways (chip rows, heatmaps,
// cover strips) or on a form control are left alone.
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
const SWIPE_MIN = 60;        // px sideways before a swipe counts
const SWIPE_RATIO = 1.6;     // sideways must beat vertical by this much

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

// ref: the tab content wrapper; ready: true once it is rendered (pages show a skeleton first).
// Returns the direction of the last swipe ('left' | 'right' | null) so the page can slide the
// new tab in from that side.
export function useSwipeTabs(ref, ids, active, onChange, ready = true) {
  const [dir, setDir] = useState(null);
  const state = useRef({ ids, active, onChange });
  state.current = { ids, active, onChange };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start = null;
    const down = e => {
      if (!window.matchMedia(PHONE).matches || e.touches.length !== 1 || blocksSwipe(e.target)) { start = null; return; }
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const up = e => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x, dy = t.clientY - start.y;
      start = null;
      if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return;
      const { ids, active, onChange } = state.current;
      const i = ids.indexOf(active);
      const next = dx < 0 ? ids[i + 1] : ids[i - 1];
      if (!next) return;
      setDir(dx < 0 ? 'left' : 'right');
      onChange(next);
    };
    el.addEventListener('touchstart', down, { passive: true });
    el.addEventListener('touchend', up, { passive: true });
    el.addEventListener('touchcancel', () => { start = null; }, { passive: true });
    return () => {
      el.removeEventListener('touchstart', down);
      el.removeEventListener('touchend', up);
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
