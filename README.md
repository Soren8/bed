# Smart modular king beds — static comparison site

Dependency-free static site (HTML + CSS + vanilla JS). No build step, no npm packages.

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

## Browser test (calculator custom base)

Focused Playwright check for the stack calculator: separate custom-base
labels, typing selects the custom radio, invalid/empty custom shows an
error with no `$0.00` subtotal, no arbitrary max cap, featured math, and
Enter does not reset state. Runs at desktop + 390px widths. No npm install;
uses an externally installed `playwright-core`.

```sh
cd /workspace/bed
NODE_PATH="<dir-with-playwright-core>" \
CHROME_HEADLESS_SHELL="<path-to-chrome-headless-shell>" \
LD_LIBRARY_PATH="<sysroot-lib-dirs>" FONTCONFIG_FILE="<fonts.conf>" \
node tests/calculator-custom-base.js
```

Optional overrides (no hardcoded browser paths in the test itself):

- `BED_URL` — page to test (default: local `index.html` via `file://`).
- `CHROME_HEADLESS_SHELL` — Chromium executable (omit to use Playwright default).
- `VIEWPORTS` — e.g. `VIEWPORTS=1280x800` or `VIEWPORTS=390x800`.

## Snapshot

Prices/stock notes are a **Sept 14, 2026** research snapshot. Totals in the
calculator are plain arithmetic on those snapshot prices; verify live listings
before spending.
