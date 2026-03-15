'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth'
import { SplashScreen } from '@/components/shared/splash-screen'
import type { UserRole } from '@/types'

interface RouteGuardProps {
  children: React.ReactNode
  /**
   * Роль, для которой доступен маршрут.
   * undefined + requireAuth=true — любой авторизованный пользователь (напр. /profile)
   * undefined + requireAuth=false — только без роли (онбординг)
   */
  allowedRole?: UserRole
  requireAuth?: boolean
}

export function RouteGuard({ children, allowedRole, requireAuth = false }: RouteGuardProps) {
  const router = useRouter()
  const { isLoading, isAuthenticated, user, currentMode } = useAuthStore()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) return // dev fallback

    const role = user?.role

    // Страница для любого авторизованного (напр. /profile)
    if (requireAuth && !allowedRole) {
      if (!role) router.replace('/onboarding/role')
      return
    }

    if (allowedRole) {
      if (!role) {
        router.replace('/onboarding/role')
        return
      }

      // Для роли 'both' — проверяем currentMode
      const effectiveRole = role === 'both' ? currentMode : role

      if (effectiveRole !== allowedRole) {
        // Не та роль — гоним на свой home
        const homeRoute = currentMode === 'user' ? '/user/home' : '/expert/home'
        router.replace(homeRoute)
      }
    } else {
      // Онбординг-маршрут — если роль уже есть, уходим
      if (role) {
        const homeRoute = currentMode === 'user' ? '/user/home' : '/expert/home'
        router.replace(homeRoute)
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRole, requireAuth, currentMode, router])

  if (isLoading) return <SplashScreen />

  return <>{children}</>
}
