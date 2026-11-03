import React, { useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Star, Gem, ChevronDown, Flame, Feather, Check, Plus } from 'lucide-react';
import { TZ, fmtDate, monthKey, yearOf, keyToDate } from '../assets/time.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const RA_MEDIA  = 'https://media.retroachievements.org';
const RA_SITE   = 'https://retroachievements.org';
const achIconUrl = (appId, hash) => hash ? `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${appId}/${hash}` : null;

const formatPlaytime = mins => {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? ` ${m}m` : ''}`.trim() : `${m}m`;
};

// Dates, month groups and the dedupe year all use the viewer's timezone (assets/time.js)

const rarityLabel = pct => pct < 1 ? 'Ultra Rare' : pct < 10 ? 'Very Rare' : pct < 25 ? 'Rare' : pct < 50 ? 'Uncommon' : 'Common';
const rarityColor = pct => pct < 1 ? '#ff6b6b' : pct < 10 ? '#e5b143' : pct < 25 ? '#66c0f4' : '#8f98a0';

const parseTitle = title => {
    if (!title) return { baseTitle: title, subsetName: null, isSubset: false, tags: [] };
    const tags = [];
    const withoutTags = title.replace(/~([^~]+)~\s*/g, (_, tag) => { tags.push(tag); return ''; }).trim();
    const subsetMatch = withoutTags.match(/^(.+?)\s*\[Subset\s*[-–]\s*(.+?)\]$/);
    if (subsetMatch) return { baseTitle: subsetMatch[1].trim(), subsetName: subsetMatch[2].trim(), isSubset: true, tags };
    return { baseTitle: withoutTags, subsetName: null, isSubset: false, tags };
};

const TILDE_TAG_COLORS = {
    'Homebrew':  { bg: 'rgba(102,192,244,0.08)', border: 'rgba(102,192,244,0.3)',  color: '#66c0f4' },
    'Demo':      { bg: 'rgba(87,203,222,0.08)',  border: 'rgba(87,203,222,0.3)',   color: '#57cbde' },
    'Prototype': { bg: 'rgba(143,152,160,0.08)', border: 'rgba(143,152,160,0.3)',  color: '#8f98a0' },
    'Hack':      { bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.3)',  color: '#ff6b6b' },
};

const TildeTags = ({ tags }) => tags.map(tag => {
    const s = TILDE_TAG_COLORS[tag] || TILDE_TAG_COLORS['Prototype'];
    return (
        <span key={tag} className="text-[7px] font-bold uppercase tracking-[0.07em] px-1 py-[1px] rounded-[2px] shrink-0"
            style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
            {tag}
        </span>
    );
});

// ── Normalizers ───────────────────────────────────────────────────────────────

// RA's "no image" placeholder (standalone games) counts as no screenshot
const RA_NO_IMAGE = '/Images/000002.png';
const raShotUrl = path => path && !path.endsWith(RA_NO_IMAGE) ? `${RA_MEDIA}${path}` : null;
const steamHeader = appId => `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;

const normalizeRA = (awards, showBeaten, totals = {}) =>
    awards
        .filter(a => {
            if (a.awardType === 'Mastery/Completion') return true;
            if (showBeaten && a.awardType === 'Game Beaten' && a.awardDataExtra === 1) return true;
            return false;
        })
        .map(a => ({
            platform: 'ra',
            type: a.awardType === 'Mastery/Completion' ? 'mastered' : 'beaten',
            completedAt: a.awardedAt,
            gameId: a.awardData,
            gameName: a.title,
            ...parseTitle(a.title),
            iconUrl: `${RA_MEDIA}${a.imageIcon}`,
            artUrl: raShotUrl(a.imageIngame),
            hardcore: a.awardDataExtra === 1,
            total: totals[a.awardData] ?? null,
            console: a.consoleName,
            playtime: a.playtime,
            lastAchName: a.winCondition?.name ?? null,   // beaten: the win condition (RA pipeline)
            lastAchGlobalPct: a.winCondition?.pct ?? null,
            gameUrl: `${RA_SITE}/game/${a.awardData}`,
        }));

const normalizeSteam = perfectGames =>
    perfectGames.map(g => ({
        platform: 'steam',
        type: 'perfect',
        completedAt: g.completedAt,
        gameId: g.appId,
        gameName: g.gameName,
        iconUrl: g.lastAchIconUrl || g.iconUrl,
        artUrl: steamHeader(g.appId),
        total: g.total,
        lastAchName: g.lastAchName,
        lastAchGlobalPct: g.lastAchGlobalPct,
        playtime: g.playtimeForever,
        gameUrl: `https://store.steampowered.com/app/${g.appId}`,
    }));

