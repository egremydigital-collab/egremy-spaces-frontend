import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardContent, Button, EmptyState } from '@/components/ui'
import { useUIStore } from '@/stores/ui.store'
import { supabase } from '@/lib/supabase'
import type { Project } from '@/types'
import { FolderKanban, Plus, ExternalLink, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export function ProjectsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { openCreateProjectModal } = useUIStore()

  const [projects, setProjects] = React.useState<Project[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Cargar proyectos cuando el componente se monta o la ruta cambia
  React.useEffect(() => {
    let isMounted = true

    const loadProjects = async () => {
      setIsLoading(true)
      setErrorMsg(null)

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('is_archived', false)
          .order('updated_at', { ascending: false })

        if (error) throw error
        
        if (isMounted) {
          setProjects((data as Project[]) || [])
        }
      } catch (err: any) {
        console.error('Error loading projects:', err)
        if (isMounted) {
          setErrorMsg(err?.message || 'Error cargando proyectos')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProjects()

    return () => {
      isMounted = false
    }
  }, [location.pathname]) // Re-ejecutar cuando cambia la ruta

  const handleRetry = () => {
    setIsLoading(true)
    setErrorMsg(null)
    // Trigger re-fetch by updating a dummy state
    setProjects([])
    // Small delay to ensure state is cleared
    setTimeout(() => {
      window.location.reload()
    }, 100)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-secondary">Cargando proyectos...</div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <EmptyState
        icon={<FolderKanban className="w-6 h-6 text-text-secondary" />}
        title="No se pudieron cargar los proyectos"
        description={String(errorMsg)}
        action={<Button onClick={handleRetry}>Reintentar</Button>}
      />
    )
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<FolderKanban className="w-6 h-6 text-text-secondary" />}
        title="No hay proyectos"
        description="Crea tu primer proyecto para comenzar a organizar el trabajo"
        action={
          <Button onClick={openCreateProjectModal}>
            <Plus className="w-4 h-4" />
            Nuevo Proyecto
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card
            key={project.id}
            variant="interactive"
            className="h-full cursor-pointer"
            onClick={() => navigate(`/app/projects/${project.id}`)}
            role="link"
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: (project.color || '#6366f1') + '20' }}
                >
                  <FolderKanban
                    className="w-5 h-5"
                    style={{ color: project.color || '#6366f1' }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-primary truncate">{project.name}</h3>
                  {project.client_name && (
                    <p className="text-sm text-text-secondary truncate">{project.client_name}</p>
                  )}
                </div>
              </div>

              {project.description && (
                <p className="text-sm text-text-secondary line-clamp-2 mb-4">
                  {project.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-bg-tertiary">
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(project.updated_at)}
                </div>

                {project.notion_url && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(project.notion_url!, '_blank', 'noopener,noreferrer')
                    }}
                    className="text-text-secondary hover:text-text-primary"
                    aria-label="Abrir en Notion"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card
          variant="interactive"
          className="h-full border-dashed border-2 flex items-center justify-center min-h-[200px] cursor-pointer"
          onClick={openCreateProjectModal}
        >
          <CardContent className="p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-text-secondary" />
            </div>
            <p className="text-sm font-medium text-text-secondary">Nuevo Proyecto</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
