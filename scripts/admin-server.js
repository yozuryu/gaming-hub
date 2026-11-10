#!/usr/bin/env node
// Local admin server — run with: node scripts/admin-server.js  (or: npm run admin)
// Serves the admin UI at http://localhost:3131
// Never deployed — excluded from GitHub Pages via _config.yml

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');
const { createClient: sgdbClient } = require('./lib/steamgriddb');

const PORT       = 3131;
const ROOT       = path.join(__dirname, '..');
const ADMIN_HTML = path.join(ROOT, 'admin', 'index.html');

// Whitelist of JSON files the admin is allowed to read/write
const ALLOWED = [
    'data/hub/config.json',
    'data/ra/series.json',
    'data/ra/art.json',
    'data/hub/series.json',
    'data/hub/idle-games.json',
    'data/hub/farm-games.json',
    'data/steam/series.json',
    'data/xbox/series.json',
    'data/steam/games/index.json',
    'data/xbox/games/index.json',
    'data/xbox/win-conditions.json',
    'data/steam/win-conditions.json',
];

// Pipeline definitions — maps a run mode to the script + args
const PIPELINES = {
    'ra':               { script: 'scripts/ra-pipeline.js',    args: [] },
    'ra-watchlist':     { script: 'scripts/ra-pipeline.js',    args: ['--watchlist-only'] },
    'ra-full':          { script: 'scripts/ra-pipeline.js',    args: ['--refresh-games'] },
    'ra-debug':         { script: 'scripts/ra-pipeline.js',    args: ['--debug'] },
    'steam':            { script: 'scripts/steam-pipeline.js', args: [] },
    'steam-unlocked':   { script: 'scripts/steam-pipeline.js', args: ['--refresh-unlocked-games'] },
    'steam-full':       { script: 'scripts/steam-pipeline.js', args: ['--refresh-games'] },
    'steam-debug':      { script: 'scripts/steam-pipeline.js', args: ['--debug'] },
    'xbox':             { script: 'scripts/xbox-pipeline.js',  args: [] },
    'xbox-full':        { script: 'scripts/xbox-pipeline.js',  args: ['--refresh-games'] },
    'xbox-debug':       { script: 'scripts/xbox-pipeline.js',  args: ['--debug'] },
    // Local tools
    'data-pull':        { script: 'scripts/data-pull.js',      args: [] },
    'build-series':     { script: 'scripts/build-series.js',   args: [] },
};

