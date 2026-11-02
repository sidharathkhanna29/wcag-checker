# Access Check – WCAG scanner

A web app that scans any public web page against WCAG 2.2 (A and AA) rules
and reports accessibility violations, including those that affect screen reader users.

## Features
- Validates a URL and confirms the site is reachable
- Renders the page in a real browser (Chromium) so dynamic content is scanned
- Detects WCAG violations using axe-core
- Classifies each violation by type, severity and WCAG criterion
- Reports total, unique and screen reader violation counts
- Stores websites, scan history and violations in a database
- REST API for scan status, summaries and detailed reports

## Tech stack
| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Scanning | Playwright, axe-core |
| Database | SQLite (better-sqlite3) |

## How it works
```
Browser (React) --POST url--> Express API --> validate URL
      ^                            |--> save scan (pending), return scanId
      |                            '--> background: Chromium loads page
 poll status every 2s                    --> axe-core finds violations
      |                                  --> classify and count
      '--- GET summary/violations <---- save to database, mark completed
```

## Getting started

### Prerequisites
- Node.js 20 or 22 (LTS)
- macOS, Linux or Windows

### Install
```bash
git clone https://github.com/<your-username>/wcag-checker.git
cd wcag-checker
npm run install:all
```

### Run
```bash
npm run dev:server   # terminal 1: API on http://localhost:4000
npm run dev:client   # terminal 2: app on http://localhost:5173
```

### Troubleshooting
- `command not found: node`: install Node.js from nodejs.org and reopen your terminal.
- `better-sqlite3` build errors: use an LTS Node version; on macOS run `xcode-select --install`.

## API
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/scans` | Start a scan. Body: `{ "url": "example.com" }` |
| GET | `/api/scans/:id` | Scan status |
| GET | `/api/scans/:id/summary` | Verdict and violation counts |
| GET | `/api/scans/:id/violations` | Detailed violations (`?severity=`, `?type=`, `?screenReader=true`) |
| GET | `/api/scans` | Recent scans |
| GET | `/api/websites/:id/scans` | Scan history for a website |

## Project structure
```
server/src/
  index.js        Express routes and background scan job
  validateUrl.js  URL validation, reachability and SSRF protection
  scanner.js      Playwright + axe-core scan
  classify.js     Severity, WCAG criteria and counts
  db.js           SQLite schema
client/src/
  App.jsx         Main UI
  api.js          API calls
```

## Limitations
Automated tools detect only a portion of accessibility issues. A result of
"no violations found" is not proof of WCAG conformance. Manual keyboard and
screen reader testing is still required. Only the landing page is scanned.

## Author
[Sidharath Khanana](https://sidharathkhanna29.github.io/)  [LinkedIn](https://www.linkedin.com/in/sidharathkhanna29/) | [GitHub](https://github.com/sidharathkhanna29)

