import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ChevronDown, Clock, Flame, Gamepad2, Hourglass, Trophy } from 'lucide-react';
import { PLATFORM_COLOR, TILDE_TAG_COLORS } from './utils/constants.js';
import { fmtDay, fmtTime, fmtMinutes, fmtMinutesShort, parseTitle, xboxImg } from './utils/helpers.js';
import { normalizeRA, normalizeSteam, normalizeXbox, normalizeSession } from './utils/normalizers.js';
import { TZ, toMs, dayKey, todayKey, addDays, keyToDate, buildHeatmap, splitByDay } from '../assets/time.js';
import { loadPlaying, PLAYING_GROUPS } from '../assets/playing.js';
import { SummarySkeleton, TimelineSkeleton } from '../assets/activity-ui.js';
import { raIcon } from '../assets/ra-icon.js';

// A day counts toward the playtime streak with at least this much play
const PLAYTIME_STREAK_MIN = 15;
// Play sessions overlapping an unlock by this much still count it (unlocks can land
// a little after Steam closes the session)
const UNLOCK_GRACE_MS = 5 * 60 * 1000;

const renderTildeTags = (tags) => {
    if (!tags?.length) return null;
    return tags.map(tag => {
        const s = TILDE_TAG_COLORS[tag] || TILDE_TAG_COLORS['Prototype'];
        return (
            <span key={tag} style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '1px 4px', borderRadius: '2px', flexShrink: 0, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                {tag}
            </span>
        );
    });
};

// ── Heatmap ───────────────────────────────────────────────────────────────────

