# AGENTS.md — Portfolio

## Commands
- `npm run dev` — start dev server (port 3000)
- `npm run build` — production build → `dist/`
- `npm run preview` — preview production build locally

## Architecture
Single-page vanilla JS + CSS app built with Vite. No framework, no tests, no lint/typecheck.

- **Entry:** `index.html` → `/src/main.js` (ES module)
- **Styles:** `src/css/style.css`
- **Data:** all content is driven by JSON configs — edit these to change displayed content:
  - `config/profile.json` — name, bio, photo, social links, favicon
  - `config/projects.json` — project cards (roadmap), each with media, tech stack, team, store links
- **Static assets:** `public/assets/` (project screenshots, icons, videos)

## Content formatting
In `projects.json`, the `fullDescription` field supports a custom syntax:
- Bold: `**text**`
- Italic: `*text*` or `_text_`
- Colored text: `{{#HEXCOLOR}}text{{/color}}` (e.g. `{{#ff00aa}}highlight{{/color}}`)

## Deployment
CI in `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on push to `main`.
Vite base path is `/portfolio/` — the repo name matters for deployment URL.

## Gotchas
- Project cards sort by date descending (newest first) in `renderRoadmap()`
- Media gallery videos auto-play on hover with a 100ms debounce; pause on mouse leave
- Disabled store links show a tooltip ("The game was removed from this store") — set `"disabled": true` in projects.json to hide a store icon
- Card image sizing uses an iterative `requestAnimationFrame` loop (up to 3 passes) to match content height
