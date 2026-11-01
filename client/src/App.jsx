import { useEffect, useRef, useState } from 'react';
import { startScan, getScan, getSummary, getViolations, getRecentScans } from './api.js';

const SEVERITIES = ['critical', 'serious', 'moderate', 'minor'];

export default function App() {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | scanning | done | error
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState(null);
  const [violations, setViolations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [recent, setRecent] = useState([]);
  const timer = useRef(null);

  useEffect(() => {
    getRecentScans().then(setRecent).catch(() => {});
    return () => clearTimeout(timer.current);
  }, [phase]);

  async function loadResults(id) {
    const [s, v] = await Promise.all([getSummary(id), getViolations(id)]);
    setSummary(s);
    setViolations(v);
    setPhase('done');
  }

  function poll(id) {
    timer.current = setTimeout(async () => {
      try {
        const scan = await getScan(id);
        if (scan.status === 'completed') return loadResults(id);
        if (scan.status === 'failed') {
          setMessage(scan.error || 'The scan failed.');
          return setPhase('error');
        }
        poll(id);
      } catch (e) {
        setMessage(e.message);
        setPhase('error');
      }
    }, 2000);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setPhase('scanning');
    setMessage('Checking the address and loading the page…');
    setSummary(null);
    setViolations([]);
    setFilter('all');
    try {
      const { scanId } = await startScan(url);
      setMessage('Scanning for accessibility issues. This usually takes 10–30 seconds.');
      poll(scanId);
    } catch (err) {
      setMessage(err.message);
      setPhase('error');
    }
  }

  const shown = violations.filter((v) =>
    filter === 'all' ? true : filter === 'screen-reader' ? v.is_screen_reader : v.severity === filter);

  return (
    <>
      <a className="skip" href="#results">Skip to results</a>
      <header className="masthead">
        <h1>Access Check</h1>
        <p>Scan any public web page against WCAG 2.2 (A and AA) rules.</p>
        <form onSubmit={onSubmit} className="scan-form">
          <label htmlFor="url">Website address</label>
          <div className="row">
            <input id="url" type="text" inputMode="url" placeholder="example.com"
              value={url} onChange={(e) => setUrl(e.target.value)} required
              aria-describedby="url-help" />
            <button type="submit" disabled={phase === 'scanning'}>
              {phase === 'scanning' ? 'Scanning…' : 'Scan website'}
            </button>
          </div>
          <p id="url-help" className="hint">We load the page in a real browser, so scripts and dynamic content are included.</p>
        </form>
      </header>

      <main id="results" tabIndex={-1}>
        <div role="status" aria-live="polite" className={`status ${phase}`}>
          {(phase === 'scanning' || phase === 'error') && message}
        </div>

        {phase === 'done' && summary && (
          <>
            <section className={`verdict ${summary.compliant ? 'pass' : 'fail'}`} aria-labelledby="verdict-h">
              <h2 id="verdict-h">
                {summary.compliant ? 'No automated violations found' : 'Accessibility violations found'}
              </h2>
              <p className="url">{summary.url}</p>
              <dl className="counts">
                <div><dt>Total violations</dt><dd>{summary.counts.total}</dd></div>
                <div><dt>Unique rules broken</dt><dd>{summary.counts.unique}</dd></div>
                <div><dt>Screen reader violations</dt><dd>{summary.counts.screenReader}</dd></div>
              </dl>
              <p className="caveat">
                Automated tools detect roughly a third of WCAG issues. A clean result is a good sign, not proof of
                full conformance – manual keyboard and screen reader testing is still needed.
              </p>
            </section>

            {violations.length > 0 && (
              <section aria-labelledby="list-h">
                <h2 id="list-h">Violations</h2>
                <div className="filters" role="group" aria-label="Filter violations">
                  {['all', ...SEVERITIES, 'screen-reader'].map((f) => (
                    <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                      {f === 'all' ? 'All' : f === 'screen-reader' ? 'Screen reader' : f}
                      {f !== 'all' && f !== 'screen-reader' && summary.bySeverity[f] ? ` (${summary.bySeverity[f]})` : ''}
                    </button>
                  ))}
                </div>
                <ul className="violations">
                  {shown.map((v) => (
                    <li key={v.id} className={`sev-${v.severity}`}>
                      <details>
                        <summary>
                          <span className="badge">{v.severity}</span>
                          <span className="title">{v.help}</span>
                          <span className="meta">
                            {v.node_count} element{v.node_count === 1 ? '' : 's'}
                            {v.wcag_criteria.length > 0 && ` · WCAG ${v.wcag_criteria.join(', ')}`}
                            {v.wcag_level && ` (${v.wcag_level})`}
                            {v.is_screen_reader && ' · screen reader'}
                          </span>
                        </summary>
                        <p>{v.description}</p>
                        <p><a href={v.help_url} target="_blank" rel="noreferrer">How to fix this (opens in a new tab)</a></p>
                        <ol className="nodes">
                          {v.nodes.slice(0, 5).map((n, i) => (
                            <li key={i}><code>{n.html}</code></li>
                          ))}
                        </ol>
                      </details>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {recent.length > 0 && (
          <section aria-labelledby="hist-h" className="history">
            <h2 id="hist-h">Recent scans</h2>
            <table>
              <thead><tr><th>Website</th><th>Status</th><th>Violations</th><th>Started</th></tr></thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id}>
                    <td>{s.url}</td><td>{s.status}</td>
                    <td>{s.total_violations ?? '–'}</td><td>{s.started_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </>
  );
}
