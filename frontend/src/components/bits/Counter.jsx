import React, { useEffect, useState, useRef } from 'react'
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Counter - Animated counting component for executive metrics
 *
 * @param {number} value - Target number to count to
 * @param {number} duration - Animation duration in milliseconds (default: 2000)
 * @param {string} suffix - Optional suffix (e.g., "%", "K", "M")
 * @param {string} prefix - Optional prefix (e.g., "$", "€")
 * @param {number} decimals - Number of decimal places (default: 0)
 * @param {string} className - Additional CSS classes
 * @param {boolean} playOnce - Only play animation once (default: true)
 */
export function Counter({
  value = 0,
  duration = 2000,
  suffix = '',
  prefix = '',
  decimals = 0,
  className,
  playOnce = true
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: playOnce, amount: 0.5 })
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100
  })
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (isInView) {
      motionValue.set(value)
    }
  }, [isInView, value, motionValue])

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(latest)
    })
    return unsubscribe
  }, [springValue])

  const formattedValue = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(displayValue)

  return (
    <motion.span
      ref={ref}
      className={cn('tabular-nums', className)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {prefix}
      {formattedValue}
      {suffix}
    </motion.span>
  )
}
