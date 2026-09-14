# Modular King — static comparison site

Dark, dependency-free static site (HTML + CSS + vanilla JS). No build step, no npm packages. Compact header + three priced picks above the fold; DIY/method/watchlist live in `<details>` disclosure sections.

## Local preview

```sh
cd /workspace/bed
python3 -m http.server 8123 --bind 127.0.0.1
# open http://127.0.0.1:8123/index.html
```

## GitHub Pages hosting

1. Create a repo (e.g. `king-bed-guide`) and push this directory's contents to the
   `main` branch (or `gh-pages`).
2. Repo → **Settings → Pages** → Source: **Deploy from a branch**,
   Branch: `main`, Folder: `/ (root)`. Save.
3. The site serves at `https://<user>.github.io/<repo>/` within a minute or two.
4. `.nojekyll` is included so Pages serves `assets/` and files starting with
   `_` exactly as-is (no Jekyll processing).

All links/asset paths are relative, so the site also works from a sub-path
or opened directly from disk (except `fetch`-based features — there are none).

## Browser tests

- `tests/calculator-custom-base.js` — stack calculator custom-base behavior (permanent, must pass).
- `tests/redesign.js` — picks above the fold, topper thickness (1/2/4) filters, "Build this" applying calculator options, no personal-anecdote text in page or SVGs, no horizontal overflow, visible keyboard focus, zero console errors; saves screenshots to `/tmp/opencode/`.

```sh
cd /workspace/bed
NODE_PATH="<dir-with-playwright-core>" \
CHROME_HEADLESS_SHELL="<path-to-chrome-headless-shell>" \
LD_LIBRARY_PATH="<sysroot-lib-dirs>" FONTCONFIG_FILE="<fonts.conf>" \
node tests/calculator-custom-base.js
# same env, plus BED_URL=http://127.0.0.1:8123/index.html when served:
node tests/redesign.js
```

Optional overrides (no hardcoded browser paths in the test itself):

- `BED_URL` — page to test (default: local `index.html` via `file://`).
- `CHROME_HEADLESS_SHELL` — Chromium executable (omit to use Playwright default).
- `VIEWPORTS` — calculator test only, e.g. `VIEWPORTS=1280x800` or `VIEWPORTS=390x800` (redesign test uses fixed 1280x800 / 390x844 + full-page 1440).

## Snapshot

Prices/stock notes are a **Sept 14, 2026** research snapshot. Totals in the
calculator are plain arithmetic on those snapshot prices; verify live listings
before spending.
