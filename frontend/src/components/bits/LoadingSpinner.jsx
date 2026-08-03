import React from 'react'
import { cn } from '@/lib/utils'

export function LoadingSpinner({ size = 'md', message, className }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-gray-300 border-t-primary',
          sizes[size]
        )}
      />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
