'use client'

import { useEffect } from 'react'
import { useRawInitData } from '@tma.js/sdk-react'
import { useAuthStore } from '@/lib/store/auth'
import { logger } from '@/lib/logger'
import type { User } from '@/types'

export function useAuth() {
  const initDataRaw = useRawInitData()
  const { user, isLoading, isAuthenticated, setUser, setLoading, reset } = useAuthStore()

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
        if (!cancelled) setUser(data.user)
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
