import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ChevronDown, GitCommit, RefreshCw } from 'lucide-react';

// ── Parser ─────────────────────────────────────────────────────────────────────
// Parses the changelog markdown into: [{ date, summary, sections: [{ title, entries[] }] }]
// An entry is `- kind: headline` (kind = new / improved / fix, optional: older entries have none), then
// indented lines as its detail (shown on tap) and indented `- ` lines as sub-points (always shown)

const KIND_RE = /^(new|improved|fix):\s+/i;

const parseChangelog = (md) => {
    const releases = [];
    let current = null;
    let currentSection = null;
    let entry = null;

    for (const raw of md.split('\n')) {
        const line = raw.trim();
        if (!line || line === '---') continue;
        const nested = /^\s{2,}/.test(raw);

        if (line.startsWith('## ')) {
            currentSection = null; entry = null;
            current = { date: line.slice(3).trim(), summary: null, sections: [] };
            releases.push(current);
        } else if (line.startsWith('### ') && current) {
            entry = null;
            currentSection = { title: line.slice(4).trim(), entries: [] };
            current.sections.push(currentSection);
        } else if (nested && entry) {
            if (line.startsWith('- ')) entry.subs.push(line.slice(2).trim());
            else entry.detail.push(line);
        } else if (line.startsWith('- ') && currentSection) {
            const text = line.slice(2).trim();
            const kind = text.match(KIND_RE)?.[1].toLowerCase() ?? null;
            entry = { kind, text: kind ? text.replace(KIND_RE, '') : text, detail: [], subs: [] };
            currentSection.entries.push(entry);
        } else if (current && !currentSection && !line.startsWith('#')) {
            current.summary = line;
        }
    }

    return releases;
};

// Inline code `foo` → <code>, **bold** → <b>
const renderText = (text) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 1
            ? <code key={i} className="text-[#57cbde] bg-[#101214] border border-[#2a475e] px-1 py-px rounded-[2px] text-[10px] font-mono">{part.slice(1, -1)}</code>
            : part.startsWith('**') && part.endsWith('**') && part.length > 4
            ? <b key={i} className="font-semibold text-[#c6d4df]">{part.slice(2, -2)}</b>
            : part
    );
};

// "v26.11.10 — Label" → { date: Date, version, label }; anything else keeps the raw string as the version
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const parseVersion = (raw) => {
    const [v, ...rest] = raw.split('—');
    const version = v.trim(), label = rest.join('—').trim();
    const m = version.match(/^v(\d{2})\.(\d{2})\.(\d{2})$/);
    return { version, label, date: m ? new Date(2000 + +m[1], +m[2] - 1, +m[3]) : null };
};

const KINDS = {
    new:      { label: 'New',      color: '#57cbde' },
    improved: { label: 'Improved', color: '#b8c4ce' },
    fix:      { label: 'Fix',      color: '#f4a261' },
};

// ── Section order + colors ─────────────────────────────────────────────────────

const SECTION_ORDER = [
    'RetroAchievements',
    'Steam',
    'Xbox',
    'Hub',
    'Completions',
    'Activity',
    'Analytics',
    'Pipelines',
    'Structure',
    'Admin',
];

const sortSections = (sections) => {
    const idx = (title) => {
        const i = SECTION_ORDER.indexOf(title);
        return i === -1 ? SECTION_ORDER.length : i;
    };
    return [...sections].sort((a, b) => idx(a.title) - idx(b.title));
};

const SECTION_COLORS = {
    'RetroAchievements': '#e5b143',
    'Steam':             '#66c0f4',
    'Xbox':              '#52b043',
    // Hub pages: one hue each, kept apart from the platform colors, Admin red and each
    // other (OKLab ΔE ≥ 16 with normal vision; the heading text names the section anyway)
    'Hub':               '#c6d4df',
    'Completions':       '#bef264',
    'Activity':          '#e879f9',
    'Analytics':         '#8b5cf6',
    'Pipelines':         '#8f98a0',
    'Structure':         '#8f98a0',
    'Admin':             '#ff6b6b',
};

const sectionColor = (title) =>
    SECTION_COLORS[title] ?? '#8f98a0';

// ── Components ────────────────────────────────────────────────────────────────

const KindTag = ({ kind }) => {
    const k = KINDS[kind];
    return (
        <span className="mt-[1px] shrink-0 w-[58px] text-center text-[8px] font-bold uppercase tracking-[0.08em] py-[2px] rounded-[2px] border"
            style={{ color: k.color, borderColor: `${k.color}55`, background: `${k.color}14` }}>
            {k.label}
        </span>
    );
};

