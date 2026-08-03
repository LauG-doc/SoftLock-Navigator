import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * LineSidebar - Collapsible sidebar with vertical accent line
 *
 * @param {React.ReactNode} children - Sidebar content
 * @param {string} title - Sidebar title
 * @param {boolean} defaultOpen - Initial open state (default: true)
 * @param {string} side - Sidebar position: 'left' or 'right' (default: 'right')
 * @param {number} width - Sidebar width in pixels (default: 320)
 * @param {string} className - Additional CSS classes
 */
export function LineSidebar({
  children,
  title,
  defaultOpen = true,
  side = 'right',
  width = 320,
  className
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const sidebarVariants = {
    open: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    closed: {
      x: side === 'right' ? width : -width,
      opacity: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    }
  }

  const toggleButtonPosition = side === 'right' ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed top-1/2 -translate-y-1/2 z-40 flex items-center justify-center',
          'w-8 h-16 rounded-l-lg bg-white border border-r-0 shadow-lg',
          'hover:bg-slate-50 transition-colors',
          toggleButtonPosition,
          side === 'right' ? 'rounded-r-none' : 'rounded-l-none'
        )}
        style={{ [side]: isOpen ? width : 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {side === 'right' ? (
          isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
        ) : (
          isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
        )}
      </motion.button>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial="closed"
            animate="open"
            exit="closed"
            variants={sidebarVariants}
            className={cn(
              'fixed top-0 h-full z-30 bg-white border-l shadow-xl overflow-y-auto',
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              className
            )}
            style={{ width }}
          >
            {/* Accent Line */}
            <div className={cn(
              'absolute top-0 bottom-0 w-1 bg-gradient-to-b from-blue-600 to-indigo-600',
              side === 'right' ? 'left-0' : 'right-0'
            )} />

            {/* Content */}
            <div className="p-6">
              {title && (
                <h3 className="text-lg font-semibold mb-4 text-slate-900">
                  {title}
                </h3>
              )}
              {children}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
