'use client'

import { useEffect } from 'react'
import { useRawInitData } from '@tma.js/sdk-react'
import { useAuthStore } from '@/lib/store/auth'
import { logger } from '@/lib/logger'
import type { User } from '@/types'

interface ProfileResponse {
  profile: {
    display_first_name: string
    display_last_name: string | null
  }
}

export function useAuth() {
  const initDataRaw = useRawInitData()
  const { user, isLoading, isAuthenticated, setUser, setExpertName, setLoading, reset } = useAuthStore()

  useEffect(() => {
    logger.log('useAuth', 'effect triggered', { initDataRaw: initDataRaw ? `[present, ${initDataRaw.length} chars]` : null })

    if (!initDataRaw) {
      logger.warn('useAuth', 'initDataRaw is empty — calling reset()')
      reset()
      return
    }

    let cancelled = false

    async function authenticate() {
      setLoading(true)
      logger.log('useAuth', 'calling /api/auth')
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initDataRaw }),
        })

        logger.log('useAuth', '/api/auth response', { status: res.status, ok: res.ok })

        if (!res.ok) {
          const errBody = await res.text()
          logger.error('useAuth', '/api/auth failed', { status: res.status, body: errBody })
          if (!cancelled) reset()
          return
        }

        const data = (await res.json()) as { user: User }
        logger.log('useAuth', 'auth success', { userId: data.user?.id, role: data.user?.role })
        if (cancelled) return

        setUser(data.user)

        // Если пользователь — эксперт, загружаем его отображаемое имя
        const role = data.user?.role
        if (role === 'expert' || role === 'both') {
          try {
            const profileRes = await fetch('/api/expert/profile', {
              headers: { Authorization: `tma ${initDataRaw}` },
            })
            if (profileRes.ok) {
              const profileData = (await profileRes.json()) as ProfileResponse
              if (!cancelled) {
                setExpertName({
                  first_name: profileData.profile.display_first_name,
                  last_name: profileData.profile.display_last_name,
                })
              }
            }
          } catch {
            logger.warn('useAuth', 'failed to load expert display name')
          }
        }
      } catch (err) {
        logger.error('useAuth', 'fetch threw exception', { error: String(err) })
        if (!cancelled) reset()
      }
    }

    authenticate()
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initDataRaw])

  return { user, isLoading, isAuthenticated }
}
