import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  className
}) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center',
      className
    )}>
      {Icon && (
        <div className="rounded-full bg-white p-4 shadow-sm">
          <Icon className="h-10 w-10 text-slate-400" />
        </div>
      )}
      {title && (
        <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      )}
      {description && (
        <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && actionLabel && (
        <Button onClick={action} className="mt-6">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
