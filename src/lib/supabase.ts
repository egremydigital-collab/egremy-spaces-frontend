import { createClient } from '@supabase/supabase-js'
import { toast } from '@/components/ui/Toast'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Helper para obtener la sesión actual
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

// Helper para obtener el usuario actual
export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// ============================================
// ERROR HANDLER - Manejo global de errores Supabase
// ============================================
interface SupabaseErrorOptions {
  showToast?: boolean
  customMessages?: {
    401?: string
    403?: string
    404?: string
    406?: string
    409?: string
  }
}
export function handleSupabaseError(
  error: any, 
  options: SupabaseErrorOptions = { showToast: true }
): string {
  const { showToast = true, customMessages = {} } = options
  
  let message = 'Error desconocido'
  
  // Errores de autenticación
  if (error?.message?.includes('JWT') || error?.code === '401' || error?.status === 401) {
    message = customMessages[401] || 'Sesión expirada. Por favor, vuelve a iniciar sesión.'
    if (showToast) toast.error(message)
    return message
  }
  
  // Errores de permisos (RLS)
  if (error?.code === '42501' || error?.status === 403 || error?.message?.includes('permission denied')) {
    message = customMessages[403] || 'No tienes permisos para realizar esta acción.'
    if (showToast) toast.error(message)
    return message
  }
  
  // No encontrado (PGRST116)
  if (error?.code === 'PGRST116' || error?.status === 406) {
    message = customMessages[404] || 'El recurso no existe o ya fue eliminado.'
    if (showToast) toast.warning(message)
    return message
  }
  
  // Conflicto / Duplicado
  if (error?.code === '23505' || error?.status === 409) {
    message = customMessages[409] || 'Este registro ya existe.'
    if (showToast) toast.warning(message)
    return message
  }
  
  // Violación de FK
  if (error?.code === '23503') {
    message = 'No se puede eliminar porque tiene registros relacionados.'
    if (showToast) toast.error(message)
    return message
  }
  
  // Error genérico
  if (error?.message) {
    message = error.message
    if (showToast) toast.error(message)
    return message
  }
  
  if (showToast) toast.error(message)
  return message
}

// ============================================
// SAFE QUERY - Wrapper para queries con manejo de errores
// ============================================
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options?: SupabaseErrorOptions
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await queryFn()
    
    if (error) {
      const message = handleSupabaseError(error, options)
      return { data: null, error: message }
    }
    
    return { data, error: null }
  } catch (err) {
    const message = handleSupabaseError(err, options)
    return { data: null, error: message }
  }
}