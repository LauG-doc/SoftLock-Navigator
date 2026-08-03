import React from 'react'
import { cn } from '@/lib/utils'

/**
 * DotGrid - Subtle background dot pattern for depth
 *
 * @param {React.ReactNode} children - Content to overlay on dot grid
 * @param {string} dotColor - Dot color (default: 'slate')
 * @param {string} dotSize - Dot size: 'sm', 'md', 'lg' (default: 'sm')
 * @param {string} spacing - Grid spacing: 'tight', 'normal', 'relaxed' (default: 'normal')
 * @param {number} opacity - Dot opacity 0-100 (default: 20)
 * @param {string} className - Additional CSS classes
 */
export function DotGrid({
  children,
  dotColor = 'slate',
  dotSize = 'sm',
  spacing = 'normal',
  opacity = 20,
  className
}) {
  const sizeMap = {
    sm: 1,
    md: 1.5,
    lg: 2
  }

  const spacingMap = {
    tight: 16,
    normal: 24,
    relaxed: 32
  }

  const colorMap = {
    slate: 'rgb(148, 163, 184)',
    blue: 'rgb(59, 130, 246)',
    indigo: 'rgb(99, 102, 241)',
    gray: 'rgb(156, 163, 175)'
  }

  const size = sizeMap[dotSize]
  const gap = spacingMap[spacing]
  const color = colorMap[dotColor] || colorMap.slate

  // SVG pattern for dots
  const patternId = `dot-grid-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className={cn('relative', className)}>
      {/* SVG Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id={patternId}
              x="0"
              y="0"
              width={gap}
              height={gap}
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx={size}
                cy={size}
                r={size}
                fill={color}
                opacity={opacity / 100}
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
