import React from 'react'
import { CLASS_COLORS, CHANGE_COLORS } from '@/utils/colors'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Clock, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react'

/**
 * Summary statistics panel with Tailwind progress bars and KPI metrics.
 */
export default function StatsPanel({ data, mode }) {
  if (!data || !data.metadata) return null

  const meta = data.metadata

  if (mode === 'change') {
    const summary = meta.transition_summary || {}
    const entries = Object.entries(summary).sort(([, a], [, b]) => b - a)
    const maxVal = Math.max(...entries.map(([, v]) => v), 1)

    return (
      <Card className="border-slate-800 bg-slate-900/60 shadow-sm mt-3">
        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <TrendingUp className="size-3.5 text-amber-400" />
            <span>Temporal Change Analytics</span>
          </div>
          <Badge variant="warning" className="text-[10px] px-1.5 py-0">
            {meta.change_rate_percent}% Shift
          </Badge>
        </CardHeader>
        <CardContent className="p-3 pt-1 flex flex-col gap-2.5">
          {/* KPI Metrics */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="flex flex-col items-center justify-center p-2 rounded-md bg-slate-950/70 border border-slate-800">
              <span className="text-xs font-bold text-red-400 font-mono">{meta.changed_tiles_count}</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Changed</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded-md bg-slate-950/70 border border-slate-800">
              <span className="text-xs font-bold text-emerald-400 font-mono">{meta.total_tiles - meta.changed_tiles_count}</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Stable</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded-md bg-slate-950/70 border border-slate-800">
              <span className="text-xs font-bold text-slate-200 font-mono">{meta.total_tiles}</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Total</span>
            </div>
          </div>

          {/* Transition Breakdown Bars */}
          {entries.length > 0 ? (
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Transition Dynamics
              </span>
              {entries.map(([type, count]) => (
                <div key={type} className="flex items-center gap-2 text-[11px]">
                  <span className="w-28 truncate text-slate-300" title={type}>{type}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-950 border border-slate-800/80 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(4, (count / maxVal) * 100)}%`,
                        backgroundColor: CHANGE_COLORS[type] || '#8b5cf6',
                      }}
                    />
                  </div>
                  <span className="w-6 text-right font-mono text-[10px] text-slate-400">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 text-center py-2 bg-slate-950/40 rounded border border-dashed border-slate-800">
              No high-confidence changes detected across timestamps.
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              Inference: {meta.processing_time_ms}ms
            </span>
            <span>Threshold: {(meta.confidence_threshold * 100).toFixed(0)}%</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Classify mode
  const dist = meta.class_distribution || {}
  const entries = Object.entries(dist).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
  const maxVal = Math.max(...entries.map(([, v]) => v), 1)

  return (
    <Card className="border-slate-800 bg-slate-900/60 shadow-sm mt-3">
      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <BarChart3 className="size-3.5 text-blue-400" />
          <span>Regional Distribution</span>
        </div>
        <Badge variant="default" className="text-[10px] px-1.5 py-0">
          {meta.total_tiles} Chips
        </Badge>
      </CardHeader>
      <CardContent className="p-3 pt-1 flex flex-col gap-2.5">
        {/* KPI Metrics */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="flex flex-col items-center justify-center p-2 rounded-md bg-slate-950/70 border border-slate-800">
            <span className="text-xs font-bold text-blue-400 font-mono">{meta.total_tiles}</span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400">Classified</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-md bg-slate-950/70 border border-slate-800">
            <span className="text-xs font-bold text-amber-400 font-mono">{meta.tiles_needing_review}</span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400">Review</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-md bg-slate-950/70 border border-slate-800">
            <span className="text-xs font-bold text-slate-200 font-mono">{meta.review_rate_percent}%</span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400">Uncertain</span>
          </div>
        </div>

        {/* Distribution Bars */}
        {entries.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Land Cover Composition
            </span>
            {entries.map(([cls, count]) => (
              <div key={cls} className="flex items-center gap-2 text-[11px]">
                <span className="w-28 truncate text-slate-300" title={cls}>{cls}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-950 border border-slate-800/80 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(4, (count / maxVal) * 100)}%`,
                      backgroundColor: CLASS_COLORS[cls] || '#3b82f6',
                    }}
                  />
                </div>
                <span className="w-6 text-right font-mono text-[10px] text-slate-400">{count}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            Inference: {meta.processing_time_ms}ms
          </span>
          <span>Threshold: {(meta.confidence_threshold * 100).toFixed(0)}%</span>
        </div>
      </CardContent>
    </Card>
  )
}
