import React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'

const statusConfig = {
  ready: {
    icon: CheckCircle,
    label: 'Ready',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    iconColor: 'text-green-600',
  },
  blocked: {
    icon: XCircle,
    label: 'Blocked',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    iconColor: 'text-red-600',
  },
  warning: {
    icon: AlertCircle,
    label: 'Warning',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    iconColor: 'text-yellow-600',
  },
  pending: {
    icon: Clock,
    label: 'Pending',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    iconColor: 'text-slate-600',
  },
}

export function StatusBadge({ status = 'pending', customLabel, size = 'md', showIcon = true, className }) {
  const config = statusConfig[status]
  const Icon = config.icon

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        config.bg,
        config.text,
        config.border,
        sizes[size],
        className
      )}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      <span>{customLabel || config.label}</span>
    </div>
  )
}
