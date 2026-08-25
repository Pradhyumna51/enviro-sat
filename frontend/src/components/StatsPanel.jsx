import { CLASS_COLORS, CHANGE_COLORS } from '../utils/colors';
import './StatsPanel.css';

/**
 * Summary statistics panel with CSS bar charts.
 * Classify mode: class distribution. Change mode: transition summary.
 */
export default function StatsPanel({ data, mode }) {
  if (!data || !data.metadata) return null;

  const meta = data.metadata;

  if (mode === 'change') {
    const summary = meta.transition_summary || {};
    const entries = Object.entries(summary).sort(([, a], [, b]) => b - a);
    const maxVal = Math.max(...entries.map(([, v]) => v), 1);

    return (
      <div className="stats-panel">
        <h4 className="stats-panel__title">Change Summary</h4>
        <div className="stats-panel__metrics">
          <div className="stats-panel__metric">
            <span className="stats-panel__metric-value">{meta.changed_tiles_count}</span>
            <span className="stats-panel__metric-label">Changed</span>
          </div>
          <div className="stats-panel__metric">
            <span className="stats-panel__metric-value">{meta.change_rate_percent}%</span>
            <span className="stats-panel__metric-label">Rate</span>
          </div>
          <div className="stats-panel__metric">
            <span className="stats-panel__metric-value">{meta.total_tiles}</span>
            <span className="stats-panel__metric-label">Total Tiles</span>
          </div>
        </div>
        {entries.length > 0 && (
          <div className="stats-panel__bars">
            {entries.map(([type, count]) => (
              <div key={type} className="stats-panel__bar-row">
                <span className="stats-panel__bar-label">{type}</span>
                <div className="stats-panel__bar-track">
                  <div
                    className="stats-panel__bar-fill"
                    style={{
                      width: `${(count / maxVal) * 100}%`,
                      backgroundColor: CHANGE_COLORS[type] || '#8b5cf6',
                    }}
                  />
                </div>
                <span className="stats-panel__bar-value">{count}</span>
              </div>
            ))}
          </div>
        )}
        <div className="stats-panel__footer">
          Processed in {meta.processing_time_ms}ms
        </div>
      </div>
    );
  }

  // Classify mode
  const dist = meta.class_distribution || {};
  const entries = Object.entries(dist).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="stats-panel">
      <h4 className="stats-panel__title">Classification Summary</h4>
      <div className="stats-panel__metrics">
        <div className="stats-panel__metric">
          <span className="stats-panel__metric-value">{meta.total_tiles}</span>
          <span className="stats-panel__metric-label">Tiles</span>
        </div>
        <div className="stats-panel__metric">
          <span className="stats-panel__metric-value">{meta.tiles_needing_review}</span>
          <span className="stats-panel__metric-label">Review</span>
        </div>
        <div className="stats-panel__metric">
          <span className="stats-panel__metric-value">{meta.review_rate_percent}%</span>
          <span className="stats-panel__metric-label">Low Conf.</span>
        </div>
      </div>
      {entries.length > 0 && (
        <div className="stats-panel__bars">
          {entries.map(([cls, count]) => (
            <div key={cls} className="stats-panel__bar-row">
              <span className="stats-panel__bar-label">{cls}</span>
              <div className="stats-panel__bar-track">
                <div
                  className="stats-panel__bar-fill"
                  style={{
                    width: `${(count / maxVal) * 100}%`,
                    backgroundColor: CLASS_COLORS[cls] || '#94a3b8',
                  }}
                />
              </div>
              <span className="stats-panel__bar-value">{count}</span>
            </div>
          ))}
        </div>
      )}
      <div className="stats-panel__footer">
        Processed in {meta.processing_time_ms}ms
      </div>
    </div>
  );
}