// GitHub Actions: the real data runs (fetch-data.yml). Reads and dispatches with GH_DISPATCH_TOKEN from .env,
// the same token cron-job.org uses. Inputs are checked against the workflow's own choices.
const GH_REPO     = 'yozuryu/gaming-hub';
const GH_WORKFLOW = 'fetch-data.yml';
const GH_MODES     = ['incremental', 'midnight', 'full-refresh', 'watchlist-only'];
const GH_PLATFORMS = ['all', 'ra', 'steam', 'xbox'];
const envValue = (key) => {
    const file = path.join(ROOT, '.env');
    const env = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    return env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() || null;
};
async function gh(pathPart, init = {}) {
    const token = envValue('GH_DISPATCH_TOKEN');
    if (!token) throw new Error('GH_DISPATCH_TOKEN is not set (Credentials)');
    const r = await fetch(`https://api.github.com/repos/${GH_REPO}${pathPart}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'gaming-hub-admin', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.status === 204 ? null : r.json();
}

// cron-job.org jobs (CRON_JOB_API_KEY). A job's request headers hold the GitHub token: they never leave
// the server, only the dispatch inputs from its body do (cached, the body rarely changes)
async function cron(pathPart, init = {}) {
    const key = envValue('CRON_JOB_API_KEY');
    if (!key) throw new Error('CRON_JOB_API_KEY is not set (Credentials)');
    const r = await fetch(`https://api.cron-job.org${pathPart}`, {
        ...init,
        headers: { Authorization: `Bearer ${key}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    if (!r.ok) throw new Error(`cron-job.org ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
}
const cronInputCache = new Map();
async function cronInputs(id) {
    if (!cronInputCache.has(id)) {
        const { jobDetails } = await cron(`/jobs/${id}`);
        const inputs = JSON.parse(jobDetails?.extendedData?.body || '{}').inputs ?? null;
        cronInputCache.set(id, inputs);
    }
    return cronInputCache.get(id);
}

// Git for Data Diff's Commit / Push / Publish. Hand-edited data files are the ones tracked on main under data/
const git = (args, timeout = 30000) => new Promise((resolve, reject) => {
    require('child_process').execFile('git', args, { cwd: ROOT, timeout, maxBuffer: 1 << 26 }, (err, out, errOut) => err ? reject(new Error(errOut || err.message)) : resolve(out));
});
const isGeneratedPath = (f) => require('./data-paths.json').paths.some(p => f === p || f.startsWith(p + '/'));
async function publishStatus(fetchFirst) {
    let fetched = false;
    if (fetchFirst) { try { await git(['fetch', '-q', 'origin', 'main'], 20000); fetched = true; } catch {} }
    const branch = (await git(['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
    const [behind, ahead] = (await git(['rev-list', '--left-right', '--count', 'origin/main...HEAD'])).trim().split(/\s+/).map(Number);
    // Not committed: hand-edited data files changed in the working tree, or new
    const untracked = (await git(['ls-files', '--others', '--exclude-standard', 'data/'])).split('\n').filter(Boolean);
    const changed = (await git(['diff', 'HEAD', '--name-only', '--', 'data/'])).split('\n').filter(Boolean);
    const uncommitted = [...new Set([...changed, ...untracked])].filter(f => !isGeneratedPath(f));
    // Ready to push: every commit GitHub's main doesn't have (data or not: a push sends them all)
    const commits = [];
    if (ahead) {
        const log = await git(['log', '--name-only', '--format=@@%h%x09%H%x09%s%x09%an%x09%cI', 'origin/main..HEAD']);
        for (const line of log.split('\n')) {
            if (line.startsWith('@@')) { const [sha, full, subject, author, date] = line.slice(2).split('\t'); commits.push({ sha, full, subject, author, date, files: [] }); }
            else if (line.trim() && commits.length) commits[commits.length - 1].files.push(line.trim());
        }
    }
    return { branch, ahead, behind, fetched, uncommitted, commits };
}
const assertCanPush = (st) => {
    if (st.branch !== 'main') throw new Error(`This checkout is on ${st.branch}, not main`);
    if (st.behind > 0) throw new Error(`GitHub's main has ${st.behind} commit${st.behind > 1 ? 's' : ''} this checkout doesn't: pull first (git pull --rebase)`);
};
// Commits exactly the files the page showed: a file changed since then means compare again
async function commitEdits(files, st) {
    if (!files.length) throw new Error('Nothing to commit');
    if ([...files].sort().join('\n') !== [...st.uncommitted].sort().join('\n')) throw new Error('The data files changed since you compared: compare again');
    await git(['add', '--', ...files]);
    const names = files.map(f => f.replace(/^data\//, '')).join(', ');
    await git(['commit', '--only', '-m', `chore(data): update ${names} from the admin`, '--', ...files]);
    return (await git(['rev-parse', '--short', 'HEAD'])).trim();
}
const gitError = (e) => e.message.trim().split('\n').slice(-3).join(' ');

// Who commits and who pushes: the git identity in effect here, and for an SSH remote the key
// `ssh -G` resolves and the GitHub account it signs in as (asked once, cached 10 min)
let ghUserCache = null;
async function gitIdentity() {
    const cfg = async (key) => { try { const [scope, ...v] = (await git(['config', '--show-scope', '--get', key])).trim().split('\t'); return { value: v.join('\t'), scope }; } catch { return null; } };
    const [name, email] = await Promise.all([cfg('user.name'), cfg('user.email')]);
    const url = (await git(['remote', 'get-url', '--push', 'origin'])).trim();
    const transport = /^https?:/.test(url) ? 'https' : /^(\/|\.|file:)/.test(url) ? 'local' : 'ssh';
    const out = { name: name?.value ?? null, email: email?.value ?? null, scope: name?.scope ?? email?.scope ?? null, remote: url, transport };
    const m = url.match(/^(?:ssh:\/\/)?(?:([^@/]+)@)?([^:/]+)[:/]/);
    if (transport === 'ssh' && m) {
        out.transport = 'ssh';
        const host = m[2];
        const sshExec = (args, timeout) => new Promise(r => require('child_process').execFile('ssh', args, { timeout }, (err, so, se) => r({ so: so || '', se: se || '' })));
        const g = (await sshExec(['-G', host], 5000)).so;
        out.sshHost = host;
        out.hostname = g.match(/^hostname (.+)$/m)?.[1] ?? host;
        out.keys = [...g.matchAll(/^identityfile (.+)$/gm)].map(x => x[1]);
        if (!ghUserCache || Date.now() - ghUserCache.at > 600000) {
            const t = await sshExec(['-T', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', `${m[1] || 'git'}@${host}`], 12000);
            const who = (t.so + t.se).match(/Hi ([^!]+)!/)?.[1] ?? null;
            ghUserCache = { at: Date.now(), user: who, error: who ? null : (t.se.trim().split('\n').pop() || 'No answer') };
        }
        out.githubUser = ghUserCache.user; out.sshError = ghUserCache.error;
    } else if (transport === 'https') {
        try { out.helper = (await git(['config', '--get', 'credential.helper'])).trim(); } catch { out.helper = null; }
    }
    return out;
}

// Active job state — only one pipeline runs at a time
let activeJob = null; // { id, mode, proc, lines[], sseClients[], exitCode }

function startJob(mode) {
    if (activeJob && activeJob.exitCode === null) return null; // already running
    const def = PIPELINES[mode];
    if (!def) return null;

    const id   = crypto.randomBytes(4).toString('hex');
    const proc = spawn('node', [path.join(ROOT, def.script), ...def.args], {
        cwd: ROOT,
        env: { ...process.env },
    });

    const job = { id, mode, proc, lines: [], sseClients: [], exitCode: null };
    activeJob = job;

    const pushLine = (type, text) => {
        const line = { type, text, ts: Date.now() };
        job.lines.push(line);
        job.sseClients.forEach(client => {
            client.write(`data: ${JSON.stringify(line)}\n\n`);
        });
    };

    proc.stdout.on('data', d => d.toString().split('\n').filter(Boolean).forEach(l => pushLine('out', l)));
    proc.stderr.on('data', d => d.toString().split('\n').filter(Boolean).forEach(l => pushLine('err', l)));
    proc.on('close', code => {
        job.exitCode = code;
        pushLine('exit', `Process exited with code ${code}`);
        job.sseClients.forEach(client => client.end());
        job.sseClients = [];
    });

    return job;
}

function send(res, status, body, type = 'application/json') {
    const payload = type === 'application/json' ? JSON.stringify(body) : body;
    res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
    res.end(payload);
}

function parsePath(url) {
    const i = url.indexOf('?');
    return i === -1 ? { pathname: url, query: {} } : {
        pathname: url.slice(0, i),
        query: Object.fromEntries(new URLSearchParams(url.slice(i + 1))),
    };
}

function resolveFile(fileParam) {
    if (!fileParam || !ALLOWED.includes(fileParam)) return null;
    return path.join(ROOT, fileParam);
}

const server = http.createServer(async (req, res) => {
    const { method } = req;
    const { pathname, query } = parsePath(req.url);
    console.log(method, JSON.stringify(req.url), '->', JSON.stringify(pathname), JSON.stringify(query));

    // Serve admin UI
    if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fs.readFileSync(ADMIN_HTML, 'utf8'));
        return;
    }

    // Site images for the admin UI (app icon, platform icons, favicon): /assets/<file>, images only
    if (method === 'GET' && pathname.startsWith('/assets/')) {
        const name = path.basename(pathname);
        const type = { '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp' }[path.extname(name)];
        const file = path.join(ROOT, 'assets', name);
        if (type && fs.existsSync(file)) { res.writeHead(200, { 'Content-Type': type }); res.end(fs.readFileSync(file)); }
        else { res.writeHead(404); res.end(); }
        return;
    }

    // CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,PUT,POST',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
    }

    // GET /api/games/ra
    if (method === 'GET' && pathname === '/api/games/ra') {
        try {
            // games/index.json (split per game), else the old single games.json
            const indexPath = path.join(ROOT, 'data/ra/games/index.json');
            const raw = fs.existsSync(indexPath)
                ? { detailedGameProgress: JSON.parse(fs.readFileSync(indexPath, 'utf8')).games }
                : JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ra/games.json'), 'utf8'));
            const watchlist = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ra/watchlist.json'), 'utf8'));
            const watchlistIds = new Set((watchlist.results || []).map(g => g.id));
            const map = new Map();
            Object.values(raw.detailedGameProgress).forEach(g => {
                map.set(g.id, { id: g.id, title: g.title, imageIcon: g.imageIcon, consoleName: g.consoleName ?? null, fromWatchlist: watchlistIds.has(g.id), played: true });
            });
            (watchlist.results || []).forEach(g => {
                if (!map.has(g.id)) map.set(g.id, { id: g.id, title: g.title, imageIcon: g.imageIcon, consoleName: g.consoleName ?? null, fromWatchlist: true });
            });
            const games = Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
            send(res, 200, games);
        } catch (e) {
            send(res, 500, { error: e.message });
        }
        return;
    }

    // GET /api/data?file=...
    if (method === 'GET' && pathname === '/api/data') {
        const filePath = resolveFile(query.file);
        if (!filePath) { send(res, 403, { error: 'File not allowed' }); return; }
        try {
            send(res, 200, JSON.parse(fs.readFileSync(filePath, 'utf8')));
        } catch (e) {
            send(res, 500, { error: e.message });
        }
        return;
    }

    // PUT /api/data?file=...
    if (method === 'PUT' && pathname === '/api/data') {
        const filePath = resolveFile(query.file);
        if (!filePath) { send(res, 403, { error: 'File not allowed' }); return; }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
                // Shared series: rebuild the site's progress file (deploy.yml does the same)
                if (query.file === 'data/hub/series.json') require('child_process').execFile('node', [path.join(ROOT, 'scripts/build-series.js')], () => {});
                send(res, 200, { ok: true });
            } catch (e) {
                send(res, 400, { error: e.message });
            }
        });
        return;
    }

    // POST /api/pipeline/start  body: { mode }
    if (method === 'POST' && pathname === '/api/pipeline/start') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { mode } = JSON.parse(body);
                if (activeJob && activeJob.exitCode === null) {
                    send(res, 409, { error: 'A pipeline is already running' }); return;
                }
                const job = startJob(mode);
                if (!job) { send(res, 400, { error: `Unknown mode: ${mode}` }); return; }
                send(res, 200, { id: job.id, mode: job.mode });
            } catch (e) {
                send(res, 400, { error: e.message });
            }
        });
        return;
    }

    // POST /api/pipeline/stop
    if (method === 'POST' && pathname === '/api/pipeline/stop') {
        if (!activeJob || activeJob.exitCode !== null) {
            send(res, 200, { ok: true }); return;
        }
        activeJob.proc.kill('SIGTERM');
        send(res, 200, { ok: true });
        return;
    }

    // GET /api/pipeline/status
    if (method === 'GET' && pathname === '/api/pipeline/status') {
        if (!activeJob) { send(res, 200, { running: false }); return; }
        send(res, 200, {
            running:  activeJob.exitCode === null,
            id:       activeJob.id,
            mode:     activeJob.mode,
            exitCode: activeJob.exitCode,
            lines:    activeJob.lines,
        });
        return;
    }

    // GET /api/pipeline/stream?id=  — SSE, replays history then streams live
    if (method === 'GET' && pathname === '/api/pipeline/stream') {
        const job = activeJob && activeJob.id === query.id ? activeJob : null;
        if (!job) { send(res, 404, { error: 'Job not found' }); return; }

        res.writeHead(200, {
            'Content-Type':  'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection':    'keep-alive',
            'Access-Control-Allow-Origin': '*',
        });

        // Replay buffered lines
        job.lines.forEach(line => res.write(`data: ${JSON.stringify(line)}\n\n`));

        if (job.exitCode !== null) { res.end(); return; }

        job.sseClients.push(res);
        req.on('close', () => {
            job.sseClients = job.sseClients.filter(c => c !== res);
        });
        return;
    }

    // GET /api/diff — returns per-file structured diff (tracked changes + new untracked files)
    if (method === 'GET' && pathname === '/api/diff') {
        const { execFile } = require('child_process');

        const splitDiff = (diffOut) => {
            const chunks = [];
            let current = null;
            for (const line of diffOut.split('\n')) {
                if (line.startsWith('diff --git ')) {
                    if (current) chunks.push(current);
                    const match = line.match(/diff --git a\/(.+) b\/(.+)/);
                    current = { file: match ? match[2] : line, lines: [], isNew: false };
                } else if (current) {
                    current.lines.push(line);
                }
            }
            if (current) chunks.push(current);
            return chunks;
        };

        // Hand-edited files (tracked on main) diff against git; pipeline output (ignored, from the
        // data branch) diffs against the untouched copy that `npm run data:pull` keeps in .data-snapshot/
        const GENERATED = require('./data-paths.json').paths;
        const isGenerated = (file) => GENERATED.some(p => file === p || file.startsWith(p + '/'));
        // Against HEAD: not committed yet. Committed but not pushed shows as commits (/api/publish/status)
        execFile('git', ['diff', 'HEAD', '--', 'data/'], { cwd: ROOT }, (_err, diffOut) => {
            execFile('git', ['diff', '--no-index', '--', '.data-snapshot/data', 'data'], { cwd: ROOT, maxBuffer: 1 << 28 }, (_errG, genOut) => {
            const generated = fs.existsSync(path.join(ROOT, '.data-snapshot'))
                ? splitDiff(genOut || '').map(c => ({ ...c, file: c.file.replace(/^\.data-snapshot\//, '') })).filter(c => isGenerated(c.file))
                : [];
            const tracked = [
                ...splitDiff(diffOut).filter(c => !isGenerated(c.file)).map(c => ({ ...c, kind: 'edit' })),
                ...generated.map(c => ({ ...c, kind: 'local' })),
            ];

            execFile('git', ['ls-files', '--others', '--exclude-standard', 'data/'], { cwd: ROOT }, (_err2, untrackedOut) => {
                const untrackedFiles = untrackedOut.trim().split('\n').filter(Boolean);
                const untracked = untrackedFiles.map(file => {
                    try {
                        const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
                        const lines = content.split('\n');
                        // Format as a pure-addition unified diff
                        const diffLines = [
                            `--- /dev/null`,
                            `+++ b/${file}`,
                            `@@ -0,0 +1,${lines.length} @@`,
                            ...lines.map(l => `+${l}`),
                        ];
                        return { file, lines: diffLines, isNew: true, kind: 'edit' };
                    } catch {
                        return { file, lines: [], isNew: true, kind: 'edit' };
                    }
                });

                send(res, 200, { files: [...tracked, ...untracked] });
            });
            });
        });
        return;
    }

    // GET /api/sgdb/search?q=  ·  GET /api/sgdb/images?gameId=&kind=grid|hero|square|icon
    // SteamGridDB lookups for the RA Art module (scripts/lib/steamgriddb.js). The key is read from .env
    // on every call, so a key saved in Credentials works at once; it never goes to the page.
    if (method === 'GET' && (pathname === '/api/sgdb/search' || pathname === '/api/sgdb/images')) {
        try {
            const env = fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '';
            const key = env.match(/^SGDB_API_KEY=(.*)$/m)?.[1]?.trim();
            if (!key) { send(res, 400, { error: 'SGDB_API_KEY is not set (Credentials)' }); return; }
            const sgdb = sgdbClient(key);
            if (pathname === '/api/sgdb/search') {
                if (!query.q) { send(res, 400, { error: 'Missing q' }); return; }
                send(res, 200, await sgdb.search(query.q));
            } else {
                if (!/^\d+$/.test(query.gameId || '')) { send(res, 400, { error: 'Invalid gameId' }); return; }
                const kinds = { grid: sgdb.grids, hero: sgdb.heroes, square: sgdb.squares, icon: sgdb.icons };
                send(res, 200, await (kinds[query.kind] ?? sgdb.grids)(query.gameId));
            }
        } catch (e) {
            send(res, 502, { error: e.message });
        }
        return;
    }

    // GET /api/gh/runs — the latest data runs on GitHub Actions
    if (method === 'GET' && pathname === '/api/gh/runs') {
        try {
            const d = await gh(`/actions/workflows/${GH_WORKFLOW}/runs?per_page=12`);
            send(res, 200, (d.workflow_runs ?? []).map(r => ({
                id: r.id, title: r.display_title, status: r.status, conclusion: r.conclusion, event: r.event,
                created: r.created_at, started: r.run_started_at, updated: r.updated_at, url: r.html_url, attempt: r.run_attempt,
            })));
        } catch (e) { send(res, 502, { error: e.message }); }
        return;
    }

    // POST /api/gh/dispatch { mode, platforms } — start a data run on GitHub Actions
    if (method === 'POST' && pathname === '/api/gh/dispatch') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { mode, platforms } = JSON.parse(body || '{}');
                if (!GH_MODES.includes(mode) || !GH_PLATFORMS.includes(platforms)) { send(res, 400, { error: 'Invalid mode or platforms' }); return; }
                await gh(`/actions/workflows/${GH_WORKFLOW}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: 'main', inputs: { mode, platforms } }) });
                send(res, 200, { ok: true });
            } catch (e) { send(res, 502, { error: e.message }); }
        });
        return;
    }

    // GET /api/sync-state — which platforms the scheduled runs sync (XBOX_ENABLED in fetch-data.yml)
    if (method === 'GET' && pathname === '/api/sync-state') {
        try {
            const yml = fs.readFileSync(path.join(ROOT, '.github/workflows', GH_WORKFLOW), 'utf8');
            const xbox = yml.match(/XBOX_ENABLED:\s*'(\w+)'/)?.[1] === 'true';
            send(res, 200, { ra: true, steam: true, xbox });
        } catch (e) { send(res, 500, { error: e.message }); }
        return;
    }

    // GET /api/publish/status — where this checkout stands against GitHub's main (fetches first):
    // data files not committed, commits not pushed
    if (method === 'GET' && pathname === '/api/publish/status') {
        try { send(res, 200, await publishStatus(true)); } catch (e) { send(res, 500, { error: e.message }); }
        return;
    }

    // GET /api/git/identity — who commits (git config) and who pushes (SSH key → GitHub account)
    if (method === 'GET' && pathname === '/api/git/identity') {
        try { send(res, 200, await gitIdentity()); } catch (e) { send(res, 500, { error: e.message }); }
        return;
    }

    // GET /api/git/show?sha= — one commit that isn't on GitHub yet: per-file diffs (data), details only (code)
    if (method === 'GET' && pathname === '/api/git/show') {
        try {
            const sha = new URL(req.url, 'http://x').searchParams.get('sha') || '';
            const st = await publishStatus(false);
            const c = st.commits.find(x => x.sha === sha || x.full === sha);
            if (!c) { send(res, 404, { error: 'Not a commit waiting to be pushed' }); return; }
            // Code commits (anything outside data/, which the admin can't commit) get their details only:
            // message and per-file line counts, no diff
            if (!c.files.every(f => f.startsWith('data/'))) {
                const body = (await git(['log', '-1', '--format=%b', c.full])).trim();
                const stat = (await git(['show', '--format=', '--numstat', c.full])).split('\n').filter(Boolean).map(l => {
                    const [add, del, file] = l.split('\t');
                    return { file, add: add === '-' ? null : +add, del: del === '-' ? null : +del };
                });
                send(res, 200, { ...c, code: true, body, stat });
                return;
            }
            const out = await git(['show', '--format=', c.full]);
            const files = []; let cur = null;
            for (const line of out.split('\n')) {
                if (line.startsWith('diff --git ')) { cur = { file: line.match(/ b\/(.+)$/)?.[1] ?? line, lines: [] }; files.push(cur); }
                else if (cur) cur.lines.push(line);
            }
            send(res, 200, { ...c, diffs: files });
        } catch (e) { send(res, 500, { error: e.message }); }
        return;
    }

    // POST /api/git/commit { files } · /api/git/push · /api/publish { files } (both) — hand-edited data
    // files only (git commit --only leaves everything else alone); a push sends every commit main lacks
    // and deploys the site. Pipeline output is never pushed from here: it lives on the data branch
    if (method === 'POST' && ['/api/git/commit', '/api/git/push', '/api/publish'].includes(pathname)) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { files = [] } = JSON.parse(body || '{}');
                const st = await publishStatus(pathname !== '/api/git/commit');
                if (pathname !== '/api/git/commit') assertCanPush(st);
                let commit = null;
                if (pathname !== '/api/git/push' && (files.length || pathname === '/api/git/commit')) commit = await commitEdits(files, st);
                if (pathname === '/api/git/commit') { send(res, 200, { ok: true, commit }); return; }
                const count = st.ahead + (commit ? 1 : 0);
                if (!count) throw new Error('Nothing to push');
                await git(['push', 'origin', 'HEAD:main'], 60000);
                send(res, 200, { ok: true, commit, pushed: count });
            } catch (e) { send(res, 409, { error: gitError(e) }); }
        });
        return;
    }

    // GET /api/cron/jobs — the cron-job.org jobs that start the data runs (100 API calls a day: no polling)
    if (method === 'GET' && pathname === '/api/cron/jobs') {
        try {
            const { jobs = [] } = await cron('/jobs');
            const out = await Promise.all(jobs.map(async j => ({
                id: j.jobId, title: j.title, enabled: j.enabled, schedule: j.schedule,
                lastStatus: j.lastStatus, lastExecution: j.lastExecution, lastDuration: j.lastDuration, nextExecution: j.nextExecution,
                inputs: (await cronInputs(j.jobId).catch(() => null)),
            })));
            send(res, 200, out);
        } catch (e) { send(res, 502, { error: e.message }); }
        return;
    }

    // POST /api/cron/run { id } — cron-job.org has no "run now": send the job's own request to GitHub
    if (method === 'POST' && pathname === '/api/cron/run') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { id } = JSON.parse(body || '{}');
                const inputs = await cronInputs(Number(id));
                if (!inputs || !GH_MODES.includes(inputs.mode) || !GH_PLATFORMS.includes(inputs.platforms)) throw new Error("The job's request isn't a fetch-data.yml dispatch");
                await gh(`/actions/workflows/${GH_WORKFLOW}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: 'main', inputs }) });
                send(res, 200, { ok: true, inputs });
            } catch (e) { send(res, 502, { error: e.message }); }
        });
        return;
    }

    // POST /api/cron/enable { id, enabled } — pause or resume a job's schedule
    if (method === 'POST' && pathname === '/api/cron/enable') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { id, enabled } = JSON.parse(body || '{}');
                if (!Number.isInteger(id) || typeof enabled !== 'boolean') { send(res, 400, { error: 'Invalid job or state' }); return; }
                await cron(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ job: { enabled } }) });
                send(res, 200, { ok: true });
            } catch (e) { send(res, 502, { error: e.message }); }
        });
        return;
    }

    // GET /api/credentials — read .env keys (values masked except last 4 chars)
    if (method === 'GET' && pathname === '/api/credentials') {
        try {
            const raw = fs.existsSync(path.join(ROOT, '.env'))
                ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8')
                : '';
            const parsed = {};
            for (const line of raw.split('\n')) {
                const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
                if (m) parsed[m[1]] = m[2];
            }
            send(res, 200, parsed);
        } catch (e) {
            send(res, 500, { error: e.message });
        }
        return;
    }

    // PUT /api/credentials — write .env
    if (method === 'PUT' && pathname === '/api/credentials') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const content = Object.entries(data).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
                fs.writeFileSync(path.join(ROOT, '.env'), content, 'utf8');
                send(res, 200, { ok: true });
            } catch (e) {
                send(res, 400, { error: e.message });
            }
        });
        return;
    }

    // GET /api/steam/game?appId=  — read-only individual game file
    if (method === 'GET' && pathname === '/api/steam/game') {
        const { appId } = query;
        if (!appId || !/^\d+$/.test(appId)) { send(res, 400, { error: 'Invalid appId' }); return; }
        try {
            const filePath = path.join(ROOT, `data/steam/games/${appId}.json`);
            send(res, 200, JSON.parse(fs.readFileSync(filePath, 'utf8')));
        } catch (e) {
            send(res, 404, { error: 'Not found' });
        }
        return;
    }

    // GET /api/xbox/game?titleId=  — read-only individual title file
    if (method === 'GET' && pathname === '/api/xbox/game') {
        const { titleId } = query;
        if (!titleId || !/^\d+$/.test(titleId)) { send(res, 400, { error: 'Invalid titleId' }); return; }
        try {
            const filePath = path.join(ROOT, `data/xbox/games/${titleId}.json`);
            send(res, 200, JSON.parse(fs.readFileSync(filePath, 'utf8')));
        } catch (e) {
            send(res, 404, { error: 'Not found' });
        }
        return;
    }

    // GET /api/health
    if (method === 'GET' && pathname === '/api/health') {
        send(res, 200, { ok: true });
        return;
    }

    // POST /api/server/stop
    if (method === 'POST' && pathname === '/api/server/stop') {
        send(res, 200, { ok: true });
        setTimeout(() => process.exit(0), 100);
        return;
    }

    // POST /api/server/restart
    if (method === 'POST' && pathname === '/api/server/restart') {
        send(res, 200, { ok: true });
        setTimeout(() => {
            const child = spawn('node', [__filename], { detached: true, stdio: 'inherit' });
            child.unref();
            process.exit(0);
        }, 100);
        return;
    }

    send(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Admin panel → http://localhost:${PORT}`);
});
