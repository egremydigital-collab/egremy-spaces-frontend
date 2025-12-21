import * as React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Card, CardContent, Badge, Button, EmptyState } from '@/components/ui'
import { useAuthStore } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'
import { supabase } from '@/lib/supabase'
import { cn, formatDate, STATUS_CONFIG } from '@/lib/utils'
import type { TaskDetailed, TaskStatus } from '@/types'
import {
  CheckSquare,
  Calendar,
  FolderKanban,
  Clock,
  AlertTriangle,
} from 'lucide-react'

type ViewMode = 'list' | 'board'
type GroupBy = 'status' | 'project' | 'due_date'

export function MyTasksPage() {
  const location = useLocation()
  const { profile } = useAuthStore()
  const { openTaskDrawer } = useUIStore()
  const [tasks, setTasks] = React.useState<TaskDetailed[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [viewMode, setViewMode] = React.useState<ViewMode>('list')
  const [groupBy, setGroupBy] = React.useState<GroupBy>('status')

  // Cargar tareas cuando el componente se monta o la ruta cambia
  React.useEffect(() => {
    let isMounted = true

    const loadMyTasks = async () => {
      if (!profile?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const { data, error } = await supabase
          .from('tasks')
          .select(`
            *,
            project:projects!tasks_project_id_fkey(id, name, slug, client_name, color)
          `)
          .eq('assignee_id', profile.id)
          .not('status', 'in', '("live","optimization")')
          .order('due_date', { ascending: true, nullsFirst: false })

        if (error) throw error
        
        if (isMounted) {
          setTasks(data || [])
        }
      } catch (error) {
        console.error('Error loading tasks:', error)
        if (isMounted) {
          setTasks([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadMyTasks()

    return () => {
      isMounted = false
    }
  }, [profile?.id, location.pathname]) // Re-ejecutar cuando cambia la ruta o el profile

  // Agrupar tareas
  const groupedTasks = React.useMemo(() => {
    const groups: Record<string, TaskDetailed[]> = {}

    tasks.forEach((task) => {
      let key: string

      switch (groupBy) {
        case 'status':
          key = task.status
          break
        case 'project':
          key = (task.project as any)?.name || 'Sin proyecto'
          break
        case 'due_date':
          if (!task.due_date) {
            key = 'Sin fecha'
          } else {
            const date = new Date(task.due_date)
            const today = new Date()
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)
            const nextWeek = new Date(today)
            nextWeek.setDate(nextWeek.getDate() + 7)

            if (date < today) key = 'Vencidas'
            else if (date.toDateString() === today.toDateString()) key = 'Hoy'
            else if (date.toDateString() === tomorrow.toDateString()) key = 'Mañana'
            else if (date < nextWeek) key = 'Esta semana'
            else key = 'Próximamente'
          }
          break
      }

      if (!groups[key]) groups[key] = []
      groups[key].push(task)
    })

    return groups
  }, [tasks, groupBy])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-secondary">Cargando tareas...</div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<CheckSquare className="w-6 h-6 text-text-secondary" />}
        title="No tienes tareas pendientes"
        description="¡Excelente! Estás al día con tu trabajo"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Agrupar por:</span>
          {(['status', 'project', 'due_date'] as GroupBy[]).map((option) => (
            <button
              key={option}
              onClick={() => setGroupBy(option)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                groupBy === option
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:bg-bg-tertiary'
              )}
            >
              {option === 'status' ? 'Estado' : option === 'project' ? 'Proyecto' : 'Fecha'}
            </button>
          ))}
        </div>

        <div className="text-sm text-text-secondary">
          {tasks.length} tarea{tasks.length !== 1 ? 's' : ''} pendiente{tasks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Task Groups */}
      <div className="space-y-6">
        {Object.entries(groupedTasks).map(([groupName, groupTasks]) => {
          const statusConfig = groupBy === 'status' ? STATUS_CONFIG[groupName as TaskStatus] : null

          return (
            <div key={groupName}>
              {/* Group Header */}
              <div className="flex items-center gap-2 mb-3">
                {statusConfig ? (
                  <>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: statusConfig.color }}
                    />
                    <h3 className="font-medium text-text-primary">{statusConfig.label}</h3>
                  </>
                ) : (
                  <h3 className="font-medium text-text-primary">{groupName}</h3>
                )}
                <span className="text-xs text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded">
                  {groupTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                {groupTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onClick={() => openTaskDrawer(task)}
                    showProject={groupBy !== 'project'}
                    showStatus={groupBy !== 'status'}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Task Row Component
interface TaskRowProps {
  task: TaskDetailed
  onClick: () => void
  showProject?: boolean
  showStatus?: boolean
}

function TaskRow({ task, onClick, showProject = true, showStatus = true }: TaskRowProps) {
  const project = task.project as any
  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
  const isBlocking = ['blocked', 'needs_client_approval', 'bug', 'hotfix'].includes(task.status)

  return (
    <Card
      variant="interactive"
      className={cn(isBlocking && 'border-l-2 border-l-accent-warning')}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Status indicator */}
          {showStatus && (
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: STATUS_CONFIG[task.status].color }}
            />
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-text-primary truncate">
                {task.title}
              </h4>
              {isBlocking && (
                <Badge status={task.status} />
              )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
              {showProject && project && (
                <Link
                  to={`/app/projects/${project.id}`}
                  className="flex items-center gap-1 hover:text-text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FolderKanban className="w-3 h-3" />
                  {project.name}
                </Link>
              )}
            </div>
          </div>

          {/* Due date */}
          {task.due_date && (
            <div className={cn(
              'flex items-center gap-1.5 text-sm shrink-0',
              isOverdue ? 'text-accent-danger' : 'text-text-secondary'
            )}>
              {isOverdue ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              {formatDate(task.due_date, { day: 'numeric', month: 'short' })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
