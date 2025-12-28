import * as React from 'react'
import { Button, Badge, Avatar, Spinner } from '@/components/ui'
import { useUIStore } from '@/stores/ui.store'
import { supabase, handleSupabaseError } from '@/lib/supabase'
import { cn, STATUS_CONFIG, STATUS_LABELS, formatRelativeTime } from '@/lib/utils'
import type { TaskDetailed, TaskStatus, Comment } from '@/types'
import { logApprovalLinkSent, logTaskDeleted } from '@/lib/activity-logs'
import { useTaskEventsStore } from '@/stores/task-events.store'
import { TaskAttachments } from './TaskAttachments'
import { toast } from 'sonner'
import {
  X,
  Calendar,
  User,
  MessageSquare,
  Clock,
  AlertTriangle,
  ExternalLink,
  Send,
  CheckCircle2,
  Link as LinkIcon,
  Share2,
  Copy,
  Check,
  Trash2,
  ArrowLeft,
  Pencil,
} from 'lucide-react'

// ============================================
// Webhook n8n Configuration
// ============================================
const N8N_WEBHOOK_URL = 'https://curso-orangutan-n8n.crkear.easypanel.host/webhook/egremy/approval-requested'
const N8N_WEBHOOK_SECRET = 'EgremySpaces2024SecretKey!'

// ============================================
// Priority Configuration
// ============================================
const PRIORITY_CONFIG = {
  urgent: { label: '🔴 Urgente', color: 'bg-red-500/20 text-red-400' },
  high: { label: '🟠 Alta', color: 'bg-orange-500/20 text-orange-400' },
  medium: { label: '🟡 Media', color: 'bg-yellow-500/20 text-yellow-400' },
  low: { label: '🟢 Baja', color: 'bg-green-500/20 text-green-400' },
} as const

type Priority = keyof typeof PRIORITY_CONFIG

// ============================================
// TaskDrawer - Panel lateral de detalles
// ============================================

interface TaskDrawerProps {
  onTaskUpdated?: (task: TaskDetailed) => void
  onRefreshTasks?: () => void
}

