'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useRawInitData } from '@tma.js/sdk-react'
import { useAuthStore } from '@/lib/store/auth'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

interface Props {
  categories: Category[]
}

interface FormData {
  first_name: string
  last_name: string
  description: string
  category_ids: string[]
  consultation_price: string
  telegram_username: string
}

const TOTAL_STEPS = 4

const STEP_TITLES = [
  { title: 'О себе', sub: 'Как вас зовут?' },
  { title: 'Ваш опыт', sub: 'Расскажите о себе' },
  { title: 'Специализация', sub: 'Выберите категории' },
  { title: 'Стоимость', sub: 'Укажите цену консультации' },
]

export function ProfileSetupForm({ categories }: Props) {
  const router = useRouter()
  const initDataRaw = useRawInitData()
  const { user } = useAuthStore()

  const [step, setStep] = useState(1)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormData>({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    description: '',
    category_ids: [],
    consultation_price: '',
    telegram_username: user?.username ? user.username.replace(/^@/, '') : '',
  })

  const parentCategories = categories.filter((c) => c.parent_id === null)
  const childrenByParent = categories.reduce<Record<string, Category[]>>((acc, cat) => {
    if (cat.parent_id) {
      if (!acc[cat.parent_id]) acc[cat.parent_id] = []
      acc[cat.parent_id].push(cat)
    }
    return acc
  }, {})

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
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

  function canProceed(): boolean {
    if (step === 1) return form.first_name.trim().length >= 2
    if (step === 2) return form.description.trim().length >= 20
    if (step === 3) return form.category_ids.length >= 1
    if (step === 4) {
      return (
        Number(form.consultation_price) > 0 &&
        form.telegram_username.trim().length >= 2
      )
    }
    return false
  }

  async function handleSubmit() {
    if (!initDataRaw) return
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

      router.replace('/expert/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Что-то пошло не так')
      setIsPending(false)
    }
  }

  const currentStepMeta = STEP_TITLES[step - 1]

  return (
    <main
      className="flex flex-col px-5 pt-10 pb-10"
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

      <div className="relative flex flex-col flex-1 max-w-md mx-auto w-full">
        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full transition-all duration-500"
              style={{
                background:
                  i < step
                    ? 'linear-gradient(90deg, #4400ff, #3901d2)'
                    : 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>

        {/* Step header */}
        <div className="mb-7">
          <p className="text-xs text-muted font-medium uppercase tracking-wider mb-1">
            Шаг {step} из {TOTAL_STEPS}
          </p>
          <h1 className="text-2xl font-semibold text-white leading-tight">
            {currentStepMeta.title}
          </h1>
          <p className="text-text-secondary text-sm mt-1">{currentStepMeta.sub}</p>
        </div>

        {/* Step content */}
        <div className="flex-1">
          {step === 1 && (
            <Step1About form={form} photoUrl={user?.photo_url ?? null} update={update} />
          )}
          {step === 2 && <Step2Experience form={form} update={update} />}
          {step === 3 && (
            <Step3Categories
              form={form}
              parentCategories={parentCategories}
              childrenByParent={childrenByParent}
              toggleCategory={toggleCategory}
            />
          )}
          {step === 4 && <Step4Price form={form} update={update} categories={categories} />}
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4 mt-4">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-opacity duration-200 active:opacity-60"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <BackArrowIcon />
            </button>
          )}
          <button
            onClick={step < TOTAL_STEPS ? () => setStep((s) => s + 1) : handleSubmit}
            disabled={!canProceed() || isPending}
            className="flex-1 h-14 rounded-2xl font-semibold text-base text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{
              background:
                canProceed() && !isPending
                  ? 'linear-gradient(135deg, #4400ff 0%, #3901d2 100%)'
                  : 'rgba(255,255,255,0.08)',
            }}
          >
            {isPending ? 'Сохраняем...' : step < TOTAL_STEPS ? 'Далее' : 'Завершить настройку'}
          </button>
        </div>
      </div>
    </main>
  )
}

// ── Step 1: About ────────────────────────────────────────────

interface Step1Props {
  form: FormData
  photoUrl: string | null
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void
}

function Step1About({ form, photoUrl, update }: Step1Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-center mb-2">
        <div
          className="relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(68,0,255,0.4)' }}
        >
          {photoUrl ? (
            <Image src={photoUrl} alt="Фото профиля" fill className="object-cover" unoptimized />
          ) : (
            <UserPlaceholderIcon />
          )}
        </div>
      </div>
      <p className="text-xs text-muted text-center -mt-3">Фото из Telegram</p>

      <div className="flex flex-col gap-3">
        <InputField
          label="Имя"
          value={form.first_name}
          onChange={(v) => update('first_name', v)}
          placeholder="Ваше имя"
          autoFocus
        />
        <InputField
          label="Фамилия"
          value={form.last_name}
          onChange={(v) => update('last_name', v)}
          placeholder="Необязательно"
        />
      </div>
    </div>
  )
}

