import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  size = 'md',
  variant = 'default',
  animate = true,
  className
}) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value)
      return
    }

    const duration = 800
    const steps = 40
    const increment = value / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(current)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value, animate])

  const percentage = Math.min(Math.round((displayValue / max) * 100), 100)

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  const getVariantColor = () => {
    if (variant !== 'default') return variant

    if (percentage >= 90) return 'green'
    if (percentage >= 70) return 'yellow'
    if (percentage >= 50) return 'orange'
    return 'red'
  }

  const variantColor = getVariantColor()

  const variantStyles = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    slate: 'bg-slate-500',
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="font-medium text-slate-700">{label}</span>}
          {showPercentage && (
            <span className="tabular-nums text-slate-600">{percentage}%</span>
          )}
        </div>
      )}
      <div className={cn('w-full overflow-hidden rounded-full bg-slate-100', sizes[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            variantStyles[variantColor]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
