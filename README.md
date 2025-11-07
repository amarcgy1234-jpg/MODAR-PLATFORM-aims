# Modar Frontend Updates (Nov 2025)

This README summarizes the site-wide styling, About page rebuild, analytics tables, toolbar enhancements, and login UX improvements.

## What changed
- Global CSS: responsive layout helpers, typography scale, toolbar (chevrons + tooltips), KPI cards, About hero/mission/vision, team grid, table polish.
- Home (index.html): top filter toolbar; added bottom "Occupancy Notes" summary table; keeps existing charts and summary tables.
- Analytics (analytics.html): top filter toolbar; KPI row; revenue + occupancy charts area with compact explanatory table beneath; mirrored occupancy notes table at bottom.
- About (about.html): hero section, mission/vision cards, 4-member team grid using exact filenames: Muhammed, Ammar, Abdulkarim, Assel.
- JS:
  - home-charts.js: populate occupancy notes table from occupancy trend series.
  - dashboard.js: fill analytics summary table beneath charts and the mirrored occupancy notes on Analytics page.
  - app.js: already present; now included on pages to enable shared behaviors and active nav.
- Auth guard: analytics.html retains early guard; include.js guards internal pages. login.js validates, remembers last username, and redirects after success.

## Where to edit content
- About page text: `about.html` inside `.about-hero` and `.mv-grid` sections.
- Team members: `about.html` in the `.team-grid` section. Images must keep exact filenames in `assets/img/svg/`.
- Palette and spacing: `assets/css/style.css` root variables and new utility sections (toolbar, kpi, about, team, table).
- Tooltips/chevrons: `assets/css/style.css` under the `/* Top toolbar (filters) */` block.
- Home charts/tables data: `assets/data/dashboard.mock.json` (same schema used by analytics).
- Analytics summary/notes filling: `assets/js/dashboard.js` in `bindCharts` function.
- Home occupancy notes filling: `assets/js/home-charts.js` via `fillOccNotes`.

## Accessibility & RTL
- `dir="rtl"` preserved on pages.
- ARIA roles and labels added to toolbars, KPI row, and sections.
- Focus rings on inputs/selects via CSS. Numeric tables use tabular-nums.

## Login flow
- Validation: email format + min length 8 for password.
- Inline messages: `#err-email`, `#err-password`, `#alert`.
- Remember username: localStorage key `modar-last-username`.
- Client-side guard: `include.js` prevents access to internal pages without `modar-auth`. `analytics.html` also has an early guard to avoid flashes.

## Notes
- Header/footer markup not changed; only additional scripts included.
- Assets paths unchanged; image filenames preserved.
- Tested on latest Chrome/Edge; ensure no console errors from missing files. If you remove `assets/data/dashboard.mock.json`, charts may warn.

## Data loading & switching to a real API
- Dashboard mock data lives at `assets/data/dashboard.mock.json`.
- Loaded by `assets/js/dashboard.js` via `loadDashboardData()` which binds:
  - KPIs (`bindKPIs`), recent activity and top users tables (`bindTables`), and charts (`bindCharts`).
  - It dispatches `window.dispatchEvent(new CustomEvent('modar:dataReady', { detail: { activity, users } }))` consumed by `assets/js/analytics-charts.js`.
- To switch to production:
  1) Replace the `fetch('assets/data/dashboard.mock.json')` call in `dashboard.js` with your API endpoint returning the same shape.
  2) Keep dispatching `modar:dataReady` with `{ activity:[], users:[] }` so bottom charts initialize consistently.
  3) If your API uses different keys, adapt `bindKPIs`, `bindTables`, and `bindCharts` mapping as needed.