const Entry = ({ entry }) => {
    const [open, setOpen] = useState(false);
    const { kind, text, detail, subs } = entry;
    // New-style entries (with a kind) fold their sub-points away with the detail; older ones always show them
    const foldSubs = !!kind && subs.length > 0;
    const hasDetail = detail.length > 0 || foldSubs;
    const head = (
        <>
            {kind ? <KindTag kind={kind} /> : <span className="mt-[7px] w-[4px] h-[4px] rounded-full bg-[#2a475e] shrink-0" />}
            <span className={`flex-1 min-w-0 ${kind ? 'text-[12px] text-[#c6d4df]' : 'text-[11px] text-[#8f98a0]'}`}>
                {renderText(text)}
                {hasDetail && <ChevronDown size={12} className={`inline ml-1 -mt-px text-[#546270] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />}
            </span>
        </>
    );
    return (
        <li className="py-[4px]">
            {hasDetail
                ? <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full text-left flex items-start gap-2 leading-relaxed outline-none">{head}</button>
                : <div className="flex items-start gap-2 leading-relaxed">{head}</div>}
            {detail.length > 0 && open && (
                <p className={`${kind ? 'ml-[66px]' : 'ml-3'} mt-1 text-[11px] text-[#8f98a0] leading-relaxed anim-fade`}>{renderText(detail.join(' '))}</p>
            )}
            {subs.length > 0 && (!foldSubs || open) && (
                <ul className={`${kind ? 'ml-[66px]' : 'ml-3'} mt-1 flex flex-col gap-1${foldSubs ? ' anim-fade' : ''}`}>
                    {subs.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] text-[#8f98a0] leading-relaxed">
                            <span className="mt-[7px] w-[3px] h-px bg-[#546270] shrink-0" />
                            <span>{renderText(t)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </li>
    );
};

const Section = ({ title, entries }) => {
    const color = sectionColor(title);
    return (
        <div className="mb-4">
            <div className="flex items-center gap-2 mb-1.5">
                <span className="w-[3px] h-[12px] rounded-[1px] shrink-0" style={{ background: color }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color }}>
                    {title}
                </span>
            </div>
            <ul className="flex flex-col">
                {entries.map((e, i) => <Entry key={i} entry={e} />)}
            </ul>
        </div>
    );
};

// What a folded release changed: per kind when its entries have kinds, else the plain count
const ReleaseCounts = ({ entries }) => {
    const byKind = Object.keys(KINDS).map(k => [k, entries.filter(e => e.kind === k).length]).filter(([, n]) => n);
    if (!byKind.length) return <span className="text-[10px] text-[#546270]">{entries.length} change{entries.length !== 1 ? 's' : ''}</span>;
    return (
        <span className="flex items-center gap-2 text-[10px]">
            {byKind.map(([k, n]) => (
                <span key={k} style={{ color: KINDS[k].color }}><b className="font-semibold">{n}</b> {KINDS[k].label.toLowerCase()}</span>
            ))}
        </span>
    );
};

const Release = ({ raw, summary, sections, defaultOpen }) => {
    const [open, setOpen] = useState(defaultOpen);
    const { version, label, date } = parseVersion(raw);
    const sorted = sortSections(sections);
    const entries = sorted.flatMap(s => s.entries);

    return (
        <div className="relative pl-5 pb-4">
            {/* Timeline: the dot and the line down to the next release */}
            <span className="absolute left-[4px] top-[18px] bottom-0 w-px bg-[#1e2d3a]" />
            <span className={`absolute left-0 top-[6px] w-[9px] h-[9px] rounded-full border-2 border-[#66c0f4] ${open ? 'bg-[#66c0f4]' : 'bg-[#171a21]'} transition-colors`} />
            <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full text-left group outline-none">
                <span className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold text-[#c6d4df] group-hover:text-white transition-colors">
                        {date ? `${date.getDate()} ${MONTHS[date.getMonth()]}` : version}
                    </span>
                    {date && <span className="text-[9px] font-mono text-[#546270]">{version}</span>}
                    {label && <span className="text-[11px] text-[#8f98a0]">{label}</span>}
                    <span className="ml-auto flex items-center gap-2 self-center">
                        <ReleaseCounts entries={entries} />
                        <ChevronDown size={12} className={`text-[#546270] transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`} />
                    </span>
                </span>
                {summary && (
                    <span className={`block mt-1 text-[11px] leading-snug text-[#8f98a0] ${open ? '' : 'line-clamp-2'}`}>{renderText(summary)}</span>
                )}
            </button>

            {open && (
                <div className="pt-3 anim-fade">
                    {sorted.map((sec, i) => <Section key={i} title={sec.title} entries={sec.entries} />)}
                </div>
            )}
        </div>
    );
};

// Releases under their month
const groupByMonth = (releases) => {
    const groups = [];
    for (const r of releases) {
        const { date } = parseVersion(r.date);
        const key = date ? `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}` : 'Other';
        if (groups.at(-1)?.key !== key) groups.push({ key, releases: [] });
        groups.at(-1).releases.push(r);
    }
    return groups;
};

// ── App ───────────────────────────────────────────────────────────────────────

const App = () => {
    const [releases, setReleases] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Clears the service worker's cached app files (not data) and reloads,
    // so the latest deployed HTML/JS is fetched fresh
    const refreshApp = async () => {
        setRefreshing(true);
        try {
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
            const reg = await navigator.serviceWorker?.getRegistration();
            await reg?.update();
        } catch { /* reload anyway */ }
        location.reload();
    };

    useEffect(() => {
        fetch('../changelog.md')
            .then(r => r.text())
            .then(md => setReleases(parseChangelog(md)))
            .catch(() => setReleases([]));
    }, []);

    return (
        <div className="bg-[#171a21] text-[#c6d4df] min-h-screen flex flex-col font-sans selection:bg-[#66c0f4] selection:text-[#171a21]">

            {/* Topbar */}
            <div className="page-topbar sticky top-0 z-50 bg-[#131a22] border-b border-[#101214] px-4 md:px-8 py-1.5 flex items-center gap-2 text-[10px]">
                <a href="../" className="sp-brand"><img src="../assets/favicon.svg" alt="" />Savepoint</a>
                <span className="text-[#2a475e]">›</span>
                <a href="../" className="text-[#546270] font-bold tracking-[0.15em] uppercase hover:text-[#8f98a0] transition-colors">Yozuryu</a>
                <span className="text-[#2a475e]">›</span>
                <span className="text-[#c6d4df]">Changelog</span>
            </div>

            {/* Header */}
            <header className="bg-[#1b2838] border-b border-[#2a475e] px-4 md:px-8 pt-8 pb-5 md:pt-5 shadow-md">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="w-[3px] h-6 bg-[#66c0f4] rounded-[1px] shrink-0" />
                        <h1 className="text-2xl md:text-[26px] text-white font-medium tracking-wide leading-none flex items-center gap-3">
                            <GitCommit size={22} className="text-[#66c0f4]" /> Changelog
                        </h1>
                        {releases && (
                            <span className="ml-2 text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#546270] anim-fade">
                                <span className="text-[#c6d4df]">{releases.length}</span> releases
                            </span>
                        )}
                        <button
                            onClick={refreshApp}
                            disabled={refreshing}
                            title="Fetch the latest app files. Your data is not affected."
                            className="ml-auto flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.07em] px-2 py-[3px] rounded-[2px] border border-[#323f4c] bg-[#101214] text-[#8f98a0] hover:text-[#66c0f4] hover:border-[#66c0f4]/50 active:scale-95 transition-colors disabled:opacity-60"
                        >
                            <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
                            {refreshing ? 'Refreshing…' : 'Refresh app'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 flex-1 w-full">
                {releases === null ? (
                    <div className="flex flex-col gap-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="shimmer w-2.5 h-2.5 rounded-full shrink-0" />
                                <div className="shimmer h-3 w-28 rounded" />
                                <div className="flex-1 h-px bg-[#1e2d3a]" />
                                <div className="shimmer h-2.5 w-16 rounded" />
                            </div>
                        ))}
                    </div>
                ) : releases.length === 0 ? (
                    <div className="text-center py-16 text-[#546270] text-[11px] anim-in">Could not load changelog.</div>
                ) : (
                    <div className="flex flex-col gap-2 anim-in">
                        {groupByMonth(releases).map((g, gi) => (
                            <section key={g.key}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#546270]">{g.key}</span>
                                    <span className="text-[10px] text-[#323f4c]">{g.releases.length}</span>
                                    <span className="flex-1 h-px bg-[#1e2d3a]" />
                                </div>
                                {g.releases.map((r, i) => (
                                    <Release key={i} raw={r.date} summary={r.summary} sections={r.sections} defaultOpen={gi === 0 && i === 0} />
                                ))}
                            </section>
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-[#1b2838] border-t-2 border-[#2a475e] px-4 md:px-8 py-2.5 flex items-center gap-3 mt-auto">
                <div className="w-[3px] h-[18px] rounded-[1px] bg-[#66c0f4] opacity-50 shrink-0" />
                <p className="text-[10px] text-[#546270]">Savepoint · Changelog</p>
                <a href="../" className="ml-auto text-[10px] text-[#546270] hover:text-[#66c0f4] transition-colors">← Back to hub</a>
            </footer>

        </div>
    );
};

createRoot(document.getElementById('root')).render(<App />);
