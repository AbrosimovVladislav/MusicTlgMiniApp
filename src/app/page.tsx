'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth'
import { SplashScreen } from '@/components/shared/splash-screen'

export default function RootPage() {
  const router = useRouter()
  const { isLoading, isAuthenticated, user, currentMode } = useAuthStore()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) return

    const role = user?.role

    if (!role) {
      router.replace('/onboarding/role')
      return
    }

    // Определяем активный режим
    const mode = role === 'both' ? currentMode : role

    if (mode === 'user') {
      router.replace('/user/home')
    } else {
      router.replace('/expert/home')
    }
  }, [isLoading, isAuthenticated, user, currentMode, router])

  return <SplashScreen />
}
