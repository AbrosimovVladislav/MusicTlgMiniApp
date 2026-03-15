'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRawInitData } from '@tma.js/sdk-react'
import type { Request, Category } from '@/types'

type RequestWithCategories = Request & {
  category: Pick<Category, 'id' | 'name'> | null
  subcategory: Pick<Category, 'id' | 'name'> | null
}

interface UseRequestsResult {
  requests: RequestWithCategories[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useRequests(): UseRequestsResult {
  const initDataRaw = useRawInitData()
  const [requests, setRequests] = useState<RequestWithCategories[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    if (!initDataRaw) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/requests', {
        headers: { Authorization: `tma ${initDataRaw}` },
      })

      if (!res.ok) {
        const err = await res.json() as { error: string }
        throw new Error(err.error)
      }

      const data = await res.json() as { requests: RequestWithCategories[] }
      setRequests(data.requests)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests')
    } finally {
      setIsLoading(false)
    }
  }, [initDataRaw])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  return { requests, isLoading, error, refetch: fetchRequests }
}
