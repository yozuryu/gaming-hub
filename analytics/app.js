import React, { useState, useEffect, useMemo, useContext, createContext } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart3, ChevronDown, Table } from 'lucide-react';
import { TZ, dayKey, todayKey, addDays, keyToDate, splitByDay, fmtDayKey } from '../assets/time.js';
import {
    RA_MEDIA, PLATFORMS, PLATFORM_COLOR, PLATFORM_LABEL, PLATFORM_SHORT, RARITY_TIERS, rarityTier, HEAT_RAMP,
    fmtMinutes, fmtHours, fmtNum, parseTitle, xboxImg, gameUrl, niceMax, median,
} from './utils.js';

// Playtime logging started in 2026 (data/{ra,steam}/playtime/{YYYY}.json)
const PLAYTIME_FIRST_YEAR = 2026;
const PLAYTIME_PLATFORMS = ['ra', 'steam'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const fetchJson = (url) => fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null);

// ── Periods ───────────────────────────────────────────────────────────────────
// All ranges are local day keys (inclusive), so every metric uses the viewer's days.

const PERIODS = [
    { id: '30d',  label: '30 days' },
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

// Bucket keys between two day keys for a unit
const bucketKeyOf = (key, unit) => (unit === 'day' ? key : unit === 'month' ? key.slice(0, 7) : key.slice(0, 4));
const buildBuckets = (startKey, endKey, unit) => {
    const keys = [];
    if (unit === 'day') {
        for (let k = startKey; k <= endKey; k = addDays(k, 1)) keys.push(k);
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
    if (unit === 'day') return keyToDate(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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
            <div className="text-[9px] uppercase tracking-[0.07em] text-[#8f98a0] mb-1">{tip.title}</div>
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

const SectionHeader = ({ title, gold, note }) => (
    <div className="flex items-center gap-2 border-b border-[#2a475e] pb-1.5 mb-3">
        <span className="w-[3px] h-[14px] rounded-[1px] shrink-0" style={{ background: gold ? '#e5b143' : '#66c0f4' }} />
        <span className="text-[13px] text-white tracking-wide uppercase font-medium">{title}</span>
        {note && <span className="text-[10px] text-[#546270] ml-auto text-right">{note}</span>}
    </div>
);

const Legend = ({ items }) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {items.map(it => (
            <span key={it.label} className="flex items-center gap-1.5 text-[9px] text-[#8f98a0] uppercase tracking-[0.07em]">
                <span className="w-2 h-2 rounded-[1px]" style={{ background: it.color }} /> {it.label}
            </span>
        ))}
    </div>
);

// A chart card with a Table toggle, so no value is only reachable by hovering
const ChartCard = ({ title, subtitle, legend, table, children }) => {
    const [showTable, setShowTable] = useState(false);
    return (
        <div className="bg-[#1b2838] border border-[#2a475e] rounded-[3px] p-3 min-w-0">
            <div className="flex items-start gap-2 mb-3">
                <div className="min-w-0">
                    <div className="text-[11px] text-[#c6d4df] font-semibold uppercase tracking-[0.07em]">{title}</div>
                    {subtitle && <div className="text-[9px] text-[#546270] mt-0.5">{subtitle}</div>}
                </div>
                {table && (
                    <button onClick={() => setShowTable(v => !v)}
                        className={`ml-auto shrink-0 flex items-center gap-1 text-[9px] uppercase tracking-[0.07em] px-1.5 py-[2px] rounded-[2px] border transition-colors ${
                            showTable ? 'border-[#66c0f4] text-[#c6d4df]' : 'border-[#2a475e] text-[#546270] hover:text-[#c6d4df]'
                        }`}>
                        <Table size={10} /> Table
                    </button>
                )}
            </div>
            {legend && !showTable && <div className="mb-2.5"><Legend items={legend} /></div>}
            {showTable ? <DataTable {...table} /> : children}
        </div>
    );
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
const BarList = ({ rows, format, empty = 'Nothing in this period.' }) => {
    if (!rows.length) return <div className="text-[10px] text-[#546270] italic py-2">{empty}</div>;
    const max = Math.max(...rows.map(r => r.value));
    return (
        <div className="flex flex-col gap-1.5">
            {rows.map(r => (
                <div key={r.key} className="flex items-center gap-2 min-w-0">
                    {r.icon !== undefined && (
                        <div className="w-5 h-5 shrink-0 rounded-[2px] overflow-hidden border border-[#101214] bg-black">
                            {r.icon ? <img src={r.icon} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full bg-[#2a475e]" />}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                            {r.href
                                ? <a href={r.href} target="_blank" rel="noreferrer" className="text-[10px] text-[#c6d4df] hover:text-[#66c0f4] truncate transition-colors">{r.label}</a>
                                : <span className="text-[10px] text-[#c6d4df] truncate">{r.label}</span>}
                            {r.sub && <span className="text-[9px] text-[#546270] truncate">{r.sub}</span>}
                            <span className="ml-auto text-[10px] text-[#c6d4df] font-semibold shrink-0">{format(r.value)}</span>
                        </div>
                        <div className="h-[3px] mt-0.5 bg-[#101214] rounded-[1px]">
                            <div className="h-full rounded-[1px]" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: r.color }} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Day-of-week × hour grid; cells: [7][24] numbers
const Punchcard = ({ cells, format, unitLabel }) => {
    const max = Math.max(0, ...cells.flat());
    const color = (v) => {
        if (!v) return HEAT_RAMP[0];
        const r = v / max;
        return r >= 0.75 ? HEAT_RAMP[4] : r >= 0.5 ? HEAT_RAMP[3] : r >= 0.25 ? HEAT_RAMP[2] : HEAT_RAMP[1];
    };
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
                        {row.map((v, h) => <PunchCell key={h} v={v} d={d} h={h} color={color(v)} format={format} unitLabel={unitLabel} />)}
                    </div>
                ))}
            </div>
        </div>
    );
};

const PunchCell = ({ v, d, h, color, format, unitLabel }) => {
    const tip = useTip(() => ({
        title: `${WEEKDAYS[d]} ${String(h).padStart(2, '0')}:00–${String((h + 1) % 24).padStart(2, '0')}:00`,
        rows: [{ value: format(v), label: unitLabel }],
    }));
    return <div className="flex-1 h-[12px] rounded-[2px] outline-none hover:brightness-150 focus:brightness-150" style={{ background: color }} {...tip} />;
};

const StatTile = ({ label, value, delta, note }) => (
    <div className="bg-[#1b2838] border border-[#2a475e] rounded-[3px] px-3 py-2.5 min-w-0">
        <div className="text-[9px] text-[#8f98a0] uppercase tracking-[0.07em] truncate">{label}</div>
        <div className="text-[20px] text-white font-semibold leading-tight mt-0.5 truncate">{value}</div>
        <div className="text-[9px] text-[#546270] mt-0.5 truncate h-[13px]">
            {delta != null ? (
                <span className={delta > 0 ? 'text-[#8fbf6a]' : delta < 0 ? 'text-[#c87a6a]' : ''}>
                    {delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {Math.abs(delta)}%
                </span>
            ) : null}
            {delta != null && note ? <span> · {note}</span> : note}
        </div>
    </div>
);

const Skeleton = () => (
    <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[...Array(8)].map((_, i) => <div key={i} className="shimmer h-[66px] rounded-[3px]" />)}
        </div>
        {[...Array(3)].map((_, i) => (
            <div key={i} className="grid md:grid-cols-2 gap-3">
                <div className="shimmer h-[210px] rounded-[3px]" />
                <div className="shimmer h-[210px] rounded-[3px]" />
            </div>
        ))}
    </div>
);

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadAll() {
    const [raProfile, steamProfile, xboxProfile, steamIndex, xboxIndex, ...historyIdx] = await Promise.all([
        fetchJson('../data/ra/profile.json'),
        fetchJson('../data/steam/profile.json'),
        fetchJson('../data/xbox/profile.json'),
        fetchJson('../data/steam/games/index.json'),
        fetchJson('../data/xbox/games/index.json'),
        ...PLATFORMS.map(p => fetchJson(`../data/${p}/history/index.json`)),
    ]);

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
    for (const [id, g] of Object.entries(xboxIndex?.achievementProgress ?? {})) put('xbox', id, { name: g.gameName, icon: xboxImg(g.iconUrl, 64) });
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
            ['Perfect', steamProfile?.stats?.perfectCount ?? 0],
        ],
        xbox: [
            ['Owned', xboxProfile?.stats?.totalGames ?? 0],
            ['Started', xboxProfile?.stats?.gamesStarted ?? 0],
            ['Completed', xboxProfile?.stats?.perfectCount ?? 0],
        ],
    };

    return { unlocks, sessions, meta, completions, funnel };
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
        return { days, unlocks, completions, firstUnlockKey, trackingKey, firstUnlock };
    }, [data]);

    const range = useMemo(() => buildRange(period, base?.firstUnlockKey), [period, base]);

    const view = useMemo(() => {
        if (!base) return null;
        const { days, unlocks, completions, trackingKey } = base;
        const { startKey, endKey, prevStartKey, prevEndKey } = range;
        const nameOf = (p, id) => data.meta[p][String(id)]?.name ?? `#${id}`;

        // ── Totals for a range
        const totals = (a, b) => {
            const d = days.filter(x => inRange(x.key, a, b));
            const sess = data.sessions.filter(s => inRange(dayKey(new Date(s.endMs)), a, b));
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
        const periodSessions = data.sessions.filter(s => inRange(dayKey(new Date(s.endMs)), startKey, endKey));
        const periodUnlocks = unlocks.filter(u => inRange(u.key, startKey, endKey));
        const playGrid = hourGrid(periodSessions);
        const unlockGrid = Array.from({ length: 7 }, () => Array(24).fill(0));
        for (const u of periodUnlocks) { const d = new Date(u.ms); unlockGrid[(d.getDay() + 6) % 7][d.getHours()]++; }

        // ── Top games
        const perGame = {};
        const g = (p, id) => (perGame[`${p}-${id}`] ??= { platform: p, id: String(id), minutes: 0, unlocks: 0 });
        for (const x of days) if (inRange(x.key, startKey, endKey)) g(x.s.platform, x.s.gameId).minutes += x.minutes;
        for (const u of periodUnlocks) g(u.platform, u.g).unlocks++;
        const gameRow = (x, value, sub) => ({
            key: `${x.platform}-${x.id}`,
            label: parseTitle(nameOf(x.platform, x.id)).baseTitle,
            sub, value,
            color: PLATFORM_COLOR[x.platform],
            icon: data.meta[x.platform][x.id]?.icon ?? null,
            href: gameUrl(x.platform, x.id, nameOf(x.platform, x.id)),
        });
        const games = Object.values(perGame);
        const topHours = games.filter(x => x.minutes >= 1).sort((a, b) => b.minutes - a.minutes).slice(0, 8)
            .map(x => gameRow(x, x.minutes, PLATFORM_SHORT[x.platform]));
        const topUnlocks = games.filter(x => x.unlocks).sort((a, b) => b.unlocks - a.unlocks).slice(0, 8)
            .map(x => gameRow(x, x.unlocks, PLATFORM_SHORT[x.platform]));
        const perAch = games.filter(x => x.unlocks >= 3 && x.minutes >= 30)
            .map(x => ({ ...x, mpa: x.minutes / x.unlocks })).sort((a, b) => a.mpa - b.mpa).slice(0, 8)
            .map(x => gameRow(x, x.mpa, `${x.unlocks} in ${fmtMinutes(x.minutes)}`));

        // ── Sessions
        const LENGTHS = [['<5m', 0, 5], ['5–30m', 5, 30], ['30m–1h', 30, 60], ['1–2h', 60, 120], ['2–4h', 120, 240], ['4h+', 240, Infinity]];
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

        return {
            cur, prev, prevPlayTracked, playNote,
            playBuckets, unlockBuckets, playUnit, unit,
            playGrid, unlockGrid, topHours, topUnlocks, perAch,
            lengthBuckets, longest, sessionCount: periodSessions.length,
            medianSession: median(periodSessions.map(s => s.minutes)),
            rarity, rarest, periodCompletions, daysToComplete,
            consoleHours: consoleRows('minutes'), consoleUnlocks: consoleRows('unlocks'),
            nameOf,
        };
    }, [base, range, data]);

    const d = (k, play) => (view?.prev && (!play || view.prevPlayTracked) ? pct(view.cur[k], view.prev[k]) : null);
    const periodLabel = PERIODS.find(p => p.id === period).label;

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

            {/* Header */}
            <header className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 pt-8 pb-5 md:pt-5 shadow-md">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="w-[3px] h-6 bg-[#66c0f4] rounded-[1px] shrink-0" />
                        <h1 className="text-2xl md:text-[26px] text-white font-medium tracking-wide leading-none flex items-center gap-3">
                            <BarChart3 size={22} className="text-[#66c0f4]" /> Analytics
                        </h1>
                    </div>
                    {/* Period: scopes everything below */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex p-[2px] rounded-[3px] border border-[#2a475e] bg-[#101214]" role="tablist">
                            {PERIODS.map(p => (
                                <button key={p.id} role="tab" aria-selected={period === p.id} onClick={() => choosePeriod(p.id)}
                                    className={`text-[10px] font-semibold uppercase tracking-[0.07em] px-2.5 py-1 rounded-[2px] transition-colors ${
                                        period === p.id ? 'bg-[#2a475e] text-white' : 'text-[#546270] hover:text-[#c6d4df]'
                                    }`}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <span className="text-[10px] text-[#546270]" title="Days and hours are shown in your timezone">
                            {fmtDayKey(range.startKey)} – {fmtDayKey(range.endKey)} · {TZ}
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 flex-1 w-full flex flex-col gap-7">
                {!view ? <Skeleton /> : (
                    <>
                        {/* Overview */}
                        <section>
                            <SectionHeader title="Overview" note={range.prevLabel ? `change vs ${range.prevLabel}` : null} />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <StatTile label="Hours played" value={fmtHours(view.cur.minutes)} delta={d('minutes', true)} note={view.playNote} />
                                <StatTile label="Active days" value={fmtNum(view.cur.activeDays)} delta={d('activeDays', true)} />
                                <StatTile label="Play sessions" value={fmtNum(view.cur.sessions)} delta={d('sessions', true)} note={view.playNote} />
                                <StatTile label="Avg session" value={fmtMinutes(view.cur.avgSession)} delta={d('avgSession', true)} />
                                <StatTile label="Achievements" value={fmtNum(view.cur.unlocks)} delta={d('unlocks')} />
                                <StatTile label="RA points" value={fmtNum(view.cur.raPoints)} delta={d('raPoints')} />
                                <StatTile label="Gamerscore" value={fmtNum(view.cur.gamerscore)} delta={d('gamerscore')} />
                                <StatTile label="Completed" value={fmtNum(view.cur.completions)} delta={d('completions')} />
                            </div>
                            <p className="text-[9px] text-[#546270] mt-2">Playtime is RetroAchievements and Steam only (Xbox doesn't report it), tracked since {fmtDayKey(base.trackingKey)}.</p>
                        </section>

                        {/* Trends */}
                        <section>
                            <SectionHeader title="Trends" />
                            <div className="grid md:grid-cols-2 gap-3">
                                <ChartCard
                                    title="Hours played"
                                    subtitle={`Per ${view.playUnit}${view.playNote ? ` · ${view.playNote}` : ''}`}
                                    legend={PLAYTIME_PLATFORMS.map(p => ({ label: PLATFORM_SHORT[p], color: PLATFORM_COLOR[p] }))}
                                    table={{ columns: [view.playUnit, 'RA', 'Steam', 'Total'], rows: [...view.playBuckets].reverse().map(b => [b.label, fmtMinutes(b.values.ra), fmtMinutes(b.values.steam), fmtMinutes((b.values.ra || 0) + (b.values.steam || 0))]) }}>
                                    <StackedColumns buckets={view.playBuckets} series={PLAYTIME_PLATFORMS} format={v => (v >= 60 ? `${Math.round(v / 60)}h` : `${Math.round(v)}m`)} />
                                </ChartCard>
                                <ChartCard
                                    title="Achievements unlocked"
                                    subtitle={`Per ${view.unit}`}
                                    legend={PLATFORMS.map(p => ({ label: PLATFORM_SHORT[p], color: PLATFORM_COLOR[p] }))}
                                    table={{ columns: [view.unit, 'RA', 'Steam', 'Xbox', 'Total'], rows: [...view.unlockBuckets].reverse().map(b => [b.label, fmtNum(b.values.ra), fmtNum(b.values.steam), fmtNum(b.values.xbox), fmtNum((b.values.ra || 0) + (b.values.steam || 0) + (b.values.xbox || 0))]) }}>
                                    <StackedColumns buckets={view.unlockBuckets} series={PLATFORMS} format={fmtNum} />
                                </ChartCard>
                            </div>
                        </section>

                        {/* When you play */}
                        <section>
                            <SectionHeader title="When you play" note={TZ} />
                            <div className="grid md:grid-cols-2 gap-3">
                                <ChartCard title="Playtime by hour" subtitle="RA + Steam, minutes per hour of the week"
                                    table={{ columns: ['Day', ...Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))], rows: view.playGrid.map((r, i) => [WEEKDAYS[i], ...r.map(v => Math.round(v) || '')]) }}>
                                    <Punchcard cells={view.playGrid} format={fmtMinutes} unitLabel="played" />
                                </ChartCard>
                                <ChartCard title="Unlocks by hour" subtitle="All platforms"
                                    table={{ columns: ['Day', ...Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))], rows: view.unlockGrid.map((r, i) => [WEEKDAYS[i], ...r.map(v => v || '')]) }}>
                                    <Punchcard cells={view.unlockGrid} format={v => `${v}`} unitLabel={'achievements'} />
                                </ChartCard>
                            </div>
                        </section>

                        {/* Top games */}
                        <section>
                            <SectionHeader title="Top games" note={periodLabel} />
                            <div className="grid md:grid-cols-3 gap-3">
                                <ChartCard title="Most played"><BarList rows={view.topHours} format={fmtMinutes} /></ChartCard>
                                <ChartCard title="Most unlocks"><BarList rows={view.topUnlocks} format={fmtNum} /></ChartCard>
                                <ChartCard title="Minutes per achievement" subtitle="Fastest first · 3+ unlocks and 30m+ played">
                                    <BarList rows={view.perAch} format={v => fmtMinutes(v)} empty="No game with 3+ unlocks and 30m+ played." />
                                </ChartCard>
                            </div>
                        </section>

                        {/* Sessions + rarity */}
                        <section className="grid md:grid-cols-2 gap-3">
                            <div className="min-w-0">
                                <SectionHeader title="Sessions" note={`${fmtNum(view.sessionCount)} · median ${fmtMinutes(view.medianSession)}`} />
                                <ChartCard
                                    title="Session length"
                                    subtitle={view.longest ? `Longest: ${fmtMinutes(view.longest.minutes)}, ${parseTitle(view.nameOf(view.longest.platform, view.longest.gameId)).baseTitle} (${fmtDayKey(dayKey(new Date(view.longest.endMs)))})` : 'No sessions in this period'}
                                    legend={PLAYTIME_PLATFORMS.map(p => ({ label: PLATFORM_SHORT[p], color: PLATFORM_COLOR[p] }))}
                                    table={{ columns: ['Length', 'RA', 'Steam'], rows: view.lengthBuckets.map(b => [b.label, fmtNum(b.values.ra), fmtNum(b.values.steam)]) }}>
                                    <StackedColumns buckets={view.lengthBuckets} series={PLAYTIME_PLATFORMS} format={fmtNum} height={130} />
                                </ChartCard>
                            </div>
                            <div className="min-w-0">
                                <SectionHeader title="Rarity" gold note="share of players who have it" />
                                <ChartCard
                                    title="Unlocks by rarity"
                                    legend={RARITY_TIERS.map(t => ({ label: t.label, color: t.color }))}
                                    table={{ columns: ['Platform', ...RARITY_TIERS.map(t => t.label)], rows: view.rarity.map(r => [PLATFORM_SHORT[r.platform], ...RARITY_TIERS.map(t => r.counts[t.id])]) }}>
                                    {view.rarity.length === 0
                                        ? <div className="text-[10px] text-[#546270] italic py-2">No unlocks in this period.</div>
                                        : <div className="flex flex-col gap-2.5">{view.rarity.map(r => <RarityBar key={r.platform} row={r} />)}</div>}
                                    {view.rarest.length > 0 && (
                                        <div className="mt-4">
                                            <div className="text-[9px] text-[#546270] uppercase tracking-[0.07em] mb-1.5">Rarest unlocks</div>
                                            <div className="flex flex-col gap-1">
                                                {view.rarest.map(u => (
                                                    <div key={`${u.platform}-${u.g}-${u.a}`} className="flex items-center gap-2 text-[10px] min-w-0">
                                                        <span className="w-[3px] h-3 rounded-[1px] shrink-0" style={{ background: PLATFORM_COLOR[u.platform] }} />
                                                        <span className="text-[#c6d4df] truncate">{u.n}</span>
                                                        <span className="text-[#546270] truncate">{parseTitle(view.nameOf(u.platform, u.g)).baseTitle}</span>
                                                        <span className="ml-auto shrink-0 font-semibold" style={{ color: rarityTier(u.r).color }}>{u.r}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </ChartCard>
                            </div>
                        </section>

                        {/* Completion */}
                        <section>
                            <SectionHeader title="Completion" gold
                                note={view.daysToComplete.length ? `${periodLabel}: ${view.periodCompletions.length} completed · median ${Math.round(median(view.daysToComplete))} days from first unlock` : `${periodLabel}: ${view.periodCompletions.length} completed`} />
                            <div className="grid md:grid-cols-3 gap-3">
                                {PLATFORMS.map(p => (
                                    <ChartCard key={p} title={PLATFORM_LABEL[p]} subtitle="All time"
                                        table={{ columns: ['Stage', 'Games', '% of first'], rows: data.funnel[p].map(([label, n]) => [label, fmtNum(n), data.funnel[p][0][1] ? `${Math.round((n / data.funnel[p][0][1]) * 100)}%` : '–']) }}>
                                        <Funnel stages={data.funnel[p]} color={PLATFORM_COLOR[p]} />
                                    </ChartCard>
                                ))}
                            </div>
                        </section>

                        {/* RA by console */}
                        <section>
                            <SectionHeader title="RetroAchievements by console" note={periodLabel} />
                            <div className="grid md:grid-cols-2 gap-3">
                                <ChartCard title="Hours played"><BarList rows={view.consoleHours} format={fmtMinutes} /></ChartCard>
                                <ChartCard title="Achievements"><BarList rows={view.consoleUnlocks} format={fmtNum} /></ChartCard>
                            </div>
                        </section>
                    </>
                )}
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
                    className="scroll-top-btn fixed bottom-14 right-4 z-50 w-10 h-10 bg-[#131a22] border border-[#2a475e] hover:border-[#66c0f4] hover:text-[#66c0f4] text-[#8f98a0] rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90"
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

// Stages from widest to narrowest, each bar relative to the first stage
const Funnel = ({ stages, color }) => {
    const first = stages[0]?.[1] || 1;
    return (
        <div className="flex flex-col gap-2">
            {stages.map(([label, n], i) => (
                <div key={label}>
                    <div className="flex items-baseline text-[10px] mb-0.5">
                        <span className="text-[#8f98a0]">{label}</span>
                        <span className="ml-auto text-[#c6d4df] font-semibold">{fmtNum(n)}</span>
                        {i > 0 && <span className="text-[9px] text-[#546270] w-9 text-right">{stages[i - 1][1] ? `${Math.round((n / stages[i - 1][1]) * 100)}%` : '–'}</span>}
                    </div>
                    <div className="h-[6px] bg-[#101214] rounded-[1px]">
                        <div className="h-full rounded-[1px]" style={{ width: `${n ? Math.max(1.5, (n / first) * 100) : 0}%`, background: color, opacity: 1 - i * 0.18 }} />
                    </div>
                </div>
            ))}
        </div>
    );
};

createRoot(document.getElementById('root')).render(<App />);
