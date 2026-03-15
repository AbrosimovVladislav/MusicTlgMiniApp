'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useRawInitData } from '@tma.js/sdk-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useCategories } from '@/hooks/use-categories'
import type { Request, Category } from '@/types'
import type { ExpertCardData } from '@/app/api/user/experts/route'

type RequestWithCategories = Request & {
  category: Pick<Category, 'id' | 'name'> | null
  subcategory: Pick<Category, 'id' | 'name'> | null
  paid_match: {
    match_id: string
    expert_name: string
    telegram_username: string | null
  } | null
}

const REQUEST_STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  matched: 'Матч найден',
  in_progress: 'В работе',
  completed: 'Завершён',
}

const REQUEST_STATUS_COLORS: Record<string, string> = {
  draft: 'text-muted',
  published: 'text-green-400',
  matched: 'text-yellow-400',
  in_progress: 'text-blue-400',
  completed: 'text-muted',
}

const MATCH_STATUS_LABELS: Record<string, string> = {
  user_liked: 'Лайкнут',
  expert_liked: 'Откликнулся!',
  matched: 'Матч!',
  paid: 'Оплачено',
}

const MATCH_STATUS_COLORS: Record<string, string> = {
  user_liked: 'text-blue-400 bg-blue-400/10',
  expert_liked: 'text-yellow-400 bg-yellow-400/10',
  matched: 'text-green-400 bg-green-400/10',
  paid: 'text-purple-400 bg-purple-400/10',
}

