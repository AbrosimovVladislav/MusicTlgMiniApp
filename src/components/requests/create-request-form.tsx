'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRawInitData } from '@tma.js/sdk-react'
import { cn } from '@/lib/utils'
import { useCategories } from '@/hooks/use-categories'

interface FormState {
  description: string
  categoryId: string
  subcategoryId: string
  budget: string
}

const TOTAL_STEPS = 4

export function CreateRequestForm() {
  const router = useRouter()
  const initDataRaw = useRawInitData()
  const { topLevel, subCategories, isLoading: categoriesLoading } = useCategories()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>({
    description: '',
    categoryId: '',
    subcategoryId: '',
    budget: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subcats = form.categoryId ? subCategories(form.categoryId) : []

  function canProceed() {
    if (step === 1) return form.description.trim().length >= 10
    if (step === 2) return !!form.categoryId
    return true
  }

  function handleNext() {
    if (step < TOTAL_STEPS) setStep((s) => s + 1)
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1)
    else router.back()
  }

  async function handlePublish() {
    if (!initDataRaw) return
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${initDataRaw}`,
        },
        body: JSON.stringify({
          description: form.description.trim(),
          category_id: form.categoryId || undefined,
          subcategory_id: form.subcategoryId || undefined,
          budget: form.budget ? Number(form.budget) : undefined,
          publish: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        throw new Error(data.error)
      }

      router.replace('/user/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка публикации')
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="flex flex-col bg-bg px-5 pt-6 pb-28"
      style={{ minHeight: 'var(--tg-viewport-stable-height, 100vh)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-text active:opacity-70"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-text font-semibold text-lg leading-none mb-1">
            Новый запрос
          </h1>
          <p className="text-text-secondary text-xs">Шаг {step} из {TOTAL_STEPS}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-8">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              i < step ? 'bg-accent-from' : 'bg-white/10'
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <div>
        {/* Step 1: Description */}
        {step === 1 && (
          <div>
            <h2 className="text-text text-xl font-semibold mb-2">Расскажи о своём запросе</h2>
            <p className="text-text-secondary text-sm mb-6">
              Опиши, с чем тебе нужна помощь. Чем подробнее — тем лучше.
            </p>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Например: Хочу записать свой первый EP, нужна помощь с сведением 3 треков..."
              className="w-full h-40 bg-bg-secondary border border-border rounded-2xl px-4 py-3 text-text placeholder:text-muted resize-none outline-none focus:border-accent-from/50 transition-colors"
              style={{ fontSize: '16px' }}
            />
            <div className="flex justify-end mt-2">
              <span className={cn('text-xs', form.description.length >= 10 ? 'text-muted' : 'text-red-400/70')}>
                {form.description.length} / мин. 10
              </span>
            </div>
          </div>
        )}

        {/* Step 2: Category */}
        {step === 2 && (
          <div>
            <h2 className="text-text text-xl font-semibold mb-2">Категория</h2>
            <p className="text-text-secondary text-sm mb-6">
              Выбери направление, в котором нужна помощь.
            </p>

            {categoriesLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-2xl bg-bg-secondary animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2 mb-6">
                  {topLevel.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setForm((f) => ({ ...f, categoryId: cat.id, subcategoryId: '' }))}
                      className={cn(
                        'w-full text-left px-4 py-3.5 rounded-2xl border text-sm font-medium transition-all',
                        form.categoryId === cat.id
                          ? 'border-accent-from/50 text-text'
                          : 'border-border text-text-secondary bg-bg-secondary'
                      )}
                      style={
                        form.categoryId === cat.id
                          ? { background: 'linear-gradient(162deg, rgba(68,0,255,0.15) 18%, rgba(57,1,210,0.15) 103%)', borderColor: 'rgba(68,0,255,0.5)' }
                          : {}
                      }
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {subcats.length > 0 && (
                  <>
                    <p className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-3">
                      Подкатегория (необязательно)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {subcats.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              subcategoryId: f.subcategoryId === sub.id ? '' : sub.id,
                            }))
                          }
                          className={cn(
                            'px-3 py-1.5 rounded-full text-sm transition-all',
                            form.subcategoryId === sub.id
                              ? 'text-white'
                              : 'bg-white/8 text-text-secondary'
                          )}
                          style={
                            form.subcategoryId === sub.id
                              ? { background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }
                              : {}
                          }
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: Budget (optional) */}
        {step === 3 && (
          <div>
            <h2 className="text-text text-xl font-semibold mb-2">Бюджет</h2>
            <p className="text-text-secondary text-sm mb-6">
              Укажи, сколько готов потратить. Можно оставить пустым.
            </p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
              <input
                type="number"
                inputMode="numeric"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                placeholder="0"
                className="w-full bg-bg-secondary border border-border rounded-2xl pl-8 pr-4 py-3.5 text-text placeholder:text-muted outline-none focus:border-accent-from/50 transition-colors"
                style={{ fontSize: '16px' }}
              />
            </div>
            <p className="text-muted text-xs mt-3">
              Это поможет экспертам понять масштаб задачи. Бюджет можно изменить позже.
            </p>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 4 && (
          <div>
            <h2 className="text-text text-xl font-semibold mb-2">Проверь запрос</h2>
            <p className="text-text-secondary text-sm mb-6">
              Убедись, что всё правильно, и опубликуй.
            </p>

            <div className="bg-bg-secondary border border-border rounded-2xl p-4 flex flex-col gap-4">
              <div>
                <p className="text-muted text-xs font-medium uppercase tracking-wider mb-1.5">Описание</p>
                <p className="text-text text-sm leading-relaxed">{form.description}</p>
              </div>

              {form.categoryId && (
                <div>
                  <p className="text-muted text-xs font-medium uppercase tracking-wider mb-1.5">Категория</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-text bg-white/5 px-3 py-1 rounded-full">
                      {topLevel.find((c) => c.id === form.categoryId)?.name}
                    </span>
                    {form.subcategoryId && (
                      <span className="text-sm text-text-secondary">
                        · {subCategories(form.categoryId).find((c) => c.id === form.subcategoryId)?.name}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {form.budget && (
                <div>
                  <p className="text-muted text-xs font-medium uppercase tracking-wider mb-1.5">Бюджет</p>
                  <p className="text-text text-sm">${form.budget}</p>
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom action — fixed to avoid keyboard overlap */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4"
        style={{ background: 'linear-gradient(to top, var(--color-bg) 60%, transparent)' }}
      >
        {step < TOTAL_STEPS ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={cn(
              'w-full py-4 rounded-[1000px] font-semibold text-white text-base transition-opacity',
              !canProceed() ? 'opacity-40 cursor-not-allowed' : 'active:opacity-80'
            )}
            style={{
              background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)',
              border: '1px solid rgba(255,255,255,0.02)',
            }}
          >
            Далее
          </button>
        ) : (
          <button
            onClick={handlePublish}
            disabled={isSubmitting}
            className={cn(
              'w-full py-4 rounded-[1000px] font-semibold text-white text-base transition-opacity',
              isSubmitting ? 'opacity-60 cursor-not-allowed' : 'active:opacity-80'
            )}
            style={{
              background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)',
              border: '1px solid rgba(255,255,255,0.02)',
            }}
          >
            {isSubmitting ? 'Публикация...' : 'Опубликовать запрос'}
          </button>
        )}
      </div>
    </div>
  )
}
