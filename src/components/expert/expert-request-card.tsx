'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface ExpertRequestItem {
  id: string
  description: string
  status: string
  created_at: string
  is_active: boolean
  category: { id: string; name: string } | null
  subcategory: { id: string; name: string } | null
  user: { first_name: string; photo_url: string | null } | null
  match_status: 'user_liked' | 'expert_liked' | 'matched' | 'paid' | null
  match_id: string | null
}

const MATCH_BADGE: Record<string, { label: string; className: string }> = {
  user_liked: { label: '❤️ Лайкнул', className: 'text-pink-400 bg-pink-400/10' },
  expert_liked: { label: 'Откликнулся', className: 'text-blue-400 bg-blue-400/10' },
  matched: { label: '🎯 Матч!', className: 'text-yellow-400 bg-yellow-400/10' },
  paid: { label: '✅ Оплачен', className: 'text-green-400 bg-green-400/10' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Сегодня'
  if (days === 1) return 'Вчера'
  if (days < 7) return `${days} дн. назад`
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

interface Props {
  request: ExpertRequestItem
  variant?: 'liked' | 'category'
}

export function ExpertRequestCard({ request, variant = 'category' }: Props) {
  const router = useRouter()
  const badge = request.match_status ? MATCH_BADGE[request.match_status] : null

  return (
    <button
      onClick={() => router.push(`/expert/requests/${request.id}`)}
      className="w-full text-left rounded-2xl p-4 active:scale-[0.98] transition-transform"
      style={{
        background: variant === 'liked'
          ? 'linear-gradient(135deg, rgba(68,0,255,0.15) 0%, rgba(57,1,210,0.08) 100%)'
          : 'rgba(255,255,255,0.04)',
        border: '1.5px solid',
        borderColor: variant === 'liked' ? 'rgba(68,0,255,0.3)' : 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-white text-sm font-medium leading-snug line-clamp-2 flex-1">
          {request.description}
        </p>
        {badge && (
          <span className={cn('shrink-0 text-xs font-medium px-2 py-0.5 rounded-full', badge.className)}>
            {badge.label}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {request.category && (
          <span className="text-xs text-text-secondary bg-white/5 px-2 py-0.5 rounded-full">
            {request.category.name}
          </span>
        )}
        {request.subcategory && (
          <span className="text-xs text-muted">· {request.subcategory.name}</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted">
          {request.user ? request.user.first_name : 'Аноним'}
        </span>
        <span className="text-xs text-muted">{timeAgo(request.created_at)}</span>
      </div>
    </button>
  )
}
