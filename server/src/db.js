import Database from 'better-sqlite3';

const db = new Database(process.env.DB_FILE || 'wcag.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Requirement 4: websites, scan history, scan status, individual violations
db.exec(`
CREATE TABLE IF NOT EXISTS websites (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  url        TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scans (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  website_id               INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  status                   TEXT NOT NULL DEFAULT 'pending', -- pending | running | completed | failed
  error                    TEXT,
  total_violations         INTEGER,
  unique_violations        INTEGER,
  screen_reader_violations INTEGER,
  started_at               TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at             TEXT
);

CREATE TABLE IF NOT EXISTS violations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id           INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  rule_id           TEXT NOT NULL,
  type              TEXT NOT NULL,
  severity          TEXT NOT NULL,   -- minor | moderate | serious | critical
  wcag_criteria     TEXT NOT NULL,   -- JSON array, e.g. ["1.1.1"]
  wcag_level        TEXT,            -- A | AA
  is_screen_reader  INTEGER NOT NULL DEFAULT 0,
  description       TEXT,
  help              TEXT,
  help_url          TEXT,
  node_count        INTEGER NOT NULL,
  nodes             TEXT NOT NULL    -- JSON array of {html, target, summary}
);
CREATE INDEX IF NOT EXISTS idx_violations_scan ON violations(scan_id);
CREATE INDEX IF NOT EXISTS idx_scans_website  ON scans(website_id);
`);

export default db;
