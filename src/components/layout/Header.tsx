import * as React from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui'
import { useUIStore } from '@/stores/ui.store'
import { Search, Plus, Bell } from 'lucide-react'

// Map de rutas a títulos
const routeTitles: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/inbox': 'Inbox',
  '/app/my-tasks': 'Mis Tareas',
  '/app/projects': 'Proyectos',
  '/app/settings': 'Configuración',
}

export function Header() {
  const location = useLocation()
  const { openCreateTaskModal, openCreateProjectModal } = useUIStore()
  
  // Obtener título basado en la ruta
  const getTitle = () => {
    // Buscar coincidencia exacta primero
    if (routeTitles[location.pathname]) {
      return routeTitles[location.pathname]
    }
    // Si es un proyecto específico
    if (location.pathname.startsWith('/app/projects/')) {
      return 'Proyecto'
    }
    return 'Egremy Spaces'
  }

  const isProjectsPage = location.pathname.startsWith('/app/projects')

  return (
    <header className="h-16 bg-bg-secondary border-b border-bg-tertiary flex items-center justify-between px-6">
      {/* Left: Title */}
      <h1 className="text-xl font-semibold text-text-primary">{getTitle()}</h1>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Buscar... (⌘K)"
            className="w-64 pl-10 pr-4 py-2 bg-bg-tertiary border border-bg-tertiary rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent-danger rounded-full" />
        </Button>

        {/* Create button */}
        <Button
          onClick={isProjectsPage ? openCreateProjectModal : openCreateTaskModal}
          size="sm"
        >
          <Plus className="w-4 h-4" />
          {isProjectsPage ? 'Nuevo Proyecto' : 'Nueva Tarea'}
        </Button>
      </div>
    </header>
  )
}