const MATCH_STATUS_ORDER: Record<string, number> = {
  matched: 0,
  paid: 1,
  expert_liked: 2,
  user_liked: 3,
}

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

  const [experts, setExperts] = useState<ExpertCardData[]>([])
  const [expertsLoading, setExpertsLoading] = useState(false)
  const [liking, setLiking] = useState<string | null>(null)

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

  const fetchExperts = useCallback(() => {
    if (!initDataRaw) return
    setExpertsLoading(true)
    fetch(`/api/user/experts?request_id=${requestId}`, {
      headers: { Authorization: `tma ${initDataRaw}` },
    })
      .then((r) => r.json())
      .then((data: { experts?: ExpertCardData[]; error?: string }) => {
        if (data.error) return
        const sorted = (data.experts ?? []).slice().sort((a, b) => {
          const aOrder = a.match_status ? (MATCH_STATUS_ORDER[a.match_status] ?? 4) : 4
          const bOrder = b.match_status ? (MATCH_STATUS_ORDER[b.match_status] ?? 4) : 4
          return aOrder - bOrder
        })
        setExperts(sorted)
      })
      .catch(() => {})
      .finally(() => setExpertsLoading(false))
  }, [initDataRaw, requestId])

  useEffect(() => {
    if (request?.status === 'published') {
      fetchExperts()
    }
  }, [request?.status, fetchExperts])

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
    fetchExperts()
  }

  async function handleLike(expertId: string) {
    if (!initDataRaw || liking) return
    setLiking(expertId)
    try {
      const res = await fetch('/api/user/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${initDataRaw}`,
        },
        body: JSON.stringify({ expert_id: expertId, request_id: requestId }),
      })
      const data = await res.json() as { match?: { id: string; status: string }; result?: string; error?: string }
      if (data.error) return

      setExperts((prev) => {
        const updated = prev.map((e) =>
          e.id === expertId
            ? { ...e, match_status: (data.match?.status ?? 'user_liked') as ExpertCardData['match_status'], match_id: data.match?.id ?? null }
            : e
        )
        return updated.slice().sort((a, b) => {
          const aOrder = a.match_status ? (MATCH_STATUS_ORDER[a.match_status] ?? 4) : 4
          const bOrder = b.match_status ? (MATCH_STATUS_ORDER[b.match_status] ?? 4) : 4
          return aOrder - bOrder
        })
      })
    } catch {
      // silent
    } finally {
      setLiking(null)
    }
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

  const statusLabel = REQUEST_STATUS_LABELS[request.status] ?? request.status
  const statusColor = REQUEST_STATUS_COLORS[request.status] ?? 'text-muted'
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

      {/* Ваш эксперт — shown when request is in_progress */}
      {request.status === 'in_progress' && request.paid_match && (
        <div className="mt-8">
          <h2 className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-3">
            Ваш эксперт
          </h2>
          <div className="bg-bg-secondary border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-text font-semibold truncate">{request.paid_match.expert_name}</p>
                {request.paid_match.telegram_username ? (
                  <p className="text-accent-from text-sm">@{request.paid_match.telegram_username}</p>
                ) : (
                  <p className="text-text-secondary text-sm">Контакт будет передан через бота</p>
                )}
              </div>
              {request.paid_match.telegram_username && (
                <button
                  onClick={() => openTelegramLink(request.paid_match!.telegram_username!)}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                  style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }}
                >
                  Написать
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Experts list — inline for published requests */}
      {request.status === 'published' && (
        <div className="mt-8">
          <h2 className="text-text font-semibold text-base mb-4">Подходящие эксперты</h2>

          {expertsLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-bg-secondary animate-pulse" />
              ))}
            </div>
          )}

          {!expertsLoading && experts.length === 0 && (
            <div className="flex flex-col items-center text-center py-10">
              <div className="text-4xl mb-3">🎵</div>
              <p className="text-text-secondary text-sm">Пока нет экспертов по вашей категории</p>
            </div>
          )}

          {!expertsLoading && experts.length > 0 && (
            <div className="flex flex-col gap-3">
              {experts.map((expert) => {
                const fullName = [expert.user.first_name, expert.user.last_name].filter(Boolean).join(' ')
                return (
                  <div key={expert.id} className="bg-bg-secondary border border-border rounded-2xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {/* Avatar */}
                      <button
                        onClick={() => router.push(`/user/experts/${expert.id}?request_id=${requestId}`)}
                        className="shrink-0"
                      >
                        {expert.user.photo_url ? (
                          <Image
                            src={expert.user.photo_url}
                            alt={expert.user.first_name}
                            width={48}
                            height={48}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-semibold text-text">
                            {expert.user.first_name.charAt(0)}
                          </div>
                        )}
                      </button>

                      {/* Name + categories */}
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => router.push(`/user/experts/${expert.id}?request_id=${requestId}`)}
                          className="text-left w-full"
                        >
                          <p className="text-text font-semibold text-sm">{fullName}</p>
                        </button>
                        {expert.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {expert.categories.slice(0, 2).map((cat) => (
                              <span key={cat.id} className="text-xs text-muted bg-white/5 px-2 py-0.5 rounded-full">
                                {cat.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Status badge or like button */}
                      {expert.match_status === 'expert_liked' ? (
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          <span className={cn('text-xs font-medium px-2 py-1 rounded-full', MATCH_STATUS_COLORS[expert.match_status])}>
                            {MATCH_STATUS_LABELS[expert.match_status]}
                          </span>
                          <button
                            onClick={() => handleLike(expert.id)}
                            disabled={liking === expert.id}
                            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-transform disabled:opacity-60"
                            style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }}
                          >
                            {liking === expert.id ? (
                              <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        </div>
                      ) : expert.match_status ? (
                        <span className={cn('shrink-0 text-xs font-medium px-2 py-1 rounded-full', MATCH_STATUS_COLORS[expert.match_status])}>
                          {MATCH_STATUS_LABELS[expert.match_status]}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleLike(expert.id)}
                          disabled={liking === expert.id}
                          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-transform disabled:opacity-60"
                          style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }}
                        >
                          {liking === expert.id ? (
                            <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Description preview */}
                    {expert.description && (
                      <p className="text-text-secondary text-xs leading-relaxed line-clamp-2 mb-3">
                        {expert.description}
                      </p>
                    )}

                    {/* Price + details */}
                    <div className="flex items-center justify-between">
                      {expert.consultation_price ? (
                        <span className="text-text text-sm font-semibold">{expert.consultation_price} ₽</span>
                      ) : (
                        <span className="text-muted text-sm">Цена по запросу</span>
                      )}
                      <button
                        onClick={() => router.push(`/user/experts/${expert.id}?request_id=${requestId}`)}
                        className="text-xs text-accent-from font-medium"
                      >
                        Подробнее →
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
