// Sub-series of a series (shared Series page and the RA Series tab; ES module, no JSX; styles .sub* in ui.css).
// A series can split its games into sub-series (`groups` in the series file, set in the admin). Outside, in the
// list: a bar under the series card (count + the sub-series icons stacked), folded by default, that opens one
// row per sub-series. Inside, in the series sheet: a chip row (All + each sub-series) under the header, and on
// All a strip (same look as the bar) that opens the rows. Picking a sub-series scopes the whole sheet to it.
// Each page builds its own sub-series cards (the same builder as its series, on the sub-series' games) and hands
// them in as { key, name, total, icon, px?, art?, artIcon?, started, done, beaten, doneLabel?, pct }, games in none as a last
// "Other", which shows and counts like the others.
import { createElement as h, useState, useRef, useLayoutEffect } from 'react';
import { statusPills } from './sheet.js';

const ICON = {
  layers: [['polygon', { points: '12 2 2 7 12 12 22 7 12 2' }], ['polyline', { points: '2 17 12 22 22 17' }], ['polyline', { points: '2 12 12 17 22 12' }]],
  chev:   [['path', { d: 'm9 18 6-6-6-6' }]],
};
const Icon = ({ name, size = 12, ...rest }) => h('svg', {
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, ...rest,
}, ...ICON[name].map(([tag, attrs], i) => h(tag, { key: i, ...attrs })));

const pctLabel = p => p > 0 && p < 1 ? '<1%' : `${Math.floor(p)}%`;
// Same edge ladder as the series cards: gold all done, blue started, grey untouched
const edgeOf = s => s.tracked > 0 && s.done === s.tracked ? '#e5b143' : s.started || s.beaten || s.done ? '#66c0f4' : '#323f4c';

// The sub-series' icons, overlapping, in the bar and the strip
const Stack = ({ subs, small }) => h('span', { className: `sub-stack${small ? ' sm' : ''}` },
  subs.map(s => s.icon
    ? h('img', { key: s.key, src: s.icon, alt: '', title: s.name, loading: 'lazy', className: s.px ? 'px' : '' })
    : h('span', { key: s.key })));

// One sub-series: icon, name, games and progress, % and bar; its cover game's art faded in from the right like the
// series cards (s.art; s.artIcon = only an icon, shown as the library mosaic, .art-icon)
export const SubRow = ({ s, onClick }) => h('button', { className: 'subrow', onClick, style: { borderLeftColor: edgeOf(s) } },
  s.art && h('span', { className: 'subrow-art', 'aria-hidden': true },
    h('img', { src: s.art, alt: '', loading: 'lazy', className: s.artIcon ? 'art-icon' : '', onError: e => { e.target.style.display = 'none'; } })),
  s.icon ? h('img', { src: s.icon, alt: '', loading: 'lazy', className: s.px ? 'px' : '' }) : h('span', { className: 'subrow-i' }),
  h('span', { className: 'subrow-b' },
    h('span', { className: 'subrow-t' }, s.name),
    h('span', { className: 'subrow-s' },
      h('span', null, `${s.total} game${s.total === 1 ? '' : 's'}`),
      ...statusPills({ done: s.done, doneLabel: s.doneLabel, beaten: s.beaten, started: s.started }))),
  h('span', { className: 'subrow-e' },
    h('b', { style: { color: s.pct > 0 ? '#e5b143' : '#546270' } }, pctLabel(s.pct)),
    h('span', { className: 'gbar' }, h('i', { style: { width: `${s.pct}%`, background: '#e5b143' } }))));

// List: the series card (children), then the folded bar; opened, a row per sub-series. onOpen(index)
export function SubFold({ subs, onOpen, children }) {
  const [open, setOpen] = useState(false);
  return h('div', { className: `subfold${open ? ' open' : ''}` },
    children,
    h('button', { className: 'subbar', onClick: () => setOpen(o => !o), 'aria-expanded': open },
      h(Icon, { name: 'layers', className: 'text-[#66c0f4]' }),
      h('b', null, `${subs.length} sub-series`),
      !open && h(Stack, { subs, small: true }),
      h(Icon, { name: 'chev', size: 14, className: 'sub-chev' })),
    open && h('div', { className: 'subtree anim-fade' }, subs.map((s, i) => h(SubRow, { key: s.key, s, onClick: () => onOpen(i) }))));
}

// Sheet, All: the strip (folded), or the section heading and the rows (open). onPick(index)
export function SubStrip({ subs, onPick }) {
  const [open, setOpen] = useState(false);
  if (!open) return h('button', { className: 'substrip anim-fade', onClick: () => setOpen(true), 'aria-expanded': false },
    h('span', { className: 'lb' }, 'Sub-series'), h('span', { className: 'n' }, subs.length),
    h(Stack, { subs }),
    h(Icon, { name: 'chev', size: 14, className: 'sub-chev' }));
  return [
    h('button', { key: 'h', className: 'ssheet-sec sub-tog', style: { '--c': '#66c0f4' }, onClick: () => setOpen(false), 'aria-expanded': true },
      'Sub-series', h('span', { className: 'n' }, subs.length), h(Icon, { name: 'chev', size: 14, className: 'sub-chev' })),
    h('div', { key: 'r', className: 'flex flex-col gap-1.5 anim-fade' }, subs.map((s, i) => h(SubRow, { key: s.key, s, onClick: () => onPick(i) }))),
  ];
}

// Sheet: All + one chip per sub-series, under the header. active = index or null (All). The picked chip is
// scrolled into view (a sub-series opened from the list can sit past the screen edge)
export function SubChips({ subs, total, allPct, active, onPick }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const row = ref.current, on = row?.querySelector('.on');
    // Only as far as needed to show it, so All stays in view for the first few
    if (row && on) row.scrollLeft = Math.max(0, on.offsetLeft - row.offsetLeft + on.offsetWidth - row.clientWidth + 32);
  }, [active]);
  // Each chip's bottom edge fills with its achievement % (gold, full when done)
  const chip = (key, label, n, pct, on, onClick) => h('button', { key, onClick, 'aria-pressed': on, className: `fchip${on ? ' on' : ''}`, title: `${label} · ${pctLabel(pct)}` },
    label, h('span', { className: 'n' }, n),
    h('i', { className: `sub-chip-bar${pct > 0 ? ' some' : ''}`, style: { width: `${Math.min(100, pct)}%` } }));
  return h('div', { ref, className: 'frow sub-chips', role: 'group', 'aria-label': 'Sub-series' },
    chip('all', 'All', total, allPct ?? 0, active == null, () => onPick(null)),
    subs.map((s, i) => chip(s.key, s.name, s.total, s.pct, active === i, () => onPick(i))));
}

// Sub-series names match a list search too ("Zero" finds Mega Man)
export const subsMatch = (subs, q, fold) => !!subs?.some(s => fold(s.name).includes(q));
