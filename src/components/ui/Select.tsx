import * as React from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-text-primary">
            {label}
            {props.required && <span className="text-accent-danger ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full px-3 py-2 rounded-lg',
            'bg-bg-secondary border border-bg-tertiary',
            'text-text-primary text-sm',
            'focus:outline-none focus:ring-2 focus:ring-accent-primary/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-accent-danger focus:ring-accent-danger/50',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="text-xs text-accent-danger">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
