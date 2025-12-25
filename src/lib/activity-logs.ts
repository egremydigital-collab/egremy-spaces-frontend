import { supabase } from './supabase'

// ============================================
// ACTIVITY LOGS - Helper Service
// ============================================

export type EventType = 
  | 'task_status_changed'
  | 'approval_link_sent'
  | 'client_approved'
  | 'client_requested_changes'
  | 'task_created'
  | 'task_deleted'
  | 'comment_added'

export type ActorType = 'user' | 'client' | 'system'

export interface LogActivityParams {
  eventType: EventType
  taskId?: string
  projectId?: string
  organizationId?: string
  actorType?: ActorType
  actorId?: string
  actorName?: string
  meta?: Record<string, any>
}

/**
 * Registra una actividad en el log
 * 
 * @example
 * // Cambio de estado
 * await logActivity({
 *   eventType: 'task_status_changed',
 *   taskId: task.id,
 *   projectId: task.project_id,
 *   meta: { 
 *     prev_status: 'build', 
 *     new_status: 'qa',
 *     task_title: task.title 
 *   }
 * })
 * 
 * @example
 * // Cliente aprobó
 * await logActivity({
 *   eventType: 'client_approved',
 *   taskId: task.id,
 *   actorType: 'client',
 *   actorName: 'Juan Pérez',
 *   meta: { 
 *     token_id: token.id,
 *     ip_address: '192.168.1.1'
 *   }
 * })
 */
export async function logActivity({
  eventType,
  taskId,
  projectId,
  organizationId,
  actorType = 'user',
  actorId,
  actorName,
  meta = {}
}: LogActivityParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Si no tenemos organizationId o projectId, intentar obtenerlos del task
    let orgId = organizationId
    let projId = projectId

    if (taskId && (!orgId || !projId)) {
      const { data: task } = await supabase
        .from('tasks')
        .select('project_id, project:projects!tasks_project_id_fkey(organization_id)')
        .eq('id', taskId)
        .single()

      if (task) {
        projId = projId || task.project_id
        orgId = orgId || (task.project as any)?.organization_id
      }
    }

    // Si no tenemos actorId, usar el usuario actual
    let finalActorId = actorId
    let finalActorName = actorName

    if (actorType === 'user' && !actorId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        finalActorId = user.id
        
        // Obtener nombre del perfil si no se proporcionó
        if (!actorName) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()
          
          finalActorName = profile?.full_name || user.email || 'Usuario'
        }
      }
    }

    // Insertar log
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        event_type: eventType,
        task_id: taskId || null,
        project_id: projId || null,
        organization_id: orgId || null,
        actor_type: actorType,
        actor_id: finalActorId || null,
        actor_name: finalActorName || null,
        meta
      })

    if (error) {
      console.error('❌ Error logging activity:', error)
      return { success: false, error: error.message }
    }

    console.log(`📝 Activity logged: ${eventType}`, meta)
    return { success: true }

  } catch (err) {
    console.error('❌ Error in logActivity:', err)
    return { success: false, error: String(err) }
  }
}

// ============================================
// HELPERS ESPECÍFICOS (más fáciles de usar)
// ============================================

/**
 * Log cuando cambia el estado de una tarea
 */
export async function logStatusChange(
  taskId: string,
  prevStatus: string,
  newStatus: string,
  taskTitle?: string
) {
  return logActivity({
    eventType: 'task_status_changed',
    taskId,
    meta: {
      prev_status: prevStatus,
      new_status: newStatus,
      task_title: taskTitle
    }
  })
}

/**
 * Log cuando se envía link de aprobación
 */
export async function logApprovalLinkSent(
  taskId: string,
  tokenId: string,
  clientName: string,
  channel: 'telegram' | 'whatsapp' | 'email',
  expiresAt: string
) {
  return logActivity({
    eventType: 'approval_link_sent',
    taskId,
    meta: {
      token_id: tokenId,
      client_name: clientName,
      channel,
      expires_at: expiresAt
    }
  })
}

/**
 * Log cuando cliente aprueba
 */
export async function logClientApproved(
  taskId: string,
  tokenId: string,
  clientName: string,
  ipAddress?: string,
  userAgent?: string
) {
  return logActivity({
    eventType: 'client_approved',
    taskId,
    actorType: 'client',
    actorName: clientName,
    meta: {
      token_id: tokenId,
      ip_address: ipAddress,
      user_agent: userAgent
    }
  })
}

/**
 * Log cuando cliente solicita cambios
 */
export async function logClientRequestedChanges(
  taskId: string,
  tokenId: string,
  clientName: string,
  feedback: string,
  ipAddress?: string
) {
  return logActivity({
    eventType: 'client_requested_changes',
    taskId,
    actorType: 'client',
    actorName: clientName,
    meta: {
      token_id: tokenId,
      feedback,
      ip_address: ipAddress
    }
  })
}

// ============================================
// QUERY HELPERS (para futura UI)
// ============================================

/**
 * Obtener actividad de una tarea
 */
export async function getTaskActivity(taskId: string, limit = 50) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data, error }
}

/**
 * Obtener actividad de un proyecto
 */
export async function getProjectActivity(projectId: string, limit = 100) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data, error }
}

/**
 * Obtener actividad reciente de la organización
 */
export async function getRecentActivity(organizationId: string, limit = 50) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data, error }
}
