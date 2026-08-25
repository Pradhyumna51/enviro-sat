import { useState, useCallback, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import './App.css';

import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import { useClassify } from './hooks/useClassify';
import { injectHatchPattern } from './utils/patterns';

/**
 * Root application — wires sidebar controls ↔ map ↔ API.
 */
export default function App() {
  const [mode, setMode] = useState('classify');
  const [bbox, setBbox] = useState(null);
  const [flyBounds, setFlyBounds] = useState(null);
  const { data, loading, error, runClassify, runChange, clear } = useClassify();

  useEffect(() => {
    injectHatchPattern();
  }, []);

  // Clear results when mode changes
  useEffect(() => {
    clear();
  }, [mode, clear]);

  const handleBboxDrawn = useCallback((newBbox) => {
    setBbox(newBbox);
  }, []);

  const handleFlyTo = useCallback((bounds) => {
    setFlyBounds(bounds);
  }, []);

  const handleAnalyze = useCallback((params) => {
    if (mode === 'classify') {
      runClassify(params);
    } else {
      runChange(params);
    }
  }, [mode, runClassify, runChange]);

  return (
    <div className="app">
      <Sidebar
        mode={mode}
        setMode={setMode}
        bbox={bbox}
        setBbox={setBbox}
        onAnalyze={handleAnalyze}
        loading={loading}
        error={error}
        data={data}
        onFlyTo={handleFlyTo}
      />
      <MapView
        geojsonData={data}
        mode={mode}
        flyBounds={flyBounds}
        onBboxDrawn={handleBboxDrawn}
      />
    </div>
  );
}
