'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRawInitData } from '@tma.js/sdk-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { RouteGuard } from '@/components/shared/route-guard'
import type { ExpertCardData } from '@/app/api/user/experts/route'

const MATCH_STATUS_LABELS: Record<string, string> = {
  user_liked: 'Лайкнут',
  expert_liked: 'Откликнулся',
  matched: 'Матч!',
  paid: 'Оплачено',
}

const MATCH_STATUS_COLORS: Record<string, string> = {
  user_liked: 'text-blue-400 bg-blue-400/10',
  expert_liked: 'text-yellow-400 bg-yellow-400/10',
  matched: 'text-green-400 bg-green-400/10',
  paid: 'text-purple-400 bg-purple-400/10',
}

function ExpertsList({ requestId }: { requestId: string }) {
  const router = useRouter()
  const initDataRaw = useRawInitData()

  const [experts, setExperts] = useState<ExpertCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liking, setLiking] = useState<string | null>(null)

  const fetchExperts = useCallback(() => {
    if (!initDataRaw) return
    setIsLoading(true)
    setError(null)
    fetch(`/api/user/experts?request_id=${requestId}`, {
      headers: { Authorization: `tma ${initDataRaw}` },
    })
      .then((r) => r.json())
      .then((data: { experts?: ExpertCardData[]; error?: string }) => {
        if (data.error) throw new Error(data.error)
        setExperts(data.experts ?? [])
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить экспертов')
      })
      .finally(() => setIsLoading(false))
  }, [initDataRaw, requestId])

  useEffect(() => {
    fetchExperts()
  }, [fetchExperts])

  async function handleLike(expertId: string) {
    if (!initDataRaw || liking) return
    setLiking(expertId)
    try {
      const res = await fetch('/api/user/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${initDataRaw}`,
        },
        body: JSON.stringify({ expert_id: expertId, request_id: requestId }),
      })
      const data = await res.json() as { match?: { id: string; status: string }; result?: string; error?: string }
      if (data.error) throw new Error(data.error)

      // Обновить статус локально
      setExperts((prev) =>
        prev.map((e) =>
          e.id === expertId
            ? {
                ...e,
                match_status: (data.match?.status ?? 'user_liked') as ExpertCardData['match_status'],
                match_id: data.match?.id ?? null,
              }
            : e
        )
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLiking(null)
    }
  }

  return (
    <div
      className="flex flex-col min-h-screen bg-bg px-5 pt-6 pb-8"
      style={{ minHeight: 'var(--tg-viewport-stable-height, 100vh)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-text active:opacity-70"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-text font-semibold text-lg">Эксперты</h1>
          <p className="text-text-secondary text-xs">по вашему запросу</p>
        </div>
        {experts.some((e) => e.match_status) && (
          <button
            onClick={() => router.push(`/user/requests/${requestId}/waiting`)}
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)', color: 'white' }}
          >
            Мои лайки
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-bg-secondary animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-red-400 text-sm text-center">{error}</p>
          <button onClick={fetchExperts} className="text-accent-from text-sm underline">
            Повторить
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && experts.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
          <div className="text-5xl mb-4">🎵</div>
          <p className="text-text font-medium mb-2">Пока нет экспертов</p>
          <p className="text-text-secondary text-sm leading-relaxed max-w-[260px]">
            Нет экспертов по выбранной категории. Попробуйте уточнить запрос.
          </p>
        </div>
      )}

      {/* List */}
      {!isLoading && !error && experts.length > 0 && (
        <div className="flex flex-col gap-3">
          {experts.map((expert) => (
            <div
              key={expert.id}
              className="bg-bg-secondary border border-border rounded-2xl p-4"
            >
              {/* Top row */}
              <div className="flex items-start gap-3 mb-3">
                {/* Avatar */}
                <button
                  onClick={() => router.push(`/user/experts/${expert.id}?request_id=${requestId}`)}
                  className="shrink-0"
                >
                  {expert.user.photo_url ? (
                    <Image
                      src={expert.user.photo_url}
                      alt={expert.user.first_name}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-semibold text-text">
                      {expert.user.first_name.charAt(0)}
                    </div>
                  )}
                </button>

                {/* Name + match status */}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => router.push(`/user/experts/${expert.id}?request_id=${requestId}`)}
                    className="text-left w-full"
                  >
                    <p className="text-text font-semibold text-sm">
                      {expert.user.first_name}
                      {expert.user.last_name ? ` ${expert.user.last_name}` : ''}
                    </p>
                  </button>
                  {expert.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {expert.categories.slice(0, 2).map((cat) => (
                        <span key={cat.id} className="text-xs text-muted bg-white/5 px-2 py-0.5 rounded-full">
                          {cat.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Match badge or Like button */}
                {expert.match_status === 'expert_liked' ? (
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span className={cn('text-xs font-medium px-2 py-1 rounded-full', MATCH_STATUS_COLORS[expert.match_status])}>
                      {MATCH_STATUS_LABELS[expert.match_status]}
                    </span>
                    <button
                      onClick={() => handleLike(expert.id)}
                      disabled={liking === expert.id}
                      className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-transform disabled:opacity-60"
                      style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }}
                    >
                      {liking === expert.id ? (
                        <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                ) : expert.match_status ? (
                  <span className={cn('shrink-0 text-xs font-medium px-2 py-1 rounded-full', MATCH_STATUS_COLORS[expert.match_status])}>
                    {MATCH_STATUS_LABELS[expert.match_status]}
                  </span>
                ) : (
                  <button
                    onClick={() => handleLike(expert.id)}
                    disabled={liking === expert.id}
                    className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-transform disabled:opacity-60"
                    style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }}
                  >
                    {liking === expert.id ? (
                      <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                )}
              </div>

              {/* Description preview */}
              {expert.description && (
                <p className="text-text-secondary text-xs leading-relaxed line-clamp-2 mb-3">
                  {expert.description}
                </p>
              )}

              {/* Price + details button */}
              <div className="flex items-center justify-between">
                {expert.consultation_price ? (
                  <span className="text-text text-sm font-semibold">{expert.consultation_price} ₽</span>
                ) : (
                  <span className="text-muted text-sm">Цена по запросу</span>
                )}
                <button
                  onClick={() => router.push(`/user/experts/${expert.id}?request_id=${requestId}`)}
                  className="text-xs text-accent-from font-medium"
                >
                  Подробнее →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ExpertsPage({ params }: Props) {
  const { id } = await params

  return (
    <RouteGuard allowedRole="user">
      <ExpertsList requestId={id} />
    </RouteGuard>
  )
}
