import React from 'react'
import { ArrowRight, AlertCircle, CheckCircle2, Sparkles, Eye } from 'lucide-react'

/**
 * TilePopup — Tactical HUD preview popup displayed on map tile hover/click.
 */
export default function TilePopup({ feature, mode }) {
  const p = feature.properties

  if (mode === 'change') {
    return (
      <div className="w-68 flex flex-col gap-2.5 p-1 font-sans">
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
          <span className="text-[10px] font-mono text-cyan-400 font-bold tracking-wider">
            {p.tile_id || 'S2_CHIP'}
          </span>
          <div className="flex gap-1 font-mono">
            {p.is_changed ? (
              <span className="rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[9px] font-bold px-2 py-0.5">
                Shift Detected
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold px-2 py-0.5">
                Stable
              </span>
            )}
            {p.needs_review && (
              <span className="rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold px-1.5 py-0.5">
                Review
              </span>
            )}
          </div>
        </div>

        {/* Transition Comparison */}
        <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-slate-900/90 border border-white/5 font-mono">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold">T1 Baseline</span>
            <span className="text-xs font-bold text-slate-200 truncate">{p.class_before}</span>
            <span className="text-[9px] text-slate-400">{(p.confidence_before * 100).toFixed(0)}%</span>
          </div>

          <div className="flex flex-col items-end text-right">
            <span className="text-[8px] uppercase tracking-wider text-cyan-400 font-semibold">T2 Current</span>
            <span className="text-xs font-bold text-cyan-300 truncate">{p.class_after}</span>
            <span className="text-[9px] text-slate-400">{(p.confidence_after * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] px-1">
          <span className="text-slate-400 font-mono text-[10px]">Transition:</span>
          <span className="font-bold text-slate-200">{p.change_type}</span>
        </div>

        <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-cyan-400">
          <span>Grid ({p.grid_row}, {p.grid_col})</span>
          <span className="flex items-center gap-0.5">
            <Eye className="size-2.5" />
            <span>Click to Inspect</span>
          </span>
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
    <div className="w-64 flex flex-col gap-2.5 p-1 font-sans">
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
        <span className="text-[10px] font-mono text-cyan-400 font-bold tracking-wider">
          {p.tile_id || 'S2_CHIP'}
        </span>
        {p.needs_review ? (
          <span className="rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold px-2 py-0.5 flex items-center gap-1 font-mono">
            <AlertCircle className="size-2.5" /> Review
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold px-2 py-0.5 flex items-center gap-1 font-mono">
            <CheckCircle2 className="size-2.5" /> Calibrated
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between p-2.5 rounded-xl bg-slate-900/90 border border-white/5">
        <div>
          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono block font-bold">
            Classification
          </span>
          <span className="text-sm font-bold text-white tracking-tight">{p.predicted_class}</span>
        </div>
        <div className="text-right font-mono">
          <span className="text-sm font-bold text-cyan-400">{(p.confidence * 100).toFixed(1)}%</span>
        </div>
      </div>

      {topProbs.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-0.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Confidence Distribution
          </span>
          {topProbs.map(([cls, prob]) => (
            <div key={cls} className="flex items-center gap-2 text-[11px]">
              <span className="w-24 truncate text-slate-300">{cls}</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-950 border border-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-400"
                  style={{ width: `${Math.max(2, prob * 100)}%` }}
                />
              </div>
              <span className="w-9 text-right font-mono text-[9px] text-slate-400">
                {(prob * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-cyan-400">
        <span>Centroid [{p.centroid?.[0]}, {p.centroid?.[1]}]</span>
        <span className="flex items-center gap-0.5">
          <Eye className="size-2.5" />
          <span>Click to Inspect</span>
        </span>
      </div>
    </div>
  )
}
