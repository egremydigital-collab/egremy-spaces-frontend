import * as React from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, Badge, Avatar, Button, EmptyState, Spinner } from '@/components/ui'
import { useUIStore } from '@/stores/ui.store'
import { supabase } from '@/lib/supabase'
import { TaskDrawer } from '@/components/tasks/TaskDrawer'
import { TaskCreateModal } from '@/components/tasks/TaskCreateModal'
import { toast } from '@/components/ui/Toast'
import { cn, STATUS_CONFIG, KANBAN_COLUMNS } from '@/lib/utils'
import type { Project, TaskDetailed, TaskStatus } from '@/types'
import {
  ArrowLeft,
  Plus,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { logStatusChange } from '@/lib/activity-logs'

// ============================================
// CONSTANTS
// ============================================
const POLLING_INTERVAL = 15000 // 15 segundos
const DEBOUNCE_DELAY = 300 // 300ms
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_BASE_DELAY = 2000 // 2 segundos

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { openTaskDrawer, openCreateTaskModal, createTaskModalOpen, taskDrawerOpen } = useUIStore()
  
  // State
  const [project, setProject] = React.useState<Project | null>(null)
  const [tasks, setTasks] = React.useState<TaskDetailed[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTask, setActiveTask] = React.useState<TaskDetailed | null>(null)
  const [isRealtimeConnected, setIsRealtimeConnected] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [connectionStatus, setConnectionStatus] = React.useState<'connected' | 'reconnecting' | 'offline'>('offline')

  // Refs para debounce y reconexión
  const refreshTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const lastRefreshRef = React.useRef<number>(0)
  const reconnectAttemptsRef = React.useRef(0)
  const channelRef = React.useRef<RealtimeChannel | null>(null)

  // Configurar sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // ============================================
  // DEBOUNCED REFRESH FUNCTION
  // ============================================
  const refreshTasksDebounced = React.useCallback(() => {
    const now = Date.now()
    
    // Evitar refresh si se hizo hace menos de DEBOUNCE_DELAY
    if (now - lastRefreshRef.current < DEBOUNCE_DELAY) {
      console.log('⏳ Refresh debounced, skipping...')
      return
    }

    // Cancelar timeout pendiente
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    // Programar nuevo refresh
    refreshTimeoutRef.current = setTimeout(async () => {
      lastRefreshRef.current = Date.now()
      await refreshTasks()
    }, DEBOUNCE_DELAY)
  }, [projectId])

  // ============================================
  // REFRESH TASKS WITH ERROR HANDLING
  // ============================================
  const refreshTasks = React.useCallback(async () => {
    if (!projectId || isRefreshing) return

    try {
      setIsRefreshing(true)
      console.log('🔄 Refreshing tasks...')

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(full_name, avatar_url, team),
          project:projects!tasks_project_id_fkey(name, slug, client_name)
        `)
        .eq('project_id', projectId)
        .is('parent_task_id', null)
        .order('position', { ascending: true })

      if (tasksError) throw tasksError

      setTasks(tasksData || [])
      console.log('✅ Tasks refreshed:', tasksData?.length || 0)
    } catch (error) {
      console.error('❌ Error refreshing tasks:', error)
      toast.error('Error al actualizar tareas. Reintentando...')
    } finally {
      setIsRefreshing(false)
    }
  }, [projectId, isRefreshing])

  // ============================================
  // LOAD PROJECT AND TASKS
  // ============================================
  const loadProjectAndTasks = React.useCallback(async () => {
    if (!projectId) return

    try {
      setIsLoading(true)

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(full_name, avatar_url, team),
          project:projects!tasks_project_id_fkey(name, slug, client_name)
        `)
        .eq('project_id', projectId)
        .is('parent_task_id', null)
        .order('position', { ascending: true })

      if (tasksError) throw tasksError
      setTasks(tasksData || [])
    } catch (error) {
      console.error('❌ Error loading project:', error)
      toast.error('Error al cargar el proyecto')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // Cargar proyecto al montar
  React.useEffect(() => {
    if (projectId) {
      loadProjectAndTasks()
    }
  }, [projectId, loadProjectAndTasks])

  // ============================================
  // 🔴 SUPABASE REALTIME WITH RECONNECTION
  // ============================================
  React.useEffect(() => {
    if (!projectId) return

    const connectRealtime = () => {
      console.log('🔌 Conectando a Supabase Realtime...')
      setConnectionStatus('reconnecting')

      try {
        const channel = supabase
          .channel(`project-tasks-${projectId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tasks',
              filter: `project_id=eq.${projectId}`,
            },
            async (payload) => {
              console.log('📡 Realtime event:', payload.eventType)

              try {
                if (payload.eventType === 'INSERT') {
                  const newTask = payload.new as any
                  const { data: fullTask, error } = await supabase
                    .from('tasks')
                    .select(`
                      *,
                      assignee:profiles!tasks_assignee_id_fkey(full_name, avatar_url, team),
                      project:projects!tasks_project_id_fkey(name, slug, client_name)
                    `)
                    .eq('id', newTask.id)
                    .single()

                  if (error) throw error

                  if (fullTask) {
                    setTasks((prev) => {
                      if (prev.some(t => t.id === fullTask.id)) return prev
                      console.log('➕ Nueva tarea via Realtime:', fullTask.title)
                      return [...prev, fullTask]
                    })
                  }
                }

                if (payload.eventType === 'UPDATE') {
                  const updatedTask = payload.new as any
                  console.log('🔄 Tarea actualizada via Realtime:', updatedTask.id)
                  setTasks((prev) =>
                    prev.map((t) =>
                      t.id === updatedTask.id ? { ...t, ...updatedTask } : t
                    )
                  )
                }

                if (payload.eventType === 'DELETE') {
                  const deletedTask = payload.old as any
                  console.log('🗑️ Tarea eliminada via Realtime:', deletedTask.id)
                  setTasks((prev) => prev.filter((t) => t.id !== deletedTask.id))
                }
              } catch (error) {
                console.error('❌ Error procesando evento Realtime:', error)
                // Hacer refresh como fallback
                refreshTasksDebounced()
              }
            }
          )
          .subscribe((status, err) => {
            console.log('📶 Realtime status:', status)

            if (status === 'SUBSCRIBED') {
              setIsRealtimeConnected(true)
              setConnectionStatus('connected')
              reconnectAttemptsRef.current = 0
              console.log('✅ Realtime conectado')
            } else if (status === 'CLOSED') {
              setIsRealtimeConnected(false)
              setConnectionStatus('offline')
              console.warn('⚠️ Realtime desconectado')
              
              // Intentar reconectar
              handleReconnect()
            } else if (status === 'CHANNEL_ERROR') {
              setIsRealtimeConnected(false)
              setConnectionStatus('offline')
              console.error('❌ Error en canal Realtime:', err)
              toast.warning('Conexión en tiempo real perdida. Usando sincronización automática.')
              
              // Intentar reconectar
              handleReconnect()
            }
          })

        channelRef.current = channel
      } catch (error) {
        console.error('❌ Error conectando Realtime:', error)
        setConnectionStatus('offline')
        handleReconnect()
      }
    }

    const handleReconnect = () => {
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.error('❌ Máximo de intentos de reconexión alcanzado')
        toast.error('No se pudo establecer conexión en tiempo real. Los cambios se sincronizarán cada 15 segundos.')
        return
      }

      reconnectAttemptsRef.current++
      const delay = RECONNECT_BASE_DELAY * reconnectAttemptsRef.current

      console.log(`🔄 Reintentando conexión en ${delay/1000}s (intento ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`)
      setConnectionStatus('reconnecting')

      setTimeout(() => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
        }
        connectRealtime()
      }, delay)
    }

    connectRealtime()

    // Cleanup
    return () => {
      if (channelRef.current) {
        console.log('🔌 Desconectando Realtime...')
        supabase.removeChannel(channelRef.current)
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [projectId, refreshTasksDebounced])

  // ============================================
  // 🔄 POLLING BACKUP
  // ============================================
  React.useEffect(() => {
    if (!projectId) return

    // Polling como backup (menos frecuente si Realtime está conectado)
    const interval = isRealtimeConnected ? POLLING_INTERVAL * 2 : POLLING_INTERVAL
    
    const intervalId = setInterval(() => {
      if (!isRealtimeConnected) {
        console.log('🔄 Polling backup: refrescando tasks...')
        refreshTasksDebounced()
      }
    }, interval)

    // Focus: refresca cuando vuelves a la pestaña
    const onFocus = () => {
      console.log('👁️ Focus: verificando actualizaciones...')
      refreshTasksDebounced()
    }
    window.addEventListener('focus', onFocus)

    // Visibility change
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 Visibility: verificando actualizaciones...')
        refreshTasksDebounced()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [projectId, isRealtimeConnected, refreshTasksDebounced])

  // ============================================
  // TASK UPDATE CALLBACK
  // ============================================
  const handleTaskUpdated = React.useCallback((updatedTask: TaskDetailed) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
    )
  }, [])

  // ============================================
  // DRAG & DROP HANDLERS
  // ============================================
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find((t) => t.id === active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as TaskStatus
    const task = tasks.find((t) => t.id === taskId)

    if (!task || task.status === newStatus) return

    const previousStatus = task.status

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          previous_status: previousStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (error) throw error

      console.log('✅ Estado guardado:', task.title, '→', newStatus)
      toast.success(`Tarea movida a ${STATUS_CONFIG[newStatus]?.label || newStatus}`)
      // Log de actividad
logStatusChange(taskId, previousStatus, newStatus, task.title)
    } catch (err) {
      console.error('❌ Error guardando estado:', err)
      toast.error('Error al mover la tarea. Revirtiendo cambio...')
      
      // Revertir cambio
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: previousStatus } : t))
      )
    }
  }

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const tasksByStatus = React.useMemo(() => {
    const grouped: Record<TaskStatus, TaskDetailed[]> = {} as Record<TaskStatus, TaskDetailed[]>
    
    KANBAN_COLUMNS.forEach((status) => {
      grouped[status] = tasks.filter((t) => t.status === status)
    })
    
    const specialTasks = tasks.filter((t) => 
      !KANBAN_COLUMNS.includes(t.status)
    )
    
    return { grouped, specialTasks }
  }, [tasks])

  // ============================================
  // RENDER
  // ============================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!project) {
    return (
      <EmptyState
        title="Proyecto no encontrado"
        description="El proyecto que buscas no existe o no tienes acceso"
        action={
          <Link to="/app/projects">
            <Button variant="secondary">
              <ArrowLeft className="w-4 h-4" />
              Volver a Proyectos
            </Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="h-full flex flex-col -m-6">
      {/* Project Header */}
      <div className="px-4 md:px-6 py-4 border-b border-bg-tertiary bg-bg-secondary">
        <div className="flex items-center gap-3 md:gap-4">
          <Link
            to="/app/projects"
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 md:gap-3">
              <div
                className="w-6 h-6 md:w-8 md:h-8 rounded-lg shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-semibold text-text-primary truncate">
                  {project.name}
                </h1>
                {project.client_name && (
                  <p className="text-xs md:text-sm text-text-secondary truncate">
                    {project.client_name}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Connection Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            {connectionStatus === 'connected' ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-accent-success" />
                <span className="text-accent-success">Live</span>
              </>
            ) : connectionStatus === 'reconnecting' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-accent-warning animate-spin" />
                <span className="text-accent-warning">Reconectando...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-text-secondary" />
                <span className="text-text-secondary">Sync</span>
              </>
            )}
            {isRefreshing && (
              <RefreshCw className="w-3 h-3 text-accent-primary animate-spin ml-1" />
            )}
          </div>

          <Button onClick={openCreateTaskModal} size="sm" className="shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Nueva Tarea</span>
          </Button>
        </div>
      </div>

      {/* Special Status Alert */}
      {tasksByStatus.specialTasks.length > 0 && (
        <div className="px-4 md:px-6 py-3 bg-accent-warning/10 border-b border-accent-warning/20">
          <div className="flex items-center gap-2 text-sm text-accent-warning">
            <AlertTriangle className="w-4 h-4" />
            <span>{tasksByStatus.specialTasks.length} tarea(s) requieren atención</span>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto p-4 md:p-6">
          <div className="flex gap-3 md:gap-4 h-full min-w-max">
            {KANBAN_COLUMNS.map((status) => (
              <DroppableColumn
                key={status}
                status={status}
                tasks={tasksByStatus.grouped[status]}
                onTaskClick={openTaskDrawer}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="opacity-80">
              <TaskCard task={activeTask} onClick={() => {}} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      {createTaskModalOpen && project && (
        <TaskCreateModal
          projectId={project.id}
          organizationId={project.organization_id}
          onSuccess={(newTask) => {
            setTasks((prev) => [...prev, newTask])
            toast.success('Tarea creada exitosamente')
          }}
        />
      )}

      {taskDrawerOpen && (
        <TaskDrawer 
          onTaskUpdated={handleTaskUpdated} 
          onRefreshTasks={refreshTasksDebounced}
        />
      )}
    </div>
  )
}

// ============================================
// DROPPABLE COLUMN
// ============================================
interface DroppableColumnProps {
  status: TaskStatus
  tasks: TaskDetailed[]
  onTaskClick: (task: TaskDetailed) => void
}

function DroppableColumn({ status, tasks, onTaskClick }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const config = STATUS_CONFIG[status]

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-64 md:w-72 flex flex-col bg-bg-secondary/50 rounded-lg shrink-0 transition-colors',
        isOver && 'bg-accent-primary/10 ring-2 ring-accent-primary/50'
      )}
    >
      <div className="p-3 border-b border-bg-tertiary">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
          <span className="font-medium text-sm text-text-primary">{config.label}</span>
          <span className="text-xs text-text-secondary bg-bg-tertiary px-1.5 py-0.5 rounded">
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
        {tasks.map((task) => (
          <DraggableTask key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
        {tasks.length === 0 && (
          <div className={cn(
            'text-center py-8 text-text-secondary text-sm rounded-lg border-2 border-dashed border-transparent transition-colors',
            isOver && 'border-accent-primary/50 bg-accent-primary/5'
          )}>
            {isOver ? 'Soltar aquí' : 'Sin tareas'}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// DRAGGABLE TASK
// ============================================
interface DraggableTaskProps {
  task: TaskDetailed
  onClick: () => void
}

function DraggableTask({ task, onClick }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const style = { transform: CSS.Translate.toString(transform) }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn('touch-none', isDragging && 'opacity-50')}
    >
      <TaskCard task={task} onClick={onClick} isDragging={isDragging} />
    </div>
  )
}

// ============================================
// TASK CARD
// ============================================
interface TaskCardProps {
  task: TaskDetailed
  onClick: () => void
  isDragging?: boolean
}

function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const isBlocking = ['blocked', 'needs_client_approval', 'bug', 'hotfix'].includes(task.status)

  return (
    <Card
      variant="interactive"
      className={cn(
        'cursor-grab active:cursor-grabbing',
        isBlocking && 'border-accent-warning/50',
        isDragging && 'shadow-lg ring-2 ring-accent-primary'
      )}
      onClick={onClick}
    >
      <div className="p-3 space-y-3">
        <h4 className="text-sm font-medium text-text-primary line-clamp-2">{task.title}</h4>
        {isBlocking && <Badge status={task.status} />}
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center gap-3">
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(task.due_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
              </div>
            )}
            {task.comment_count && task.comment_count > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {task.comment_count}
              </div>
            )}
          </div>
          {task.assignee && (
            <Avatar name={task.assignee.full_name} src={task.assignee.avatar_url} size="sm" />
          )}
        </div>
        {task.complexity && (
          <div className="flex items-center gap-1">
            {['low', 'medium', 'high'].map((level, i) => (
              <div
                key={level}
                className={cn(
                  'w-1.5 h-3 rounded-full',
                  i < (['low', 'medium', 'high'].indexOf(task.complexity!) + 1)
                    ? task.complexity === 'high'
                      ? 'bg-accent-danger'
                      : task.complexity === 'medium'
                      ? 'bg-accent-warning'
                      : 'bg-accent-success'
                    : 'bg-bg-tertiary'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
