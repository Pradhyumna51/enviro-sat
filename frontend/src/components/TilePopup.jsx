import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react'

/**
 * Popup component for a clicked satellite tile.
 * Displays classified category, calibrated confidence, or before/after multi-temporal transition.
 */
export default function TilePopup({ feature, mode }) {
  const p = feature.properties

  if (mode === 'change') {
    return (
      <div className="w-64 flex flex-col gap-2 p-1 font-sans">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400 font-semibold">{p.tile_id}</span>
          <div className="flex gap-1">
            {p.is_changed ? (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Shift Detected
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Stable
              </Badge>
            )}
            {p.needs_review && (
              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                Review
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-2 rounded-md bg-slate-950/80 border border-slate-800">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">T1 Baseline</span>
            <span className="text-xs font-bold text-slate-200">{p.class_before}</span>
            <span className="text-[10px] text-slate-400 font-mono">{(p.confidence_before * 100).toFixed(1)}%</span>
          </div>
          <ArrowRight className="size-4 text-slate-500 shrink-0 mx-1" />
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">T2 Target</span>
            <span className="text-xs font-bold text-blue-400">{p.class_after}</span>
            <span className="text-[10px] text-slate-400 font-mono">{(p.confidence_after * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] px-1">
          <span className="text-slate-400">Transition:</span>
          <span className="font-semibold text-slate-200">{p.change_type}</span>
        </div>

        <div className="text-[9px] font-mono text-slate-500 text-right">
          Grid: ({p.grid_row}, {p.grid_col})
        </div>
      </div>
    )
  }

  // Classify mode
  const topProbs = p.class_probabilities
    ? Object.entries(p.class_probabilities)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    : []

  return (
    <div className="w-60 flex flex-col gap-2 p-1 font-sans">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-slate-400 font-semibold">{p.tile_id}</span>
        {p.needs_review ? (
          <Badge variant="warning" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
            <AlertCircle className="size-2.5" /> Review
          </Badge>
        ) : (
          <Badge variant="success" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
            <CheckCircle2 className="size-2.5" /> High Conf
          </Badge>
        )}
      </div>

      <div className="flex items-baseline justify-between p-2 rounded-md bg-slate-950/80 border border-slate-800">
        <div>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-semibold">Predicted Land Cover</span>
          <span className="text-sm font-bold text-white">{p.predicted_class}</span>
        </div>
        <div className="text-right font-mono">
          <span className="text-sm font-bold text-blue-400">{(p.confidence * 100).toFixed(1)}%</span>
        </div>
      </div>

      {topProbs.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Top Candidates</span>
          {topProbs.map(([cls, prob]) => (
            <div key={cls} className="flex items-center gap-2 text-[11px]">
              <span className="w-24 truncate text-slate-300">{cls}</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${Math.max(2, prob * 100)}%` }}
                />
              </div>
              <span className="w-9 text-right font-mono text-[10px] text-slate-400">
                {(prob * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="text-[9px] font-mono text-slate-500 text-right pt-1 border-t border-slate-800/80">
        Centroid: [{p.centroid?.[0]}, {p.centroid?.[1]}]
      </div>
    </div>
  )
}
