import React, { useState, useEffect } from 'react'
import {
  Satellite,
  Layers,
  GitCompareArrows,
  Calendar,
  SlidersHorizontal,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  MapPin,
  Loader2,
  Sparkles,
  Crosshair,
  Compass,
  Trash2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { fetchSampleRegions } from '@/api/client'
import Legend from './Legend'
import StatsPanel from './StatsPanel'
import { Slider } from '@/components/ui/slider'

/**
 * Tactical Control Deck — Nested Double-Bezel floating control dock.
 * Features Button-in-Button CTA, acquisition timeline gates, AOI coordinate telemetry, and Bayesian confidence slider.
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
    ? `[${bbox[0].toFixed(2)}, ${bbox[1].toFixed(2)}, ${bbox[2].toFixed(2)}, ${bbox[3].toFixed(2)}]`
    : 'No active AOI boundary'

  return (
    <aside
      className={`fixed top-20 bottom-6 left-4 z-30 flex transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        collapsed ? 'w-14' : 'w-88 sm:w-96'
      }`}
    >
      {/* Outer Shell (Double-Bezel) */}
      <div className="double-bezel-outer w-full h-full flex flex-col relative overflow-hidden">
        {/* Inner Core */}
        <div className="double-bezel-inner flex-1 flex flex-col h-full overflow-hidden p-3.5 sm:p-4 text-slate-100">
          {/* Collapse/Expand Floating Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-6 z-40 flex size-6.5 items-center justify-center rounded-full bg-slate-900 border border-white/20 text-slate-300 shadow-xl hover:bg-slate-800 hover:text-white cursor-pointer transition-spring"
            title={collapsed ? 'Expand Tactical Console' : 'Collapse Console'}
          >
            {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
          </button>

          {collapsed ? (
            /* Collapsed Minimal Icon Dock */
            <div className="flex flex-col items-center py-2 gap-4 h-full justify-between">
              <div className="flex flex-col items-center gap-3">
                <div className="size-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Compass className="size-4" />
                </div>
                <div className="h-[1px] w-6 bg-white/10" />
                <button
                  onClick={() => {
                    setCollapsed(false)
                    setMode('classify')
                  }}
                  className={`p-2 rounded-xl transition-spring cursor-pointer ${
                    mode === 'classify'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Land Cover Classification"
                >
                  <Layers className="size-4" />
                </button>
                <button
                  onClick={() => {
                    setCollapsed(false)
                    setMode('change')
                  }}
                  className={`p-2 rounded-xl transition-spring cursor-pointer ${
                    mode === 'change'
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Multi-Temporal Change AI"
                >
                  <GitCompareArrows className="size-4" />
                </button>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={loading || !bbox}
                className="size-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg disabled:opacity-40 cursor-pointer"
                title="Execute Inference"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              </button>
            </div>
          ) : (
            /* Expanded Full Tactical Console */
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header Title */}
              <div className="pb-3 mb-2 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Compass className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                      Tactical Mission Deck
                    </h2>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Active: {mode === 'classify' ? 'Land-Cover Seg' : 'Temporal Change'}
                    </span>
                  </div>
                </div>

                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[9px] font-mono text-cyan-300">
                  Ready
                </span>
              </div>

              {/* Scrollable Controls Section */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3.5">
                {/* AOI Extent & Coordinates Box */}
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 uppercase">
                    <span className="flex items-center gap-1">
                      <Crosshair className="size-3 text-cyan-400" />
                      Spatial AOI Extent
                    </span>
                    {bbox ? (
                      <button
                        onClick={handleClearBbox}
                        className="text-red-400 hover:text-red-300 flex items-center gap-0.5 cursor-pointer"
                        title="Clear AOI"
                      >
                        <Trash2 className="size-2.5" />
                        <span>Clear</span>
                      </button>
                    ) : (
                      <span className="text-amber-400">Pending Draw</span>
                    )}
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900/90 border border-white/5 font-mono text-[11px] text-cyan-300 truncate">
                    {bboxFormatted}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <select
                      value={selectedRegion}
                      onChange={handleRegionSelect}
                      className="flex-1 h-8 rounded-xl bg-slate-900 border border-white/10 text-[11px] text-slate-300 px-2 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="">Choose preset calibration site...</option>
                      {Object.entries(regions).map(([key, reg]) => (
                        <option key={key} value={key}>
                          {reg.name}
                        </option>
                      ))}
                    </select>

                    {onTriggerDraw && (
                      <button
                        onClick={onTriggerDraw}
                        className="h-8 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white flex items-center gap-1 text-[11px] font-medium transition-spring cursor-pointer shrink-0"
                        title="Draw Custom Rectangle"
                      >
                        <Crosshair className="size-3 text-cyan-400" />
                        <span>Draw</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Acquisition Date Picker */}
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/10 flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1.5">
                    <Calendar className="size-3 text-cyan-400" />
                    {mode === 'classify' ? 'Sentinel-2 Acquisition Pass' : 'Temporal Baseline & Target Passes'}
                  </label>

                  {mode === 'classify' ? (
                    <input
                      type="date"
                      className="w-full h-8 px-3 rounded-xl border border-white/10 bg-slate-900 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase font-semibold text-slate-500">
                          T1 Baseline
                        </span>
                        <input
                          type="date"
                          className="w-full h-8 px-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                          value={dateBefore}
                          onChange={(e) => setDateBefore(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase font-semibold text-cyan-400">
                          T2 Current
                        </span>
                        <input
                          type="date"
                          className="w-full h-8 px-2 rounded-xl border border-cyan-500/30 bg-slate-900 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500"
                          value={dateAfter}
                          onChange={(e) => setDateAfter(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Calibrated Confidence Gate Slider */}
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/10 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5 font-sans">
                      <SlidersHorizontal className="size-3 text-amber-400" />
                      Bayesian Confidence Gate
                    </span>
                    <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
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

                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>50% (Permissive)</span>
                    <span>70% (Optimal)</span>
                    <span>95% (Strict)</span>
                  </div>
                </div>

                {/* Nested "Button-in-Button" Trailing Icon CTA */}
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !bbox}
                  className="group relative flex items-center justify-between w-full p-1.5 pl-4 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-bold text-xs tracking-tight shadow-[0_12px_28px_rgba(6,182,212,0.35)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-spring active:scale-[0.98] overflow-hidden"
                >
                  <span className="font-sans font-semibold tracking-wide">
                    {loading
                      ? 'Inferencing Surface Chips...'
                      : mode === 'classify'
                      ? 'Execute Land-Cover AI'
                      : 'Run Temporal Change Detection'}
                  </span>

                  {/* Nested Button-in-Button Trailing Icon Circle */}
                  <div className="size-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-inner group-hover:scale-105 group-hover:translate-x-0.5 transition-spring shrink-0">
                    {loading ? (
                      <Loader2 className="size-4 animate-spin text-white" />
                    ) : (
                      <Search className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    )}
                  </div>
                </button>

                {/* Error Alert */}
                {error && (
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-xs text-red-200">
                    <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="font-bold text-red-300 font-mono text-[10px]">
                        INFERENCE_ERROR
                      </span>
                      <span className="leading-tight mt-0.5">{error}</span>
                    </div>
                  </div>
                )}

                {/* Class Taxonomy Legend */}
                <Legend mode={mode} />

                {/* Performance Analytics & Stats */}
                <StatsPanel data={data} mode={mode} />
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
