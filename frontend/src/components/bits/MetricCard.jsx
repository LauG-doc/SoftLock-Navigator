import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend = 'neutral',
  trendValue,
  color = 'blue',
  isLoading = false,
  animate = true,
  className
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!animate || isLoading || typeof value !== 'number') {
      setDisplayValue(value)
      return
    }

    const duration = 1000
    const steps = 30
    const increment = value / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value, animate, isLoading])

  const colorStyles = {
    blue: {
      icon: 'bg-blue-500/10 text-blue-600',
      trend: 'text-blue-600',
      value: 'text-slate-900',
    },
    green: {
      icon: 'bg-green-500/10 text-green-600',
      trend: 'text-green-600',
      value: 'text-green-600',
    },
    red: {
      icon: 'bg-red-500/10 text-red-600',
      trend: 'text-red-600',
      value: 'text-red-600',
    },
    yellow: {
      icon: 'bg-yellow-500/10 text-yellow-600',
      trend: 'text-yellow-600',
      value: 'text-yellow-600',
    },
    slate: {
      icon: 'bg-slate-500/10 text-slate-600',
      trend: 'text-slate-600',
      value: 'text-slate-900',
    },
  }

  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  }

  const TrendIcon = trendIcons[trend]
  const styles = colorStyles[color]

  if (isLoading) {
    return (
      <div className={cn(
        'group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md',
        className
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-12 w-12 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md',
      mounted && 'animate-scale-in',
      className
    )}>
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-50/50 opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-3xl font-bold tabular-nums', styles.value)}>
              {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
            </span>
            {trendValue && (
              <span className={cn('flex items-center gap-1 text-sm font-medium', styles.trend)}>
                <TrendIcon className="h-3 w-3" />
                {trendValue}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div className={cn('rounded-lg p-3', styles.icon)}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  )
}
