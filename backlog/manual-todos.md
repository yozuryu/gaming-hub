# Manual to-dos (for you)

Things that need your GitHub account or local setup, so they can't be done from here.

## 1. Repo "About" box

On [github.com/yozuryu/gaming-hub](https://github.com/yozuryu/gaming-hub), click the ⚙️ next to **About** and set:

- **Description:**
  ```
  Personal achievement dashboard for RetroAchievements, Steam and Xbox — a static PWA fed by scheduled GitHub Actions pipelines
  ```
- **Website:** `https://yozuryu.github.io/gaming-hub/` (or tick "Use your GitHub Pages website")
- **Topics:**
  ```
  retroachievements steam xbox achievements dashboard github-pages github-actions pwa react
  ```

## 2. Git remote URL

GitHub reports the repo moved. Pushes still work through the redirect, but update the remote:

```bash
git remote set-url origin git@github.com:yozuryu/gaming-hub.git
```

## 3. `gh` CLI account

`gh` on this machine is logged in as the work account (`bambang-hadl`), which can't trigger workflows or change settings on this repo. To let Claude run workflows (e.g. a manual full refresh) or edit repo settings:

```bash
gh auth login --hostname github.com    # log in as yozuryu
gh auth switch -u bambang-hadl         # switch back to the work account later
```

## 4. `XBOX_XUID`

The pipeline reads the XUID from the Xbox account and doesn't need `XBOX_XUID`. The value in `.env` (and probably the GitHub secret) is 9 digits, not the real 16-digit XUID (`2535408538767451`). Remove it from both, or correct it.
