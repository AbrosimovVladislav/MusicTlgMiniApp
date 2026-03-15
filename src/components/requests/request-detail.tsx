'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRawInitData } from '@tma.js/sdk-react'
import { cn } from '@/lib/utils'
import { useCategories } from '@/hooks/use-categories'
import type { Request, Category } from '@/types'

type RequestWithCategories = Request & {
  category: Pick<Category, 'id' | 'name'> | null
  subcategory: Pick<Category, 'id' | 'name'> | null
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  matched: 'Матч найден',
  in_progress: 'В работе',
  completed: 'Завершён',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-muted',
  published: 'text-green-400',
  matched: 'text-yellow-400',
  in_progress: 'text-blue-400',
  completed: 'text-muted',
}

interface RequestDetailProps {
  requestId: string
}

export function RequestDetail({ requestId }: RequestDetailProps) {
  const router = useRouter()
  const initDataRaw = useRawInitData()
  const { topLevel, subCategories, isLoading: categoriesLoading } = useCategories()

  const [request, setRequest] = useState<RequestWithCategories | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingDescription, setEditingDescription] = useState(false)
  const [draftDescription, setDraftDescription] = useState('')
  const [editingBudget, setEditingBudget] = useState(false)
  const [draftBudget, setDraftBudget] = useState('')
  const [editingCategory, setEditingCategory] = useState(false)
  const [draftCategoryId, setDraftCategoryId] = useState('')
  const [draftSubcategoryId, setDraftSubcategoryId] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!initDataRaw) return

    fetch(`/api/requests/${requestId}`, {
      headers: { Authorization: `tma ${initDataRaw}` },
    })
      .then((r) => r.json())
      .then((data: { request?: RequestWithCategories; error?: string }) => {
        if (data.error) throw new Error(data.error)
        setRequest(data.request ?? null)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить запрос')
      })
      .finally(() => setIsLoading(false))
  }, [initDataRaw, requestId])

  async function saveField(updates: Record<string, unknown>) {
    if (!initDataRaw) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${initDataRaw}`,
        },
        body: JSON.stringify(updates),
      })
      const data = await res.json() as { request?: RequestWithCategories; error?: string }
      if (data.error) throw new Error(data.error)
      if (data.request) {
        setRequest((prev) => prev ? { ...prev, ...data.request } : prev)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePublish() {
    await saveField({ publish: true })
  }

  function startEditCategory() {
    setDraftCategoryId(request?.category?.id ?? '')
    setDraftSubcategoryId(request?.subcategory?.id ?? '')
    setEditingCategory(true)
  }

  async function saveCategory() {
    await saveField({
      category_id: draftCategoryId || null,
      subcategory_id: draftSubcategoryId || null,
    })
    setEditingCategory(false)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-bg px-5 pt-6 pb-8">
        <div className="h-10 w-32 bg-bg-secondary rounded-2xl animate-pulse mb-8" />
        <div className="h-32 bg-bg-secondary rounded-2xl animate-pulse mb-4" />
        <div className="h-16 bg-bg-secondary rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg px-5">
        <p className="text-red-400 text-sm mb-4">{error ?? 'Запрос не найден'}</p>
        <button onClick={() => router.back()} className="text-text-secondary text-sm underline">
          Назад
        </button>
      </div>
    )
  }

  const statusLabel = STATUS_LABELS[request.status] ?? request.status
  const statusColor = STATUS_COLORS[request.status] ?? 'text-muted'
  const isExpired = request.expires_at ? new Date(request.expires_at) < new Date() : false
  const canEdit = request.status === 'draft' || request.status === 'published'
  const draftSubcats = draftCategoryId ? subCategories(draftCategoryId) : []

  return (
    <div
      className="flex flex-col min-h-screen bg-bg px-5 pt-6 pb-8"
      style={{ minHeight: 'var(--tg-viewport-stable-height, 100vh)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-text active:opacity-70"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-text font-semibold text-lg flex-1">Запрос</h1>
        <span className={cn('text-sm font-medium', statusColor)}>
          {isExpired && request.status === 'published' ? 'Истёк' : statusLabel}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {/* Description */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-muted text-xs font-medium uppercase tracking-wider">Описание</p>
            {canEdit && !editingDescription && (
              <button
                onClick={() => { setDraftDescription(request.description); setEditingDescription(true) }}
                className="text-xs text-accent-from active:opacity-70"
              >
                Изменить
              </button>
            )}
          </div>

          {editingDescription ? (
            <>
              <textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                className="w-full h-28 bg-transparent text-text resize-none outline-none"
                style={{ fontSize: '16px' }}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    saveField({ description: draftDescription })
                    setEditingDescription(false)
                  }}
                  disabled={isSaving || draftDescription.trim().length < 10}
                  className="text-xs font-medium text-accent-from disabled:opacity-40"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setEditingDescription(false)}
                  className="text-xs text-muted"
                >
                  Отмена
                </button>
              </div>
            </>
          ) : (
            <p className="text-text text-sm leading-relaxed">{request.description}</p>
          )}
        </div>

        {/* Category */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-muted text-xs font-medium uppercase tracking-wider">Категория</p>
            {canEdit && !editingCategory && (
              <button
                onClick={startEditCategory}
                className="text-xs text-accent-from active:opacity-70"
              >
                {request.category ? 'Изменить' : 'Добавить'}
              </button>
            )}
          </div>

          {editingCategory ? (
            <div className="flex flex-col gap-4 mt-2">
              {categoriesLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 rounded-xl bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {topLevel.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setDraftCategoryId(cat.id)
                          setDraftSubcategoryId('')
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                          draftCategoryId === cat.id
                            ? 'border-accent-from/50 text-text'
                            : 'border-border text-text-secondary bg-white/3'
                        )}
                        style={
                          draftCategoryId === cat.id
                            ? { background: 'linear-gradient(162deg, rgba(68,0,255,0.15) 18%, rgba(57,1,210,0.15) 103%)', borderColor: 'rgba(68,0,255,0.5)' }
                            : {}
                        }
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {draftSubcats.length > 0 && (
                    <>
                      <p className="text-text-secondary text-xs font-medium uppercase tracking-wider -mb-2">
                        Подкатегория (необязательно)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {draftSubcats.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() =>
                              setDraftSubcategoryId((prev) => prev === sub.id ? '' : sub.id)
                            }
                            className={cn(
                              'px-3 py-1.5 rounded-full text-sm transition-all',
                              draftSubcategoryId === sub.id
                                ? 'text-white'
                                : 'bg-white/8 text-text-secondary'
                            )}
                            style={
                              draftSubcategoryId === sub.id
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

              <div className="flex gap-2">
                <button
                  onClick={saveCategory}
                  disabled={isSaving || !draftCategoryId}
                  className="text-xs font-medium text-accent-from disabled:opacity-40"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setEditingCategory(false)}
                  className="text-xs text-muted"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {request.category ? (
                <>
                  <span className="text-sm text-text bg-white/5 px-3 py-1 rounded-full">
                    {request.category.name}
                  </span>
                  {request.subcategory && (
                    <span className="text-sm text-text-secondary">· {request.subcategory.name}</span>
                  )}
                </>
              ) : (
                <span className="text-muted text-sm">Не выбрана</span>
              )}
            </div>
          )}
        </div>

        {/* Budget */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-muted text-xs font-medium uppercase tracking-wider">Бюджет</p>
            {canEdit && !editingBudget && (
              <button
                onClick={() => { setDraftBudget(String(request.budget ?? '')); setEditingBudget(true) }}
                className="text-xs text-accent-from active:opacity-70"
              >
                {request.budget ? 'Изменить' : 'Добавить'}
              </button>
            )}
          </div>

          {editingBudget ? (
            <div>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={draftBudget}
                  onChange={(e) => setDraftBudget(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent pl-4 text-text outline-none"
                  style={{ fontSize: '16px' }}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    saveField({ budget: draftBudget ? Number(draftBudget) : null })
                    setEditingBudget(false)
                  }}
                  disabled={isSaving}
                  className="text-xs font-medium text-accent-from disabled:opacity-40"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setEditingBudget(false)}
                  className="text-xs text-muted"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <p className="text-text text-sm">
              {request.budget ? `$${request.budget}` : <span className="text-muted">Не указан</span>}
            </p>
          )}
        </div>

        {/* Expires */}
        {request.expires_at && (
          <p className="text-muted text-xs text-center">
            {isExpired
              ? 'Срок действия истёк'
              : `Активен до ${new Date(request.expires_at).toLocaleDateString('ru-RU')}`}
          </p>
        )}
      </div>

      {/* Matching actions for published requests */}
      {request.status === 'published' && (
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => router.push(`/user/requests/${requestId}/experts`)}
            className="w-full py-4 rounded-[1000px] font-semibold text-white text-base active:opacity-80"
            style={{
              background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)',
              border: '1px solid rgba(255,255,255,0.02)',
            }}
          >
            Найти эксперта
          </button>
          <button
            onClick={() => router.push(`/user/requests/${requestId}/waiting`)}
            className="w-full py-3.5 rounded-[1000px] font-medium text-text-secondary text-sm active:opacity-70 border border-border"
          >
            Мои лайки
          </button>
        </div>
      )}

      {/* Publish draft */}
      {request.status === 'draft' && (
        <div className="mt-auto pt-6">
          <button
            onClick={handlePublish}
            disabled={isSaving}
            className={cn(
              'w-full py-4 rounded-[1000px] font-semibold text-white text-base transition-opacity',
              isSaving ? 'opacity-60 cursor-not-allowed' : 'active:opacity-80'
            )}
            style={{
              background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)',
              border: '1px solid rgba(255,255,255,0.02)',
            }}
          >
            {isSaving ? 'Публикация...' : 'Опубликовать'}
          </button>
        </div>
      )}
    </div>
  )
}
