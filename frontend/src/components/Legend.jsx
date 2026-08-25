import React from 'react'
import { CLASS_COLORS, CHANGE_COLORS } from '@/utils/colors'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AlertCircle, Layers } from 'lucide-react'

/**
 * Color legend for EuroSAT classes (classify mode) or transition types (change mode).
 */
export default function Legend({ mode }) {
  const items = mode === 'change'
    ? Object.entries(CHANGE_COLORS)
    : Object.entries(CLASS_COLORS)

  return (
    <Card className="border-slate-800 bg-slate-900/60 shadow-sm mt-3">
      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Layers className="size-3.5 text-blue-400" />
          <span>{mode === 'change' ? 'Change Dynamics' : 'Land-Use Categories'}</span>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-slate-400">
          {items.length} classes
        </Badge>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
          {items.map(([label, color]) => (
            <div
              key={label}
              className="flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-white transition-colors group cursor-default"
              title={label}
            >
              <span
                className="size-2.5 rounded-full shrink-0 ring-1 ring-white/10 group-hover:scale-125 transition-transform"
                style={{ backgroundColor: color }}
              />
              <span className="truncate">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 col-span-2 mt-0.5 pt-1 border-t border-slate-800/80">
            <span className="size-2.5 rounded-full shrink-0 border border-dashed border-amber-400 bg-amber-400/20" />
            <span className="truncate font-medium">Uncertain / Needs Review</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
