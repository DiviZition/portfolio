# AGENTS.md — Portfolio

## Commands
- `npm run dev` — start dev server (port 3000, auto-open)
- `npm run build` — production build → `dist/`
- `npm run preview` — preview production build locally
- CI: `npm ci` + `npm run build` (see `.github/workflows/deploy.yml`)

## Architecture
Vanilla JS + CSS SPA built with Vite. No framework, no tests, no lint/typecheck.

- **Entry:** `index.html` → `/src/main.js` (ES module)
- **Config imports:** JSON configs loaded via static `import ... with { type: 'json' }` (parallax.js, scene.js) or dynamic `await import()` (main.js). Firebase uses standard ESM import. Never use `require()` or `fetch()`.
- **Styles:** `src/css/style.css`
- **Backgrounds:** `src/js/parallax.js` — two fixed-position canvases (stars + terrain). Tweak the `CONFIG` object at the top of the file.
- **NPC scene:** `src/js/scene.js` — interactive characters on configurable tracks, spawns with chain/message interactions. Config via `config/scene.json`.
- **Static assets:** `public/assets/` → served as `assets/` at build time

## Data files (edit these to change displayed content)
All UI content is driven by JSON in `config/`:
- `profile.json` — name, bio, image, favicon, socials (array of `{platform, url}`), skills (`{title, items[]}`), cvPath
- `projects.json` — array of project cards. Sorted date-descending in `renderRoadmap()`. Each has: `id`, `name`, `shortDescription`, `image`, `date` (+ optional `endDate`), `company`, `links.stores[]`, `links.custom[]`, `downloads`, `details.fullDescription`, `details.techStack`, `details.team`, `details.media[]`
- `firebase.json` — Firebase config for analytics (`firebase/analytics`)
- `background.json` — parallax layers (`{image, offsetFromBottom, animated, speed, direction}`)
- `scene.json` — NPC scene (`{characters[], tracks[], spawn: {minIntervalMs, maxIntervalMs}, chainConfig, messageConfig, interactionWindow, replyCooldownMs}`)

## Content formatting
`formatText()` in main.js processes bold/italic/color in text fields:
- Bold: `**text**`
- Italic: `*text*` or `_text_`
- Color: `[#HEX]text[/color]` (e.g. `[#ff00aa]highlight[/color]`)

## Deployment
Push to `main` → GitHub Pages via `.github/workflows/deploy.yml`. Vite `base: '/portfolio/'` — deployment URL is `https://{user}.github.io/portfolio/`.

## Gotchas
- Video gallery auto-plays on hover (100ms debounce); pauses on leave (50ms delay before reset)
- `"disabled": true` on a store link hides it and shows a tooltip ("The game was removed from this store 😿")
- Card image sizing: iterative `requestAnimationFrame` loop (3 passes, max 400px) to match content height
- Mobile breakpoint is 768px — card image sizing and resize handling are skipped on mobile
- Scroll analytics thresholds: 25%, 50%, 75%, 95% (tracked as `scroll_bottom`, not `scroll_100`)
