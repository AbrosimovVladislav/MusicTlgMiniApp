'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth'
import { SplashScreen } from '@/components/shared/splash-screen'
import type { UserRole } from '@/types'

interface RouteGuardProps {
  children: React.ReactNode
  /** Роль, которая имеет доступ. Если не указана — доступ только без роли (онбординг). */
  allowedRole?: UserRole
}

export function RouteGuard({ children, allowedRole }: RouteGuardProps) {
  const router = useRouter()
  const { isLoading, isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) return // dev fallback

    const role = user?.role

    if (allowedRole) {
      // Защищённый роут — нужна конкретная роль
      if (!role) {
        router.replace('/onboarding/role')
      } else if (role !== allowedRole) {
        // Не та роль — гоним на свой home
        router.replace(role === 'user' ? '/user/home' : '/expert/home')
      }
    } else {
      // Онбординг-роут — если роль уже есть, редирект на home
      if (role) {
        router.replace(role === 'user' ? '/user/home' : '/expert/home')
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRole, router])

  if (isLoading) return <SplashScreen />

  return <>{children}</>
}