const normalizeSteamBeaten = beatenGames =>
    beatenGames.map(g => ({
        platform: 'steam',
        type: 'beaten',
        completedAt: g.beatenAt,
        gameId: g.appId,
        gameName: g.gameName,
        iconUrl: achIconUrl(g.appId, g.winCondIconHash) || g.iconUrl,
        artUrl: steamHeader(g.appId),
        total: g.total,
        lastAchName: g.winConditionName,
        lastAchGlobalPct: g.winCondGlobalPct,
        playtime: g.playtimeForever,
        gameUrl: `https://store.steampowered.com/app/${g.appId}`,
    }));

const EDS_WIDTHS = [64, 128, 150, 200, 208, 300, 424];
// Xbox images are full-size originals; resize on request (images-eds only accepts certain widths)
const xboxImg = (url, width) => {
    if (!url) return url;
    if (url.includes('store-images.s-microsoft.com')) return `${url}${url.includes('?') ? '&' : '?'}w=${width}`;
    if (url.includes('images-eds')) return `${url}&w=${EDS_WIDTHS.find(w => w >= width) ?? 424}`;
    return url;
};

const xboxSearchUrl = name => `https://www.xbox.com/en-US/Search/Results?q=${encodeURIComponent(name ?? '')}`;

const normalizeXbox = completedGames =>
    completedGames.map(g => ({
        platform: 'xbox',
        type: 'completed',
        completedAt: g.completedAt,
        gameId: g.titleId,
        gameName: g.gameName,
        iconUrl: xboxImg(g.iconUrl, 128),   // square box art, like RA (Steam uses achievement art: no square game art)
        artUrl: g.heroUrl ? xboxImg(g.heroUrl, 640) : null,
        total: g.total,
        lastAchName: g.lastAchName,
        lastAchGlobalPct: g.lastAchGlobalPct,
        gameUrl: xboxSearchUrl(g.gameName),
    }));

const normalizeXboxBeaten = beatenGames =>
    beatenGames.map(g => ({
        platform: 'xbox',
        type: 'beaten',
        completedAt: g.beatenAt,
        gameId: g.titleId,
        gameName: g.gameName,
        iconUrl: xboxImg(g.iconUrl, 128),
        artUrl: g.heroUrl ? xboxImg(g.heroUrl, 640) : null,
        total: g.total,
        lastAchName: g.winConditionName,
        lastAchGlobalPct: g.winCondGlobalPct,
        gameUrl: xboxSearchUrl(g.gameName),
    }));

// Games beaten via win conditions (hand-picked "ending" achievements in the admin).
// OR mode: first matching unlock counts; AND mode: all must be unlocked, latest wins.
const loadWinConditionBeaten = async (platform, idKey) => {
    const wc = await fetch(`../data/${platform}/win-conditions.json`).then(r => r.json());
    const entries = Object.entries(wc);
    if (!entries.length) return [];
    const results = await Promise.all(entries.map(async ([id, cond]) => {
        try {
            const isArr = Array.isArray(cond);
            const mode  = isArr ? 'or' : (cond.mode || 'or');
            const names = isArr ? cond : (cond.achievements || []);
            const game = await fetch(`../data/${platform}/games/${id}.json`).then(r => r.json());
            const matched = (game.achievements || [])
                .filter(a => names.includes(a.apiName) && a.unlocked && a.unlockedAt);
            if (mode === 'and') {
                if (matched.length < names.length) return null;
                matched.sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));
            } else {
                if (!matched.length) return null;
                matched.sort((a, b) => new Date(a.unlockedAt) - new Date(b.unlockedAt));
            }
            const pick = matched[0];
            return {
                [idKey]: game[idKey],
                gameName: game.gameName,
                iconUrl: game.iconUrl,
                heroUrl: game.heroUrl,
                winCondIconUrl: pick.iconUrl,
                winCondGlobalPct: pick.globalPct,
                total: game.total,
                beatenAt: pick.unlockedAt,
                winConditionName: pick.displayName,
            };
        } catch { return null; }
    }));
    return results.filter(Boolean);
};

// ── Dedupe ────────────────────────────────────────────────────────────────────

