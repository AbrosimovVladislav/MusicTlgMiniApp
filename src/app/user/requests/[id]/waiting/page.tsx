'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useRawInitData } from '@tma.js/sdk-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { RouteGuard } from '@/components/shared/route-guard'
import type { MatchWithExpert } from '@/app/api/user/matches/route'

const MATCH_STATUS_LABELS: Record<string, string> = {
  user_liked: 'Ожидает ответа',
  expert_liked: 'Откликнулся!',
  matched: 'Взаимный матч 🎉',
  paid: 'Оплачено',
}

const MATCH_STATUS_COLORS: Record<string, string> = {
  user_liked: 'text-text-secondary bg-white/5',
  expert_liked: 'text-yellow-400 bg-yellow-400/10',
  matched: 'text-green-400 bg-green-400/10',
  paid: 'text-purple-400 bg-purple-400/10',
}

function WaitingContent({ requestId }: { requestId: string }) {
  const router = useRouter()
  const initDataRaw = useRawInitData()

  const [matches, setMatches] = useState<MatchWithExpert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatches = useCallback(() => {
    if (!initDataRaw) return
    setIsLoading(true)
    setError(null)
    fetch(`/api/user/matches?request_id=${requestId}`, {
      headers: { Authorization: `tma ${initDataRaw}` },
    })
      .then((r) => r.json())
      .then((data: { matches?: MatchWithExpert[]; error?: string }) => {
        if (data.error) throw new Error(data.error)
        setMatches(data.matches ?? [])
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить')
      })
      .finally(() => setIsLoading(false))
  }, [initDataRaw, requestId])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  const mutualMatches = matches.filter((m) => m.match_status === 'matched' || m.match_status === 'paid')
  const respondedMatches = matches.filter((m) => m.match_status === 'expert_liked')
  const pendingMatches = matches.filter((m) => m.match_status === 'user_liked')

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
          <h1 className="text-text font-semibold text-lg">Мои лайки</h1>
          <p className="text-text-secondary text-xs">статусы экспертов</p>
        </div>
        <button
          onClick={() => router.push(`/user/requests/${requestId}/experts`)}
          className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-text-secondary"
        >
          + Найти ещё
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-bg-secondary animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-red-400 text-sm text-center">{error}</p>
          <button onClick={fetchMatches} className="text-accent-from text-sm underline">Повторить</button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && matches.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
          <div className="text-5xl mb-4">💜</div>
          <p className="text-text font-medium mb-2">Пока нет лайков</p>
          <p className="text-text-secondary text-sm leading-relaxed max-w-[240px] mb-6">
            Найдите подходящих экспертов и лайкните их
          </p>
          <button
            onClick={() => router.push(`/user/requests/${requestId}/experts`)}
            className="py-3 px-6 rounded-[1000px] font-semibold text-white text-sm"
            style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }}
          >
            Найти экспертов
          </button>
        </div>
      )}

      {/* Sections */}
      {!isLoading && !error && matches.length > 0 && (
        <div className="flex flex-col gap-6">
          {/* Матчи */}
          {mutualMatches.length > 0 && (
            <section>
              <h2 className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-3">
                Взаимные матчи · {mutualMatches.length}
              </h2>
              <div className="flex flex-col gap-3">
                {mutualMatches.map((m) => (
                  <MatchCard key={m.match_id} match={m} requestId={requestId} router={router} />
                ))}
              </div>
            </section>
          )}

          {/* Откликнулись */}
          {respondedMatches.length > 0 && (
            <section>
              <h2 className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-3">
                Откликнулись · {respondedMatches.length}
              </h2>
              <div className="flex flex-col gap-3">
                {respondedMatches.map((m) => (
                  <MatchCard key={m.match_id} match={m} requestId={requestId} router={router} />
                ))}
              </div>
            </section>
          )}

          {/* Ожидают */}
          {pendingMatches.length > 0 && (
            <section>
              <h2 className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-3">
                Ожидают ответа · {pendingMatches.length}
              </h2>
              <div className="flex flex-col gap-3">
                {pendingMatches.map((m) => (
                  <MatchCard key={m.match_id} match={m} requestId={requestId} router={router} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function MatchCard({
  match,
  requestId,
  router,
}: {
  match: MatchWithExpert
  requestId: string
  router: ReturnType<typeof useRouter>
}) {
  const fullName = [match.expert.first_name, match.expert.last_name].filter(Boolean).join(' ')
  const statusColor = MATCH_STATUS_COLORS[match.match_status]
  const statusLabel = MATCH_STATUS_LABELS[match.match_status]

  return (
    <button
      onClick={() => router.push(`/user/experts/${match.expert_id}?request_id=${requestId}`)}
      className="w-full text-left bg-bg-secondary border border-border rounded-2xl p-4 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-3">
        {match.expert.photo_url ? (
          <Image
            src={match.expert.photo_url}
            alt={fullName}
            width={44}
            height={44}
            className="rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-base font-semibold text-text shrink-0">
            {match.expert.first_name.charAt(0)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-text font-semibold text-sm">{fullName}</p>
          {match.expert.categories.length > 0 && (
            <p className="text-muted text-xs mt-0.5 truncate">
              {match.expert.categories.map((c) => c.name).join(' · ')}
            </p>
          )}
        </div>

        <span className={cn('shrink-0 text-xs font-medium px-2.5 py-1 rounded-full', statusColor)}>
          {statusLabel}
        </span>
      </div>

      {match.expert.consultation_price && (
        <p className="text-text-secondary text-xs mt-2 pl-14">{match.expert.consultation_price} ₽</p>
      )}
    </button>
  )
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function WaitingPage({ params }: Props) {
  const { id } = await params

  return (
    <RouteGuard allowedRole="user">
      <WaitingContent requestId={id} />
    </RouteGuard>
  )
}
