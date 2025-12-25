import * as React from 'react'
import { Button, Input, Textarea, Card, Spinner } from '@/components/ui'
import { Select } from '@/components/ui/Select'
import { useUIStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import { KANBAN_COLUMNS, STATUS_LABELS } from '@/lib/utils'
import type { TaskStatus, TaskDetailed } from '@/types'
import { X } from 'lucide-react'

interface Project {
  id: string
  name: string
  organization_id: string
}

interface TaskCreateModalProps {
  projectId?: string
  organizationId?: string
  onSuccess?: (task: TaskDetailed) => void
}

export function TaskCreateModal({ projectId: propProjectId, organizationId: propOrgId, onSuccess }: TaskCreateModalProps) {
  const { createTaskModalOpen, closeCreateTaskModal } = useUIStore()
  const { profile } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Projects list (para modo global)
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = React.useState(false)

  // Form state
  const [selectedProjectId, setSelectedProjectId] = React.useState(propProjectId || '')
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [status, setStatus] = React.useState<TaskStatus>('discovery')
  const [priority, setPriority] = React.useState<'low' | 'medium' | 'high' | 'urgent'>('medium')

  // Cargar proyectos si no hay projectId prop
  React.useEffect(() => {
    const loadProjects = async () => {
      if (propProjectId || !createTaskModalOpen) return

      setLoadingProjects(true)
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, organization_id')
          .eq('is_archived', false)
          .order('name')

        if (!error && data) {
          setProjects(data)
          // Auto-seleccionar el primero si hay proyectos
          if (data.length > 0 && !selectedProjectId) {
            setSelectedProjectId(data[0].id)
          }
        }
      } catch (err) {
        console.error('Error loading projects:', err)
      } finally {
        setLoadingProjects(false)
      }
    }

    loadProjects()
  }, [createTaskModalOpen, propProjectId])

  // Reset form when modal closes
  React.useEffect(() => {
    if (!createTaskModalOpen) {
      setTitle('')
      setDescription('')
      setStatus('discovery')
      setPriority('medium')
      setError(null)
      if (!propProjectId) {
        setSelectedProjectId('')
      }
    }
  }, [createTaskModalOpen, propProjectId])

  // Update selectedProjectId when prop changes
  React.useEffect(() => {
    if (propProjectId) {
      setSelectedProjectId(propProjectId)
    }
  }, [propProjectId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validación
    if (!title.trim()) {
      setError('El título es obligatorio')
      return
    }

    const finalProjectId = propProjectId || selectedProjectId
    if (!finalProjectId) {
      setError('Debes seleccionar un proyecto')
      return
    }

    // Obtener organization_id
    let organizationId = propOrgId
    if (!organizationId) {
      const selectedProject = projects.find(p => p.id === finalProjectId)
      organizationId = selectedProject?.organization_id

      // Si aún no tenemos org_id, buscarlo del proyecto
      if (!organizationId) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('organization_id')
          .eq('id', finalProjectId)
          .single()
        
        organizationId = projectData?.organization_id
      }
    }

    if (!organizationId) {
      setError('No se pudo determinar la organización')
      return
    }

    setIsSubmitting(true)

    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // Calcular posición (última + 1)
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('position')
        .eq('project_id', finalProjectId)
        .eq('status', status)
        .order('position', { ascending: false })
        .limit(1)

      const maxPosition = existingTasks?.[0]?.position || 0
      const newPosition = maxPosition + 1

      // Crear tarea
      const { data: newTask, error: insertError } = await supabase
        .from('tasks')
        .insert({
          project_id: finalProjectId,
          organization_id: organizationId,
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          position: newPosition,
          created_by: user.id,
          assignee_id: user.id
        })
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(full_name, avatar_url, team),
          project:projects!tasks_project_id_fkey(id, name, slug, client_name, color)
        `)
        .single()

      if (insertError) throw insertError

      console.log('✅ Tarea creada:', newTask)

      // Callback de éxito (si existe)
      if (onSuccess) {
        onSuccess(newTask as TaskDetailed)
      }

      // Cerrar modal
      closeCreateTaskModal()

    } catch (err: any) {
      console.error('💥 Error creando tarea:', err)
      setError(err.message || 'Error al crear la tarea')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!createTaskModalOpen) return null

  const showProjectSelector = !propProjectId

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={closeCreateTaskModal}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-bg-primary">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-bg-tertiary">
            <h2 className="text-lg font-semibold text-text-primary">
              Nueva Tarea
            </h2>
            <button
              onClick={closeCreateTaskModal}
              className="p-1 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Error global */}
            {error && (
              <div className="p-3 rounded-lg bg-accent-danger/10 border border-accent-danger/20">
                <p className="text-sm text-accent-danger">{error}</p>
              </div>
            )}

            {/* Selector de Proyecto (solo en modo global) */}
            {showProjectSelector && (
              <Select
                label="Proyecto"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={isSubmitting || loadingProjects}
                required
              >
                <option value="">Selecciona un proyecto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            )}

            {/* Título */}
            <Input
              label="Título"
              placeholder="Ej: Configurar webhook WhatsApp"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isSubmitting}
            />

            {/* Descripción */}
            <Textarea
              label="Descripción"
              placeholder="Describe la tarea (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />

            {/* Estado */}
            <Select
              label="Estado"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              disabled={isSubmitting}
            >
              {KANBAN_COLUMNS.map((col) => (
                <option key={col} value={col}>
                  {STATUS_LABELS[col] || col}
                </option>
              ))}
            </Select>

            {/* Prioridad */}
            <Select
              label="Prioridad"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              disabled={isSubmitting}
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </Select>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={closeCreateTaskModal}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (showProjectSelector && !selectedProjectId)}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" />
                    Creando...
                  </>
                ) : (
                  'Crear Tarea'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  )
}
