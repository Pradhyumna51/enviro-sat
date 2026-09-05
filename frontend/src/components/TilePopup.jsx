import React from 'react'

/**
 * TilePopup — Clean tooltip displayed on tile hover or click.
 */
export default function TilePopup({ feature, mode }) {
  const p = feature.properties

  if (mode === 'change') {
    return (
      <div className="w-60 flex flex-col gap-2 font-sans text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-1">
          <span className="font-mono text-xs font-semibold text-blue-400">
            {p.tile_id || 'TILE'}
          </span>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              p.is_changed
                ? 'bg-red-500/20 text-red-300'
                : 'bg-emerald-500/20 text-emerald-300'
            }`}
          >
            {p.is_changed ? 'Shift Detected' : 'Stable'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-2 rounded bg-slate-950 border border-slate-800 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-300 block">Baseline</span>
            <span className="font-semibold text-slate-200 truncate block">{p.class_before}</span>
            <span className="text-[10px] text-slate-400">{(p.confidence_before * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-300 block">Target</span>
            <span className="font-semibold text-blue-300 truncate block">{p.class_after}</span>
            <span className="text-[10px] text-slate-400">{(p.confidence_after * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="flex justify-between text-[11px]">
          <span className="text-slate-400">Transition:</span>
          <span className="font-medium text-slate-200">{p.change_type}</span>
        </div>

        <div className="text-[10px] text-slate-400 text-right pt-1 border-t border-slate-800 font-mono">
          Click chip for details
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
    <div className="w-56 flex flex-col gap-2 font-sans text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-1">
        <span className="font-mono text-xs font-semibold text-blue-400">
          {p.tile_id || 'TILE'}
        </span>
        {p.needs_review ? (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
            Review
          </span>
        ) : (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
            High Conf
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between p-2 rounded bg-slate-950 border border-slate-800">
        <div>
          <span className="text-[10px] text-slate-300 uppercase block font-semibold">
            Predicted
          </span>
          <span className="text-xs font-bold text-white">{p.predicted_class}</span>
        </div>
        <div className="text-right font-mono">
          <span className="text-xs font-bold text-blue-400">{(p.confidence * 100).toFixed(1)}%</span>
        </div>
      </div>

      {topProbs.length > 0 && (
        <div className="flex flex-col gap-1 pt-0.5">
          {topProbs.map(([cls, prob]) => (
            <div key={cls} className="flex items-center gap-1.5 text-[11px]">
              <span className="w-20 truncate text-slate-300">{cls}</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${Math.max(2, prob * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono text-[10px] text-slate-400">
                {(prob * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="text-[10px] text-slate-400 text-right pt-1 border-t border-slate-800 font-mono">
        Click chip for details
      </div>
    </div>
  )
}
