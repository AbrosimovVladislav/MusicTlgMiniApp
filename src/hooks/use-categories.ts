'use client'

import { useState, useEffect } from 'react'
import type { Category } from '@/types'

interface UseCategoriesResult {
  topLevel: Category[]
  subCategories: (parentId: string) => Category[]
  isLoading: boolean
}

export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data: { categories: Category[] }) => setCategories(data.categories))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const topLevel = categories.filter((c) => c.parent_id === null)
  const subCategories = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId)

  return { topLevel, subCategories, isLoading }
}
