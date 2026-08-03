import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * FadeContent - Progressive content reveal with staggered delays
 *
 * @param {React.ReactNode} children - Content to fade in
 * @param {number} delay - Delay before animation starts (in seconds, default: 0)
 * @param {number} duration - Animation duration (in seconds, default: 0.6)
 * @param {string} direction - Fade direction: 'up', 'down', 'left', 'right', 'none' (default: 'up')
 * @param {number} distance - Distance to travel during fade (in pixels, default: 20)
 * @param {boolean} once - Only animate once (default: true)
 * @param {string} className - Additional CSS classes
 */
export function FadeContent({
  children,
  delay = 0,
  duration = 0.6,
  direction = 'up',
  distance = 20,
  once = true,
  className
}) {
  const directionVariants = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {}
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...directionVariants[direction] }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once, amount: 0.3 }}
      transition={{
        duration,
        delay,
        ease: 'easeOut'
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

/**
 * FadeGroup - Wrapper for staggered fade animations
 *
 * @param {React.ReactNode} children - Items to stagger
 * @param {number} stagger - Delay between each child (in seconds, default: 0.1)
 * @param {string} direction - Fade direction (default: 'up')
 * @param {string} className - Additional CSS classes
 */
export function FadeGroup({ children, stagger = 0.1, direction = 'up', className }) {
  return (
    <div className={cn(className)}>
      {React.Children.map(children, (child, index) => (
        <FadeContent delay={index * stagger} direction={direction}>
          {child}
        </FadeContent>
      ))}
    </div>
  )
}
