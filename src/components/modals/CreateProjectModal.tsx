import * as React from 'react'
import { X } from 'lucide-react'
import { Button, Input, Textarea } from '@/components/ui'
import { useUIStore } from '@/stores/ui.store'
import { supabase } from '@/lib/supabase'

export function CreateProjectModal() {
  const { createProjectModalOpen, closeCreateProjectModal } = useUIStore()
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [clientName, setClientName] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (!createProjectModalOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get user profile for organization_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile) throw new Error('No profile')

      const { error: insertError } = await supabase
        .from('projects')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          client_name: clientName.trim() || null,
          organization_id: profile.organization_id,
          created_by: user.id,
          color: '#6366f1' // Default indigo
        })

      if (insertError) throw insertError

      // Reset form and close
      setName('')
      setDescription('')
      setClientName('')
      closeCreateProjectModal()
      
      // Reload page to show new project
      window.location.reload()
    } catch (err: any) {
      console.error('Error creating project:', err)
      setError(err.message || 'Error al crear proyecto')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeCreateProjectModal}
      />
      
      {/* Modal */}
      <div className="relative bg-bg-primary border border-border-primary rounded-xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          <h2 className="text-lg font-semibold text-text-primary">Nuevo Proyecto</h2>
          <button
            onClick={closeCreateProjectModal}
            className="p-1 rounded-lg hover:bg-bg-tertiary text-text-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <Input
            label="Nombre del proyecto *"
            placeholder="Ej: CRM Automatización"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <Input
            label="Cliente"
            placeholder="Nombre del cliente"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />

          <Textarea
            label="Descripción"
            placeholder="Describe brevemente el proyecto..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={closeCreateProjectModal}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Creando...' : 'Crear Proyecto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}