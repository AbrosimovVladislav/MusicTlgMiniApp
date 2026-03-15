'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useRawInitData, backButton } from '@tma.js/sdk-react'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

interface Props {
  categories: Category[]
}

interface EditFormData {
  first_name: string
  last_name: string
  description: string
  category_ids: string[]
  consultation_price: string
  telegram_username: string
}

interface ProfileResponse {
  profile: {
    description: string
    consultation_price: number
    telegram_username: string
    display_first_name: string
    display_last_name: string | null
    user: {
      first_name: string
      last_name: string | null
      photo_url: string | null
      username: string | null
    }
    categories: Array<{ id: string; name: string; parent_id: string | null }>
  }
}

export function ExpertProfileEditForm({ categories }: Props) {
  const router = useRouter()
  const initDataRaw = useRawInitData()
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<EditFormData>({
    first_name: '',
    last_name: '',
    description: '',
    category_ids: [],
    consultation_price: '',
    telegram_username: '',
  })

  const parentCategories = categories.filter((c) => c.parent_id === null)
  const childrenByParent = categories.reduce<Record<string, Category[]>>((acc, cat) => {
    if (cat.parent_id) {
      if (!acc[cat.parent_id]) acc[cat.parent_id] = []
      acc[cat.parent_id].push(cat)
    }
    return acc
  }, {})

  const loadProfile = useCallback(async () => {
    if (!initDataRaw) {
      console.error('[EditForm] loadProfile: no initDataRaw')
      return
    }
    setLoadState('loading')
    setError(null)
    try {
      console.log('[EditForm] loadProfile: fetching profile')
      const res = await fetch('/api/expert/profile', {
        headers: { Authorization: `tma ${initDataRaw}` },
      })
      console.log('[EditForm] loadProfile: status', res.status)
      if (res.status === 404) {
        router.replace('/expert/profile/setup')
        return
      }
      if (!res.ok) throw new Error(`Не удалось загрузить профиль (${res.status})`)
      const data = (await res.json()) as ProfileResponse
      const { profile } = data
      setPhotoUrl(profile.user.photo_url)
      setForm({
        first_name: profile.display_first_name ?? profile.user.first_name,
        last_name: profile.display_last_name ?? profile.user.last_name ?? '',
        description: profile.description,
        category_ids: profile.categories.map((c) => c.id),
        consultation_price: String(profile.consultation_price),
        telegram_username: profile.telegram_username,
      })
      setLoadState('ready')
      console.log('[EditForm] loadProfile: ready')
    } catch (err) {
      console.error('[EditForm] loadProfile error:', err)
      setLoadState('error')
    }
  }, [initDataRaw, router])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    const handler = () => router.back()
    try {
      if (!backButton.isMounted) backButton.mount()
      backButton.show()
      backButton.onClick(handler)
    } catch (err) {
      console.error('[EditForm] backButton setup error:', err)
    }
    return () => {
      try {
        backButton.offClick(handler)
        backButton.hide()
      } catch { /* ignore */ }
    }
  }, [router])

  function update<K extends keyof EditFormData>(key: K, value: EditFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleCategory(id: string) {
    setForm((prev) => ({
      ...prev,
      category_ids: prev.category_ids.includes(id)
        ? prev.category_ids.filter((c) => c !== id)
        : [...prev.category_ids, id],
    }))
  }

  function isValid(): boolean {
    return (
      form.first_name.trim().length > 0 &&
      form.description.trim().length >= 20 &&
      form.category_ids.length >= 1 &&
      Number(form.consultation_price) > 0 &&
      form.telegram_username.trim().length >= 2
    )
  }

  async function handleSubmit() {
    if (!initDataRaw || !isValid()) return
    setIsPending(true)
    setError(null)
    try {
      const res = await fetch('/api/expert/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initDataRaw,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          description: form.description.trim(),
          category_ids: form.category_ids,
          consultation_price: Number(form.consultation_price),
          telegram_username: form.telegram_username.trim(),
        }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error: string }
        throw new Error(data.error ?? 'Не удалось сохранить профиль')
      }
      try { backButton.hide() } catch { /* SDK may not be initialized */ }
      router.back()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Что-то пошло не так')
      setIsPending(false)
    }
  }

  return (
    <main
      className="flex flex-col px-5 pt-8 pb-32"
      style={{ minHeight: 'var(--tg-viewport-stable-height, 100svh)' }}
    >
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #4400ff 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #3901d2 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative flex flex-col gap-6 max-w-md mx-auto w-full">
        {/* Заголовок */}
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white active:opacity-70 shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <p className="text-xs text-muted font-medium uppercase tracking-wider mb-0.5">
              Редактирование
            </p>
            <h1 className="text-xl font-semibold text-white leading-tight">Профиль эксперта</h1>
          </div>
        </div>

        {loadState === 'loading' && <Skeleton />}

        {loadState === 'error' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-text-secondary text-sm text-center">
              Не удалось загрузить профиль
            </p>
            <button
              onClick={loadProfile}
              className="px-6 py-3 rounded-2xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #4400ff 0%, #3901d2 100%)' }}
            >
              Повторить
            </button>
          </div>
        )}

        {loadState === 'ready' && (
          <>
            {/* Фото + имя */}
            <Section>
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #4400ff, #3901d2)',
                    border: '2px solid rgba(68,0,255,0.4)',
                  }}
                >
                  {photoUrl ? (
                    <Image src={photoUrl} alt="Фото" fill className="object-cover" unoptimized />
                  ) : (
                    <UserIcon />
                  )}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Фото из Telegram</p>
                  <p className="text-muted text-xs mt-0.5">Изменить можно в настройках Telegram</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <InputField
                  label="Имя"
                  value={form.first_name}
                  onChange={(v) => update('first_name', v)}
                  placeholder="Ваше имя"
                />
                <InputField
                  label="Фамилия"
                  value={form.last_name}
                  onChange={(v) => update('last_name', v)}
                  placeholder="Необязательно"
                />
              </div>
            </Section>

            {/* Описание */}
            <Section label="Опыт">
              <div className="relative">
                <textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value.slice(0, 500))}
                  placeholder="Расскажите о своём опыте, достижениях, с кем работали..."
                  rows={6}
                  className="w-full rounded-2xl px-4 py-4 text-white placeholder-muted resize-none outline-none transition-all duration-200"
                  style={{
                    fontSize: '16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1.5px solid',
                    borderColor:
                      form.description.trim().length >= 20
                        ? 'rgba(68,0,255,0.5)'
                        : 'rgba(255,255,255,0.08)',
                  }}
                />
                <span
                  className={cn(
                    'absolute bottom-3 right-4 text-xs transition-colors duration-200',
                    form.description.length < 20 ? 'text-muted' : 'text-text-secondary'
                  )}
                >
                  {form.description.length}/500
                </span>
              </div>
              {form.description.length > 0 && form.description.trim().length < 20 && (
                <p className="text-xs text-muted mt-1.5">
                  Минимум 20 символов ({20 - form.description.trim().length} ещё)
                </p>
              )}
            </Section>

            {/* Категории */}
            <Section label="Специализация">
              <div className="flex flex-col gap-5">
                {parentCategories.map((parent) => {
                  const children = childrenByParent[parent.id] ?? []
                  if (children.length === 0) {
                    return (
                      <CategoryChip
                        key={parent.id}
                        label={parent.name}
                        selected={form.category_ids.includes(parent.id)}
                        onToggle={() => toggleCategory(parent.id)}
                      />
                    )
                  }
                  return (
                    <div key={parent.id}>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                        {parent.name}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {children.map((child) => (
                          <CategoryChip
                            key={child.id}
                            label={child.name}
                            selected={form.category_ids.includes(child.id)}
                            onToggle={() => toggleCategory(child.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
                {form.category_ids.length > 0 && (
                  <p className="text-xs text-text-secondary">
                    Выбрано: {form.category_ids.length}
                  </p>
                )}
              </div>
            </Section>

            {/* Цена */}
            <Section label="Стоимость консультации (₽)">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm font-medium">
                  ₽
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.consultation_price}
                  onChange={(e) => update('consultation_price', e.target.value)}
                  placeholder="1000"
                  className="w-full pl-8 pr-4 py-4 rounded-2xl text-white placeholder-muted outline-none transition-all duration-200"
                  style={{
                    fontSize: '16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1.5px solid',
                    borderColor:
                      Number(form.consultation_price) > 0
                        ? 'rgba(68,0,255,0.5)'
                        : 'rgba(255,255,255,0.08)',
                  }}
                />
              </div>
            </Section>

            {/* Telegram username */}
            <Section label="Telegram username">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
                  @
                </span>
                <input
                  type="text"
                  value={form.telegram_username}
                  onChange={(e) => update('telegram_username', e.target.value.replace(/^@/, ''))}
                  placeholder="username"
                  className="w-full pl-8 pr-4 py-4 rounded-2xl text-white placeholder-muted outline-none transition-all duration-200"
                  style={{
                    fontSize: '16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1.5px solid',
                    borderColor:
                      form.telegram_username.trim().length >= 2
                        ? 'rgba(68,0,255,0.5)'
                        : 'rgba(255,255,255,0.08)',
                  }}
                />
              </div>
              <p className="text-xs text-muted mt-1.5">Будет передан пользователю после оплаты</p>
            </Section>
          </>
        )}
      </div>

      {/* Sticky save button */}
      {loadState === 'ready' && (
        <div
          className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4"
          style={{ background: 'linear-gradient(to top, var(--color-bg) 60%, transparent)' }}
        >
          <div className="max-w-md mx-auto">
            {error && (
              <p className="text-red-400 text-sm text-center mb-3">{error}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!isValid() || isPending}
              className="w-full h-14 rounded-2xl font-semibold text-base text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{
                background:
                  isValid() && !isPending
                    ? 'linear-gradient(135deg, #4400ff 0%, #3901d2 100%)'
                    : 'rgba(255,255,255,0.08)',
              }}
            >
              {isPending ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function Section({
  label,
  children,
}: {
  label?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {label && (
        <p className="text-xs text-muted font-medium uppercase tracking-wider mb-3">{label}</p>
      )}
      {children}
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs text-muted font-medium uppercase tracking-wider mb-2 block">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-4 rounded-2xl text-white placeholder-muted outline-none transition-all duration-200"
        style={{
          fontSize: '16px',
          background: 'rgba(255,255,255,0.05)',
          border: '1.5px solid',
          borderColor: value.trim().length > 0 ? 'rgba(68,0,255,0.5)' : 'rgba(255,255,255,0.08)',
        }}
      />
    </div>
  )
}

function CategoryChip({
  label,
  selected,
  onToggle,
}: {
  label: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-95',
        selected ? 'text-white' : 'text-text-secondary'
      )}
      style={{
        background: selected
          ? 'linear-gradient(135deg, #4400ff 0%, #3901d2 100%)'
          : 'rgba(255,255,255,0.06)',
        border: '1.5px solid',
        borderColor: selected ? 'transparent' : 'rgba(255,255,255,0.08)',
      }}
    >
      {label}
    </button>
  )
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {[120, 160, 200, 80].map((h, i) => (
        <div
          key={i}
          className="rounded-2xl"
          style={{
            height: h,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        />
      ))}
    </div>
  )
}

function UserIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.5)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
