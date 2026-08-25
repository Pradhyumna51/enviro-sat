import { useState, useEffect } from 'react';
import { fetchSampleRegions } from '../api/client';
import Legend from './Legend';
import StatsPanel from './StatsPanel';
import './Sidebar.css';

/**
 * Sidebar — mode toggle, region selector, date/confidence inputs, analyze button, legend, stats.
 */
export default function Sidebar({
  mode, setMode,
  bbox, setBbox,
  onAnalyze,
  loading, error,
  data,
  onFlyTo,
}) {
  const [regions, setRegions] = useState({});
  const [selectedRegion, setSelectedRegion] = useState('');
  const [date, setDate] = useState('2026-06-01');
  const [dateBefore, setDateBefore] = useState('2024-06-01');
  const [dateAfter, setDateAfter] = useState('2026-06-01');
  const [confidence, setConfidence] = useState(0.70);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetchSampleRegions()
      .then(setRegions)
      .catch(() => {
        // Fallback built-in regions if API unavailable
        setRegions({
          munich_urban_fringe: {
            name: 'Munich Urban Fringe (Germany)',
            bbox: [11.45, 48.10, 11.65, 48.25],
          },
          rhine_valley: {
            name: 'Rhine Valley Farmland (France/Germany)',
            bbox: [7.60, 48.45, 7.80, 48.60],
          },
        });
      });
  }, []);

  const handleRegionSelect = (key) => {
    setSelectedRegion(key);
    if (regions[key]) {
      const b = regions[key].bbox;
      setBbox(b);
      // Fly to region
      onFlyTo([[b[1], b[0]], [b[3], b[2]]]);
    }
  };

  const handleAnalyze = () => {
    if (!bbox || bbox.length !== 4) return;
    if (mode === 'classify') {
      onAnalyze({ bbox, date, confidence_threshold: confidence });
    } else {
      onAnalyze({ bbox, date_before: dateBefore, date_after: dateAfter, confidence_threshold: confidence });
    }
  };

  const bboxLabel = bbox
    ? `${bbox[0].toFixed(2)}, ${bbox[1].toFixed(2)} → ${bbox[2].toFixed(2)}, ${bbox[3].toFixed(2)}`
    : 'Draw on map or select a region';

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <button
        className="sidebar__toggle"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {!collapsed && (
        <div className="sidebar__inner">
          {/* Header */}
          <div className="sidebar__header">
            <div className="sidebar__logo">
              <span className="sidebar__logo-icon">🛰️</span>
              <div>
                <h1 className="sidebar__title">Enviro-Sat</h1>
                <p className="sidebar__subtitle">Satellite Land-Use Monitor</p>
              </div>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="sidebar__section">
            <label className="sidebar__label">Analysis Mode</label>
            <div className="sidebar__mode-toggle">
              <button
                className={`sidebar__mode-btn ${mode === 'classify' ? 'sidebar__mode-btn--active' : ''}`}
                onClick={() => setMode('classify')}
              >
                🗺️ Classify
              </button>
              <button
                className={`sidebar__mode-btn ${mode === 'change' ? 'sidebar__mode-btn--active' : ''}`}
                onClick={() => setMode('change')}
              >
                🔄 Change
              </button>
            </div>
          </div>

          {/* Region selector */}
          <div className="sidebar__section">
            <label className="sidebar__label">Sample Region</label>
            <select
              className="sidebar__select"
              value={selectedRegion}
              onChange={(e) => handleRegionSelect(e.target.value)}
            >
              <option value="">— Select a region —</option>
              {Object.entries(regions).map(([key, region]) => (
                <option key={key} value={key}>{region.name}</option>
              ))}
            </select>
          </div>

          {/* Bbox display */}
          <div className="sidebar__section">
            <label className="sidebar__label">Bounding Box</label>
            <div className="sidebar__bbox">{bboxLabel}</div>
          </div>

          {/* Date inputs */}
          <div className="sidebar__section">
            {mode === 'classify' ? (
              <>
                <label className="sidebar__label">Date</label>
                <input
                  type="date"
                  className="sidebar__input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </>
            ) : (
              <>
                <label className="sidebar__label">Date Before</label>
                <input
                  type="date"
                  className="sidebar__input"
                  value={dateBefore}
                  onChange={(e) => setDateBefore(e.target.value)}
                />
                <label className="sidebar__label" style={{ marginTop: '0.5rem' }}>Date After</label>
                <input
                  type="date"
                  className="sidebar__input"
                  value={dateAfter}
                  onChange={(e) => setDateAfter(e.target.value)}
                />
              </>
            )}
          </div>

          {/* Confidence slider */}
          <div className="sidebar__section">
            <label className="sidebar__label">
              Confidence Threshold: <strong>{(confidence * 100).toFixed(0)}%</strong>
            </label>
            <input
              type="range"
              className="sidebar__slider"
              min="0.50"
              max="0.95"
              step="0.05"
              value={confidence}
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
            />
            <div className="sidebar__slider-labels">
              <span>50%</span>
              <span>95%</span>
            </div>
          </div>

          {/* Analyze button */}
          <button
            className={`sidebar__analyze-btn ${loading ? 'sidebar__analyze-btn--loading' : ''}`}
            onClick={handleAnalyze}
            disabled={loading || !bbox}
          >
            {loading ? (
              <span className="sidebar__spinner" />
            ) : (
              mode === 'classify' ? '🔍  Analyze Region' : '🔄  Detect Changes'
            )}
          </button>

          {/* Error */}
          {error && <div className="sidebar__error">{error}</div>}

          {/* Legend */}
          <Legend mode={mode} />

          {/* Stats */}
          <StatsPanel data={data} mode={mode} />
        </div>
      )}
    </aside>
  );
}
