# Access Check – WCAG scanner

React (Vite) + Express + Playwright + axe-core + SQLite.

## Setup
```bash
npm run install:all          # installs both apps and the Chromium browser for Playwright
npm run dev:server           # terminal 1 → http://localhost:4000
npm run dev:client           # terminal 2 → http://localhost:5173
```

## API
| Method | Path | Purpose |
|---|---|---|
| POST | /api/scans `{url}` | Validate URL, start scan → `{scanId}` |
| GET | /api/scans/:id | Scan status (pending/running/completed/failed) |
| GET | /api/scans/:id/summary | Verdict, total / unique / screen-reader counts, by severity & type |
| GET | /api/scans/:id/violations?severity=&type=&screenReader=true | Detailed violations |
| GET | /api/scans | Recent scans |
| GET | /api/websites/:id/scans | Scan history for a website |


 Access Check – WCAG scanner

React (Vite) + Express + Playwright + axe-core + SQLite.

## Setup
```bash
npm run install:all          # installs both apps and the Chromium browser for Playwright
npm run dev:server           # terminal 1 → http://localhost:4000
npm run dev:client           # terminal 2 → http://localhost:5173
```

## API
| Method | Path | Purpose |
|---|---|---|
| POST | /api/scans `{url}` | Validate URL, start scan → `{scanId}` |
| GET | /api/scans/:id | Scan status (pending/running/completed/failed) |
| GET | /api/scans/:id/summary | Verdict, total / unique / screen-reader counts, by severity & type |
| GET | /api/scans/:id/violations?severity=&type=&screenReader=true | Detailed violations |
| GET | /api/scans | Recent scans |
| GET | /api/websites/:id/scans | Scan history for a website |

## Author
Sidharath Khanna, [LinkedIn](https://www.linkedin.com/in/sidharathkhanna29/) | [GitHub](https://github.com/sidharathkhanna29)
