import * as React from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button, Card, Spinner, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  AlertTriangle,
  Calendar,
  MessageSquare,
  ExternalLink,
  Shield,
} from 'lucide-react'

// ============================================
// Tipos
// ============================================
interface ApprovalToken {
  id: string
  token: string
  task_id: string
  client_name: string
  client_phone: string | null
  client_email: string | null
  expires_at: string
  used_at: string | null
  status: 'pending' | 'approved' | 'rejected'
  decision_feedback: string | null
  created_at: string
}

interface TaskData {
  id: string
  title: string
  description: string | null
  status: string
  priority: string | null
  due_date: string | null
  notion_page_url: string | null
  google_doc_url: string | null
  project_id: string | null
  previous_status: string | null
  organization_id: string | null
}

interface ProjectData {
  id: string
  name: string
  client_name: string | null
}

// ============================================
// Mapa de flujo de estados n8n
// ============================================
const NEXT_STATUS: Record<string, string> = {
  'discovery': 'design',
  'design': 'build',
  'build': 'qa',
  'qa': 'deploy',
  'deploy': 'live',
  'live': 'optimization',
  'optimization': 'optimization', // Ya está al final
}

// ============================================
// Página de Aprobación Pública
// ============================================
export function ApprovalPage() {
  const { token } = useParams<{ token: string }>()
  
  const [approvalToken, setApprovalToken] = React.useState<ApprovalToken | null>(null)
  const [task, setTask] = React.useState<TaskData | null>(null)
  const [project, setProject] = React.useState<ProjectData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [feedback, setFeedback] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [decision, setDecision] = React.useState<'approved' | 'rejected' | null>(null)

  // Cargar datos del token
  React.useEffect(() => {
    if (token) {
      loadApprovalData()
    }
  }, [token])

  const loadApprovalData = async () => {
    try {
      console.log('🔍 Buscando token:', token)
      
      // 1. Obtener el approval token
      const { data: tokenData, error: tokenError } = await supabase
        .from('approval_tokens')
        .select('*')
        .eq('token', token)
        .single()

      if (tokenError) {
        console.error('❌ Error token:', tokenError)
        if (tokenError.code === 'PGRST116') {
          setError('El enlace de aprobación no es válido o ha expirado.')
        } else {
          setError('Error al cargar la información.')
        }
        return
      }

      console.log('✅ Token cargado:', tokenData)

      // Verificar expiración
      if (new Date(tokenData.expires_at) < new Date()) {
        setError('Este enlace de aprobación ha expirado. Por favor, solicita uno nuevo.')
        return
      }

      // Verificar si ya fue usado
      if (tokenData.used_at || tokenData.status !== 'pending') {
        setApprovalToken(tokenData)
        setSubmitted(true)
        setDecision(tokenData.status as 'approved' | 'rejected')
        setFeedback(tokenData.decision_feedback || '')
        setIsLoading(false)
        return
      }

      setApprovalToken(tokenData)

      // 2. Obtener la tarea
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', tokenData.task_id)
        .single()

      if (taskError) {
        console.error('❌ Error task:', taskError)
        // Continuar sin la tarea, mostrar lo que tenemos
      } else {
        console.log('✅ Task cargada:', taskData)
        setTask(taskData)

        // 3. Obtener el proyecto (si hay project_id)
        if (taskData.project_id) {
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, name, client_name')
            .eq('id', taskData.project_id)
            .single()

          if (!projectError && projectData) {
            console.log('✅ Project cargado:', projectData)
            setProject(projectData)
          }
        }
      }

    } catch (err) {
      console.error('❌ Error inesperado:', err)
      setError('Ocurrió un error inesperado.')
    } finally {
      setIsLoading(false)
    }
  }

  // Enviar decisión
  const handleSubmit = async (approvalDecision: 'approved' | 'rejected') => {
    if (!approvalToken) return

    setIsSubmitting(true)
    setDecision(approvalDecision)

    try {
      console.log('📝 Enviando decisión:', approvalDecision)
      console.log('📝 Token ID:', approvalToken.id)
      console.log('📝 Task ID:', approvalToken.task_id)

      // 1. Actualizar el token de aprobación
      console.log('📡 Actualizando approval_token...')
      const { data: tokenUpdateData, error: tokenError } = await supabase
        .from('approval_tokens')
        .update({
          status: approvalDecision,
          decision_feedback: feedback || null,
          used_at: new Date().toISOString(),
          ip_address: 'client-ip',
          user_agent: navigator.userAgent,
        })
        .eq('id', approvalToken.id)
        .select()

      if (tokenError) {
        console.error('❌ Error actualizando token:', tokenError)
        throw tokenError
      }
      console.log('✅ Token actualizado:', tokenUpdateData)

      // 2. Determinar el nuevo estado de la tarea
      // previous_status contiene el estado ANTES de needs_client_approval
      const previousStatus = task?.previous_status || 'build'
      
      let newTaskStatus: string
      if (approvalDecision === 'approved') {
        // Si aprueba → avanzar al SIGUIENTE estado del flujo
        newTaskStatus = NEXT_STATUS[previousStatus] || 'deploy'
        console.log(`📈 Aprobado: ${previousStatus} → ${newTaskStatus}`)
      } else {
        // Si rechaza → volver al estado anterior para correcciones
        newTaskStatus = previousStatus
        console.log(`↩️ Rechazado: volviendo a ${previousStatus}`)
      }

      console.log('📡 Actualizando tarea a estado:', newTaskStatus)
      console.log('📡 Estado anterior era:', task?.status)
      console.log('📡 Previous status guardado:', previousStatus)

      // 3. Actualizar el estado de la tarea
      const { data: taskUpdateData, error: taskError } = await supabase
        .from('tasks')
        .update({
          status: newTaskStatus,
          previous_status: task?.status || 'needs_client_approval',
          updated_at: new Date().toISOString(),
        })
        .eq('id', approvalToken.task_id)
        .select()

      if (taskError) {
        console.error('❌ Error actualizando task:', taskError)
        console.error('❌ Error code:', taskError.code)
        console.error('❌ Error message:', taskError.message)
        console.error('❌ Error details:', taskError.details)
        // Continuar - el token ya se actualizó
      } else {
        console.log('✅ Task actualizada:', taskUpdateData)
      }

      // 4. Agregar comentario con el feedback (si hay)
      if (feedback && feedback.trim() && task?.organization_id) {
        console.log('📡 Agregando comentario con feedback...')
        const { error: commentError } = await supabase
          .from('comments')
          .insert({
            task_id: approvalToken.task_id,
            organization_id: task.organization_id,
            content: `**Feedback del cliente (${approvalDecision === 'approved' ? 'Aprobado ✅' : 'Cambios solicitados 🔄'}):**\n\n${feedback}`,
            is_client_comment: true,
          })

        if (commentError) {
          console.error('⚠️ Error agregando comentario:', commentError)
          // No es crítico, continuar
        } else {
          console.log('✅ Comentario agregado')
        }
      }

      console.log('✅ Decisión guardada exitosamente')
      setSubmitted(true)

    } catch (err: any) {
      console.error('❌ Error guardando decisión:', err)
      console.error('❌ Error message:', err?.message)
      setError('Error al guardar tu decisión. Por favor, intenta de nuevo.')
      setDecision(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // Estados de la página
  // ============================================

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-text-secondary">Cargando información...</p>
        </div>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-accent-danger/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-accent-danger" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary mb-2">
            Enlace no válido
          </h1>
          <p className="text-text-secondary">
            {error}
          </p>
        </Card>
      </div>
    )
  }

  // Ya se procesó
  if (submitted && decision) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
            decision === 'approved' ? 'bg-accent-success/20' : 'bg-accent-warning/20'
          )}>
            {decision === 'approved' ? (
              <CheckCircle2 className="w-8 h-8 text-accent-success" />
            ) : (
              <MessageSquare className="w-8 h-8 text-accent-warning" />
            )}
          </div>
          <h1 className="text-xl font-semibold text-text-primary mb-2">
            {decision === 'approved' ? '¡Aprobado!' : 'Cambios solicitados'}
          </h1>
          <p className="text-text-secondary mb-4">
            {decision === 'approved' 
              ? 'Gracias por tu aprobación. El equipo continuará con el proceso.'
              : 'Hemos recibido tus comentarios. El equipo revisará los cambios solicitados.'}
          </p>
          {feedback && (
            <div className="mt-4 p-3 bg-bg-secondary rounded-lg text-left">
              <p className="text-xs text-text-secondary mb-1">Tu comentario:</p>
              <p className="text-sm text-text-primary">{feedback}</p>
            </div>
          )}
          <p className="text-xs text-text-secondary mt-6">
            Puedes cerrar esta ventana.
          </p>
        </Card>
      </div>
    )
  }

  // Formulario de aprobación
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-bg-tertiary">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-primary/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">
                Solicitud de Aprobación
              </h1>
              <p className="text-sm text-text-secondary">
                {project?.name || 'Proyecto'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Saludo */}
        <div className="mb-6">
          <p className="text-text-secondary">
            Hola <span className="text-text-primary font-medium">{approvalToken?.client_name}</span>,
          </p>
          <p className="text-text-secondary mt-1">
            Por favor revisa la siguiente tarea y decide si está lista para continuar.
          </p>
        </div>

        {/* Task Card */}
        <Card className="mb-6">
          <div className="p-6 space-y-4">
            {/* Title */}
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                {task?.title || 'Tarea pendiente de aprobación'}
              </h2>
              {task?.description && (
                <p className="mt-2 text-text-secondary">
                  {task.description}
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 pt-4 border-t border-bg-tertiary">
              {/* Status */}
              {task?.status && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">Estado:</span>
                  <Badge status={task.status as any} />
                </div>
              )}

              {/* Priority */}
              {task?.priority && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm text-text-secondary">Prioridad:</span>
                  <span className={cn(
                    'text-sm font-medium',
                    task.priority === 'urgent' && 'text-red-400',
                    task.priority === 'high' && 'text-orange-400',
                    task.priority === 'medium' && 'text-yellow-400',
                    task.priority === 'low' && 'text-green-400'
                  )}>
                    {task.priority === 'urgent' && '🔴 Urgente'}
                    {task.priority === 'high' && '🟠 Alta'}
                    {task.priority === 'medium' && '🟡 Media'}
                    {task.priority === 'low' && '🟢 Baja'}
                  </span>
                </div>
              )}

              {/* Due Date */}
              {task?.due_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm text-text-secondary">Fecha límite:</span>
                  <span className="text-sm text-text-primary">
                    {new Date(task.due_date).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Links */}
            {(task?.notion_page_url || task?.google_doc_url) && (
              <div className="flex flex-wrap gap-3 pt-4 border-t border-bg-tertiary">
                {task.notion_page_url && (
                  <a
                    href={task.notion_page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-accent-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver en Notion
                  </a>
                )}
                {task.google_doc_url && (
                  <a
                    href={task.google_doc_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-accent-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver documento
                  </a>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Feedback */}
        <Card className="mb-6">
          <div className="p-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Comentarios (opcional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Si tienes algún comentario o necesitas cambios, escríbelos aquí..."
              className="w-full px-4 py-3 bg-bg-secondary border border-bg-tertiary rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 resize-none"
              rows={4}
              disabled={isSubmitting}
            />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => handleSubmit('approved')}
            disabled={isSubmitting}
            className="flex-1 bg-accent-success hover:bg-accent-success/90"
          >
            {isSubmitting && decision === 'approved' ? (
              <Spinner size="sm" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            Aprobar
          </Button>
          <Button
            onClick={() => handleSubmit('rejected')}
            disabled={isSubmitting}
            variant="secondary"
            className="flex-1 border-accent-warning text-accent-warning hover:bg-accent-warning/10"
          >
            {isSubmitting && decision === 'rejected' ? (
              <Spinner size="sm" />
            ) : (
              <MessageSquare className="w-5 h-5" />
            )}
            Solicitar Cambios
          </Button>
        </div>

        {/* Expiration notice */}
        <p className="text-center text-xs text-text-secondary mt-6">
          Este enlace expira el{' '}
          {approvalToken?.expires_at && new Date(approvalToken.expires_at).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {/* Footer */}
      <div className="border-t border-bg-tertiary mt-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <p className="text-center text-xs text-text-secondary">
            Powered by <span className="text-accent-primary">Egremy Spaces</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ApprovalPage
