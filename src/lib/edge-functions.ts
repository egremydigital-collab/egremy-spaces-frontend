import { supabase } from './supabase'
import type {
  ApprovalDetailsResponse,
  CreateApprovalLinkResponse,
  SubmitApprovalResponse,
  ApprovalDecision,
} from '@/types'

// Base URL para Edge Functions
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

// ============================================================================
// HELPER: Llamar Edge Function con auth
// ============================================================================

async function callEdgeFunction<T>(
  functionName: string,
  options: {
    method?: 'GET' | 'POST'
    body?: Record<string, unknown>
    params?: Record<string, string>
    requireAuth?: boolean
  } = {}
): Promise<T> {
  const { method = 'POST', body, params, requireAuth = true } = options

  // Construir URL con query params si existen
  let url = `${FUNCTIONS_URL}/${functionName}`
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  // Headers base
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Agregar auth header si es requerido
  if (requireAuth) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authenticated session')
    }
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  // Hacer la llamada
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  // Parsear respuesta
  const data = await response.json()

  // Manejar errores HTTP
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }

  return data as T
}

// ============================================================================
// APPROVAL FUNCTIONS
// ============================================================================

/**
 * Crear link de aprobación para una tarea
 * Requiere autenticación (usuario Egremy/Orangutan)
 */
export async function createApprovalLink(params: {
  task_id: string
  expires_in_hours?: number
  client_phone?: string
  note?: string
}): Promise<CreateApprovalLinkResponse> {
  return callEdgeFunction<CreateApprovalLinkResponse>('create-approval-link', {
    method: 'POST',
    body: params,
    requireAuth: true,
  })
}

/**
 * Obtener detalles de aprobación por token
 * NO requiere autenticación (acceso público para clientes)
 */
export async function getApprovalDetails(token: string): Promise<ApprovalDetailsResponse> {
  // Función separada, sin subpaths
  return callEdgeFunction<ApprovalDetailsResponse>('get-approval-details', {
    method: 'GET',
    params: { token },
    requireAuth: false,
  })
}

/**
 * Enviar decisión de aprobación
 * NO requiere autenticación (el token es la auth)
 */
export async function submitApproval(params: {
  token: string
  decision: Exclude<ApprovalDecision, 'pending'>
  feedback?: string
}): Promise<SubmitApprovalResponse> {
  // Función separada, sin subpaths
  return callEdgeFunction<SubmitApprovalResponse>('process-approval', {
    method: 'POST',
    body: params,
    requireAuth: false,
  })
}

// ============================================================================
// ERROR HANDLING WRAPPER
// ============================================================================

/**
 * Wrapper que maneja errores de forma consistente
 */
export async function safeCall<T>(
  fn: () => Promise<T>,
  options?: {
    onError?: (error: Error) => void
    defaultValue?: T
  }
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    options?.onError?.(error)
    return { data: options?.defaultValue ?? null, error }
  }
}
