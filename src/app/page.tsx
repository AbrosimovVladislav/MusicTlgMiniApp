'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth'
import { SplashScreen } from '@/components/shared/splash-screen'

export default function RootPage() {
  const router = useRouter()
  const { isLoading, isAuthenticated, user, currentMode } = useAuthStore()

  const handleContinue = useCallback(() => {
    if (!isAuthenticated) return

    const role = user?.role
    if (!role) {
      router.replace('/onboarding/role')
      return
    }

    const mode = role === 'both' ? currentMode : role
    if (mode === 'user') {
      router.replace('/user/home')
    } else {
      router.replace('/expert/home')
    }
  }, [isAuthenticated, user, currentMode, router])

  return (
    <SplashScreen onContinue={isLoading ? undefined : handleContinue} />
  )
}
