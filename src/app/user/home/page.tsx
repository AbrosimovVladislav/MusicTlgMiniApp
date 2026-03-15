'use client'

import { useRouter } from 'next/navigation'
import { RouteGuard } from '@/components/shared/route-guard'
import { RequestCard } from '@/components/requests/request-card'
import { useRequests } from '@/hooks/use-requests'
import { useAuthStore } from '@/lib/store/auth'

function UserHomeContent() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { requests, isLoading, error } = useRequests()

  const activeRequests = requests.filter((r) => r.status !== 'completed')
  const completedRequests = requests.filter((r) => r.status === 'completed')

  return (
    <main
      className="flex flex-col min-h-screen bg-bg px-5 pt-8 pb-24"
      style={{ minHeight: 'var(--tg-viewport-stable-height, 100vh)' }}
    >
      {/* Header */}
      <div className="mb-8">
        <p className="text-text-secondary text-sm mb-1">Привет,</p>
        <h1 className="text-text text-2xl font-semibold leading-tight">
          {user?.first_name ?? 'Слушатель'} 👋
        </h1>
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push('/user/requests/new')}
        className="w-full py-4 rounded-[1000px] font-semibold text-white text-base mb-8"
        style={{
          background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)',
          border: '1px solid rgba(255,255,255,0.02)',
        }}
      >
        + Создать запрос
      </button>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-bg-secondary animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      {/* Empty state */}
      {!isLoading && !error && requests.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <div className="text-5xl mb-4">🎵</div>
          <p className="text-text font-medium mb-2">Нет активных запросов</p>
          <p className="text-text-secondary text-sm leading-relaxed max-w-[260px]">
            Создай первый запрос и найди эксперта под свою задачу
          </p>
        </div>
      )}

      {/* Active requests */}
      {!isLoading && !error && activeRequests.length > 0 && (
        <section className="mb-6">
          <h2 className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-3">
            Активные запросы
          </h2>
          <div className="flex flex-col gap-3">
            {activeRequests.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        </section>
      )}

      {/* Completed requests */}
      {!isLoading && !error && completedRequests.length > 0 && (
        <section>
          <h2 className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-3">
            Завершённые
          </h2>
          <div className="flex flex-col gap-3">
            {completedRequests.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export default function UserHomePage() {
  return (
    <RouteGuard allowedRole="user">
      <UserHomeContent />
    </RouteGuard>
  )
}
