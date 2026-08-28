import React, { useState } from 'react'
import {
  Sparkles,
  Layers,
  GitCompareArrows,
  ArrowRight,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
  Maximize2,
  Share2,
  BarChart2,
  Activity,
} from 'lucide-react'
import { CLASS_COLORS, CHANGE_COLORS } from '@/utils/colors'

/**
 * ChipInspectorModal — High-density detailed satellite chip telemetry modal.
 * Shows Softmax probability breakdown, spectral indices simulation, and before/after comparison.
 */
export default function ChipInspectorModal({ feature, mode, onClose, onZoomToChip }) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('probabilities')

  if (!feature || !feature.properties) return null

  const p = feature.properties
  const isChange = mode === 'change'

  const handleCopyGeoJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(feature, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Simulated spectral indices based on class characteristics
  const getSpectralIndices = (cls) => {
    switch (cls) {
      case 'Forest':
        return { ndvi: 0.82, ndwi: 0.15, evi: 0.74, bi: 0.12 }
      case 'HerbaceousVegetation':
      case 'Pasture':
        return { ndvi: 0.68, ndwi: 0.08, evi: 0.59, bi: 0.18 }
      case 'AnnualCrop':
      case 'PermanentCrop':
        return { ndvi: 0.54, ndwi: 0.04, evi: 0.47, bi: 0.26 }
      case 'River':
      case 'SeaLake':
        return { ndvi: -0.22, ndwi: 0.78, evi: -0.15, bi: 0.05 }
      case 'Residential':
      case 'Industrial':
      case 'Highway':
        return { ndvi: 0.12, ndwi: -0.32, evi: 0.10, bi: 0.65 }
      default:
        return { ndvi: 0.40, ndwi: 0.00, evi: 0.35, bi: 0.30 }
    }
  }

  const primaryClass = isChange ? p.class_after : p.predicted_class
  const spectral = getSpectralIndices(primaryClass)

  const sortedProbs = p.class_probabilities
    ? Object.entries(p.class_probabilities).sort(([, a], [, b]) => b - a)
    : []

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex items-center justify-end p-4 pointer-events-none sm:p-6">
      <div className="pointer-events-auto w-full max-w-md double-bezel-outer animate-in fade-in slide-in-from-right-8 duration-300">
        <div className="double-bezel-inner p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto font-sans">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className="size-8 rounded-xl flex items-center justify-center text-white shadow-md ring-1 ring-white/20"
                style={{
                  backgroundColor: isChange
                    ? (CHANGE_COLORS[p.change_type] || '#6366f1')
                    : (CLASS_COLORS[p.predicted_class] || '#0ea5e9'),
                }}
              >
                {isChange ? <GitCompareArrows className="size-4" /> : <Layers className="size-4" />}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-white font-mono">
                    {p.tile_id || 'CHIP_TARGET'}
                  </h2>
                  {p.needs_review ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[9px] font-semibold text-amber-400 font-mono">
                      <AlertCircle className="size-2.5" /> Needs Review
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-semibold text-emerald-400 font-mono">
                      <CheckCircle2 className="size-2.5" /> High Confidence
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Grid: ({p.grid_row ?? 0}, {p.grid_col ?? 0}) • 640m × 640m Extent
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="size-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-spring cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Primary Assessment Banner */}
          {isChange ? (
            /* Multi-Temporal Change Assessment */
            <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-slate-400">
                  Temporal Transition
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
                  style={{
                    backgroundColor: `${CHANGE_COLORS[p.change_type] || '#6366f1'}25`,
                    color: CHANGE_COLORS[p.change_type] || '#a5b4fc',
                    border: `1px solid ${CHANGE_COLORS[p.change_type] || '#6366f1'}50`,
                  }}
                >
                  {p.change_type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 relative">
                {/* T1 Baseline */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-white/5 flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 font-semibold">
                    T1 Baseline
                  </span>
                  <span className="text-sm font-bold text-slate-200">{p.class_before}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Confidence: {(p.confidence_before * 100).toFixed(1)}%
                  </span>
                </div>

                {/* T2 Target */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-cyan-400 font-semibold">
                    T2 Current
                  </span>
                  <span className="text-sm font-bold text-cyan-300">{p.class_after}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Confidence: {(p.confidence_after * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Land-Cover Single Timestamp Assessment */
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 shadow-inner">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-slate-400">
                  Predicted Surface Class
                </span>
                <span className="text-base font-bold text-white tracking-tight mt-0.5">
                  {p.predicted_class}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-slate-400 block">
                  Calibrated Confidence
                </span>
                <span className="text-lg font-bold font-mono text-cyan-400">
                  {(p.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {/* Navigation Tab Selector */}
          <div className="flex rounded-xl bg-slate-950/60 p-1 border border-white/5">
            <button
              onClick={() => setActiveTab('probabilities')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-spring cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'probabilities'
                  ? 'bg-white/10 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="size-3" />
              <span>Probabilities</span>
            </button>
            <button
              onClick={() => setActiveTab('spectral')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-spring cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'spectral'
                  ? 'bg-white/10 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="size-3" />
              <span>Spectral Indices</span>
            </button>
          </div>

          {/* Tab 1: Probability Spectrum */}
          {activeTab === 'probabilities' && (
            <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-950/50 border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-slate-400">
                Softmax Distribution Spectrum
              </span>
              <div className="flex flex-col gap-2 mt-1">
                {sortedProbs.slice(0, 5).map(([cls, prob], idx) => {
                  const percent = (prob * 100).toFixed(1)
                  const isTop = idx === 0
                  return (
                    <div key={cls} className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between font-medium">
                        <span className={`truncate ${isTop ? 'text-white font-bold' : 'text-slate-300'}`}>
                          {cls}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">{percent}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-900 border border-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(3, prob * 100)}%`,
                            backgroundColor: CLASS_COLORS[cls] || '#38bdf8',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Spectral & Bio-Physical Indices */}
          {activeTab === 'spectral' && (
            <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-slate-950/50 border border-white/5 font-mono">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Estimated Biophysical Reflectance
              </span>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-sans">
                    NDVI (Vegetation)
                  </span>
                  <span className="text-sm font-bold text-emerald-400">{spectral.ndvi.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-500 block font-sans">NIR - Red / NIR + Red</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-sans">
                    NDWI (Water / Moisture)
                  </span>
                  <span className="text-sm font-bold text-cyan-400">{spectral.ndwi.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-500 block font-sans">Green - NIR / Green + NIR</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-sans">
                    EVI (Enhanced Veg)
                  </span>
                  <span className="text-sm font-bold text-teal-400">{spectral.evi.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-500 block font-sans">Atmospheric corrected</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-sans">
                    BI (Built-up / Urban)
                  </span>
                  <span className="text-sm font-bold text-amber-400">{spectral.bi.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-500 block font-sans">Surface Albedo Index</span>
                </div>
              </div>
            </div>
          )}

          {/* Geospatial Footprint */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 font-mono text-[10px] text-slate-400 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-wider font-bold text-slate-400">Centroid Coordinates</span>
              <span className="text-slate-200">
                [{p.centroid?.[0]?.toFixed(5) ?? '0.00000'}, {p.centroid?.[1]?.toFixed(5) ?? '0.00000'}]
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-wider font-bold text-slate-400">CRS Projection</span>
              <span className="text-slate-200">WGS84 / EPSG:4326</span>
            </div>
          </div>

          {/* Action Deck */}
          <div className="flex items-center gap-2 pt-1 border-t border-white/10">
            <button
              onClick={handleCopyGeoJSON}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-spring cursor-pointer"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              <span>{copied ? 'Copied GeoJSON' : 'Copy Chip Data'}</span>
            </button>

            {onZoomToChip && (
              <button
                onClick={() => onZoomToChip(feature)}
                className="py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-semibold text-cyan-300 flex items-center justify-center gap-1.5 transition-spring cursor-pointer"
                title="Zoom into this chip"
              >
                <Maximize2 className="size-3.5" />
                <span>Zoom</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
