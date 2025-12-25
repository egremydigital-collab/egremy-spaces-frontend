import * as React from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui'
import { useUIStore } from '@/stores/ui.store'
import { Search, Plus, Bell, Menu } from 'lucide-react'

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
  const { openCreateTaskModal, openCreateProjectModal, toggleSidebar } = useUIStore()
  const [showSearch, setShowSearch] = React.useState(false)
  
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
    <header className="h-16 bg-bg-secondary border-b border-bg-tertiary flex items-center justify-between px-4 md:px-6">
      {/* Left: Hamburger + Title */}
      <div className="flex items-center gap-3">
        {/* Hamburger menu - solo móvil */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-bg-tertiary text-text-secondary"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <h1 className="text-lg md:text-xl font-semibold text-text-primary">{getTitle()}</h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Search - Desktop */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Buscar... (⌘K)"
            className="w-48 lg:w-64 pl-10 pr-4 py-2 bg-bg-tertiary border border-bg-tertiary rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
          />
        </div>

        {/* Search toggle - Mobile */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          onClick={() => setShowSearch(!showSearch)}
        >
          <Search className="w-5 h-5" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent-danger rounded-full" />
        </Button>

        {/* Create button */}
        <Button
          onClick={isProjectsPage ? openCreateProjectModal : openCreateTaskModal}
          size="sm"
          className="hidden sm:flex"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden md:inline ml-1">
            {isProjectsPage ? 'Nuevo Proyecto' : 'Nueva Tarea'}
          </span>
        </Button>

        {/* Create button - Mobile (solo icono) */}
        <Button
          onClick={isProjectsPage ? openCreateProjectModal : openCreateTaskModal}
          size="icon"
          className="sm:hidden"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile Search Bar - Expandible */}
      {showSearch && (
        <div className="absolute top-16 left-0 right-0 p-4 bg-bg-secondary border-b border-bg-tertiary md:hidden z-30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Buscar..."
              autoFocus
              className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-bg-tertiary rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
              onBlur={() => setShowSearch(false)}
            />
          </div>
        </div>
      )}
    </header>
  )
}
