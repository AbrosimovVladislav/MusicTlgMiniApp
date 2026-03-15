'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useRawInitData } from '@tma.js/sdk-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { RouteGuard } from '@/components/shared/route-guard'
import type { ExpertCardData } from '@/app/api/user/experts/route'

const MATCH_STATUS_LABELS: Record<string, string> = {
  user_liked: 'Вы лайкнули',
  expert_liked: 'Откликнулся на ваш запрос',
  matched: 'Взаимный матч!',
  paid: 'Оплачено',
}

const MATCH_STATUS_COLORS: Record<string, string> = {
  user_liked: 'text-blue-400',
  expert_liked: 'text-yellow-400',
  matched: 'text-green-400',
  paid: 'text-purple-400',
}

function ExpertDetailContent({ expertId }: { expertId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestId = searchParams.get('request_id')
  const initDataRaw = useRawInitData()

  const [expert, setExpert] = useState<ExpertCardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liking, setLiking] = useState(false)

  const fetchExpert = useCallback(() => {
    if (!initDataRaw || !requestId) return
    setIsLoading(true)
    setError(null)
    fetch(`/api/user/experts?request_id=${requestId}`, {
      headers: { Authorization: `tma ${initDataRaw}` },
    })
      .then((r) => r.json())
      .then((data: { experts?: ExpertCardData[]; error?: string }) => {
        if (data.error) throw new Error(data.error)
        const found = (data.experts ?? []).find((e) => e.id === expertId)
        if (!found) throw new Error('Эксперт не найден')
        setExpert(found)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить эксперта')
      })
      .finally(() => setIsLoading(false))
  }, [initDataRaw, requestId, expertId])

  useEffect(() => {
    fetchExpert()
  }, [fetchExpert])

  async function handleLike() {
    if (!initDataRaw || !requestId || !expert || liking) return
    setLiking(true)
    try {
      const res = await fetch('/api/user/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${initDataRaw}`,
        },
        body: JSON.stringify({ expert_id: expert.id, request_id: requestId }),
      })
      const data = await res.json() as { match?: { id: string; status: string }; result?: string; error?: string }
      if (data.error) throw new Error(data.error)

      setExpert((prev) =>
        prev
          ? {
              ...prev,
              match_status: (data.match?.status ?? 'user_liked') as ExpertCardData['match_status'],
              match_id: data.match?.id ?? null,
            }
          : prev
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLiking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-bg px-5 pt-6 pb-8">
        <div className="h-10 w-10 rounded-full bg-bg-secondary animate-pulse mb-8" />
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-bg-secondary animate-pulse" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-5 w-40 rounded-lg bg-bg-secondary animate-pulse" />
            <div className="h-4 w-24 rounded-lg bg-bg-secondary animate-pulse" />
          </div>
        </div>
        <div className="h-28 rounded-2xl bg-bg-secondary animate-pulse mb-4" />
        <div className="h-16 rounded-2xl bg-bg-secondary animate-pulse" />
      </div>
    )
  }

  if (error || !expert) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg px-5">
        <p className="text-red-400 text-sm mb-4">{error ?? 'Эксперт не найден'}</p>
        <button onClick={() => router.back()} className="text-text-secondary text-sm underline">
          Назад
        </button>
      </div>
    )
  }

  const fullName = [expert.user.first_name, expert.user.last_name].filter(Boolean).join(' ')

  return (
    <div
      className="flex flex-col min-h-screen bg-bg"
      style={{ minHeight: 'var(--tg-viewport-stable-height, 100vh)' }}
    >
      {/* Hero */}
      <div className="relative">
        {expert.user.photo_url ? (
          <Image
            src={expert.user.photo_url}
            alt={fullName}
            width={400}
            height={280}
            className="w-full h-56 object-cover"
          />
        ) : (
          <div className="w-full h-56 flex items-center justify-center"
            style={{ background: 'linear-gradient(162deg, #1a0066 0%, #0b002a 100%)' }}
          >
            <span className="text-6xl font-bold text-white/20">{expert.user.first_name.charAt(0)}</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, #0b002a 100%)' }} />
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white active:opacity-70"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {/* Name on hero */}
        <div className="absolute bottom-4 left-5 right-5">
          <h1 className="text-white text-xl font-bold">{fullName}</h1>
          {expert.match_status && (
            <p className={cn('text-sm font-medium mt-0.5', MATCH_STATUS_COLORS[expert.match_status])}>
              {MATCH_STATUS_LABELS[expert.match_status]}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 px-5 pt-4 pb-32">
        {/* Categories */}
        {expert.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {expert.categories.map((cat) => (
              <span key={cat.id} className="text-xs text-text-secondary bg-white/8 px-3 py-1.5 rounded-full">
                {cat.name}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-4">
          <p className="text-muted text-xs font-medium uppercase tracking-wider mb-1">Стоимость консультации</p>
          <p className="text-text text-xl font-bold">
            {expert.consultation_price ? `${expert.consultation_price} ₽` : 'По запросу'}
          </p>
        </div>

        {/* Description */}
        {expert.description && (
          <div className="bg-bg-secondary border border-border rounded-2xl p-4">
            <p className="text-muted text-xs font-medium uppercase tracking-wider mb-2">О себе</p>
            <p className="text-text-secondary text-sm leading-relaxed">{expert.description}</p>
          </div>
        )}
      </div>

      {/* Fixed bottom CTA */}
      {requestId && (
        <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4"
          style={{ background: 'linear-gradient(to top, #0b002a 70%, transparent)' }}
        >
          {expert.match_status === 'expert_liked' ? (
            <div className="flex flex-col gap-2">
              <div className="w-full py-3 rounded-[1000px] font-medium text-sm text-center bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                {MATCH_STATUS_LABELS[expert.match_status]}
              </div>
              <button
                onClick={handleLike}
                disabled={liking}
                className={cn(
                  'w-full py-4 rounded-[1000px] font-semibold text-white text-base transition-opacity',
                  liking ? 'opacity-60' : 'active:opacity-80'
                )}
                style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }}
              >
                {liking ? 'Отправляю...' : 'Лайкнуть в ответ ♥'}
              </button>
            </div>
          ) : expert.match_status ? (
            <div className="flex flex-col gap-2">
              <div className={cn(
                'w-full py-4 rounded-[1000px] font-semibold text-base text-center',
                expert.match_status === 'matched'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-white/8 text-text-secondary border border-border'
              )}>
                {MATCH_STATUS_LABELS[expert.match_status]}
              </div>
              {(expert.match_status === 'user_liked' || expert.match_status === 'matched') && (
                <button
                  onClick={() => router.push(`/user/requests/${requestId}/waiting`)}
                  className="text-center text-xs text-accent-from underline"
                >
                  Посмотреть все лайки
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleLike}
              disabled={liking}
              className={cn(
                'w-full py-4 rounded-[1000px] font-semibold text-white text-base transition-opacity',
                liking ? 'opacity-60' : 'active:opacity-80'
              )}
              style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }}
            >
              {liking ? 'Отправляю...' : 'Лайкнуть эксперта ♥'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  params: Promise<{ expertId: string }>
}

export default async function ExpertDetailPage({ params }: Props) {
  const { expertId } = await params

  return (
    <RouteGuard allowedRole="user">
      <ExpertDetailContent expertId={expertId} />
    </RouteGuard>
  )
}
