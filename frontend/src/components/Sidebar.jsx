import React, { useState, useEffect } from 'react'
import {
  Layers,
  GitCompareArrows,
  Calendar,
  SlidersHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  MapPin,
  Loader2,
  Crosshair,
  Trash2,
} from 'lucide-react'
import { fetchSampleRegions } from '@/api/client'
import Legend from './Legend'
import StatsPanel from './StatsPanel'
import { Slider } from '@/components/ui/slider'

/**
 * Sidebar — Grounded analytical workbench for Earth Observation workflows.
 */
export default function Sidebar({
  mode,
  setMode,
  bbox,
  setBbox,
  onAnalyze,
  loading,
  error,
  data,
  onFlyTo,
  onTriggerDraw,
}) {
  const [regions, setRegions] = useState({})
  const [selectedRegion, setSelectedRegion] = useState('')
  const [date, setDate] = useState('2026-06-01')
  const [dateBefore, setDateBefore] = useState('2024-06-01')
  const [dateAfter, setDateAfter] = useState('2026-06-01')
  const [confidence, setConfidence] = useState(0.70)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetchSampleRegions()
      .then(setRegions)
      .catch(() => {
        setRegions({
          munich_urban_fringe: {
            name: 'Munich Urban Fringe (Germany)',
            bbox: [11.45, 48.10, 11.65, 48.25],
          },
          rhine_valley: {
            name: 'Rhine Valley Farmland (France/Germany)',
            bbox: [7.60, 48.45, 7.80, 48.60],
          },
          paris_metropolis: {
            name: 'Paris Metropolis (France)',
            bbox: [2.25, 48.80, 2.45, 48.92],
          },
        })
      })
  }, [])

  const handleRegionSelect = (e) => {
    const key = e.target.value
    setSelectedRegion(key)
    if (regions[key]) {
      const b = regions[key].bbox
      setBbox(b)
      onFlyTo([[b[1], b[0]], [b[3], b[2]]])
    }
  }

  const handleAnalyze = () => {
    if (!bbox || bbox.length !== 4) return
    if (mode === 'classify') {
      onAnalyze({ bbox, date, confidence_threshold: confidence })
    } else {
      onAnalyze({
        bbox,
        date_before: dateBefore,
        date_after: dateAfter,
        confidence_threshold: confidence,
      })
    }
  }

  const handleClearBbox = () => {
    setBbox(null)
    setSelectedRegion('')
  }

  const bboxFormatted = bbox
    ? `[${bbox[0].toFixed(3)}, ${bbox[1].toFixed(3)}, ${bbox[2].toFixed(3)}, ${bbox[3].toFixed(3)}]`
    : 'No active bounding box'

  return (
    <aside
      className={`fixed top-14 bottom-0 left-0 z-20 flex bg-slate-900 border-r border-slate-800 transition-all duration-200 ${
        collapsed ? 'w-12' : 'w-80 sm:w-88'
      }`}
    >
      {/* Collapse / Expand Tab */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-4 z-30 flex size-6 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-300 shadow-md hover:bg-slate-700 hover:text-white cursor-pointer"
        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
      </button>

      {collapsed ? (
        /* Collapsed Icon Bar */
        <div className="flex flex-col items-center py-4 gap-3 w-full">
          <button
            onClick={() => {
              setCollapsed(false)
              setMode('classify')
            }}
            className={`p-2 rounded-md ${
              mode === 'classify' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Land Cover"
          >
            <Layers className="size-4" />
          </button>
          <button
            onClick={() => {
              setCollapsed(false)
              setMode('change')
            }}
            className={`p-2 rounded-md ${
              mode === 'change' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Change Detection"
          >
            <GitCompareArrows className="size-4" />
          </button>
          <div className="h-[1px] w-6 bg-slate-800 my-1" />
          <button
            onClick={handleAnalyze}
            disabled={loading || !bbox}
            className="p-2 rounded-md bg-blue-600 text-white disabled:opacity-40"
            title="Run Analysis"
          >
            <Search className="size-4" />
          </button>
        </div>
      ) : (
        /* Full Controls Sidebar */
        <div className="flex flex-col h-full w-full overflow-hidden p-4">
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
            {/* 1. Spatial AOI */}
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Crosshair className="size-3.5 text-blue-400" />
                  Target Bounding Box
                </span>
                {bbox && (
                  <button
                    onClick={handleClearBbox}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="size-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 truncate">
                {bboxFormatted}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <select
                  value={selectedRegion}
                  onChange={handleRegionSelect}
                  className="flex-1 h-8 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300 px-2 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Preset region...</option>
                  {Object.entries(regions).map(([key, reg]) => (
                    <option key={key} value={key}>
                      {reg.name}
                    </option>
                  ))}
                </select>

                {onTriggerDraw && (
                  <button
                    onClick={onTriggerDraw}
                    className="h-8 px-2.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium flex items-center gap-1 cursor-pointer"
                    title="Click and drag on the map to define a custom AOI"
                  >
                    <Crosshair className="size-3 text-blue-400" />
                    <span>Draw</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. Acquisition Date(s) */}
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-950/70 border border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-blue-400" />
                {mode === 'classify' ? 'Acquisition Date' : 'Temporal Comparison Dates'}
              </label>

              {mode === 'classify' ? (
                <input
                  type="date"
                  className="w-full h-8 px-2.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              ) : (
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">Baseline (T1)</span>
                    <input
                      type="date"
                      className="w-full h-8 px-2 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      value={dateBefore}
                      onChange={(e) => setDateBefore(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">Current (T2)</span>
                    <input
                      type="date"
                      className="w-full h-8 px-2 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      value={dateAfter}
                      onChange={(e) => setDateAfter(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Confidence Threshold */}
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <SlidersHorizontal className="size-3.5 text-amber-400" />
                  Confidence Threshold
                </span>
                <span className="font-mono text-xs font-semibold text-amber-400">
                  {(confidence * 100).toFixed(0)}%
                </span>
              </div>

              <Slider
                value={[confidence]}
                onValueChange={(val) => setConfidence(val[0])}
                min={0.5}
                max={0.95}
                step={0.05}
                className="py-1"
              />

              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>50% Permissive</span>
                <span>70% Recommended</span>
                <span>95% Strict</span>
              </div>
            </div>

            {/* 4. Action Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading || !bbox}
              className="flex items-center justify-center gap-2 w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Processing Scene Chips...</span>
                </>
              ) : mode === 'classify' ? (
                <>
                  <Search className="size-4" />
                  <span>Classify Satellite AOI</span>
                </>
              ) : (
                <>
                  <Search className="size-4" />
                  <span>Detect Temporal Changes</span>
                </>
              )}
            </button>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-semibold text-red-200">Analysis Error</span>
                  <span className="mt-0.5 leading-relaxed">{error}</span>
                </div>
              </div>
            )}

            {/* 5. Classification / Change Legend */}
            <Legend mode={mode} />

            {/* 6. Real-time Summary Statistics */}
            <StatsPanel data={data} mode={mode} />
          </div>
        </div>
      )}
    </aside>
  )
}
