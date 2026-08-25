import { CLASS_COLORS, CHANGE_COLORS } from '../utils/colors';
import './Legend.css';

/**
 * Color legend for EuroSAT classes (classify mode) or transition types (change mode).
 */
export default function Legend({ mode }) {
  const items = mode === 'change'
    ? Object.entries(CHANGE_COLORS)
    : Object.entries(CLASS_COLORS);

  return (
    <div className="legend">
      <h4 className="legend-title">
        {mode === 'change' ? 'Change Types' : 'Land Use Classes'}
      </h4>
      <ul className="legend-list">
        {items.map(([label, color]) => (
          <li key={label} className="legend-item">
            <span
              className="legend-swatch"
              style={{ backgroundColor: color }}
            />
            <span className="legend-label">{label}</span>
          </li>
        ))}
        <li className="legend-item">
          <span className="legend-swatch legend-swatch--hatch" />
          <span className="legend-label">Needs Review</span>
        </li>
      </ul>
    </div>
  );
}
