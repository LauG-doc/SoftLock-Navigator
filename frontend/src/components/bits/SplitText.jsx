import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * SplitText - Animated text with character-by-character reveal
 *
 * @param {string} text - Text to animate
 * @param {string} as - HTML element: 'h1', 'h2', 'h3', 'p', 'span' (default: 'p')
 * @param {number} delay - Delay before animation starts (in seconds, default: 0)
 * @param {number} stagger - Delay between each character (in seconds, default: 0.03)
 * @param {string} variant - Animation variant: 'slideUp', 'fadeIn', 'scale' (default: 'slideUp')
 * @param {boolean} once - Only animate once (default: true)
 * @param {string} className - Additional CSS classes
 */
export function SplitText({
  text,
  as = 'p',
  delay = 0,
  stagger = 0.03,
  variant = 'slideUp',
  once = true,
  className
}) {
  const Component = motion[as] || motion.p

  const variants = {
    slideUp: {
      hidden: { y: 20, opacity: 0 },
      visible: { y: 0, opacity: 1 }
    },
    fadeIn: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 }
    },
    scale: {
      hidden: { scale: 0.8, opacity: 0 },
      visible: { scale: 1, opacity: 1 }
    }
  }

  const characters = text.split('')

  return (
    <Component className={cn('inline-block', className)}>
      {characters.map((char, index) => (
        <motion.span
          key={index}
          initial="hidden"
          whileInView="visible"
          viewport={{ once, amount: 0.5 }}
          transition={{
            delay: delay + index * stagger,
            duration: 0.5,
            ease: 'easeOut'
          }}
          variants={variants[variant]}
          className="inline-block"
          style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char}
        </motion.span>
      ))}
    </Component>
  )
}

/**
 * SplitWords - Animated text with word-by-word reveal
 *
 * @param {string} text - Text to animate
 * @param {string} as - HTML element (default: 'p')
 * @param {number} delay - Initial delay (default: 0)
 * @param {number} stagger - Delay between words (default: 0.1)
 * @param {string} variant - Animation variant (default: 'slideUp')
 * @param {string} className - Additional CSS classes
 */
export function SplitWords({
  text,
  as = 'p',
  delay = 0,
  stagger = 0.1,
  variant = 'slideUp',
  className
}) {
  const Component = motion[as] || motion.p

  const variants = {
    slideUp: {
      hidden: { y: 20, opacity: 0 },
      visible: { y: 0, opacity: 1 }
    },
    fadeIn: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 }
    }
  }

  const words = text.split(' ')

  return (
    <Component className={cn('inline-block', className)}>
      {words.map((word, index) => (
        <motion.span
          key={index}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          transition={{
            delay: delay + index * stagger,
            duration: 0.5,
            ease: 'easeOut'
          }}
          variants={variants[variant]}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </Component>
  )
}
