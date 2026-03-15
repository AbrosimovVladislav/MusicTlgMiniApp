'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRawInitData, backButton } from '@tma.js/sdk-react'
import { RouteGuard } from '@/components/shared/route-guard'
import type { PaymentResponse } from '@/app/api/user/payment/route'

type PaymentState = 'idle' | 'loading' | 'success' | 'error'

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

function PaymentContent({ requestId, matchId, price }: { requestId: string; matchId: string; price: number | null }) {
  const router = useRouter()
  const initDataRaw = useRawInitData()

  const [state, setState] = useState<PaymentState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [result, setResult] = useState<PaymentResponse | null>(null)

  // Back Button: show in all states except loading; always cleanup in return
  useEffect(() => {
    if (state === 'loading') {
      try { backButton.hide() } catch { /* SDK may not be initialized */ }
      return () => {
        try { backButton.hide() } catch { /* noop */ }
      }
    }

    try {
      if (!backButton.isMounted) backButton.mount()
      backButton.show()
    } catch { /* noop */ }

    const handleBack = () => router.replace(`/user/requests/${requestId}`)
    try { backButton.onClick(handleBack) } catch { /* noop */ }

    return () => {
      try {
        backButton.offClick(handleBack)
        backButton.hide()
      } catch { /* noop */ }
    }
  }, [state, router, requestId])

  async function handlePay() {
    if (!initDataRaw || state !== 'idle') return

    // Synchronously block re-entry before any async work
    setState('loading')
    setErrorMsg(null)

    // Intentional 1500ms delay — mock payment UX (replace with real gateway post-MVP)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    try {
      const res = await fetch('/api/user/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${initDataRaw}`,
        },
        body: JSON.stringify({ match_id: matchId }),
      })

      const data = await res.json() as PaymentResponse | { error: string }

      if (!res.ok || 'error' in data) {
        throw new Error('error' in data ? data.error : 'Ошибка оплаты')
      }

      setResult(data as PaymentResponse)
      setState('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Ошибка оплаты')
      setState('error')
    }
  }

  if (state === 'success' && result) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen bg-bg px-5 pb-8 pt-12 text-center"
        style={{ minHeight: 'var(--tg-viewport-stable-height, 100vh)' }}
      >
        {/* Checkmark */}
        <div className="w-20 h-20 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-green-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <h1 className="text-text font-bold text-2xl mb-2">Оплата прошла!</h1>
        <p className="text-text-secondary text-sm mb-8">
          Теперь вы можете связаться с экспертом напрямую
        </p>

        {/* Expert contact block */}
        <div className="w-full bg-bg-secondary border border-border rounded-2xl p-5 mb-6 text-left">
          <p className="text-text-secondary text-xs mb-1">Ваш эксперт</p>
          <p className="text-text font-semibold text-lg mb-1">{result.expert_name}</p>
          {result.telegram_username ? (
            <p className="text-accent-from font-medium">@{result.telegram_username}</p>
          ) : (
            <p className="text-text-secondary text-sm">Контакт будет передан через бота</p>
          )}
        </div>

        <div className="w-full flex flex-col gap-3">
          {result.telegram_username && (
            <button
              onClick={() => openTelegramLink(result.telegram_username!)}
              className="w-full py-4 rounded-[1000px] font-semibold text-white text-base"
              style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }}
            >
              Написать в Telegram
            </button>
          )}
          <button
            onClick={() => router.replace(`/user/requests/${requestId}`)}
            className="w-full py-4 rounded-[1000px] font-semibold text-text text-base border border-border"
          >
            Вернуться к запросу
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col min-h-screen bg-bg px-5 pt-6 pb-8"
      style={{ minHeight: 'var(--tg-viewport-stable-height, 100vh)' }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-text font-semibold text-xl">Оплата консультации</h1>
        <p className="text-text-secondary text-sm mt-1">Безопасная оплата</p>
      </div>

      <div className={state === 'loading' ? 'opacity-50 pointer-events-none' : ''}>
        {/* Amount */}
        <p className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-3">
          К оплате
        </p>
        <div className="bg-bg-secondary border border-border rounded-2xl p-5 mb-6 text-center">
          <p className="text-text font-bold text-4xl">
            {price != null ? `${price.toLocaleString('ru-RU')} ₽` : 'По договорённости'}
          </p>
          <p className="text-text-secondary text-sm mt-1">Консультация эксперта</p>
        </div>

        {/* Card section */}
        <p className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-3">
          Способ оплаты
        </p>
        <div className="bg-bg-secondary border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-accent-from flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-accent-from" />
            </div>
            <div className="flex-1">
              <p className="text-text font-medium text-sm">VISA •••• 4242</p>
              <p className="text-text-secondary text-xs">Основная карта</p>
            </div>
            <span className="text-xs text-muted bg-white/5 px-2 py-0.5 rounded-full">VISA</span>
          </div>
        </div>
        <button
          disabled
          className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-border text-text-secondary text-sm opacity-40"
        >
          <span className="text-lg leading-none">+</span>
          Добавить карту
        </button>
      </div>

      {/* Error banner */}
      {state === 'error' && errorMsg && (
        <div className="mt-4 p-3 rounded-xl bg-red-400/10 border border-red-400/20">
          <p className="text-red-400 text-sm text-center">{errorMsg}</p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-auto pt-6">
        {state === 'error' ? (
          <button
            onClick={() => { setState('idle'); setErrorMsg(null) }}
            className="w-full py-4 rounded-[1000px] font-semibold text-white text-base"
            style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }}
          >
            Попробовать снова
          </button>
        ) : (
          <button
            onClick={handlePay}
            disabled={state === 'loading'}
            className="w-full py-4 rounded-[1000px] font-semibold text-white text-base flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }}
          >
            {state === 'loading' ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Обработка...
              </>
            ) : (
              {price != null ? `Оплатить ${price.toLocaleString('ru-RU')} ₽` : 'Оплатить'}
            )}
          </button>
        )}
        <p className="text-center text-xs text-muted mt-3">
          Нажимая «Оплатить», вы соглашаетесь с условиями сервиса
        </p>
      </div>
    </div>
  )
}

interface Props {
  params: Promise<{ id: string; matchId: string }>
  searchParams: Promise<{ price?: string }>
}

export default async function PaymentPage({ params, searchParams }: Props) {
  const { id, matchId } = await params
  const { price: priceParam } = await searchParams
  const price = priceParam ? Number(priceParam) : null
  return (
    <RouteGuard allowedRole="user">
      <PaymentContent requestId={id} matchId={matchId} price={price} />
    </RouteGuard>
  )
}