// One mastered/perfect entry per game. A beaten entry is dropped only when the
// same game was mastered/perfected in the same calendar year — beaten one year
// and completed in a later year are kept as two separate milestones.
const dedupeCompletions = entries => {
    const keyOf = e => `${e.platform}-${e.gameId}`;
    const completed = new Map();
    for (const e of entries) {
        if (e.type === 'beaten') continue;
        if (!completed.has(keyOf(e))) completed.set(keyOf(e), e);
    }
    const beaten = entries.filter(e => {
        if (e.type !== 'beaten') return false;
        const done = completed.get(keyOf(e));
        if (!done) return true;
        const doneYear = yearOf(done.completedAt);
        // Unknown completion date: keep the previous behaviour and hide beaten
        return doneYear !== null && doneYear !== yearOf(e.completedAt);
    });
    const seenBeaten = new Set();
    return [
        ...completed.values(),
        ...beaten.filter(e => !seenBeaten.has(keyOf(e)) && seenBeaten.add(keyOf(e))),
    ];
};

// ── Group by month ────────────────────────────────────────────────────────────

const groupByMonth = completions => {
    const map = {};
    completions.forEach(c => {
        const key = monthKey(c.completedAt);
        if (!map[key]) map[key] = [];
        map[key].push(c);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
};

// ── Pieces ────────────────────────────────────────────────────────────────────

const isComplete = item => item.type !== 'beaten';
const STATUS_LABEL = { mastered: 'Mastered', perfect: 'Perfect', completed: 'Completed' };
const PLATFORM_CHIP = {
    ra:    { label: 'RA',    color: '#e5b143', border: 'rgba(229,177,67,0.4)'  },
    steam: { label: 'Steam', color: '#66c0f4', border: 'rgba(102,192,244,0.4)' },
    xbox:  { label: 'Xbox',  color: '#52b043', border: 'rgba(82,176,67,0.45)'  },
};
const fmtDayMonth = v => fmtDate(v, { day: 'numeric', month: 'short' });
const chipCls = 'text-[10px] font-bold uppercase tracking-[0.06em] px-1.5 py-[1px] rounded-[2px] border shrink-0 inline-flex items-center gap-1';

const PlatformChip = ({ platform }) => {
    const c = PLATFORM_CHIP[platform];
    return <span className={chipCls} style={{ color: c.color, borderColor: c.border, background: 'rgba(16,18,20,0.75)' }}>{c.label}</span>;
};
const HardcoreChip = () => (
    <span className={chipCls} style={{ color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.45)', background: 'rgba(16,18,20,0.75)' }}><Flame size={10} />Hardcore</span>
);

// Rarest achievement of a game, from the unlock history (lowest r)
const Rarest = ({ item, rare }) => {
    if (!rare) return <span className="text-[#546270]">—</span>;
    if (item.platform === 'ra') {
        return (
            <>
                <span className="flex items-center gap-1 font-semibold" style={{ color: rare.hc ? '#ff6b6b' : '#8f98a0' }}>
                    {rare.hc ? <Flame size={11} /> : <Feather size={11} />}{rare.r.toFixed(1)}%
                </span>
                <span className="text-[11px] text-[#8f98a0] truncate">{rare.n}</span>
            </>
        );
    }
    return (
        <>
            <span className="flex items-center gap-1 font-semibold text-[12px] whitespace-nowrap min-w-0" style={{ color: rarityColor(rare.r) }}>
                <Gem size={10} className="shrink-0" /><span className="shrink-0">{rare.r}%</span><span className="truncate font-normal">{rarityLabel(rare.r)}</span>
            </span>
            <span className="text-[11px] text-[#8f98a0] truncate">{rare.n}</span>
        </>
    );
};

// Art banner of a highlight: Steam store banner uncropped; RA screenshot with the icon over
// it (or the icon zoomed and blurred when there's no screenshot); Xbox hero with its icon
const HighlightArt = ({ item }) => {
    if (item.platform === 'steam') {
        return <img src={item.artUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />;
    }
    const pixel = item.platform === 'ra' ? 'px' : '';
    return (
        <>
            {item.artUrl
                ? <img src={item.artUrl} alt="" loading="lazy" className={`absolute inset-0 w-full h-full object-cover ${pixel}`} />
                : <img src={item.iconUrl} alt="" loading="lazy" className={`absolute w-[140%] max-w-none h-[220%] left-[-20%] top-[-60%] object-cover blur-[12px] saturate-[1.3] brightness-[0.7] ${pixel}`} />}
            <img src={item.iconUrl} alt="" loading="lazy"
                className={`absolute left-3 bottom-3 h-[38%] aspect-square rounded-[3px] border-2 border-white/20 shadow-[0_6px_16px_rgba(0,0,0,0.6)] object-cover bg-[#101214] ${pixel}`} />
        </>
    );
};

// A completed game (★ Mastered / Perfect / Completed): art banner, status, title, console,
// achievements, time played and the rarest achievement
const Highlight = ({ item, rare }) => (
    <a href={item.gameUrl} target="_blank" rel="noreferrer"
        className="flex flex-col bg-[#1b2838] border border-[#2a475e] border-l-[3px] rounded-[3px] overflow-hidden hover:-translate-y-0.5 transition-transform"
        style={{ borderLeftColor: '#e5b143' }}>
        <div className="relative aspect-[460/215] overflow-hidden bg-[#101214]">
            <HighlightArt item={item} />
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <PlatformChip platform={item.platform} />
                {item.platform === 'ra' && item.hardcore && <HardcoreChip />}
            </div>
            <span className="absolute top-2 right-2 text-[11px] font-semibold text-white bg-[#101214]/85 px-1.5 py-[1px] rounded-[2px]">{fmtDayMonth(item.completedAt)}</span>
        </div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 px-3 py-2 border-b border-[#22344a] min-w-0">
            <span className={chipCls} style={{ background: '#e5b143', borderColor: '#e5b143', color: '#101214' }}><Star size={10} fill="currentColor" />{STATUS_LABEL[item.type]}</span>
            <span className="text-[13px] font-semibold text-white truncate min-w-0 max-w-full">{item.baseTitle || item.gameName}</span>
            {item.tags?.length > 0 && <TildeTags tags={item.tags} />}
            {item.console && <span className="text-[11px] text-[#8f98a0] truncate min-w-0">{item.console}</span>}
        </div>
        <div className="grid divide-x divide-[#22344a] text-[13px]"
            style={{ gridTemplateColumns: item.playtime > 0 ? 'auto auto minmax(0, 1fr)' : 'auto minmax(0, 1fr)' }}>
            <div className="flex flex-col gap-0.5 px-3 py-2">
                <span className="text-[11px] text-[#8f98a0]">Achievements</span>
                <span className="font-semibold text-[#e5b143] tabular-nums">{item.total != null ? `${item.total}/${item.total}` : '—'}</span>
            </div>
            {item.playtime > 0 && (
                <div className="flex flex-col gap-0.5 px-3 py-2">
                    <span className="text-[11px] text-[#8f98a0]">Played</span>
                    <span className="font-semibold text-[#c6d4df] tabular-nums">{formatPlaytime(item.playtime)}</span>
                </div>
            )}
            <div className="flex flex-col gap-0.5 px-3 py-2 min-w-0">
                <span className="text-[11px] text-[#8f98a0]">Rarest</span>
                <Rarest item={item} rare={rare} />
            </div>
        </div>
    </a>
);

// A beaten game: compact silver row with its art faded behind (row styles in assets/ui.css);
// every row shows the achievement that beat the game (RA: its win condition)
const BeatenRow = ({ item }) => (
    <a href={item.gameUrl} target="_blank" rel="noreferrer" className="grow" style={{ background: '#1b2838', borderColor: '#2a475e', borderLeftColor: '#b8c4ce' }}>
        {(item.artUrl || item.platform === 'ra') && (
            <div className="grow-art"><img src={item.artUrl || item.iconUrl} alt="" loading="lazy" className={`${item.platform === 'ra' ? 'px' : ''} ${item.artUrl ? '' : 'art-icon'}`} /></div>
        )}
        {item.platform === 'steam'
            ? <img src={item.artUrl} alt="" loading="lazy" className="grow-banner" />
            : <img src={item.iconUrl} alt="" loading="lazy" className={`grow-icon ${item.platform === 'ra' ? 'px' : ''}`} />}
        <div className="grow-main">
            <span className="grow-title" style={{ whiteSpace: 'normal' }}>{item.baseTitle || item.gameName}</span>
            <div className="grow-sub" style={{ flexWrap: 'wrap', rowGap: '3px' }}>
                <span className={chipCls} style={{ color: '#c6d4df', borderColor: 'rgba(184,196,206,0.35)', background: '#2a3440' }}>Beaten</span>
                <PlatformChip platform={item.platform} />
                {item.console && <span>{item.console}</span>}
                {item.platform === 'ra' && item.hardcore && <Flame size={11} className="text-[#ff6b6b]" />}
                {item.tags?.length > 0 && <TildeTags tags={item.tags} />}
            </div>
            {item.lastAchName && (
                <div className="grow-sub" style={{ flexWrap: 'wrap', rowGap: '2px', whiteSpace: 'normal' }}>
                    <span className="text-[#e5b143] shrink">{item.lastAchName}</span>
                    {item.lastAchGlobalPct != null && (item.platform === 'ra' ? (
                        // RA: unlock rate among players of the same mode, as in the achievement modal
                        <span className="flex items-center gap-1" style={{ color: item.hardcore ? '#ff6b6b' : '#8f98a0' }}>
                            {item.hardcore ? <Flame size={10} /> : <Feather size={10} />}{item.lastAchGlobalPct}%
                        </span>
                    ) : (
                        <span className="flex items-center gap-1" style={{ color: rarityColor(item.lastAchGlobalPct) }}>
                            <Gem size={10} />{rarityLabel(item.lastAchGlobalPct)} · {item.lastAchGlobalPct}%
                        </span>
                    ))}
                </div>
            )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 text-[11px] text-[#8f98a0] tabular-nums" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
            <span>{fmtDayMonth(item.completedAt)}</span>
            {item.playtime > 0 && <span>{formatPlaytime(item.playtime)}</span>}
        </div>
    </a>
);

// Timeline group: a ring on the line, label and count, then its entries
const TimelineGroup = ({ label, count, children }) => (
    <div className="relative pl-6">
        <span className="absolute left-[7px] top-[18px] bottom-[-20px] w-px bg-[#22344a]" />
        <span className="absolute left-0 top-[2px] w-[15px] h-[15px] rounded-full border-2 border-[#2a475e] bg-[#171a21]" />
        <div className="text-[12px] font-semibold text-[#8f98a0] mb-2">{label} <span className="text-[#546270] font-normal ml-1">{count}</span></div>
        {children}
    </div>
);

const YearSummary = ({ items }) => {
    const done = items.filter(isComplete).length;
    const beaten = items.length - done;
    const mins = items.reduce((sum, i) => sum + (i.playtime || 0), 0);
    const parts = [];
    if (done) parts.push(<span key="d" className="text-[#e5b143] font-semibold">{done} ★ complete</span>);
    if (beaten) parts.push(<span key="b"><span className="text-[#c6d4df] font-semibold">{beaten}</span> beaten</span>);
    if (mins >= 60) parts.push(<span key="h">{Math.round(mins / 60).toLocaleString()}h played</span>);
    return <span className="text-[12px] text-[#8f98a0]">{parts.flatMap((p, i) => i ? [<span key={`s${i}`} className="mx-1.5 text-[#546270]">·</span>, p] : [p])}</span>;
};

// An open year. Phone: month timeline, highlights and rows in date order. Desktop: completed
// games three across, then beaten rows three across.
const YearOpen = ({ year, items, rarest, onToggle }) => {
    const months = groupByMonth(items);
    const done = items.filter(isComplete);
    const beaten = items.filter(i => !isComplete(i));
    const rare = item => rarest[`${item.platform}-${item.gameId}`];
    return (
        <section className="flex flex-col gap-4">
            <button onClick={onToggle} className="flex items-baseline gap-3 text-left group outline-none">
                <span className="text-[22px] font-semibold text-white leading-none">{year}</span>
                <YearSummary items={items} />
                <ChevronDown size={14} className="ml-auto self-center rotate-180 text-[#546270] group-hover:text-[#c6d4df] transition-colors" />
            </button>

            <div className="flex flex-col gap-5 md:hidden">
                {months.map(([key, list]) => (
                    <TimelineGroup key={key} label={keyToDate(`${key}-01`).toLocaleDateString('en-GB', { month: 'long' })} count={list.length}>
                        <div className="flex flex-col gap-2.5">
                            {list.map((item, i) => isComplete(item)
                                ? <Highlight key={`${item.platform}-${item.gameId}-${i}`} item={item} rare={rare(item)} />
                                : <BeatenRow key={`${item.platform}-${item.gameId}-${i}`} item={item} />)}
                        </div>
                    </TimelineGroup>
                ))}
            </div>

            <div className="hidden md:flex flex-col gap-5">
                {done.length > 0 && (
                    <TimelineGroup label="Completed" count={done.length}>
                        <div className="grid grid-cols-3 gap-3">
                            {done.map((item, i) => <Highlight key={`${item.platform}-${item.gameId}-${i}`} item={item} rare={rare(item)} />)}
                        </div>
                    </TimelineGroup>
                )}
                {beaten.length > 0 && (
                    <TimelineGroup label="Beaten" count={beaten.length}>
                        <div className="grid grid-cols-3 gap-3">
                            {beaten.map((item, i) => <BeatenRow key={`${item.platform}-${item.gameId}-${i}`} item={item} />)}
                        </div>
                    </TimelineGroup>
                )}
            </div>
        </section>
    );
};

// A closed year: one line with its counts and a row of covers (★ on completed ones)
const YearClosed = ({ year, items, onToggle }) => {
    const done = items.filter(isComplete).length;
    const beaten = items.length - done;
    return (
        <button onClick={onToggle} className="w-full flex items-center gap-3 py-2.5 border-t border-[#22344a] text-left group outline-none min-w-0">
            <span className="text-[15px] font-semibold text-white w-11 shrink-0">{year}</span>
            <span className="text-[12px] text-[#8f98a0] shrink-0">
                {done > 0 && <span className="text-[#e5b143] font-semibold">{done} ★</span>}
                {done > 0 && beaten > 0 && <span className="mx-1 text-[#546270]">·</span>}
                {beaten > 0 && <><span className="text-[#c6d4df] font-semibold">{beaten}</span> beaten</>}
            </span>
            <span className="flex items-center gap-1.5 overflow-hidden min-w-0 flex-1">
                {items.slice(0, 12).map((item, i) => (
                    <span key={i} className="relative shrink-0">
                        <img src={item.platform === 'steam' ? item.artUrl : item.iconUrl} alt="" title={item.gameName} loading="lazy"
                            className={`h-6 rounded-[2px] border border-[#101214] bg-[#2a475e] object-cover ${item.platform === 'steam' ? 'w-[51px]' : 'w-6'} ${item.platform === 'ra' ? 'px' : ''}`} />
                        {isComplete(item) && <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#e5b143] text-[#101214] grid place-items-center"><Star size={7} fill="currentColor" /></span>}
                    </span>
                ))}
            </span>
            <ChevronDown size={14} className="shrink-0 text-[#546270] group-hover:text-[#c6d4df] transition-colors" />
        </button>
    );
};

// Rarest unlocked achievement per game across the unlock history (history/{YYYY}.json),
// loaded once for the platforms that have a completed game on screen
const loadRarest = async platforms => {
    const out = {};
    await Promise.all(platforms.map(async pl => {
        try {
            const idx = await fetch(`../data/${pl}/history/index.json`).then(r => r.json());
            const years = await Promise.all(Object.keys(idx.years || {}).map(y =>
                fetch(`../data/${pl}/history/${y}.json`).then(r => r.json()).catch(() => ({ unlocks: [] }))));
            for (const file of years) {
                for (const u of file.unlocks || []) {
                    if (u.r == null) continue;
                    const key = `${pl}-${u.g}`;
                    if (!out[key] || u.r < out[key].r) out[key] = { r: u.r, n: u.n, hc: u.hc };
                }
            }
        } catch { /* no history for this platform: highlights show — */ }
    }));
    return out;
};

// ── App ───────────────────────────────────────────────────────────────────────

const App = () => {
    const currentYear = String(new Date().getFullYear());

    const [raProfile,        setRaProfile]        = useState(null);
    const [steamProfile,     setSteamProfile]     = useState(null);
    const [beatenSteamGames, setBeatenSteamGames] = useState(null);
    const [xboxProfile,      setXboxProfile]      = useState(null);
    const [beatenXboxGames,  setBeatenXboxGames]  = useState(null);
    const [platform,         setPlatform]         = useState('all');
    const [showBeaten,       setShowBeaten]       = useState(true);
    const [hiddenTags,       setHiddenTags]       = useState(new Set(['Hack', 'Homebrew', 'Prototype']));
    const [expandedYears,    setExpandedYears]    = useState(new Set([currentYear]));

    const toggleYear = year =>
        setExpandedYears(prev => {
            const next = new Set(prev);
            next.has(year) ? next.delete(year) : next.add(year);
            return next;
        });

    useEffect(() => {
        fetch('../data/ra/profile.json')
            .then(r => r.json()).then(setRaProfile).catch(() => setRaProfile({}));
        fetch('../data/steam/profile.json')
            .then(r => r.json()).then(setSteamProfile).catch(() => setSteamProfile({}));
        fetch('../data/xbox/profile.json')
            .then(r => r.json()).then(setXboxProfile).catch(() => setXboxProfile({}));
        loadWinConditionBeaten('xbox', 'titleId')
            .then(setBeatenXboxGames).catch(() => setBeatenXboxGames([]));
        fetch('../data/steam/win-conditions.json')
            .then(r => r.json())
            .then(async wc => {
                const entries = Object.entries(wc);
                if (!entries.length) { setBeatenSteamGames([]); return; }
                const results = await Promise.all(
                    entries.map(async ([appId, wc]) => {
                        try {
                            const isArr = Array.isArray(wc);
                            const mode  = isArr ? 'or' : (wc.mode || 'or');
                            const names = isArr ? wc : (wc.achievements || []);
                            const game = await fetch(`../data/steam/games/${appId}.json`).then(r => r.json());
                            const matched = (game.achievements || [])
                                .filter(a => names.includes(a.apiName) && a.unlocked && a.unlockedAt);
                            if (mode === 'and') {
                                if (matched.length < names.length) return null;
                                matched.sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));
                            } else {
                                if (!matched.length) return null;
                                matched.sort((a, b) => new Date(a.unlockedAt) - new Date(b.unlockedAt));
                            }
                            const pick = matched[0];
                            return {
                                appId: game.appId,
                                gameName: game.gameName,
                                iconUrl: game.iconUrl,
                                winCondIconHash: pick.iconUrl,
                                winCondGlobalPct: pick.globalPct,
                                total: game.total,
                                playtimeForever: game.playtimeForever,
                                beatenAt: pick.unlockedAt,
                                winConditionName: pick.displayName,
                            };
                        } catch { return null; }
                    })
                );
                setBeatenSteamGames(results.filter(Boolean));
            })
            .catch(() => setBeatenSteamGames([]));
    }, []);

    const completions = useMemo(() => {
        const raTotals     = Object.fromEntries((raProfile?.gameAwardsAndProgress?.results ?? []).map(g => [g.gameId, g.maxPossible]));
        const ra           = normalizeRA(raProfile?.pageAwards?.visibleUserAwards ?? [], showBeaten, raTotals);
        const steamPerfect = normalizeSteam(steamProfile?.perfectGames ?? []);
        const steamBeaten  = showBeaten ? normalizeSteamBeaten(beatenSteamGames ?? []) : [];
        const xboxDone     = normalizeXbox(xboxProfile?.perfectGames ?? []);
        const xboxBeaten   = showBeaten ? normalizeXboxBeaten(beatenXboxGames ?? []) : [];
        let all = dedupeCompletions([...ra, ...steamPerfect, ...steamBeaten, ...xboxDone, ...xboxBeaten]);
        if (platform !== 'all') all = all.filter(c => c.platform === platform);
        if (hiddenTags.size > 0)  all = all.filter(c => !c.tags?.some(t => hiddenTags.has(t)));
        return all.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    }, [raProfile, steamProfile, beatenSteamGames, xboxProfile, beatenXboxGames, platform, showBeaten, hiddenTags]);

    const groups  = useMemo(() => groupByMonth(completions), [completions]);
    const loading = raProfile === null || steamProfile === null || beatenSteamGames === null
        || xboxProfile === null || beatenXboxGames === null;

    // Group months under years for rendering
    const byYear = useMemo(() => {
        const map = {};
        groups.forEach(([key, items]) => {
            const year = key.split('-')[0];
            if (!map[year]) map[year] = [];
            map[year].push([key, items]);
        });
        return Object.entries(map).sort(([a], [b]) => +b - +a);
    }, [groups]);

    // Rarest achievements come from the unlock history, fetched once a completed game is on screen
    const [rarest, setRarest] = useState({});
    const rarestRequested = React.useRef(new Set());
    useEffect(() => {
        const need = new Set();
        byYear.forEach(([year, monthGroups]) => {
            if (!expandedYears.has(year)) return;
            monthGroups.forEach(([, items]) => items.forEach(i => { if (isComplete(i)) need.add(i.platform); }));
        });
        const todo = [...need].filter(pl => !rarestRequested.current.has(pl));
        if (!todo.length) return;
        todo.forEach(pl => rarestRequested.current.add(pl));
        loadRarest(todo).then(r => setRarest(prev => ({ ...prev, ...r })));
    }, [byYear, expandedYears]);

    return (
        <div className="bg-[#171a21] text-[#c6d4df] min-h-screen flex flex-col font-sans selection:bg-[#66c0f4] selection:text-[#171a21]">

            {/* Topbar */}
            <div className="page-topbar sticky top-0 z-50 bg-[#131a22] border-b border-[#101214] px-4 md:px-8 py-1.5 flex items-center gap-2 text-[10px]">
                <a href="../" className="text-[#546270] font-bold tracking-[0.15em] uppercase hover:text-[#8f98a0] transition-colors">Yozuryu</a>
                <span className="text-[#2a475e]">›</span>
                <a href="../" className="text-[#546270] hover:text-[#8f98a0] transition-colors">Gaming Hub</a>
                <span className="text-[#2a475e]">›</span>
                <span className="text-[#c6d4df]">Completions</span>
            </div>

            {/* Header */}
            <header className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 pt-8 pb-5 md:pt-5 shadow-md">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-3">
                        <span className="w-[3px] h-6 bg-[#e5b143] rounded-[1px] shrink-0" />
                        <h1 className="text-2xl md:text-[26px] text-white font-medium tracking-wide leading-none flex items-center gap-3">
                            <Star size={22} className="text-[#e5b143]" /> Completions
                        </h1>
                        {!loading && (
                            <span className="ml-1 text-[12px] text-[#8f98a0] anim-fade"><span className="text-[#c6d4df] font-semibold">{completions.length}</span> total</span>
                        )}
                        <span className="ml-auto text-[10px] text-[#546270]" title="Dates are shown in your timezone">{TZ}</span>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 flex-1 w-full">

                {/* Filters: platform, then what to include; one row that scrolls sideways (styles in assets/ui.css) */}
                <div className="frow mb-6" role="group" aria-label="Filter completions">
                    {[
                        { value: 'all',   label: 'All'   },
                        { value: 'ra',    label: 'RA'    },
                        { value: 'steam', label: 'Steam' },
                        { value: 'xbox',  label: 'Xbox'  },
                    ].map(opt => (
                        <button key={opt.value} onClick={() => setPlatform(opt.value)} aria-pressed={platform === opt.value}
                            className={`fchip ${platform === opt.value ? 'on' : ''}`}>{opt.label}</button>
                    ))}
                    <span className="fsep" />
                    <button onClick={() => setShowBeaten(v => !v)} aria-pressed={showBeaten} title="Include beaten games"
                        className={`fchip ${showBeaten ? 'on' : ''}`}>
                        {showBeaten ? <Check size={12} /> : <Plus size={12} />}Beaten
                    </button>
                    {[['Hack', 'Hacks'], ['Homebrew', 'Homebrew'], ['Prototype', 'Prototypes']].map(([tag, label]) => {
                        const shown = !hiddenTags.has(tag);
                        return (
                            <button key={tag} aria-pressed={shown} title={`Include ${label.toLowerCase()}`}
                                onClick={() => setHiddenTags(prev => {
                                    const next = new Set(prev);
                                    next.has(tag) ? next.delete(tag) : next.add(tag);
                                    return next;
                                })}
                                className={`fchip ${shown ? 'on' : ''}`}>
                                {shown ? <Check size={12} /> : <Plus size={12} />}{label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col gap-4" aria-busy="true">
                        <div className="flex items-center gap-3"><div className="shimmer h-5 w-14 rounded-[2px]" /><div className="shimmer h-3 w-48 rounded-[2px]" /></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-6">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="bg-[#1b2838] border border-[#1e2d3a] rounded-[3px] overflow-hidden">
                                    <div className="shimmer aspect-[460/215]" />
                                    <div className="p-3 flex flex-col gap-2"><div className="shimmer h-3 w-2/3 rounded-[2px]" /><div className="shimmer h-2.5 w-1/2 rounded-[2px]" /></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col gap-2 pl-6">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 bg-[#1b2838] border border-[#1e2d3a] rounded-[3px] p-2.5">
                                    <div className="shimmer w-11 h-11 rounded-[2px] shrink-0" />
                                    <div className="flex-1 flex flex-col gap-2"><div className="shimmer h-3 rounded-[2px]" style={{ width: `${45 + i * 12}%` }} /><div className="shimmer h-2.5 w-28 rounded-[2px]" /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : completions.length === 0 ? (
                    <div className="text-center py-16 text-[#546270] text-[11px] anim-fade">No completions found.</div>
                ) : (
                    // Fades in over the skeleton, and again when a filter changes the list.
                    // Open years first in full, closed years as one line each (two columns on desktop).
                    <div key={`${platform}-${showBeaten}-${[...hiddenTags].sort().join(',')}`} className="flex flex-col gap-8 anim-in">
                        {byYear.filter(([year]) => expandedYears.has(year)).map(([year, monthGroups]) => (
                            <div key={year} className="anim-fade">
                                <YearOpen year={year} items={monthGroups.flatMap(([, items]) => items)} rarest={rarest} onToggle={() => toggleYear(year)} />
                            </div>
                        ))}
                        {byYear.some(([year]) => !expandedYears.has(year)) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8 border-b border-[#22344a]">
                                {byYear.filter(([year]) => !expandedYears.has(year)).map(([year, monthGroups]) => (
                                    <YearClosed key={year} year={year} items={monthGroups.flatMap(([, items]) => items)} onToggle={() => toggleYear(year)} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-[#1b2838] border-t-2 border-[#2a475e] px-4 md:px-8 py-2.5 flex items-center gap-3 mt-auto">
                <div className="w-[3px] h-[18px] rounded-[1px] bg-[#e5b143] opacity-50 shrink-0" />
                <p className="text-[10px] text-[#546270]">Personal gaming hub · Completions</p>
                <a href="../" className="ml-auto text-[10px] text-[#546270] hover:text-[#66c0f4] transition-colors">← Back to hub</a>
            </footer>

        </div>
    );
};

createRoot(document.getElementById('root')).render(<App />);
