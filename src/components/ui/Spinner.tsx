import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = 'md', ...props }, ref) => {
    const sizes = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
    }

    return (
      <div ref={ref} className={cn('text-accent-primary', className)} {...props}>
        <Loader2 className={cn('animate-spin', sizes[size])} />
      </div>
    )
  }
)

Spinner.displayName = 'Spinner'

// Full page loading spinner
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-bg-primary">
    <div className="flex flex-col items-center gap-4">
      <Spinner size="lg" />
      <p className="text-text-secondary text-sm">Cargando...</p>
    </div>
  </div>
)

export { Spinner, PageLoader }
