import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { useAuthStore } from '@/stores/auth.store'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  FolderKanban,
  Users,
} from 'lucide-react'

// Datos de ejemplo (en producción vendrían de Supabase)
const stats = [
  { title: 'Tareas Activas', value: 12, icon: Clock, color: 'text-accent-primary' },
  { title: 'Completadas (mes)', value: 28, icon: CheckCircle2, color: 'text-accent-success' },
  { title: 'Bloqueadas', value: 2, icon: AlertTriangle, color: 'text-accent-danger' },
  { title: 'Esperando Cliente', value: 3, icon: Users, color: 'text-accent-warning' },
]

const recentActivity = [
  { id: 1, action: 'Tarea completada', task: 'Flujo WhatsApp CRM', time: 'Hace 2h', status: 'live' as const },
  { id: 2, action: 'Aprobación recibida', task: 'Landing Page Lead', time: 'Hace 4h', status: 'deploy' as const },
  { id: 3, action: 'Tarea bloqueada', task: 'Integración Sheets', time: 'Hace 5h', status: 'blocked' as const },
  { id: 4, action: 'Nueva tarea', task: 'Webhook Notificaciones', time: 'Hace 6h', status: 'discovery' as const },
]

export function DashboardPage() {
  const { profile } = useAuthStore()

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary">
          Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'} 👋
        </h2>
        <p className="text-text-secondary">
          Aquí está el resumen de tu trabajo
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">{stat.title}</p>
                  <p className="text-3xl font-bold text-text-primary mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg bg-bg-tertiary ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-bg-tertiary last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{item.action}</p>
                    <p className="text-sm text-text-secondary">{item.task}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge status={item.status} />
                    <span className="text-xs text-text-secondary">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5" />
              Proyectos Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['CRM Automatización', 'Lead Gen WhatsApp', 'Sheets Integration'].map((project) => (
                <div
                  key={project}
                  className="p-3 rounded-lg bg-bg-tertiary hover:bg-bg-tertiary/80 cursor-pointer transition-colors"
                >
                  <p className="text-sm font-medium text-text-primary">{project}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-primary rounded-full"
                        style={{ width: `${Math.random() * 60 + 40}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-secondary">
                      {Math.floor(Math.random() * 5) + 3} tareas
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
