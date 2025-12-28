import * as React from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui'
import { Rocket, Eye, EyeOff, Mail, ArrowLeft, CheckCircle } from 'lucide-react'

type ViewState = 'login' | 'register' | 'forgot-password' | 'check-email' | 'reset-sent'

export function LoginPage() {
  const { login, register } = useAuthStore()
  const [view, setView] = React.useState<ViewState>('login')
  const [isLoading, setIsLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    fullName: '',
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await login(formData.email, formData.password)
      if (error) {
        toast.error(error.message || 'Error al iniciar sesión')
      } else {
        toast.success('¡Bienvenido de vuelta!')
      }
    } catch {
      toast.error('Error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fullName) {
      toast.error('El nombre es requerido')
      return
    }
    
    setIsLoading(true)

    try {
      const { error } = await register(formData.email, formData.password, formData.fullName)
      if (error) {
        toast.error(error.message || 'Error al registrarse')
      } else {
        // Mostrar pantalla de verificación de email
        setView('check-email')
      }
    } catch {
      toast.error('Error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email) {
      toast.error('Ingresa tu correo electrónico')
      return
    }
    
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/app/settings`,
      })
      
      if (error) {
        toast.error(error.message || 'Error al enviar el correo')
      } else {
        setView('reset-sent')
      }
    } catch {
      toast.error('Error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ email: '', password: '', fullName: '' })
    setShowPassword(false)
  }

  // Pantalla: Verifica tu email (después de registro)
  if (view === 'check-email') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-accent-primary/10 flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-accent-primary" />
            </div>
            <CardTitle className="text-2xl">Verifica tu correo</CardTitle>
            <CardDescription className="mt-2">
              Hemos enviado un enlace de verificación a:
            </CardDescription>
            <p className="text-accent-primary font-medium mt-1">{formData.email}</p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-bg-tertiary rounded-lg p-4 text-sm text-text-secondary">
              <p className="mb-2">📧 Revisa tu bandeja de entrada</p>
              <p className="mb-2">📁 Si no lo encuentras, revisa spam</p>
              <p>🔗 Haz clic en el enlace para activar tu cuenta</p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                resetForm()
                setView('login')
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio de sesión
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Pantalla: Email de recuperación enviado
  if (view === 'reset-sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-accent-success/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-accent-success" />
            </div>
            <CardTitle className="text-2xl">Correo enviado</CardTitle>
            <CardDescription className="mt-2">
              Si existe una cuenta con este correo, recibirás un enlace para restablecer tu contraseña:
            </CardDescription>
            <p className="text-accent-primary font-medium mt-1">{formData.email}</p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-bg-tertiary rounded-lg p-4 text-sm text-text-secondary">
              <p className="mb-2">📧 Revisa tu bandeja de entrada</p>
              <p className="mb-2">⏱️ El enlace expira en 24 horas</p>
              <p>🔐 Podrás crear una nueva contraseña</p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                resetForm()
                setView('login')
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio de sesión
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Pantalla: Olvidé mi contraseña
  if (view === 'forgot-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-accent-primary flex items-center justify-center mb-4">
              <Rocket className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
            <CardDescription>
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleForgotPassword}>
            <CardContent className="space-y-4">
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Enviar enlace de recuperación
              </Button>

              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setView('login')
                }}
                className="text-sm text-text-secondary hover:text-text-primary flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio de sesión
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  // Pantalla: Login / Register
  const isLogin = view === 'login'

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-accent-primary flex items-center justify-center mb-4">
            <Rocket className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl">
            {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? 'Ingresa tus credenciales para continuar'
              : 'Completa tus datos para crear tu cuenta'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={isLogin ? handleLogin : handleRegister}>
          <CardContent className="space-y-4">
            {!isLogin && (
              <Input
                label="Nombre completo"
                type="text"
                placeholder="Juan Pérez"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required={!isLogin}
              />
            )}
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-text-secondary hover:text-text-primary transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setView('forgot-password')}
                  className="text-sm text-accent-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" isLoading={isLoading}>
              {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
            </Button>

            <p className="text-sm text-text-secondary text-center">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setView(isLogin ? 'register' : 'login')
                }}
                className="text-accent-primary hover:underline"
              >
                {isLogin ? 'Crear una' : 'Iniciar sesión'}
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
