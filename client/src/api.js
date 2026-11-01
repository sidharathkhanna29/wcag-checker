async function request(path, options) {
  const res = await fetch(path, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export const startScan = (url) =>
  request('/api/scans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
export const getScan = (id) => request(`/api/scans/${id}`);
export const getSummary = (id) => request(`/api/scans/${id}/summary`);
export const getViolations = (id) => request(`/api/scans/${id}/violations`);
export const getRecentScans = () => request('/api/scans');
