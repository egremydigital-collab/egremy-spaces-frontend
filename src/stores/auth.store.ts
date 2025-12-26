import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'
import type { User, Session } from '@supabase/supabase-js'

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
  refreshProfile: () => Promise<Profile | null>
}

// Helper to fetch profile with retry (trigger puede tardar)
async function fetchProfileWithRetry(userId: string, retries = 3): Promise<Profile | null> {
  for (let i = 0; i < retries; i++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      console.log('✅ Profile found:', data.full_name)
      return data
    }

    // Si es error "not found" y quedan reintentos, esperar y reintentar
    if (error?.code === 'PGRST116' && i < retries - 1) {
      console.log(`⏳ Profile not ready, retrying... (${i + 1}/${retries})`)
      await new Promise(r => setTimeout(r, 500))
      continue
    }

    // Otro tipo de error
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching profile:', error)
      return null
    }
  }

  console.warn('⚠️ Profile not found after retries')
  return null
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  isInitialized: false,
  profileError: null,

  initialize: async () => {
    console.log('🔄 Initializing auth...')
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
      }
      
      if (session?.user) {
        console.log('✅ Session found for:', session.user.email)
        
        const profile = await fetchProfileWithRetry(session.user.id)

        set({
          user: session.user,
          session,
          profile,
          isLoading: false,
          isInitialized: true,
          profileError: profile ? null : 'No se pudo cargar el perfil',
        })
      } else {
        console.log('ℹ️ No session found')
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
        console.log('🔔 Auth event:', event)
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in:', session.user.email)
          
          const profile = await fetchProfileWithRetry(session.user.id)

          set({
            user: session.user,
            session,
            profile,
            isLoading: false,
            profileError: profile ? null : 'No se pudo cargar el perfil',
          })
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out')
          set({
            user: null,
            session: null,
            profile: null,
            profileError: null,
          })
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('🔄 Token refreshed')
          set({
            session,
            user: session.user,
          })
        }
      })
      
    } catch (error) {
      console.error('❌ Auth initialization error:', error)
      set({
        isLoading: false,
        isInitialized: true,
        profileError: 'Error al inicializar autenticación',
      })
    }
  },

  // Método para recargar perfil manualmente
  refreshProfile: async () => {
    const { user } = get()
    if (!user) return null

    set({ isLoading: true })
    
    const profile = await fetchProfileWithRetry(user.id)

    set({
      profile,
      isLoading: false,
      profileError: profile ? null : 'No se pudo cargar el perfil',
    })

    return profile
  },

  login: async (email, password) => {
    console.log('🔐 Attempting login for:', email)
    set({ isLoading: true, profileError: null })
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('❌ Login error:', error.message)
        throw error
      }

      console.log('✅ Login successful')

      if (data.user) {
        const profile = await fetchProfileWithRetry(data.user.id)

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
    console.log('📝 Attempting register for:', email)
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

      if (error) {
        console.error('❌ Register error:', error.message)
        throw error
      }

      console.log('✅ Register successful')

      if (data.user) {
        // Esperar para que el trigger cree el perfil
        await new Promise((resolve) => setTimeout(resolve, 800))
        
        // Obtener perfil con reintentos
        const profile = await fetchProfileWithRetry(data.user.id, 5)

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

  logout: async () => {
    console.log('👋 Logging out...')
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
}))