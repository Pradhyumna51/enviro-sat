/**
 * Enviro-Sat API client.
 * Calls the FastAPI backend endpoints; base URL configurable via VITE_API_URL.
 */

const DEFAULT_API_URL = 'https://enviro-sat-api.onrender.com';
const BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8000' : DEFAULT_API_URL);

/**
 * POST /classify-region
 * @param {{ bbox: number[], date?: string, confidence_threshold?: number }} params
 * @returns {Promise<object>} GeoJSON FeatureCollection
 */
export async function classifyRegion({ bbox, date, confidence_threshold }) {
  const res = await fetch(`${BASE_URL}/classify-region`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bbox, date, confidence_threshold }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

/**
 * POST /detect-change
 * @param {{ bbox: number[], date_before?: string, date_after?: string, confidence_threshold?: number }} params
 * @returns {Promise<object>} GeoJSON FeatureCollection
 */
export async function detectChange({ bbox, date_before, date_after, confidence_threshold }) {
  const res = await fetch(`${BASE_URL}/detect-change`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bbox, date_before, date_after, confidence_threshold }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

/**
 * GET /health
 * @returns {Promise<object>}
 */
export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

/**
 * GET /sample-regions
 * @returns {Promise<object>}
 */
export async function fetchSampleRegions() {
  const res = await fetch(`${BASE_URL}/sample-regions`);
  if (!res.ok) throw new Error(`Failed to fetch sample regions: ${res.status}`);
  return res.json();
}
