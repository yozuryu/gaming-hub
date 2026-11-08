import React, { useState, useEffect, useMemo, useContext, createContext, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart3, ChevronDown, ChevronRight, Table, Check, Plus, CalendarDays, ListChecks, Star, Trophy, Users, Gamepad2, LayoutDashboard, Clock, Sparkles, Gem, CalendarCheck, RotateCcw, Timer, Moon } from 'lucide-react';
import { TabBar, useSwipeTabs, scrollToTabs } from '../assets/tabs.js';
import { TZ, dayKey, todayKey, addDays, keyToDate, splitByDay, fmtDayKey } from '../assets/time.js';
import {
    RA_MEDIA, PLATFORMS, PLATFORM_COLOR, PLATFORM_LABEL, PLATFORM_SHORT, RARITY_TIERS, rarityTier, HEAT_RAMP,
    FARM_PER_HOUR, FARM_MIN_UNLOCKS, TILDE_TAG_COLORS, DAY_PARTS, DROPPED_MAX_MINUTES, DROPPED_IDLE_DAYS,
    COMEBACK_GAP_DAYS, COMEBACK_MIN_MINUTES, COMEBACK_MIN_UNLOCKS, BINGE_MIN_DAYS, BINGE_MIN_MINUTES,
    fmtMinutes, fmtHours, fmtNum, parseTitle, xboxImg, gameUrl, niceMax, median,
} from './utils.js';

// Playtime logging started in 2026 (data/{ra,steam}/playtime/{YYYY}.json)
const PLAYTIME_FIRST_YEAR = 2026;
const PLAYTIME_PLATFORMS = ['ra', 'steam'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const hh = (h) => String(((h % 24) + 24) % 24).padStart(2, '0');

const fetchJson = (url) => fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null);

// ── Periods ───────────────────────────────────────────────────────────────────
// All ranges are local day keys (inclusive), so every metric uses the viewer's days.

const PERIODS = [
    { id: '30d',  label: '30 days' },
    { id: '3m',   label: '3 months' },
    { id: '12m',  label: '12 months' },
    { id: 'year', label: 'This year' },
    { id: 'all',  label: 'All time' },
];

const monthStartKey = (key, back = 0) => {
    const d = keyToDate(key);
    const m = new Date(d.getFullYear(), d.getMonth() - back, 1);
    return dayKey(m);
};

const buildRange = (period, firstKey) => {
    const today = todayKey();
    if (period === '30d') {
        const startKey = addDays(today, -29);
        return { startKey, endKey: today, prevStartKey: addDays(today, -59), prevEndKey: addDays(today, -30), unit: 'day', prevLabel: 'previous 30 days' };
    }
    if (period === '3m') {
        // This month and the two before it, like 12 months
        const startKey = monthStartKey(today, 2);
        return { startKey, endKey: today, prevStartKey: monthStartKey(today, 5), prevEndKey: addDays(startKey, -1), unit: 'week', prevLabel: 'previous 3 months' };
    }
    if (period === '12m') {
        const startKey = monthStartKey(today, 11);
        return { startKey, endKey: today, prevStartKey: monthStartKey(today, 23), prevEndKey: addDays(startKey, -1), unit: 'month', prevLabel: 'previous 12 months' };
    }
    if (period === 'year') {
        const y = keyToDate(today).getFullYear();
        return { startKey: `${y}-01-01`, endKey: today, prevStartKey: `${y - 1}-01-01`, prevEndKey: `${y - 1}${today.slice(4)}`, unit: 'month', prevLabel: `same days of ${y - 1}` };
    }
    return { startKey: firstKey ?? today, endKey: today, prevStartKey: null, prevEndKey: null, unit: 'year', prevLabel: null };
};

const inRange = (key, a, b) => a != null && key >= a && key <= b;

// Bucket keys between two day keys for a unit. A week is keyed by its Monday.
const weekStartKey = (key) => addDays(key, -((keyToDate(key).getDay() + 6) % 7));
const bucketKeyOf = (key, unit) => (unit === 'day' ? key : unit === 'week' ? weekStartKey(key) : unit === 'month' ? key.slice(0, 7) : key.slice(0, 4));
const buildBuckets = (startKey, endKey, unit) => {
    const keys = [];
    if (unit === 'day') {
        for (let k = startKey; k <= endKey; k = addDays(k, 1)) keys.push(k);
    } else if (unit === 'week') {
        for (let k = weekStartKey(startKey); k <= endKey; k = addDays(k, 7)) keys.push(k);
    } else if (unit === 'month') {
        const d = keyToDate(startKey), end = endKey.slice(0, 7);
        for (let m = new Date(d.getFullYear(), d.getMonth(), 1); ; m.setMonth(m.getMonth() + 1)) {
            const k = dayKey(m).slice(0, 7);
            keys.push(k);
            if (k >= end) break;
        }
    } else {
        for (let y = Number(startKey.slice(0, 4)); y <= Number(endKey.slice(0, 4)); y++) keys.push(String(y));
    }
    return keys;
};
const bucketLabel = (k, unit) => {
    if (unit === 'day' || unit === 'week') return keyToDate(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    if (unit === 'month') return keyToDate(`${k}-01`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    return k;
};

// ── Tooltip ───────────────────────────────────────────────────────────────────
// One fixed tooltip for the page. Marks call show(event, { title, rows }) on hover/focus.
// Rows lead with the value; the series is keyed by a short line in its color.

const TipContext = createContext({ show: () => {}, hide: () => {} });

const Tooltip = ({ tip }) => {
    if (!tip) return null;
    const left = Math.min(tip.x + 14, window.innerWidth - 220);
    const top = Math.min(tip.y + 14, window.innerHeight - 40 - tip.rows.length * 18);
    return (
        <div className="fixed z-[60] pointer-events-none bg-[#0e141b] border border-[#2a475e] rounded-[3px] px-2.5 py-2 shadow-lg min-w-[140px] max-w-[220px]"
            style={{ left, top }}>
            <div className="text-[11px] text-[#8f98a0] mb-1">{tip.title}</div>
            {tip.rows.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] leading-[18px]">
                    {r.color && <span className="w-2.5 h-[2px] shrink-0 rounded-full" style={{ background: r.color }} />}
                    <span className="text-white font-semibold">{r.value}</span>
                    <span className="text-[#8f98a0] truncate">{r.label}</span>
                </div>
            ))}
        </div>
    );
};

const useTip = (content) => {
    const { show, hide } = useContext(TipContext);
    return {
        onMouseMove: (e) => show(e, content()),
        onMouseLeave: hide,
        onFocus: (e) => { const r = e.currentTarget.getBoundingClientRect(); show({ clientX: r.right, clientY: r.top }, content()); },
        onBlur: hide,
        tabIndex: 0,
    };
};

// ── Building blocks ───────────────────────────────────────────────────────────

// Subset badge + subset name + tilde tags for an RA title (nothing for other platforms).
// Pair with parseTitle(name).baseTitle for the title itself.
const TitleMarks = ({ platform, name }) => {
    if (platform !== 'ra') return null;
    const { subsetName, isSubset, tags } = parseTitle(name);
    return (
        <>
            {isSubset && (
                <>
                    <span className="text-[7px] font-bold uppercase tracking-[0.07em] px-1 py-[1px] rounded-[2px] border border-[rgba(229,177,67,0.3)] bg-[rgba(229,177,67,0.1)] text-[#c8a84b] shrink-0">Subset</span>
                    <span className="text-[8px] text-[#c8a84b] truncate min-w-0">{subsetName}</span>
                </>
            )}
            {tags.map(tag => {
                const c = TILDE_TAG_COLORS[tag] || TILDE_TAG_COLORS.Prototype;
                return (
                    <span key={tag} className="text-[7px] font-bold uppercase tracking-[0.07em] px-1 py-[1px] rounded-[2px] shrink-0"
                        style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>{tag}</span>
                );
            })}
        </>
    );
};

// What a card or section counts, as criteria chips (styles .crits / .crit in assets/ui.css):
// [{ icon, text, gold }], falsy entries skipped
const Crits = ({ items }) => {
    const list = (items ?? []).filter(Boolean);
    if (!list.length) return null;
    return (
        <div className="crits">
            {list.map((c, i) => {
                const Icon = c.icon;
                return <span key={i} className={`crit ${c.gold ? 'gold' : ''}`}>{Icon && <Icon />}{c.text}</span>;
            })}
        </div>
    );
};

const Legend = ({ items }) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {items.map(it => (
            <span key={it.label} className="flex items-center gap-1.5 text-[11px] text-[#8f98a0]">
                <span className="w-2 h-2 rounded-[1px]" style={{ background: it.color }} /> {it.label}
            </span>
        ))}
    </div>
);

// A card with an optional Table toggle (a small icon button), so no value is only reachable by hovering
// `subtitle` is data shown under the title (the longest session); `pill` a small fact beside it
// (a scope); `rules` what the card counts, as chips under the title; `right` a control (a switch)
const ChartCard = ({ title, subtitle, pill, rules, legend, table, right, className = '', children }) => {
    const [showTable, setShowTable] = useState(false);
    return (
        <div className={`an-card ${className}`}>
            <div className="an-chead">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap min-h-[24px]">
                        <span className="an-ctitle">{title}</span>
                        {pill && <span className="cpill">{pill}</span>}
                    </div>
                    {subtitle && <div className="text-[10.5px] text-[#8f98a0] mt-0.5">{subtitle}</div>}
                    {rules && <div className="mt-1.5"><Crits items={rules} /></div>}
                </div>
                {right}
                {table && (
                    <button onClick={() => setShowTable(v => !v)} aria-pressed={showTable} aria-label="Show as table" title="Show as table"
                        className={`an-tbtn ${showTable ? 'on' : ''}`}>
                        <Table size={13} />
                    </button>
                )}
            </div>
            {/* Chart ↔ table swap fades */}
            <div key={showTable ? 'table' : 'chart'} className="anim-fade">
                {legend && !showTable && <div className="mb-2.5"><Legend items={legend} /></div>}
                {showTable ? <DataTable {...table} /> : children}
            </div>
        </div>
    );
};

// Segmented switch inside a card (one list or chart at a time)
const Seg = ({ items, value, onChange }) => (
    <div className="an-seg" role="tablist">
        {items.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={value === id} className={value === id ? 'on' : ''} onClick={() => onChange(id)}>{label}</button>
        ))}
    </div>
);

const Delta = ({ v }) => (v == null ? null : (
    <span className={`an-delta ${v > 0 ? 'up' : v < 0 ? 'down' : ''}`}>{v > 0 ? '▲' : v < 0 ? '▼' : '='} {Math.abs(v)}%</span>
));

const STEAM_CDN = 'https://cdn.akamai.steamstatic.com/steam/apps';
// Wide art, best source first (a failing one moves to the next), else the icon zoomed and blurred
const ArtBg = ({ sources, icon }) => {
    const list = sources.filter(Boolean);
    const [i, setI] = useState(0);
    if (list[i]) return <img src={list[i]} alt="" className="an-art" onError={() => setI(i + 1)} />;
    // No wide art: the shared library mosaic (.art-icon in assets/ui.css)
    return icon ? <img src={icon} alt="" className="an-art art-icon" /> : null;
};

// Numbers in a row (no tiles): label, value, change
const Facts = ({ items }) => (
    <div className={`an-facts n${items.length}`}>
        {items.map(f => (
            <div key={f.label} className="an-fact">
                <span className="an-fact-l">{f.label}</span>
                <span className={`an-fact-v ${f.gold ? 'gold' : ''}`}>{f.value}</span>
                <span className="an-fact-s">{f.delta != null ? <Delta v={f.delta} /> : f.note}</span>
            </div>
        ))}
    </div>
);

// Tiny bars for a highlight card; `hi` lit in the accent, the rest dim
const MiniBars = ({ values, hi, labels }) => {
    const max = Math.max(...values) || 1;
    return (
        <div className="an-mini">
            <div className="an-mini-bars">
                {values.map((v, i) => <span key={i} className={hi.includes(i) ? 'hi' : ''} style={{ height: `${Math.max(v ? 8 : 0, (v / max) * 100)}%` }} />)}
            </div>
            {labels && <div className="an-mini-ax">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>}
        </div>
    );
};

