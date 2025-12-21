import * as React from 'react'
import { Card, CardContent, Badge, Avatar, EmptyState } from '@/components/ui'
import { cn, formatRelativeTime } from '@/lib/utils'
import {
  Inbox as InboxIcon,
  CheckCircle,
  MessageSquare,
  UserPlus,
  AlertTriangle,
  Clock,
} from 'lucide-react'

// Datos de ejemplo
const notifications = [
  {
    id: '1',
    type: 'task_assigned' as const,
    title: 'Nueva tarea asignada',
    message: 'Te asignaron "Flujo WhatsApp CRM"',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    triggered_by: { name: 'María García', avatar: null },
  },
  {
    id: '2',
    type: 'approval_completed' as const,
    title: 'Aprobación recibida',
    message: 'El cliente aprobó "Landing Page Lead"',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    triggered_by: null,
  },
  {
    id: '3',
    type: 'comment_mention' as const,
    title: 'Te mencionaron',
    message: '@tu en "Integración Sheets": ¿Puedes revisar esto?',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    triggered_by: { name: 'Carlos López', avatar: null },
  },
  {
    id: '4',
    type: 'deadline_approaching' as const,
    title: 'Fecha límite cercana',
    message: '"Webhook Notificaciones" vence mañana',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    triggered_by: null,
  },
]

const notificationIcons = {
  task_assigned: UserPlus,
  task_status_changed: CheckCircle,
  approval_requested: Clock,
  approval_completed: CheckCircle,
  comment_mention: MessageSquare,
  handoff_received: UserPlus,
  deadline_approaching: AlertTriangle,
}

const notificationColors = {
  task_assigned: 'text-accent-primary',
  task_status_changed: 'text-accent-success',
  approval_requested: 'text-accent-warning',
  approval_completed: 'text-accent-success',
  comment_mention: 'text-accent-primary',
  handoff_received: 'text-accent-primary',
  deadline_approaching: 'text-accent-warning',
}

export function InboxPage() {
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all')

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications

  const unreadCount = notifications.filter((n) => !n.is_read).length

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

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.map((notification) => {
          const Icon = notificationIcons[notification.type]
          const iconColor = notificationColors[notification.type]

          return (
            <Card
              key={notification.id}
              variant="interactive"
              className={cn(
                !notification.is_read && 'border-l-2 border-l-accent-primary'
              )}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className={cn('p-2 rounded-lg bg-bg-tertiary', iconColor)}>
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
                    {notification.triggered_by && (
                      <div className="flex items-center gap-2 mt-3">
                        <Avatar
                          name={notification.triggered_by.name}
                          src={notification.triggered_by.avatar}
                          size="sm"
                        />
                        <span className="text-xs text-text-secondary">
                          {notification.triggered_by.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
