import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

type ActiveMode = 'user' | 'expert'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  /** Активный режим — имеет смысл только когда role === 'both' */
  currentMode: ActiveMode
  setUser: (user: User) => void
  setCurrentMode: (mode: ActiveMode) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      currentMode: 'user',
      setUser: (user) => {
        const prev = get()
        let currentMode = prev.currentMode
        if (user.role === 'user') currentMode = 'user'
        if (user.role === 'expert') currentMode = 'expert'
        set({ user, isAuthenticated: true, isLoading: false, currentMode })
      },
      setCurrentMode: (mode) => set({ currentMode: mode }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set({ user: null, isAuthenticated: false, isLoading: false, currentMode: 'user' }),
    }),
    {
      name: 'music-app-auth',
      partialize: (state) => ({ currentMode: state.currentMode }),
    }
  )
)
