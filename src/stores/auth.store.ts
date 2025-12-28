import { create } from 'zustand'
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

// Helper to fetch profile with retries (trigger may take a moment)
async function fetchProfileWithRetry(userId: string, maxRetries = 3, delayMs = 500): Promise<Profile | null> {
  for (let i = 0; i < maxRetries; i++) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profile) {
      console.log('✅ Profile found:', profile.full_name)
      return profile
    }

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
      return null
    }

    // Wait before retry (trigger might still be running)
    if (i < maxRetries - 1) {
      console.log(`⏳ Profile not found, retrying in ${delayMs}ms... (${i + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return null
}

// Helper to fetch or create profile
async function fetchOrCreateProfile(userId: string, email: string, fullName?: string): Promise<Profile | null> {
  try {
    // Intentar obtener perfil existente (con reintentos para dar tiempo al trigger)
    const existingProfile = await fetchProfileWithRetry(userId)
    
    if (existingProfile) {
      return existingProfile
    }

    // Si después de reintentos no existe, crear fallback
    console.log('⚠️ Profile not found after retries, creating fallback profile...')
    
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
      // Si falla el INSERT (ej: RLS o ya existe), intentar leer de nuevo
      console.log('⚠️ Fallback insert failed, trying to read again...')
      
      const { data: retryProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (retryProfile) {
        console.log('✅ Profile found on retry:', retryProfile.full_name)
        return retryProfile
      }
      
      console.error('❌ Error creating fallback profile:', createError)
      return null
    }

    console.log('✅ Fallback profile created:', newProfile.full_name)
    return newProfile
  } catch (err) {
    console.error('❌ fetchOrCreateProfile error:', err)
    return null
  }
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
      // Obtener sesión actual de Supabase
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
      }
      
      if (session?.user) {
        console.log('✅ Session found for:', session.user.email)
        
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
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔔 Auth event:', event)
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in:', session.user.email)
          
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

      // Cleanup no necesario aquí, pero buena práctica
      return () => subscription.unsubscribe()
      
    } catch (error) {
      console.error('❌ Auth initialization error:', error)
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
        // Obtener perfil (con reintentos para dar tiempo al trigger)
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
