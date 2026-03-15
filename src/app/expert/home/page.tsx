'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useRawInitData } from '@tma.js/sdk-react'
import { RouteGuard } from '@/components/shared/route-guard'
import { BottomNav } from '@/components/shared/bottom-nav'
import { ExpertRequestCard, type ExpertRequestItem } from '@/components/expert/expert-request-card'
import { useAuthStore } from '@/lib/store/auth'

interface ExpertHomeData {
  liked_me: ExpertRequestItem[]
  by_category: ExpertRequestItem[]
}

function ExpertHomeContent() {
  const router = useRouter()
  const initDataRaw = useRawInitData()
  const { user, expertName } = useAuthStore()

  const [profileChecked, setProfileChecked] = useState(false)
  const [data, setData] = useState<ExpertHomeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!initDataRaw) return

    setIsLoading(true)
    setError(null)

    try {
      // Сначала проверяем наличие профиля
      const profileRes = await fetch('/api/expert/profile', {
        headers: { Authorization: `tma ${initDataRaw}` },
      })

      if (profileRes.status === 404) {
        router.replace('/expert/profile/setup')
        return
      }

      if (!profileRes.ok) {
        throw new Error('Ошибка загрузки профиля')
      }

      setProfileChecked(true)

      // Загружаем данные главной страницы
      const homeRes = await fetch('/api/expert/home', {
        headers: { Authorization: `tma ${initDataRaw}` },
      })

      if (!homeRes.ok) {
        throw new Error('Ошибка загрузки запросов')
      }

      const homeData = await homeRes.json() as ExpertHomeData
      setData(homeData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Что-то пошло не так')
    } finally {
      setIsLoading(false)
    }
  }, [initDataRaw, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading || !profileChecked) {
    return (
      <main
        className="flex flex-col px-5 pt-8 pb-24"
        style={{ minHeight: 'var(--tg-viewport-stable-height, 100svh)' }}
      >
        <div className="mb-8">
          <div className="h-4 w-24 bg-white/5 rounded animate-pulse mb-2" />
          <div className="h-7 w-48 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main
        className="flex flex-col items-center justify-center px-5 text-center"
        style={{ minHeight: 'var(--tg-viewport-stable-height, 100svh)' }}
      >
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="text-sm text-text-secondary underline"
        >
          Повторить
        </button>
      </main>
    )
  }

  const likedMe = data?.liked_me ?? []
  const byCategory = data?.by_category ?? []
  const hasAny = likedMe.length > 0 || byCategory.length > 0

  return (
    <main
      className="flex flex-col px-5 pt-8 pb-24"
      style={{ minHeight: 'var(--tg-viewport-stable-height, 100svh)' }}
    >
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-20 right-0 w-64 h-64 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #4400ff 0%, transparent 70%)' }}
        />
      </div>

      {/* Header */}
      <div className="relative mb-8">
        <p className="text-text-secondary text-sm mb-1">Добро пожаловать,</p>
        <h1 className="text-white text-2xl font-semibold leading-tight">
          {expertName?.first_name ?? user?.first_name ?? 'Эксперт'} 🎤
        </h1>
      </div>

      {/* Пустое состояние */}
      {!hasAny && (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
          <div className="text-5xl mb-4">🎵</div>
          <p className="text-white font-medium mb-2">Пока нет запросов</p>
          <p className="text-text-secondary text-sm leading-relaxed max-w-[260px]">
            Здесь будут появляться запросы пользователей, которые соответствуют вашим категориям
          </p>
        </div>
      )}

      {/* Раздел: Меня лайкнули */}
      {likedMe.length > 0 && (
        <section className="relative mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">❤️</span>
            <h2 className="text-white text-sm font-semibold uppercase tracking-wider">
              Меня лайкнули
            </h2>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(68,0,255,0.3)', color: '#a78bfa' }}
            >
              {likedMe.length}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {likedMe.map((req) => (
              <ExpertRequestCard key={req.id} request={req} variant="liked" />
            ))}
          </div>
        </section>
      )}

      {/* Раздел: По моим категориям */}
      {byCategory.length > 0 && (
        <section className="relative">
          <h2 className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-3">
            Запросы по вашим категориям
          </h2>
          <div className="flex flex-col gap-3">
            {byCategory.map((req) => (
              <ExpertRequestCard key={req.id} request={req} variant="category" />
            ))}
          </div>
        </section>
      )}

      <BottomNav />
    </main>
  )
}

export default function ExpertHomePage() {
  return (
    <RouteGuard allowedRole="expert">
      <ExpertHomeContent />
    </RouteGuard>
  )
}