// ── Step 2: Experience ───────────────────────────────────────

interface Step2Props {
  form: FormData
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void
}

function Step2Experience({ form, update }: Step2Props) {
  const maxLen = 500
  const len = form.description.length

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value.slice(0, maxLen))}
          placeholder="Расскажите о своём опыте, достижениях, с кем работали..."
          rows={7}
          autoFocus
          className="w-full rounded-2xl px-4 py-4 text-sm text-white placeholder-muted resize-none outline-none transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1.5px solid',
            borderColor: len >= 20 ? 'rgba(68,0,255,0.5)' : 'rgba(255,255,255,0.08)',
          }}
        />
        <span
          className={cn(
            'absolute bottom-3 right-4 text-xs transition-colors duration-200',
            len < 20 ? 'text-muted' : 'text-text-secondary'
          )}
        >
          {len}/{maxLen}
        </span>
      </div>
      {len > 0 && len < 20 && (
        <p className="text-xs text-muted">Минимум 20 символов ({20 - len} ещё)</p>
      )}
    </div>
  )
}

// ── Step 3: Categories ───────────────────────────────────────

interface Step3Props {
  form: FormData
  parentCategories: Category[]
  childrenByParent: Record<string, Category[]>
  toggleCategory: (id: string) => void
}

function Step3Categories({ form, parentCategories, childrenByParent, toggleCategory }: Step3Props) {
  return (
    <div className="flex flex-col gap-6">
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
        <p className="text-xs text-text-secondary">Выбрано: {form.category_ids.length}</p>
      )}
    </div>
  )
}

interface CategoryChipProps {
  label: string
  selected: boolean
  onToggle: () => void
}

function CategoryChip({ label, selected, onToggle }: CategoryChipProps) {
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

// ── Step 4: Price ────────────────────────────────────────────

interface Step4Props {
  form: FormData
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  categories: Category[]
}

function Step4Price({ form, update, categories }: Step4Props) {
  const selectedNames = form.category_ids
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter((n): n is string => Boolean(n))

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="text-xs text-muted font-medium uppercase tracking-wider mb-2 block">
          Стоимость консультации (₽)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm font-medium">
            ₽
          </span>
          <input
            type="number"
            min={0}
            value={form.consultation_price}
            onChange={(e) => update('consultation_price', e.target.value)}
            placeholder="1000"
            autoFocus
            className="w-full pl-8 pr-4 py-4 rounded-2xl text-sm text-white placeholder-muted outline-none transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1.5px solid',
              borderColor:
                Number(form.consultation_price) > 0
                  ? 'rgba(68,0,255,0.5)'
                  : 'rgba(255,255,255,0.08)',
            }}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted font-medium uppercase tracking-wider mb-2 block">
          Telegram username
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
            @
          </span>
          <input
            type="text"
            value={form.telegram_username}
            onChange={(e) => update('telegram_username', e.target.value.replace(/^@/, ''))}
            placeholder="username"
            className="w-full pl-8 pr-4 py-4 rounded-2xl text-sm text-white placeholder-muted outline-none transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1.5px solid',
              borderColor:
                form.telegram_username.trim().length >= 2
                  ? 'rgba(68,0,255,0.5)'
                  : 'rgba(255,255,255,0.08)',
            }}
          />
        </div>
        <p className="text-xs text-muted mt-1.5">
          Будет передан пользователю после оплаты
        </p>
      </div>

      {selectedNames.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">
            Ваши категории
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedNames.map((name) => (
              <span
                key={name}
                className="text-xs text-text-secondary px-2 py-1 rounded-full"
                style={{ background: 'rgba(68,0,255,0.2)' }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shared ───────────────────────────────────────────────────

interface InputFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
}

function InputField({ label, value, onChange, placeholder, autoFocus }: InputFieldProps) {
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
        autoFocus={autoFocus}
        className="w-full px-4 py-4 rounded-2xl text-sm text-white placeholder-muted outline-none transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1.5px solid',
          borderColor:
            value.trim().length > 0 ? 'rgba(68,0,255,0.5)' : 'rgba(255,255,255,0.08)',
        }}
      />
    </div>
  )
}

function BackArrowIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.7)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

function UserPlaceholderIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
