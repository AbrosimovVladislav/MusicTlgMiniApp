'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { RequestWithCategories } from '@/hooks/use-requests'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  matched: 'Матч',
  in_progress: 'В работе',
  completed: 'Завершён',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-muted bg-white/5',
  published: 'text-green-400 bg-green-400/10',
  matched: 'text-yellow-400 bg-yellow-400/10',
  in_progress: 'text-blue-400 bg-blue-400/10',
  completed: 'text-muted bg-white/5',
}

function openTelegramLink(username: string) {
  const url = `https://t.me/${username}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null
  if (tg?.openLink) {
    tg.openLink(url)
  } else {
    window.open(url, '_blank')
  }
}

interface RequestCardProps {
  request: RequestWithCategories
}

export function RequestCard({ request }: RequestCardProps) {
  const router = useRouter()

  const statusLabel = STATUS_LABELS[request.status] ?? request.status
  const statusColor = STATUS_COLORS[request.status] ?? 'text-muted bg-white/5'

  const isExpired = request.expires_at
    ? new Date(request.expires_at) < new Date()
    : false

  const mm = request.matched_match

  function handlePayClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!mm) return
    router.push(`/user/requests/${request.id}/payment/${mm.match_id}`)
  }

  function handleWriteClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!mm?.telegram_username) return
    openTelegramLink(mm.telegram_username)
  }

  return (
    <div className="w-full bg-bg-secondary border border-border rounded-2xl overflow-hidden">
      {/* Main card area — navigates to request detail */}
      <button
        onClick={() => router.push(`/user/requests/${request.id}`)}
        className="w-full text-left p-4 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-text text-sm font-medium leading-snug line-clamp-2 flex-1">
            {request.description}
          </p>
          <div className="shrink-0 flex items-center gap-1.5">
            {request.response_count > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {request.response_count}
              </span>
            )}
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusColor)}>
              {isExpired && request.status === 'published' ? 'Истёк' : statusLabel}
            </span>
          </div>
        </div>

        {(request.category || request.subcategory) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {request.category && (
              <span className="text-xs text-text-secondary bg-white/5 px-2 py-0.5 rounded-full">
                {request.category.name}
              </span>
            )}
            {request.subcategory && (
              <span className="text-xs text-muted">· {request.subcategory.name}</span>
            )}
          </div>
        )}

        {request.budget && (
          <p className="text-xs text-muted mt-2">Бюджет: {request.budget} ₽</p>
        )}
      </button>

      {/* Matched/paid CTA — separate from card button to allow nested interactivity */}
      {mm && (
        <div className="border-t border-border px-4 py-3">
          {mm.match_status === 'matched' && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                <span className="text-sm text-text-secondary truncate">
                  Матч с <span className="text-text font-medium">{mm.expert_name}</span>
                </span>
              </div>
              <button
                onClick={handlePayClick}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }}
              >
                Оплатить
              </button>
            </div>
          )}

          {mm.match_status === 'paid' && mm.telegram_username && (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-text-secondary">Ваш эксперт</p>
                <p className="text-sm font-medium text-text truncate">{mm.expert_name}</p>
              </div>
              <button
                onClick={handleWriteClick}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }}
              >
                Написать
              </button>
            </div>
          )}

          {mm.match_status === 'paid' && !mm.telegram_username && (
            <p className="text-xs text-text-secondary">Контакт будет передан через бота</p>
          )}
        </div>
      )}
    </div>
  )
}
