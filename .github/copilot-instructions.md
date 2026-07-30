<!-- Copilot / AI agent instructions for contributors and automated coding agents -->

# Copilot Instructions — top_jeu

Purpose: give AI coding agents the minimal, high-value context needed to be productive in this repository.

- **Project type**: Single-page static website (no build tool). Entrypoint: `index.html`.
- **Main client script**: `app_v5.js` — large, monolithic JS file containing class-based managers (e.g. `CookieConsentManager`, `PopupManager`) and centralized registries such as `observerRegistry`.
- **Primary stylesheet**: `styles_v5.css` — global, opinionated CSS with responsive sections and utilities. Naming uses BEM-like classes (e.g. `.header__container`, `.cookie-consent-banner`).

Quick architecture / patterns to follow

- The site is static: dynamic behaviour is entirely in `app_v5.js`. Changes to UI normally require editing both `app_v5.js` and `styles_v5.css` together.
- JavaScript style: class + init pattern. Look for `.init()` calls inside constructors; most classes cache DOM nodes at construction and then attach event delegation on `document` rather than many individual listeners.
- Event handling: heavy use of event delegation (single `document.addEventListener('click', ...)`) and keyboard accessibility handling. Prefer the same delegation approach when adding features.
- State persistence: uses `localStorage` keys `cookieConsent` and `analyticsConsent` for consent state; analytics scripts are loaded dynamically based on consent.
- Analytics and integrations: Google Analytics (`gtag`) and Ahrefs are injected at runtime (`loadGoogleAnalytics`, `loadAhrefsAnalytics`). Respect the consent flow when modifying analytics code.

Key files to inspect for context/examples

- `index.html` — page structure and DOM IDs targeted by JS (look for `id`s like `cookie-banner`, `popup`, `popup-contact`).
- `app_v5.js` — central source of truth for behaviors. Examples:
  - Consent flow: search for `CookieConsentManager` and keys `cookieConsent` / `analyticsConsent`.
  - Popup behavior: `PopupManager` manages opening/closing modals and focuses.
  - Observer usage: `observerRegistry` holds scroll observers used by multiple features.
- `styles_v5.css` — global rules, responsive breakpoints, and focus management (`body.user-is-tabbing` pattern).
- `img/` — assets grouped into `banners/`, `favicons_pack/`, `logo-casinos/`.

Dev workflows and debugging commands (discoverable and tested)

- No build step. To serve locally use a static server. Recommended commands:
  - Python: `python3 -m http.server 8000` (from repo root) then open `http://localhost:8000`.
  - Node: `npx serve .`.
- Debugging analytics & consent locally:
  - Clear consent to re-open the banner: `localStorage.removeItem('cookieConsent'); localStorage.removeItem('analyticsConsent'); location.reload();`
  - To simulate granted analytics, set `localStorage.setItem('cookieConsent','accepted')` then reload.
- Use browser devtools to inspect dynamic script tags appended to `<head>` (e.g. googletag, ahrefs). The code adds scripts dynamically — changes here affect when/if analytics run.

Project-specific conventions

- Filenames include `_v5` (e.g. `app_v5.js`, `styles_v5.css`) — this repo keeps versioned frontend assets in-place rather than a build pipeline.
- Accessibility patterns: explicit focus handling via `body.user-is-tabbing` and keyboard activation checks (`Enter` or `' '` checks in `app_v5.js`). Follow the same checks when adding interactive elements.
- DOM-first edits: prefer updating `index.html` for markup, `styles_v5.css` for visuals, and `app_v5.js` for behavior. Avoid adding new inline scripts; keep logic inside `app_v5.js` unless adding small, isolated utilities.

What to avoid / be careful about

- Do not break the cookie/analytics consent flow. Analytics are conditionally loaded — changing the consent keys or `gtag` interactions will change compliance behavior.
- `app_v5.js` is monolithic: large refactors should be incremental (split into small modules or files but retain the same global initialization order to avoid race conditions).

If you change behavior

- Update `index.html` IDs/classes if you refactor DOM targets and then update `app_v5.js` accordingly. Search for string literals of IDs (e.g. `getElementById('cookie-banner')`) before renaming.

When in doubt, look here first

- `app_v5.js` — behavioural source; search for class names and `localStorage` keys.
- `styles_v5.css` — visual rules and responsive media queries.

Feedback

- If any section is unclear or a pattern above is incomplete, tell me which area (JS, CSS, assets, analytics) and I will update this file with concrete examples or small edits.