// heatmapData: { day: { count } }; count is unlocks or minutes, `describe(day)` writes the tooltip
const Heatmap = ({ heatmapData, filter, selectedDay, onSelectDay, describe }) => {
    const scrollRef = useRef(null);
    const heatmapKeys = Object.keys(heatmapData).length;

    useEffect(() => {
        if (!scrollRef.current || heatmapKeys === 0) return;
        requestAnimationFrame(() => { scrollRef.current.scrollLeft = scrollRef.current.scrollWidth; });
    }, [heatmapKeys]);

    // 365 local days ending today
    const days = useMemo(() => {
        const arr = [];
        const today = todayKey();
        for (let i = 364; i >= 0; i--) {
            const key = addDays(today, -i);
            arr.push({ key, date: keyToDate(key) });
        }
        return arr;
    }, []);

    const weeks = useMemo(() => {
        const ws = [];
        for (let i = 0; i < days.length; i += 7) ws.push(days.slice(i, i + 7));
        return ws;
    }, [days]);

    const monthLabels = useMemo(() => {
        const labels = [];
        let lastMonth = -1;
        weeks.forEach((week, wi) => {
            const m = week[0].date.getMonth();
            if (m !== lastMonth) {
                labels.push({ wi, label: week[0].date.toLocaleDateString('en-GB', { month: 'short' }) });
                lastMonth = m;
            }
        });
        return labels;
    }, [weeks]);

    const maxCount = useMemo(() => Math.max(1, ...Object.values(heatmapData).map(d => d.count ?? d)), [heatmapData]);

    const getColor = (key) => {
        const d = heatmapData[key];
        if (!d) return '#101214';
        const ratio = (d.count ?? d) / maxCount;
        if (filter === 'ra') {
            if (ratio >= 0.8)  return '#e5b143';
            if (ratio >= 0.5)  return '#c8901a';
            if (ratio >= 0.25) return '#7a4a10';
            return '#3d2507';
        }
        if (filter === 'steam') {
            if (ratio >= 0.8)  return '#66c0f4';
            if (ratio >= 0.5)  return '#2a7bba';
            if (ratio >= 0.25) return '#1a5275';
            return '#0d2a3d';
        }
        if (filter === 'xbox') {
            if (ratio >= 0.8)  return '#52b043';
            if (ratio >= 0.5)  return '#3a8a30';
            if (ratio >= 0.25) return '#2f6b30';
            return '#1d3d1f';
        }
        if (ratio >= 0.8)  return '#e5b143';
        if (ratio >= 0.5)  return '#66c0f4';
        if (ratio >= 0.25) return '#2a6b9e';
        return '#1a4a70';
    };

    const legendColors = filter === 'ra'
        ? ['#101214', '#3d2507', '#7a4a10', '#c8901a', '#e5b143']
        : filter === 'steam'
        ? ['#101214', '#0d2a3d', '#1a5275', '#2a7bba', '#66c0f4']
        : filter === 'xbox'
        ? ['#101214', '#1d3d1f', '#2f6b30', '#3a8a30', '#52b043']
        : ['#101214', '#1a4a70', '#2a6b9e', '#66c0f4', '#e5b143'];

    return (
        <div className="overflow-x-auto" ref={scrollRef}>
            <div style={{ minWidth: `${53 * 14}px` }}>
                <div className="flex mb-1" style={{ paddingLeft: '28px' }}>
                    {weeks.map((_, wi) => {
                        const ml = monthLabels.find(m => m.wi === wi);
                        return (
                            <div key={wi} style={{ flex: 1, fontSize: '8px', color: '#546270', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                {ml ? ml.label : ''}
                            </div>
                        );
                    })}
                </div>
                <div className="flex gap-0">
                    <div className="flex flex-col gap-[2px] mr-1" style={{ paddingTop: '1px' }}>
                        {['M', '', 'W', '', 'F', '', 'S'].map((l, i) => (
                            <div key={i} style={{ height: '12px', width: '20px', fontSize: '7px', lineHeight: '12px', textAlign: 'right', color: '#546270', flexShrink: 0 }}>{l}</div>
                        ))}
                    </div>
                    <div className="flex flex-1 gap-[2px]">
                        {weeks.map((week, wi) => (
                            <div key={wi} className="flex flex-col gap-[2px] flex-1" style={{ minWidth: '10px' }}>
                                {week.map(({ key }) => (
                                    <div
                                        key={key}
                                        onClick={() => onSelectDay(selectedDay === key ? null : key)}
                                        title={describe(key)}
                                        style={{
                                            height: '12px',
                                            borderRadius: '2px',
                                            background: getColor(key),
                                            cursor: heatmapData[key] ? 'pointer' : 'default',
                                            outline: selectedDay === key ? '1.5px solid #c6d4df' : 'none',
                                            outlineOffset: '1px',
                                        }}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-end gap-1 mt-1.5" style={{ paddingLeft: '28px' }}>
                    <span style={{ fontSize: '8px', color: '#546270' }}>Less</span>
                    {legendColors.map((c, i) => (
                        <div key={i} style={{ width: '10px', height: '10px', borderRadius: '2px', background: c }} />
                    ))}
                    <span style={{ fontSize: '8px', color: '#546270' }}>More</span>
                </div>
            </div>
        </div>
    );
};

// ── Streak ────────────────────────────────────────────────────────────────────

// Current / longest run of days whose value reaches minValue (1 unlock, or N minutes)
const computeStreak = (heatmapData, minValue) => {
    const activeDays = new Set(
        Object.entries(heatmapData)
            .filter(([, d]) => (d.count ?? d) >= minValue)
            .map(([day]) => day)
    );
    const today = todayKey();
    // Count streak from yesterday backwards; add today only if it already counts
    let current = 0;
    let cursor = addDays(today, -1);
    while (activeDays.has(cursor)) {
        current++;
        cursor = addDays(cursor, -1);
    }
    if (activeDays.has(today)) current++;
    const sortedDays = [...activeDays].sort();
    let longest = 0, longestStart = null, longestEnd = null;
    let runStart = null, runLen = 0, prev = null;
    for (const day of sortedDays) {
        if (prev === null) {
            runStart = day; runLen = 1;
        } else {
            if (day === addDays(prev, 1)) {
                runLen++;
            } else {
                if (runLen > longest) { longest = runLen; longestStart = runStart; longestEnd = prev; }
                runStart = day; runLen = 1;
            }
        }
        prev = day;
    }
    if (runLen > longest) { longest = runLen; longestStart = runStart; longestEnd = prev; }
    const last14 = [];
    for (let i = 13; i >= 0; i--) {
        const key = addDays(today, -i);
        const isToday = i === 0;
        last14.push({
            key,
            label: keyToDate(key).toLocaleDateString('en-GB', { weekday: 'short' }),
            active: activeDays.has(key),
            isToday,
            isPending: isToday && !activeDays.has(key),
        });
    }
    return { current, longest, longestStart, longestEnd, last14 };
};

const PLATFORM_NAME = { ra: 'RA', steam: 'Steam', xbox: 'Xbox' };

const PlatformTag = ({ platform }) => (
    <span className="ptag" style={{ color: PLATFORM_COLOR[platform] }}>{PLATFORM_NAME[platform]}</span>
);

// Game name: RA titles lose their ~Tag~ and [Subset - …] syntax (shown as tags instead)
const GameName = ({ platform, name }) => {
    if (platform !== 'ra') return <span className="truncate">{name}</span>;
    const { baseTitle, isSubset, tags } = parseTitle(name);
    return (
        <>
            <span className="truncate">{baseTitle}</span>
            {isSubset && <span className="subset-tag">Subset</span>}
            {!isSubset && renderTildeTags(tags)}
        </>
    );
};

// "Sat 01 Nov" (+ the year when it isn't this year), and Today / Yesterday beside it
const DayLabel = ({ day }) => {
    const today = todayKey();
    const rel = day === today ? 'Today' : day === addDays(today, -1) ? 'Yesterday' : null;
    const sameYear = day.slice(0, 4) === today.slice(0, 4);
    return (
        <span className="tday-name">
            {fmtDay(day, { weekday: 'short', day: '2-digit', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })}
            {rel && <em>{rel}</em>}
        </span>
    );
};

// ── Summary card ──────────────────────────────────────────────────────────────

// Last 14 days as bars: height against the busiest of the 14; the current streak gold,
// other days that count blue, days under the streak minimum dim. Tap a bar to filter.
const RecentDays = ({ streakInfo, heatmapData, cellLabel, describe, selectedDay, onSelectDay, slim }) => {
    const days = streakInfo.last14;
    const vals = days.map(d => heatmapData[d.key]?.count ?? 0);
    const max = Math.max(1, ...vals);
    const inStreak = new Set();
    let k = days.length - 1;
    if (!days[k].active) k--;   // today doesn't break a streak until it's over
    while (k >= 0 && days[k].active) inStreak.add(days[k--].key);
    return (
        <div className={`rdays ${slim ? 'slim' : ''}`}>
            {days.map((d, i) => {
                const v = vals[i];
                const cls = inStreak.has(d.key) ? 'streak' : d.active ? 'on' : v ? 'low' : '';
                return (
                    <button key={d.key} title={describe(d.key)} disabled={!v}
                        onClick={() => onSelectDay(selectedDay === d.key ? null : d.key)}
                        className={`rday ${cls} ${selectedDay === d.key ? 'sel' : ''} ${d.isToday ? 'today' : ''}`}>
                        {!slim && <span className="rday-v">{v ? cellLabel(d.key) : ''}</span>}
                        <span className="rday-bar"><i style={{ height: v ? `${Math.max(10, v / max * 100)}%` : 0 }} /></span>
                        {!slim && <span className="rday-l">{d.label.slice(0, 2)}</span>}
                    </button>
                );
            })}
        </div>
    );
};

// Current and best streak as two small tiles; the current one lights up gold while it runs
const StreakTiles = ({ streakInfo, minLabel }) => {
    const on = streakInfo.current > 0;
    const days = n => `${n} day${n !== 1 ? 's' : ''}`;
    return (
        <div className="sktiles">
            <div className={`sktile ${on ? 'on' : ''}`}>
                <span className="sktile-ic">
                    <Flame size={16} style={on ? { animation: 'flameFlicker 1.8s ease-in-out infinite' } : undefined} />
                </span>
                <span className="sktile-txt">
                    <b>{on ? days(streakInfo.current) : 'None'}</b>
                    <span>Current streak</span>
                </span>
            </div>
            {streakInfo.longestStart && (
                <div className="sktile best">
                    <span className="sktile-ic"><Trophy size={15} /></span>
                    <span className="sktile-txt">
                        <b>{days(streakInfo.longest)}</b>
                        <span>Best · {fmtDay(streakInfo.longestStart, { day: 'numeric', month: 'short' })} – {fmtDay(streakInfo.longestEnd, { day: 'numeric', month: 'short' })}</span>
                    </span>
                </div>
            )}
        </div>
    );
};

// Share of the year per platform; the filtered platform stays lit, the rest dim
const SplitBar = ({ parts, filter }) => {
    const total = parts.reduce((a, p) => a + (p.value ?? 0), 0);
    return (
        <div className="split">
            <div className="split-bar">
                {total > 0 && parts.filter(p => p.value).map(p => (
                    <i key={p.id} style={{ width: `${p.value / total * 100}%`, background: PLATFORM_COLOR[p.id], opacity: filter === 'all' || filter === p.id ? 1 : 0.25 }} />
                ))}
            </div>
            <div className="split-legend">
                {parts.map(p => (
                    <span key={p.id} className={filter !== 'all' && filter !== p.id ? 'dim' : ''}>
                        <i style={{ background: PLATFORM_COLOR[p.id] }} />
                        {p.value == null ? <>{PLATFORM_NAME[p.id]} <span className="text-[#3d5060]">n/a</span></> : <><b>{p.label}</b> {PLATFORM_NAME[p.id]}</>}
                    </span>
                ))}
            </div>
        </div>
    );
};

// Collapsed (the default on phones): one line with the headline number and the streak, and
// the last 14 days as slim bars, so the timeline starts on the first screen. Expanded: the
// three numbers and the platform split, the 14 days with the streak, the year heatmap.
const SummaryCard = ({ open, onToggle, headline, stats, split, filter, streakInfo, minLabel, heatmap, recent, selectedDay, onClear }) => (
    <section className={`asum ${open ? '' : 'closed'}`}>
        {!open ? (
            // Folded: the last 14 days first (what this page is read for), then the year
            <div className="asum-fold anim-fade">
                <button className="afold-stats" onClick={onToggle} aria-expanded={false}>
                    <span className="astat">
                        <b style={{ color: '#66c0f4' }}>{headline.recent}</b>
                        <span>{headline.l}</span>
                    </span>
                    <span className="astat">
                        <b>{headline.games}</b>
                        <span>Game{headline.games !== 1 ? 's' : ''}</span>
                    </span>
                    <span className="astat afold-year hidden sm:flex">
                        <b>{headline.year}</b>
                        <span>Past year</span>
                    </span>
                </button>
                <div className="afold-days">{recent(true)}<span>Last 14 days</span></div>
                <button className="afold-btn" onClick={onToggle} aria-label="Show the year">
                    <ChevronDown size={16} />
                </button>
            </div>
        ) : (
            <div className="anim-fade relative">
                <button className="asum-less" onClick={onToggle} aria-expanded={true}>Less<ChevronDown size={13} className="rotate-180" /></button>
                <div className="asum-top">
                    <div className="asum-sec">
                        <div className="asum-h"><span>Past year</span></div>
                        <div className="astats">
                            {stats.map(s => (
                                <div key={s.l} className="astat">
                                    <b style={{ color: s.color ?? '#c6d4df' }}>{s.v}</b>
                                    <span>{s.l}</span>
                                    {s.sub && <em>{s.sub}</em>}
                                </div>
                            ))}
                        </div>
                        <SplitBar parts={split} filter={filter} />
                    </div>
                    <div className="asum-sec">
                        <div className="asum-h">
                            <span>Last 14 days</span>
                            {minLabel && <span className="crit md:mr-12" title="A day counts toward the streak with this much play"><Flame />{minLabel}</span>}
                        </div>
                        {recent(false)}
                        <StreakTiles streakInfo={streakInfo} minLabel={minLabel} />
                    </div>
                </div>
                <div className="asum-sec">
                    <div className="asum-h">
                        <span>Heatmap</span>
                        <em title="Days and times are shown in your timezone">{TZ}</em>
                        {selectedDay
                            ? <button onClick={onClear} className="fchip on anim-fade" style={{ height: 22 }}>{fmtDay(selectedDay, { day: '2-digit', month: 'short' })} ✕</button>
                            : null}
                    </div>
                    {heatmap}
                </div>
            </div>
        )}
    </section>
);

// ── Unlock timeline ───────────────────────────────────────────────────────────

// Steam rarity tiers (global unlock %), same colours as the profiles
const rarityColor = (p) => p < 5 ? '#e5b143' : p < 10 ? '#c8901a' : p < 25 ? '#66c0f4' : p < 50 ? '#8f98a0' : '#546270';

const AchievementRow = ({ ach }) => (
    <div className="trow">
        {ach.achievementIcon
            ? <img src={ach.achievementIcon} alt="" loading="lazy" />
            : <span className="trow-ph" />}
        <div className="trow-main">
            <span className="trow-title">{ach.achievementName}</span>
            {ach.description && ach.description !== ach.achievementName && <span className="trow-sub">{ach.description}</span>}
        </div>
        <span className="trow-end">
            {fmtTime(ach.unlockedAt)}
            {ach.points != null && <em>{ach.points} pts</em>}
            {ach.rarity != null && <em style={{ color: rarityColor(ach.rarity) }}>{ach.rarity < 10 ? ach.rarity.toFixed(1) : Math.round(ach.rarity)}%</em>}
        </span>
    </div>
);

const STEAM_CDN = 'https://cdn.akamai.steamstatic.com/steam/apps';

// Art behind a game strip: the first of `sources` that loads (Steam has no hero for some
// games), else the icon blurred, else nothing
const StripArt = ({ sources, icon }) => {
    const [i, setI] = useState(0);
    const src = sources[i];
    if (!src && !icon) return null;
    return (
        <span className="tcard-art">
            {src
                ? <img key={src} src={src} alt="" loading="lazy" onError={() => setI(n => n + 1)} />
                : <img src={icon} alt="" loading="lazy" className="art-icon" />}
        </span>
    );
};

// Runs longer than this fold after SESSION_FOLD - 1 rows
const SESSION_FOLD = 5;

// One run of consecutive unlocks in one game: the game, then its unlocks newest first
const GameSession = ({ session, raArt }) => {
    const [open, setOpen] = useState(false);
    const sorted = [...session.achs].sort((a, b) => toMs(b.unlockedAt) - toMs(a.unlockedAt));
    const startT = fmtTime(sorted[sorted.length - 1].unlockedAt);
    const endT   = fmtTime(sorted[0].unlockedAt);
    const fold = sorted.length > SESSION_FOLD && !open;
    const shown = fold ? sorted.slice(0, SESSION_FOLD - 1) : sorted;
    const subset = session.platform === 'ra' ? parseTitle(session.gameName).subsetName : null;
    // Wide art, best first: Steam's library hero (no logo) then its store banner; RA the hero
    // picked in the admin (data/ra/art.json) then its banner
    const ra = session.platform === 'ra' ? raArt?.[session.gameId] : null;
    const wideArt = session.platform === 'steam'
        ? [`${STEAM_CDN}/${session.gameId}/library_hero.jpg`, `${STEAM_CDN}/${session.gameId}/header.jpg`]
        : [ra?.hero?.thumb, ra?.grid?.thumb].filter(Boolean);
    return (
        <div className="tcard" style={{ borderLeftColor: PLATFORM_COLOR[session.platform] }}>
            <a href={session.gameUrl} target="_blank" rel="noreferrer" className="tcard-head">
                {/* The game's art faded in from the right: Steam's store banner, else the icon blurred */}
                <StripArt sources={wideArt} icon={session.gameIcon} />
                {session.gameIcon ? <img src={session.gameIcon} alt="" loading="lazy" className="tcard-icon" /> : <span className="trow-ph tcard-icon" />}
                <div className="tcard-main">
                    <span className="tcard-title"><GameName platform={session.platform} name={session.gameName} /></span>
                    {/* A subset's name is part of which game it is: its own line under the title */}
                    {subset && <span className="tcard-subset">{subset}</span>}
                    <span className="tcard-sub">
                        <PlatformTag platform={session.platform} />
                        {session.consoleName && <span className="shrink">{session.consoleName}</span>}
                        <span>{startT === endT ? startT : `${startT}–${endT}`}</span>
                        <span className="tcard-n"><Trophy size={11} /> {sorted.length}</span>
                    </span>
                </div>
            </a>
            <div className={`tlist ${open ? 'open' : ''}`}>
                {shown.map(a => <AchievementRow key={a.id} ach={a} />)}
            </div>
            {sorted.length > SESSION_FOLD && (
                <button className="tmore" onClick={() => setOpen(o => !o)}>
                    {open ? 'Show less' : `Show ${sorted.length - shown.length} more`}
                    <ChevronDown size={12} className={open ? 'rotate-180' : ''} />
                </button>
            )}
        </div>
    );
};

// ── Playtime timeline ─────────────────────────────────────────────────────────

const HOUR_TICKS = ['00', '06', '12', '18', '24'];

// One game's play on one day: a 24-hour track with a segment per session (clipped to
// the day), the day's share of its time and the unlocks those sessions produced
const PlayGameRow = ({ game: g, day }) => {
    const n = g.sessions.length;
    const first = g.sessions[0], last = g.sessions[n - 1];
    const startedEarlier = dayKey(new Date(first.startMs)) !== day;
    const from = `${startedEarlier ? new Date(first.startMs).toLocaleDateString('en-GB', { weekday: 'short' }) + ' ' : ''}${fmtTime(new Date(first.startMs))}`;
    const approx = g.sessions.some(s => s.approx);
    return (
        <a href={g.gameUrl} target="_blank" rel="noreferrer" className="prow">
            {g.gameIcon ? <img src={g.gameIcon} alt="" loading="lazy" /> : <span className="trow-ph" />}
            <div className="prow-main">
                <span className="tcard-title"><GameName platform={g.platform} name={g.gameName} /></span>
                <div className="ptrack">
                    {g.segments.map((sg, i) => (
                        <i key={i} className={sg.approx ? 'approx' : ''} title={sg.title}
                            style={{ left: `${sg.left}%`, width: `${sg.width}%`, background: PLATFORM_COLOR[g.platform] }} />
                    ))}
                </div>
                <span className="tcard-sub"
                    title={approx ? 'Start time estimated: the playtime was reported late (offline play, or a session spanning two updates)' : undefined}>
                    <PlatformTag platform={g.platform} />
                    <span className="shrink">
                        {approx && '≈ '}{n > 1 ? `${n} sessions · ` : ''}{from} – {fmtTime(new Date(last.endMs))}
                    </span>
                </span>
            </div>
            <div className="prow-end">
                <b>{fmtMinutes(g.minutes)}</b>
                {g.unlocks > 0 && (
                    <span className="tcard-n" title={`${g.unlocks} achievement${g.unlocks !== 1 ? 's' : ''} unlocked while playing`}><Trophy size={10} /> {g.unlocks}</span>
                )}
            </div>
        </a>
    );
};

// A day's sessions grouped per game (latest played first), with the 24-hour axis on top
const playDayGames = (day, sessions) => {
    const dayStart = keyToDate(day).getTime();
    const dayLen = keyToDate(addDays(day, 1)).getTime() - dayStart;
    const byGame = new Map();
    for (const s of [...sessions].sort((a, b) => a.startMs - b.startMs)) {
        const key = `${s.platform}-${s.gameId}`;
        const g = byGame.get(key) ?? { ...s, key, sessions: [], segments: [], minutes: 0, unlocks: 0 };
        // This day's share of the session's minutes (same split as the heatmap)
        const parts = splitByDay(s.startMs, s.endMs);
        const span = parts.reduce((a, p) => a + p.ms, 0);
        const part = parts.find(p => p.key === day);
        g.minutes += span ? s.minutes * ((part?.ms ?? 0) / span) : s.minutes;
        g.unlocks += s.unlocks;
        g.sessions.push(s);
        const a = Math.max(s.startMs, dayStart) - dayStart, b = Math.min(s.endMs, dayStart + dayLen) - dayStart;
        g.segments.push({
            left: a / dayLen * 100, width: Math.max(0, b - a) / dayLen * 100, approx: s.approx,
            title: `${fmtTime(new Date(s.startMs))} – ${fmtTime(new Date(s.endMs))} · ${fmtMinutes(s.minutes)}`,
        });
        byGame.set(key, g);
    }
    return [...byGame.values()].sort((a, b) => b.sessions.at(-1).endMs - a.sessions.at(-1).endMs);
};

const PlayDay = ({ day, sessions }) => {
    const games = useMemo(() => playDayGames(day, sessions), [day, sessions]);
    return (
        <div className="tcard pday">
            <div className="paxis" aria-hidden="true">
                <span />
                <div>{HOUR_TICKS.map((t, i) => <i key={t} style={{ left: `${i * 25}%` }}>{t}</i>)}</div>
                <span />
            </div>
            {games.map(g => <PlayGameRow key={g.key} game={g} day={day} />)}
        </div>
    );
};

// Sticky day heading of both timelines
const DayHead = ({ day, children }) => (
    <div className="tday">
        <DayLabel day={day} />
        <span className="tday-meta">{children}</span>
    </div>
);

// { day: { count: minutes } } in local days; sessions crossing midnight are split
const buildPlaytimeHeatmap = (sessions) => {
    const map = {};
    for (const s of sessions) {
        const parts = splitByDay(s.startMs, s.endMs);
        const span = parts.reduce((a, p) => a + p.ms, 0);
        for (const p of parts) {
            const cell = map[p.key] ??= { count: 0, sessions: 0 };
            cell.count += span ? s.minutes * (p.ms / span) : s.minutes;
            cell.sessions++;
        }
    }
    for (const [key, cell] of Object.entries(map)) {
        cell.count = Math.round(cell.count);
        if (cell.count === 0) delete map[key];
    }
    return map;
};

// ── Playing view ──────────────────────────────────────────────────────────────

// RA and Steam only (assets/playing.js leaves Xbox out: no playtime)
const GAME_URL = {
    ra:    g => `https://retroachievements.org/game/${g.gameId}`,
    steam: g => `https://store.steampowered.com/app/${g.gameId}`,
};
const PLATFORM_LABEL = { ra: 'RA', steam: 'Steam' };
const PLATFORM_RGB = { ra: '229,177,67', steam: '102,192,244' };
// Group heading colours: in progress blue, fading as the game goes untouched
const GROUP_COLOR = { playing: '#66c0f4', onhold: '#b8c4ce', drifting: '#8f98a0' };
// Each group's rule as chips under its heading (same thresholds as assets/playing.js)
const GROUP_RULES = {
    playing:  <span className="crit"><Clock />Last <b>2</b> weeks, or <b>5h+</b> in <b>6</b></span>,
    onhold:   <span className="crit"><Clock />Idle <b>2–6</b> weeks</span>,
    drifting: <span className="crit"><Clock />Idle <b>6+</b> weeks</span>,
};
// Silver "Beaten" badge, like the profile pages' second-tier status
const BEATEN_CLS = 'text-[7px] font-bold uppercase tracking-[0.08em] px-[5px] py-[2px] rounded-[2px] shrink-0 whitespace-nowrap text-[#c6d4df] bg-[#2a3440] border border-[rgba(184,196,206,0.25)]';

const fmtAgo = (days) => days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`;
// Lifetime hours: whole hours from 10h up, exact below
const fmtTotal = (m) => m >= 600 ? `${Math.round(m / 60).toLocaleString()}h` : fmtMinutes(m);

// One week cell: brighter = more play that week
const weekAlpha = (minutes) => !minutes ? 0 : minutes >= 300 ? 1 : minutes >= 150 ? 0.75 : minutes >= 60 ? 0.5 : 0.3;

// Wide cover: the Steam header. RA files only carry the square icon, so RA (and a Steam
// game without a header) shows the icon centered on the library mosaic (.art-icon in assets/ui.css)
const TileCover = ({ game: g }) => {
    const [failed, setFailed] = useState(false);
    const wide = g.cover && !failed ? g.cover : null;
    const icon = g.icon;
    if (wide) return <img src={wide} alt="" className="absolute inset-0 w-full h-full object-cover" onError={() => setFailed(true)} />;
    if (!icon) return <div className="absolute inset-0 bg-[#2a475e]" />;
    return (
        <>
            <img src={icon} alt="" className="art-icon absolute inset-0 w-full h-full max-w-none object-cover opacity-70" />
            <img src={icon} alt="" className="absolute top-[11%] left-1/2 -translate-x-1/2 h-[78%] w-auto aspect-square object-cover rounded-[3px] border border-[rgba(0,0,0,0.6)] shadow-[0_4px_14px_rgba(0,0,0,0.6)]" />
        </>
    );
};

const PlayingTile = ({ game: g }) => {
    const isRA = g.platform === 'ra';
    const { baseTitle, isSubset, tags } = isRA ? parseTitle(g.name) : { baseTitle: g.name };
    const pct = g.progress?.total ? Math.round(g.progress.unlocked / g.progress.total * 100) : null;
    const rgb = PLATFORM_RGB[g.platform];
    return (
        <a href={GAME_URL[g.platform](g)} target="_blank" rel="noreferrer"
            className="group flex flex-col min-w-0 bg-[#1b2838] border border-[#2a475e] rounded-[2px] overflow-hidden hover:border-[#4c9be8] transition-colors">
            {/* Steam header art is 460×215: the box matches it so nothing is cropped */}
            <div className="relative aspect-[460/215] overflow-hidden grid place-items-center bg-[#101214]">
                <TileCover game={g} />
                <span className="absolute top-[5px] right-[5px] text-[8px] font-semibold text-white bg-[rgba(16,18,20,0.75)] px-[5px] py-[2px] rounded-[2px] tabular-nums">{fmtAgo(g.daysAgo)}</span>
            </div>
            <div className="flex flex-col gap-1.5 px-2 pt-[7px] min-w-0">
                <div className="flex items-center gap-[5px] min-w-0">
                    <span className="text-[7px] font-extrabold tracking-[0.04em] uppercase px-[3px] py-[1px] rounded-[2px] shrink-0"
                        style={{ color: `rgb(${rgb})`, background: `rgba(${rgb},0.1)`, border: `1px solid rgba(${rgb},0.3)` }}>
                        {PLATFORM_LABEL[g.platform]}
                    </span>
                    <span className="text-[11px] font-medium text-[#c6d4df] group-hover:text-white truncate min-w-0 transition-colors" title={g.name}>{baseTitle}</span>
                    {isSubset && <span className="text-[7px] font-bold uppercase tracking-[0.07em] px-[3px] py-[1px] rounded-[2px] border border-[rgba(229,177,67,0.3)] bg-[rgba(229,177,67,0.1)] text-[#c8a84b] shrink-0">Subset</span>}
                    {!isSubset && renderTildeTags(tags)}
                    {g.beaten && <span className={BEATEN_CLS} title="Beaten, still playing it">Beaten</span>}
                </div>
                {/* Achievement progress */}
                <div className="flex items-center gap-1.5 text-[9px] text-[#546270] tabular-nums">
                    <div className="flex-1 h-1 bg-[#101a24] rounded-[1px] overflow-hidden">
                        {pct !== null && <div className="h-full" style={{ width: `${pct}%`, background: `rgb(${rgb})` }} />}
                    </div>
                    <span className="text-[#c6d4df] font-semibold" title={g.progress ? `${g.progress.unlocked} of ${g.progress.total} achievements` : undefined}>{pct !== null ? `${pct}%` : '–'}</span>
                </div>
                {/* 13 weeks of play, oldest first */}
                <div className="flex flex-col gap-[3px]">
                    <div className="grid grid-cols-[repeat(13,1fr)] gap-[2px]">
                        {g.weeks.map((v, i) => {
                            const a = weekAlpha(v);
                            const weeksAgo = g.weeks.length - 1 - i;
                            return <i key={i} className="h-[9px] rounded-[1px]" style={{ background: a ? `rgba(${rgb},${a})` : '#243444' }}
                                title={`${weeksAgo === 0 ? 'This week' : `${weeksAgo} week${weeksAgo !== 1 ? 's' : ''} ago`}: ${v ? fmtMinutes(v) : 'not played'}`} />;
                        })}
                    </div>
                    <div className="flex items-center gap-[5px] text-[10px] text-[#546270]">
                        <span>13 weeks ago</span>
                        <i className="relative flex-1 h-px bg-[#2a3a4a] after:content-[''] after:absolute after:-right-px after:-top-[2px] after:border-l-4 after:border-l-[#2a3a4a] after:border-y-[2.5px] after:border-y-transparent" />
                        <span>now</span>
                    </div>
                </div>
            </div>
            {/* Stats: the first two cover the same 13 weeks as the strip */}
            <div className="mt-1.5 grid grid-cols-3 border-t border-[#1a2535] bg-[#172333]">
                <div className="col-span-2 pt-1 text-center text-[9px] font-bold text-[#3f5368]">Last 13 weeks</div>
                <div className="pt-1 text-center text-[9px] font-bold text-[#3f5368] border-l border-[#1a2535]">All time</div>
                {[
                    { v: g.sessions ? fmtMinutes(Math.round(g.minutes / g.sessions)) : null, l: 'Avg session' },
                    { v: g.sessions, l: 'Sessions' },
                    { v: g.totalMinutes != null ? fmtTotal(g.totalMinutes) : null, l: 'Played', border: true },
                ].map(({ v, l, border }) => (
                    <div key={l} className={`flex flex-col items-center gap-px px-0.5 pt-0.5 pb-1.5 min-w-0 ${border ? 'border-l border-[#1a2535]' : ''}`}>
                        <b className={`text-[10px] font-semibold tabular-nums whitespace-nowrap ${v == null ? 'text-[#323f4c]' : 'text-[#c6d4df]'}`}>{v ?? '–'}</b>
                        <span className="text-[9px] font-bold text-[#546270] whitespace-nowrap">{l}</span>
                    </div>
                ))}
            </div>
        </a>
    );
};

// Same boxes as a group section of PlayingTiles (heading line; cover, 76px body, 56px stats band)
const PlayingSkeleton = () => (
    <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2 h-5">
            <span className="shimmer w-2 h-2 rounded-full shrink-0" />
            <span className="shimmer h-2.5 w-16 rounded" />
            <span className="flex-1 h-px bg-[#2a475e] opacity-40" />
            <span className="shimmer h-[19px] w-28 rounded-[2px]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-2.5">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col bg-[#1b2838] border border-[#2a475e] rounded-[2px] overflow-hidden">
                    <div className="shimmer aspect-[460/215]" style={{ borderRadius: 0 }} />
                    <div className="flex flex-col justify-center gap-2 px-2 h-[76px]">
                        <div className="shimmer h-2.5 rounded" style={{ width: `${55 + (i % 3) * 15}%` }} />
                        <div className="shimmer h-1 rounded" />
                        <div className="shimmer h-[9px] rounded" />
                        <div className="shimmer h-2 w-full rounded opacity-60" />
                    </div>
                    <div className="shimmer mt-1.5 h-[56px]" style={{ borderRadius: 0, opacity: 0.6 }} />
                </div>
            ))}
        </div>
    </section>
);

// Shared fetch for loadPlaying: one request per file, missing files resolve to null
const _playingCache = {};
const fetchJsonOnce = (url) => (_playingCache[url] ??= fetch(url).then(r => r.ok ? r.json() : null).catch(() => null));

// ── App ───────────────────────────────────────────────────────────────────────

const App = () => {
    // All 4 chunks per platform, fetched up front: the heatmap needs every unlock's
    // timestamp to group them into the viewer's local days. The timeline still
    // reveals one chunk at a time (nextChunk - 1 = chunks shown).
    const [chunks,        setChunks]        = useState(null);   // { ra, steam, xbox: [c1, c2, c3, c4] }
    const [steamGameIcons, setSteamGameIcons] = useState({});
    const [raArt,         setRaArt]         = useState({});   // RA wide art picked in the admin
    const [xboxGameIcons, setXboxGameIcons] = useState({});
    const [loading,       setLoading]       = useState(true);
    const loadingMore = false;
    const [nextChunk,   setNextChunk]   = useState(2);
    // View from the URL: ?view=playtime | playing (absent = achievements)
    const [view,        setView]        = useState(() => {
        const v = new URLSearchParams(location.search).get('view');
        return v === 'playtime' || v === 'playing' ? v : 'achievements';
    });
    // Playing view: games in rotation (assets/playing.js), loaded the first time the view opens
    const [playing,     setPlaying]     = useState(null);   // { games, groups } | { error: true }
    // Playtime view: sessions for this UTC year and last (covers the 365-day heatmap)
    const [playtime,    setPlaytime]    = useState(null);   // { ra: [...sessions], steam: [...] }
    const [visibleDays, setVisibleDays] = useState(30);
    const [filter,      setFilter]      = useState('all');
    const [selectedDay, setSelectedDay] = useState(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const sentinelRef = useRef(null);
    // Summary card open or folded, remembered per device; folded by default on phones so
    // the timeline starts on the first screen
    const [summaryOpen, setSummaryOpen] = useState(() => {
        try { const v = localStorage.getItem('gh:activitySummary'); if (v) return v === 'open'; } catch {}
        return window.matchMedia('(min-width: 768px)').matches;
    });
    const toggleSummary = () => setSummaryOpen(o => {
        try { localStorage.setItem('gh:activitySummary', o ? 'closed' : 'open'); } catch {}
        return !o;
    });

    const switchView = (next) => {
        setView(next);
        setSelectedDay(null);
        if (next !== 'achievements' && filter === 'xbox') setFilter('all');
        const url = new URL(location.href);
        if (next !== 'achievements') url.searchParams.set('view', next);
        else url.searchParams.delete('view');
        history.replaceState(null, '', url);
    };

    useEffect(() => {
        if (view !== 'playing' || playing) return;
        loadPlaying(fetchJsonOnce, '../').then(setPlaying).catch(() => setPlaying({ error: true, games: [], groups: {} }));
    }, [view]);
    const playingShown = useMemo(
        () => (playing?.games ?? []).filter(g => filter === 'all' || g.platform === filter),
        [playing, filter]
    );

    const fetchChunk = async (platform, i) => {
        const d = await fetch(`../data/${platform}/achievements/${i}.json`)
            .then(r => r.ok ? r.json() : { recentAchievements: [] })
            .catch(() => ({ recentAchievements: [] }));
        return (d.recentAchievements ?? []).map(
            platform === 'ra' ? normalizeRA : platform === 'xbox' ? normalizeXbox : normalizeSteam
        );
    };

    useEffect(() => {
        fetch('../data/xbox/games/index.json')
            .then(r => r.json())
            .then(d => setXboxGameIcons(Object.fromEntries(
                Object.entries(d.achievementProgress ?? {}).map(([id, g]) => [id, xboxImg(g.iconUrl, 64)])
            )))
            .catch(() => {});

        fetch('../data/ra/art.json')
            .then(r => r.ok ? r.json() : null)
            .then(d => setRaArt(d?.games ?? {}))
            .catch(() => {});

        fetch('../data/steam/games/index.json')
            .then(r => r.json())
            .then(d => setSteamGameIcons(Object.fromEntries(
                Object.entries(d.achievementProgress ?? {}).map(([id, g]) => [id, g.iconUrl])
            )))
            .catch(() => {});

        const year = new Date().getUTCFullYear();
        const playtimeOf = platform => Promise.all([year - 1, year].map(y =>
            fetch(`../data/${platform}/playtime/${y}.json`)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
        )).then(files => files.flatMap(f => (f?.sessions ?? []).map(s => normalizeSession(platform, s, f.games))));
        Promise.all([playtimeOf('ra'), playtimeOf('steam')]).then(([ra, steam]) => setPlaytime({ ra, steam }));

        const all = platform => Promise.all([1, 2, 3, 4].map(i => fetchChunk(platform, i)));
        Promise.all([all('ra'), all('steam'), all('xbox')]).then(([ra, steam, xbox]) => {
            setChunks({ ra, steam, xbox });
            setLoading(false);
        });
    }, []);

    const withIcons = (list, icons) => list.map(a => icons[a.gameId] ? { ...a, gameIcon: icons[a.gameId] } : a);
    const shown = (platform) => chunks ? chunks[platform].slice(0, nextChunk - 1).flat() : [];
    // RA's placeholder icon → the square picked in the admin (assets/ra-icon.js)
    const raAchs    = useMemo(() => shown('ra').map(a => ({ ...a, gameIcon: raIcon(a.gameIcon, a.gameId, raArt) })), [chunks, nextChunk, raArt]);
    const steamAchs = useMemo(() => withIcons(shown('steam'), steamGameIcons), [chunks, nextChunk, steamGameIcons]);
    const xboxAchs  = useMemo(() => withIcons(shown('xbox'), xboxGameIcons), [chunks, nextChunk, xboxGameIcons]);

    // Heatmaps from every unlock of the year, in local days
    const heatOf = (platform) => chunks ? buildHeatmap(chunks[platform].flat(), a => a.unlockedAt) : {};
    const raHeatmap    = useMemo(() => heatOf('ra'),    [chunks]);
    const steamHeatmap = useMemo(() => heatOf('steam'), [chunks]);
    const xboxHeatmap  = useMemo(() => heatOf('xbox'),  [chunks]);

    // Play sessions with the number of unlocks each one produced (same platform + game,
    // unlocked between its start and end)
    const sessions = useMemo(() => {
        if (!playtime) return { ra: [], steam: [] };
        const withUnlocks = (platform) => {
            const unlocks = chunks ? chunks[platform].flat() : [];
            return playtime[platform].map(s => ({
                ...s,
                gameIcon: platform === 'ra' ? raIcon(s.gameIcon, s.gameId, raArt) : s.gameIcon,
                unlocks: unlocks.filter(a => a.gameId === s.gameId && (() => {
                    const t = toMs(a.unlockedAt);
                    return t >= s.startMs - UNLOCK_GRACE_MS && t <= s.endMs + UNLOCK_GRACE_MS;
                })()).length,
            }));
        };
        return { ra: withUnlocks('ra'), steam: withUnlocks('steam') };
    }, [playtime, chunks, raArt]);
    const raPlayHeatmap    = useMemo(() => buildPlaytimeHeatmap(sessions.ra),    [sessions]);
    const steamPlayHeatmap = useMemo(() => buildPlaytimeHeatmap(sessions.steam), [sessions]);

    const loadMore = useCallback(() => {
        if (view === 'playtime') { setVisibleDays(prev => prev + 30); return; }
        if (nextChunk > 4) return;
        setNextChunk(prev => prev + 1);
    }, [nextChunk, view]);

    const loadMoreRef = useRef(loadMore);
    useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const heatmapData = useMemo(() => {
        if (view === 'playtime') {
            if (filter === 'ra') return raPlayHeatmap;
            if (filter === 'steam') return steamPlayHeatmap;
            const merged = {};
            [raPlayHeatmap, steamPlayHeatmap].forEach(h => Object.entries(h).forEach(([day, d]) => {
                merged[day] = { count: (merged[day]?.count ?? 0) + d.count, sessions: (merged[day]?.sessions ?? 0) + d.sessions };
            }));
            return merged;
        }
        if (filter === 'ra') return raHeatmap;
        if (filter === 'steam') return steamHeatmap;
        if (filter === 'xbox') return xboxHeatmap;
        const merged = { ...raHeatmap };
        [steamHeatmap, xboxHeatmap].forEach(h => Object.entries(h).forEach(([day, d]) => {
            merged[day] = { count: (merged[day]?.count ?? 0) + (d.count ?? 0) };
        }));
        return merged;
    }, [view, filter, raHeatmap, steamHeatmap, xboxHeatmap, raPlayHeatmap, steamPlayHeatmap]);

    // Tooltip and streak-circle text for a day
    const describeDay = (key) => {
        const d = heatmapData[key];
        if (!d) return key;
        if (view === 'playtime') return `${key} · ${fmtMinutes(d.count)} · ${d.sessions} session${d.sessions !== 1 ? 's' : ''}`;
        return `${key} · ${d.count} achievement${d.count !== 1 ? 's' : ''}`;
    };
    const cellLabel = (key) => {
        const d = heatmapData[key];
        if (!d) return '';
        // Circles are small: largest unit only (the tooltip keeps the exact time)
        return view === 'playtime' ? fmtMinutesShort(d.count) : d.count;
    };

    const streakInfo = useMemo(
        () => computeStreak(heatmapData, view === 'playtime' ? PLAYTIME_STREAK_MIN : 1),
        [heatmapData, view]
    );

    // Summary card: past-year total, active days and busiest day of the filtered heatmap,
    // and each platform's share of the year
    const yearFrom = addDays(todayKey(), -364);
    const sumYear = (h) => Object.entries(h).reduce((a, [k, d]) => k >= yearFrom ? a + (d.count ?? 0) : a, 0);
    const summaryStats = useMemo(() => {
        const min = view === 'playtime' ? PLAYTIME_STREAK_MIN : 1;
        let total = 0, active = 0, best = null;
        for (const [k, d] of Object.entries(heatmapData)) {
            if (k < yearFrom) continue;
            total += d.count;
            if (d.count >= min) active++;
            if (!best || d.count > best.count) best = { key: k, count: d.count };
        }
        const bestDay = { l: 'Best day', sub: best ? fmtDay(best.key, { day: '2-digit', month: 'short' }) : null };
        return view === 'playtime' ? [
            { v: fmtTotal(total), l: 'Played', color: '#66c0f4' },
            { v: active, l: 'Days played' },
            { ...bestDay, v: best ? fmtMinutes(best.count) : '–' },
        ] : [
            { v: total.toLocaleString(), l: 'Unlocks', color: '#66c0f4' },
            { v: active, l: 'Active days' },
            { ...bestDay, v: best ? best.count : '–' },
        ];
    }, [heatmapData, view]);
    const recentTotal = useMemo(
        () => streakInfo.last14.reduce((a, d) => a + (heatmapData[d.key]?.count ?? 0), 0),
        [streakInfo, heatmapData]
    );
    // Games touched in the last 14 days (the folded summary), for the filtered platforms
    const recentGames = useMemo(() => {
        const from = addDays(todayKey(), -13);
        const on = p => filter === 'all' || filter === p;
        const keys = new Set();
        if (view === 'playtime') {
            for (const p of ['ra', 'steam']) if (on(p)) for (const s of sessions[p]) if (dayKey(new Date(s.endMs)) >= from) keys.add(`${p}-${s.gameId}`);
        } else if (chunks) {
            for (const p of ['ra', 'steam', 'xbox']) if (on(p)) for (const a of chunks[p][0]) if (dayKey(a.unlockedAt) >= from) keys.add(`${p}-${a.gameId}`);
        }
        return keys.size;
    }, [view, filter, sessions, chunks]);
    const splitParts = useMemo(() => view === 'playtime' ? [
        { id: 'ra',    value: sumYear(raPlayHeatmap),    label: fmtTotal(sumYear(raPlayHeatmap)) },
        { id: 'steam', value: sumYear(steamPlayHeatmap), label: fmtTotal(sumYear(steamPlayHeatmap)) },
        { id: 'xbox',  value: null },
    ] : [
        { id: 'ra',    value: sumYear(raHeatmap),    label: sumYear(raHeatmap).toLocaleString() },
        { id: 'steam', value: sumYear(steamHeatmap), label: sumYear(steamHeatmap).toLocaleString() },
        { id: 'xbox',  value: sumYear(xboxHeatmap),  label: sumYear(xboxHeatmap).toLocaleString() },
    ], [view, raHeatmap, steamHeatmap, xboxHeatmap, raPlayHeatmap, steamPlayHeatmap]);

    const sourceAchs = useMemo(() => {
        const base = filter === 'ra' ? raAchs
            : filter === 'steam' ? steamAchs
            : filter === 'xbox' ? xboxAchs
            : [...raAchs, ...steamAchs, ...xboxAchs];
        return [...base].sort((a, b) => toMs(b.unlockedAt) - toMs(a.unlockedAt));
    }, [raAchs, steamAchs, xboxAchs, filter]);

    const loadedDays = useMemo(() => new Set(sourceAchs.map(a => dayKey(a.unlockedAt))), [sourceAchs]);

    // Auto-load next chunk when selected day has heatmap data but isn't loaded yet
    useEffect(() => {
        if (view !== 'achievements' || !selectedDay || !heatmapData[selectedDay] || loadedDays.has(selectedDay) || nextChunk > 4 || loadingMore) return;
        loadMoreRef.current();
    }, [selectedDay, loadedDays, nextChunk, loadingMore]);

    const displayAchs = useMemo(() => {
        if (!selectedDay) return sourceAchs;
        return sourceAchs.filter(a => dayKey(a.unlockedAt) === selectedDay);
    }, [sourceAchs, selectedDay]);

    // Day → sessions, like cheevo-tracker: a session is a run of consecutive unlocks
    // in the same game, so switching A → B → A gives three sessions in timeline order.
    // Newest session first; achievements inside a session are sorted newest first on render.
    const groups = useMemo(() => {
        const byDay = {};
        displayAchs.forEach(a => {
            const day = dayKey(a.unlockedAt);
            (byDay[day] ??= []).push(a);
        });
        return Object.entries(byDay)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([day, achs]) => {
                const sessions = [];
                [...achs].sort((a, b) => toMs(a.unlockedAt) - toMs(b.unlockedAt)).forEach(a => {
                    const last = sessions[sessions.length - 1];
                    if (last && last.platform === a.platform && last.gameId === a.gameId) last.achs.push(a);
                    else sessions.push({
                        platform: a.platform,
                        gameId: a.gameId,
                        gameName: a.gameName,
                        gameIcon: a.gameIcon,
                        gameUrl: a.gameUrl,
                        consoleName: a.consoleName,
                        achs: [a],
                    });
                });
                sessions.reverse();
                return { day, achCount: achs.length, sessions };
            });
    }, [displayAchs]);

    // Playtime timeline: day → sessions, newest first. A session crossing midnight is
    // listed under both days; the day total comes from the heatmap (split by day).
    const playGroups = useMemo(() => {
        const base = filter === 'ra' ? sessions.ra : filter === 'steam' ? sessions.steam : [...sessions.ra, ...sessions.steam];
        const byDay = {};
        for (const s of base) for (const part of splitByDay(s.startMs, s.endMs)) (byDay[part.key] ??= []).push(s);
        return Object.entries(byDay)
            .filter(([day]) => !selectedDay || day === selectedDay)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([day, list]) => ({ day, minutes: heatmapData[day]?.count ?? 0, sessions: [...list].sort((a, b) => b.endMs - a.endMs) }));
    }, [sessions, filter, selectedDay, heatmapData]);

    // Scroll sentinel — reveal the next chunk (achievements) or 30 more days (playtime)
    const hasMore = view === 'playtime' ? visibleDays < playGroups.length : nextChunk <= 4;
    useEffect(() => {
        if (!sentinelRef.current || !hasMore || loadingMore) return;
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting) loadMoreRef.current(); },
            { rootMargin: '300px' }
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, nextChunk, visibleDays, view, loadingMore, loading]);

    // Playtime and Playing have no Xbox: both are measured in play time, which Xbox doesn't report
    const filters = useMemo(() => view !== 'achievements' ? [
        { id: 'all',   label: 'All' },
        { id: 'ra',    label: 'RA' },
        { id: 'steam', label: 'Steam' },
    ] : [
        { id: 'all',   label: 'All' },
        { id: 'ra',    label: 'RA' },
        { id: 'steam', label: 'Steam' },
        { id: 'xbox',  label: 'Xbox' },
    ], [view]);

    // Header counts: a plain line, not chips (only filters look tappable)
    const pill = "text-[12px] text-[#8f98a0] whitespace-nowrap";

    return (
        <div className="bg-[#171a21] text-[#c6d4df] min-h-screen flex flex-col font-sans selection:bg-[#66c0f4] selection:text-[#171a21]">
        <style>{`
            @keyframes flameFlicker {
                0%   { transform: scale(1)    rotate(0deg);  opacity: 1;    }
                25%  { transform: scale(1.12) rotate(4deg);  opacity: 0.85; }
                50%  { transform: scale(1.06) rotate(-3deg); opacity: 0.95; }
                75%  { transform: scale(1.10) rotate(2deg);  opacity: 0.88; }
                100% { transform: scale(1)    rotate(0deg);  opacity: 1;    }
            }
        `}</style>

            {/* Topbar */}
            <div className="page-topbar sticky top-0 z-50 bg-[#131a22] border-b border-[#101214] px-4 md:px-8 py-1.5 flex items-center gap-2 text-[10px]">
                <a href="../" className="sp-brand"><img src="../assets/favicon.svg" alt="" />Save<span>point</span></a>
                <span className="text-[#2a475e]">›</span>
                <a href="../" className="text-[#546270] font-bold tracking-[0.15em] uppercase hover:text-[#8f98a0] transition-colors">Yozuryu</a>
                <span className="text-[#2a475e]">›</span>
                <span className="text-[#c6d4df]">Activity</span>
            </div>

            {/* Header */}
            <header className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 pt-8 pb-5 md:pt-5 shadow-md">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="w-[3px] h-6 bg-[#66c0f4] rounded-[1px] shrink-0" />
                        <h1 className="text-2xl md:text-[26px] text-white font-medium tracking-wide leading-none flex items-center gap-3">
                            <Activity size={22} className="text-[#66c0f4]" /> Activity
                        </h1>
                        {/* View switch */}
                        {/* Its own full-width row on mobile (three segments don't fit beside the title) */}
                        <div className="grid grid-cols-3 basis-full md:flex md:basis-auto p-[2px] rounded-[3px] border border-[#2a475e] bg-[#101214] md:ml-auto" role="tablist">
                            {[['achievements', 'Unlocks', Trophy], ['playtime', 'Playtime', Clock], ['playing', 'Playing', Gamepad2]].map(([id, label, Icon]) => (
                                <button key={id} role="tab" aria-selected={view === id} onClick={() => switchView(id)}
                                    className={`flex items-center justify-center gap-1.5 text-[12.5px] font-medium px-3 py-2 md:py-1.5 rounded-[2px] transition-colors ${
                                        view === id ? 'bg-[#2a475e] text-white' : 'text-[#546270] hover:text-[#c6d4df]'
                                    }`}>
                                    <Icon size={12} /> {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {view === 'playing' && !playing && (
                        <div className="flex flex-wrap gap-2">
                            {[78, 70, 74, 92].map((w, i) => <span key={i} className="shimmer h-[19px] rounded-[2px]" style={{ width: w }} />)}
                        </div>
                    )}
                    {view === 'playing' && playing && (
                        <div key="playing-pills" className="flex flex-wrap gap-x-4 gap-y-1 anim-fade">
                            {PLAYING_GROUPS.map(grp => (
                                <span key={grp.id} className={pill}>
                                    <span className={grp.id === 'playing' ? 'text-[#66c0f4]' : 'text-[#c6d4df]'}>{playing.groups[grp.id]?.length ?? 0}</span> {grp.label}
                                </span>
                            ))}
                            <span className={pill}>Last 13 weeks</span>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 flex-1 w-full flex flex-col gap-6">

                {view === 'playing' ? (
                    // Games in rotation: no heatmap, it's about games, not days
                    <div key="playing" className="anim-in flex flex-col gap-4">
                        <div className="flex items-center gap-2 flex-wrap border-b border-[#2a475e] pb-1.5">
                            <span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0" />
                            <span className="text-[13px] text-white tracking-wide uppercase font-medium">In Rotation</span>
                        </div>
                        <div className="crits -mt-2">
                            <span className="crit"><Gamepad2 />Unfinished</span>
                            <span className="crit"><Hourglass /><b>1h+</b> played</span>
                            <span className="crit"><Clock />Last <b>13</b> weeks</span>
                        </div>
                        <div className="frow -mt-1" role="group" aria-label="Platform">
                            {filters.map(f => (
                                <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
                                    className={`fchip ${filter === f.id ? 'on' : ''}`}>{f.label}</button>
                            ))}
                        </div>
                        {!playing ? <PlayingSkeleton /> : playing.error ? (
                            <div className="text-[#8f98a0] text-[11px] py-4 italic text-center anim-fade">Could not load the games in rotation.</div>
                        ) : (
                            playingShown.length === 0 ? (
                                <div key={filter} className="text-[#8f98a0] text-[11px] py-4 italic text-center anim-fade">No games in rotation.</div>
                            ) : (
                                // One section per group; a group with no games is left out (its count stays in the header pills)
                                <div key={filter} className="flex flex-col gap-5 anim-fade">
                                    {PLAYING_GROUPS.map(grp => {
                                        const list = playingShown.filter(g => g.group === grp.id);
                                        if (!list.length) return null;
                                        return (
                                            <section key={grp.id} className="flex flex-col gap-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: GROUP_COLOR[grp.id] }} />
                                                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: GROUP_COLOR[grp.id] }}>{grp.label}</span>
                                                        <span className="text-[10px] text-[#546270] tabular-nums">{list.length}</span>
                                                        <span className="flex-1 h-px bg-[#2a475e] opacity-40" />
                                                        {GROUP_RULES[grp.id]}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-2.5">
                                                    {list.map(g => <PlayingTile key={g.key} game={g} />)}
                                                </div>
                                            </section>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </div>
                ) : (
                    // Fades in on each Unlocks/Playtime switch
                    <div key={view} className="anim-in flex flex-col gap-4">
                        {/* The platform filter drives everything below it */}
                        <div className="frow" role="group" aria-label="Platform">
                            {filters.map(f => (
                                <button key={f.id} onClick={() => { setFilter(f.id); setSelectedDay(null); }} aria-pressed={filter === f.id}
                                    className={`fchip ${filter === f.id ? 'on' : ''}`}>{f.label}</button>
                            ))}
                        </div>

                        {loading || (view === 'playtime' && !playtime) ? <SummarySkeleton /> : (
                            <div key={filter} className="anim-fade">
                                <SummaryCard
                                    open={summaryOpen}
                                    onToggle={toggleSummary}
                                    headline={{ recent: view === 'playtime' ? fmtTotal(recentTotal) : recentTotal, l: view === 'playtime' ? 'Played' : 'Unlocks', year: summaryStats[0].v, games: recentGames }}
                                    stats={summaryStats}
                                    split={splitParts}
                                    filter={filter}
                                    streakInfo={streakInfo}
                                    minLabel={view === 'playtime' ? `${PLAYTIME_STREAK_MIN} min+ a day` : null}
                                    selectedDay={selectedDay}
                                    onClear={() => setSelectedDay(null)}
                                    recent={slim => <RecentDays slim={slim} streakInfo={streakInfo} heatmapData={heatmapData} cellLabel={cellLabel} describe={describeDay}
                                        selectedDay={selectedDay} onSelectDay={setSelectedDay} />}
                                    heatmap={<Heatmap heatmapData={heatmapData} filter={filter} selectedDay={selectedDay} onSelectDay={setSelectedDay} describe={describeDay} />}
                                />
                            </div>
                        )}

                        {/* Section title + what's listed */}
                        <div className="flex items-center gap-2 border-b border-[#2a475e] pb-1.5 mt-2">
                            <span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0" />
                            <span className="text-[13px] text-white tracking-wide uppercase font-medium">{view === 'playtime' ? 'Play Sessions' : 'Recent Unlocks'}</span>
                            {selectedDay && (
                                <button onClick={() => setSelectedDay(null)} className="ml-auto fchip on anim-fade" style={{ height: 22 }}>
                                    {fmtDay(selectedDay, { day: '2-digit', month: 'short' })} ✕
                                </button>
                            )}
                        </div>

                        {/* Timeline */}
                        {view === 'playtime' ? (
                            !playtime || loading ? <TimelineSkeleton /> : playGroups.length === 0 ? (
                                <div key={`${filter}-${selectedDay}`} className="text-[#8f98a0] text-[11px] py-4 italic text-center anim-fade">No play sessions found.</div>
                            ) : (
                                <div key={`${filter}-${selectedDay}`} className="flex flex-col gap-4">
                                    {playGroups.slice(0, selectedDay ? undefined : visibleDays).map(({ day, minutes, sessions: daySessions }) => (
                                        <section key={day} className="anim-fade">
                                            <DayHead day={day}>
                                                <b>{fmtMinutes(minutes)}</b> · {new Set(daySessions.map(s => `${s.platform}-${s.gameId}`)).size} game{new Set(daySessions.map(s => `${s.platform}-${s.gameId}`)).size !== 1 ? 's' : ''}
                                            </DayHead>
                                            <PlayDay day={day} sessions={daySessions} />
                                        </section>
                                    ))}
                                </div>
                            )
                        ) : loading ? <TimelineSkeleton /> : groups.length === 0 ? (
                            <div key={`${filter}-${selectedDay}`} className="text-[#8f98a0] text-[11px] py-4 italic text-center anim-fade">No achievements found.</div>
                        ) : (
                            <div key={`${filter}-${selectedDay}`} className="flex flex-col gap-4">
                                {groups.map(({ day, achCount, sessions }) => {
                                    const games = new Set(sessions.map(s => `${s.platform}-${s.gameId}`)).size;
                                    return (
                                        <section key={day} className="anim-fade">
                                            <DayHead day={day}>
                                                <b>{achCount}</b> unlock{achCount !== 1 ? 's' : ''}{games > 1 ? ` · ${games} games` : ''}
                                            </DayHead>
                                            <div className="flex flex-col gap-2">
                                                {sessions.map(session => <GameSession key={session.achs[0].id} session={session} raArt={raArt} />)}
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        )}

                        {/* Scroll sentinel */}
                        {!loading && hasMore && (view === 'achievements' || !selectedDay) && (
                            <div ref={sentinelRef} className="py-4" />
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-[#1b2838] border-t-2 border-[#2a475e] px-4 md:px-8 py-2.5 flex items-center gap-3 mt-auto">
                <div className="w-[3px] h-[18px] rounded-[1px] bg-[#66c0f4] opacity-50 shrink-0" />
                <p className="text-[10px] text-[#546270]">Savepoint · Combined activity</p>
                <a href="../" className="ml-auto text-[10px] text-[#546270] hover:text-[#66c0f4] transition-colors">← Back to hub</a>
            </footer>

            {/* Scroll-to-top */}
            {showScrollTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="scroll-top-btn anim-fade fixed bottom-14 right-4 z-50 w-10 h-10 bg-[#131a22] border border-[#2a475e] hover:border-[#66c0f4] hover:text-[#66c0f4] text-[#8f98a0] rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90"
                    title="Scroll to top"
                >
                    <ChevronDown size={16} className="rotate-180" />
                </button>
            )}

        </div>
    );
};

createRoot(document.getElementById('root')).render(<App />);
