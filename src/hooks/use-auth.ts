'use client'

import { useEffect } from 'react'
import { useRawInitData } from '@tma.js/sdk-react'
import { useAuthStore } from '@/lib/store/auth'
import type { User } from '@/types'

export function useAuth() {
  const initDataRaw = useRawInitData()
  const { user, isLoading, isAuthenticated, setUser, setLoading, reset } = useAuthStore()

  useEffect(() => {
    if (!initDataRaw) {
      reset()
      return
    }

    let cancelled = false

    async function authenticate() {
      setLoading(true)
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initDataRaw }),
        })

        if (!res.ok) {
          if (!cancelled) reset()
          return
        }

        const data = (await res.json()) as { user: User }
        if (!cancelled) setUser(data.user)
      } catch {
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