export function TaskDrawer({ onTaskUpdated, onRefreshTasks }: TaskDrawerProps) {
  const { selectedTask, taskDrawerOpen, closeTaskDrawer } = useUIStore()
  const { triggerRefresh } = useTaskEventsStore()
  
  // State
  const [isSaving, setIsSaving] = React.useState(false)
  const [comments, setComments] = React.useState<Comment[]>([])
  const [newComment, setNewComment] = React.useState('')
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false)
  
  // Editable fields
  const [editedStatus, setEditedStatus] = React.useState<TaskStatus>('discovery')
  const [editedDueDate, setEditedDueDate] = React.useState<string>('')
  const [isSavingDueDate, setIsSavingDueDate] = React.useState(false)

  // ============================================
  // NUEVOS ESTADOS PARA EDICIÓN
  // ============================================
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [editedTitle, setEditedTitle] = React.useState('')
  const [isSavingTitle, setIsSavingTitle] = React.useState(false)

  const [isEditingDescription, setIsEditingDescription] = React.useState(false)
  const [editedDescription, setEditedDescription] = React.useState('')
  const [isSavingDescription, setIsSavingDescription] = React.useState(false)

  const [editedPriority, setEditedPriority] = React.useState<Priority>('medium')
  const [isSavingPriority, setIsSavingPriority] = React.useState(false)

  // Refs para inputs
  const titleInputRef = React.useRef<HTMLInputElement>(null)
  const descriptionTextareaRef = React.useRef<HTMLTextAreaElement>(null)

  // ============================================
  // Estado para Solicitar Aprobación
  // ============================================
  const [showApprovalModal, setShowApprovalModal] = React.useState(false)
  const [clientName, setClientName] = React.useState('')
  const [clientPhone, setClientPhone] = React.useState('')
  const [isRequestingApproval, setIsRequestingApproval] = React.useState(false)
  const [approvalLink, setApprovalLink] = React.useState<string | null>(null)
  const [linkCopied, setLinkCopied] = React.useState(false)
  const [telegramSent, setTelegramSent] = React.useState(false)
  const [autoCloseCountdown, setAutoCloseCountdown] = React.useState<number | null>(null)

  // Estado para eliminar tarea
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Load task details and comments
  React.useEffect(() => {
    if (selectedTask && taskDrawerOpen) {
      setEditedStatus(selectedTask.status)
      setEditedTitle(selectedTask.title)
      setEditedDescription(selectedTask.description || '')
      setEditedPriority((selectedTask.priority as Priority) || 'medium')
      
      // Inicializar fecha en formato YYYY-MM-DD para el input date
      if (selectedTask.due_date) {
        const dateOnly = selectedTask.due_date.split('T')[0]
        setEditedDueDate(dateOnly)
      } else {
        setEditedDueDate('')
      }
      
      // Reset editing states
      setIsEditingTitle(false)
      setIsEditingDescription(false)
      
      loadComments()
    }
  }, [selectedTask, taskDrawerOpen])

  // Focus en input cuando se activa edición
  React.useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  React.useEffect(() => {
    if (isEditingDescription && descriptionTextareaRef.current) {
      descriptionTextareaRef.current.focus()
    }
  }, [isEditingDescription])

  // Bloquear scroll del body cuando el drawer está abierto en móvil
  React.useEffect(() => {
    if (taskDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [taskDrawerOpen])

  // Close on Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Si estamos editando, cancelar edición
        if (isEditingTitle) {
          setIsEditingTitle(false)
          setEditedTitle(selectedTask?.title || '')
          return
        }
        if (isEditingDescription) {
          setIsEditingDescription(false)
          setEditedDescription(selectedTask?.description || '')
          return
        }
        
        if (showDeleteModal) {
          setShowDeleteModal(false)
        } else if (showApprovalModal) {
          if (approvalLink) {
            handleCloseEverything()
          } else {
            resetApprovalModal()
          }
        } else {
          closeTaskDrawer()
        }
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [closeTaskDrawer, showApprovalModal, showDeleteModal, approvalLink, isEditingTitle, isEditingDescription, selectedTask])

  // Load comments
  const loadComments = async () => {
    if (!selectedTask) return
    
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:profiles!comments_author_id_fkey(full_name, avatar_url)
        `)
        .eq('task_id', selectedTask.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (err) {
      console.error('Error loading comments:', err)
    }
  }

  // ============================================
  // GUARDAR TÍTULO
  // ============================================
  const handleSaveTitle = async () => {
    if (!selectedTask || !editedTitle.trim()) {
      toast.error('El título es requerido')
      return
    }
    
    if (editedTitle.trim() === selectedTask.title) {
      setIsEditingTitle(false)
      return
    }

    setIsSavingTitle(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          title: editedTitle.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTask.id)
        .select()
        .single()

      if (error) throw error

      setIsEditingTitle(false)
      if (onTaskUpdated && data) {
        onTaskUpdated({ ...selectedTask, ...data })
      }
      toast.success('Título actualizado')
      
      // Refrescar vistas
      triggerRefresh()
      if (onRefreshTasks) {
        setTimeout(() => onRefreshTasks(), 100)
      }
    } catch (err) {
      console.error('Error updating title:', err)
      toast.error('Error al guardar')
      setEditedTitle(selectedTask.title)
    } finally {
      setIsSavingTitle(false)
    }
  }

  // ============================================
  // GUARDAR DESCRIPCIÓN
  // ============================================
  const handleSaveDescription = async () => {
    if (!selectedTask) return
    
    if (editedDescription.trim() === (selectedTask.description || '')) {
      setIsEditingDescription(false)
      return
    }

    setIsSavingDescription(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          description: editedDescription.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTask.id)
        .select()
        .single()

      if (error) throw error

      setIsEditingDescription(false)
      if (onTaskUpdated && data) {
        onTaskUpdated({ ...selectedTask, ...data })
      }
      toast.success('Descripción actualizada')
    } catch (err) {
      console.error('Error updating description:', err)
      toast.error('Error al guardar')
      setEditedDescription(selectedTask.description || '')
    } finally {
      setIsSavingDescription(false)
    }
  }

  // ============================================
  // GUARDAR PRIORIDAD
  // ============================================
  const handlePriorityChange = async (newPriority: Priority) => {
    if (!selectedTask || newPriority === selectedTask.priority) return

    setIsSavingPriority(true)
    setEditedPriority(newPriority)
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          priority: newPriority,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTask.id)
        .select()
        .single()

      if (error) throw error

      if (onTaskUpdated && data) {
        onTaskUpdated({ ...selectedTask, ...data })
      }
      toast.success('Prioridad actualizada')
      
      // Refrescar vistas
      triggerRefresh()
      if (onRefreshTasks) {
        setTimeout(() => onRefreshTasks(), 100)
      }
    } catch (err) {
      console.error('Error updating priority:', err)
      toast.error('Error al guardar')
      setEditedPriority((selectedTask.priority as Priority) || 'medium')
    } finally {
      setIsSavingPriority(false)
    }
  }

  // Update task status
  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!selectedTask || newStatus === selectedTask.status) return
      
    setIsSaving(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          previous_status: selectedTask.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTask.id)
        .select()
        .single()

      if (error) throw error
      
      setEditedStatus(newStatus)
      if (onTaskUpdated && data) {
        onTaskUpdated({ ...selectedTask, ...data })
      }
      toast.success('Estado actualizado')
      
      // Refrescar vistas
      triggerRefresh()
      if (onRefreshTasks) {
        setTimeout(() => onRefreshTasks(), 100)
      }
    } catch (err) {
      console.error('Error updating status:', err)
      toast.error('Error al guardar')
      setEditedStatus(selectedTask.status)
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================
  // Update Due Date
  // ============================================
  const handleDueDateChange = async (newDate: string) => {
    if (!selectedTask) return
    
    const currentDate = selectedTask.due_date ? selectedTask.due_date.split('T')[0] : ''
    if (newDate === currentDate) return
    
    setIsSavingDueDate(true)
    setEditedDueDate(newDate)
    
    try {
      const dueDateValue = newDate ? `${newDate}T12:00:00.000Z` : null
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          due_date: dueDateValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTask.id)
        .select()
        .single()

      if (error) throw error
      
      if (onTaskUpdated && data) {
        onTaskUpdated({ ...selectedTask, ...data })
      }
      
      toast.success(newDate ? 'Fecha actualizada' : 'Fecha eliminada')
      
      // Refrescar vistas
      triggerRefresh()
      if (onRefreshTasks) {
        setTimeout(() => onRefreshTasks(), 100)
      }
    } catch (err) {
      console.error('Error updating due date:', err)
      toast.error('Error al guardar')
      if (selectedTask.due_date) {
        setEditedDueDate(selectedTask.due_date.split('T')[0])
      } else {
        setEditedDueDate('')
      }
    } finally {
      setIsSavingDueDate(false)
    }
  }

  // ============================================
  // Cerrar TODO (modal + drawer + refrescar)
  // ============================================
  const handleCloseEverything = () => {
    setShowApprovalModal(false)
    setClientName('')
    setClientPhone('')
    setApprovalLink(null)
    setLinkCopied(false)
    setTelegramSent(false)
    setAutoCloseCountdown(null)

    closeTaskDrawer()

    if (onRefreshTasks) {
      setTimeout(() => onRefreshTasks(), 0)
    }
  }

  // ============================================
  // Eliminar Tarea
  // ============================================
  const handleDeleteTask = async () => {
    if (!selectedTask) return
    
    setIsDeleting(true)
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', selectedTask.id)
      
      if (error) throw error
      
      logTaskDeleted(
        selectedTask.id,
        selectedTask.title,
        selectedTask.project_id,
        selectedTask.project?.name,
        selectedTask.organization_id
      )

      setShowDeleteModal(false)
      closeTaskDrawer()
      
      toast.success('Tarea eliminada')
      
      setTimeout(() => {
        triggerRefresh()
        if (onRefreshTasks) {
          onRefreshTasks()
        }
      }, 100)
      
    } catch (err: any) {
      console.error('Error eliminando tarea:', err)
      handleSupabaseError(err)
    } finally {
      setIsDeleting(false)
    }
  }

  // ============================================
  // Solicitar Aprobación del Cliente
  // ============================================
  const handleRequestApproval = async () => {
    if (!selectedTask) {
      toast.error('No hay tarea seleccionada')
      return
    }
    
    if (!clientName.trim()) {
      toast.error('Ingresa el nombre del cliente')
      return
    }
    
    if (!clientPhone.trim()) {
      toast.error('Ingresa el teléfono del cliente')
      return
    }

    setIsRequestingApproval(true)
    setTelegramSent(false)
    
    try {
      const token = `${selectedTask.id.slice(0, 8)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 48)
      
      const expiresAtFormatted = expiresAt.toLocaleString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      const insertData = {
        task_id: selectedTask.id,
        token: token,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      }

      const { error } = await supabase
        .from('approval_tokens')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error

      const { error: taskError } = await supabase
        .from('tasks')
        .update({ 
          status: 'needs_client_approval',
          previous_status: selectedTask.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTask.id)

      if (!taskError) {
        setEditedStatus('needs_client_approval')
        if (onTaskUpdated) {
          onTaskUpdated({ ...selectedTask, status: 'needs_client_approval' })
        }
      }

      const baseUrl = window.location.origin
      const link = `${baseUrl}/approval/${token}`
      setApprovalLink(link)

      const cleanPhone = clientPhone.replace(/\D/g, '')
      
      const webhookPayload = {
        client_phone: cleanPhone,
        approval_url: link,
        task_title: selectedTask.title,
        project_name: selectedTask.project?.name || 'Proyecto',
        expires_at: expiresAtFormatted
      }

      try {
        const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${N8N_WEBHOOK_SECRET}`
          },
          body: JSON.stringify(webhookPayload)
        })

        if (webhookResponse.ok) {
          setTelegramSent(true)
        }
      } catch (webhookError) {
        console.error('Error llamando webhook n8n:', webhookError)
      }

      try {
        await logApprovalLinkSent(
          selectedTask.id,
          token,
          clientName.trim(),
          'telegram',
          expiresAt.toISOString()
        )
      } catch (logError) {
        console.error('Error registrando activity log:', logError)
      }

      setAutoCloseCountdown(3)
      setTimeout(() => setAutoCloseCountdown(2), 1000)
      setTimeout(() => setAutoCloseCountdown(1), 2000)
      
      setTimeout(() => {
        setShowApprovalModal(false)
        setClientName('')
        setClientPhone('')
        setApprovalLink(null)
        setLinkCopied(false)
        setTelegramSent(false)
        setAutoCloseCountdown(null)
        closeTaskDrawer()
        if (onRefreshTasks) {
          setTimeout(() => onRefreshTasks(), 0)
        }
      }, 3000)

    } catch (err: any) {
      console.error('Error:', err)
      handleSupabaseError(err, {
        customMessages: {
          401: 'Tu sesión expiró. Vuelve a iniciar sesión.',
          403: 'No tienes permisos para generar links de aprobación.',
          406: 'La tarea ya no existe o fue eliminada.'
        }
      })
    } finally {
      setIsRequestingApproval(false)
    }
  }

  const handleCopyLink = async () => {
    if (!approvalLink) return
    
    try {
      await navigator.clipboard.writeText(approvalLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Error copiando link:', err)
    }
  }

  const resetApprovalModal = () => {
    setShowApprovalModal(false)
    setClientName('')
    setClientPhone('')
    setApprovalLink(null)
    setLinkCopied(false)
    setTelegramSent(false)
    setAutoCloseCountdown(null)
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedTask || !newComment.trim()) return

    setIsSubmittingComment(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data, error } = await supabase
        .from('comments')
        .insert({
          task_id: selectedTask.id,
          organization_id: selectedTask.organization_id,
          content: newComment.trim(),
          author_id: user.id,
          is_client_comment: false,
          mentions: []
        })
        .select(`
          *,
          author:profiles!comments_author_id_fkey(full_name, avatar_url)
        `)
        .single()

      if (error) throw error

      setComments((prev) => [...prev, data])
      setNewComment('')
    } catch (err) {
      console.error('Error adding comment:', err)
      toast.error('Error al agregar comentario')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  if (!taskDrawerOpen || !selectedTask) return null

  const statusConfig = STATUS_CONFIG[selectedTask.status]
  const isBlocking = ['blocked', 'needs_client_approval', 'bug', 'hotfix'].includes(selectedTask.status)

  return (
    <>
      {/* Overlay - visible en desktop, oculto en móvil porque es fullscreen */}
      <div
        className="fixed inset-0 bg-black/30 z-40 hidden md:block"
        onClick={closeTaskDrawer}
      />

      {/* Drawer - Fullscreen en móvil, panel lateral en desktop */}
      <div
        className={cn(
          'fixed z-50 bg-bg-primary flex flex-col',
          'inset-0 w-full h-full',
          'md:inset-auto md:right-0 md:top-0 md:h-full md:w-full md:max-w-lg md:border-l md:border-bg-tertiary',
          'animate-in slide-in-from-right duration-300'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-bg-tertiary shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={closeTaskDrawer}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-bg-tertiary text-text-secondary"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: statusConfig?.color || '#6366f1' }}
            />
            <span className="text-sm text-text-secondary truncate">
              {selectedTask.project?.name || 'Proyecto'}
            </span>
          </div>
          <button
            onClick={closeTaskDrawer}
            className="hidden md:block p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* ============================================ */}
          {/* TÍTULO EDITABLE */}
          {/* ============================================ */}
          <div className="px-4 md:px-6 py-4 md:py-5 border-b border-bg-tertiary">
            {isEditingTitle ? (
              <div className="space-y-2">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle()
                    if (e.key === 'Escape') {
                      setIsEditingTitle(false)
                      setEditedTitle(selectedTask.title)
                    }
                  }}
                  className="w-full text-lg md:text-xl font-semibold text-text-primary bg-bg-secondary border border-accent-primary rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  disabled={isSavingTitle}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveTitle}
                    disabled={isSavingTitle || !editedTitle.trim()}
                  >
                    {isSavingTitle ? <Spinner size="sm" /> : 'Guardar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingTitle(false)
                      setEditedTitle(selectedTask.title)
                    }}
                    disabled={isSavingTitle}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className="group cursor-pointer"
                onClick={() => setIsEditingTitle(true)}
              >
                <div className="flex items-start gap-2">
                  <h2 className="text-lg md:text-xl font-semibold text-text-primary flex-1">
                    {selectedTask.title}
                  </h2>
                  <Pencil className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                </div>
              </div>
            )}

            {/* ============================================ */}
            {/* DESCRIPCIÓN EDITABLE */}
            {/* ============================================ */}
            <div className="mt-3">
              {isEditingDescription ? (
                <div className="space-y-2">
                  <textarea
                    ref={descriptionTextareaRef}
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsEditingDescription(false)
                        setEditedDescription(selectedTask.description || '')
                      }
                    }}
                    placeholder="Agregar descripción..."
                    rows={4}
                    className="w-full text-sm text-text-primary bg-bg-secondary border border-accent-primary rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 resize-none"
                    disabled={isSavingDescription}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveDescription}
                      disabled={isSavingDescription}
                    >
                      {isSavingDescription ? <Spinner size="sm" /> : 'Guardar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsEditingDescription(false)
                        setEditedDescription(selectedTask.description || '')
                      }}
                      disabled={isSavingDescription}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="group cursor-pointer"
                  onClick={() => setIsEditingDescription(true)}
                >
                  <div className="flex items-start gap-2">
                    {selectedTask.description ? (
                      <p className="text-text-secondary text-sm leading-relaxed flex-1">
                        {selectedTask.description}
                      </p>
                    ) : (
                      <p className="text-text-secondary/50 text-sm italic flex-1">
                        Agregar descripción...
                      </p>
                    )}
                    <Pencil className="w-3 h-3 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Blocking Alert */}
          {isBlocking && (
            <div className="mx-4 md:mx-6 mt-4 p-3 rounded-lg bg-accent-warning/10 border border-accent-warning/20">
              <div className="flex items-center gap-2 text-accent-warning">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">
                  {selectedTask.status === 'blocked' && 'Esta tarea está bloqueada'}
                  {selectedTask.status === 'needs_client_approval' && 'Esperando aprobación del cliente'}
                  {selectedTask.status === 'bug' && 'Bug reportado'}
                  {selectedTask.status === 'hotfix' && 'Hotfix urgente'}
                </span>
              </div>
              {selectedTask.blocked_reason && (
                <p className="mt-2 text-sm text-text-secondary">
                  {selectedTask.blocked_reason}
                </p>
              )}
            </div>
          )}

          {/* BOTÓN SOLICITAR APROBACIÓN */}
          <div className="px-4 md:px-6 py-4 border-b border-bg-tertiary">
            <Button
              onClick={() => setShowApprovalModal(true)}
              variant="outline"
              className="w-full justify-center gap-2 border-accent-primary/50 text-accent-primary hover:bg-accent-primary/10"
            >
              <Share2 className="w-4 h-4" />
              Solicitar Aprobación del Cliente
            </Button>
          </div>

          {/* BOTÓN ELIMINAR TAREA */}
          <div className="px-4 md:px-6 py-4 border-b border-bg-tertiary">
            <Button
              onClick={() => setShowDeleteModal(true)}
              variant="outline"
              className="w-full justify-center gap-2 border-accent-danger/50 text-accent-danger hover:bg-accent-danger/10"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Tarea
            </Button>
          </div>

          {/* Properties */}
          <div className="px-4 md:px-6 py-4 md:py-5 space-y-4 border-b border-bg-tertiary">
            {/* Status */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-text-secondary flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                Estado
                {isSaving && <Spinner size="sm" />}
              </span>
              <select
                value={editedStatus}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                disabled={isSaving}
                className="text-sm bg-bg-secondary border border-bg-tertiary rounded-lg px-3 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 max-w-[180px]"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* ============================================ */}
            {/* PRIORIDAD EDITABLE */}
            {/* ============================================ */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-text-secondary flex items-center gap-2 shrink-0">
                <AlertTriangle className="w-4 h-4" />
                Prioridad
                {isSavingPriority && <Spinner size="sm" />}
              </span>
              <select
                value={editedPriority}
                onChange={(e) => handlePriorityChange(e.target.value as Priority)}
                disabled={isSavingPriority}
                className={cn(
                  'text-sm bg-bg-secondary border border-bg-tertiary rounded-lg px-3 py-1.5',
                  'focus:outline-none focus:ring-2 focus:ring-accent-primary/50',
                  PRIORITY_CONFIG[editedPriority]?.color
                )}
              >
                {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary flex items-center gap-2">
                <User className="w-4 h-4" />
                Asignado
              </span>
              {selectedTask.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar
                    name={selectedTask.assignee.full_name}
                    src={selectedTask.assignee.avatar_url}
                    size="sm"
                  />
                  <span className="text-sm text-text-primary truncate max-w-[120px]">
                    {selectedTask.assignee.full_name}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-text-secondary/50">Sin asignar</span>
              )}
            </div>

            {/* Due Date - EDITABLE */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Fecha límite
                {isSavingDueDate && <Spinner size="sm" className="ml-1" />}
              </span>
              <input
                type="date"
                value={editedDueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                disabled={isSavingDueDate}
                className={cn(
                  'text-sm bg-bg-secondary border border-bg-tertiary rounded-lg px-3 py-1.5 text-text-primary',
                  'focus:outline-none focus:ring-2 focus:ring-accent-primary/50',
                  'cursor-pointer hover:border-accent-primary/50 transition-colors',
                  editedDueDate && new Date(editedDueDate) < new Date(new Date().toDateString())
                    ? 'text-accent-danger border-accent-danger/50'
                    : '',
                  !editedDueDate && 'text-text-secondary/50'
                )}
              />
            </div>

            {/* Complexity */}
            {selectedTask.complexity && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Complejidad
                </span>
                <div className="flex items-center gap-1">
                  {['low', 'medium', 'high'].map((level, i) => (
                    <div
                      key={level}
                      className={cn(
                        'w-2 h-4 rounded-full',
                        i < (['low', 'medium', 'high'].indexOf(selectedTask.complexity!) + 1)
                          ? selectedTask.complexity === 'high'
                            ? 'bg-accent-danger'
                            : selectedTask.complexity === 'medium'
                            ? 'bg-accent-warning'
                            : 'bg-accent-success'
                          : 'bg-bg-tertiary'
                      )}
                    />
                  ))}
                  <span className="ml-2 text-sm text-text-primary capitalize">
                    {selectedTask.complexity === 'low' && 'Baja'}
                    {selectedTask.complexity === 'medium' && 'Media'}
                    {selectedTask.complexity === 'high' && 'Alta'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          <TaskAttachments
            taskId={selectedTask.id}
            organizationId={selectedTask.organization_id}
          />

          {/* Links */}
          {(selectedTask.notion_page_url || selectedTask.google_doc_url) && (
            <div className="px-4 md:px-6 py-4 border-b border-bg-tertiary">
              <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Enlaces
              </h3>
              <div className="space-y-2">
                {selectedTask.notion_page_url && (
                  <a
                    href={selectedTask.notion_page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-accent-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Notion
                  </a>
                )}
                {selectedTask.google_doc_url && (
                  <a
                    href={selectedTask.google_doc_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-accent-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Google Doc
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="px-4 md:px-6 py-4">
            <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comentarios ({comments.length})
            </h3>

            {/* Comments List */}
            <div className="space-y-4 mb-4">
              {comments.length === 0 ? (
                <p className="text-sm text-text-secondary/50 text-center py-4">
                  No hay comentarios aún
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar
                      name={comment.author?.full_name || 'Usuario'}
                      src={comment.author?.avatar_url}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-text-primary">
                          {comment.author?.full_name || 'Usuario'}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary break-words">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* New Comment Form */}
            <form onSubmit={handleSubmitComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe un comentario..."
                className="flex-1 px-3 py-2 text-sm bg-bg-secondary border border-bg-tertiary rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                disabled={isSubmittingComment}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newComment.trim() || isSubmittingComment}
              >
                {isSubmittingComment ? (
                  <Spinner size="sm" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-bg-tertiary bg-bg-secondary/50 shrink-0">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>
              Creada {formatRelativeTime(selectedTask.created_at)}
            </span>
            <span>
              Actualizada {formatRelativeTime(selectedTask.updated_at)}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* MODAL: Solicitar Aprobación */}
      {/* ============================================ */}
      {showApprovalModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={() => approvalLink ? handleCloseEverything() : resetApprovalModal()}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className={cn(
                'w-full max-w-md bg-bg-primary rounded-xl border border-bg-tertiary shadow-2xl',
                'animate-in zoom-in-95 duration-200',
                'max-h-[90vh] overflow-y-auto'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-bg-tertiary sticky top-0 bg-bg-primary">
                <h3 className="text-base md:text-lg font-semibold text-text-primary flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-accent-primary" />
                  Solicitar Aprobación
                </h3>
                <button
                  onClick={() => approvalLink ? handleCloseEverything() : resetApprovalModal()}
                  className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-4 md:px-6 py-5">
                {!approvalLink ? (
                  <div className="space-y-4">
                    <p className="text-sm text-text-secondary">
                      Se generará un link único para que el cliente pueda aprobar o solicitar cambios en esta tarea.
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">
                        Nombre del cliente
                      </label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Ej: Juan Pérez"
                        className="w-full px-3 py-2 text-sm bg-bg-secondary border border-bg-tertiary rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                        disabled={isRequestingApproval}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">
                        Teléfono (WhatsApp)
                      </label>
                      <input
                        type="tel"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="Ej: +52 999 123 4567"
                        className="w-full px-3 py-2 text-sm bg-bg-secondary border border-bg-tertiary rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                        disabled={isRequestingApproval}
                      />
                    </div>
                    <div className="p-3 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
                      <p className="text-xs text-accent-primary">
                        ⏰ El link expirará en <strong>48 horas</strong>. El cliente podrá aprobar o solicitar cambios sin necesidad de crear una cuenta.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-14 h-14 md:w-16 md:h-16 mx-auto rounded-full bg-accent-success/20">
                      <CheckCircle2 className="w-7 h-7 md:w-8 md:h-8 text-accent-success" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-base md:text-lg font-semibold text-text-primary mb-1">
                        ¡Link generado!
                      </h4>
                      <p className="text-sm text-text-secondary">
                        Comparte este link con <strong>{clientName}</strong>
                      </p>
                    </div>
                    {telegramSent && (
                      <div className="p-3 rounded-lg bg-accent-success/10 border border-accent-success/20">
                        <p className="text-xs text-accent-success flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          ✅ Notificación enviada a Telegram
                        </p>
                      </div>
                    )}
                    <div className="p-3 rounded-lg bg-bg-secondary border border-bg-tertiary">
                      <p className="text-xs text-text-secondary mb-2">Link de aprobación:</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={approvalLink}
                          readOnly
                          className="flex-1 px-2 py-1 text-xs bg-bg-tertiary rounded text-text-primary font-mono truncate"
                        />
                        <Button
                          size="sm"
                          variant={linkCopied ? 'primary' : 'outline'}
                          onClick={handleCopyLink}
                          className="shrink-0"
                        >
                          {linkCopied ? (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Copiar</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-accent-warning/10 border border-accent-warning/20">
                      <p className="text-xs text-accent-warning">
                        📱 Envía este link por <strong>WhatsApp</strong> al número: <strong>{clientPhone}</strong>
                      </p>
                    </div>
                    {autoCloseCountdown !== null && (
                      <div className="text-center">
                        <p className="text-xs text-text-secondary">
                          Cerrando automáticamente en <strong className="text-accent-primary">{autoCloseCountdown}</strong> segundos...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-4 md:px-6 py-4 border-t border-bg-tertiary bg-bg-secondary/50 rounded-b-xl sticky bottom-0">
                {!approvalLink ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={resetApprovalModal}
                      disabled={isRequestingApproval}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleRequestApproval}
                      disabled={!clientName.trim() || !clientPhone.trim() || isRequestingApproval}
                    >
                      {isRequestingApproval ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4 mr-2" />
                          Generar Link
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleCloseEverything}>
                    Cerrar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* MODAL: Confirmar Eliminación */}
      {/* ============================================ */}
      {showDeleteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="w-full max-w-sm bg-bg-primary rounded-xl border border-bg-tertiary shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-accent-danger/20">
                  <Trash2 className="w-6 h-6 text-accent-danger" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  ¿Eliminar tarea?
                </h3>
                <p className="text-sm text-text-secondary mb-6">
                  Esta acción no se puede deshacer. La tarea "{selectedTask?.title}" será eliminada permanentemente.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleDeleteTask}
                    disabled={isDeleting}
                    className="flex-1 bg-accent-danger hover:bg-accent-danger/90"
                  >
                    {isDeleting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Eliminando...
                      </>
                    ) : (
                      'Eliminar'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default TaskDrawer
