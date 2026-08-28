import React, { useState, useEffect } from 'react'
import {
  Satellite,
  Layers,
  GitCompareArrows,
  MapPin,
  Activity,
  Globe,
  Radio,
  Sparkles,
  Info,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import { fetchHealth } from '@/api/client'

/**
 * HeaderIsland — Floating detached aerospace command pill.
 * Features live satellite constellation status, mode selector, preset region navigation, and backend telemetry.
 */
export default function HeaderIsland({
  mode,
  setMode,
  regions,
  selectedRegion,
  onSelectRegion,
  activeBbox,
}) {
  const [serverHealth, setServerHealth] = useState({ online: true, latency: 18 })
  const [regionMenuOpen, setRegionMenuOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    const checkPing = async () => {
      const start = performance.now()
      try {
        await fetchHealth()
        const lat = Math.round(performance.now() - start)
        setServerHealth({ online: true, latency: Math.min(lat, 999) })
      } catch (e) {
        setServerHealth({ online: false, latency: 0 })
      }
    }
    checkPing()
    const interval = setInterval(checkPing, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="absolute top-4 left-0 right-0 z-40 flex justify-center pointer-events-none px-4">
      <div className="pointer-events-auto flex items-center gap-3 p-1.5 rounded-full bg-slate-950/70 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-spring">
        {/* Brand & Satellite Identity */}
        <div className="flex items-center gap-2.5 pl-3 pr-2 py-1">
          <div className="relative flex size-8 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Satellite className="size-4" />
            <span className="absolute -top-0.5 -right-0.5 flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-white uppercase font-sans">
                Enviro<span className="text-cyan-400">Sat</span>
              </span>
              <span className="rounded-full bg-white/5 border border-white/10 px-1.5 py-0.2 text-[9px] font-mono font-medium text-slate-300">
                S2-L2A
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 tracking-wider">
              Earth Observation AI
            </span>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-white/10" />

        {/* Pipeline Mode Switcher */}
        <div className="flex items-center p-0.5 rounded-full bg-slate-900/90 border border-white/5 shadow-inner">
          <button
            onClick={() => setMode('classify')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-spring cursor-pointer ${
              mode === 'classify'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Layers className="size-3.5" />
            <span>Land Cover</span>
          </button>

          <button
            onClick={() => setMode('change')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-spring cursor-pointer ${
              mode === 'change'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <GitCompareArrows className="size-3.5" />
            <span>Temporal Change AI</span>
          </button>
        </div>

        <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />

        {/* Quick Region Selector */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setRegionMenuOpen(!regionMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 text-xs text-slate-300 hover:text-white hover:border-cyan-500/40 transition-spring cursor-pointer"
          >
            <MapPin className="size-3.5 text-cyan-400" />
            <span className="max-w-[130px] truncate font-medium">
              {selectedRegion && regions[selectedRegion]
                ? regions[selectedRegion].name.split('(')[0]
                : 'Target Preset'}
            </span>
            <ChevronDown className={`size-3 text-slate-400 transition-transform ${regionMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {regionMenuOpen && (
            <div className="absolute top-full mt-2 left-0 w-64 rounded-2xl bg-slate-950/95 border border-white/10 p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 border-b border-white/5 font-mono">
                Preset Calibration Sites
              </div>
              <div className="flex flex-col gap-0.5 mt-1 max-h-56 overflow-y-auto">
                {Object.entries(regions).map(([key, reg]) => (
                  <button
                    key={key}
                    onClick={() => {
                      onSelectRegion(key)
                      setRegionMenuOpen(false)
                    }}
                    className={`flex flex-col text-left px-3 py-2 rounded-xl text-xs transition-spring cursor-pointer ${
                      selectedRegion === key
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="font-semibold">{reg.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      BBox: [{reg.bbox.map((v) => v.toFixed(2)).join(', ')}]
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-[1px] bg-white/10 hidden lg:block" />

        {/* Telemetry Status Indicator */}
        <div className="hidden lg:flex items-center gap-3 pr-2 font-mono text-[10px]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/60 border border-white/5">
            <span
              className={`size-2 rounded-full ${
                serverHealth.online ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-red-400'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {serverHealth.online ? `${serverHealth.latency}ms` : 'Offline'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <Radio className="size-3 text-cyan-400" />
            <span>10m GSD</span>
          </div>
        </div>

        {/* Info Modal Button */}
        <button
          onClick={() => setInfoOpen(!infoOpen)}
          className="flex size-7 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-spring cursor-pointer ml-0.5"
          title="Satellite Mission Info"
        >
          <Info className="size-3.5" />
        </button>
      </div>

      {/* Info Dialog Overlay */}
      {infoOpen && (
        <div className="pointer-events-auto absolute top-20 right-4 sm:right-10 w-96 rounded-3xl double-bezel-outer z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="double-bezel-inner p-5 flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Enviro-Sat Mission Architecture</h3>
                  <span className="text-[10px] font-mono text-cyan-400">ESA Copernicus Sentinel-2</span>
                </div>
              </div>
              <button
                onClick={() => setInfoOpen(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tactical Earth observation interface powered by EuroSAT-calibrated ResNet-50 models. Generates 64×64 pixel surface inference chips with Bayesian temperature calibration and multi-temporal change matrix dynamics.
            </p>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Spectral Bands</span>
                <span className="font-bold text-slate-200">13 Bands (VNIR/SWIR)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Ground Resolution</span>
                <span className="font-bold text-slate-200">10m / Pixel (GSD)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Classes</span>
                <span className="font-bold text-slate-200">10 Land Cover Types</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">ECE Loss (Temp)</span>
                <span className="font-bold text-emerald-400">0.021 (Calibrated)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Sentinel-2 L2A BOA Reflectance</span>
              <a
                href="https://github.com/Pradhyumna51/enviro-sat"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:underline"
              >
                <span>GitHub Repo</span>
                <ExternalLink className="size-2.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
