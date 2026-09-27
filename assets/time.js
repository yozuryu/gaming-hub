// Shared time helpers. All data is stored in UTC; everything shown to the viewer
// (days, clock times, heatmaps, month groups) uses the browser's own timezone.
// Plain ES module (no JSX) — imported by the React pages. The hub page (classic
// script) has its own small copy of toDate.

// Viewer's IANA timezone, e.g. "Asia/Jakarta"
export const TZ = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
    catch { return 'UTC'; }
})();

// RA returns "YYYY-MM-DD HH:MM:SS" in UTC with no zone marker (a bare string like
// that parses as *local* time, and Safari can't parse it at all). Steam/Xbox use ISO with Z.
export const toDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
    const s = typeof v === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v)
        ? v.replace(' ', 'T') + 'Z'
        : v;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
};

export const toMs = (v) => toDate(v)?.getTime() ?? 0;

const pad = (n) => String(n).padStart(2, '0');

// Local calendar day "YYYY-MM-DD" of a timestamp
export const dayKey = (v) => {
    const d = toDate(v);
    return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '';
};

export const todayKey = () => dayKey(new Date());

// Local "YYYY-MM" and year of a timestamp
export const monthKey = (v) => dayKey(v).slice(0, 7);
export const yearOf = (v) => { const d = toDate(v); return d ? d.getFullYear() : null; };

// Shift a day key by n calendar days (pure date arithmetic, DST-safe)
export const addDays = (key, n) => {
    const d = new Date(key + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

// Local-midnight Date for a day key (for getMonth / weekday labels)
export const keyToDate = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const DATE_OPTS = { day: '2-digit', month: 'short', year: 'numeric' };

export const fmtDayKey = (key, opts = DATE_OPTS) => key ? keyToDate(key).toLocaleDateString('en-GB', opts) : '';
export const fmtDate   = (v, opts = DATE_OPTS) => { const d = toDate(v); return d ? d.toLocaleDateString('en-GB', opts) : ''; };
export const fmtClock  = (v) => { const d = toDate(v); return d ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''; };

// Heatmap { "YYYY-MM-DD": { count, ...sums } } in local days, built from raw unlocks.
// `sums` maps an output field to a getter, e.g. { points: a => a.points }.
export const buildHeatmap = (items, getTs, sums = {}) => {
    const map = {};
    for (const it of items) {
        const day = dayKey(getTs(it));
        if (!day) continue;
        const cell = map[day] ??= { count: 0, ...Object.fromEntries(Object.keys(sums).map(k => [k, 0])) };
        cell.count++;
        for (const [k, get] of Object.entries(sums)) cell[k] += get(it) || 0;
    }
    return map;
};
