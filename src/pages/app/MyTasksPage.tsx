import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent, Badge, EmptyState } from '@/components/ui'
import { useAuthStore } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'
import { supabase } from '@/lib/supabase'
import { cn, formatDate, STATUS_CONFIG } from '@/lib/utils'
import type { TaskDetailed, TaskStatus } from '@/types'
import {
  CheckSquare,
  Calendar,
  FolderKanban,
  AlertTriangle,
  X,
} from 'lucide-react'

type GroupBy = 'status' | 'project' | 'due_date'
type FilterType = 'all' | 'active' | 'completed' | 'blocked' | 'waiting'

const FILTER_CONFIG: Record<FilterType, { label: string; description: string }> = {
  all: { label: 'Todas', description: 'Todas las tareas pendientes' },
  active: { label: 'Activas', description: 'Tareas en progreso' },
  completed: { label: 'Completadas', description: 'Tareas completadas este mes' },
  blocked: { label: 'Bloqueadas', description: 'Tareas bloqueadas o con problemas' },
  waiting: { label: 'Esperando Cliente', description: 'Tareas pendientes de aprobación' },
}

export function MyTasksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile } = useAuthStore()
  const { openTaskDrawer } = useUIStore()
  
  const [allTasks, setAllTasks] = React.useState<TaskDetailed[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [groupBy, setGroupBy] = React.useState<GroupBy>('status')

  // Obtener filtro de query params
  const activeFilter = (searchParams.get('filter') as FilterType) || 'all'

  // Limpiar filtro
  const clearFilter = () => {
    setSearchParams({})
  }

  // Cargar tareas cuando el componente se monta
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
            assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url, team),
            project:projects!tasks_project_id_fkey(id, name, slug, client_name, color)
          `)
          .eq('assignee_id', profile.id)
          .order('due_date', { ascending: true, nullsFirst: false })

        if (error) throw error

        if (isMounted) {
          setAllTasks(data || [])
        }
      } catch (error) {
        console.error('Error loading tasks:', error)
        if (isMounted) {
          setAllTasks([])
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
  }, [profile?.id])

  // Filtrar tareas según el filtro activo
  const tasks = React.useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    switch (activeFilter) {
      case 'active':
        return allTasks.filter(t => 
          !['live', 'optimization', 'blocked', 'bug', 'hotfix', 'needs_client_approval'].includes(t.status)
        )
      case 'completed':
        return allTasks.filter(t => 
          ['live', 'optimization'].includes(t.status) &&
          new Date(t.updated_at) >= startOfMonth
        )
      case 'blocked':
        return allTasks.filter(t => 
          ['blocked', 'bug', 'hotfix'].includes(t.status)
        )
      case 'waiting':
        return allTasks.filter(t => 
          t.status === 'needs_client_approval'
        )
      case 'all':
      default:
        return allTasks.filter(t => 
          !['live', 'optimization'].includes(t.status)
        )
    }
  }, [allTasks, activeFilter])

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

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Active Filter Banner */}
      {activeFilter !== 'all' && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium text-accent-primary">
              Filtro: {FILTER_CONFIG[activeFilter].label}
            </span>
            <p className="text-xs text-text-secondary mt-0.5 truncate">
              {FILTER_CONFIG[activeFilter].description}
            </p>
          </div>
          <button
            onClick={clearFilter}
            className="p-1.5 rounded-lg hover:bg-accent-primary/20 text-accent-primary transition-colors shrink-0 ml-2"
            title="Quitar filtro"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Group By Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-text-secondary whitespace-nowrap">Agrupar:</span>
          <div className="flex items-center gap-1">
            {(['status', 'project', 'due_date'] as GroupBy[]).map((option) => (
              <button
                key={option}
                onClick={() => setGroupBy(option)}
                className={cn(
                  'px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg transition-colors',
                  groupBy === option
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:bg-bg-tertiary'
                )}
              >
                {option === 'status' ? 'Estado' : option === 'project' ? 'Proyecto' : 'Fecha'}
              </button>
            ))}
          </div>
        </div>

        {/* Task Count */}
        <div className="text-xs sm:text-sm text-text-secondary">
          {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}
        </div>
      </div>

      {/* Empty State */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-6 h-6 text-text-secondary" />}
          title={activeFilter === 'all' 
            ? "No tienes tareas pendientes" 
            : `No hay tareas ${FILTER_CONFIG[activeFilter].label.toLowerCase()}`
          }
          description={activeFilter === 'all'
            ? "¡Excelente! Estás al día con tu trabajo"
            : "Prueba con otro filtro o revisa más tarde"
          }
          action={activeFilter !== 'all' ? (
            <button
              onClick={clearFilter}
              className="mt-4 px-4 py-2 text-sm bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
            >
              Ver todas las tareas
            </button>
          ) : undefined}
        />
      ) : (
        /* Task Groups */
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
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: statusConfig.color }}
                      />
                      <h3 className="font-medium text-text-primary text-sm sm:text-base">{statusConfig.label}</h3>
                    </>
                  ) : (
                    <h3 className="font-medium text-text-primary text-sm sm:text-base">{groupName}</h3>
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
      )}
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
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start sm:items-center gap-3">
          {/* Status indicator */}
          {showStatus && (
            <div
              className="w-2 h-2 rounded-full shrink-0 mt-1.5 sm:mt-0"
              style={{ backgroundColor: STATUS_CONFIG[task.status]?.color || '#6366f1' }}
            />
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start sm:items-center gap-2 flex-wrap">
              <h4 className="text-sm font-medium text-text-primary line-clamp-2 sm:truncate">
                {task.title}
              </h4>
              {isBlocking && (
                <Badge status={task.status} className="shrink-0" />
              )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
              {showProject && project && (
                <Link
                  to={`/app/projects/${project.id}`}
                  className="flex items-center gap-1 hover:text-text-primary truncate max-w-[150px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FolderKanban className="w-3 h-3 shrink-0" />
                  <span className="truncate">{project.name}</span>
                </Link>
              )}
              
              {/* Due date - visible en móvil dentro del meta */}
              {task.due_date && (
                <span className={cn(
                  'flex items-center gap-1 sm:hidden',
                  isOverdue ? 'text-accent-danger' : 'text-text-secondary'
                )}>
                  {isOverdue ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <Calendar className="w-3 h-3" />
                  )}
                  {formatDate(task.due_date, { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          </div>

          {/* Due date - solo desktop */}
          {task.due_date && (
            <div className={cn(
              'hidden sm:flex items-center gap-1.5 text-sm shrink-0',
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
