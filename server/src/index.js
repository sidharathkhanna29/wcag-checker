import express from 'express';
import cors from 'cors';
import db from './db.js';
import { validateAndCheckUrl } from './validateUrl.js';
import { scanUrl } from './scanner.js';
import { classify, computeCounts } from './classify.js';

const app = express();
app.use(cors());
app.use(express.json());

// ---- background scan job ----
async function processScan(scanId, url) {
  db.prepare(`UPDATE scans SET status='running' WHERE id=?`).run(scanId);
  try {
    const classified = classify(await scanUrl(url));
    const counts = computeCounts(classified);
    const insert = db.prepare(`
      INSERT INTO violations (scan_id, rule_id, type, severity, wcag_criteria, wcag_level,
        is_screen_reader, description, help, help_url, node_count, nodes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    db.transaction(() => {
      for (const v of classified) {
        insert.run(scanId, v.rule_id, v.type, v.severity, JSON.stringify(v.wcag_criteria),
          v.wcag_level, v.is_screen_reader ? 1 : 0, v.description, v.help, v.help_url,
          v.node_count, JSON.stringify(v.nodes));
      }
      db.prepare(`UPDATE scans SET status='completed', total_violations=?, unique_violations=?,
        screen_reader_violations=?, completed_at=datetime('now') WHERE id=?`)
        .run(counts.total, counts.unique, counts.screenReader, scanId);
    })();
  } catch (err) {
    db.prepare(`UPDATE scans SET status='failed', error=?, completed_at=datetime('now') WHERE id=?`)
      .run(String(err.message).slice(0, 500), scanId);
  }
}

const scanRow = `SELECT s.*, w.url FROM scans s JOIN websites w ON w.id = s.website_id`;

// ---- Requirement 5: REST API ----

// Start a scan
app.post('/api/scans', async (req, res) => {
  const check = await validateAndCheckUrl(req.body?.url);
  if (!check.ok) return res.status(400).json({ error: check.error });

  db.prepare('INSERT OR IGNORE INTO websites (url) VALUES (?)').run(check.url);
  const site = db.prepare('SELECT id FROM websites WHERE url=?').get(check.url);
  const { lastInsertRowid } = db.prepare('INSERT INTO scans (website_id) VALUES (?)').run(site.id);

  processScan(lastInsertRowid, check.url); // fire and forget
  res.status(202).json({ scanId: lastInsertRowid, status: 'pending' });
});

// Scan status
app.get('/api/scans/:id', (req, res) => {
  const scan = db.prepare(`${scanRow} WHERE s.id=?`).get(req.params.id);
  if (!scan) return res.status(404).json({ error: 'Scan not found.' });
  res.json(scan);
});

// Summary + counts
app.get('/api/scans/:id/summary', (req, res) => {
  const scan = db.prepare(`${scanRow} WHERE s.id=?`).get(req.params.id);
  if (!scan) return res.status(404).json({ error: 'Scan not found.' });
  if (scan.status !== 'completed') return res.status(409).json({ error: `Scan is ${scan.status}.`, status: scan.status });
  const group = (col) => Object.fromEntries(
    db.prepare(`SELECT ${col} k, SUM(node_count) n FROM violations WHERE scan_id=? GROUP BY ${col}`)
      .all(scan.id).map((r) => [r.k, r.n]));
  res.json({
    scanId: scan.id,
    url: scan.url,
    compliant: scan.total_violations === 0,
    counts: {
      total: scan.total_violations,
      unique: scan.unique_violations,
      screenReader: scan.screen_reader_violations,
    },
    bySeverity: group('severity'),
    byType: group('type'),
    completedAt: scan.completed_at,
  });
});

// Detailed violations (filter: ?severity=&type=&screenReader=true)
app.get('/api/scans/:id/violations', (req, res) => {
  const { severity, type, screenReader } = req.query;
  let sql = 'SELECT * FROM violations WHERE scan_id=?';
  const args = [req.params.id];
  if (severity) { sql += ' AND severity=?'; args.push(severity); }
  if (type) { sql += ' AND type=?'; args.push(type); }
  if (screenReader === 'true') sql += ' AND is_screen_reader=1';
  sql += ` ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'serious' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END`;
  const rows = db.prepare(sql).all(...args).map((r) => ({
    ...r,
    is_screen_reader: !!r.is_screen_reader,
    wcag_criteria: JSON.parse(r.wcag_criteria),
    nodes: JSON.parse(r.nodes),
  }));
  res.json(rows);
});

// Scan history for one website, or recent scans overall
app.get('/api/scans', (req, res) => {
  res.json(db.prepare(`${scanRow} ORDER BY s.id DESC LIMIT 20`).all());
});
app.get('/api/websites/:id/scans', (req, res) => {
  res.json(db.prepare(`${scanRow} WHERE w.id=? ORDER BY s.id DESC`).all(req.params.id));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
