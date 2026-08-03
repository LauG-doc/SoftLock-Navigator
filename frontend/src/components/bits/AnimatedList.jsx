import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * AnimatedList - List with staggered item animations
 *
 * @param {Array} items - Array of items to display
 * @param {Function} renderItem - Function to render each item (item, index) => ReactNode
 * @param {string} direction - Animation direction: 'up', 'down' (default: 'up')
 * @param {number} stagger - Delay between items (in seconds, default: 0.05)
 * @param {boolean} animateExit - Animate items on removal (default: false)
 * @param {string} className - Additional CSS classes for container
 * @param {string} itemClassName - Additional CSS classes for items
 */
export function AnimatedList({
  items = [],
  renderItem,
  direction = 'up',
  stagger = 0.05,
  animateExit = false,
  className,
  itemClassName
}) {
  const variants = {
    hidden: {
      opacity: 0,
      y: direction === 'up' ? 20 : -20
    },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * stagger,
        duration: 0.5,
        ease: 'easeOut'
      }
    }),
    exit: {
      opacity: 0,
      y: direction === 'up' ? -20 : 20,
      transition: { duration: 0.3 }
    }
  }

  const content = items.map((item, index) => (
    <motion.div
      key={item.id || index}
      custom={index}
      initial="hidden"
      animate="visible"
      exit={animateExit ? "exit" : undefined}
      variants={variants}
      className={cn(itemClassName)}
    >
      {renderItem(item, index)}
    </motion.div>
  ))

  return (
    <div className={cn('space-y-2', className)}>
      {animateExit ? (
        <AnimatePresence mode="popLayout">
          {content}
        </AnimatePresence>
      ) : (
        content
      )}
    </div>
  )
}

/**
 * AnimatedListItem - Pre-styled list item component
 *
 * @param {React.ReactNode} children - Item content
 * @param {string} variant - Style variant: 'default', 'success', 'warning', 'danger'
 * @param {React.ReactNode} icon - Optional icon element
 * @param {string} className - Additional CSS classes
 */
export function AnimatedListItem({ children, variant = 'default', icon, className }) {
  const variantStyles = {
    default: 'border-slate-200 bg-white hover:bg-slate-50',
    success: 'border-green-200 bg-green-50/50 hover:bg-green-50',
    warning: 'border-amber-200 bg-amber-50/50 hover:bg-amber-50',
    danger: 'border-red-200 bg-red-50/50 hover:bg-red-50',
    info: 'border-blue-200 bg-blue-50/50 hover:bg-blue-50'
  }

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-lg border p-4 transition-colors',
      variantStyles[variant],
      className
    )}>
      {icon && (
        <div className="flex-shrink-0 mt-0.5">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
