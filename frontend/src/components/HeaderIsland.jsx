import React, { useState, useEffect } from 'react'
import {
  Satellite,
  Layers,
  GitCompareArrows,
  MapPin,
  Info,
  ExternalLink,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react'
import { fetchHealth } from '@/api/client'

/**
 * TopBar — Clean, grounded Earth Observation header with mobile responsiveness.
 */
export default function HeaderIsland({
  mode,
  setMode,
  regions,
  selectedRegion,
  onSelectRegion,
  activeBbox,
  mobileSidebarOpen,
  onToggleMobileSidebar,
}) {
  const [serverOnline, setServerOnline] = useState(true)
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    fetchHealth()
      .then(() => setServerOnline(true))
      .catch(() => setServerOnline(false))
  }, [])

  return (
    <header className="absolute top-0 left-0 right-0 z-30 h-14 bg-slate-900/90 border-b border-slate-800/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2">
      {/* Brand & Mission Identity */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 shrink-0">
          <Satellite className="size-4.5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-sm font-semibold text-white tracking-tight">
              Enviro-Sat
            </h1>
            <span className="hidden sm:inline-block rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
              Sentinel-2 L2A
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden md:block">
            Land-Use & Temporal Change Monitor
          </span>
        </div>
      </div>

      {/* Center Mode Switcher — sliding indicator (§4) */}
      <div className="relative flex items-center p-0.5 sm:p-1 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
        <div
          className="absolute top-0.5 sm:top-1 bottom-0.5 sm:bottom-1 rounded-md bg-blue-600 shadow-sm transition-transform duration-200 ease-out pointer-events-none"
          style={{
            width: 'calc(50% - 4px)',
            left: '4px',
            transform: mode === 'change' ? 'translateX(100%)' : 'translateX(0)',
          }}
          aria-hidden="true"
        />
        <button
          onClick={() => setMode('classify')}
          className={`relative z-10 flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium cursor-pointer transition-colors duration-100 ${
            mode === 'classify' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="size-3.5" />
          <span>Land<span className="hidden sm:inline">&nbsp;Cover</span></span>
        </button>

        <button
          onClick={() => setMode('change')}
          className={`relative z-10 flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium cursor-pointer transition-colors duration-100 ${
            mode === 'change' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitCompareArrows className="size-3.5" />
          <span>Change<span className="hidden sm:inline">&nbsp;Detection</span></span>
        </button>
      </div>

      {/* Right Controls: Preset Regions & Info */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Preset Selector */}
        <div className="hidden sm:flex items-center gap-1.5">
          <MapPin className="size-3.5 text-slate-400" />
          <select
            value={selectedRegion}
            onChange={(e) => onSelectRegion(e.target.value)}
            className="h-8 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 px-2.5 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Preset Regions...</option>
            {Object.entries(regions).map(([key, reg]) => (
              <option key={key} value={key}>
                {reg.name}
              </option>
            ))}
          </select>
        </div>

        {/* Server Status Dot */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
          <span
            className={`size-2 rounded-full ${
              serverOnline ? 'bg-emerald-400' : 'bg-red-400'
            }`}
          />
          <span className="hidden md:inline">
            {serverOnline ? 'API Connected' : 'API Offline'}
          </span>
        </div>

        {/* About Dialog Toggle */}
        <button
          onClick={() => setInfoOpen(!infoOpen)}
          className="size-8 rounded-md bg-slate-950 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          title="About EuroSAT Model"
        >
          <Info className="size-4" />
        </button>

        {/* Mobile Workbench Toggle Button */}
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className={`sm:hidden size-8 rounded-md border flex items-center justify-center cursor-pointer transition-colors relative ${
              mobileSidebarOpen
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Toggle Controls & AOI"
            aria-label="Toggle Controls & AOI"
          >
            <SlidersHorizontal className="size-3.5" />
            {activeBbox && !mobileSidebarOpen && (
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-blue-500 ring-2 ring-slate-900" />
            )}
          </button>
        )}
      </div>

      {/* About Popover — always rendered, CSS show/hide for enter+exit (§3, §7) */}
      <div
        className={`absolute top-16 right-2 sm:right-4 w-[calc(100vw-1rem)] max-w-sm sm:w-96 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-4 z-50 transition-[opacity,transform] duration-150 ease-out ${
          infoOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-[0.92] pointer-events-none'
        }`}
        style={{ transformOrigin: 'top right' }}
        aria-hidden={!infoOpen}
      >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <h3 className="text-sm font-semibold text-white">About Enviro-Sat</h3>
            <button
              onClick={() => setInfoOpen(false)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Enviro-Sat performs real-time land-cover classification and multi-temporal change detection using ResNet-50 models trained on the EuroSAT Sentinel-2 benchmark dataset.
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mb-3">
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">Resolution</span>
              <span className="text-slate-200">10m Ground (GSD)</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">Classes</span>
              <span className="text-slate-200">10 EuroSAT Types</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px]">
            <span className="text-slate-400 font-mono">Sentinel-2 BOA Level-2A</span>
            <a
              href="https://github.com/Pradhyumna51/enviro-sat"
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>GitHub</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
    </header>
  )
}
