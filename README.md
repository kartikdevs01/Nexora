# Nexora

A static, responsive frontend for a premium global trends platform. It uses mock data only — no backend, auth, paid services, or AI.

## Run locally

Open `index.html` directly in a browser, or serve this folder with any local static-server extension/tool.

## Structure

- `index.html` — page structure and accessible UI markup
- `css/styles.css` — responsive design tokens, layout, themes, and component styles
- `js/data.js` — mock content; future RSS/API adapters should normalize data into this shape
- `js/app.js` — UI interactions, rendering, filtering, search, and theme controls

## Future data integration

Replace the arrays exposed by `window.NexoraData` in `js/data.js` with a fetch layer that returns the same normalized fields. `app.js` is intentionally isolated from source-specific logic.
