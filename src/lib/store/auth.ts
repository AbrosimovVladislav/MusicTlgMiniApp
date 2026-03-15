import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

type ActiveMode = 'user' | 'expert'

export interface ExpertName {
  first_name: string
  last_name: string | null
}

interface AuthState {
  user: User | null
  expertName: ExpertName | null
  isLoading: boolean
  isAuthenticated: boolean
  /** Активный режим — имеет смысл только когда role === 'both' */
  currentMode: ActiveMode
  setUser: (user: User) => void
  setExpertName: (name: ExpertName | null) => void
  setCurrentMode: (mode: ActiveMode) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      expertName: null,
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
      setExpertName: (expertName) => set({ expertName }),
      setCurrentMode: (mode) => set({ currentMode: mode }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set({ user: null, expertName: null, isAuthenticated: false, isLoading: false, currentMode: 'user' }),
    }),
    {
      name: 'music-app-auth',
      // Сохраняем только currentMode (не user и не expertName — перезагружаются из API)
      partialize: (state) => ({ currentMode: state.currentMode }),
    }
  )
)