// 24-hour ring of play (00 at the top, clockwise), each hour shaded by its minutes (√, like the
// unlock grid); the typical start time in the middle with a tick on the ring
const PlayClock = ({ byHour, start }) => {
    const max = Math.max(...byHour) || 1;
    const shade = (v) => { if (!v) return HEAT_RAMP[0]; const r = Math.sqrt(v / max); return r >= 0.75 ? HEAT_RAMP[4] : r >= 0.5 ? HEAT_RAMP[3] : r >= 0.25 ? HEAT_RAMP[2] : HEAT_RAMP[1]; };
    const C = 60, R1 = 38, R2 = 56;
    const pt = (r, h) => { const a = (h / 24) * 2 * Math.PI - Math.PI / 2; return [C + r * Math.cos(a), C + r * Math.sin(a)]; };
    const wedge = (h) => {
        const [a, b, c, d] = [pt(R2, h + 0.05), pt(R2, h + 0.95), pt(R1, h + 0.95), pt(R1, h + 0.05)];
        return `M${a} A${R2},${R2} 0 0 1 ${b} L${c} A${R1},${R1} 0 0 0 ${d} Z`;
    };
    const s = start != null ? start / 60 : null;
    return (
        <svg viewBox="0 0 120 120" className="an-clock" role="img" aria-label="Play by hour of the day">
            {byHour.map((v, h) => <ClockWedge key={h} h={h} v={v} d={wedge(h)} fill={shade(v)} />)}
            {[0, 6, 12, 18].map(h => { const [x, y] = pt(R1 - 7, h); return <text key={h} x={x} y={y} fontSize="6.5" fill="#546270" textAnchor="middle" dominantBaseline="middle">{hh(h)}</text>; })}
            {s != null && (() => { const [x1, y1] = pt(R1 - 2, s), [x2, y2] = pt(R2 + 3, s); return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e5b143" strokeWidth="1.6" strokeLinecap="round" />; })()}
            {s != null && <>
                <text x={C} y={C - 2} fontSize="13" fontWeight="600" fill="#fff" textAnchor="middle">{hh(Math.floor(start / 60))}:{String(start % 60).padStart(2, '0')}</text>
                <text x={C} y={C + 10} fontSize="6.5" fill="#8f98a0" textAnchor="middle">typical start</text>
            </>}
        </svg>
    );
};
const ClockWedge = ({ h, v, d, fill }) => {
    const tip = useTip(() => ({ title: `${hh(h)}:00–${hh(h + 1)}:00`, rows: [{ value: fmtMinutes(v), label: 'played in total' }] }));
    return <path d={d} fill={fill} className="outline-none hover:brightness-150 focus:brightness-150" {...tip} />;
};

// Average minutes in each hour, weekdays and weekends as two lines on one scale (weekends filled)
const HourLines = ({ rows, max, height = 120 }) => {
    const y = (v) => height - (v / max) * height;
    const line = (id) => rows.map(r => `${r.hour + 0.5},${y(r[id])}`).join(' ');
    return (
        <div className="flex gap-1.5">
            <div className="flex flex-col justify-between text-[8px] text-[#546270] text-right tabular-nums shrink-0" style={{ height }}>
                <span>{fmtMinutes(max)}</span><span>{fmtMinutes(max / 2)}</span><span>0</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="relative" style={{ height }}>
                    {[0, 0.5, 1].map(f => <div key={f} className="absolute left-0 right-0 h-px bg-[#202d39]" style={{ top: `${f * 100}%` }} />)}
                    <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" viewBox={`0 0 24 ${height}`} preserveAspectRatio="none">
                        <polygon points={`0.5,${height} ${line('weekends')} 23.5,${height}`} fill="rgba(102,192,244,0.16)" />
                        {HOUR_SERIES.map(s => <polyline key={s.id} points={line(s.id)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
                    </svg>
                    <div className="absolute inset-0 flex">
                        {rows.map(r => <HourCol key={r.hour} row={r} />)}
                    </div>
                </div>
                <div className="flex mt-1">
                    {rows.map(r => <div key={r.hour} className="flex-1 text-center text-[8px] text-[#546270]">{r.hour % 3 === 0 ? hh(r.hour) : ''}</div>)}
                </div>
            </div>
        </div>
    );
};
const HourCol = ({ row }) => {
    const tip = useTip(() => ({
        title: `${hh(row.hour)}:00–${hh(row.hour + 1)}:00`,
        rows: HOUR_SERIES.map(s => ({ color: s.color, value: fmtMinutes(row[s.id]), label: `per ${s.label.toLowerCase().replace(/s$/, '')} day` })),
    }));
    return <div className="flex-1 h-full outline-none hover:bg-[rgba(198,212,223,0.06)] focus:bg-[rgba(198,212,223,0.06)]" {...tip} />;
};

const DataTable = ({ columns, rows }) => (
    <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
        <table className="w-full text-[10px]">
            <thead>
                <tr>{columns.map((c, i) => (
                    <th key={i} className={`sticky top-0 bg-[#1b2838] font-semibold uppercase tracking-[0.07em] text-[9px] text-[#546270] py-1 pr-3 ${i ? 'text-right' : 'text-left'}`}>{c}</th>
                ))}</tr>
            </thead>
            <tbody>
                {rows.map((r, ri) => (
                    <tr key={ri} className="border-t border-[#202d39]">
                        {r.map((v, i) => <td key={i} className={`py-1 pr-3 tabular-nums ${i ? 'text-right text-[#c6d4df]' : 'text-left text-[#8f98a0]'}`}>{v}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// Stacked columns. buckets: [{ key, label, values: { [series]: n } }]; bars cap at 24px,
// 2px surface gap between segments, rounded only at the top.
const StackedColumns = ({ buckets, series, format, height = 150 }) => {
    const max = niceMax(Math.max(0, ...buckets.map(b => series.reduce((a, s) => a + (b.values[s] || 0), 0))));
    const labelEvery = Math.ceil(buckets.length / 8);
    return (
        <div className="flex gap-1.5">
            <div className="flex flex-col justify-between text-[8px] text-[#546270] text-right tabular-nums shrink-0" style={{ height }}>
                <span>{format(max)}</span><span>{format(max / 2)}</span><span>0</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="relative" style={{ height }}>
                    {[0, 0.5, 1].map(f => (
                        <div key={f} className="absolute left-0 right-0 h-px bg-[#202d39]" style={{ top: `${f * 100}%` }} />
                    ))}
                    <div className="absolute inset-0 flex items-end gap-[2px]">
                        {buckets.map(b => <Column key={b.key} bucket={b} series={series} max={max} height={height} format={format} />)}
                    </div>
                </div>
                <div className="flex gap-[2px] mt-1">
                    {buckets.map((b, i) => (
                        <div key={b.key} className="flex-1 min-w-0 text-center text-[8px] text-[#546270] whitespace-nowrap overflow-visible">
                            {i % labelEvery === 0 ? b.label : ''}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Column = ({ bucket, series, max, height, format }) => {
    const total = series.reduce((a, s) => a + (bucket.values[s] || 0), 0);
    const tip = useTip(() => ({
        title: bucket.label,
        rows: [
            ...series.filter(s => bucket.values[s]).map(s => ({ color: PLATFORM_COLOR[s], value: format(bucket.values[s]), label: PLATFORM_SHORT[s] ?? s })),
            ...(series.length > 1 ? [{ value: format(total), label: 'total' }] : []),
        ],
    }));
    const filled = series.filter(s => bucket.values[s] > 0);
    return (
        <div className="flex-1 min-w-0 h-full flex flex-col justify-end items-center outline-none group" {...tip}>
            <div className="w-full max-w-[24px] flex flex-col-reverse gap-[2px] group-hover:brightness-125 group-focus:brightness-125">
                {filled.map((s, i) => (
                    <div key={s} className={i === filled.length - 1 ? 'rounded-t-[2px]' : ''}
                        style={{ height: Math.max(1, ((bucket.values[s] || 0) / max) * height - 2), background: PLATFORM_COLOR[s] }} />
                ))}
            </div>
        </div>
    );
};

// Horizontal bars for ranked lists: rows [{ key, label, sub, value, color, icon, href }]
// `max` fixes the scale (e.g. 100 for percentages); otherwise bars are relative to the top row
const BarList = ({ rows, format, max: fixedMax, empty = 'Nothing in this period.' }) => {
    if (!rows.length) return <div className="an-empty">{empty}</div>;
    const max = fixedMax ?? Math.max(...rows.map(r => r.value));
    return (
        <div className="an-blist">
            {rows.map((r, i) => (
                <div key={r.key} className="an-brow">
                    {r.icon !== undefined && (
                        r.icon ? <img src={r.icon} alt="" className="an-bicon" loading="lazy" /> : <span className="an-bicon" />
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                            {r.href
                                ? <a href={r.href} target="_blank" rel="noreferrer" className="an-bname">{r.label}</a>
                                : <span className="an-bname">{r.label}</span>}
                            {r.marks}
                            <span className="ml-auto an-bval">{r.text ?? format(r.value)}</span>
                        </div>
                        {r.sub && <div className="an-bsub">{r.sub}</div>}
                        <div className="an-btrack">
                            <div style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: r.color }} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Day-of-week × hour grid; cells: [7][24] numbers
// Average unlocks: 0.43 → "0.43", 2.5 → "2.5"
// 3 → "3 days ago", 40 → "1 month ago", 400 → "1 year ago"
const agoLabel = (ms) => {
    const days = Math.floor((Date.now() - ms) / 86400000);
    const [n, unit] = days < 1 ? [0, 'today'] : days < 30 ? [days, 'day'] : days < 365 ? [Math.floor(days / 30), 'month'] : [Math.floor(days / 365), 'year'];
    return n ? `${n} ${unit}${n === 1 ? '' : 's'} ago` : 'today';
};
const fmtAvg = (v) => (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2));

// Day-of-week × hour grid of average unlocks; cells: [7][24]. Colors by rank, not linear:
// the non-empty cells split into four equal groups, so one burst hour can't turn every
// other cell into the darkest shade, and every range uses the whole ramp
const Punchcard = ({ cells, totals }) => {
    const sorted = cells.flat().filter(v => v > 0).sort((a, b) => a - b);
    const cut = [0.25, 0.5, 0.75].map(q => sorted[Math.floor(q * sorted.length)] ?? Infinity);
    const max = sorted[sorted.length - 1] || 1;
    const color = (v) => { if (!v) return HEAT_RAMP[0]; const r = Math.sqrt(v / max); return r >= 0.75 ? HEAT_RAMP[4] : r >= 0.5 ? HEAT_RAMP[3] : r >= 0.25 ? HEAT_RAMP[2] : HEAT_RAMP[1]; };
    return (
        <div className="overflow-x-auto">
            <div style={{ minWidth: 24 * 10 + 30 }}>
                <div className="flex ml-[30px] mb-1">
                    {Array.from({ length: 24 }, (_, h) => (
                        <div key={h} className="flex-1 text-[8px] text-[#546270]">{h % 3 === 0 ? String(h).padStart(2, '0') : ''}</div>
                    ))}
                </div>
                {cells.map((row, d) => (
                    <div key={d} className="flex items-center gap-[2px] mb-[2px]">
                        <div className="w-[28px] text-[8px] text-[#546270] text-right pr-1 shrink-0">{WEEKDAYS[d]}</div>
                        {row.map((v, h) => <PunchCell key={h} v={v} total={totals[d][h]} d={d} h={h} color={color(v)} />)}
                    </div>
                ))}
                <div className="flex items-center justify-end gap-1 mt-2 text-[8px] text-[#546270]">
                    <span className="mr-0.5">Fewer</span>
                    {HEAT_RAMP.slice(1).map(c => <span key={c} className="w-2.5 h-2.5 rounded-[2px]" style={{ background: c }} />)}
                    <span className="ml-0.5">More</span>
                </div>
            </div>
        </div>
    );
};

const PunchCell = ({ v, total, d, h, color }) => {
    const tip = useTip(() => ({
        title: `${WEEKDAY_NAMES[d]} ${hh(h)}:00–${hh(h + 1)}:00`,
        rows: [{ value: v ? fmtAvg(v) : '0', label: `per ${WEEKDAY_NAMES[d]}` }, { value: fmtNum(total), label: 'in total' }],
    }));
    return <div className="an-pcell outline-none hover:brightness-150 focus:brightness-150" style={{ background: color }} {...tip} />;
};

// Loading skeleton in the shape of the tab being opened: the real card frames (heights measured at phone
// and desktop width) with their insides drawn as shimmers, so a page opened on ?tab=time doesn't show
// Overview's shape and nothing jumps when the data lands
const S = ({ w = '100%', h = 10, r = 2, cls = '', style }) => <div className={`shimmer shrink-0 ${cls}`} style={{ width: w, height: h, borderRadius: r, ...style }} />;
const SkCard = ({ h, span, children }) => (
    <div className={`an-card flex flex-col gap-3 overflow-hidden ${h} ${span ? 'an-span' : ''}`}>{children}</div>
);
const SkTitle = ({ w = 90 }) => <div className="flex items-center justify-between"><S w={w} h={10} /><S w={14} h={14} /></div>;
const SkRows = ({ n, icon = 24 }) => (
    <div className="flex flex-col gap-3">
        {[...Array(n)].map((_, i) => (
            <div key={i} className="flex items-center gap-2.5">
                <S w={icon} h={icon} />
                <div className="flex-1 flex flex-col gap-1.5"><S w={`${70 - (i % 3) * 12}%`} h={9} /><S w={`${30 + (i % 2) * 15}%`} h={7} /></div>
                <S w={34} h={10} />
            </div>
        ))}
    </div>
);
const SkBars = ({ n, label = true }) => (
    <div className="flex flex-col gap-2.5">
        {[...Array(n)].map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
                {label && <div className="flex justify-between"><S w={`${28 + (i % 3) * 10}%`} h={8} /><S w={30} h={8} /></div>}
                <S h={6} />
            </div>
        ))}
    </div>
);
const SkFacts = ({ n }) => (
    <div className={`an-facts n${n}`}>
        {[...Array(n)].map((_, i) => <div key={i} className="flex flex-col gap-1.5"><S w={60} h={8} /><S w={44} h={16} /><S w={32} h={7} /></div>)}
    </div>
);
const SkSeg = () => <S h={28} r={3} />;
const SkChart = () => <S cls="flex-1" h="auto" style={{ minHeight: 90 }} />;
const Skeleton = ({ tab }) => {
    if (tab === 'time') return (
        <div className="an-grid an-sk" aria-busy="true">
            <SkCard span h="h-[473px] md:h-[235px]">
                <SkTitle w={100} />
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                    <div className="flex items-center gap-4 md:flex-1">
                        <S w={120} h={120} r={999} />
                        <div className="flex-1 flex flex-col gap-3">{[...Array(5)].map((_, i) => <div key={i} className="flex justify-between"><S w={`${40 + (i % 2) * 15}%`} h={9} /><S w={40} h={11} /></div>)}</div>
                    </div>
                    <div className="flex flex-col gap-3 md:flex-1"><S w="70%" h={8} /><SkBars n={3} /></div>
                </div>
            </SkCard>
            <SkCard h="h-[225px]"><SkTitle w={70} /><S w="60%" h={8} /><SkChart /></SkCard>
            <SkCard h="h-[225px]"><SkTitle w={80} /><SkChart /></SkCard>
            <SkCard span h="h-[220px]"><SkTitle w={70} /><SkChart /></SkCard>
            <SkCard span h="h-[202px] md:h-[250px]"><SkTitle w={110} /><SkChart /></SkCard>
        </div>
    );
    if (tab === 'games') return (
        <div className="flex flex-col gap-3 an-sk" aria-busy="true">
            <SkCard h="h-[140px] md:h-[78px]"><SkFacts n={4} /></SkCard>
            <div className="an-grid">
                <SkCard h="h-[499px]"><SkTitle w={80} /><SkSeg /><SkRows n={8} /></SkCard>
                <SkCard h="h-[299px] md:h-[499px]"><SkTitle w={80} /><SkSeg /><SkRows n={6} /></SkCard>
            </div>
        </div>
    );
    if (tab === 'achievements') return (
        <div className="an-grid an-sk" aria-busy="true">
            <SkCard h="h-[479px] md:h-[522px]">
                <SkTitle w={60} /><S w={130} h={18} r={9} /><S w="80%" h={8} /><SkBars n={2} /><S w={80} h={8} /><SkRows n={6} icon={22} />
            </SkCard>
            <SkCard h="h-[522px]">
                <SkTitle w={90} />
                <div className="flex items-center gap-3"><S w={44} h={44} /><div className="flex-1 flex flex-col gap-1.5"><S w="40%" h={8} /><S w="55%" h={13} /><S w="65%" h={8} /></div></div>
                <S w={90} h={14} />
                <SkBars n={6} />
            </SkCard>
            <SkCard span h="h-[201px]"><SkTitle w={100} /><SkBars n={3} /></SkCard>
        </div>
    );
    return (
        <div className="flex flex-col gap-3 an-sk" aria-busy="true">
            <SkCard h="h-[443px] md:h-[380px]">
                <div className="grid grid-cols-2 gap-2">{[0, 1].map(i => <div key={i} className="flex flex-col gap-1.5 p-2.5 border border-[#2a475e] rounded-[3px]"><S w={70} h={9} /><S w={60} h={24} /><S w={36} h={8} /></div>)}</div>
                <S w={90} h={8} />
                <SkChart />
                <SkFacts n={4} />
            </SkCard>
            <div className="an-hls">
                <div className="an-hl wide gap-2 h-[101px] md:h-auto"><S w={70} h={8} /><div className="flex items-center gap-2 w-full"><S w={26} h={26} /><div className="flex-1 flex flex-col gap-1.5"><S w="55%" h={11} /><S w="35%" h={8} /></div></div><S h={4} /></div>
                {[130, 130, 114, 114].map((hh, i) => (
                    <div key={i} className="an-hl gap-2" style={{ height: hh }}>
                        <S w={60} h={8} /><S w={`${55 + (i % 2) * 15}%`} h={15} /><S w={40} h={7} />
                        {i < 2 && <div className="flex items-end gap-[2px] w-full mt-auto">{[6, 10, 7, 14, 9, 18, 12].map((b, j) => <S key={j} cls="flex-1" w="auto" h={b} r={1} />)}</div>}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadAll() {
    const [raProfile, steamProfile, xboxProfile, steamIndex, xboxIndex, steamWin, xboxWin, ...historyIdx] = await Promise.all([
        fetchJson('../data/ra/profile.json'),
        fetchJson('../data/steam/profile.json'),
        fetchJson('../data/xbox/profile.json'),
        fetchJson('../data/steam/games/index.json'),
        fetchJson('../data/xbox/games/index.json'),
        fetchJson('../data/steam/win-conditions.json'),
        fetchJson('../data/xbox/win-conditions.json'),
        ...PLATFORMS.map(p => fetchJson(`../data/${p}/history/index.json`)),
    ]);
    // RA wide art picked in the admin (hero, else banner), behind the top game card
    const raArt = (await fetchJson('../data/ra/art.json'))?.games ?? {};
    // Idle games (marked in the admin, General → Idle Games): left running, so their playtime isn't play.
    // Ids are "ra:45053" in the file, "ra-45053" here like every other game key
    const idle = new Set(((await fetchJson('../data/hub/idle-games.json'))?.games ?? []).map(id => String(id).replace(':', '-')));

    // Unlocks, all years listed in each history index
    const unlockFiles = await Promise.all(PLATFORMS.flatMap((p, i) =>
        Object.keys(historyIdx[i]?.years ?? {}).map(y => fetchJson(`../data/${p}/history/${y}.json`).then(f => ({ p, f })))
    ));
    const unlocks = unlockFiles.flatMap(({ p, f }) => (f?.unlocks ?? []).map(u => ({ ...u, platform: p, ms: Date.parse(u.t) })));

    // Play sessions, every year since logging started
    const thisYear = new Date().getUTCFullYear();
    const years = Array.from({ length: thisYear - PLAYTIME_FIRST_YEAR + 1 }, (_, i) => PLAYTIME_FIRST_YEAR + i);
    const playFiles = await Promise.all(PLAYTIME_PLATFORMS.flatMap(p => years.map(y => fetchJson(`../data/${p}/playtime/${y}.json`).then(f => ({ p, f })))));
    const sessions = playFiles.flatMap(({ p, f }) => (f?.sessions ?? []).map(s => ({
        platform: p, gameId: String(s.gameId), minutes: s.minutes, startMs: Date.parse(s.start), endMs: Date.parse(s.end),
    })));

    // Game names / icons / consoles, keyed platform → id (string)
    const meta = { ra: {}, steam: {}, xbox: {} };
    const put = (p, id, m) => { meta[p][String(id)] = { ...meta[p][String(id)], ...Object.fromEntries(Object.entries(m).filter(([, v]) => v != null)) }; };
    for (const { p, f } of playFiles) for (const [id, g] of Object.entries(f?.games ?? {})) {
        put(p, id, { name: g.name, icon: g.icon ? (p === 'ra' ? `${RA_MEDIA}${g.icon}` : g.icon) : null, console: g.console });
    }
    for (const [id, g] of Object.entries(steamIndex?.achievementProgress ?? {})) put('steam', id, { name: g.gameName, icon: g.iconUrl });
    for (const [id, g] of Object.entries(xboxIndex?.achievementProgress ?? {})) put('xbox', id, { name: g.gameName, icon: xboxImg(g.iconUrl, 64), art: xboxImg(g.heroUrl, 424) });
    const raGames = [...(raProfile?.gameAwardsAndProgress?.results ?? []), ...(raProfile?.recentlyPlayedGames ?? [])];
    for (const g of raGames) put('ra', g.gameId, { name: g.title, icon: g.imageIcon ? `${RA_MEDIA}${g.imageIcon}` : null, console: g.consoleName });

    // Completed games (gold): RA mastery, Steam perfect, Xbox 100%. Beaten is RA-only, used by the funnel.
    const awards = raProfile?.pageAwards?.visibleUserAwards ?? [];
    for (const a of awards) if (a.awardData) put('ra', a.awardData, { name: a.title, console: a.consoleName });
    const completions = [
        ...awards.filter(a => a.awardType === 'Mastery/Completion').map(a => ({ platform: 'ra', gameId: String(a.awardData), ms: Date.parse(a.awardedAt) })),
        ...(steamProfile?.perfectGames ?? []).map(g => ({ platform: 'steam', gameId: String(g.appId), ms: Date.parse(g.completedAt) })),
        ...(xboxProfile?.perfectGames ?? []).map(g => ({ platform: 'xbox', gameId: String(g.titleId), ms: Date.parse(g.completedAt) })),
    ].filter(c => !Number.isNaN(c.ms));

    // Beaten (Steam/Xbox): the game's win condition (ending achievements picked in the admin;
    // "or" = any, "and" = all) is met in the unlock history, or the game is at 100%.
    // Same rule as the Completions page, but checked against history instead of per-game files.
    const unlockedBy = {};
    for (const u of unlocks) (unlockedBy[`${u.platform}-${u.g}`] ??= new Set()).add(String(u.a));
    const beatenCount = (platform, winConditions, perfectIds) => {
        const beaten = new Set(perfectIds.map(String));
        for (const [id, cond] of Object.entries(winConditions ?? {})) {
            const names = (Array.isArray(cond) ? cond : cond.achievements ?? []).map(String);
            const mode = Array.isArray(cond) ? 'or' : (cond.mode || 'or');
            const got = unlockedBy[`${platform}-${id}`] ?? new Set();
            if (names.length && (mode === 'and' ? names.every(n => got.has(n)) : names.some(n => got.has(n)))) beaten.add(String(id));
        }
        return beaten.size;
    };

    const raProgress = raProfile?.gameAwardsAndProgress?.results ?? [];
    const funnel = {
        // RA's progress list only has games with an unlock, so there's no separate "played" stage
        ra: [
            ['Started', raProgress.filter(g => g.numAwarded > 0).length],
            ['Beaten', raProgress.filter(g => g.highestAwardKind).length],
            ['Mastered', raProgress.filter(g => /mastered|completed/.test(g.highestAwardKind ?? '')).length],
        ],
        steam: [
            ['Owned', steamProfile?.stats?.totalGames ?? 0],
            ['Played', steamProfile?.stats?.gamesWithPlaytime ?? 0],
            ['Started', Object.values(steamIndex?.achievementProgress ?? {}).filter(g => g.unlocked > 0).length],
            ['Beaten', beatenCount('steam', steamWin, (steamProfile?.perfectGames ?? []).map(g => g.appId))],
            ['Perfect', steamProfile?.stats?.perfectCount ?? 0],
        ],
        xbox: [
            ['Owned', xboxProfile?.stats?.totalGames ?? 0],
            ['Started', xboxProfile?.stats?.gamesStarted ?? 0],
            ['Beaten', beatenCount('xbox', xboxWin, (xboxProfile?.perfectGames ?? []).map(g => g.titleId))],
            ['Completed', xboxProfile?.stats?.perfectCount ?? 0],
        ],
    };

    // Current progress per game ("platform-id" → { unlocked, total }), for Most progress / Almost complete
    const progress = {};
    for (const [id, g] of Object.entries(steamIndex?.achievementProgress ?? {})) progress[`steam-${id}`] = { unlocked: g.unlocked ?? 0, total: g.total ?? 0 };
    for (const [id, g] of Object.entries(xboxIndex?.achievementProgress ?? {})) progress[`xbox-${id}`] = { unlocked: g.unlocked ?? 0, total: g.total ?? 0 };
    for (const g of raProgress) progress[`ra-${g.gameId}`] = { unlocked: g.numAwarded ?? 0, total: g.maxPossible ?? 0 };

    // Achievement farms (Steam only: needs lifetime playtime per game)
    const farms = new Set(Object.entries(steamIndex?.achievementProgress ?? {})
        .filter(([, g]) => g.unlocked >= FARM_MIN_UNLOCKS && g.unlocked / Math.max((g.playtimeForever ?? 0) / 60, 0.1) > FARM_PER_HOUR)
        .map(([id]) => `steam-${id}`));

    return { unlocks, sessions, meta, completions, funnel, progress, farms, idle, raArt };
}

// Session minutes split into local days: [{ key, minutes, s }]
const sessionDays = (sessions) => sessions.flatMap(s => {
    const parts = splitByDay(s.startMs, s.endMs);
    const span = parts.reduce((a, p) => a + p.ms, 0);
    return parts.map(p => ({ key: p.key, minutes: span ? s.minutes * (p.ms / span) : s.minutes, s }));
});

// Session minutes split into local hours of the week: [7][24]
const hourGrid = (sessions) => {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const s of sessions) {
        const span = s.endMs - s.startMs;
        if (span <= 0) { const d = new Date(s.endMs); grid[(d.getDay() + 6) % 7][d.getHours()] += s.minutes; continue; }
        for (let t = s.startMs; t < s.endMs;) {
            const d = new Date(t);
            const next = Math.min(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1).getTime(), s.endMs);
            grid[(d.getDay() + 6) % 7][d.getHours()] += s.minutes * ((next - t) / span);
            t = next;
        }
    }
    return grid;
};

const pct = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

// ── App ───────────────────────────────────────────────────────────────────────

const App = () => {
    const [data, setData] = useState(null);
    const [period, setPeriod] = useState(() => {
        const q = new URLSearchParams(location.search).get('period');
        return PERIODS.some(p => p.id === q) ? q : '30d';
    });
    const choosePeriod = (id) => {
        setPeriod(id);
        const url = new URL(location.href);
        if (id === '30d') url.searchParams.delete('period'); else url.searchParams.set('period', id);
        history.replaceState(null, '', url);
    };
    // Hide achievement farms everywhere (default on); ?farms=show turns it off
    const [hideFarms, setHideFarms] = useState(() => new URLSearchParams(location.search).get('farms') !== 'show');
    const toggleFarms = () => {
        const next = !hideFarms;
        setHideFarms(next);
        const url = new URL(location.href);
        if (next) url.searchParams.delete('farms'); else url.searchParams.set('farms', 'show');
        history.replaceState(null, '', url);
    };
    // Hide idle games everywhere (default on); ?idle=show turns it off
    const [hideIdle, setHideIdle] = useState(() => new URLSearchParams(location.search).get('idle') !== 'show');
    const toggleIdle = () => {
        const next = !hideIdle;
        setHideIdle(next);
        const url = new URL(location.href);
        if (next) url.searchParams.delete('idle'); else url.searchParams.set('idle', 'show');
        history.replaceState(null, '', url);
    };
    // Platform filter: All or one platform, scopes every section like the farm filter; ?platform=
    const [platform, setPlatform] = useState(() => {
        const q = new URLSearchParams(location.search).get('platform');
        return PLATFORMS.includes(q) ? q : 'all';
    });
    const choosePlatform = (id) => {
        setPlatform(id);
        const url = new URL(location.href);
        if (id === 'all') url.searchParams.delete('platform'); else url.searchParams.set('platform', id);
        history.replaceState(null, '', url);
    };
    // Series shown in the charts: every platform, or the selected one (colors stay fixed per platform)
    const units = platform === 'all' ? PLATFORMS : [platform];
    const plays = PLAYTIME_PLATFORMS.filter(p => units.includes(p));
    // Xbox reports no playtime: its view keeps the achievement sections only
    const hasPlay = plays.length > 0;
    const [tip, setTip] = useState(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => { loadAll().then(setData); }, []);
    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const tipApi = useMemo(() => ({
        show: (e, content) => setTip({ x: e.clientX, y: e.clientY, ...content }),
        hide: () => setTip(null),
    }), []);

    // Derived once per load
    const base = useMemo(() => {
        if (!data) return null;
        const days = sessionDays(data.sessions);
        const unlocks = data.unlocks.map(u => ({ ...u, key: dayKey(new Date(u.ms)) }));
        const completions = data.completions.map(c => ({ ...c, key: dayKey(new Date(c.ms)) }));
        const firstUnlockKey = unlocks.reduce((m, u) => (u.key < m ? u.key : m), todayKey());
        const trackingKey = days.reduce((m, d) => (d.key < m ? d.key : m), todayKey());
        // First unlock per game (all time), for time-to-complete
        const firstUnlock = {};
        for (const u of data.unlocks) {
            const k = `${u.platform}-${u.g}`;
            if (!(k in firstUnlock) || u.ms < firstUnlock[k]) firstUnlock[k] = u.ms;
        }
        // Per game, all time: first and last activity (a session or an unlock) and minutes played
        const life = {};
        const touch = (k, ms) => {
            const x = (life[k] ??= { first: ms, last: ms, minutes: 0 });
            if (ms < x.first) x.first = ms;
            if (ms > x.last) x.last = ms;
            return x;
        };
        for (const s of data.sessions) touch(`${s.platform}-${s.gameId}`, s.startMs).minutes += s.minutes;
        for (const s of data.sessions) touch(`${s.platform}-${s.gameId}`, s.endMs);
        for (const u of data.unlocks) touch(`${u.platform}-${u.g}`, u.ms);
        // Per game, all time: every session start and unlock time, sorted (for comebacks)
        const acts = {};
        for (const s of data.sessions) (acts[`${s.platform}-${s.gameId}`] ??= []).push(s.startMs);
        for (const u of data.unlocks) (acts[`${u.platform}-${u.g}`] ??= []).push(u.ms);
        for (const a of Object.values(acts)) a.sort((x, y) => x - y);
        return { days, unlocks, completions, firstUnlockKey, trackingKey, firstUnlock, life, acts };
    }, [data]);

    const range = useMemo(() => buildRange(period, base?.firstUnlockKey), [period, base]);

    const view = useMemo(() => {
        if (!base) return null;
        const { trackingKey } = base;
        const { startKey, endKey, prevStartKey, prevEndKey } = range;
        const nameOf = (p, id) => data.meta[p][String(id)]?.name ?? `#${id}`;
        // The platform and farm filters scope every section below them
        const keep = (p, id) => (platform === 'all' || p === platform) && (!hideFarms || !data.farms.has(`${p}-${id}`)) && (!hideIdle || !data.idle.has(`${p}-${id}`));
        const days = base.days.filter(x => keep(x.s.platform, x.s.gameId));
        const unlocks = base.unlocks.filter(u => keep(u.platform, u.g));
        const completions = base.completions.filter(c => keep(c.platform, c.gameId));
        const sessions = data.sessions.filter(s => keep(s.platform, s.gameId));

        // ── Totals for a range
        const totals = (a, b) => {
            const d = days.filter(x => inRange(x.key, a, b));
            const sess = sessions.filter(s => inRange(dayKey(new Date(s.endMs)), a, b));
            const u = unlocks.filter(x => inRange(x.key, a, b));
            const active = new Set([...d.filter(x => x.minutes >= 1).map(x => x.key), ...u.map(x => x.key)]);
            return {
                minutes: d.reduce((acc, x) => acc + x.minutes, 0),
                sessions: sess.length,
                avgSession: sess.length ? sess.reduce((acc, s) => acc + s.minutes, 0) / sess.length : 0,
                activeDays: active.size,
                unlocks: u.length,
                raPoints: u.filter(x => x.platform === 'ra').reduce((acc, x) => acc + (x.p || 0), 0),
                gamerscore: u.filter(x => x.platform === 'xbox').reduce((acc, x) => acc + (x.p || 0), 0),
                completions: completions.filter(c => inRange(c.key, a, b)).length,
            };
        };
        const cur = totals(startKey, endKey);
        const prev = prevStartKey ? totals(prevStartKey, prevEndKey) : null;
        // Playtime deltas only when the previous period was fully tracked
        const prevPlayTracked = prev && prevStartKey >= trackingKey;
        const playNote = startKey < trackingKey ? `since ${fmtDayKey(trackingKey)}` : null;

        // ── Trends
        const unit = range.unit;
        const playUnit = unit === 'year' ? 'month' : unit;
        const playBuckets = buildBuckets(playUnit === 'month' && unit === 'year' ? trackingKey : startKey, endKey, playUnit)
            .map(k => ({ key: k, label: bucketLabel(k, playUnit), values: {} }));
        const playIdx = Object.fromEntries(playBuckets.map((b, i) => [b.key, i]));
        for (const x of days) {
            if (!inRange(x.key, startKey, endKey)) continue;
            const b = playBuckets[playIdx[bucketKeyOf(x.key, playUnit)]];
            if (b) b.values[x.s.platform] = (b.values[x.s.platform] || 0) + x.minutes;
        }
        const unlockBuckets = buildBuckets(startKey, endKey, unit).map(k => ({ key: k, label: bucketLabel(k, unit), values: {} }));
        const unlockIdx = Object.fromEntries(unlockBuckets.map((b, i) => [b.key, i]));
        for (const u of unlocks) {
            if (!inRange(u.key, startKey, endKey)) continue;
            const b = unlockBuckets[unlockIdx[bucketKeyOf(u.key, unit)]];
            if (b) b.values[u.platform] = (b.values[u.platform] || 0) + 1;
        }

        // ── When you play
        const periodSessions = sessions.filter(s => inRange(dayKey(new Date(s.endMs)), startKey, endKey));
        const periodUnlocks = unlocks.filter(u => inRange(u.key, startKey, endKey));
        const playGrid = hourGrid(periodSessions);
        // Unlocks by hour: totals, and the average per weekday-hour (÷ how many of that weekday the
        // range has), so values mean the same on every range
        const unlockTotals = Array.from({ length: 7 }, () => Array(24).fill(0));
        for (const u of periodUnlocks) { const d = new Date(u.ms); unlockTotals[(d.getDay() + 6) % 7][d.getHours()]++; }
        const rangeWeekdays = Array(7).fill(0);
        for (let k = startKey; k <= endKey; k = addDays(k, 1)) rangeWeekdays[(keyToDate(k).getDay() + 6) % 7]++;
        const unlockGrid = unlockTotals.map((r, d) => r.map(v => (rangeWeekdays[d] ? v / rangeWeekdays[d] : 0)));

        // Habits, all from the playtime grid (RA + Steam)
        const playTotal = playGrid.flat().reduce((a, v) => a + v, 0);
        const share = (v) => (playTotal ? Math.round((v / playTotal) * 100) : 0);
        // Peak: busiest 2-hour window of the week (wraps across midnight and Sunday → Monday)
        const flat = playGrid.flat();
        let peakAt = 0;
        for (let i = 1; i < 168; i++) if (flat[i] + flat[(i + 1) % 168] > flat[peakAt] + flat[(peakAt + 1) % 168]) peakAt = i;
        const peakMinutes = flat[peakAt] + flat[(peakAt + 1) % 168];
        const peak = peakMinutes ? { label: `${WEEKDAYS[Math.floor(peakAt / 24)]} ${hh(peakAt % 24)}–${hh(peakAt % 24 + 2)}`, share: share(peakMinutes) } : null;
        const weekdayMinutes = playGrid.map(r => r.reduce((a, v) => a + v, 0));
        const favDay = weekdayMinutes.indexOf(Math.max(...weekdayMinutes));
        const weekendShare = share(weekdayMinutes[5] + weekdayMinutes[6]);
        const lateShare = share(playGrid.reduce((a, r) => a + r[0] + r[1] + r[2] + r[3] + r[4], 0));
        // Typical start: median start time, on a clock that starts at 05:00 so after-midnight play counts as late
        const startMins = periodSessions.map(s => { const d = new Date(s.startMs); return (d.getHours() * 60 + d.getMinutes() - 300 + 1440) % 1440; });
        const typicalStart = startMins.length ? Math.round(median(startMins) + 300) % 1440 : null;
        // Busiest single day
        const dayTotals = {};
        for (const x of days) if (inRange(x.key, startKey, endKey)) dayTotals[x.key] = (dayTotals[x.key] || 0) + x.minutes;
        const busiest = Object.entries(dayTotals).reduce((m, e) => (!m || e[1] > m[1] ? e : m), null);
        // Average per weekday: minutes on that weekday ÷ how many of them the tracked part of the period has
        const weekdayCount = Array(7).fill(0);
        for (let k = startKey < trackingKey ? trackingKey : startKey; k <= endKey; k = addDays(k, 1)) weekdayCount[(keyToDate(k).getDay() + 6) % 7]++;
        const platformGrids = Object.fromEntries(PLAYTIME_PLATFORMS.map(p => [p, hourGrid(periodSessions.filter(s => s.platform === p))]));
        // Time of day, overall and per platform
        const partsOf = (grid) => DAY_PARTS.map(p => ({ ...p, minutes: grid.reduce((a, r) => a + p.hours.reduce((b, h) => b + r[h], 0), 0) }));
        const dayParts = [
            { id: 'all', label: 'RA + Steam', parts: partsOf(playGrid) },
            ...PLAYTIME_PLATFORMS.map(p => ({ id: p, label: PLATFORM_LABEL[p], parts: partsOf(platformGrids[p]) })),
        ].map(r => ({ ...r, total: r.parts.reduce((a, x) => a + x.minutes, 0) }))
            .filter(r => r.total > 0 && (platform === 'all' || r.id !== 'all'));
        // Average per hour of the day, weekdays vs weekends: minutes in that hour ÷ tracked days of that kind
        const kindDays = { weekdays: weekdayCount.slice(0, 5).reduce((a, n) => a + n, 0), weekends: weekdayCount[5] + weekdayCount[6] };
        const hourAvg = Array.from({ length: 24 }, (_, h) => ({
            hour: h,
            weekdays: kindDays.weekdays ? [0, 1, 2, 3, 4].reduce((a, d) => a + playGrid[d][h], 0) / kindDays.weekdays : 0,
            weekends: kindDays.weekends ? (playGrid[5][h] + playGrid[6][h]) / kindDays.weekends : 0,
        }));
        const weekdayAvg = WEEKDAYS.map((label, i) => ({
            key: label, label,
            values: Object.fromEntries(PLAYTIME_PLATFORMS.map(p => [p, weekdayCount[i] ? platformGrids[p][i].reduce((a, v) => a + v, 0) / weekdayCount[i] : 0])),
        }));

        // ── Top games
        const perGame = {};
        const g = (p, id) => (perGame[`${p}-${id}`] ??= { platform: p, id: String(id), minutes: 0, unlocks: 0 });
        for (const x of days) if (inRange(x.key, startKey, endKey)) g(x.s.platform, x.s.gameId).minutes += x.minutes;
        for (const u of periodUnlocks) g(u.platform, u.g).unlocks++;
        // Sub line: platform dot + short name (RA: the console), then the list's own fact
        const gameRow = (x, value, sub) => ({
            key: `${x.platform}-${x.id}`,
            label: parseTitle(nameOf(x.platform, x.id)).baseTitle,
            marks: <TitleMarks platform={x.platform} name={nameOf(x.platform, x.id)} />,
            sub: <>
                <i className="an-pdot" style={{ background: PLATFORM_COLOR[x.platform] }} />
                <span className="shrink-0">{x.platform === 'ra' ? (data.meta.ra[x.id]?.console ?? 'RA') : PLATFORM_SHORT[x.platform]}</span>
                {sub != null && sub !== '' && <><span className="text-[#3a5068]">·</span><span className="truncate">{sub}</span></>}
            </>,
            value,
            color: PLATFORM_COLOR[x.platform],
            icon: data.meta[x.platform][x.id]?.icon ?? null,
            href: gameUrl(x.platform, x.id, nameOf(x.platform, x.id)),
        });
        const games = Object.values(perGame);
        const topHours = games.filter(x => x.minutes >= 1).sort((a, b) => b.minutes - a.minutes).slice(0, 8)
            .map(x => gameRow(x, x.minutes, null));
        // Most progress: share of each game's set earned in the period (sets of 10+), bigger sets first on ties
        const doneInPeriod = new Set(completions.filter(c => inRange(c.key, startKey, endKey)).map(c => `${c.platform}-${c.gameId}`));
        const mostProgress = games
            .map(x => ({ ...x, total: data.progress[`${x.platform}-${x.id}`]?.total ?? 0 }))
            .filter(x => x.unlocks && x.total >= 10)
            .map(x => ({ ...x, pct: Math.min(100, (x.unlocks / x.total) * 100) }))
            .sort((a, b) => b.pct - a.pct || b.total - a.total).slice(0, 8)
            .map(x => gameRow(x, x.pct, <>{x.unlocks} of {x.total}{doneInPeriod.has(`${x.platform}-${x.id}`) && <span className="text-[#e5b143]" title="Completed in this period"> ★</span>}</>));
        // Most days: local days with a session or an unlock in each game, more hours first on ties.
        // A habit vs a binge, which Most played can't show; Xbox counts its unlock days
        const dayCount = {};
        const dayOf = (p, id) => (dayCount[`${p}-${id}`] ??= { platform: p, id: String(id), days: new Set(), playDays: new Set(), minutes: 0, unlocks: 0 });
        for (const x of days) if (inRange(x.key, startKey, endKey) && x.minutes > 0) {
            const g = dayOf(x.s.platform, x.s.gameId);
            g.days.add(x.key); g.playDays.add(x.key); g.minutes += x.minutes;
        }
        for (const u of periodUnlocks) { const g = dayOf(u.platform, u.g); g.days.add(u.key); g.unlocks++; }
        const dayGames = Object.values(dayCount);
        const mostDays = [...dayGames].sort((a, b) => b.days.size - a.days.size || b.minutes - a.minutes).slice(0, 8)
            .map(x => gameRow(x, x.days.size, x.platform === 'xbox' ? `${x.unlocks} unlocks` : `${fmtMinutes(Math.round(x.minutes))} played`));
        // Binged: hours per day played (days with a session), games played on 2+ days and 2h+ in the period
        const binged = dayGames.filter(x => x.playDays.size >= BINGE_MIN_DAYS && x.minutes >= BINGE_MIN_MINUTES)
            .map(x => ({ ...x, perDay: x.minutes / x.playDays.size })).sort((a, b) => b.perDay - a.perDay).slice(0, 8)
            .map(x => gameRow(x, x.perDay, `${x.playDays.size} days · ${fmtMinutes(Math.round(x.minutes))}`));

        // ── Focus
        const topShare = cur.minutes && topHours.length ? Math.round((topHours[0].value / cur.minutes) * 100) : null;
        // Games per week: distinct games played or unlocked in, averaged over the period's weeks
        const perWeek = {};
        for (const x of days) if (inRange(x.key, startKey, endKey)) (perWeek[weekStartKey(x.key)] ??= new Set()).add(`${x.s.platform}-${x.s.gameId}`);
        for (const u of periodUnlocks) (perWeek[weekStartKey(u.key)] ??= new Set()).add(`${u.platform}-${u.g}`);
        const weekKeys = buildBuckets(startKey, endKey, 'week');
        const gamesPerWeek = weekKeys.length ? weekKeys.reduce((a, k) => a + (perWeek[k]?.size ?? 0), 0) / weekKeys.length : 0;
        // New games: first played or unlocked (all time) in the period
        const newGames = Object.entries(base.life)
            .filter(([k, x]) => { const [p, ...id] = k.split('-'); return keep(p, id.join('-')) && inRange(dayKey(new Date(x.first)), startKey, endKey); })
            .map(([k, x]) => { const [platform, ...id] = k.split('-'); return { platform, id: id.join('-'), key: k, ...x }; });
        const newDone = newGames.filter(x => doneInPeriod.has(x.key)).length;
        const newRows = [...newGames].sort((a, b) => b.minutes - a.minutes || b.last - a.last).slice(0, 8)
            .map(x => gameRow(x, x.minutes, x.platform === 'xbox' || doneInPeriod.has(x.key) ? <>{x.platform === 'xbox' && 'no playtime'}{doneInPeriod.has(x.key) && <span className="text-[#e5b143]" title="Completed in this period">★ Completed</span>}</> : null));
        // Tried and dropped: first played in the period (after tracking began), under an hour in total,
        // and untouched for DROPPED_IDLE_DAYS. RA/Steam only: it needs playtime.
        const idleBefore = Date.now() - DROPPED_IDLE_DAYS * 86400000;
        const dropped = newGames
            .filter(x => x.platform !== 'xbox' && dayKey(new Date(x.first)) >= trackingKey && x.minutes < DROPPED_MAX_MINUTES && x.last < idleBefore)
            .sort((a, b) => b.last - a.last);
        const droppedRows = dropped.slice(0, 8).map(x => gameRow(x, x.minutes, `last ${fmtDayKey(dayKey(new Date(x.last)))}`));
        // Comebacks: the first session or unlock in the period that follows COMEBACK_GAP_DAYS+ without
        // either in that game (all time), with real play or unlocks since. Before playtime tracking only
        // unlocks are known, so a gap that starts there can hide sessions without unlocks
        const fromMs = keyToDate(startKey).getTime(), toMs = keyToDate(addDays(endKey, 1)).getTime();
        const comebacks = [];
        for (const [k, acts] of Object.entries(base.acts)) {
            const [p, ...rest] = k.split('-'), id = rest.join('-');
            if (!keep(p, id)) continue;
            const i = acts.findIndex((ms, n) => ms >= fromMs && ms < toMs && n > 0 && ms - acts[n - 1] >= COMEBACK_GAP_DAYS * 86400000);
            if (i < 0) continue;
            const backKey = dayKey(new Date(acts[i]));
            const minutes = days.reduce((a, x) => (x.s.platform === p && x.s.gameId === id && x.key >= backKey && inRange(x.key, startKey, endKey) ? a + x.minutes : a), 0);
            const unl = periodUnlocks.reduce((a, u) => (u.platform === p && String(u.g) === id && u.key >= backKey ? a + 1 : a), 0);
            if (minutes < COMEBACK_MIN_MINUTES && unl < COMEBACK_MIN_UNLOCKS) continue;
            comebacks.push({ platform: p, id, minutes, unlocks: unl, gapDays: Math.round((acts[i] - acts[i - 1]) / 86400000) });
        }
        comebacks.sort((a, b) => b.minutes - a.minutes || b.unlocks - a.unlocks);
        const awayFor = d => (d >= 365 ? `${(d / 365).toFixed(1)} years` : `${Math.round(d / 30)} months`);
        const comebackRows = comebacks.slice(0, 8).map(x => ({
            ...gameRow(x, x.minutes, `back after ${awayFor(x.gapDays)}${x.unlocks ? ` · ${x.unlocks} unlock${x.unlocks === 1 ? '' : 's'}` : ''}`),
            ...(x.platform === 'xbox' && { text: `${x.unlocks} unlocks` }),
        }));

        // ── Sessions
        // Sessions of 5 minutes or less aren't logged by the pipelines (launches, not play)
        const LENGTHS = [['<30m', 0, 30], ['30m–1h', 30, 60], ['1–2h', 60, 120], ['2–4h', 120, 240], ['4h+', 240, Infinity]];
        const lengthBuckets = LENGTHS.map(([label]) => ({ key: label, label, values: {} }));
        for (const s of periodSessions) {
            const i = LENGTHS.findIndex(([, lo, hi]) => s.minutes >= lo && s.minutes < hi);
            lengthBuckets[i].values[s.platform] = (lengthBuckets[i].values[s.platform] || 0) + 1;
        }
        const longest = periodSessions.reduce((m, s) => (!m || s.minutes > m.minutes ? s : m), null);

        // ── Rarity
        const rarity = PLATFORMS.map(p => {
            const list = periodUnlocks.filter(u => u.platform === p && u.r != null);
            const counts = Object.fromEntries(RARITY_TIERS.map(t => [t.id, 0]));
            for (const u of list) counts[rarityTier(u.r).id]++;
            return { platform: p, total: list.length, counts };
        }).filter(r => r.total);
        const rarest = periodUnlocks.filter(u => u.r != null).sort((a, b) => a.r - b.r).slice(0, 6);

        // ── Completions & time to complete
        const periodCompletions = completions.filter(c => inRange(c.key, startKey, endKey));
        // The latest completion (any time, same filters), shown when the period has none
        const lastDone = completions.reduce((m, c) => (!m || c.ms > m.ms ? c : m), null);
        const doneCard = (c) => c && ({ key: `${c.platform}-${c.gameId}`, ms: c.ms, platform: c.platform,
            name: parseTitle(nameOf(c.platform, c.gameId)).baseTitle, icon: data.meta[c.platform][c.gameId]?.icon ?? null });
        const daysToComplete = periodCompletions
            .map(c => { const f = base.firstUnlock[`${c.platform}-${c.gameId}`]; return f != null ? (c.ms - f) / 86400000 : null; })
            .filter(v => v != null && v >= 0);

        // ── RA by console
        const byConsole = {};
        const con = (id) => data.meta.ra[String(id)]?.console ?? 'Unknown';
        for (const x of days) if (x.s.platform === 'ra' && inRange(x.key, startKey, endKey)) (byConsole[con(x.s.gameId)] ??= { minutes: 0, unlocks: 0 }).minutes += x.minutes;
        for (const u of periodUnlocks) if (u.platform === 'ra') (byConsole[con(u.g)] ??= { minutes: 0, unlocks: 0 }).unlocks++;
        const consoleRows = (field) => Object.entries(byConsole).filter(([, v]) => v[field] >= 1)
            .sort(([, a], [, b]) => b[field] - a[field]).slice(0, 8)
            .map(([name, v]) => ({ key: name, label: name, value: v[field], color: PLATFORM_COLOR.ra }));

        // ── Highlights: wide art for the top game, play per hour of the day (all days), icons of new games
        const artOf = (p, id) => (p === 'steam' ? [`${STEAM_CDN}/${id}/library_hero.jpg`, `${STEAM_CDN}/${id}/header.jpg`]
            : p === 'ra' ? [data.raArt[id]?.hero?.thumb, data.raArt[id]?.grid?.thumb] : [data.meta.xbox[id]?.art]);
        const topGameFull = topHours[0] ? { ...topHours[0], platform: topHours[0].key.split('-')[0], id: topHours[0].key.split('-').slice(1).join('-') } : null;
        const hourAll = Array.from({ length: 24 }, (_, h) => playGrid.reduce((a, r) => a + r[h], 0));
        const newIcons = [...newGames].sort((a, b) => b.minutes - a.minutes || b.last - a.last).slice(0, 5)
            .map(x => ({ key: x.key, icon: data.meta[x.platform][x.id]?.icon ?? null }));

        return {
            artOf, topGameFull, hourAll, newIcons, weekdayMinutes, peakAt: peakMinutes ? peakAt : null,
            cur, prev, prevPlayTracked, playNote,
            playBuckets, unlockBuckets, playUnit, unit,
            unlockGrid, unlockTotals, topHours,
            mostProgress, mostDays, binged,
            peak, favDay: weekdayMinutes[favDay] ? favDay : null, favDayShare: share(weekdayMinutes[favDay]), weekendShare, lateShare,
            typicalStart, busiest, dayParts, playTotal, weekdayAvg, hourAvg, kindDays,
            hourMax: niceMax(Math.max(0, ...hourAvg.flatMap(r => [r.weekdays, r.weekends]))),
            topShare, topGame: topHours[0] ?? null, gamesPerWeek, newCount: newGames.length, newDone, newRows,
            droppedCount: dropped.length, droppedRows, comebackCount: comebacks.length, comebackRows,
            // Farms are Steam games: the note only applies when Steam is in view
            farmsHidden: hideFarms && (platform === 'all' || platform === 'steam') ? data.farms.size : 0,
            lengthBuckets, longest, sessionCount: periodSessions.length,
            medianSession: median(periodSessions.map(s => s.minutes)),
            rarity, rarest, periodCompletions, daysToComplete,
            lastDone: doneCard(lastDone), doneGames: [...periodCompletions].sort((a, b) => b.ms - a.ms).slice(0, 6).map(doneCard),
            consoleHours: consoleRows('minutes'), consoleUnlocks: consoleRows('unlocks'),
            nameOf,
        };
    }, [base, range, data, hideFarms, hideIdle, period, platform]);

    const d = (k, play) => (view?.prev && (!play || view.prevPlayTracked) ? pct(view.cur[k], view.prev[k]) : null);

    // Tabs (assets/tabs.js): sticky bar, swipe on phones, kept in the URL as ?tab= (absent = overview)
    const TABS = [
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} />, color: '#66c0f4' },
        { id: 'time',     label: 'Time',     icon: <Clock size={15} />,           color: '#66c0f4' },
        { id: 'games',    label: 'Games',    icon: <Gamepad2 size={15} />,        color: '#66c0f4' },
        { id: 'achievements', label: 'Achievements', icon: <Trophy size={15} />,  color: '#e5b143' },
    ];
    const [tab, setTabState] = useState(() => {
        const q = new URLSearchParams(location.search).get('tab');
        return TABS.some(t => t.id === q) ? q : 'overview';
    });
    const tabBarRef = useRef(null);
    const tabContentRef = useRef(null);
    const setTab = (id) => {
        setTabState(id);
        const url = new URL(location.href);
        if (id === 'overview') url.searchParams.delete('tab'); else url.searchParams.set('tab', id);
        history.replaceState(null, '', url);
        scrollToTabs(tabBarRef);
    };
    const tabPeeks = {
        overview: ['heatmap', 'stats'],
        time: ['heatmap', 'heatmap'],
        games: ['stats', 'list'],
        achievements: ['heatmap', 'list'],
    };
    const [swipeDir, setSwipeDir] = useSwipeTabs(tabContentRef, TABS.map(t => t.id), tab, setTab, !!view, tabPeeks);
    const pickTab = (id) => { setSwipeDir(null); setTab(id); };

    // The Overview's metric (the two big numbers switch the chart under them) and the cards' switches
    const [metricPick, setMetric] = useState('hours');
    const metric = hasPlay ? metricPick : 'unlocks';
    const [topList, setTopList] = useState('played');
    const [newList, setNewList] = useState('new');
    const [consoleList, setConsoleList] = useState('hours');

    const fmtShortHours = (v) => (v >= 60 ? `${Math.round(v / 60)}h` : `${Math.round(v)}m`);

    // ── Tab bodies (render functions, called only once `view` exists) ──
    const overview = () => {
        const facts = [
            { label: 'Active days', value: fmtNum(view.cur.activeDays), delta: d('activeDays', true) },
            hasPlay && { label: 'Sessions', value: fmtNum(view.cur.sessions), delta: d('sessions', true) },
            hasPlay && { label: 'Avg session', value: fmtMinutes(view.cur.avgSession), delta: d('avgSession', true) },
            // Points, gamerscore and completions only when there is something to show or compare
            units.includes('ra') && (view.cur.raPoints || view.prev?.raPoints) && { label: 'RA points', value: fmtNum(view.cur.raPoints), delta: d('raPoints') },
            units.includes('xbox') && (view.cur.gamerscore || view.prev?.gamerscore) && { label: 'Gamerscore', value: fmtNum(view.cur.gamerscore), delta: d('gamerscore') },
            (view.cur.completions || view.prev?.completions) && { label: 'Completed', value: fmtNum(view.cur.completions), delta: d('completions'), gold: view.cur.completions > 0 },
        ].filter(Boolean);
        const tg = view.topGameFull;
        const rare = view.rarest[0];
        const series = metric === 'hours' ? plays : units;
        return (
            <div className="flex flex-col gap-3">
                {/* Recap: the two numbers are the switch for the trend chart under them */}
                <div className="an-card">
                    <div className={`an-metrics ${hasPlay ? '' : 'one'}`} role="tablist">
                        {hasPlay && (
                            <button role="tab" aria-selected={metric === 'hours'} className={`an-metric ${metric === 'hours' ? 'on' : ''}`} onClick={() => setMetric('hours')}>
                                <span className="an-metric-l">Hours played</span>
                                <span className="an-metric-v">{fmtHours(view.cur.minutes)}</span>
                                <span className="an-metric-s"><Delta v={d('minutes', true)} />{view.playNote && <span>{view.playNote}</span>}</span>
                            </button>
                        )}
                        <button role="tab" aria-selected={metric === 'unlocks'} className={`an-metric ${metric === 'unlocks' ? 'on' : ''}`} onClick={() => setMetric('unlocks')}>
                            <span className="an-metric-l">Unlocks</span>
                            <span className="an-metric-v">{fmtNum(view.cur.unlocks)}</span>
                            <span className="an-metric-s"><Delta v={d('unlocks')} /></span>
                        </button>
                    </div>
                    <div key={metric} className="anim-fade mt-3">
                        {!hasPlay && <div className="mb-2.5"><Crits items={[{ icon: Gamepad2, text: 'Unlocks only: Xbox reports no playtime' }]} /></div>}
                        {(metric === 'hours' ? view.cur.minutes < 1 : !view.cur.unlocks)
                            ? <div className="an-empty">{metric === 'hours' ? 'No play in this period.' : 'No unlocks in this period.'}</div>
                            : <>
                        {series.length > 1 && <div className="mb-2"><Legend items={seriesLegend(series)} /></div>}
                        {metric === 'hours'
                            ? <StackedColumns buckets={view.playBuckets} series={plays} format={fmtShortHours} height={110} />
                            : <StackedColumns buckets={view.unlockBuckets} series={units} format={fmtNum} height={110} />}
                        </>}
                    </div>
                    {facts.length > 0 && <div className="an-sep"><Facts items={facts} /></div>}
                    {/* The key to the ▲ ▼ above, drawn with the real marks */}
                    {range.prevLabel && [d('minutes', true), d('unlocks'), ...facts.map(f => f.delta)].some(v => v != null) && (
                        <div className="an-key"><span className="crit-arrows"><span className="up">▲</span><span className="down">▼</span></span>vs {range.prevLabel}</div>
                    )}
                </div>

                {/* Highlights: one answer each, tapping opens the tab with the detail */}
                <div className="an-hls">
                    {tg && (
                        <button className="an-hl wide" onClick={() => pickTab('games')}>
                            <ArtBg key={tg.key} sources={view.artOf(tg.platform, tg.id)} icon={tg.icon} />
                            <span className="an-hl-l"><Gamepad2 size={12} /> Top game</span>
                            <span className="an-hl-game">
                                {tg.icon ? <img src={tg.icon} alt="" /> : <span />}
                                <span className="min-w-0">
                                    <span className="an-hl-name">{tg.label}</span>
                                    <span className="an-hl-s"><b>{fmtMinutes(tg.value)}</b> · {view.topShare}% of play</span>
                                </span>
                            </span>
                            <span className="an-share"><span style={{ width: `${view.topShare}%`, background: PLATFORM_COLOR[tg.platform] }} /></span>
                            <ChevronRight size={14} className="an-hl-go" />
                        </button>
                    )}
                    {view.peak && (
                        <button className="an-hl" onClick={() => pickTab('time')}>
                            <span className="an-hl-l"><Clock size={12} /> Peak time</span>
                            <span className="an-hl-v">{view.peak.label}</span>
                            <span className="an-hl-s">{view.peak.share}% of play</span>
                            <MiniBars values={view.hourAll} hi={view.peakAt != null ? [view.peakAt % 24, (view.peakAt + 1) % 24] : []} labels={['00', '06', '12', '18', '24']} />
                        </button>
                    )}
                    {view.favDay != null && (
                        <button className="an-hl" onClick={() => pickTab('time')}>
                            <span className="an-hl-l"><CalendarDays size={12} /> Favorite day</span>
                            <span className="an-hl-v">{WEEKDAY_NAMES[view.favDay]}</span>
                            <span className="an-hl-s">{view.favDayShare}% of play</span>
                            <MiniBars values={view.weekdayMinutes} hi={[view.favDay]} labels={WEEKDAYS.map(w => w[0])} />
                        </button>
                    )}
                    <button className="an-hl" onClick={() => pickTab('games')}>
                        <span className="an-hl-l"><Sparkles size={12} /> New games</span>
                        <span className="an-hl-v">{fmtNum(view.newCount)}</span>
                        <span className="an-hl-s">{view.newDone ? <span className="text-[#e5b143]">★ {view.newDone} completed</span> : view.newCount ? 'first played' : 'none this period'}</span>
                        {view.newIcons.length > 0 && <span className="an-hl-icons">{view.newIcons.map(x => x.icon ? <img key={x.key} src={x.icon} alt="" /> : <span key={x.key} />)}</span>}
                    </button>
                    {rare && (
                        <button className="an-hl" onClick={() => pickTab('achievements')}>
                            <span className="an-hl-l"><Gem size={12} /> Rarest unlock</span>
                            <span className="an-hl-v" style={{ color: rarityTier(rare.r).color }}>{rare.r}%</span>
                            <span className="an-hl-s an-hl-clamp"><span className="text-[#c6d4df]">{rare.n}</span> · {parseTitle(view.nameOf(rare.platform, rare.g)).baseTitle}</span>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const timeTab = () => (
        <div className="an-grid">
            {hasPlay ? <>
                <ChartCard title="Daily rhythm" pill={view.playNote} className="an-span"
                    table={{ columns: ['Hour', 'Played'], rows: view.hourAll.map((m, h) => [`${hh(h)}:00`, fmtMinutes(m)]) }}>
                    {view.playTotal ? <div className="an-rhythm-wrap">
                        <div className="an-rhythm">
                            <PlayClock byHour={view.hourAll} start={view.typicalStart} />
                            <div className="an-flist">
                                {[
                                    view.peak && ['Peak time', view.peak.label, `${view.peak.share}% of play`],
                                    view.favDay != null && ['Favorite day', WEEKDAY_NAMES[view.favDay], `${view.favDayShare}% of play`],
                                    ['Weekends', `${view.weekendShare}%`, 'of play · 29% of days'],
                                    ['After midnight', `${view.lateShare}%`, 'of play · 00–05'],
                                    view.busiest && ['Busiest day', fmtMinutes(view.busiest[1]), fmtDayKey(view.busiest[0])],
                                ].filter(Boolean).map(([l, v, s]) => (
                                    <div key={l} className="an-frow"><span className="an-frow-l">{l}</span><span className="an-frow-v">{v}</span><span className="an-frow-s">{s}</span></div>
                                ))}
                            </div>
                        </div>
                        <div className="an-sep an-parts flex flex-col gap-3">
                            <Legend items={DAY_PARTS.map(p => ({ label: `${p.label} ${p.range}`, color: p.color }))} />
                            {view.dayParts.map(r => <DayPartBar key={r.id} row={r} labels={r.id === 'all' || platform !== 'all'} />)}
                        </div>
                    </div> : <div className="an-empty">No playtime in this period.</div>}
                </ChartCard>
                <ChartCard title="By hour" pill={view.playNote}
                    legend={HOUR_SERIES.map(s => ({ label: `${s.label} · ${view.kindDays[s.id]} days`, color: s.color }))}
                    table={{ columns: ['Hour', 'Weekdays', 'Weekends'], rows: view.hourAvg.map(r => [`${hh(r.hour)}:00`, fmtMinutes(r.weekdays), fmtMinutes(r.weekends)]) }}>
                    <HourLines rows={view.hourAvg} max={view.hourMax} />
                </ChartCard>
                <ChartCard title="Per weekday" pill={view.playNote}
                    legend={plays.length > 1 ? seriesLegend(plays) : null}
                    table={seriesTable('Day', view.weekdayAvg.map(b => ({ ...b, label: WEEKDAY_NAMES[WEEKDAYS.indexOf(b.label)] })), plays, fmtMinutes)}>
                    <StackedColumns buckets={view.weekdayAvg} series={plays} format={v => fmtMinutes(v)} height={120} />
                </ChartCard>
                <ChartCard title="Sessions" className="an-span"
                    subtitle={view.sessionCount ? (
                        <span className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            <span><b className="text-white font-semibold">{fmtNum(view.sessionCount)}</b> · median <b className="text-white font-semibold">{fmtMinutes(view.medianSession)}</b> · longest <b className="text-white font-semibold">{fmtMinutes(view.longest.minutes)}</b>, {parseTitle(view.nameOf(view.longest.platform, view.longest.gameId)).baseTitle}</span>
                            <TitleMarks platform={view.longest.platform} name={view.nameOf(view.longest.platform, view.longest.gameId)} />
                        </span>
                    ) : null}
                    legend={plays.length > 1 && view.sessionCount ? seriesLegend(plays) : null}
                    table={seriesTable('Length', view.lengthBuckets, plays, fmtNum, false)}>
                    {view.sessionCount ? <StackedColumns buckets={view.lengthBuckets} series={plays} format={fmtNum} height={100} /> : <div className="an-empty">No sessions in this period.</div>}
                </ChartCard>
            </> : (
                <div className="an-span"><Crits items={[{ icon: Gamepad2, text: 'Unlocks only: Xbox reports no playtime' }]} /></div>
            )}
            <ChartCard title="Unlocks by hour" className="an-span"
                table={{ columns: ['Day', ...Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))], rows: view.unlockGrid.map((r, i) => [WEEKDAYS[i], ...r.map(v => (v ? fmtAvg(v) : ''))]) }}>
                <Punchcard cells={view.unlockGrid} totals={view.unlockTotals} />
            </ChartCard>
        </div>
    );

    const gamesTab = () => {
        const lists = [
            hasPlay && { id: 'played', label: 'Most played', rows: view.topHours, format: fmtMinutes },
            { id: 'days', label: 'Most days', rows: view.mostDays, format: v => `${v} day${v === 1 ? '' : 's'}`,
                rules: [{ icon: CalendarCheck, text: 'Days played or unlocked' }] },
            { id: 'progress', label: 'Progress', rows: view.mostProgress, format: v => `${Math.round(v)}%`, max: 100,
                rules: [{ icon: ListChecks, text: <>Sets of <b>10+</b></> }, { icon: Star, text: 'Completed', gold: true }] },
            hasPlay && { id: 'binged', label: 'Binged', rows: view.binged, format: v => `${fmtMinutes(Math.round(v))}`,
                rules: [{ icon: Moon, text: 'Per day played' }, { icon: Timer, text: <><b>{BINGE_MIN_DAYS}+</b> days · <b>{BINGE_MIN_MINUTES / 60}h+</b></> }],
                empty: `No game played on ${BINGE_MIN_DAYS}+ days for ${BINGE_MIN_MINUTES / 60}h+ in this period.` },
        ].filter(Boolean);
        const list = lists.find(l => l.id === topList) ?? lists[0];
        const nl = !hasPlay && newList === 'dropped' ? 'new' : newList;
        return (
            <div className="flex flex-col gap-3">
                <div className="an-card">
                    <Facts items={[
                        hasPlay && { label: 'Top game share', value: view.topShare != null ? `${view.topShare}%` : '–', note: 'of playtime' },
                        { label: 'Games per week', value: view.gamesPerWeek ? view.gamesPerWeek.toFixed(1) : '–', note: 'played or unlocked' },
                        { label: 'New games', value: fmtNum(view.newCount), note: view.newDone ? <span className="text-[#e5b143]">★ {view.newDone} completed</span> : 'first played' },
                        hasPlay && { label: 'Tried and dropped', value: fmtNum(view.droppedCount), note: `<1h, idle ${DROPPED_IDLE_DAYS}d+` },
                    ].filter(Boolean)} />
                </div>
                <div className="an-grid">
                    <ChartCard title="Top games">
                        <Seg items={lists.map(l => [l.id, l.label])} value={list.id} onChange={setTopList} />
                        <div key={list.id} className="anim-fade">
                            {list.rules && <div className="mb-2.5"><Crits items={list.rules} /></div>}
                            <BarList rows={list.rows} format={list.format} max={list.max} empty={list.empty} />
                        </div>
                    </ChartCard>
                    <ChartCard title="New games">
                        <Seg items={[
                            ['new', <>New <span className="n">{view.newCount}</span></>],
                            ['back', <>Comebacks <span className="n">{view.comebackCount}</span></>],
                            hasPlay && ['dropped', <>Dropped <span className="n">{view.droppedCount}</span></>],
                        ].filter(Boolean)} value={nl} onChange={setNewList} />
                        <div key={nl} className="anim-fade">
                            {nl === 'back' && <div className="mb-2.5"><Crits items={[{ icon: RotateCcw, text: <>Back after <b>{COMEBACK_GAP_DAYS}+</b> days</> }]} /></div>}
                            {nl === 'new'
                                ? <BarList rows={view.newRows} format={fmtMinutes} empty="No new games in this period." />
                                : nl === 'back'
                                ? <BarList rows={view.comebackRows} format={fmtMinutes} empty={`No game came back after ${COMEBACK_GAP_DAYS}+ days away in this period.`} />
                                : <BarList rows={view.droppedRows} format={fmtMinutes} max={DROPPED_MAX_MINUTES}
                                    empty={period === '30d' ? `None yet: a game needs ${DROPPED_IDLE_DAYS} idle days to count.` : 'No dropped games in this period.'} />}
                        </div>
                    </ChartCard>
                </div>
            </div>
        );
    };

    const achievementsTab = () => {
        const cl = hasPlay ? consoleList : 'unlocks';
        const done = view.periodCompletions.length;
        return (
            <div className="an-grid">
                <ChartCard title="Rarity" rules={[{ icon: Users, text: '% of players who have it' }]}
                    legend={RARITY_TIERS.map(t => ({ label: t.label, color: t.color }))}
                    table={{ columns: ['Platform', ...RARITY_TIERS.map(t => t.label)], rows: view.rarity.map(r => [PLATFORM_SHORT[r.platform], ...RARITY_TIERS.map(t => r.counts[t.id])]) }}>
                    {view.rarity.length === 0
                        ? <div className="an-empty">No unlocks in this period.</div>
                        : <div className="flex flex-col gap-2.5">{view.rarity.map(r => <RarityBar key={r.platform} row={r} />)}</div>}
                    {view.rarest.length > 0 && (
                        <div className="an-sep">
                            <div className="an-sub">Rarest unlocks</div>
                            <div className="an-blist">
                                {view.rarest.map(u => {
                                    const icon = data.meta[u.platform][String(u.g)]?.icon;
                                    return (
                                        <div key={`${u.platform}-${u.g}-${u.a}`} className="an-brow">
                                            {icon ? <img src={icon} alt="" className="an-bicon" loading="lazy" /> : <span className="an-bicon" />}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className="an-bname">{u.n}</span>
                                                    <span className="ml-auto an-bval" style={{ color: rarityTier(u.r).color }}>{u.r}%</span>
                                                </div>
                                                <div className="an-bsub">
                                                    <i className="an-pdot" style={{ background: PLATFORM_COLOR[u.platform] }} />
                                                    <span className="truncate">{parseTitle(view.nameOf(u.platform, u.g)).baseTitle}</span>
                                                    <TitleMarks platform={u.platform} name={view.nameOf(u.platform, u.g)} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </ChartCard>
                <ChartCard title="Completion"
                    table={{ columns: ['Platform', 'Stage', 'Games', 'Kept'], rows: units.flatMap(p => data.funnel[p].map(([label, n], i) => [PLATFORM_SHORT[p], label, fmtNum(n), i && data.funnel[p][i - 1][1] ? `${Math.round((n / data.funnel[p][i - 1][1]) * 100)}%` : '–'])) }}>
                    {done ? (
                        <div className="an-done">
                            <span className="an-done-ic on"><Star size={16} /></span>
                            <div className="min-w-0 flex-1">
                                <div className="an-done-v">{fmtNum(done)} <span>completed</span></div>
                                <div className="an-hl-s">{view.daysToComplete.length ? <>median <b>{Math.round(median(view.daysToComplete))} days</b> from first unlock</> : 'in this period'}</div>
                            </div>
                            <span className="an-done-icons">{view.doneGames.map(g => g.icon ? <img key={g.key} src={g.icon} alt="" title={g.name} /> : <span key={g.key} />)}</span>
                        </div>
                    ) : view.lastDone ? (
                        // None in the period: the latest one instead of a lone zero
                        <div className="an-done">
                            {view.lastDone.icon ? <img src={view.lastDone.icon} alt="" className="an-done-game" /> : <span className="an-done-game" />}
                            <div className="min-w-0">
                                <div className="an-hl-s">Last completed</div>
                                <div className="an-done-name">{view.lastDone.name}</div>
                                <div className="an-hl-s"><span className="text-[#e5b143]">★ {agoLabel(view.lastDone.ms)}</span> · none in this period</div>
                            </div>
                        </div>
                    ) : <div className="an-empty">No completions yet.</div>}
                    <div className="an-sep">
                        <div className="an-sub">Funnel <span className="cpill">All time</span></div>
                        <div className="flex flex-col gap-4">
                            {units.map(p => <Funnel key={p} platform={p} stages={data.funnel[p]} color={PLATFORM_COLOR[p]} />)}
                        </div>
                    </div>
                </ChartCard>
                {units.includes('ra') && (view.consoleHours.length > 0 || view.consoleUnlocks.length > 0) && (
                    <ChartCard title="RetroAchievements by console" className="an-span">
                        {hasPlay && <Seg items={[['hours', 'Hours played'], ['unlocks', 'Achievements']]} value={cl} onChange={setConsoleList} />}
                        <div key={cl} className="anim-fade">
                            {cl === 'hours'
                                ? <BarList rows={view.consoleHours} format={fmtMinutes} />
                                : <BarList rows={view.consoleUnlocks} format={fmtNum} />}
                        </div>
                    </ChartCard>
                )}
            </div>
        );
    };

    return (
        <TipContext.Provider value={tipApi}>
        <div className="bg-[#171a21] text-[#c6d4df] min-h-screen flex flex-col font-sans selection:bg-[#66c0f4] selection:text-[#171a21]">

            {/* Topbar */}
            <div className="page-topbar sticky top-0 z-50 bg-[#131a22] border-b border-[#101214] px-4 md:px-8 py-1.5 flex items-center gap-2 text-[10px]">
                <a href="../" className="text-[#546270] font-bold tracking-[0.15em] uppercase hover:text-[#8f98a0] transition-colors">Yozuryu</a>
                <span className="text-[#2a475e]">›</span>
                <a href="../" className="text-[#546270] hover:text-[#8f98a0] transition-colors">Gaming Hub</a>
                <span className="text-[#2a475e]">›</span>
                <span className="text-[#c6d4df]">Analytics</span>
            </div>

            {/* Header: title and the dates, then period and platform, which scope every tab */}
            <header className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 pt-8 pb-4 md:pt-5 shadow-md">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="w-[3px] h-6 bg-[#66c0f4] rounded-[1px] shrink-0" />
                        <h1 className="text-2xl md:text-[26px] text-white font-medium tracking-wide leading-none flex items-center gap-3">
                            <BarChart3 size={22} className="text-[#66c0f4]" /> Analytics
                        </h1>
                        <span className="ml-auto an-range" title={`Days and hours are shown in your timezone (${TZ})`}>
                            <CalendarDays size={12} /> {fmtDayKey(range.startKey)} – {fmtDayKey(range.endKey)}
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="frow" role="group" aria-label="Period">
                            {PERIODS.map(p => (
                                <button key={p.id} onClick={() => choosePeriod(p.id)} aria-pressed={period === p.id}
                                    className={`fchip ${period === p.id ? 'on' : ''}`}>{p.label}</button>
                            ))}
                        </div>
                        <div className="frow" role="group" aria-label="Platform">
                            {[['all', 'All'], ...PLATFORMS.map(p => [p, PLATFORM_SHORT[p]])].map(([id, label]) => (
                                <button key={id} onClick={() => choosePlatform(id)} aria-pressed={platform === id}
                                    className={`fchip ${platform === id ? 'on' : ''}`}>{label}</button>
                            ))}
                            <span className="fsep" />
                            <button onClick={toggleFarms} aria-pressed={hideFarms} className={`fchip ${hideFarms ? 'on' : ''}`}
                                title={`Steam games with ${FARM_MIN_UNLOCKS}+ unlocks earning more than ${FARM_PER_HOUR} achievements per hour of playtime${data ? `:\n${[...data.farms].map(k => data.meta.steam[k.slice(6)]?.name ?? k).join(', ')}` : ''}`}>
                                {hideFarms ? <Check size={12} /> : <Plus size={12} />}Hide farms{data && <span className="n anim-fade">{data.farms.size}</span>}
                            </button>
                            {data?.idle.size > 0 && (
                                <button onClick={toggleIdle} aria-pressed={hideIdle} className={`fchip anim-fade ${hideIdle ? 'on' : ''}`}
                                    title={`Games left running, marked in the admin:\n${[...data.idle].map(k => { const [p, ...id] = k.split('-'); return data.meta[p]?.[id.join('-')]?.name ?? k; }).join(', ')}`}>
                                    {hideIdle ? <Check size={12} /> : <Plus size={12} />}Hide idle<span className="n">{data.idle.size}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 md:px-8 pt-3 md:pt-5 pb-6 flex-1 w-full">
                <div className="ptabs-anchor" />
                <TabBar barRef={tabBarRef} active={tab} onChange={pickTab} tabs={TABS} />
                {/* The swipe listener sits on the stable wrapper; the keyed child is replaced on every tab,
                    period, platform or farm change, so each fades in */}
                <div ref={tabContentRef}>
                    {!view ? <Skeleton tab={tab} /> : (
                        <div key={`${tab}-${period}-${platform}-${hideFarms}-${hideIdle}`} className={swipeDir === 'swipe' ? '' : 'anim-in'}>
                            {tab === 'overview' && overview()}
                            {tab === 'time' && timeTab()}
                            {tab === 'games' && gamesTab()}
                            {tab === 'achievements' && achievementsTab()}
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-[#1b2838] border-t-2 border-[#2a475e] px-4 md:px-8 py-2.5 flex items-center gap-3 mt-auto">
                <div className="w-[3px] h-[18px] rounded-[1px] bg-[#66c0f4] opacity-50 shrink-0" />
                <p className="text-[10px] text-[#546270]">Personal gaming hub · Analytics</p>
                <a href="../" className="ml-auto text-[10px] text-[#546270] hover:text-[#66c0f4] transition-colors">← Back to hub</a>
            </footer>

            {showScrollTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="scroll-top-btn anim-fade fixed bottom-14 right-4 z-50 w-10 h-10 bg-[#131a22] border border-[#2a475e] hover:border-[#66c0f4] hover:text-[#66c0f4] text-[#8f98a0] rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90"
                    title="Scroll to top"
                >
                    <ChevronDown size={16} className="rotate-180" />
                </button>
            )}

            <Tooltip tip={tip} />
        </div>
        </TipContext.Provider>
    );
};

// Legend and table for a chart stacked by platform, limited to the series shown
const seriesLegend = (series) => series.map(p => ({ label: PLATFORM_SHORT[p], color: PLATFORM_COLOR[p] }));
const seriesTable = (first, buckets, series, format, total = true) => ({
    columns: [first, ...series.map(p => PLATFORM_SHORT[p]), ...(total && series.length > 1 ? ['Total'] : [])],
    rows: buckets.map(b => [b.label, ...series.map(p => format(b.values[p])), ...(total && series.length > 1 ? [format(series.reduce((a, p) => a + (b.values[p] || 0), 0))] : [])]),
});

// Average minutes per hour of the day, weekdays and weekends in separate cards
const HOUR_SERIES = [
    { id: 'weekdays', label: 'Weekdays', color: '#c6d4df' },
    { id: 'weekends', label: 'Weekends', color: '#66c0f4' },
];

// 100% bar of playtime by part of the day, 2px gaps; `labels` adds percentages under each part
const DayPartBar = ({ row, labels }) => {
    const { parts, total } = row;
    const shown = parts.filter(p => p.minutes > 0);
    return (
        <div>
            <div className="flex items-baseline justify-between text-[10px] mb-1">
                <span className="text-[#c6d4df]">{row.label}</span>
                <span className="text-[#546270]">{fmtMinutes(total)}</span>
            </div>
            <div className={`flex gap-[2px] ${labels ? 'h-[14px]' : 'h-[10px]'}`}>
                {shown.map(p => <DayPartSegment key={p.id} part={p} total={total} who={row.label} />)}
            </div>
            {labels && <div className="flex gap-[2px] mt-1.5">
                {shown.map(p => (
                    <div key={p.id} className="min-w-0 text-[10px] leading-tight" style={{ width: `${(p.minutes / total) * 100}%`, minWidth: 3 }}>
                        {p.minutes / total >= 0.08 && <><div className="text-[#c6d4df] font-semibold">{Math.round((p.minutes / total) * 100)}%</div><div className="text-[9px] text-[#546270] truncate">{p.label}</div></>}
                    </div>
                ))}
            </div>}
        </div>
    );
};

const DayPartSegment = ({ part, total, who }) => {
    const tip = useTip(() => ({ title: `${who} · ${part.label} ${part.range}`, rows: [{ color: part.color, value: fmtMinutes(part.minutes), label: `${Math.round((part.minutes / total) * 100)}% of play` }] }));
    return <div className="h-full first:rounded-l-[2px] last:rounded-r-[2px] outline-none hover:brightness-125 focus:brightness-125" style={{ width: `${(part.minutes / total) * 100}%`, minWidth: 3, background: part.color }} {...tip} />;
};

// 100% stacked bar of rarity tiers for one platform, 2px gaps between segments
const RarityBar = ({ row }) => (
    <div>
        <div className="flex items-baseline justify-between text-[10px] mb-1">
            <span className="text-[#c6d4df]">{PLATFORM_LABEL[row.platform]}</span>
            <span className="text-[#546270]">{fmtNum(row.total)}</span>
        </div>
        <div className="flex gap-[2px] h-[10px]">
            {RARITY_TIERS.filter(t => row.counts[t.id]).map(t => <RaritySegment key={t.id} tier={t} n={row.counts[t.id]} total={row.total} platform={row.platform} />)}
        </div>
    </div>
);

const RaritySegment = ({ tier, n, total, platform }) => {
    const tip = useTip(() => ({ title: `${PLATFORM_SHORT[platform]} · ${tier.label}`, rows: [{ color: tier.color, value: fmtNum(n), label: `${Math.round((n / total) * 100)}% of unlocks` }] }));
    return <div className="h-full first:rounded-l-[2px] last:rounded-r-[2px] outline-none hover:brightness-125 focus:brightness-125" style={{ width: `${(n / total) * 100}%`, minWidth: 3, background: tier.color }} {...tip} />;
};

// One platform's funnel: its stages as rows, each bar relative to the first stage, with the share
// kept from the stage before
const Funnel = ({ platform, stages, color }) => {
    const first = stages[0]?.[1] || 1;
    return (
        <div>
            <div className="an-fun-h"><i className="an-pdot" style={{ background: color }} />{PLATFORM_LABEL[platform]}</div>
            <div className="flex flex-col gap-1.5">
                {stages.map(([label, n], i) => (
                    <div key={label} className="an-fun-row">
                        <span className="an-fun-l">{label}</span>
                        <span className="an-fun-track"><span style={{ width: `${n ? Math.max(1.5, (n / first) * 100) : 0}%`, background: color, opacity: 1 - i * 0.16 }} /></span>
                        <span className="an-fun-n">{fmtNum(n)}</span>
                        <span className="an-fun-p">{i > 0 ? (stages[i - 1][1] ? `${Math.round((n / stages[i - 1][1]) * 100)}%` : '–') : ''}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

createRoot(document.getElementById('root')).render(<App />);
