import React from 'react'
import { CLASS_COLORS, CHANGE_COLORS } from '@/utils/colors'
import { BarChart3, Clock, TrendingUp } from 'lucide-react'

/**
 * StatsPanel — Analytical results summary and distribution bars.
 */
export default function StatsPanel({ data, mode }) {
  if (!data || !data.metadata) return null

  const meta = data.metadata

  if (mode === 'change') {
    const summary = meta.transition_summary || {}
    const entries = Object.entries(summary).sort(([, a], [, b]) => b - a)
    const maxVal = Math.max(...entries.map(([, v]) => v), 1)

    return (
      <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-3 font-sans">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <TrendingUp className="size-3.5 text-amber-400" />
            <span>Temporal Shift Summary</span>
          </div>
          <span className="text-[11px] font-mono text-amber-400 font-semibold">
            {meta.change_rate_percent}% Shift Rate
          </span>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-3 gap-2 font-mono text-center">
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-xs font-bold text-red-400 block">{meta.changed_tiles_count}</span>
            <span className="text-[9px] text-slate-400 uppercase">Changed</span>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-xs font-bold text-emerald-400 block">
              {meta.total_tiles - meta.changed_tiles_count}
            </span>
            <span className="text-[9px] text-slate-400 uppercase">Stable</span>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-xs font-bold text-slate-200 block">{meta.total_tiles}</span>
            <span className="text-[9px] text-slate-400 uppercase">Total Chips</span>
          </div>
        </div>

        {/* Transition Bars */}
        {entries.length > 0 ? (
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Transition Types
            </span>
            {entries.map(([type, count]) => (
              <div key={type} className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="truncate max-w-[190px]" title={type}>
                    {type}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(4, (count / maxVal) * 100)}%`,
                      backgroundColor: CHANGE_COLORS[type] || '#8b5cf6',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 text-center py-2 bg-slate-900/50 rounded border border-slate-800">
            No high-confidence changes detected
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-800">
          <span className="flex items-center gap-1">
            <Clock className="size-3 text-slate-500" />
            Inference: {meta.processing_time_ms}ms
          </span>
          <span>Threshold: {(meta.confidence_threshold * 100).toFixed(0)}%</span>
        </div>
      </div>
    )
  }

  // Classify mode
  const dist = meta.class_distribution || {}
  const entries = Object.entries(dist).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
  const maxVal = Math.max(...entries.map(([, v]) => v), 1)

  return (
    <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-3 font-sans">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <BarChart3 className="size-3.5 text-blue-400" />
          <span>Land Cover Distribution</span>
        </div>
        <span className="text-[11px] font-mono text-blue-400 font-semibold">
          {meta.total_tiles} Chips
        </span>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-3 gap-2 font-mono text-center">
        <div className="p-2 rounded bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-blue-400 block">{meta.total_tiles}</span>
          <span className="text-[9px] text-slate-400 uppercase">Classified</span>
        </div>
        <div className="p-2 rounded bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-amber-400 block">{meta.tiles_needing_review}</span>
          <span className="text-[9px] text-slate-400 uppercase">Review</span>
        </div>
        <div className="p-2 rounded bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-200 block">{meta.review_rate_percent}%</span>
          <span className="text-[9px] text-slate-400 uppercase">Uncertain</span>
        </div>
      </div>

      {/* Distribution Bars */}
      {entries.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Composition Breakdown
          </span>
          {entries.map(([cls, count]) => (
            <div key={cls} className="flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="truncate max-w-[190px]" title={cls}>
                  {cls}
                </span>
                <span className="font-mono text-[11px] text-slate-400">{count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(4, (count / maxVal) * 100)}%`,
                    backgroundColor: CLASS_COLORS[cls] || '#3b82f6',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-800">
        <span className="flex items-center gap-1">
          <Clock className="size-3 text-slate-500" />
          Inference: {meta.processing_time_ms}ms
        </span>
        <span>Threshold: {(meta.confidence_threshold * 100).toFixed(0)}%</span>
      </div>
    </div>
  )
}
