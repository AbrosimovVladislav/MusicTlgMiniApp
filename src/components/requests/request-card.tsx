'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Request, Category } from '@/types'

type RequestWithCategories = Request & {
  category: Pick<Category, 'id' | 'name'> | null
  subcategory: Pick<Category, 'id' | 'name'> | null
}

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

  return (
    <button
      onClick={() => router.push(`/user/requests/${request.id}`)}
      className="w-full text-left bg-bg-secondary border border-border rounded-2xl p-4 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-text text-sm font-medium leading-snug line-clamp-2 flex-1">
          {request.description}
        </p>
        <span className={cn('shrink-0 text-xs font-medium px-2 py-0.5 rounded-full', statusColor)}>
          {isExpired && request.status === 'published' ? 'Истёк' : statusLabel}
        </span>
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
        <p className="text-xs text-muted mt-2">Бюджет: ${request.budget}</p>
      )}
    </button>
  )
}
