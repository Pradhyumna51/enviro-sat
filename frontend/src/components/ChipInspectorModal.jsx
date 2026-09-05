import React, { useState } from 'react'
import {
  Layers,
  GitCompareArrows,
  X,
  Copy,
  Check,
  Maximize2,
  BarChart2,
  Activity,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { CLASS_COLORS, CHANGE_COLORS } from '@/utils/colors'

/**
 * ChipInspectorModal — Grounded right-side inspection drawer for selected scene chips.
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
    <>
      {/* Mobile Backdrop Scrim */}
      <div
        onClick={onClose}
        className="sm:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      <aside className="fixed inset-x-0 bottom-0 max-h-[85vh] z-40 rounded-t-2xl border-t border-slate-700 bg-slate-900 shadow-2xl flex flex-col font-sans sm:inset-x-auto sm:top-14 sm:bottom-0 sm:right-0 sm:w-92 sm:max-h-none sm:rounded-none sm:border-t-0 sm:border-l sm:border-slate-800 transition-transform duration-200 ease-out">
        {/* Mobile Drag Handle Pill */}
        <div className="sm:hidden flex items-center justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="size-7 rounded flex items-center justify-center text-white text-xs font-bold"
            style={{
              backgroundColor: isChange
                ? (CHANGE_COLORS[p.change_type] || '#6366f1')
                : (CLASS_COLORS[p.predicted_class] || '#2563eb'),
            }}
          >
            {isChange ? <GitCompareArrows className="size-3.5" /> : <Layers className="size-3.5" />}
          </div>
          <div>
            <h2 className="text-xs font-bold text-white font-mono">{p.tile_id || 'CHIP_ANALYSIS'}</h2>
            <span className="text-[11px] text-slate-400 font-mono">
              Grid: ({p.grid_row ?? 0}, {p.grid_col ?? 0}) • 640m × 640m
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="size-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Main Prediction Badge */}
        {isChange ? (
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Transition Assessment</span>
              <span
                className="px-2 py-0.5 rounded text-[11px] font-semibold"
                style={{
                  backgroundColor: `${CHANGE_COLORS[p.change_type] || '#6366f1'}20`,
                  color: CHANGE_COLORS[p.change_type] || '#a5b4fc',
                }}
              >
                {p.change_type}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Baseline (T1)</span>
                <span className="font-bold text-slate-200">{p.class_before}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {(p.confidence_before * 100).toFixed(0)}%
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-blue-500/30">
                <span className="text-[10px] text-blue-400 block font-sans">Current (T2)</span>
                <span className="font-bold text-blue-300">{p.class_after}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {(p.confidence_after * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Classified Land Cover
              </span>
              <span className="text-base font-bold text-white tracking-tight mt-0.5">
                {p.predicted_class}
              </span>
            </div>
            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Confidence
              </span>
              <span className="text-base font-bold text-blue-400">
                {(p.confidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex rounded-md bg-slate-950 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('probabilities')}
            className={`flex-1 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'probabilities'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="size-3.5" />
            <span>Probabilities</span>
          </button>
          <button
            onClick={() => setActiveTab('spectral')}
            className={`flex-1 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'spectral'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="size-3.5" />
            <span>Spectral Indices</span>
          </button>
        </div>

        {/* Probabilities Tab */}
        {activeTab === 'probabilities' && (
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
              Candidate Classes (Softmax)
            </span>
            <div className="flex flex-col gap-2 mt-1">
              {sortedProbs.slice(0, 5).map(([cls, prob], idx) => (
                <div key={cls} className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={idx === 0 ? 'font-semibold text-white' : 'text-slate-300'}>
                      {cls}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {(prob * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(3, prob * 100)}%`,
                        backgroundColor: CLASS_COLORS[cls] || '#3b82f6',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spectral Tab */}
        {activeTab === 'spectral' && (
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-2 font-mono text-xs">
            <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider font-sans">
              Estimated Spectral Indices
            </span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">NDVI (Vegetation)</span>
                <span className="font-bold text-emerald-400">{spectral.ndvi.toFixed(2)}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">NDWI (Water/Moisture)</span>
                <span className="font-bold text-blue-400">{spectral.ndwi.toFixed(2)}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">EVI (Enhanced Veg)</span>
                <span className="font-bold text-teal-400">{spectral.evi.toFixed(2)}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">BI (Built-up / Albedo)</span>
                <span className="font-bold text-amber-400">{spectral.bi.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Centroid Coordinates */}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 font-mono text-xs text-slate-300 flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Centroid:</span>
            <span>[{p.centroid?.[0]?.toFixed(5) ?? '0.00000'}, {p.centroid?.[1]?.toFixed(5) ?? '0.00000'}]</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">CRS:</span>
            <span>WGS84 (EPSG:4326)</span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-800 flex gap-2">
        <button
          onClick={handleCopyGeoJSON}
          className="flex-1 h-9 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          <span>{copied ? 'Copied GeoJSON' : 'Copy GeoJSON'}</span>
        </button>

        {onZoomToChip && (
          <button
            onClick={() => onZoomToChip(feature)}
            className="h-9 px-3 rounded bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-xs font-medium text-blue-300 flex items-center justify-center gap-1 cursor-pointer transition-colors"
            title="Zoom to tile bounds"
          >
            <Maximize2 className="size-3.5" />
            <span>Zoom</span>
          </button>
        )}
      </div>
    </aside>
  </>
  )
}
