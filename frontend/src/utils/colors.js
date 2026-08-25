/**
 * EuroSAT class → color mapping.
 * Follows standard remote-sensing color conventions.
 */

export const CLASS_COLORS = {
  AnnualCrop:             '#e6c84c',
  Forest:                 '#2d7d46',
  HerbaceousVegetation:   '#7bc67e',
  Highway:                '#6b7280',
  Industrial:             '#a855f7',
  Pasture:                '#a3d977',
  PermanentCrop:          '#c4813d',
  Residential:            '#ef4444',
  River:                  '#3b82f6',
  SeaLake:                '#1e40af',
};

export const CHANGE_COLORS = {
  'Urbanization':               '#ef4444',
  'Deforestation':              '#dc2626',
  'Reforestation':              '#16a34a',
  'Infrastructure Expansion':   '#f97316',
  'Hydrological Shift':         '#3b82f6',
  'Agricultural Conversion':    '#eab308',
  'General Land Cover Shift':   '#8b5cf6',
  'No Significant Change':      '#475569',
  'Uncertain Transition (Filtered)': '#94a3b8',
};

/**
 * Return fill color for a GeoJSON feature based on the active mode.
 */
export function getFeatureColor(feature, mode) {
  const props = feature.properties;
  if (mode === 'change') {
    if (props.is_changed) {
      return CHANGE_COLORS[props.change_type] || '#8b5cf6';
    }
    return CHANGE_COLORS['No Significant Change'];
  }
  return CLASS_COLORS[props.predicted_class] || '#94a3b8';
}
