'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useRawInitData } from '@tma.js/sdk-react'
import { RouteGuard } from '@/components/shared/route-guard'
import { cn } from '@/lib/utils'

interface RequestDetail {
  id: string
  description: string
  status: string
  created_at: string
  is_active: boolean
  budget: number | null
  category: { id: string; name: string } | null
  subcategory: { id: string; name: string } | null
  user: { first_name: string; photo_url: string | null } | null
  match_status: string | null
  match_id: string | null
}

const MATCH_INFO: Record<string, { label: string; color: string; bg: string }> = {
  user_liked: { label: '❤️ Пользователь хочет с вами поработать', color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
  expert_liked: { label: '✓ Вы откликнулись — ждёте ответа', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  matched: { label: '🎯 Взаимный матч! Ждём оплаты', color: '#facc15', bg: 'rgba(250,204,21,0.1)' },
  paid: { label: '✅ Оплачено — ваш контакт передан', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Сегодня'
  if (days === 1) return 'Вчера'
  if (days < 30) return `${days} дн. назад`
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function ExpertRequestDetailContent() {
  const params = useParams()
  const router = useRouter()
  const initDataRaw = useRawInitData()
  const id = params.id as string

  const [request, setRequest] = useState<RequestDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isResponding, setIsResponding] = useState(false)
  const [respondResult, setRespondResult] = useState<string | null>(null)

  const fetchRequest = useCallback(async () => {
    if (!initDataRaw) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/expert/requests/${id}`, {
        headers: { Authorization: `tma ${initDataRaw}` },
      })

      if (!res.ok) {
        throw new Error('Запрос не найден')
      }

      const data = await res.json() as { request: RequestDetail }
      setRequest(data.request)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setIsLoading(false)
    }
  }, [initDataRaw, id])

  useEffect(() => {
    fetchRequest()
  }, [fetchRequest])

  async function handleRespond() {
    if (!initDataRaw || !request) return
    setIsResponding(true)

    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${initDataRaw}`,
        },
        body: JSON.stringify({ request_id: request.id }),
      })

      const data = await res.json() as { match: { id: string; status: string }; result: string }

      if (!res.ok) throw new Error('Ошибка отклика')

      setRespondResult(data.result)
      setRequest((prev) =>
        prev ? { ...prev, match_status: data.match.status, match_id: data.match.id } : prev
      )
    } catch {
      setError('Не удалось отправить отклик')
    } finally {
      setIsResponding(false)
    }
  }

  if (isLoading) {
    return (
      <main
        className="flex flex-col px-5 pt-6 pb-10"
        style={{ minHeight: 'var(--tg-viewport-stable-height, 100svh)' }}
      >
        <div className="h-6 w-16 bg-white/5 rounded animate-pulse mb-8" />
        <div className="h-4 w-32 bg-white/5 rounded animate-pulse mb-3" />
        <div className="h-24 bg-white/5 rounded-2xl animate-pulse mb-4" />
        <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
      </main>
    )
  }

  if (error || !request) {
    return (
      <main
        className="flex flex-col items-center justify-center px-5 text-center"
        style={{ minHeight: 'var(--tg-viewport-stable-height, 100svh)' }}
      >
        <p className="text-red-400 text-sm mb-4">{error ?? 'Запрос не найден'}</p>
        <button onClick={() => router.back()} className="text-sm text-text-secondary underline">
          Назад
        </button>
      </main>
    )
  }

  const matchInfo = request.match_status ? MATCH_INFO[request.match_status] : null
  const canRespond = !request.match_status || request.match_status === null
  const isAlreadyMatched = request.match_status === 'matched' || request.match_status === 'paid'
  const isUserLiked = request.match_status === 'user_liked'
  const isExpertLiked = request.match_status === 'expert_liked'

  return (
    <main
      className="flex flex-col px-5 pt-6 pb-10"
      style={{ minHeight: 'var(--tg-viewport-stable-height, 100svh)' }}
    >
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #4400ff 0%, transparent 70%)' }}
        />
      </div>

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-text-secondary text-sm mb-8 -ml-1 w-fit"
      >
        <BackIcon />
        Назад
      </button>

      <div className="relative flex flex-col gap-5">
        {/* Статус матча */}
        {matchInfo && (
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ background: matchInfo.bg, border: `1px solid ${matchInfo.color}30` }}
          >
            <p className="text-sm font-medium" style={{ color: matchInfo.color }}>
              {matchInfo.label}
            </p>
          </div>
        )}

        {/* Автор */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #4400ff, #3901d2)' }}
          >
            {request.user?.first_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{request.user?.first_name ?? 'Аноним'}</p>
            <p className="text-muted text-xs">{timeAgo(request.created_at)}</p>
          </div>
        </div>

        {/* Категории */}
        {(request.category || request.subcategory) && (
          <div className="flex items-center gap-2 flex-wrap">
            {request.category && (
              <span
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{ background: 'rgba(68,0,255,0.2)', color: '#a78bfa' }}
              >
                {request.category.name}
              </span>
            )}
            {request.subcategory && (
              <span className="text-xs text-muted px-3 py-1 rounded-full bg-white/5">
                {request.subcategory.name}
              </span>
            )}
          </div>
        )}

        {/* Описание */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-xs text-muted font-medium uppercase tracking-wider mb-2">Запрос</p>
          <p className="text-white text-sm leading-relaxed">{request.description}</p>
        </div>

        {/* Бюджет */}
        {request.budget && (
          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs text-muted mb-1">Бюджет</p>
            <p className="text-white text-sm font-semibold">₽ {request.budget.toLocaleString('ru-RU')}</p>
          </div>
        )}

        {/* Уведомление об успешном отклике */}
        {respondResult === 'matched' && (
          <div
            className="rounded-2xl px-4 py-4 text-center"
            style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)' }}
          >
            <p className="text-yellow-400 font-semibold text-base mb-1">🎯 Взаимный матч!</p>
            <p className="text-yellow-300/70 text-sm">Пользователь получит уведомление</p>
          </div>
        )}

        {respondResult === 'responded' && (
          <div
            className="rounded-2xl px-4 py-4 text-center"
            style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)' }}
          >
            <p className="text-blue-400 font-semibold text-base mb-1">✓ Отклик отправлен</p>
            <p className="text-blue-300/70 text-sm">Ждём ответа пользователя</p>
          </div>
        )}

        {/* Кнопка действия */}
        <div className="mt-2">
          {isAlreadyMatched && (
            <div
              className="w-full h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}
            >
              <span className="text-green-400 font-semibold">✅ Матч состоялся</span>
            </div>
          )}

          {isExpertLiked && !respondResult && (
            <div
              className="w-full h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
            >
              <span className="text-blue-400 text-sm">Отклик уже отправлен</span>
            </div>
          )}

          {(canRespond || isUserLiked) && !respondResult && (
            <button
              onClick={handleRespond}
              disabled={isResponding}
              className={cn(
                'w-full h-14 rounded-2xl font-semibold text-base text-white transition-all duration-200',
                'disabled:opacity-50 active:scale-[0.98]'
              )}
              style={{
                background: isUserLiked
                  ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)'
                  : 'linear-gradient(135deg, #4400ff 0%, #3901d2 100%)',
              }}
            >
              {isResponding
                ? 'Отправляем...'
                : isUserLiked
                ? '❤️ Принять — это матч!'
                : 'Откликнуться'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

export default function ExpertRequestDetailPage() {
  return (
    <RouteGuard allowedRole="expert">
      <ExpertRequestDetailContent />
    </RouteGuard>
  )
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}
