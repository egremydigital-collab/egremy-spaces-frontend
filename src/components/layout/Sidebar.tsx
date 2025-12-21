import * as React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar } from '@/components/ui'
import {
  LayoutDashboard,
  FolderKanban,
  Inbox,
  CheckSquare,
  Settings,
  LogOut,
  Rocket,
  ChevronDown,
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: number
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { title: 'Inbox', href: '/app/inbox', icon: Inbox, badge: 3 },
  { title: 'Mis Tareas', href: '/app/my-tasks', icon: CheckSquare },
  { title: 'Proyectos', href: '/app/projects', icon: FolderKanban },
]

export function Sidebar() {
  const location = useLocation()
  const { profile, logout } = useAuthStore()
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <aside className="w-64 h-screen bg-bg-secondary border-r border-bg-tertiary flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-bg-tertiary">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg text-text-primary">Egremy Spaces</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === '/app/projects' && location.pathname.startsWith('/app/projects'))
          
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-accent-primary text-white">
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User menu */}
      <div className="p-4 border-t border-bg-tertiary">
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <Avatar
              name={profile?.full_name || 'Usuario'}
              src={profile?.avatar_url}
              size="sm"
            />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-text-primary truncate">
                {profile?.full_name || 'Usuario'}
              </p>
              <p className="text-xs text-text-secondary truncate">
                {profile?.team === 'egremy_digital' ? 'Egremy Digital' : 
                 profile?.team === 'orangutan_n8n' ? 'Orangutan n8n' : 'Team'}
              </p>
            </div>
            <ChevronDown className={cn(
              'w-4 h-4 text-text-secondary transition-transform',
              userMenuOpen && 'rotate-180'
            )} />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 py-1 bg-bg-secondary border border-bg-tertiary rounded-lg shadow-lg">
              <NavLink
                to="/app/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                onClick={() => setUserMenuOpen(false)}
              >
                <Settings className="w-4 h-4" />
                Configuración
              </NavLink>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-accent-danger hover:bg-bg-tertiary"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
