// Real numbers for the Fable 5.2 share card samples, read from the local data/ (after `npm run data:pull`).
//   node build-data.cjs   → data.js (window.FX)
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '../../../data/');
const J = p => JSON.parse(fs.readFileSync(D + p));
const day = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const RA = 'https://media.retroachievements.org', ST = 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/';
const utc = s => new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
const list = a => Array.isArray(a) ? a : Object.values(a);

function raGame(id) {
  const g = J('ra/games/' + id + '.json');
  const ach = list(g.achievements).map(a => ({ n: a.title, b: a.badgeName, t: a.dateEarnedHardcore || a.dateEarned || null, p: a.points, type: a.type || '',
    r: Math.round(1000 * a.numAwarded / g.numDistinctPlayersCasual) / 10, o: a.displayOrder }));
  const got = ach.filter(a => a.t).sort((a, b) => utc(a.t) - utc(b.t));
  const at = f => got[Math.max(0, Math.ceil(got.length * f) - 1)];
  return { title: g.title, console: g.consoleName, total: ach.length, minutes: Math.round((g.userTotalPlaytime || 0) / 60),
    points: ach.reduce((s, a) => s + a.p, 0), players: g.numDistinctPlayersCasual,
    wall: [...got, ...ach.filter(a => !a.t).sort((a, b) => a.o - b.o)].map(a => ({ b: a.b, on: !!a.t })),
    marks: got.length ? [0.0001, .25, .5, .75, 1].map((f, i) => ({ f: i ? f : 0, n: at(f).n, b: at(f).b, t: utc(at(f).t).getTime() })) : [],
    rare: got.slice().sort((a, b) => a.r - b.r).slice(0, 5).map(a => ({ n: a.n, b: a.b, r: a.r, p: a.p })) };
}

// Last 7 local days and the last full month, RA + Steam play time and every platform's unlocks
const sessions = [], games = {};
for (const p of ['ra', 'steam']) { const y = J(p + '/playtime/2026.json');
  for (const [id, g] of Object.entries(y.games)) games[p + id] = { name: g.name, icon: p === 'ra' ? RA + g.icon : g.icon, p };
  for (const s of y.sessions) sessions.push({ k: p + s.gameId, end: +new Date(s.end), m: s.minutes }); }
const unlocks = [];
for (const p of ['ra', 'steam', 'xbox']) { try { for (const u of J(p + '/history/2026.json').unlocks) unlocks.push({ p, t: +new Date(u.t), g: u.g, a: u.a, n: u.n, r: u.r, v: u.p, hc: u.hc }); } catch {} }
const today = new Date('2026-11-14T12:00:00'), days = [];
for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push(day(d)); }
const span = (keys) => {
  const mins = {}, per = {}, un = {};
  for (const s of sessions) { const k = day(s.end); if (keys.has(k)) { mins[k] = (mins[k] || 0) + s.m; per[s.k] = (per[s.k] || 0) + s.m; } }
  for (const u of unlocks) { const k = day(u.t); if (keys.has(k)) un[k] = (un[k] || 0) + 1; }
  const top = Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, m]) => ({ ...games[k], m }));
  return { mins, un, top, minutes: Object.values(mins).reduce((a, b) => a + b, 0), unlocks: Object.values(un).reduce((a, b) => a + b, 0), games: Object.keys(per).length };
};
const wk = span(new Set(days));
const week = { days: days.map(k => ({ k, m: wk.mins[k] || 0, u: wk.un[k] || 0 })), minutes: wk.minutes, unlocks: wk.unlocks, games: wk.games, top: wk.top };
const oct = []; for (let d = 1; d <= 31; d++) oct.push('2026-10-' + String(d).padStart(2, '0'));
const mo = span(new Set(oct));
const month = { name: 'October 2026', first: new Date('2026-10-01T12:00:00').getDay(), days: oct.map(k => ({ u: mo.un[k] || 0, m: mo.mins[k] || 0 })), minutes: mo.minutes, unlocks: mo.unlocks, games: mo.games, top: mo.top,
  active: oct.filter(k => mo.un[k] || mo.mins[k]).length };

// The year's rarest unlocks (RA + Steam), with their badge
const cache = {};
const file = (p, g) => cache[p + g] ??= (() => { try { return J(p + '/games/' + g + '.json'); } catch { return null; } })();
const rarest = unlocks.filter(u => u.r != null && u.p !== 'xbox').sort((a, b) => a.r - b.r).map(u => {
  const g = file(u.p, u.g); if (!g) return null;
  const a = list(g.achievements).find(x => String(x.id ?? x.apiName) === String(u.a)); if (!a) return null;
  return { p: u.p, n: u.n, r: u.r, t: u.t, game: g.title || g.gameName, img: u.p === 'ra' ? RA + '/Badge/' + a.badgeName + '.png' : ST + u.g + '/' + a.iconUrl };
}).filter(Boolean);
const seen = new Set(), rare5 = [];
for (const r of rarest) { if (seen.has(r.game)) continue; seen.add(r.game); rare5.push(r); if (rare5.length === 5) break; }

