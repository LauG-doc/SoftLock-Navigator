import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * MagicBento - Adaptive grid layout with varying card heights
 *
 * @param {React.ReactNode} children - Grid items
 * @param {number} cols - Number of columns (default: 3, responsive: sm=1, md=2, lg=3)
 * @param {string} gap - Gap between items (default: 6)
 * @param {string} className - Additional CSS classes
 */
export function MagicBento({ children, cols = 3, gap = 6, className }) {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  const gapClass = {
    2: 'gap-2',
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8'
  }

  return (
    <div className={cn('grid', colsClass[cols], gapClass[gap], className)}>
      {React.Children.map(children, (child, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: index * 0.1,
            ease: 'easeOut'
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}

/**
 * BentoCard - Individual card for MagicBento grid
 *
 * @param {React.ReactNode} children - Card content
 * @param {string} span - Column span: '1', '2', 'full'
 * @param {string} className - Additional CSS classes
 */
export function BentoCard({ children, span = '1', className }) {
  const spanClass = {
    '1': '',
    '2': 'md:col-span-2',
    'full': 'col-span-full'
  }

  return (
    <div className={cn('rounded-lg border bg-card p-6 shadow-sm', spanClass[span], className)}>
      {children}
    </div>
  )
}
