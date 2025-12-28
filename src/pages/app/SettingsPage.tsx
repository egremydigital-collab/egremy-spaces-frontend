import * as React from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Avatar,
} from '@/components/ui'
import { User, Lock, Eye, EyeOff, Save, CheckCircle } from 'lucide-react'

export function SettingsPage() {
  const { profile, updateProfile } = useAuthStore()
  
  // Profile form state
  const [profileData, setProfileData] = React.useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
  })
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false)

  // Password form state
  const [passwordData, setPasswordData] = React.useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false)
  const [passwordUpdated, setPasswordUpdated] = React.useState(false)

  // Update profile data when profile loads
  React.useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        email: profile.email || '',
      })
    }
  }, [profile])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!profileData.full_name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setIsUpdatingProfile(true)

    try {
      const { error } = await updateProfile({
        full_name: profileData.full_name.trim(),
      })

      if (error) {
        toast.error(error.message || 'Error al actualizar perfil')
      } else {
        toast.success('Perfil actualizado correctamente')
      }
    } catch {
      toast.error('Error inesperado')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validations
    if (passwordData.newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setIsUpdatingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })

      if (error) {
        toast.error(error.message || 'Error al actualizar contraseña')
      } else {
        setPasswordUpdated(true)
        setPasswordData({ newPassword: '', confirmPassword: '' })
        toast.success('Contraseña actualizada correctamente')
        
        // Reset success state after 3 seconds
        setTimeout(() => setPasswordUpdated(false), 3000)
      }
    } catch {
      toast.error('Error inesperado')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Configuración</h1>
        <p className="text-text-secondary mt-1">Administra tu perfil y preferencias</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-primary/10">
              <User className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>Tu información personal</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <Avatar
                name={profileData.full_name || 'Usuario'}
                size="lg"
              />
              <div>
                <p className="font-medium text-text-primary">{profileData.full_name || 'Usuario'}</p>
                <p className="text-sm text-text-secondary">{profileData.email}</p>
                <p className="text-xs text-text-secondary mt-1">
                  {profile?.team === 'egremy_digital' ? 'Egremy Digital' : 
                   profile?.team === 'orangutan_n8n' ? 'Orangutan n8n' : 
                   profile?.team || 'Sin equipo'} • {profile?.role || 'member'}
                </p>
              </div>
            </div>

            <Input
              label="Nombre completo"
              type="text"
              placeholder="Tu nombre"
              value={profileData.full_name}
              onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
              required
            />

            <Input
              label="Correo electrónico"
              type="email"
              value={profileData.email}
              disabled
              className="opacity-60"
            />
            <p className="text-xs text-text-secondary -mt-2">
              El correo no se puede cambiar
            </p>

            <div className="pt-2">
              <Button type="submit" isLoading={isUpdatingProfile}>
                <Save className="w-4 h-4 mr-2" />
                Guardar cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-warning/10">
              <Lock className="w-5 h-5 text-accent-warning" />
            </div>
            <div>
              <CardTitle>Contraseña</CardTitle>
              <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {passwordUpdated ? (
            <div className="flex items-center gap-3 p-4 bg-accent-success/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-accent-success" />
              <p className="text-accent-success">¡Contraseña actualizada correctamente!</p>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="relative">
                <Input
                  label="Nueva contraseña"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-[34px] text-text-secondary hover:text-text-primary transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Confirmar contraseña"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-[34px] text-text-secondary hover:text-text-primary transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              <p className="text-xs text-text-secondary">
                La contraseña debe tener al menos 6 caracteres
              </p>

              <div className="pt-2">
                <Button type="submit" variant="outline" isLoading={isUpdatingPassword}>
                  <Lock className="w-4 h-4 mr-2" />
                  Actualizar contraseña
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
