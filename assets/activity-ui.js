// Activity timeline pieces shared by the profile Activity tabs (ES module, no JSX: modules
// imported by the pages aren't run through Babel). Styles: the "Activity timelines" block in
// assets/ui.css, the same classes the Activity page uses.
//   computeStreak(heatmapData, minValue)  current / longest run and the last 14 days
//   useSummaryOpen()                      folded on phones, open from md, remembered per device
//   ActivitySummary                       folded row or full card (stats, 14 days + streak, heatmap)
//   DayHead                               sticky day heading
//   RunCard                               one run of unlocks in one game: art band + rows, long runs fold
//   UnlockRow                             one unlock
import { createElement as h, Fragment, useState } from 'react';
import { todayKey, addDays, keyToDate, fmtDayKey, TZ } from './time.js';

// Lucide paths (the pages load lucide-react, but a module can't use their JSX components here)
const ICON = {
  chevron: [['path', { d: 'm6 9 6 6 6-6' }]],
  flame: [['path', { d: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z' }]],
  trophy: [
    ['path', { d: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6' }], ['path', { d: 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18' }], ['path', { d: 'M4 22h16' }],
    ['path', { d: 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22' }], ['path', { d: 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22' }],
    ['path', { d: 'M18 2H6v7a6 6 0 0 0 12 0V2Z' }],
  ],
};
export const Icon = ({ name, size = 12, ...rest }) => h('svg', {
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, ...rest,
}, ...ICON[name].map(([tag, attrs], i) => h(tag, { key: i, ...attrs })));

// ── Streak ────────────────────────────────────────────────────────────────────

// Current / longest run of days reaching minValue; today never breaks a streak until it's over
export function computeStreak(heatmapData, minValue = 1) {
  const active = new Set(Object.entries(heatmapData).filter(([, d]) => (d.count ?? d) >= minValue).map(([k]) => k));
  const today = todayKey();
  let current = 0;
  for (let c = addDays(today, -1); active.has(c); c = addDays(c, -1)) current++;
  if (active.has(today)) current++;
  let longest = 0, longestStart = null, longestEnd = null, runStart = null, runLen = 0, prev = null;
  for (const day of [...active].sort()) {
    if (prev && day === addDays(prev, 1)) runLen++;
    else {
      if (runLen > longest) { longest = runLen; longestStart = runStart; longestEnd = prev; }
      runStart = day; runLen = 1;
    }
    prev = day;
  }
  if (runLen > longest) { longest = runLen; longestStart = runStart; longestEnd = prev; }
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const key = addDays(today, -i);
    last14.push({ key, label: keyToDate(key).toLocaleDateString('en-GB', { weekday: 'short' }), active: active.has(key), isToday: i === 0 });
  }
  return { current, longest, longestStart, longestEnd, last14 };
}

// ── Summary ───────────────────────────────────────────────────────────────────

const OPEN_KEY = 'gh:activitySummary';   // same choice as the Activity page
export function useSummaryOpen() {
  const [open, setOpen] = useState(() => {
    try { const v = localStorage.getItem(OPEN_KEY); if (v) return v === 'open'; } catch {}
    return window.matchMedia('(min-width: 768px)').matches;
  });
  const toggle = () => setOpen(o => {
    try { localStorage.setItem(OPEN_KEY, o ? 'closed' : 'open'); } catch {}
    return !o;
  });
  return [open, toggle];
}

// Last 14 days as bars against the busiest of them: the current streak gold, other active days blue
function RecentDays({ streak, heatmapData, cellLabel, describe, selectedDay, onSelectDay, slim }) {
  const days = streak.last14;
  const vals = days.map(d => heatmapData[d.key]?.count ?? 0);
  const max = Math.max(1, ...vals);
  const inStreak = new Set();
  let k = days.length - 1;
  if (!days[k].active) k--;
  while (k >= 0 && days[k].active) inStreak.add(days[k--].key);
  return h('div', { className: `rdays ${slim ? 'slim' : ''}` }, days.map((d, i) => {
    const v = vals[i];
    const cls = inStreak.has(d.key) ? 'streak' : d.active ? 'on' : v ? 'low' : '';
    return h('button', {
      key: d.key, title: describe(d.key), disabled: !v,
      onClick: () => onSelectDay(selectedDay === d.key ? null : d.key),
      className: `rday ${cls} ${selectedDay === d.key ? 'sel' : ''} ${d.isToday ? 'today' : ''}`,
    },
      !slim && h('span', { className: 'rday-v' }, v ? cellLabel(d.key) : ''),
      h('span', { className: 'rday-bar' }, h('i', { style: { height: v ? `${Math.max(10, v / max * 100)}%` : 0 } })),
      !slim && h('span', { className: 'rday-l' }, d.label.slice(0, 2)));
  }));
}

function StreakTiles({ streak }) {
  const on = streak.current > 0;
  const days = n => `${n} day${n !== 1 ? 's' : ''}`;
  return h('div', { className: 'sktiles' },
    h('div', { className: `sktile ${on ? 'on' : ''}` },
      h('span', { className: 'sktile-ic' }, h(Icon, { name: 'flame', size: 16, style: on ? { animation: 'flameFlicker 1.8s ease-in-out infinite' } : undefined })),
      h('span', { className: 'sktile-txt' }, h('b', null, on ? days(streak.current) : 'None'), h('span', null, 'Current streak'))),
    streak.longestStart && h('div', { className: 'sktile best' },
      h('span', { className: 'sktile-ic' }, h(Icon, { name: 'trophy', size: 15 })),
      h('span', { className: 'sktile-txt' },
        h('b', null, days(streak.longest)),
        h('span', null, `Best · ${fmtDayKey(streak.longestStart, { day: 'numeric', month: 'short' })} – ${fmtDayKey(streak.longestEnd, { day: 'numeric', month: 'short' })}`))));
}

const Stat = ({ s, cls = '' }) => h('span', { className: `astat ${cls}` },
  h('b', { style: { color: s.color ?? '#c6d4df' } }, s.v),
  h('span', null, s.l),
  s.sub && h('em', null, s.sub));

// fold: up to 3 stats for the folded row (the last one only from sm, behind a divider);
// stats: the open card's three past-year numbers
export function ActivitySummary({ open, onToggle, fold, stats, streak, heatmapData, cellLabel, describe, selectedDay, onSelectDay, heatmap }) {
  const recent = slim => h(RecentDays, { slim, streak, heatmapData, cellLabel, describe, selectedDay, onSelectDay });
  if (!open) {
    return h('section', { className: 'asum closed' },
      h('div', { className: 'asum-fold' },
        h('button', { className: 'afold-stats', onClick: onToggle, 'aria-expanded': false },
          fold.map((s, i) => h(Stat, { key: s.l, s, cls: i === 2 ? 'afold-year hidden sm:flex' : '' }))),
        h('div', { className: 'afold-days' }, recent(true), h('span', null, 'Last 14 days')),
        h('button', { className: 'afold-btn', onClick: onToggle, 'aria-label': 'Show the year' }, h(Icon, { name: 'chevron', size: 16 }))));
  }
  return h('section', { className: 'asum' },
    h('div', { className: 'anim-fade relative' },
      h('button', { className: 'asum-less', onClick: onToggle, 'aria-expanded': true }, 'Less', h(Icon, { name: 'chevron', size: 13, style: { transform: 'rotate(180deg)' } })),
      h('div', { className: 'asum-top' },
        h('div', { className: 'asum-sec' },
          h('div', { className: 'asum-h' }, h('span', null, 'Past year')),
          h('div', { className: 'astats' }, stats.map(s => h('div', { key: s.l, className: 'astat' },
            h('b', { style: { color: s.color ?? '#c6d4df' } }, s.v), h('span', null, s.l), s.sub && h('em', null, s.sub))))),
        h('div', { className: 'asum-sec' },
          h('div', { className: 'asum-h' }, h('span', null, 'Last 14 days')),
          recent(false),
          h(StreakTiles, { streak }))),
      h('div', { className: 'asum-sec' },
        h('div', { className: 'asum-h' },
          h('span', null, 'Heatmap'),
          h('em', { title: 'Days and times are shown in your timezone' }, TZ),
          selectedDay && h('button', { onClick: () => onSelectDay(null), className: 'fchip on anim-fade', style: { height: 22 } },
            `${fmtDayKey(selectedDay, { day: '2-digit', month: 'short' })} ✕`)),
        heatmap)));
}

// Past-year numbers of a heatmap { day: { count, ...sums } }: total of a field, active days, busiest day
export function yearOf(heatmapData, field = 'count') {
  const from = addDays(todayKey(), -364);
  let total = 0, active = 0, best = null;
  for (const [k, d] of Object.entries(heatmapData)) {
    if (k < from) continue;
    total += d[field] ?? 0;
    if (d.count > 0) active++;
    if (!best || d.count > best.count) best = { key: k, count: d.count };
  }
  return { total, active, best };
}

// ── Timeline ──────────────────────────────────────────────────────────────────

// "Sat 01 Nov" (+ the year when it isn't this year) with Today / Yesterday, and the day's totals
export function DayHead({ day, children }) {
  const today = todayKey();
  const rel = day === today ? 'Today' : day === addDays(today, -1) ? 'Yesterday' : null;
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  return h('div', { className: 'tday' },
    h('span', { className: 'tday-name' },
      fmtDayKey(day, { weekday: 'short', day: '2-digit', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }),
      rel && h('em', null, rel)),
    h('span', { className: 'tday-meta' }, children));
}

// Art behind a game strip: the first of `art` that loads, else the icon blurred
function StripArt({ art, icon }) {
  const [i, setI] = useState(0);
  const src = (art ?? []).filter(Boolean)[i];
  if (!src && !icon) return null;
  return h('span', { className: 'tcard-art' },
    src ? h('img', { key: src, src, alt: '', loading: 'lazy', onError: () => setI(n => n + 1) })
        : h('img', { src: icon, alt: '', loading: 'lazy', className: 'art-icon' }));
}

const FOLD = 5;   // runs longer than this fold after FOLD - 1 rows

// One run of consecutive unlocks in one game. `title` and `sub` are nodes (the page's own
// title parsing, console, time range); `rows` the UnlockRows, newest first
export function RunCard({ accent, href, icon, art, title, subset, sub, rows }) {
  const [open, setOpen] = useState(false);
  const folded = rows.length > FOLD && !open;
  const shown = folded ? rows.slice(0, FOLD - 1) : rows;
  return h('div', { className: 'tcard', style: { borderLeftColor: accent } },
    h('a', { href, target: '_blank', rel: 'noreferrer', className: 'tcard-head' },
      h(StripArt, { art, icon }),
      icon ? h('img', { src: icon, alt: '', loading: 'lazy', className: 'tcard-icon' }) : h('span', { className: 'trow-ph tcard-icon' }),
      h('div', { className: 'tcard-main' },
        h('span', { className: 'tcard-title' }, title),
        subset && h('span', { className: 'tcard-subset' }, subset),
        h('span', { className: 'tcard-sub' }, sub))),
    h('div', { className: 'tlist' }, shown),
    rows.length > FOLD && h('button', { className: 'tmore', onClick: () => setOpen(o => !o) },
      open ? 'Show less' : `Show ${rows.length - shown.length} more`,
      h(Icon, { name: 'chevron', size: 12, style: open ? { transform: 'rotate(180deg)' } : undefined })));
}

// The run's unlock count, for the end of a RunCard sub-line
export const RunCount = ({ n, extra }) => h('span', { className: 'tcard-n' }, h(Icon, { name: 'trophy', size: 11 }), ' ', n, extra);

// One unlock: badge, name (+ marks), description, and time with its value (points, rarity…) under it
export function UnlockRow({ href, icon, title, titleStyle, marks, desc, time, value }) {
  const img = icon ? h('img', { src: icon, alt: '', loading: 'lazy' }) : h('span', { className: 'trow-ph' });
  return h('div', { className: 'trow' },
    href ? h('a', { href, target: '_blank', rel: 'noreferrer', className: 'contents' }, img) : img,
    h('div', { className: 'trow-main' },
      h('span', { className: 'trow-title flex items-center gap-1.5' }, h('span', { className: 'truncate', style: titleStyle }, title), marks),
      desc && h('span', { className: 'trow-sub' }, desc)),
    h('span', { className: 'trow-end' }, time, value));
}

export { Fragment };
