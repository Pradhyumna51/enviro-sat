import React from 'react'
import { CLASS_COLORS, CHANGE_COLORS } from '@/utils/colors'
import { Layers } from 'lucide-react'

/**
 * Legend — Compact EuroSAT / Transition category taxonomy legend.
 */
export default function Legend({ mode }) {
  const items =
    mode === 'change'
      ? Object.entries(CHANGE_COLORS)
      : Object.entries(CLASS_COLORS)

  return (
    <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-2 font-sans">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 tracking-wide">
          <Layers className="size-3.5 text-blue-400" />
          <span>{mode === 'change' ? 'Change Classes' : 'Land-Use Categories'}</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {items.length} classes
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-0.5">
        {items.map(([label, color]) => (
          <div
            key={label}
            className="flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-white transition-colors cursor-default"
            title={label}
          >
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="truncate">{label}</span>
          </div>
        ))}

        <div className="flex items-center gap-1.5 text-[11px] text-amber-400 col-span-2 mt-1 pt-1.5 border-t border-slate-800">
          <span className="size-2 rounded-full shrink-0 border border-dashed border-amber-400 bg-amber-400/20" />
          <span className="truncate font-medium">Uncertain (Flagged for Review)</span>
        </div>
      </div>
    </div>
  )
}
