import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { useAuthStore } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { TaskDetailed } from '@/types'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  FolderKanban,
  Users,
  ArrowRight,
  Loader2,
} from 'lucide-react'

interface DashboardStats {
  activeTasks: number
  completedThisMonth: number
  blocked: number
  waitingClient: number
}

interface ProjectWithProgress {
  id: string
  name: string
  color: string
  totalTasks: number
  completedTasks: number
}

interface RecentActivity {
  id: string
  type: string
  title: string
  message: string
  task_id: string | null
  created_at: string
  task?: {
    id: string
    title: string
    status: string
  } | null
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { openTaskDrawer } = useUIStore()

  const [stats, setStats] = React.useState<DashboardStats>({
    activeTasks: 0,
    completedThisMonth: 0,
    blocked: 0,
    waitingClient: 0,
  })
  const [projects, setProjects] = React.useState<ProjectWithProgress[]>([])
  const [activities, setActivities] = React.useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Cargar datos del dashboard
  React.useEffect(() => {
    const loadDashboardData = async () => {
      if (!profile?.id) return

      try {
        // 1. Cargar stats de tareas asignadas al usuario
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, status, updated_at')
          .eq('assignee_id', profile.id)

        if (tasks) {
          const now = new Date()
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

          setStats({
            activeTasks: tasks.filter(t => 
              !['live', 'optimization'].includes(t.status)
            ).length,
            completedThisMonth: tasks.filter(t => 
              ['live', 'optimization'].includes(t.status) &&
              new Date(t.updated_at) >= startOfMonth
            ).length,
            blocked: tasks.filter(t => 
              ['blocked', 'bug', 'hotfix'].includes(t.status)
            ).length,
            waitingClient: tasks.filter(t => 
              t.status === 'needs_client_approval'
            ).length,
          })
        }

        // 2. Cargar proyectos con progreso
        const { data: projectsData } = await supabase
          .from('projects')
          .select(`
            id,
            name,
            color,
            tasks:tasks(id, status)
          `)
          .eq('is_archived', false)
          .limit(5)

        if (projectsData) {
          const projectsWithProgress = projectsData.map(p => ({
            id: p.id,
            name: p.name,
            color: p.color || '#6366f1',
            totalTasks: p.tasks?.length || 0,
            completedTasks: p.tasks?.filter((t: any) => 
              ['live', 'optimization'].includes(t.status)
            ).length || 0,
          }))
          setProjects(projectsWithProgress)
        }

        // 3. Cargar actividad reciente (notificaciones)
        const { data: notificationsData } = await supabase
          .from('notifications')
          .select(`
            id,
            type,
            title,
            message,
            task_id,
            created_at
          `)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (notificationsData) {
          // Cargar info de tareas relacionadas
          const taskIds = notificationsData
            .filter(n => n.task_id)
            .map(n => n.task_id)

          let tasksMap: Record<string, any> = {}
          if (taskIds.length > 0) {
            const { data: tasksData } = await supabase
              .from('tasks')
              .select('id, title, status')
              .in('id', taskIds)

            if (tasksData) {
              tasksMap = tasksData.reduce((acc, t) => {
                acc[t.id] = t
                return acc
              }, {} as Record<string, any>)
            }
          }

          setActivities(notificationsData.map(n => ({
            ...n,
            task: n.task_id ? tasksMap[n.task_id] : null
          })))
        }

      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [profile?.id])

  // Handler para click en stats
  const handleStatClick = (filter: string) => {
    navigate(`/app/my-tasks?filter=${filter}`)
  }

  // Handler para click en proyecto
  const handleProjectClick = (projectId: string) => {
    navigate(`/app/projects/${projectId}`)
  }

  // Handler para click en actividad
  const handleActivityClick = async (activity: RecentActivity) => {
    if (activity.task_id) {
      const { data: task } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(full_name, avatar_url, team),
          project:projects!tasks_project_id_fkey(id, name, slug, client_name, color)
        `)
        .eq('id', activity.task_id)
        .single()

      if (task) {
        openTaskDrawer(task as TaskDetailed)
      }
    }
  }

  // Formatear tiempo relativo
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    return `${diffDays}d`
  }

  // Configuración de stats
  const statsConfig = [
    { 
      key: 'active',
      title: 'Activas', 
      fullTitle: 'Tareas Activas',
      value: stats.activeTasks, 
      icon: Clock, 
      color: 'text-accent-primary',
      hoverBg: 'hover:bg-accent-primary/10',
      filter: 'active'
    },
    { 
      key: 'completed',
      title: 'Completadas', 
      fullTitle: 'Completadas (mes)',
      value: stats.completedThisMonth, 
      icon: CheckCircle2, 
      color: 'text-accent-success',
      hoverBg: 'hover:bg-accent-success/10',
      filter: 'completed'
    },
    { 
      key: 'blocked',
      title: 'Bloqueadas', 
      fullTitle: 'Bloqueadas',
      value: stats.blocked, 
      icon: AlertTriangle, 
      color: 'text-accent-danger',
      hoverBg: 'hover:bg-accent-danger/10',
      filter: 'blocked'
    },
    { 
      key: 'waiting',
      title: 'Cliente', 
      fullTitle: 'Esperando Cliente',
      value: stats.waitingClient, 
      icon: Users, 
      color: 'text-accent-warning',
      hoverBg: 'hover:bg-accent-warning/10',
      filter: 'waiting'
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-text-primary">
          Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'} 👋
        </h2>
        <p className="text-sm md:text-base text-text-secondary">
          Aquí está el resumen de tu trabajo
        </p>
      </div>

      {/* Stats Grid - 2x2 en móvil, 4 columnas en desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statsConfig.map((stat) => (
          <Card 
            key={stat.key}
            className={cn(
              'cursor-pointer transition-all duration-200',
              stat.hoverBg,
              'hover:border-bg-tertiary hover:shadow-lg'
            )}
            onClick={() => handleStatClick(stat.filter)}
          >
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  {/* Título corto en móvil, completo en desktop */}
                  <p className="text-xs md:text-sm text-text-secondary">
                    <span className="md:hidden">{stat.title}</span>
                    <span className="hidden md:inline">{stat.fullTitle}</span>
                  </p>
                  <p className="text-2xl md:text-3xl font-bold text-text-primary mt-1">{stat.value}</p>
                </div>
                <div className={cn('p-2 md:p-3 rounded-lg bg-bg-tertiary', stat.color)}>
                  <stat.icon className="w-4 h-4 md:w-6 md:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid - Stack en móvil, 3 columnas en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-6 md:py-8">
                No hay actividad reciente
              </p>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    onClick={() => handleActivityClick(activity)}
                    className={cn(
                      'flex items-start md:items-center justify-between py-2 md:py-3 border-b border-bg-tertiary last:border-0 gap-2',
                      activity.task_id && 'cursor-pointer hover:bg-bg-tertiary/50 -mx-2 px-2 rounded-lg transition-colors'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{activity.title}</p>
                      <p className="text-xs md:text-sm text-text-secondary truncate">{activity.message}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {activity.task?.status && (
                        <Badge status={activity.task.status as any} className="hidden sm:flex" />
                      )}
                      <span className="text-xs text-text-secondary">
                        {formatRelativeTime(activity.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <FolderKanban className="w-4 h-4 md:w-5 md:h-5" />
              Proyectos Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-6 md:py-8">
                No hay proyectos activos
              </p>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => {
                  const progress = project.totalTasks > 0 
                    ? (project.completedTasks / project.totalTasks) * 100 
                    : 0

                  return (
                    <div
                      key={project.id}
                      onClick={() => handleProjectClick(project.id)}
                      className="p-3 rounded-lg bg-bg-tertiary hover:bg-bg-tertiary/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full shrink-0" 
                          style={{ backgroundColor: project.color }}
                        />
                        <p className="text-sm font-medium text-text-primary truncate">{project.name}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ 
                              width: `${progress}%`,
                              backgroundColor: project.color 
                            }}
                          />
                        </div>
                        <span className="text-xs text-text-secondary shrink-0">
                          {project.completedTasks}/{project.totalTasks}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
