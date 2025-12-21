import * as React from 'react'
import { cn, getInitials, getAvatarColor } from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, name, size = 'md', ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false)
    
    const sizes = {
      sm: 'w-6 h-6 text-xs',
      md: 'w-8 h-8 text-sm',
      lg: 'w-10 h-10 text-base',
    }

    const showFallback = !src || imageError

    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-full overflow-hidden flex items-center justify-center font-medium',
          sizes[size],
          showFallback && getAvatarColor(name),
          className
        )}
        {...props}
      >
        {showFallback ? (
          <span className="text-white">{getInitials(name)}</span>
        ) : (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'

// Avatar con indicador de estado
interface AvatarWithStatusProps extends AvatarProps {
  status?: 'online' | 'offline' | 'busy'
}

const AvatarWithStatus = React.forwardRef<HTMLDivElement, AvatarWithStatusProps>(
  ({ status, className, ...props }, ref) => {
    const statusColors = {
      online: 'bg-accent-success',
      offline: 'bg-text-secondary',
      busy: 'bg-accent-danger',
    }

    return (
      <div className="relative" ref={ref}>
        <Avatar className={className} {...props} />
        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-bg-secondary',
              statusColors[status]
            )}
          />
        )}
      </div>
    )
  }
)

AvatarWithStatus.displayName = 'AvatarWithStatus'

export { Avatar, AvatarWithStatus }
