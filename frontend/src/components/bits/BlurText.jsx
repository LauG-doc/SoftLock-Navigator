import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * BlurText - Text with blur-to-focus animation
 *
 * @param {string} text - Text to animate
 * @param {React.ReactNode} children - Alternative to text prop
 * @param {string} as - HTML element: 'h1', 'h2', 'h3', 'p', 'span' (default: 'p')
 * @param {number} delay - Delay before animation starts (in seconds, default: 0)
 * @param {number} duration - Animation duration (in seconds, default: 1)
 * @param {boolean} once - Only animate once (default: true)
 * @param {string} className - Additional CSS classes
 */
export function BlurText({
  text,
  children,
  as = 'p',
  delay = 0,
  duration = 1,
  once = true,
  className
}) {
  const Component = motion[as] || motion.p

  const content = children || text

  return (
    <Component
      initial={{
        opacity: 0,
        filter: 'blur(10px)'
      }}
      whileInView={{
        opacity: 1,
        filter: 'blur(0px)'
      }}
      viewport={{ once, amount: 0.5 }}
      transition={{
        delay,
        duration,
        ease: 'easeOut'
      }}
      className={cn(className)}
    >
      {content}
    </Component>
  )
}

/**
 * BlurWords - Word-by-word blur-to-focus animation
 *
 * @param {string} text - Text to animate
 * @param {string} as - HTML element (default: 'p')
 * @param {number} delay - Initial delay (default: 0)
 * @param {number} stagger - Delay between words (default: 0.1)
 * @param {number} duration - Duration per word (default: 0.5)
 * @param {string} className - Additional CSS classes
 */
export function BlurWords({
  text,
  as = 'p',
  delay = 0,
  stagger = 0.1,
  duration = 0.5,
  className
}) {
  const Component = motion[as] || motion.p

  const words = text.split(' ')

  return (
    <Component className={cn('inline-block', className)}>
      {words.map((word, index) => (
        <motion.span
          key={index}
          initial={{
            opacity: 0,
            filter: 'blur(10px)'
          }}
          whileInView={{
            opacity: 1,
            filter: 'blur(0px)'
          }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{
            delay: delay + index * stagger,
            duration,
            ease: 'easeOut'
          }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </Component>
  )
}
