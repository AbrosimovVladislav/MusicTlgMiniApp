'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRawInitData } from '@tma.js/sdk-react'
import { useAuthStore } from '@/lib/store/auth'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

const ROLES: { id: UserRole; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    id: 'user',
    label: 'Слушатель',
    sub: 'Ищу эксперта для консультации',
    icon: <HeadphonesIcon />,
  },
  {
    id: 'expert',
    label: 'Эксперт',
    sub: 'Готов делиться знаниями о музыке',
    icon: <MicIcon />,
  },
]

export default function RolePage() {
  const router = useRouter()
  const initDataRaw = useRawInitData()
  const { user, setUser } = useAuthStore()
  const [selected, setSelected] = useState<UserRole | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleConfirm() {
    if (!selected || !initDataRaw) return
    setIsPending(true)

    try {
      const res = await fetch('/api/auth/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initDataRaw, role: selected }),
      })

      if (!res.ok) throw new Error('Failed')

      const data = (await res.json()) as { user: typeof user }
      if (data.user) setUser(data.user!)

      if (selected === 'user') {
        router.replace('/user/home')
      } else {
        router.replace('/expert/home')
      }
    } catch {
      setIsPending(false)
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col px-5 pt-12 pb-10"
      style={{ minHeight: 'var(--tg-viewport-stable-height, 100svh)' }}
    >
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #4400ff 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-60 h-60 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #3901d2 0%, transparent 70%)' }}
        />
      </div>

      {/* Content */}
      <div className="relative flex flex-col flex-1 max-w-md mx-auto w-full">
        {/* Header */}
        <div className="mb-10">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-6"
            style={{ background: 'linear-gradient(135deg, #4400ff 0%, #3901d2 100%)' }}
          >
            <MusicNoteIcon />
          </div>
          <h1 className="text-2xl font-semibold text-white leading-tight">
            Кто вы в мире музыки?
          </h1>
          <p className="text-text-secondary mt-2 text-sm leading-relaxed">
            Выберите роль — это определит ваш опыт в приложении
          </p>
        </div>

        {/* Role cards */}
        <div className="flex flex-col gap-3 flex-1">
          {ROLES.map((role) => {
            const isActive = selected === role.id
            return (
              <button
                key={role.id}
                onClick={() => setSelected(role.id)}
                className={cn(
                  'relative w-full text-left rounded-2xl p-5 transition-all duration-200 border',
                  'flex items-center gap-4',
                  isActive
                    ? 'border-transparent'
                    : 'bg-bg-secondary border-border'
                )}
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(135deg, rgba(68,0,255,0.25) 0%, rgba(57,1,210,0.15) 100%)',
                        borderColor: '#4400ff',
                        borderWidth: '1.5px',
                        borderStyle: 'solid',
                      }
                    : undefined
                }
              >
                {/* Icon */}
                <div
                  className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200',
                    isActive ? 'opacity-100' : 'opacity-50'
                  )}
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, #4400ff 0%, #3901d2 100%)'
                      : 'rgba(255,255,255,0.06)',
                  }}
                >
                  {role.icon}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      'font-semibold text-base transition-colors duration-200',
                      isActive ? 'text-white' : 'text-text-secondary'
                    )}
                  >
                    {role.label}
                  </div>
                  <div className="text-xs text-muted mt-0.5 leading-relaxed">
                    {role.sub}
                  </div>
                </div>

                {/* Checkmark */}
                <div
                  className={cn(
                    'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                    isActive ? 'border-transparent' : 'border-border'
                  )}
                  style={
                    isActive
                      ? { background: 'linear-gradient(135deg, #4400ff 0%, #3901d2 100%)', borderColor: 'transparent' }
                      : undefined
                  }
                >
                  {isActive && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* CTA */}
        <div className="mt-8">
          <button
            onClick={handleConfirm}
            disabled={!selected || isPending}
            className="w-full h-14 rounded-2xl font-semibold text-base text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: selected
                ? 'linear-gradient(135deg, #4400ff 0%, #3901d2 100%)'
                : 'rgba(255,255,255,0.08)',
            }}
          >
            {isPending ? 'Сохраняем...' : 'Продолжить'}
          </button>
        </div>
      </div>
    </main>
  )
}

function HeadphonesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function MusicNoteIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}
