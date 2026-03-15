'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useRawInitData } from '@tma.js/sdk-react'
import { RouteGuard } from '@/components/shared/route-guard'
import { BottomNav } from '@/components/shared/bottom-nav'
import { useAuthStore } from '@/lib/store/auth'
import { cn } from '@/lib/utils'

function ProfileContent() {
  const router = useRouter()
  const initDataRaw = useRawInitData()
  const { user, currentMode, setCurrentMode, setUser } = useAuthStore()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  const role = user.role
  const isBoth = role === 'both'
  const isUserOnly = role === 'user'
  const isExpertOnly = role === 'expert'

  async function upgradeRole(newRole: 'both') {
    if (!initDataRaw) return
    setIsUpdating(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initDataRaw, role: newRole }),
      })
      if (!res.ok) throw new Error('Ошибка обновления роли')
      const data = await res.json() as { user: typeof user }
      if (data.user) setUser(data.user)
    } catch {
      setError('Не удалось обновить роль. Попробуйте снова.')
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleAddExpert() {
    // Если профиль эксперта уже есть — просто обновляем роль
    // Если нет — идём на setup (роль обновится после сохранения профиля)
    if (!initDataRaw) return
    const profileRes = await fetch('/api/expert/profile', {
      headers: { Authorization: `tma ${initDataRaw}` },
    })
    if (profileRes.ok) {
      await upgradeRole('both')
      setCurrentMode('expert')
    } else {
      // Нет профиля — отправляем на setup
      // После setup флоу сам обновит роль на 'both'
      router.push('/expert/profile/setup?upgrade=true')
    }
  }

  async function handleAddUser() {
    await upgradeRole('both')
    setCurrentMode('user')
  }

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ')

  return (
    <main
      className="flex flex-col px-5 pt-8 pb-28"
      style={{ minHeight: 'var(--tg-viewport-stable-height, 100svh)' }}
    >
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #4400ff 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative flex flex-col gap-6">
        {/* Шапка профиля */}
        <div className="flex items-center gap-4">
          <div
            className="relative w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4400ff, #3901d2)' }}
          >
            {user.photo_url ? (
              <Image src={user.photo_url} alt="Фото" fill className="object-cover" unoptimized />
            ) : (
              <span className="text-white text-xl font-bold">
                {user.first_name?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-white text-xl font-semibold">{displayName}</h1>
            {user.username && (
              <p className="text-muted text-sm">@{user.username}</p>
            )}
            <p className="text-text-secondary text-xs mt-0.5">
              {isBoth ? '👤 Слушатель + 🎤 Эксперт' : isExpertOnly ? '🎤 Эксперт' : '👤 Слушатель'}
            </p>
          </div>
        </div>

        {/* Переключатель режима — только для role === 'both' */}
        {isBoth && (
          <div
            className="rounded-2xl p-1 flex"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <button
              onClick={() => setCurrentMode('user')}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
                currentMode === 'user' ? 'text-white' : 'text-muted'
              )}
              style={
                currentMode === 'user'
                  ? { background: 'linear-gradient(135deg, #4400ff 0%, #3901d2 100%)' }
                  : undefined
              }
            >
              👤 Слушатель
            </button>
            <button
              onClick={() => setCurrentMode('expert')}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
                currentMode === 'expert' ? 'text-white' : 'text-muted'
              )}
              style={
                currentMode === 'expert'
                  ? { background: 'linear-gradient(135deg, #4400ff 0%, #3901d2 100%)' }
                  : undefined
              }
            >
              🎤 Эксперт
            </button>
          </div>
        )}

        {/* Ошибка */}
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {/* Действия */}
        <div className="flex flex-col gap-3">
          {/* Редактировать профиль эксперта */}
          {(isExpertOnly || isBoth) && (
            <ActionCard
              icon="✏️"
              title="Профиль эксперта"
              subtitle="Редактировать описание, категории, цену"
              onClick={() => router.push('/expert/profile/edit')}
            />
          )}

          {/* Добавить режим эксперта */}
          {isUserOnly && (
            <button
              onClick={handleAddExpert}
              disabled={isUpdating}
              className="w-full rounded-2xl p-4 text-left transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, rgba(68,0,255,0.2) 0%, rgba(57,1,210,0.1) 100%)',
                border: '1.5px solid rgba(68,0,255,0.4)',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎤</span>
                <div>
                  <p className="text-white text-sm font-semibold">Стать экспертом</p>
                  <p className="text-text-secondary text-xs mt-0.5">
                    Заполните профиль и принимайте запросы
                  </p>
                </div>
                <ChevronIcon className="ml-auto text-text-secondary" />
              </div>
            </button>
          )}

          {/* Добавить режим слушателя */}
          {isExpertOnly && (
            <button
              onClick={handleAddUser}
              disabled={isUpdating}
              className="w-full rounded-2xl p-4 text-left transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1.5px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <div>
                  <p className="text-white text-sm font-semibold">Добавить режим слушателя</p>
                  <p className="text-text-secondary text-xs mt-0.5">
                    Создавайте запросы и находите экспертов
                  </p>
                </div>
                <ChevronIcon className="ml-auto text-text-secondary" />
              </div>
            </button>
          )}
        </div>

        {/* Telegram info */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs text-muted font-medium uppercase tracking-wider mb-3">Аккаунт</p>
          <div className="flex flex-col gap-2">
            <InfoRow label="Telegram ID" value={String(user.telegram_user_id)} />
            {user.username && <InfoRow label="Username" value={`@${user.username}`} />}
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}

function ActionCard({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: string
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl p-4 text-left transition-all duration-200 active:scale-[0.98]"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-white text-sm font-semibold">{title}</p>
          <p className="text-text-secondary text-xs mt-0.5">{subtitle}</p>
        </div>
        <ChevronIcon className="ml-auto text-text-secondary" />
      </div>
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted text-xs">{label}</span>
      <span className="text-text-secondary text-xs font-medium">{value}</span>
    </div>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export default function ProfilePage() {
  return (
    <RouteGuard requireAuth>
      <ProfileContent />
    </RouteGuard>
  )
}
