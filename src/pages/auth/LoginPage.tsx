import * as React from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui'
import { Rocket } from 'lucide-react'

export function LoginPage() {
  const { login, register } = useAuthStore()
  const [isLogin, setIsLogin] = React.useState(true)
  const [isLoading, setIsLoading] = React.useState(false)
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    fullName: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isLogin) {
        const { error } = await login(formData.email, formData.password)
        if (error) {
          toast.error(error.message || 'Error al iniciar sesión')
        } else {
          toast.success('¡Bienvenido de vuelta!')
        }
      } else {
        if (!formData.fullName) {
          toast.error('El nombre es requerido')
          setIsLoading(false)
          return
        }
        const { error } = await register(formData.email, formData.password, formData.fullName)
        if (error) {
          toast.error(error.message || 'Error al registrarse')
        } else {
          toast.success('¡Cuenta creada exitosamente!')
        }
      }
    } catch {
      toast.error('Error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

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

        <form onSubmit={handleSubmit}>
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
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" isLoading={isLoading}>
              {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
            </Button>

            <p className="text-sm text-text-secondary text-center">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
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
