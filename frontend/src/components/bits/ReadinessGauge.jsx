import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ReadinessGauge({ value, label, className }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 1200
    const steps = 60
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
  }, [value])

  const getColor = () => {
    if (displayValue >= 90) return 'text-green-600'
    if (displayValue >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const circumference = 2 * Math.PI * 70
  const offset = circumference - (displayValue / 100) * circumference

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="relative h-48 w-48">
        <svg className="h-full w-full -rotate-90 transform">
          <circle
            cx="96"
            cy="96"
            r="70"
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx="96"
            cy="96"
            r="70"
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn('transition-all duration-1000 ease-out', getColor())}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-4xl font-bold', getColor())}>{displayValue}%</span>
        </div>
      </div>
      {label && <p className="text-center text-sm font-medium text-muted-foreground">{label}</p>}
    </div>
  )
}
