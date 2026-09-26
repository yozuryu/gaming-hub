#!/usr/bin/env node
// Local admin server — run with: node scripts/admin-server.js  (or: npm run admin)
// Serves the admin UI at http://localhost:3131
// Never deployed — excluded from GitHub Pages via _config.yml

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

const PORT       = 3131;
const ROOT       = path.join(__dirname, '..');
const ADMIN_HTML = path.join(ROOT, 'admin', 'index.html');

// Whitelist of JSON files the admin is allowed to read/write
const ALLOWED = [
    'data/hub/config.json',
    'data/ra/guides.json',
    'data/ra/series.json',
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
};

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

const server = http.createServer((req, res) => {
    const { method } = req;
    const { pathname, query } = parsePath(req.url);
    console.log(method, JSON.stringify(req.url), '->', JSON.stringify(pathname), JSON.stringify(query));

    // Serve admin UI
    if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fs.readFileSync(ADMIN_HTML, 'utf8'));
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
            const raw       = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ra/games.json'), 'utf8'));
            const watchlist = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ra/watchlist.json'), 'utf8'));
            const watchlistIds = new Set((watchlist.results || []).map(g => g.id));
            const map = new Map();
            Object.values(raw.detailedGameProgress).forEach(g => {
                map.set(g.id, { id: g.id, title: g.title, imageIcon: g.imageIcon, consoleName: g.consoleName ?? null, fromWatchlist: watchlistIds.has(g.id) });
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

        execFile('git', ['diff', 'data/'], { cwd: ROOT }, (_err, diffOut) => {
            const tracked = splitDiff(diffOut);

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
                        return { file, lines: diffLines, isNew: true };
                    } catch {
                        return { file, lines: [], isNew: true };
                    }
                });

                send(res, 200, { files: [...tracked, ...untracked] });
            });
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
