import './TilePopup.css';

/**
 * Popup content for a clicked tile.
 * Shows classification details (classify mode) or before/after transition (change mode).
 */
export default function TilePopup({ feature, mode }) {
  const p = feature.properties;

  if (mode === 'change') {
    return (
      <div className="tile-popup">
        <div className="tile-popup__header">
          <span className="tile-popup__id">{p.tile_id}</span>
          {p.is_changed && <span className="tile-popup__badge tile-popup__badge--change">Changed</span>}
          {p.needs_review && <span className="tile-popup__badge tile-popup__badge--review">Review</span>}
        </div>
        <div className="tile-popup__transition">
          <div className="tile-popup__label-pair">
            <div className="tile-popup__before">
              <span className="tile-popup__label-tag">Before</span>
              <span className="tile-popup__class">{p.class_before}</span>
              <span className="tile-popup__conf">{(p.confidence_before * 100).toFixed(1)}%</span>
            </div>
            <span className="tile-popup__arrow">→</span>
            <div className="tile-popup__after">
              <span className="tile-popup__label-tag">After</span>
              <span className="tile-popup__class">{p.class_after}</span>
              <span className="tile-popup__conf">{(p.confidence_after * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
        <div className="tile-popup__type">
          <span className="tile-popup__type-label">Transition:</span>
          <span className="tile-popup__type-value">{p.change_type}</span>
        </div>
      </div>
    );
  }

  // Classify mode
  const topProbs = p.class_probabilities
    ? Object.entries(p.class_probabilities)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    : [];

  return (
    <div className="tile-popup">
      <div className="tile-popup__header">
        <span className="tile-popup__id">{p.tile_id}</span>
        {p.needs_review && <span className="tile-popup__badge tile-popup__badge--review">Review</span>}
      </div>
      <div className="tile-popup__main">
        <span className="tile-popup__predicted">{p.predicted_class}</span>
        <span className="tile-popup__conf-large">{(p.confidence * 100).toFixed(1)}%</span>
      </div>
      {topProbs.length > 0 && (
        <div className="tile-popup__probs">
          <span className="tile-popup__probs-title">Top Predictions</span>
          {topProbs.map(([cls, prob]) => (
            <div key={cls} className="tile-popup__prob-row">
              <span className="tile-popup__prob-class">{cls}</span>
              <div className="tile-popup__prob-bar-bg">
                <div
                  className="tile-popup__prob-bar"
                  style={{ width: `${(prob * 100).toFixed(0)}%` }}
                />
              </div>
              <span className="tile-popup__prob-val">{(prob * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
