import React, { useState, useEffect } from 'react'
import { fetchSampleRegions } from '@/api/client'
import Legend from './Legend'
import StatsPanel from './StatsPanel'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Satellite,
  Map as MapIcon,
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
} from 'lucide-react'

/**
 * High-density operational sidebar built with shadcn/ui components and Lucide icons.
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

  const handleRegionSelect = (key) => {
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

  const bboxFormatted = bbox
    ? `[${bbox[0].toFixed(2)}, ${bbox[1].toFixed(2)}, ${bbox[2].toFixed(2)}, ${bbox[3].toFixed(2)}]`
    : 'No bounding box active'

  return (
    <aside
      className={`relative z-20 flex flex-col h-full bg-slate-950/95 border-r border-slate-800/90 text-slate-100 transition-all duration-300 ease-in-out backdrop-blur-xl shadow-2xl ${
        collapsed ? 'w-12' : 'w-84'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-4 z-30 flex size-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 shadow-md hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
        title={collapsed ? 'Expand Console' : 'Collapse Console'}
      >
        {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
      </button>

      {collapsed ? (
        /* Collapsed Icon Bar */
        <div className="flex flex-col items-center py-4 gap-4">
          <div className="size-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Satellite className="size-4" />
          </div>
          <Separator className="w-6 bg-slate-800" />
          <button
            onClick={() => { setCollapsed(false); setMode('classify') }}
            className={`p-2 rounded-md transition-colors ${mode === 'classify' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}
            title="Classify Mode"
          >
            <MapIcon className="size-4" />
          </button>
          <button
            onClick={() => { setCollapsed(false); setMode('change') }}
            className={`p-2 rounded-md transition-colors ${mode === 'change' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}
            title="Change Detection Mode"
          >
            <GitCompareArrows className="size-4" />
          </button>
        </div>
      ) : (
        /* Full Console Panel */
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-4 pb-3 border-b border-slate-800/80 bg-slate-900/40">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                <Satellite className="size-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold tracking-tight text-white">Enviro-Sat</h1>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-500/40 text-blue-400 font-mono">
                    v1.0.0
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400">Sentinel-2 Land Cover & Change AI</p>
              </div>
            </div>
          </div>

          {/* Scrollable Control Body */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
            {/* Mode Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Analysis Pipeline
              </label>
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(val) => { if (val) setMode(val) }}
                className="w-full"
              >
                <ToggleGroupItem value="classify" className="flex items-center gap-1.5 py-1.5">
                  <MapIcon className="size-3.5" />
                  <span>Land Cover</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="change" className="flex items-center gap-1.5 py-1.5">
                  <GitCompareArrows className="size-3.5" />
                  <span>Change AI</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Benchmark Preset Regions */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <MapPin className="size-3" />
                  Sample Target Region
                </label>
              </div>
              <Select value={selectedRegion} onValueChange={handleRegionSelect}>
                <SelectTrigger className="w-full h-8 text-xs bg-slate-900 border-slate-700">
                  <SelectValue placeholder="Choose a preset region..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {Object.entries(regions).map(([key, region]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bounding Box Info */}
            <div className="flex flex-col gap-1 p-2 rounded-md bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-semibold uppercase tracking-wider">Spatial Extent (EPSG:4326)</span>
                {bbox && <span className="text-blue-400 font-mono text-[9px]">Active</span>}
              </div>
              <span className="text-[11px] font-mono text-slate-300 truncate">
                {bboxFormatted}
              </span>
            </div>

            {/* Acquisition Date Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Calendar className="size-3" />
                {mode === 'classify' ? 'Target Acquisition Date' : 'Multi-Temporal Timestamps'}
              </label>

              {mode === 'classify' ? (
                <input
                  type="date"
                  className="w-full h-8 px-2.5 rounded-md border border-slate-700 bg-slate-900 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-semibold text-slate-500">T1 (Baseline)</span>
                    <input
                      type="date"
                      className="w-full h-8 px-2 rounded-md border border-slate-700 bg-slate-900 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={dateBefore}
                      onChange={(e) => setDateBefore(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-semibold text-slate-500">T2 (Current)</span>
                    <input
                      type="date"
                      className="w-full h-8 px-2 rounded-md border border-slate-700 bg-slate-900 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={dateAfter}
                      onChange={(e) => setDateAfter(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confidence Threshold Slider */}
            <div className="flex flex-col gap-2 p-2.5 rounded-md bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <SlidersHorizontal className="size-3 text-amber-400" />
                  Confidence Gate
                </span>
                <Badge variant="outline" className="font-mono text-[10px] text-amber-400 border-amber-500/30">
                  {(confidence * 100).toFixed(0)}%
                </Badge>
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
                <span>95% (Strict)</span>
              </div>
            </div>

            {/* Action Trigger Button */}
            <Button
              onClick={handleAnalyze}
              disabled={loading || !bbox}
              className="w-full h-10 font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-950/50 mt-1 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Processing Scene Chips...</span>
                </div>
              ) : mode === 'classify' ? (
                <div className="flex items-center gap-2">
                  <Search className="size-4" />
                  <span>Classify Satellite Region</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RefreshCw className="size-4" />
                  <span>Execute Change Detection</span>
                </div>
              )}
            </Button>

            {/* Error Notification */}
            {error && (
              <Alert variant="destructive" className="mt-1">
                <AlertCircle className="size-4" />
                <AlertTitle>Inference Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Class / Change Legend */}
            <Legend mode={mode} />

            {/* Performance Analytics & Stats */}
            <StatsPanel data={data} mode={mode} />
          </div>
        </div>
      )}
    </aside>
  )
}
