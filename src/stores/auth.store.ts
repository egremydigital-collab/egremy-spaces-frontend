import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'
import type { User, Session } from '@supabase/supabase-js'

// Default organization ID (Egremy Digital)
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001'

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isInitialized: boolean
  profileError: string | null
  
  // Actions
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<{ error: Error | null }>
  register: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>
  ensureProfile: () => Promise<Profile | null>
}

// Helper to fetch or create profile
async function fetchOrCreateProfile(userId: string, email: string, fullName?: string): Promise<Profile | null> {
  // Intentar obtener perfil existente
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (existingProfile) {
    return existingProfile
  }

  // Si no existe y no es error de "not found", hay un problema
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching profile:', fetchError)
    return null
  }

  // Crear perfil si no existe (fallback si trigger no funcionó)
  console.log('Profile not found, creating fallback profile...')
  
  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      organization_id: DEFAULT_ORG_ID,
      email,
      full_name: fullName || email.split('@')[0],
      role: 'member',
      team: 'egremy_digital',
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating fallback profile:', createError)
    return null
  }

  return newProfile
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      session: null,
      isLoading: true,
      isInitialized: false,
      profileError: null,

      initialize: async () => {
        try {
          // Obtener sesión actual
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            // Obtener o crear perfil del usuario
            const profile = await fetchOrCreateProfile(
              session.user.id,
              session.user.email || '',
              session.user.user_metadata?.full_name
            )

            set({
              user: session.user,
              session,
              profile,
              isLoading: false,
              isInitialized: true,
              profileError: profile ? null : 'No se pudo cargar el perfil',
            })
          } else {
            set({
              user: null,
              session: null,
              profile: null,
              isLoading: false,
              isInitialized: true,
              profileError: null,
            })
          }

          // Escuchar cambios de auth
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              const profile = await fetchOrCreateProfile(
                session.user.id,
                session.user.email || '',
                session.user.user_metadata?.full_name
              )

              set({
                user: session.user,
                session,
                profile,
                profileError: profile ? null : 'No se pudo cargar el perfil',
              })
            } else if (event === 'SIGNED_OUT') {
              set({
                user: null,
                session: null,
                profile: null,
                profileError: null,
              })
            }
          })
        } catch (error) {
          console.error('Auth initialization error:', error)
          set({
            isLoading: false,
            isInitialized: true,
            profileError: 'Error al inicializar autenticación',
          })
        }
      },

      // Método para reintentar cargar perfil
      ensureProfile: async () => {
        const { user, profile } = get()
        
        if (profile) return profile
        if (!user) return null

        set({ isLoading: true })
        
        const newProfile = await fetchOrCreateProfile(
          user.id,
          user.email || '',
          user.user_metadata?.full_name
        )

        set({
          profile: newProfile,
          isLoading: false,
          profileError: newProfile ? null : 'No se pudo crear el perfil',
        })

        return newProfile
      },

      login: async (email, password) => {
        set({ isLoading: true, profileError: null })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) throw error

          if (data.user) {
            const profile = await fetchOrCreateProfile(data.user.id, email)

            set({
              user: data.user,
              session: data.session,
              profile,
              isLoading: false,
              profileError: profile ? null : 'No se pudo cargar el perfil',
            })
          }

          return { error: null }
        } catch (err) {
          set({ isLoading: false })
          return { error: err instanceof Error ? err : new Error(String(err)) }
        }
      },

      register: async (email, password, fullName) => {
        set({ isLoading: true, profileError: null })
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
              },
            },
          })

          if (error) throw error

          if (data.user) {
            // Esperar un momento para que el trigger cree el perfil
            await new Promise((resolve) => setTimeout(resolve, 1000))
            
            // Obtener o crear perfil (fallback si trigger no funcionó)
            const profile = await fetchOrCreateProfile(data.user.id, email, fullName)

            set({
              user: data.user,
              session: data.session,
              profile,
              isLoading: false,
              profileError: profile ? null : 'No se pudo crear el perfil',
            })
          }

          return { error: null }
        } catch (err) {
          set({ isLoading: false })
          return { error: err instanceof Error ? err : new Error(String(err)) }
        }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({
          user: null,
          session: null,
          profile: null,
          profileError: null,
        })
      },

      updateProfile: async (updates) => {
        const { profile } = get()
        if (!profile) return { error: new Error('No profile') }

        try {
          const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', profile.id)

          if (error) throw error

          set({
            profile: { ...profile, ...updates },
          })

          return { error: null }
        } catch (err) {
          return { error: err instanceof Error ? err : new Error(String(err)) }
        }
      },
    }),
    {
      name: 'egremy-auth',
      partialize: (state) => ({
        // Solo persistir lo mínimo necesario
        user: state.user,
        profile: state.profile,
      }),
    }
  )
)
