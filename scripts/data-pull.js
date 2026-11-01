// Pulls the pipeline output from the `data` branch into data/, plus an untouched copy in
// .data-snapshot/ that the admin Data Diff compares against. The site, the admin panel and
// local pipeline test runs read these files; publishing data only happens from GitHub Actions.
//   npm run data:pull
const { execFileSync, execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT     = path.join(__dirname, '..');
const SNAPSHOT = path.join(ROOT, '.data-snapshot');
const { paths } = require('./data-paths.json');

execFileSync('git', ['fetch', '--quiet', 'origin', 'data'], { cwd: ROOT, stdio: 'inherit' });

// Replace the generated paths (so files deleted on the branch go away locally too); hand-edited
// files in data/ are never touched
for (const p of paths) fs.rmSync(path.join(ROOT, p), { recursive: true, force: true });
fs.rmSync(SNAPSHOT, { recursive: true, force: true });
fs.mkdirSync(SNAPSHOT);

for (const dest of [ROOT, SNAPSHOT]) {
    execSync(`git archive origin/data | tar -x -C "${dest}"`, { cwd: ROOT, stdio: 'inherit' });
}

const ref = execFileSync('git', ['log', '-1', '--format=%h %s', 'origin/data'], { cwd: ROOT }).toString().trim();
console.log(`data/ updated from the data branch (${ref})`);
