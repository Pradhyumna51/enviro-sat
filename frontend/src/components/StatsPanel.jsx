import React from 'react'
import { CLASS_COLORS, CHANGE_COLORS } from '@/utils/colors'
import { BarChart3, Clock, TrendingUp, Cpu, CheckCircle2, ShieldAlert } from 'lucide-react'

/**
 * StatsPanel — High-density tactical telemetry analytics deck.
 * Displays KPI metrics, transition dynamics, and land-cover composition.
 */
export default function StatsPanel({ data, mode }) {
  if (!data || !data.metadata) return null

  const meta = data.metadata

  if (mode === 'change') {
    const summary = meta.transition_summary || {}
    const entries = Object.entries(summary).sort(([, a], [, b]) => b - a)
    const maxVal = Math.max(...entries.map(([, v]) => v), 1)

    return (
      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 flex flex-col gap-3 font-sans shadow-md">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <TrendingUp className="size-3.5 text-amber-400" />
            <span>Temporal Shift Analytics</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
            {meta.change_rate_percent}% Shift Rate
          </span>
        </div>

        {/* KPI Triad */}
        <div className="grid grid-cols-3 gap-1.5 font-mono">
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/90 border border-red-500/20">
            <span className="text-xs font-bold text-red-400">{meta.changed_tiles_count}</span>
            <span className="text-[8px] uppercase tracking-wider text-slate-400 mt-0.5">Shifted</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/90 border border-emerald-500/20">
            <span className="text-xs font-bold text-emerald-400">
              {meta.total_tiles - meta.changed_tiles_count}
            </span>
            <span className="text-[8px] uppercase tracking-wider text-slate-400 mt-0.5">Stable</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/90 border border-white/5">
            <span className="text-xs font-bold text-slate-200">{meta.total_tiles}</span>
            <span className="text-[8px] uppercase tracking-wider text-slate-400 mt-0.5">Chips</span>
          </div>
        </div>

        {/* Dynamic Transition Matrix Bars */}
        {entries.length > 0 ? (
          <div className="flex flex-col gap-2 mt-0.5">
            <span className="text-[9px] font-bold uppercase tracking-widest font-mono text-slate-400">
              Transition Dynamics
            </span>
            <div className="flex flex-col gap-1.5">
              {entries.map(([type, count]) => (
                <div key={type} className="flex flex-col gap-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="truncate max-w-[200px]" title={type}>
                      {type}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-900 border border-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(4, (count / maxVal) * 100)}%`,
                        backgroundColor: CHANGE_COLORS[type] || '#8b5cf6',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 text-center py-2.5 bg-slate-900/40 rounded-xl border border-dashed border-white/10 font-mono">
            No significant transitions detected
          </div>
        )}

        {/* Telemetry Footer */}
        <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-2 border-t border-white/5">
          <span className="flex items-center gap-1">
            <Clock className="size-3 text-cyan-400" />
            {meta.processing_time_ms}ms
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="size-3 text-cyan-400" />
            Gate: {(meta.confidence_threshold * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    )
  }

  // Classify mode
  const dist = meta.class_distribution || {}
  const entries = Object.entries(dist).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
  const maxVal = Math.max(...entries.map(([, v]) => v), 1)

  return (
    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 flex flex-col gap-3 font-sans shadow-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <BarChart3 className="size-3.5 text-cyan-400" />
          <span>Surface Composition</span>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
          {meta.total_tiles} Chips Evaluated
        </span>
      </div>

      {/* KPI Triad */}
      <div className="grid grid-cols-3 gap-1.5 font-mono">
        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/90 border border-cyan-500/20">
          <span className="text-xs font-bold text-cyan-400">{meta.total_tiles}</span>
          <span className="text-[8px] uppercase tracking-wider text-slate-400 mt-0.5">Segmented</span>
        </div>
        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/90 border border-amber-500/20">
          <span className="text-xs font-bold text-amber-400">{meta.tiles_needing_review}</span>
          <span className="text-[8px] uppercase tracking-wider text-slate-400 mt-0.5">Review</span>
        </div>
        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/90 border border-white/5">
          <span className="text-xs font-bold text-slate-200">{meta.review_rate_percent}%</span>
          <span className="text-[8px] uppercase tracking-wider text-slate-400 mt-0.5">Uncertain</span>
        </div>
      </div>

      {/* Distribution Bars */}
      {entries.length > 0 && (
        <div className="flex flex-col gap-2 mt-0.5">
          <span className="text-[9px] font-bold uppercase tracking-widest font-mono text-slate-400">
            Land Cover Taxonomy Breakdown
          </span>
          <div className="flex flex-col gap-1.5">
            {entries.map(([cls, count]) => (
              <div key={cls} className="flex flex-col gap-1 text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="truncate max-w-[200px]" title={cls}>
                    {cls}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-900 border border-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(4, (count / maxVal) * 100)}%`,
                      backgroundColor: CLASS_COLORS[cls] || '#38bdf8',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Telemetry Footer */}
      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-2 border-t border-white/5">
        <span className="flex items-center gap-1">
          <Clock className="size-3 text-cyan-400" />
          {meta.processing_time_ms}ms
        </span>
        <span className="flex items-center gap-1">
          <Cpu className="size-3 text-cyan-400" />
          Gate: {(meta.confidence_threshold * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  )
}
