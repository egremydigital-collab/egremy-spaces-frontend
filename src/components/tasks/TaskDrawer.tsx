import * as React from 'react'
import { Button, Badge, Avatar, Spinner } from '@/components/ui'
import { useUIStore } from '@/stores/ui.store'
import { supabase } from '@/lib/supabase'
import { cn, STATUS_CONFIG, STATUS_LABELS, formatRelativeTime } from '@/lib/utils'
import type { TaskDetailed, TaskStatus, Comment } from '@/types'
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
} from 'lucide-react'

// ============================================
// Webhook n8n Configuration
// ============================================
const N8N_WEBHOOK_URL = 'https://curso-orangutan-n8n.crkear.easypanel.host/webhook/egremy/approval-requested'
const N8N_WEBHOOK_SECRET = 'EgremySpaces2024SecretKey!'

// ============================================
// TaskDrawer - Panel lateral de detalles
// ============================================

interface TaskDrawerProps {
  onTaskUpdated?: (task: TaskDetailed) => void
  onRefreshTasks?: () => void // 🆕 Nueva prop para refrescar el Kanban
}

export function TaskDrawer({ onTaskUpdated, onRefreshTasks }: TaskDrawerProps) {
  const { selectedTask, taskDrawerOpen, closeTaskDrawer } = useUIStore()
  
  // State
  const [isSaving, setIsSaving] = React.useState(false)
  const [comments, setComments] = React.useState<Comment[]>([])
  const [newComment, setNewComment] = React.useState('')
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false)
  
  // Editable fields
  const [editedStatus, setEditedStatus] = React.useState<TaskStatus>('discovery')

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
  const [autoCloseCountdown, setAutoCloseCountdown] = React.useState<number | null>(null) // 🆕

  // Load task details and comments
  React.useEffect(() => {
    if (selectedTask && taskDrawerOpen) {
      setEditedStatus(selectedTask.status)
      loadComments()
    }
  }, [selectedTask, taskDrawerOpen])

  // Close on Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showApprovalModal) {
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
  }, [closeTaskDrawer, showApprovalModal, approvalLink])

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

  // Update task status
  const handleStatusChange = async (newStatus: TaskStatus) => {
    console.log('🎯 handleStatusChange llamado:', newStatus)
    console.log('selectedTask:', selectedTask)
    
    if (!selectedTask || newStatus === selectedTask.status) {
      console.log('❌ No hay cambio de estado')
      return
    }
    
    console.log('📡 Enviando actualización a Supabase...')
      
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
      console.log('✅ Estado actualizado:', newStatus)
    } catch (err) {
      console.error('Error updating status:', err)
      setEditedStatus(selectedTask.status) // Revert
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================
  // 🆕 Cerrar TODO (modal + drawer + refrescar)
  // ============================================
  const handleCloseEverything = () => {
    console.log('🚪 Cerrando todo y refrescando...')
    
    // 1. Reset modal state
    setShowApprovalModal(false)
    setClientName('')
    setClientPhone('')
    setApprovalLink(null)
    setLinkCopied(false)
    setTelegramSent(false)
    setAutoCloseCountdown(null)
    
    // 2. PRIMERO refrescar el Kanban (antes de cerrar el drawer)
    if (onRefreshTasks) {
      console.log('🔄 Refrescando Kanban...')
      onRefreshTasks()
    }
    
    // 3. DESPUÉS cerrar el drawer (con pequeño delay para que el refresh inicie)
    setTimeout(() => {
      closeTaskDrawer()
    }, 50)
  }

  // ============================================
  // Solicitar Aprobación del Cliente
  // ============================================
  const handleRequestApproval = async () => {
    console.log('🚀 handleRequestApproval iniciado')
    
    if (!selectedTask) {
      console.log('❌ No hay tarea seleccionada')
      alert('Error: No hay tarea seleccionada')
      return
    }
    
    if (!clientName.trim()) {
      alert('Por favor ingresa el nombre del cliente')
      return
    }
    
    if (!clientPhone.trim()) {
      alert('Por favor ingresa el teléfono del cliente')
      return
    }

    setIsRequestingApproval(true)
    setTelegramSent(false)
    
    try {
      // 1. Generar token único
      const token = `${selectedTask.id.slice(0, 8)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      console.log('🔑 Token generado:', token)
      
      // 2. Calcular expiración (48 horas)
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 48)
      
      // Formato legible para el mensaje
      const expiresAtFormatted = expiresAt.toLocaleString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      // 3. Insertar en approval_tokens
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

      if (error) {
        console.error('❌ Error en INSERT:', error)
        throw error
      }

      console.log('✅ Token insertado en Supabase')

      // 4. Actualizar estado de la tarea
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ 
          status: 'needs_client_approval',
          previous_status: selectedTask.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTask.id)

      if (taskError) {
        console.error('⚠️ Error actualizando tarea:', taskError)
      } else {
        setEditedStatus('needs_client_approval')
        if (onTaskUpdated) {
          onTaskUpdated({ ...selectedTask, status: 'needs_client_approval' })
        }
      }

      // 5. Generar link de aprobación
      const baseUrl = window.location.origin
      const link = `${baseUrl}/approval/${token}`
      setApprovalLink(link)
      
      console.log('🔗 Link generado:', link)

      // ============================================
      // 6. 🚀 LLAMAR AL WEBHOOK DE N8N
      // ============================================
      console.log('📡 Enviando notificación a n8n...')
      
      // Limpiar teléfono (solo números)
      const cleanPhone = clientPhone.replace(/\D/g, '')
      
      const webhookPayload = {
        client_phone: cleanPhone,
        approval_url: link,
        task_title: selectedTask.title,
        project_name: selectedTask.project?.name || 'Proyecto',
        expires_at: expiresAtFormatted
      }
      
      console.log('📦 Payload:', webhookPayload)

      try {
        const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${N8N_WEBHOOK_SECRET}`
          },
          body: JSON.stringify(webhookPayload)
        })

        const webhookResult = await webhookResponse.json()
        
        if (webhookResponse.ok) {
          console.log('✅ n8n notificado exitosamente:', webhookResult)
          setTelegramSent(true)
        } else {
          console.error('⚠️ n8n respondió con error:', webhookResult)
        }
      } catch (webhookError) {
        console.error('⚠️ Error llamando webhook n8n:', webhookError)
      }

      console.log('✅ Proceso completado')

      // ============================================
      // 7. 🆕 AUTO-CERRAR DESPUÉS DE 3 SEGUNDOS
      // ============================================
      console.log('⏱️ Iniciando auto-cierre en 3 segundos...')
      
      setAutoCloseCountdown(3)
      
      setTimeout(() => setAutoCloseCountdown(2), 1000)
      setTimeout(() => setAutoCloseCountdown(1), 2000)
      
      setTimeout(() => {
        console.log('🚪 Auto-cerrando...')
        
        // Reset modal state
        setShowApprovalModal(false)
        setClientName('')
        setClientPhone('')
        setApprovalLink(null)
        setLinkCopied(false)
        setTelegramSent(false)
        setAutoCloseCountdown(null)
        
        // PRIMERO refrescar
        if (onRefreshTasks) {
          console.log('🔄 Refrescando Kanban...')
          onRefreshTasks()
        }
        
        // DESPUÉS cerrar drawer
        setTimeout(() => {
          closeTaskDrawer()
        }, 100)
      }, 3000)

    } catch (err: any) {
      console.error('❌ Error completo:', err)
      alert(`Error al generar el link: ${err?.message || 'Error desconocido'}`)
    } finally {
      setIsRequestingApproval(false)
    }
  }

  // Copiar link al portapapeles
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

  // Resetear modal de aprobación (sin cerrar drawer)
  const resetApprovalModal = () => {
    setShowApprovalModal(false)
    setClientName('')
    setClientPhone('')
    setApprovalLink(null)
    setLinkCopied(false)
    setTelegramSent(false)
    setAutoCloseCountdown(null)
  }

  // Submit comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 Iniciando envío de comentario...')
    console.log('selectedTask:', selectedTask)
    console.log('newComment:', newComment)
    
    if (!selectedTask || !newComment.trim()) {
      console.log('❌ No hay tarea o comentario vacío')
      return
    }

    setIsSubmittingComment(true)
    try {
      console.log('📡 Obteniendo usuario...')
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 Usuario:', user)
      if (!user) throw new Error('No autenticado')
      
      console.log('📝 Insertando comentario...')

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
      console.log('✅ Comentario agregado')
    } catch (err) {
      console.error('Error adding comment:', err)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  if (!taskDrawerOpen || !selectedTask) return null

  const statusConfig = STATUS_CONFIG[selectedTask.status]
  const isBlocking = ['blocked', 'needs_client_approval', 'bug', 'hotfix'].includes(selectedTask.status)

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={closeTaskDrawer}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-lg z-50',
          'bg-bg-primary border-l border-bg-tertiary',
          'flex flex-col',
          'animate-in slide-in-from-right duration-300'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-bg-tertiary">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: statusConfig?.color || '#6366f1' }}
            />
            <span className="text-sm text-text-secondary">
              {selectedTask.project?.name || 'Proyecto'}
            </span>
          </div>
          <button
            onClick={closeTaskDrawer}
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Title & Description */}
          <div className="px-6 py-5 border-b border-bg-tertiary">
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              {selectedTask.title}
            </h2>
            {selectedTask.description ? (
              <p className="text-text-secondary text-sm leading-relaxed">
                {selectedTask.description}
              </p>
            ) : (
              <p className="text-text-secondary/50 text-sm italic">
                Sin descripción
              </p>
            )}
          </div>

          {/* Blocking Alert */}
          {isBlocking && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-accent-warning/10 border border-accent-warning/20">
              <div className="flex items-center gap-2 text-accent-warning">
                <AlertTriangle className="w-4 h-4" />
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

          {/* ============================================ */}
          {/* BOTÓN SOLICITAR APROBACIÓN */}
          {/* ============================================ */}
          <div className="px-6 py-4 border-b border-bg-tertiary">
            <Button
              onClick={() => setShowApprovalModal(true)}
              variant="outline"
              className="w-full justify-center gap-2 border-accent-primary/50 text-accent-primary hover:bg-accent-primary/10"
            >
              <Share2 className="w-4 h-4" />
              Solicitar Aprobación del Cliente
            </Button>
          </div>

          {/* Properties */}
          <div className="px-6 py-5 space-y-4 border-b border-bg-tertiary">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Estado
              </span>
              <select
                value={editedStatus}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                disabled={isSaving}
                className="text-sm bg-bg-secondary border border-bg-tertiary rounded-lg px-3 py-1.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Prioridad
              </span>
              <Badge
                className={cn(
                  'text-xs',
                  selectedTask.priority === 'urgent' && 'bg-red-500/20 text-red-400',
                  selectedTask.priority === 'high' && 'bg-orange-500/20 text-orange-400',
                  selectedTask.priority === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                  selectedTask.priority === 'low' && 'bg-green-500/20 text-green-400'
                )}
              >
                {selectedTask.priority === 'urgent' && '🔴 Urgente'}
                {selectedTask.priority === 'high' && '🟠 Alta'}
                {selectedTask.priority === 'medium' && '🟡 Media'}
                {selectedTask.priority === 'low' && '🟢 Baja'}
              </Badge>
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
                  <span className="text-sm text-text-primary">
                    {selectedTask.assignee.full_name}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-text-secondary/50">Sin asignar</span>
              )}
            </div>

            {/* Due Date */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Fecha límite
              </span>
              {selectedTask.due_date ? (
                <span className={cn(
                  'text-sm',
                  new Date(selectedTask.due_date) < new Date() 
                    ? 'text-accent-danger' 
                    : 'text-text-primary'
                )}>
                  {new Date(selectedTask.due_date).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              ) : (
                <span className="text-sm text-text-secondary/50">Sin fecha</span>
              )}
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

          {/* Links */}
          {(selectedTask.notion_page_url || selectedTask.google_doc_url) && (
            <div className="px-6 py-4 border-b border-bg-tertiary">
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
          <div className="px-6 py-4">
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
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-text-primary">
                          {comment.author?.full_name || 'Usuario'}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary">
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
        <div className="px-6 py-4 border-t border-bg-tertiary bg-bg-secondary/50">
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
          {/* Modal Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={() => approvalLink ? handleCloseEverything() : resetApprovalModal()}
          />

          {/* Modal Content */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className={cn(
                'w-full max-w-md bg-bg-primary rounded-xl border border-bg-tertiary shadow-2xl',
                'animate-in zoom-in-95 duration-200'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-bg-tertiary">
                <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
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

              {/* Modal Body */}
              <div className="px-6 py-5">
                {!approvalLink ? (
                  // Formulario para capturar datos del cliente
                  <div className="space-y-4">
                    <p className="text-sm text-text-secondary">
                      Se generará un link único para que el cliente pueda aprobar o solicitar cambios en esta tarea.
                    </p>

                    {/* Nombre del cliente */}
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

                    {/* Teléfono del cliente */}
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

                    {/* Info */}
                    <div className="p-3 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
                      <p className="text-xs text-accent-primary">
                        ⏰ El link expirará en <strong>48 horas</strong>. El cliente podrá aprobar o solicitar cambios sin necesidad de crear una cuenta.
                      </p>
                    </div>
                  </div>
                ) : (
                  // Link generado - mostrar para copiar
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-accent-success/20">
                      <CheckCircle2 className="w-8 h-8 text-accent-success" />
                    </div>

                    <div className="text-center">
                      <h4 className="text-lg font-semibold text-text-primary mb-1">
                        ¡Link generado!
                      </h4>
                      <p className="text-sm text-text-secondary">
                        Comparte este link con <strong>{clientName}</strong>
                      </p>
                    </div>

                    {/* Telegram status */}
                    {telegramSent && (
                      <div className="p-3 rounded-lg bg-accent-success/10 border border-accent-success/20">
                        <p className="text-xs text-accent-success flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          ✅ Notificación enviada a Telegram
                        </p>
                      </div>
                    )}

                    {/* Link box */}
                    <div className="p-3 rounded-lg bg-bg-secondary border border-bg-tertiary">
                      <p className="text-xs text-text-secondary mb-2">Link de aprobación:</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={approvalLink}
                          readOnly
                          className="flex-1 px-2 py-1 text-xs bg-bg-tertiary rounded text-text-primary font-mono"
                        />
                        <Button
                          size="sm"
                          variant={linkCopied ? 'primary' : 'outline'}
                          onClick={handleCopyLink}
                        >
                          {linkCopied ? (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              Copiar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 rounded-lg bg-accent-warning/10 border border-accent-warning/20">
                      <p className="text-xs text-accent-warning">
                        📱 Envía este link por <strong>WhatsApp</strong> al número: <strong>{clientPhone}</strong>
                      </p>
                    </div>

                    {/* 🆕 Auto-close countdown */}
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

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-bg-tertiary bg-bg-secondary/50 rounded-b-xl">
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
    </>
  )
}

export default TaskDrawer
