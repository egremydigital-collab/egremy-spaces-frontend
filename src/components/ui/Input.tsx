import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, type = 'text', id, ...props }, ref) => {
    const inputId = id || React.useId()

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            'w-full px-3 py-2 bg-bg-tertiary border rounded-lg',
            'text-text-primary placeholder:text-text-secondary',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent',
            error
              ? 'border-accent-danger focus:ring-accent-danger'
              : 'border-bg-tertiary',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-accent-danger">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-sm text-text-secondary">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