// Completions of the year and all time
const pr = J('ra/profile.json'), sp = J('steam/profile.json');
const comps = [
  ...pr.pageAwards.visibleUserAwards.filter(a => /Mastery|Beaten/.test(a.awardType)).map(a => ({ p: 'ra', name: a.title, t: +new Date(a.awardedAt), icon: RA + a.imageIcon, tier: a.awardType.includes('Mastery') ? 'top' : 'beaten', px: true })),
  ...(sp.perfectGames || []).map(g => ({ p: 'steam', name: g.gameName, t: +new Date(g.completedAt), icon: 'https://cdn.akamai.steamstatic.com/steam/apps/' + g.appId + '/library_600x900.jpg', tier: 'top' })),
].sort((a, b) => b.t - a.t);
// a mastery replaces the same game's beaten award
const best = []; for (const c of comps) { if (!best.some(b => b.p === c.p && b.name === c.name)) best.push(c); }

const so = J('hub/series-games.json').series.find(s => /star ocean/i.test(s.name));
const series = { name: so.name, games: so.games.map(g => ({ p: g.p, title: g.title, icon: g.icon, unlocked: g.unlocked, total: g.total, beaten: !!g.beaten, minutes: g.minutes ?? g.playtime ?? 0 })) };

const sday = '2026-11-08', rofFile = J('ra/games/16244.json');
const session = { date: sday, minutes: sessions.filter(s => s.k === 'ra16244' && day(s.end) === sday).reduce((a, s) => a + s.m, 0),
  items: unlocks.filter(u => u.p === 'ra' && u.g == 16244 && day(u.t) === sday).sort((a, b) => a.t - b.t).map(u => ({ n: u.n, v: u.v, r: u.r, t: u.t, b: list(rofFile.achievements).find(a => a.id == u.a).badgeName })) };
const steam = {}; for (const id of [1451810, 1658290, 578330, 2238900]) { const g = J('steam/games/' + id + '.json'), got = g.achievements.filter(a => a.unlocked);
  const pick = a => a && ({ n: a.displayName, r: a.globalPct, img: ST + id + '/' + a.iconUrl, t: +new Date(a.unlockedAt) });
  steam[id] = { title: g.gameName, unlocked: got.length, total: g.achievements.length, minutes: g.playtimeForever,
    latest: pick(got.slice().sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))[0]), rarest: pick(got.slice().sort((a, b) => a.globalPct - b.globalPct)[0]),
    recent: got.slice().sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt)).slice(0, 6).map(a => ST + id + '/' + a.iconUrl) }; }
const xb = J('xbox/games/2116209805.json'), xa = xb.achievements.find(a => a.apiName === '39');
const xbox = { title: xb.gameName, unlocked: xb.unlocked, total: xb.total, gs: xb.gamerscore, gsTotal: xb.totalGamerscore, hero: xb.heroUrl + '?w=1920', poster: xb.posterUrl + '?w=600',
  unlock: { n: xa.displayName, r: xa.globalPct, gs: xa.gamerscore, img: xa.iconUrl + '&w=800', desc: xa.description } };
const byPlat = {}, months = Array(12).fill(0);
for (const u of unlocks) { byPlat[u.p] = (byPlat[u.p] || 0) + 1; months[new Date(u.t).getMonth()]++; }
const SA = 'https://cdn.akamai.steamstatic.com/steam/apps/';
const art = id => ({ cover: SA + id + '/library_600x900_2x.jpg', hero: SA + id + '/library_hero.jpg' });
const out = { session, steam, xbox, byPlat, months, art: { lego2k: art(1451810), eiyuden: art(1658290), legocity: art(578330), so2: art(2238900) }, builtFor: '2026-11-14', d7: raGame(16452), rof: raGame(16244), week, month, rare5, completions: best, series,
  totals: { unlocksYear: unlocks.length, minutesYear: sessions.reduce((s, x) => s + x.m, 0) } };
fs.writeFileSync(__dirname + '/data.js', '// Built by build-data.cjs from the data branch on ' + out.builtFor + '\nwindow.FX = ' + JSON.stringify(out) + ';\n');
console.log('session', JSON.stringify(session)); console.log('steam', JSON.stringify(steam).slice(0,1500));
console.log('year comps', best.filter(c => new Date(c.t).getFullYear() === 2026).length, best.filter(c=>c.tier==='top').length);
console.log('week', JSON.stringify(week).slice(0, 900)); console.log('month', month.minutes, month.unlocks, month.active, JSON.stringify(month.top));
console.log('rare5', JSON.stringify(rare5, null, 0)); console.log('comps', best.length, JSON.stringify(best.slice(0, 3)));
console.log('series', JSON.stringify(series).slice(0, 600)); console.log('d7', JSON.stringify(out.d7.marks), JSON.stringify(out.d7.rare), out.d7.minutes, out.d7.points, out.totals);
