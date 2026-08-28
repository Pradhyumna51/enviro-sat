import React from 'react'
import { CLASS_COLORS, CHANGE_COLORS } from '@/utils/colors'
import { Layers, HelpCircle } from 'lucide-react'

/**
 * Legend — Tactical glassmorphism taxonomy card.
 * Features glowing color swatches for EuroSAT classes and multi-temporal shifts.
 */
export default function Legend({ mode }) {
  const items =
    mode === 'change'
      ? Object.entries(CHANGE_COLORS)
      : Object.entries(CLASS_COLORS)

  return (
    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 flex flex-col gap-2.5 font-sans shadow-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <Layers className="size-3.5 text-cyan-400" />
          <span>{mode === 'change' ? 'Transition Dynamics' : 'EuroSAT Land Cover'}</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
          {items.length} Classes
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-0.5">
        {items.map(([label, color]) => (
          <div
            key={label}
            className="flex items-center gap-2 text-[11px] text-slate-300 hover:text-white transition-colors group cursor-default"
            title={label}
          >
            <span
              className="size-2 rounded-full shrink-0 ring-2 ring-white/10 group-hover:scale-125 transition-transform"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}40`,
              }}
            />
            <span className="truncate">{label}</span>
          </div>
        ))}

        <div className="flex items-center gap-2 text-[11px] text-amber-400/90 col-span-2 mt-1 pt-1.5 border-t border-white/5">
          <span className="size-2 rounded-full shrink-0 border border-dashed border-amber-400 bg-amber-400/20" />
          <span className="truncate font-medium font-mono text-[10px]">
            Uncertain Prediction (Below Threshold)
          </span>
        </div>
      </div>
    </div>
  )
}
