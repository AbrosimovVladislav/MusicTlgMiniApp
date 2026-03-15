'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth'
import { SplashScreen } from '@/components/shared/splash-screen'

export default function RootPage() {
  const router = useRouter()
  const { isLoading, isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      // Dev fallback — в Telegram всегда будет auth
      return
    }

    if (!user?.role) {
      router.replace('/onboarding/role')
    } else if (user.role === 'user') {
      router.replace('/user/home')
    } else {
      router.replace('/expert/home')
    }
  }, [isLoading, isAuthenticated, user, router])

  return <SplashScreen />
}
