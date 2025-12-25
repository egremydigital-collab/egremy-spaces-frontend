import * as React from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, Badge, Avatar, Button, EmptyState, Spinner } from '@/components/ui'
import { useUIStore } from '@/stores/ui.store'
import { supabase } from '@/lib/supabase'
import { TaskDrawer } from '@/components/tasks/TaskDrawer'
import { TaskCreateModal } from '@/components/tasks/TaskCreateModal'
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

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { openTaskDrawer, openCreateTaskModal, createTaskModalOpen, taskDrawerOpen } = useUIStore()
  const [project, setProject] = React.useState<Project | null>(null)
  const [tasks, setTasks] = React.useState<TaskDetailed[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTask, setActiveTask] = React.useState<TaskDetailed | null>(null)
  const [isRealtimeConnected, setIsRealtimeConnected] = React.useState(false)

  // Configurar sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Cargar proyecto y tareas inicial
  React.useEffect(() => {
    if (projectId) {
      loadProjectAndTasks()
    }
  }, [projectId])

  // ============================================
  // 🔴 SUPABASE REALTIME SUBSCRIPTION
  // ============================================
  React.useEffect(() => {
    if (!projectId) return

    console.log('🔌 Conectando a Supabase Realtime...')

    // Crear canal para este proyecto
    const channel: RealtimeChannel = supabase
      .channel(`project-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          console.log('📡 Realtime event:', payload.eventType, payload)

          if (payload.eventType === 'INSERT') {
            // Nueva tarea creada (por otro usuario)
            const newTask = payload.new as any
            
            // Cargar la tarea completa con relaciones
            const { data: fullTask } = await supabase
              .from('tasks')
              .select(`
                *,
                assignee:profiles!tasks_assignee_id_fkey(full_name, avatar_url, team),
                project:projects!tasks_project_id_fkey(name, slug, client_name)
              `)
              .eq('id', newTask.id)
              .single()

            if (fullTask) {
              setTasks((prev) => {
                // Evitar duplicados
                if (prev.some(t => t.id === fullTask.id)) return prev
                console.log('➕ Nueva tarea agregada:', fullTask.title)
                return [...prev, fullTask]
              })
            }
          }

          if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as any
            console.log('🔄 Tarea actualizada:', updatedTask.title || updatedTask.id)
            
            setTasks((prev) =>
              prev.map((t) =>
                t.id === updatedTask.id
                  ? { ...t, ...updatedTask }
                  : t
              )
            )
          }

          if (payload.eventType === 'DELETE') {
            const deletedTask = payload.old as any
            console.log('🗑️ Tarea eliminada:', deletedTask.id)
            
            setTasks((prev) => prev.filter((t) => t.id !== deletedTask.id))
          }
        }
      )
      .subscribe((status) => {
        console.log('📶 Realtime status:', status)
        setIsRealtimeConnected(status === 'SUBSCRIBED')
      })

    // Cleanup: desuscribirse al desmontar
    return () => {
      console.log('🔌 Desconectando Realtime...')
      supabase.removeChannel(channel)
    }
  }, [projectId])

  // Refresh on focus (backup por si Realtime falla)
  React.useEffect(() => {
    if (!projectId) return

    const onFocus = () => {
      console.log('👁️ Focus: verificando actualizaciones...')
      refreshTasks()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      window.removeEventListener('focus', onFocus)
    }
  }, [projectId])

  const loadProjectAndTasks = async () => {
    try {
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
      console.error('Error loading project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Función para refrescar tasks (backup)
  const refreshTasks = async () => {
    console.log("🔄 refreshTasks() called")

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

    if (tasksError) {
      console.error("Error refreshing tasks:", tasksError)
      return
    }

    const next = (tasksData || []).map((t) => ({ ...t }))
    console.log("✅ refreshTasks() got", next.length, "tasks")

    setTasks(next)
  }

  // Callback cuando se actualiza una tarea desde el drawer
  const handleTaskUpdated = (updatedTask: TaskDetailed) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
    )
  }

  // Drag & Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find((t) => t.id === active.id)
    if (task) {
      setActiveTask(task)
      console.log('🎯 Drag iniciado:', task.title)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) {
      console.log('❌ Drop fuera de zona válida')
      return
    }

    const taskId = active.id as string
    const newStatus = over.id as TaskStatus
    const task = tasks.find((t) => t.id === taskId)

    if (!task || task.status === newStatus) {
      console.log('❌ Sin cambio de estado')
      return
    }

    console.log('🔄 Moviendo tarea:', task.title, '→', newStatus)

    // Actualizar UI inmediatamente (optimistic update)
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )

    // Guardar en Supabase
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          previous_status: task.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (error) throw error
      console.log('✅ Estado guardado en DB')
    } catch (err) {
      console.error('❌ Error guardando:', err)
      // Revertir cambio en caso de error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      )
    }
  }

  // Agrupar tareas por estado
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
          
          {/* Realtime indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            {isRealtimeConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-accent-success" />
                <span className="text-accent-success">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-text-secondary" />
                <span className="text-text-secondary">Offline</span>
              </>
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
            <span>
              {tasksByStatus.specialTasks.length} tarea(s) requieren atención
            </span>
          </div>
        </div>
      )}

      {/* Kanban Board con Drag & Drop */}
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

        {/* Drag Overlay - lo que se ve mientras arrastras */}
        <DragOverlay>
          {activeTask ? (
            <div className="opacity-80">
              <TaskCard task={activeTask} onClick={() => {}} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de crear tarea */}
      {createTaskModalOpen && project && (
        <TaskCreateModal
          projectId={project.id}
          organizationId={project.organization_id}
          onSuccess={(newTask) => {
            console.log('🎉 Tarea creada:', newTask)
            setTasks((prev) => [...prev, newTask])
          }}
        />
      )}

      {taskDrawerOpen && (
        <TaskDrawer 
          onTaskUpdated={handleTaskUpdated} 
          onRefreshTasks={refreshTasks}
        />
      )}
    </div>
  )
}

// ============================================
// Droppable Column Component
// ============================================
interface DroppableColumnProps {
  status: TaskStatus
  tasks: TaskDetailed[]
  onTaskClick: (task: TaskDetailed) => void
}

function DroppableColumn({ status, tasks, onTaskClick }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  const config = STATUS_CONFIG[status]

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-64 md:w-72 flex flex-col bg-bg-secondary/50 rounded-lg shrink-0 transition-colors',
        isOver && 'bg-accent-primary/10 ring-2 ring-accent-primary/50'
      )}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-bg-tertiary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span className="font-medium text-sm text-text-primary">
              {config.label}
            </span>
            <span className="text-xs text-text-secondary bg-bg-tertiary px-1.5 py-0.5 rounded">
              {tasks.length}
            </span>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
        {tasks.map((task) => (
          <DraggableTask
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
          />
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
// Draggable Task Component
// ============================================
interface DraggableTaskProps {
  task: TaskDetailed
  onClick: () => void
}

function DraggableTask({ task, onClick }: DraggableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'touch-none',
        isDragging && 'opacity-50'
      )}
    >
      <TaskCard task={task} onClick={onClick} isDragging={isDragging} />
    </div>
  )
}

// ============================================
// Task Card Component
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
        {/* Title */}
        <h4 className="text-sm font-medium text-text-primary line-clamp-2">
          {task.title}
        </h4>

        {/* Status badges for blocking states */}
        {isBlocking && (
          <Badge status={task.status} />
        )}

        {/* Meta info */}
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center gap-3">
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(task.due_date).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                })}
              </div>
            )}
            {task.comment_count && task.comment_count > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {task.comment_count}
              </div>
            )}
          </div>

          {/* Assignee */}
          {task.assignee && (
            <Avatar
              name={task.assignee.full_name}
              src={task.assignee.avatar_url}
              size="sm"
            />
          )}
        </div>

        {/* Complexity indicator */}
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
