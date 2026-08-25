/**
 * Enviro-Sat API client.
 * Calls the FastAPI backend endpoints with automatic local/remote failover and timeout handling.
 */

const REMOTE_API_URL = 'https://enviro-sat-api.onrender.com';
const LOCAL_API_URL = 'http://localhost:8000';

const isLocalHost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname === ''
);

// Determine candidate URLs in priority order
const CANDIDATE_URLS = import.meta.env.VITE_API_URL
  ? [import.meta.env.VITE_API_URL]
  : isLocalHost
    ? [LOCAL_API_URL, REMOTE_API_URL]
    : [REMOTE_API_URL, LOCAL_API_URL];

/**
 * Robust fetch wrapper with timeout and fallback
 */
async function resilientFetch(endpoint, options = {}) {
  let lastError = null;

  for (const baseUrl of CANDIDATE_URLS) {
    try {
      const url = `${baseUrl}${endpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server responded with status ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        lastError = new Error('Inference request timed out (45s). The cloud server may be waking up from sleep.');
      } else {
        lastError = err;
      }
      // If we have another candidate URL, try it
    }
  }

  throw lastError || new Error('Failed to connect to Enviro-Sat API');
}

/**
 * POST /classify-region
 * @param {{ bbox: number[], date?: string, confidence_threshold?: number }} params
 * @returns {Promise<object>} GeoJSON FeatureCollection
 */
export async function classifyRegion({ bbox, date, confidence_threshold }) {
  return resilientFetch('/classify-region', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bbox, date, confidence_threshold }),
  });
}

/**
 * POST /detect-change
 * @param {{ bbox: number[], date_before?: string, date_after?: string, confidence_threshold?: number }} params
 * @returns {Promise<object>} GeoJSON FeatureCollection
 */
export async function detectChange({ bbox, date_before, date_after, confidence_threshold }) {
  return resilientFetch('/detect-change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bbox, date_before, date_after, confidence_threshold }),
  });
}

/**
 * GET /health
 * @returns {Promise<object>}
 */
export async function fetchHealth() {
  return resilientFetch('/health');
}

/**
 * GET /sample-regions
 * @returns {Promise<object>}
 */
export async function fetchSampleRegions() {
  return resilientFetch('/sample-regions');
}

