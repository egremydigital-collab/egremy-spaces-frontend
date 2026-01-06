import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { PageLoader } from '@/components/ui'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading, isInitialized } = useAuthStore()
  const location = useLocation()

  // Solo mostrar loader en la inicialización inicial, NO en recargas
  if (!isInitialized) {
    return <PageLoader />
  }

  // Redirigir a login si no hay usuario
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Ya inicializado y hay usuario - mostrar contenido
  // (ignoramos isLoading para evitar bloqueos al volver de otra pestaña)
  return <>{children}</>
}

// Guard inverso: redirige si YA está autenticado (para /login)
export function GuestGuard({ children }: AuthGuardProps) {
  const { user, isLoading, isInitialized } = useAuthStore()
  const location = useLocation()

  // Solo mostrar loader en la inicialización inicial
  if (!isInitialized) {
    return <PageLoader />
  }

  if (user) {
    // Redirigir a donde venía o al dashboard
    const from = (location.state as { from?: Location })?.from?.pathname || '/app/dashboard'
    return <Navigate to={from} replace />
  }

  return <>{children}</>
}