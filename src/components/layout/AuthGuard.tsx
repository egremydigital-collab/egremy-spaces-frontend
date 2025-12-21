import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { PageLoader } from '@/components/ui'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading, isInitialized } = useAuthStore()
  const location = useLocation()

  // Mostrar loader mientras se inicializa auth
  if (!isInitialized || isLoading) {
    return <PageLoader />
  }

  // Redirigir a login si no hay usuario
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

// Guard inverso: redirige si YA está autenticado (para /login)
export function GuestGuard({ children }: AuthGuardProps) {
  const { user, isLoading, isInitialized } = useAuthStore()
  const location = useLocation()

  if (!isInitialized || isLoading) {
    return <PageLoader />
  }

  if (user) {
    // Redirigir a donde venía o al dashboard
    const from = (location.state as { from?: Location })?.from?.pathname || '/app/dashboard'
    return <Navigate to={from} replace />
  }

  return <>{children}</>
}
