import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, EmptyState } from '@/components/ui'
import { useAuthStore } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'
import { supabase } from '@/lib/supabase'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { TaskDetailed } from '@/types'
import {
  Inbox as InboxIcon,
  CheckCircle,
  MessageSquare,
  UserPlus,
  AlertTriangle,
  Clock,
  Bell,
} from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  task_id: string | null
  project_id: string | null
  is_read: boolean
  created_at: string
  triggered_by_profile?: {
    full_name: string
    avatar_url: string | null
  } | null
  task?: TaskDetailed | null
}

const notificationIcons: Record<string, any> = {
  task_assigned: UserPlus,
  task_status_changed: CheckCircle,
  approval_requested: Clock,
  approval_completed: CheckCircle,
  comment_mention: MessageSquare,
  handoff_received: UserPlus,
  deadline_approaching: AlertTriangle,
  default: Bell,
}

const notificationColors: Record<string, string> = {
  task_assigned: 'text-accent-primary',
  task_status_changed: 'text-accent-success',
  approval_requested: 'text-accent-warning',
  approval_completed: 'text-accent-success',
  comment_mention: 'text-accent-primary',
  handoff_received: 'text-accent-primary',
  deadline_approaching: 'text-accent-warning',
  default: 'text-text-secondary',
}

export function InboxPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { openTaskDrawer } = useUIStore()
  
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all')

  // Cargar notificaciones
  React.useEffect(() => {
    const loadNotifications = async () => {
      if (!profile?.id) {
        setIsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select(`
            *,
            triggered_by_profile:profiles!notifications_triggered_by_fkey(full_name, avatar_url),
            task:tasks!notifications_task_id_fkey(
              *,
              assignee:profiles!tasks_assignee_id_fkey(full_name, avatar_url, team),
              project:projects!tasks_project_id_fkey(id, name, slug, client_name, color)
            )
          `)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) {
          console.error('Error loading notifications:', error)
          // Si falla el join, intentar sin él
          const { data: simpleData, error: simpleError } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(50)
          
          if (!simpleError) {
            setNotifications(simpleData || [])
          }
        } else {
          setNotifications(data || [])
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadNotifications()
  }, [profile?.id])

  // Marcar como leída y abrir tarea
  const handleNotificationClick = async (notification: Notification) => {
    // Marcar como leída si no lo está
    if (!notification.is_read) {
      await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notification.id)

      // Actualizar estado local
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      )
    }

    // Si tiene tarea, abrir el drawer
    if (notification.task) {
      openTaskDrawer(notification.task as TaskDetailed)
    } else if (notification.task_id) {
      // Cargar la tarea si solo tenemos el ID
      const { data: task } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(full_name, avatar_url, team),
          project:projects!tasks_project_id_fkey(id, name, slug, client_name, color)
        `)
        .eq('id', notification.task_id)
        .single()

      if (task) {
        openTaskDrawer(task as TaskDetailed)
      }
    } else if (notification.project_id) {
      // Si solo tiene proyecto, navegar al proyecto
      navigate(`/app/projects/${notification.project_id}`)
    }
  }

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    if (!profile?.id) return

    await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', profile.id)
      .eq('is_read', false)

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-secondary">Cargando notificaciones...</div>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<InboxIcon className="w-6 h-6 text-text-secondary" />}
        title="Inbox vacío"
        description="No tienes notificaciones pendientes"
      />
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg transition-colors',
              filter === 'all'
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:bg-bg-tertiary'
            )}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2',
              filter === 'unread'
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:bg-bg-tertiary'
            )}
          >
            Sin leer
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-accent-danger text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-accent-primary hover:underline"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            No hay notificaciones {filter === 'unread' ? 'sin leer' : ''}
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const Icon = notificationIcons[notification.type] || notificationIcons.default
            const iconColor = notificationColors[notification.type] || notificationColors.default

            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  'p-4 rounded-lg border border-bg-tertiary bg-bg-secondary cursor-pointer',
                  'hover:bg-bg-tertiary hover:border-accent-primary/30 transition-colors',
                  !notification.is_read && 'border-l-2 border-l-accent-primary'
                )}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className={cn('p-2 rounded-lg bg-bg-tertiary shrink-0', iconColor)}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={cn(
                          'text-sm',
                          notification.is_read ? 'text-text-secondary' : 'text-text-primary font-medium'
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-text-secondary mt-0.5">
                          {notification.message}
                        </p>
                      </div>
                      <span className="text-xs text-text-secondary shrink-0">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                    </div>

                    {/* Triggered by */}
                    {notification.triggered_by_profile && (
                      <div className="flex items-center gap-2 mt-3">
                        <Avatar
                          name={notification.triggered_by_profile.full_name}
                          src={notification.triggered_by_profile.avatar_url}
                          size="sm"
                        />
                        <span className="text-xs text-text-secondary">
                          {notification.triggered_by_profile.full_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
