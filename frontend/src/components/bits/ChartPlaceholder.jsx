import React from 'react'
import { cn } from '@/lib/utils'
import { BarChart3, PieChart, TrendingUp, Grid3x3 } from 'lucide-react'

const chartIcons = {
  bar: BarChart3,
  pie: PieChart,
  line: TrendingUp,
  heatmap: Grid3x3,
}

export function ChartPlaceholder({ type = 'bar', height = 'h-64', title, className }) {
  const Icon = chartIcons[type]

  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-8',
      height,
      className
    )}>
      <div className="rounded-full bg-white p-4 shadow-sm">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-600">
        {title || 'Chart Visualization'}
      </p>
      <p className="mt-1 text-xs text-slate-400">Data visualization coming soon</p>
    </div>
  )
}
