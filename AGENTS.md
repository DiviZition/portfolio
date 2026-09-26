# AGENTS.md — Portfolio

## Commands
- `npm run dev` — start dev server (port 3000, auto-open)
- `npm run build` — production build → `dist/`
- `npm run preview` — preview production build locally
- CI uses `npm ci` + `npm run build` (see `.github/workflows/deploy.yml`)

## Architecture
Single-page vanilla JS + CSS app built with Vite. No framework, no tests, no lint/typecheck.

- **Entry:** `index.html` → `/src/main.js` (ES module, dynamic imports for configs)
- **Styles:** `src/css/style.css`
- **Parallax background:** `src/js/parallax.js` — two canvas layers (stars + terrain/particles). Configurable via the `CONFIG` object at the top of the file. Injected as fixed-position canvases behind all content.
- **Data:** all displayed content is driven by JSON configs — edit these to change what the user sees:
  - `config/profile.json` — name, bio, photo, social links, favicon, skills (array of `{title, items[]}`), cvPath
  - `config/projects.json` — project cards (roadmap), each with media, tech stack, team, store links
  - `config/firebase.json` — Firebase config for analytics (`firebase/analytics`)
- **Static assets:** `public/assets/` → served as `assets/` at build time

## Content formatting
In `projects.json`, the `fullDescription` field supports a custom syntax (handled by `formatText()` in main.js):
- Bold: `**text**`
- Italic: `*text*` or `_text_`
- Colored text: `[#HEX]text[/color]` (e.g. `[#ff00aa]highlight[/color]`)

## Deployment
CI in `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on push to `main`.
Vite base path is `/portfolio/` — the repo name matters for deployment URL.

## Gotchas
- Project cards sort by date descending (newest first) in `renderRoadmap()`
- Media gallery videos auto-play on hover with a 100ms debounce; pause on mouse leave (50ms delay before reset)
- Disabled store links show a tooltip ("The game was removed from this store") — set `"disabled": true` in projects.json to hide a store icon
- Card image sizing uses an iterative `requestAnimationFrame` loop (up to 3 passes, max 400px) to match content height
- Mobile breakpoint is 768px — card image sizing and resize handling are skipped on mobile
- Firebase analytics tracks: portfolio_visit, click_social, click_project_link, view_project, open_media, navigate_lightbox, scroll thresholds (25/50/75/100%), click_cv_download, view_skills
