import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Layers, Search, X, Trophy, Star, ChevronLeft, Medal } from 'lucide-react';
import { useSheet, useArtSrc, useAnimatedHeight, SheetHead, seriesTags } from '../assets/sheet.js';
import { shortAgo } from '../assets/game-view.js';
import { SubFold, SubStrip, SubChips, subsMatch } from '../assets/subseries.js';

// ── Shared series (every platform) ─────────────────────────────────────────────
// data/hub/series.json is made by hand in the admin (Shared Series); scripts/build-series.js turns
// it into data/hub/series-games.json, each game's progress from its platform's data. Same cards and
// sheet as the profile Series tabs (styles in assets/ui.css), with the platform on every game.

const PLATFORMS = {
    ra:    { label: 'RA',    icon: '../assets/icon-ra.png' },
    steam: { label: 'Steam', icon: '../assets/icon-steam.png' },
    xbox:  { label: 'Xbox',  icon: '../assets/icon-xbox.png' },
};
const EDS_WIDTHS = [64, 128, 150, 200, 208, 300, 424];
const xboxImg = (url, width) => {
    if (!url) return url;
    if (url.includes('store-images.s-microsoft.com')) return `${url}${url.includes('?') ? '&' : '?'}w=${width}`;
    if (url.includes('images-eds')) return `${url}&w=${EDS_WIDTHS.find(w => w >= width) ?? 424}`;
    return url;
};
const fold = str => (str ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const pctLabel = p => p > 0 && p < 1 ? '<1%' : `${Math.floor(p)}%`;
const fmtMin = m => m >= 600 ? `${Math.round(m / 60).toLocaleString()}h` : m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
const baseTitle = t => (t ?? '').replace(/~([^~]+)~\s*/g, '').trim();
// RA dates are UTC without a zone ("2026-11-01 11:43:31"); Steam / Xbox are ISO
const lastMsOf = g => { const s = g.last?.at; if (!s) return 0; const t = Date.parse(/^\d{4}-\d{2}-\d{2} \d/.test(s) ? s.replace(' ', 'T') + 'Z' : s); return isNaN(t) ? 0 : t; };

// Per game: its status on the usual ladder (done gold, beaten silver, started blue, not started, no achievements)
const withStatus = g => {
    const hasAch = g.total > 0;
    const done = hasAch && g.unlocked >= g.total;
    const started = hasAch && g.unlocked > 0 && !done;
    return {
        ...g, hasAch, done, started, beatenOnly: started && g.beaten,
        icon: g.p === 'xbox' ? xboxImg(g.icon, 128) : g.icon,
        square: g.p === 'xbox' ? xboxImg(g.icon, 64) : g.square ?? g.icon,
        art: g.p === 'xbox' ? xboxImg(g.art, 640) : g.art,
        color: done ? '#e5b143' : g.beaten ? '#b8c4ce' : started ? '#66c0f4' : hasAch ? '#323f4c' : '#1e2a35',
    };
};
const doneLabel = { ra: 'Mastered', steam: 'Perfect', xbox: 'Completed' };

// One card from a series' games; sub-series (groups) get the same card from their own games
const buildCard = (s, games) => {
    const count = f => games.filter(f).length;
    const achEarned = games.reduce((n, x) => n + (x.hasAch ? x.unlocked : 0), 0);
    const achTotal = games.reduce((n, x) => n + x.total, 0);
    // Sub-series cover: the game with the most unlocks, else the first with achievements
    const cover = games.find(x => x.key === s.cover) ?? [...games].filter(x => x.unlocked > 0).sort((a, b) => b.unlocked - a.unlocked)[0] ?? games.find(x => x.hasAch) ?? games[0];
    const byPlatform = Object.keys(PLATFORMS).map(p => [p, count(x => x.p === p)]).filter(([, n]) => n);
    return {
        id: s.id, name: s.name, games, cover, byPlatform, total: games.length,
        started: count(x => x.started && !x.beaten), beaten: count(x => x.beatenOnly), done: count(x => x.done),
        tracked: count(x => x.hasAch), achEarned, achTotal, pct: achTotal ? (achEarned / achTotal) * 100 : 0,
        minutes: games.reduce((n, x) => n + (x.minutes ?? 0), 0),
        lastMs: Math.max(0, ...games.map(x => x.lastMs || 0)),
    };
};
const buildCards = data => (data?.series ?? []).map(s => {
    const games = s.games.map(withStatus);
    const card = buildCard(s, games);
    if (!s.groups?.length) return card;
    // Games in no sub-series go to a last "Other" one
    const inGroup = new Set(s.groups.flatMap(g => g.keys));
    const rest = games.filter(x => !inGroup.has(x.key));
    const defs = [...s.groups, ...(rest.length ? [{ id: '_other', name: 'Other', keys: rest.map(x => x.key), other: true }] : [])];
    card.subs = defs.map(g => {
        const sub = buildCard({ id: `${s.id}/${g.id}`, name: g.name }, g.keys.map(k => games.find(x => x.key === k)).filter(Boolean));
        return { ...sub, key: g.id, groupId: g.id, other: !!g.other, icon: sub.cover?.square ?? sub.cover?.icon, done: sub.done, started: sub.started, beaten: sub.beaten };
    });
    return card;
}).filter(c => c.total >= 3);

const edgeOf = c => c.tracked > 0 && c.done === c.tracked ? '#e5b143' : c.started || c.beaten || c.done ? '#66c0f4' : '#323f4c';
const iconOrder = games => [...games].sort((a, b) => {
    const k = x => x.done ? 0 : x.unlocked > 0 ? 1 : x.hasAch ? 2 : 3;
    return (k(a) - k(b)) || (k(a) <= 1 ? b.lastMs - a.lastMs : a.title.localeCompare(b.title));
});
const nameKey = n => /^[a-zA-Z]/.test(n) ? '2' + n.toLowerCase() : /^\d/.test(n) ? '1' + n.toLowerCase() : '0' + n.toLowerCase();
const SORTS = [
    { value: 'name', label: 'Name' },
    { value: 'progress', label: 'Most progress' },
    { value: 'recent', label: 'Last played' },
    { value: 'games', label: 'Most games' },
];

// Platform split: icon + count per platform
const PlatformSplit = ({ items }) => (
    <span className="flex items-center gap-2">
        {items.map(([p, n]) => (
            <span key={p} className="flex items-center gap-1" title={`${n} on ${PLATFORMS[p].label}`}>
                <img src={PLATFORMS[p].icon} alt={PLATFORMS[p].label} className="w-3 h-3 object-contain" />{n}
            </span>
        ))}
    </span>
);

const Cover = ({ g, cls }) => g?.icon
    ? <img src={g.icon} alt="" loading="lazy" className={`${cls} ${g.p === 'steam' ? 'banner' : ''}`} onError={e => { e.target.style.visibility = 'hidden'; }} />
    : <span className={cls} />;

const SeriesCard = ({ c, onOpen }) => {
    const icons = iconOrder(c.games);
    return (
        <button onClick={() => onOpen(c)} className="scard smooth" style={{ borderLeftColor: edgeOf(c) }}>
            {/* The cover's art, else the library mosaic (.art-icon) for a cover with only an icon */}
            {c.cover?.art
                ? <div className="scard-art"><img src={c.cover.art} alt="" loading="lazy" onError={e => { if (c.cover.p === 'steam' && !e.target.src.endsWith('header.jpg') && c.cover.icon) { e.target.src = c.cover.icon; e.target.classList.add('art-icon'); } else e.target.style.display = 'none'; }} /></div>
                : c.cover?.icon && <div className="scard-art"><img src={c.cover.icon} alt="" loading="lazy" className="art-icon" /></div>}
            <div className="scard-top">
                <Cover g={c.cover} cls="scard-cover" />
                <div className="scard-main">
                    <span className="scard-name">{c.name}</span>
                    <span className="scard-sub">
                        <span>{c.total} games</span><i>·</i><PlatformSplit items={c.byPlatform} />
                    </span>
                    {(c.started > 0 || c.done > 0 || c.beaten > 0) && (
                        <span className="scard-sub">
                            {c.started > 0 && <span className="text-[#66c0f4]">{c.started} started</span>}
                            {c.done > 0 && <>{c.started > 0 && <i>·</i>}<span className="text-[#e5b143]">★ {c.done} completed</span></>}
                            {c.beaten > 0 && <>{(c.started > 0 || c.done > 0) && <i>·</i>}<span className="text-[#b8c4ce]">{c.beaten} beaten</span></>}
                        </span>
                    )}
                </div>
                <span className="scard-end">
                    <span className="scard-pct" style={{ color: c.pct > 0 ? '#e5b143' : '#546270' }}>{pctLabel(c.pct)}</span>
                    {c.lastMs > 0 && <em title="Last activity in this series">{shortAgo(c.lastMs)}</em>}
                </span>
            </div>
            <div className="gbar"><i style={{ width: `${c.pct}%`, background: '#e5b143' }} /></div>
            <div className="sicons">
                {icons.slice(0, 10).map(x => x.square && <img key={x.key} src={x.square} alt="" title={`${x.title} · ${PLATFORMS[x.p].label}`} loading="lazy" className={x.done ? 'mastered' : x.unlocked > 0 ? '' : x.hasAch ? 'dim' : 'noach'} />)}
                {icons.length > 10 && <span>+{icons.length - 10}</span>}
            </div>
        </button>
    );
};

// One game in the sheet: icon (Steam banner), title, platform · console · playtime · last played, count + bar.
// Opens the game's achievements here (GameSheet), or its page on the platform when it has no set
const GameRow = ({ g, onOpen }) => {
    const Tag = g.sheet ? 'button' : 'a';
    const props = g.sheet ? { onClick: () => onOpen(g) } : { href: g.url, target: '_blank', rel: 'noreferrer' };
    return (
    <Tag {...props} className="grow compact" style={{ borderLeftColor: g.color }}>
        {g.art && <div className="grow-art"><img src={g.art} alt="" loading="lazy" onError={e => { if (g.p === 'steam' && !e.target.src.endsWith('header.jpg')) e.target.src = g.icon; else e.target.style.display = 'none'; }} /></div>}
        <Cover g={g} cls={g.p === 'steam' ? 'grow-banner' : 'grow-icon px'} />
        <div className="grow-main">
            <span className="grow-title">{baseTitle(g.title)}</span>
            <div className="grow-sub">
                <img src={PLATFORMS[g.p].icon} alt={PLATFORMS[g.p].label} className="w-3 h-3 object-contain" />
                <span className="shrink">{[g.console ?? PLATFORMS[g.p].label, g.minutes ? fmtMin(g.minutes) : null, g.lastMs ? shortAgo(g.lastMs) : null].filter(Boolean).join(' · ')}</span>
            </div>
        </div>
        <div className="grow-prog">
            {g.hasAch ? <>
                <span className="gcount" style={g.done ? { color: '#e5b143' } : undefined}>{g.unlocked}<span>/{g.total}</span></span>
                <div className="gbar"><i style={{ width: `${(g.unlocked / g.total) * 100}%`, background: g.done ? '#e5b143' : '#66c0f4' }} /></div>
            </> : <span className="text-[11px] text-[#546270]">No achievements</span>}
        </div>
    </Tag>
    );
};

// ── A game's achievements, opened from a series ────────────────────────────────
// Reads the game's own file on its platform (data/ra/games/{id}.json, data/{steam,xbox}/games/{id}.json)
// and shows one list for all three: icon, name, description, points / gamerscore, rarity, unlock date.
// The full sheet (RA progression and missable filters, Steam rarity tiers) stays on the profile,
// one tap away ("Full details").
const RA_MEDIA = 'https://media.retroachievements.org';
const fmtDay = s => { if (!s) return ''; const d = new Date(/^\d{4}-\d{2}-\d{2} \d/.test(s) ? s.replace(' ', 'T') + 'Z' : s); return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
const rarityColor = p => p == null ? '#546270' : p < 5 ? '#e5b143' : p < 10 ? '#c8901a' : p < 25 ? '#66c0f4' : p < 50 ? '#8f98a0' : '#546270';

const normalize = (p, id, d) => {
    if (p === 'ra') {
        const players = d.numDistinctPlayersCasual || 0;
        return Object.values(d.achievements ?? {}).map(a => ({
            key: a.id, name: a.title, desc: a.description, unlocked: !!a.dateEarned, at: a.dateEarned, hardcore: !!a.dateEarnedHardcore,
            icon: `${RA_MEDIA}/Badge/${a.badgeName}${a.dateEarned ? '' : '_lock'}.png`, value: a.points ? `${a.points} pts` : null, pts: a.points || 0,
            pct: players ? Math.min(100, (a.numAwarded / players) * 100) : null, order: a.displayOrder ?? 0, pixel: true,
            type: a.type,
        }));
    }
    const steam = p === 'steam';
    const cdn = h => h ? `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${id}/${h}` : null;
    return (d.achievements ?? []).map((a, i) => ({
        key: a.apiName ?? i, name: a.displayName, desc: a.description, unlocked: !!a.unlocked, at: a.unlockedAt,
        icon: steam ? (a.unlocked ? cdn(a.iconUrl) : cdn(a.iconGrayUrl) || cdn(a.iconUrl)) : xboxImg(a.iconUrl, 128),
        value: !steam && a.gamerscore ? `${a.gamerscore}G` : null, pts: steam ? 0 : a.gamerscore || 0, pct: a.globalPct ?? null, order: i,
    }));
};

const GameSheet = ({ g, backLabel, onBack, onClose }) => {
    const panelRef = useRef(null), rootRef = useRef(null), dragRef = useRef(null);
    const close = useSheet({ panelRef, dragRef, rootRef, onClose });
    useAnimatedHeight(panelRef);
    const art = useArtSrc([g.artFull, g.art, g.icon]);
    const [achs, setAchs] = useState(null);
    const [failed, setFailed] = useState(false);
    const [filter, setFilter] = useState('all');
    useEffect(() => {
        fetch(`../data/${g.p}/games/${g.id}.json`).then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(d => setAchs({ list: normalize(g.p, g.id, d), hidden: d.partial ? Math.max(0, (d.total ?? 0) - (d.achievements?.length ?? 0)) : 0 }))
            .catch(() => setFailed(true));
    }, [g.key]);
    const list = useMemo(() => {
        if (!achs) return [];
        const unl = achs.list.filter(a => a.unlocked).sort((a, b) => String(b.at).localeCompare(String(a.at)));
        const lck = achs.list.filter(a => !a.unlocked).sort((a, b) => a.order - b.order);
        return filter === 'unlocked' ? unl : filter === 'locked' ? lck : [...unl, ...lck];
    }, [achs, filter]);
    const counts = achs ? { all: achs.list.length + achs.hidden, unlocked: achs.list.filter(a => a.unlocked).length, locked: achs.list.filter(a => !a.unlocked).length + achs.hidden } : null;
    const pct = g.total ? (g.unlocked / g.total) * 100 : 0;
    // Points / gamerscore and RA progression come with the series data, so the header is whole before the list loads
    const points = g.pts && { earned: g.pts[0], total: g.pts[1] };
    return (
        <div ref={rootRef} className="sheet-root" onClick={close}>
            <div className="sheet-backdrop anim-backdrop" />
            <div ref={panelRef} className="sheet-panel" onClick={e => e.stopPropagation()}>
                <button onClick={close} className="sheet-close" aria-label="Close"><X size={15} /></button>
                <button onClick={onBack} className="sheet-back" aria-label={`Back to ${backLabel}`}><ChevronLeft size={14} />{backLabel}</button>
                <SheetHead dragRef={dragRef} back
                    art={art.src && <div className="art-bg art-sheet"><img src={art.src} alt="" ref={art.ref} onLoad={art.onLoad} onError={art.onError} className={`${g.p === 'ra' && !g.wide ? 'px' : ''} ${art.src === g.icon ? 'art-icon' : ''} ${art.loaded ? 'loaded' : ''}`} /></div>}
                    cover={<Cover g={g} cls={g.p === 'steam' ? 'relative w-32 h-16 rounded-[2px] border border-[#101214] object-cover shrink-0 shadow-[0_6px_18px_rgba(0,0,0,0.55)]' : 'relative w-16 h-16 rounded-[3px] border-2 border-white/20 object-cover shrink-0 px shadow-[0_6px_18px_rgba(0,0,0,0.55)]'} />}
                    title={baseTitle(g.title)}
                    meta={[
                        <span className="inline-flex items-center gap-1.5 text-[#c6d4df]"><img src={PLATFORMS[g.p].icon} alt="" className="w-3 h-3 object-contain" />{g.console ?? PLATFORMS[g.p].label}</span>,
                        <a href={`../profile/${g.p}/?game=${encodeURIComponent(g.id)}`} className="text-[#66c0f4] hover:text-white transition-colors">Full details ›</a>,
                    ]}
                    tags={[
                        g.done && <span key="d" className="shrink-0 text-[9px] text-[#101214] bg-[#e5b143] px-1.5 py-[1px] rounded-sm font-bold uppercase tracking-wider flex items-center gap-1"><Trophy size={9} /> {doneLabel[g.p]}</span>,
                        !g.done && g.beaten && <span key="b" className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-sm flex items-center gap-1" style={{ background: '#2a3440', color: '#c6d4df', border: '1px solid rgba(184,196,206,0.3)' }}><Medal size={9} /> Beaten</span>,
                    ]}
                    stats={[
                        g.hasAch && { value: g.unlocked, total: g.total, label: 'Achievements', color: '#66c0f4' },
                        g.p !== 'steam' && points && points.total > 0 && { value: points.earned.toLocaleString(), total: points.total.toLocaleString(), label: g.p === 'ra' ? 'Points' : 'Gamerscore', color: '#e5b143' },
                        g.minutes ? { value: fmtMin(g.minutes), label: 'Played', color: '#66c0f4' }
                            : g.lastMs ? { value: `${shortAgo(g.lastMs)} ago`, label: 'Last played', color: '#c6d4df' } : null,
                    ].filter(Boolean)}
                    bar={g.hasAch ? { pct, color: g.done ? '#e5b143' : '#66c0f4' } : null}
                    steps={g.prog?.[1] > 0 ? { done: g.prog[0], total: g.prog[1], icon: <Trophy size={11} /> } : null}
                />
                {counts && (
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-[#101214] shrink-0 anim-fade">
                        <div className="frow flex-1 min-w-0" role="group" aria-label="Filter achievements">
                            {[['all', 'All'], ['unlocked', 'Unlocked'], ['locked', 'Locked']].map(([v, l]) => (
                                <button key={v} onClick={() => setFilter(v)} aria-pressed={filter === v} className={`fchip ${filter === v ? 'on' : ''}`}>{l}<span className="n">{counts[v]}</span></button>
                            ))}
                        </div>
                    </div>
                )}
                <div key={filter} className="sheet-scroll overflow-y-auto overscroll-contain flex-1 min-h-0 px-4 pt-3 flex flex-col gap-1.5 anim-fade">
                    {failed ? <div className="text-center py-8 text-[#546270] text-[12px]">Could not load this game's achievements. <a href={`../profile/${g.p}/?game=${encodeURIComponent(g.id)}`} className="text-[#66c0f4]">Open on the profile</a></div>
                    : !achs ? [...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-[#202d39] border border-[#2a475e] rounded-[2px]">
                            <div className="shimmer w-10 h-10 rounded-[2px] shrink-0" />
                            <div className="flex-1 flex flex-col gap-1.5"><div className="shimmer h-2.5 rounded" style={{ width: `${40 + (i % 3) * 15}%` }} /><div className="shimmer h-2 rounded" style={{ width: `${60 + (i % 2) * 20}%` }} /></div>
                        </div>
                    )) : <>
                        {list.map(a => (
                            <div key={a.key} className={`gach ${a.unlocked ? 'on' : ''}`}>
                                {a.icon ? <img src={a.icon} alt="" loading="lazy" className={a.pixel ? 'px' : ''} onError={e => { e.target.style.visibility = 'hidden'; }} /> : <span className="ph" />}
                                <div className="gach-main">
                                    <span className="gach-name">{a.name}</span>
                                    {a.desc && <span className="gach-desc">{a.desc}</span>}
                                    <span className="gach-meta">
                                        {a.value && <b>{a.value}</b>}
                                        {a.pct != null && <span style={{ color: rarityColor(a.pct) }}>{a.pct < 0.1 ? '<0.1' : a.pct.toFixed(1)}%</span>}
                                        {a.hardcore && <span className="text-[#ff6b6b]">Hardcore</span>}
                                        {a.unlocked && a.at && <span className="ml-auto text-[#66c0f4]">{fmtDay(a.at)}</span>}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {filter !== 'unlocked' && achs.hidden > 0 && <div className="text-center py-3 text-[#546270] text-[11px]">{achs.hidden} locked achievements aren't listed for Xbox 360 games</div>}
                        {list.length === 0 && <div className="text-center py-8 text-[#546270] text-[11px]">No achievements here.</div>}
                    </>}
                </div>
            </div>
        </div>
    );
};

// series.__sub: the sub-series picked (index into series.subs) or null for All; the page keeps it on the
// series it opened, so a game opened from a sub-series comes back to it
const SeriesSheet = ({ c: series, onClose, onOpenGame, onScope }) => {
    const sub = series.subs && series.__sub != null ? series.__sub : null;
    const c = sub != null ? series.subs[sub] : series;
    const panelRef = useRef(null), rootRef = useRef(null), dragRef = useRef(null);
    const close = useSheet({ panelRef, dragRef, rootRef, onClose });
    useAnimatedHeight(panelRef);
    const art = useArtSrc([c.cover?.artFull, c.cover?.art, c.cover?.icon]);
    const groups = [
        { key: 'started', label: 'In progress',     games: c.games.filter(x => x.started && !x.beaten).sort((a, b) => b.lastMs - a.lastMs) },
        { key: 'done',    label: 'Completed',       games: c.games.filter(x => x.done).sort((a, b) => b.lastMs - a.lastMs) },
        { key: 'beaten',  label: 'Beaten',          games: c.games.filter(x => x.beatenOnly).sort((a, b) => b.lastMs - a.lastMs) },
        { key: 'none',    label: 'Not started',     games: c.games.filter(x => x.hasAch && !x.unlocked).sort((a, b) => a.title.localeCompare(b.title)) },
        { key: 'noach',   label: 'No achievements', games: c.games.filter(x => !x.hasAch).sort((a, b) => a.title.localeCompare(b.title)) },
    ].filter(gr => gr.games.length);
    // The newest unlock across the series' games, any platform
    const latest = c.games.filter(g => g.last?.at).sort((a, b) => lastMsOf(b) - lastMsOf(a))[0] ?? null;
    return (
        <div ref={rootRef} className="sheet-root" onClick={close}>
            <div className="sheet-backdrop anim-backdrop" />
            <div ref={panelRef} className="sheet-panel" onClick={e => e.stopPropagation()}>
                <button onClick={close} className="sheet-close" aria-label="Close"><X size={15} /></button>
                <SheetHead dragRef={dragRef}
                    art={art.src && <div className="art-bg art-sheet"><img src={art.src} alt="" ref={art.ref} onLoad={art.onLoad} onError={art.onError} className={`${c.cover?.p === 'ra' && !c.cover?.wide ? 'px' : ''} ${art.src === c.cover?.icon ? 'art-icon' : ''} ${art.loaded ? 'loaded' : ''}`} /></div>}
                    cover={<Cover g={c.cover} cls={c.cover?.p === 'steam' ? 'relative w-32 h-16 rounded-[2px] border border-[#101214] object-cover shrink-0 shadow-[0_6px_18px_rgba(0,0,0,0.55)]' : 'relative w-16 h-16 rounded-[3px] border-2 border-white/20 object-cover shrink-0 shadow-[0_6px_18px_rgba(0,0,0,0.55)]'} />}
                    title={c.name}
                    meta={[sub != null && <button onClick={() => onScope(null)} className="inline-flex items-center gap-0.5 text-[#8f98a0] hover:text-[#c6d4df]"><ChevronLeft size={11} />{series.name}</button>, <span className="inline-flex items-center gap-1 text-[#66c0f4]"><Layers size={11} />{c.total} games</span>, <PlatformSplit items={c.byPlatform} />].filter(Boolean)}
                    tags={seriesTags({ done: c.done, doneLabel: 'Completed', beaten: c.beaten, started: c.started })}
                    stats={[
                        { value: c.achEarned.toLocaleString(), total: c.achTotal.toLocaleString(), label: 'Achievements', color: '#66c0f4' },
                        c.minutes > 0 && { value: fmtMin(c.minutes), label: 'Played', color: '#66c0f4' },
                    ].filter(Boolean)}
                    bar={c.achTotal > 0 ? { pct: c.pct, color: c.pct >= 100 ? '#e5b143' : '#66c0f4' } : null}
                    games={{ icon: <Layers size={11} />, items: c.games.map(x => ({ state: !x.hasAch ? 'noach' : x.done ? 'done' : x.beatenOnly ? 'beaten' : x.started ? 'started' : 'none', pct: x.total ? (x.unlocked / x.total) * 100 : 0 })) }}
                />
                {series.subs && <SubChips subs={series.subs} total={series.total} allPct={series.pct} active={sub} onPick={onScope} />}
                <div key={sub ?? 'all'} className="sheet-scroll overflow-y-auto overscroll-contain flex-1 min-h-0 px-4 pt-3 flex flex-col gap-2 anim-fade">
                    {series.subs && sub == null && <SubStrip subs={series.subs} onPick={onScope} />}
                    {latest && <div className={`ssheet-sec ${series.subs && sub == null ? 'next' : ''}`} style={{ '--c': '#e5b143' }}>Latest unlock</div>}
                    {latest && (
                        <button onClick={() => onOpenGame(latest)} className="grow compact" style={{ borderLeftColor: '#e5b143' }} title="Latest unlock in this series">
                            {latest.last.icon ? <img src={latest.p === 'xbox' ? xboxImg(latest.last.icon, 128) : latest.last.icon} alt="" className={`grow-icon ${latest.p === 'ra' ? 'px' : ''}`} onError={e => { e.target.style.visibility = 'hidden'; }} /> : <Cover g={latest} cls="grow-icon" />}
                            <div className="grow-main">
                                <span className="grow-title" style={{ color: '#e5b143' }}><Trophy size={11} className="inline -mt-0.5 mr-1" />{latest.last.name}</span>
                                <div className="grow-sub">
                                    <img src={PLATFORMS[latest.p].icon} alt={PLATFORMS[latest.p].label} className="w-3 h-3 object-contain" />
                                    <span className="text-[#66c0f4] shrink">{baseTitle(latest.title)}</span><span>· {shortAgo(lastMsOf(latest))}</span>
                                </div>
                            </div>
                        </button>
                    )}
                    <div className={`ssheet-sec ${latest || (series.subs && sub == null) ? 'next' : ''}`} style={{ '--c': '#66c0f4' }}>Games<span className="n">{c.total}</span></div>
                    {groups.map(gr => (
                        <React.Fragment key={gr.key}>
                            <div className="ssheet-group">{gr.label}<span className="n">{gr.games.length}</span></div>
                            {gr.games.map(g => <GameRow key={g.key} g={g} onOpen={onOpenGame} />)}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('recent');
    const [filter, setFilter] = useState('all');
    const [open, setOpen] = useState(null);
    const [game, setGame] = useState(null);       // { g, from }: a game opened from a series sheet

    useEffect(() => {
        fetch('../data/hub/series-games.json').then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(setData).catch(() => setFailed(true));
    }, []);
    const cards = useMemo(() => buildCards(data), [data]);
    // ?open=<id> opens a series straight away (the hub links each card that way)
    useEffect(() => {
        const id = new URLSearchParams(location.search).get('open');
        if (!id || !cards.length) return;
        const c = cards.find(c => c.id === id);
        const sub = c?.subs?.findIndex(s => s.groupId === new URLSearchParams(location.search).get('sub'));
        setOpen(c ? { ...c, __sub: sub >= 0 ? sub : null } : null);
    }, [cards]);

    const isStarted = c => c.achEarned > 0;
    const counts = { all: cards.length, started: cards.filter(isStarted).length, notstarted: cards.filter(c => !isStarted(c)).length };
    const shown = cards
        .filter(c => filter === 'all' || (filter === 'started' ? isStarted(c) : !isStarted(c)))
        .filter(c => !search || fold(c.name).includes(fold(search)) || subsMatch(c.subs, fold(search), fold) || c.games.some(x => fold(x.title).includes(fold(search))))
        .sort((a, b) => sort === 'progress' ? (b.pct - a.pct) || nameKey(a.name).localeCompare(nameKey(b.name))
            : sort === 'recent' ? (b.lastMs - a.lastMs) || nameKey(a.name).localeCompare(nameKey(b.name))
            : sort === 'games' ? (b.total - a.total) || nameKey(a.name).localeCompare(nameKey(b.name))
            : nameKey(a.name).localeCompare(nameKey(b.name)));

    return (
        <div className="bg-[#171a21] text-[#c6d4df] min-h-screen flex flex-col font-sans selection:bg-[#66c0f4] selection:text-[#171a21]">
            <div className="page-topbar sticky top-0 z-50 bg-[#131a22] border-b border-[#101214] px-4 md:px-8 py-1.5 flex items-center gap-2 text-[10px]">
                <a href="../" className="text-[#546270] font-bold tracking-[0.15em] uppercase hover:text-[#8f98a0] transition-colors">Yozuryu</a>
                <span className="text-[#2a475e]">›</span>
                <a href="../" className="text-[#546270] hover:text-[#8f98a0] transition-colors">Gaming Hub</a>
                <span className="text-[#2a475e]">›</span>
                <span className="text-[#c6d4df]">Series</span>
            </div>

            <header className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 pt-8 pb-5 md:pt-5 shadow-md">
                <div className="max-w-5xl lg:max-w-[79rem] mx-auto flex items-center gap-3 flex-wrap">
                    <span className="w-[3px] h-6 bg-[#66c0f4] rounded-[1px] shrink-0" />
                    <h1 className="text-2xl md:text-[26px] text-white font-medium tracking-wide leading-none flex items-center gap-3">
                        <Layers size={22} className="text-[#66c0f4]" /> Series
                    </h1>
                    {data && <span className="crits ml-1 anim-fade">{[['ra', 'RA'], ['steam', 'Steam'], ['xbox', 'Xbox']].map(([p, l]) => <span key={p} className="crit"><img src={`../assets/icon-${p}.png`} alt="" />{l}</span>)}</span>}
                </div>
            </header>

            <main className="max-w-5xl lg:max-w-[79rem] mx-auto px-4 md:px-8 py-6 flex-1 w-full flex flex-col gap-3">
                <div className="flex flex-col gap-2.5">
                    <div className="fbar">
                        <div className="fsearch">
                            <Search size={14} />
                            <input type="text" inputMode="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search series or games" aria-label="Search series" />
                            {search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={13} /></button>}
                        </div>
                        <select value={sort} onChange={e => setSort(e.target.value)} className="fselect" aria-label="Sort">
                            {SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div className="frow" role="group" aria-label="Show">
                        {[['all', 'All'], ['started', 'Started'], ['notstarted', 'Not started']].map(([v, l]) => (
                            <button key={v} onClick={() => setFilter(v)} aria-pressed={filter === v} className={`fchip ${filter === v ? 'on' : ''}`}>{l}{data && <span className="n">{counts[v]}</span>}</button>
                        ))}
                    </div>
                </div>

                {failed ? (
                    <div className="text-center py-12 text-[#546270] text-[12px] anim-fade">Could not load the series.</div>
                ) : !data ? (
                    <div className="slist" aria-busy="true">
                        {[...Array(6)].map((_, i) => <div key={i} className="scard" style={{ borderLeftColor: '#2a475e' }}><div className="shimmer h-[48px] w-full rounded-[2px]" /><div className="shimmer h-[26px] w-2/3 rounded-[2px]" /></div>)}
                    </div>
                ) : (
                    <div key={`${sort}-${filter}`} className="slist anim-in">
                        {shown.length === 0 && <div className="text-center py-10 text-[#546270] text-[12px]" style={{ gridColumn: '1 / -1' }}>{cards.length ? 'No series match.' : 'No series yet. Add them in the admin (Shared Series).'}</div>}
                        {shown.map(c => c.subs
                            ? <SubFold key={c.id} subs={c.subs} onOpen={i => setOpen({ ...c, __sub: i })}><SeriesCard c={c} onOpen={setOpen} /></SubFold>
                            : <SeriesCard key={c.id} c={c} onOpen={setOpen} />)}
                    </div>
                )}
            </main>

            <footer className="bg-[#1b2838] border-t-2 border-[#2a475e] px-4 md:px-8 py-2.5 flex items-center gap-3 mt-auto">
                <div className="w-[3px] h-[18px] rounded-[1px] bg-[#66c0f4] opacity-50 shrink-0" />
                <p className="text-[10px] text-[#546270]">Personal gaming hub · Series</p>
                <a href="../" className="ml-auto text-[10px] text-[#546270] hover:text-[#66c0f4] transition-colors">← Back to hub</a>
            </footer>

            {open && <SeriesSheet c={open} onClose={() => setOpen(null)} onScope={i => setOpen(o => o && { ...o, __sub: i })} onOpenGame={g => { setGame({ g, from: open }); setOpen(null); }} />}
            {game && <GameSheet g={game.g} backLabel={game.from.name} onBack={() => { setOpen(game.from); setGame(null); }} onClose={() => setGame(null)} />}
        </div>
    );
};

createRoot(document.getElementById('root')).render(<App />);
