import dns from 'node:dns/promises';
import net from 'node:net';

const PRIVATE_V4 = [
  /^10\./, /^127\./, /^169\.254\./, /^192\.168\./, /^0\./,
  /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) return PRIVATE_V4.some((re) => re.test(ip));
  const v6 = ip.toLowerCase();
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
}

/**
 * Requirement 1: accept a URL, validate it, verify it is reachable.
 * Returns { ok: true, url } or { ok: false, error }.
 */
export async function validateAndCheckUrl(input) {
  let raw = String(input || '').trim();
  if (!raw) return { ok: false, error: 'Enter a website address.' };
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: 'That does not look like a valid web address.' };
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, error: 'Only http and https addresses are supported.' };
  }
  if (!parsed.hostname.includes('.') && !net.isIP(parsed.hostname)) {
    return { ok: false, error: 'Enter a full domain name, such as example.com.' };
  }

  // SSRF guard: refuse private / loopback targets
  try {
    const addrs = await dns.lookup(parsed.hostname, { all: true });
    if (addrs.some((a) => isPrivateIp(a.address))) {
      return { ok: false, error: 'Private and local addresses cannot be scanned.' };
    }
  } catch {
    return { ok: false, error: 'We could not find that domain. Check the spelling.' };
  }

  // Reachability check
  try {
    const res = await fetch(parsed.href, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'WCAGCheckerBot/1.0' },
    });
    if (res.status >= 400) {
      return { ok: false, error: `The website responded with HTTP ${res.status}.` };
    }
  } catch {
    return { ok: false, error: 'The website did not respond within 10 seconds.' };
  }

  return { ok: true, url: parsed.href };
}
