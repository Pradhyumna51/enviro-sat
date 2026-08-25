import { useState, useCallback } from 'react';
import { classifyRegion, detectChange } from '../api/client';

/**
 * Hook managing API calls, loading state, error handling, and result caching.
 */
export function useClassify() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runClassify = useCallback(async ({ bbox, date, confidence_threshold }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await classifyRegion({ bbox, date, confidence_threshold });
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const runChange = useCallback(async ({ bbox, date_before, date_after, confidence_threshold }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await detectChange({ bbox, date_before, date_after, confidence_threshold });
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, runClassify, runChange, clear };
}
