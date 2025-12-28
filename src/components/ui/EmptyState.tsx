import * as React from 'react'
import { cn } from '@/lib/utils'
import { 
  FolderOpen, 
  CheckCircle2, 
  Calendar, 
  Inbox, 
  LayoutGrid,
  Rocket,
  Plus,
  FileText,
  Bell,
  ClipboardList
} from 'lucide-react'
import { Button } from './Button'

// ============================================
// Preset configurations for common empty states
// ============================================
const PRESETS = {
  tasks: {
    icon: CheckCircle2,
    title: '¡Todo al día!',
    description: 'No tienes tareas pendientes. Disfruta el momento o crea una nueva.',
    gradient: 'from-accent-success/20 to-accent-success/5',
    iconColor: 'text-accent-success',
  },
  'no-tasks': {
    icon: ClipboardList,
    title: 'Sin tareas aún',
    description: 'Crea tu primera tarea para comenzar a organizar el trabajo.',
    gradient: 'from-accent-primary/20 to-accent-primary/5',
    iconColor: 'text-accent-primary',
  },
  project: {
    icon: LayoutGrid,
    title: 'Proyecto vacío',
    description: 'Agrega tareas para comenzar a gestionar este proyecto.',
    gradient: 'from-accent-primary/20 to-accent-primary/5',
    iconColor: 'text-accent-primary',
  },
  gantt: {
    icon: Calendar,
    title: 'Sin tareas programadas',
    description: 'Asigna fechas a tus tareas para visualizarlas en el timeline.',
    gradient: 'from-accent-warning/20 to-accent-warning/5',
    iconColor: 'text-accent-warning',
  },
  inbox: {
    icon: Inbox,
    title: 'Inbox vacío',
    description: 'No tienes notificaciones pendientes. ¡Estás al día!',
    gradient: 'from-accent-success/20 to-accent-success/5',
    iconColor: 'text-accent-success',
  },
  notifications: {
    icon: Bell,
    title: 'Sin notificaciones',
    description: 'Cuando haya actividad relevante, aparecerá aquí.',
    gradient: 'from-blue-500/20 to-blue-500/5',
    iconColor: 'text-blue-400',
  },
  projects: {
    icon: FolderOpen,
    title: 'Sin proyectos',
    description: 'Crea tu primer proyecto para organizar el trabajo de tu equipo.',
    gradient: 'from-accent-primary/20 to-accent-primary/5',
    iconColor: 'text-accent-primary',
  },
  documents: {
    icon: FileText,
    title: 'Sin documentos',
    description: 'Sube archivos para compartir con tu equipo.',
    gradient: 'from-purple-500/20 to-purple-500/5',
    iconColor: 'text-purple-400',
  },
  welcome: {
    icon: Rocket,
    title: '¡Bienvenido a Egremy Spaces!',
    description: 'Tu espacio de trabajo está listo. Comienza creando tu primer proyecto.',
    gradient: 'from-accent-primary/20 to-accent-primary/5',
    iconColor: 'text-accent-primary',
  },
} as const

type PresetType = keyof typeof PRESETS

// ============================================
// Component Props
// ============================================
interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Preset configuration for common use cases */
  preset?: PresetType
  /** Custom icon (overrides preset) */
  icon?: React.ReactNode
  /** Title text (overrides preset) */
  title?: string
  /** Description text (overrides preset) */
  description?: string
  /** Action button/element */
  action?: React.ReactNode
  /** CTA button text (creates a default button) */
  actionText?: string
  /** CTA button onClick */
  onAction?: () => void
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show decorative gradient background */
  showGradient?: boolean
}

// ============================================
// Component
// ============================================
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ 
    className, 
    preset,
    icon, 
    title, 
    description, 
    action,
    actionText,
    onAction,
    size = 'md',
    showGradient = true,
    ...props 
  }, ref) => {
    // Get preset config if specified
    const presetConfig = preset ? PRESETS[preset] : null
    const PresetIcon = presetConfig?.icon

    // Merge preset with overrides
    const finalTitle = title || presetConfig?.title || 'Sin contenido'
    const finalDescription = description || presetConfig?.description
    const finalIcon = icon || (PresetIcon ? <PresetIcon className={cn('w-full h-full', presetConfig?.iconColor)} /> : <FolderOpen className="w-full h-full text-text-secondary" />)
    const gradient = presetConfig?.gradient || 'from-bg-tertiary/50 to-bg-tertiary/20'

    // Size configurations
    const sizes = {
      sm: {
        container: 'py-8 px-4',
        iconWrapper: 'w-10 h-10 mb-3',
        iconSize: 'w-5 h-5',
        title: 'text-base',
        description: 'text-xs max-w-xs',
      },
      md: {
        container: 'py-12 px-4',
        iconWrapper: 'w-14 h-14 mb-4',
        iconSize: 'w-7 h-7',
        title: 'text-lg',
        description: 'text-sm max-w-sm',
      },
      lg: {
        container: 'py-16 px-6',
        iconWrapper: 'w-20 h-20 mb-6',
        iconSize: 'w-10 h-10',
        title: 'text-xl',
        description: 'text-base max-w-md',
      },
    }

    const sizeConfig = sizes[size]

    // Default action button if actionText provided
    const finalAction = action || (actionText && onAction ? (
      <Button onClick={onAction} size={size === 'sm' ? 'sm' : 'default'}>
        <Plus className="w-4 h-4 mr-1" />
        {actionText}
      </Button>
    ) : null)

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center relative',
          sizeConfig.container,
          className
        )}
        {...props}
      >
        {/* Decorative gradient background */}
        {showGradient && (
          <div 
            className={cn(
              'absolute inset-0 bg-gradient-to-b rounded-2xl opacity-50 pointer-events-none',
              gradient
            )} 
          />
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Icon */}
          <div 
            className={cn(
              'rounded-full bg-bg-tertiary/80 flex items-center justify-center p-3',
              'ring-4 ring-bg-tertiary/30',
              sizeConfig.iconWrapper
            )}
          >
            <div className={sizeConfig.iconSize}>
              {finalIcon}
            </div>
          </div>

          {/* Title */}
          <h3 className={cn('font-semibold text-text-primary mb-1', sizeConfig.title)}>
            {finalTitle}
          </h3>

          {/* Description */}
          {finalDescription && (
            <p className={cn('text-text-secondary mb-4', sizeConfig.description)}>
              {finalDescription}
            </p>
          )}

          {/* Action */}
          {finalAction}
        </div>
      </div>
    )
  }
)

EmptyState.displayName = 'EmptyState'

export { EmptyState }
export type { EmptyStateProps, PresetType }
