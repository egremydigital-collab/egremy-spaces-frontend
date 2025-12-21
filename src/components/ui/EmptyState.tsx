import * as React from 'react'
import { cn } from '@/lib/utils'
import { FolderOpen } from 'lucide-react'

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center py-12 px-4 text-center',
          className
        )}
        {...props}
      >
        <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
          {icon || <FolderOpen className="w-6 h-6 text-text-secondary" />}
        </div>
        <h3 className="text-lg font-medium text-text-primary mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-text-secondary max-w-sm mb-4">{description}</p>
        )}
        {action}
      </div>
    )
  }
)

EmptyState.displayName = 'EmptyState'

export { EmptyState }
