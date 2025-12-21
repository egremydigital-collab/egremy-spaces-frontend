import * as React from 'react'
import { cn, STATUS_CONFIG } from '@/lib/utils'
import type { TaskStatus } from '@/types'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  status?: TaskStatus
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', status, children, ...props }, ref) => {
    // Si se proporciona un status, usar la configuración de ese status
    if (status) {
      const config = STATUS_CONFIG[status]
      return (
        <span
          ref={ref}
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            config.bgClass,
            config.textClass,
            className
          )}
          {...props}
        >
          {children || config.label}
        </span>
      )
    }

    // Variantes manuales
    const variants = {
      default: 'bg-bg-tertiary text-text-secondary',
      success: 'bg-accent-success/20 text-accent-success',
      warning: 'bg-accent-warning/20 text-accent-warning',
      danger: 'bg-accent-danger/20 text-accent-danger',
      info: 'bg-accent-primary/20 text-accent-primary',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }
