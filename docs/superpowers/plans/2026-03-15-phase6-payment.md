# Phase 6 — Payment & Contact Sharing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a mutual match, allow users to pay (mock) for a consultation and receive the expert's Telegram username.

**Architecture:** 5 sequential tasks — shared type → API payment endpoint → GET /api/requests enrichment → request-card UI → payment page + request-detail update. Each task is independently testable.

**Tech Stack:** Next.js 15 App Router, TypeScript (strict), Tailwind CSS v4, Supabase (service client), @tma.js/sdk-react, `window.Telegram.WebApp.openLink` for Telegram deep links.

**Spec:** `docs/superpowers/specs/2026-03-15-phase6-payment-design.md`

---

## Chunk 1: API Layer

### Task 1: Shared MatchedMatchData type

**Files:**
- Modify: `src/types/index.ts` (or wherever global types live — check the file)

**Context:** `MatchedMatchData` must live in `src/types/` so both the API route (server) and `use-requests.ts` (client hook) can import it without circular dependency.

- [ ] **Step 1: Check `src/types/index.ts` exists and add MatchedMatchData**

Read `src/types/index.ts`. Add at the end:

```typescript
export type MatchedMatchData = {
  match_id: string
  match_status: 'matched' | 'paid'
  expert_name: string
  expert_photo: string | null
  consultation_price: number | null
  telegram_username: string | null
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/vladislavabrosimov/Desktop/Software/MusicTlgMiniApp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add MatchedMatchData type"
```

---

### Task 2: POST /api/user/payment

**Files:**
- Create: `src/app/api/user/payment/route.ts`

**Context:**
- Supabase service client: `import { createServiceClient } from '@/lib/supabase/service'`
- Auth helper pattern (same as `src/app/api/user/matches/route.ts:5-8`)
- `validateTelegramInitData` from `@/lib/telegram/validate`
- DB schema: `matches.status` enum has `paid`; `requests.status` has `in_progress`; `expert_profiles.telegram_username` is nullable

- [ ] **Step 4: Create `src/app/api/user/payment/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram/validate'
import { createServiceClient } from '@/lib/supabase/service'

function getInitDataRaw(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('tma ')) return auth.slice(4)
  return null
}

export interface PaymentResponse {
  success: true
  telegram_username: string | null
  expert_name: string
  already_paid?: true
}

export async function POST(request: NextRequest) {
  const initDataRaw = getInitDataRaw(request)
  if (!initDataRaw) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let initData: ReturnType<typeof validateTelegramInitData>
  try {
    initData = validateTelegramInitData(initDataRaw)
  } catch {
    return NextResponse.json({ error: 'Invalid Telegram initData' }, { status: 401 })
  }

  const tgUser = initData.user
  if (!tgUser) {
    return NextResponse.json({ error: 'No user in initData' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { match_id } = body as Record<string, unknown>
  if (typeof match_id !== 'string' || !match_id) {
    return NextResponse.json({ error: 'match_id is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 1. Find user
  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_user_id', Number(tgUser.id))
    .single()

  if (userError || !dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // 2. Find match — consistent 404 for not found or unauthorized (IDOR protection)
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, status, expert_id, request_id')
    .eq('id', match_id)
    .maybeSingle()

  if (matchError || !match) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 3. Verify ownership via request (same 404 to avoid leaking match existence)
  const { data: req, error: reqError } = await supabase
    .from('requests')
    .select('id, status')
    .eq('id', match.request_id)
    .eq('user_id', dbUser.id)
    .maybeSingle()

  if (reqError || !req) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 4. Get expert profile
  const { data: expertProfile, error: profileError } = await supabase
    .from('expert_profiles')
    .select('telegram_username, display_first_name, display_last_name')
    .eq('id', match.expert_id)
    .single()

  if (profileError || !expertProfile) {
    return NextResponse.json({ error: 'Expert profile not found' }, { status: 404 })
  }

  const expertName =
    [expertProfile.display_first_name, expertProfile.display_last_name]
      .filter(Boolean)
      .join(' ') || 'Эксперт'

  // 5. Idempotency: already paid — return success without re-processing
  if (match.status === 'paid') {
    return NextResponse.json({
      success: true,
      telegram_username: expertProfile.telegram_username,
      expert_name: expertName,
      already_paid: true,
    } satisfies PaymentResponse & { already_paid: true })
  }

  // 6. Guard: must be in matched status
  if (match.status !== 'matched') {
    return NextResponse.json({ error: 'Match is not in matched status' }, { status: 409 })
  }

  // 7. Update match to paid
  const { error: matchUpdateError } = await supabase
    .from('matches')
    .update({ status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', match_id)

  if (matchUpdateError) {
    return NextResponse.json({ error: matchUpdateError.message }, { status: 500 })
  }

  // 8. Update request to in_progress — guard: only if currently 'matched' to prevent overwriting completed/etc
  await supabase
    .from('requests')
    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', match.request_id)
    .eq('status', 'matched')

  return NextResponse.json({
    success: true,
    telegram_username: expertProfile.telegram_username,
    expert_name: expertName,
  } satisfies PaymentResponse)
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/vladislavabrosimov/Desktop/Software/MusicTlgMiniApp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/app/api/user/payment/route.ts
git commit -m "feat: add POST /api/user/payment endpoint"
```

---

### Task 3: Enrich GET /api/requests with matched_match

**Files:**
- Modify: `src/app/api/requests/route.ts`
- Modify: `src/hooks/use-requests.ts`

**Context:** Add import of `MatchedMatchData` from `@/types`. Priority rule: if a request has a `paid` match, return that; else return the first `matched` match by created_at.

- [ ] **Step 7: Update GET /api/requests**

In `src/app/api/requests/route.ts`:

1. Add import at top:
```typescript
import type { MatchedMatchData } from '@/types'
```

2. Replace the block starting at `// Подсчёт откликов` through `return NextResponse.json({ requests: requestsWithCounts })` with:

```typescript
  // Response count + matched_match per request
  const requestIds = (requests ?? []).map((r) => r.id)
  const responseCountMap: Record<string, number> = {}
  const matchedMatchMap: Record<string, MatchedMatchData> = {}

  if (requestIds.length > 0) {
    const { data: allMatches } = await supabase
      .from('matches')
      .select('id, request_id, expert_id, status, created_at')
      .in('request_id', requestIds)
      .in('status', ['expert_liked', 'matched', 'paid'])
      .order('created_at', { ascending: true })

    for (const m of allMatches ?? []) {
      responseCountMap[m.request_id] = (responseCountMap[m.request_id] ?? 0) + 1
    }

    // Find matched/paid matches and enrich with expert data
    const relevantMatches = (allMatches ?? []).filter(
      (m) => m.status === 'matched' || m.status === 'paid'
    )

    if (relevantMatches.length > 0) {
      const expertIds = [...new Set(relevantMatches.map((m) => m.expert_id))]

      const { data: profiles } = await supabase
        .from('expert_profiles')
        .select('id, display_first_name, display_last_name, consultation_price, telegram_username')
        .in('id', expertIds)

      const { data: profilesWithPhoto } = await supabase
        .from('expert_profiles')
        .select('id, users!expert_profiles_user_id_fkey(photo_url)')
        .in('id', expertIds)

      const profileMap: Record<string, {
        display_first_name: string | null
        display_last_name: string | null
        consultation_price: number | null
        telegram_username: string | null
      }> = {}
      for (const p of profiles ?? []) {
        profileMap[p.id] = p
      }

      const photoMap: Record<string, string | null> = {}
      for (const p of profilesWithPhoto ?? []) {
        const userRow = p.users as { photo_url: string | null } | null
        photoMap[p.id] = userRow?.photo_url ?? null
      }

      // Per request: priority paid > matched (within same status: first by created_at, already sorted asc)
      for (const reqId of requestIds) {
        const reqMatches = relevantMatches.filter((m) => m.request_id === reqId)
        if (reqMatches.length === 0) continue

        const best =
          reqMatches.find((m) => m.status === 'paid') ??
          reqMatches.find((m) => m.status === 'matched')

        if (!best) continue

        const prof = profileMap[best.expert_id]
        if (!prof) continue

        const expertName =
          [prof.display_first_name, prof.display_last_name].filter(Boolean).join(' ') || 'Эксперт'

        matchedMatchMap[reqId] = {
          match_id: best.id,
          match_status: best.status as 'matched' | 'paid',
          expert_name: expertName,
          expert_photo: photoMap[best.expert_id] ?? null,
          consultation_price: prof.consultation_price,
          // Only expose telegram_username after payment
          telegram_username: best.status === 'paid' ? prof.telegram_username : null,
        }
      }
    }
  }

  const requestsWithCounts = (requests ?? []).map((r) => ({
    ...r,
    response_count: responseCountMap[r.id] ?? 0,
    matched_match: matchedMatchMap[r.id] ?? null,
  }))

  return NextResponse.json({ requests: requestsWithCounts })
```

- [ ] **Step 8: Update use-requests.ts**

Replace local `RequestWithCategories` type and add import:

```typescript
import type { Request, Category } from '@/types'
import type { MatchedMatchData } from '@/types'

export type RequestWithCategories = Request & {
  category: Pick<Category, 'id' | 'name'> | null
  subcategory: Pick<Category, 'id' | 'name'> | null
  response_count: number
  matched_match: MatchedMatchData | null
}
```

Note: export `RequestWithCategories` (add `export` keyword) so `request-card.tsx` can import it.

- [ ] **Step 9: Verify TypeScript compiles**

```bash
cd /Users/vladislavabrosimov/Desktop/Software/MusicTlgMiniApp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 10: Commit**

```bash
git add src/app/api/requests/route.ts src/hooks/use-requests.ts
git commit -m "feat: enrich GET /api/requests with matched_match data"
```

---

## Chunk 2: Request Card & Payment Page

### Task 4: Update RequestCard with payment CTA

**Files:**
- Modify: `src/components/requests/request-card.tsx`

**Context:**
- Import `RequestWithCategories` from `@/hooks/use-requests` (now exported)
- For Telegram deep links: use a helper `openTelegramLink` that calls `window.Telegram?.WebApp?.openLink` with fallback to `window.open`. Do NOT use `useOpenLink` — that hook does not exist in `@tma.js/sdk-react`
- The card becomes a `div` wrapper with nested `button`s. Inner buttons call `e.stopPropagation()` to prevent card navigation

- [ ] **Step 11: Replace request-card.tsx**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { RequestWithCategories } from '@/hooks/use-requests'

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

  const mm = request.matched_match

  function handlePayClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!mm) return
    router.push(`/user/requests/${request.id}/payment/${mm.match_id}`)
  }

  function handleWriteClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!mm?.telegram_username) return
    openTelegramLink(mm.telegram_username)
  }

  return (
    <div className="w-full bg-bg-secondary border border-border rounded-2xl overflow-hidden">
      {/* Main card area — navigates to request detail */}
      <button
        onClick={() => router.push(`/user/requests/${request.id}`)}
        className="w-full text-left p-4 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-text text-sm font-medium leading-snug line-clamp-2 flex-1">
            {request.description}
          </p>
          <div className="shrink-0 flex items-center gap-1.5">
            {request.response_count > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {request.response_count}
              </span>
            )}
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusColor)}>
              {isExpired && request.status === 'published' ? 'Истёк' : statusLabel}
            </span>
          </div>
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
          <p className="text-xs text-muted mt-2">Бюджет: {request.budget} ₽</p>
        )}
      </button>

      {/* Matched/paid CTA — separate from card button */}
      {mm && (
        <div className="border-t border-border px-4 py-3">
          {mm.match_status === 'matched' && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                <span className="text-sm text-text-secondary truncate">
                  Матч с <span className="text-text font-medium">{mm.expert_name}</span>
                </span>
              </div>
              <button
                onClick={handlePayClick}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }}
              >
                Оплатить
              </button>
            </div>
          )}

          {mm.match_status === 'paid' && mm.telegram_username && (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-text-secondary">Ваш эксперт</p>
                <p className="text-sm font-medium text-text truncate">{mm.expert_name}</p>
              </div>
              <button
                onClick={handleWriteClick}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                style={{ background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)' }}
              >
                Написать
              </button>
            </div>
          )}

          {mm.match_status === 'paid' && !mm.telegram_username && (
            <p className="text-xs text-text-secondary">Контакт будет передан через бота</p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 12: Verify TypeScript compiles**

```bash
cd /Users/vladislavabrosimov/Desktop/Software/MusicTlgMiniApp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 13: Commit**

```bash
git add src/components/requests/request-card.tsx
git commit -m "feat: add matched/paid CTA to request card"
```

---

### Task 5: Payment Page

**Files:**
- Create: `src/app/user/requests/[id]/payment/[matchId]/page.tsx`

**Context:**
- Page params: `{ id: string, matchId: string }` — async params (Next.js 15)
- Back Button: `useBackButton` from `@tma.js/sdk-react`
  - Show on mount (idle/success/error states), hide during loading
  - On click → `router.push('/user/requests/[id]')`
  - IMPORTANT: always cleanup (hide + remove listener) in useEffect return
- `openTelegramLink` helper — same pattern as in request-card (copy function, do not use `useOpenLink`)
- `PaymentResponse` imported from `@/app/api/user/payment/route`
- The 1500ms delay before the API call is intentional mock payment UX — comment in code

- [ ] **Step 14: Create payment page**

Create `src/app/user/requests/[id]/payment/[matchId]/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRawInitData, useBackButton } from '@tma.js/sdk-react'
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

function PaymentContent({ requestId, matchId }: { requestId: string; matchId: string }) {
  const router = useRouter()
  const initDataRaw = useRawInitData()
  const backButton = useBackButton()

  const [state, setState] = useState<PaymentState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [result, setResult] = useState<PaymentResponse | null>(null)

  // Back Button: show in all states except loading; always cleanup
  useEffect(() => {
    if (state === 'loading') {
      backButton.hide()
      return () => { backButton.hide() }
    }

    backButton.show()
    const handleBack = () => router.push(`/user/requests/${requestId}`)
    backButton.on('click', handleBack)
    return () => {
      backButton.off('click', handleBack)
      backButton.hide()
    }
  }, [state, backButton, router, requestId])

  async function handlePay() {
    if (!initDataRaw || state !== 'idle') return

    // Synchronously block re-entry before any async work
    setState('loading')
    setErrorMsg(null)

    // Intentional 1500ms delay — mock payment UX (replace with real gateway in future)
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
            onClick={() => router.push(`/user/requests/${requestId}`)}
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
        {/* Card section */}
        <div className="mb-8">
          <p className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-3">
            К оплате
          </p>
          <div className="bg-bg-secondary border border-border rounded-2xl p-5 mb-6 text-center">
            <p className="text-text font-bold text-4xl">1 500 ₽</p>
            <p className="text-text-secondary text-sm mt-1">Консультация эксперта</p>
          </div>

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
      </div>

      {/* Error banner */}
      {state === 'error' && errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-400/10 border border-red-400/20">
          <p className="text-red-400 text-sm text-center">{errorMsg}</p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-auto">
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
              'Оплатить 1 500 ₽'
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
}

export default async function PaymentPage({ params }: Props) {
  const { id, matchId } = await params
  return (
    <RouteGuard allowedRole="user">
      <PaymentContent requestId={id} matchId={matchId} />
    </RouteGuard>
  )
}
```

- [ ] **Step 15: Verify TypeScript compiles**

```bash
cd /Users/vladislavabrosimov/Desktop/Software/MusicTlgMiniApp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 16: Commit**

```bash
git add src/app/user/requests/[id]/payment/
git commit -m "feat: add payment page /user/requests/[id]/payment/[matchId]"
```

---

## Chunk 3: Request Detail + Docs

### Task 6: Update RequestDetail for in_progress status

**Files:**
- Modify: `src/app/api/requests/[id]/route.ts`
- Modify: `src/components/requests/request-detail.tsx`

**Context:**
- `GET /api/requests/[id]` returns a single request — needs `paid_match` field when status is `in_progress`
- `request-detail.tsx` already fetches from this route; just extend the local type and add JSX block

- [ ] **Step 17: Read src/app/api/requests/[id]/route.ts**

Read the full file to understand current structure before editing.

- [ ] **Step 18: Enrich GET /api/requests/[id] with paid_match**

In the GET handler of `src/app/api/requests/[id]/route.ts`, after the main request is fetched and before the final `return NextResponse.json`, add:

```typescript
  // Fetch paid match for in_progress requests
  let paid_match: {
    match_id: string
    expert_name: string
    telegram_username: string | null
  } | null = null

  if (requestData.status === 'in_progress') {
    const { data: paidMatch } = await supabase
      .from('matches')
      .select('id, expert_id')
      .eq('request_id', id)
      .eq('status', 'paid')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (paidMatch) {
      const { data: profile } = await supabase
        .from('expert_profiles')
        .select('telegram_username, display_first_name, display_last_name')
        .eq('id', paidMatch.expert_id)
        .single()

      if (profile) {
        paid_match = {
          match_id: paidMatch.id,
          expert_name:
            [profile.display_first_name, profile.display_last_name]
              .filter(Boolean)
              .join(' ') || 'Эксперт',
          telegram_username: profile.telegram_username,
        }
      }
    }
  }

  return NextResponse.json({ request: { ...requestData, paid_match } })
```

Note: replace the existing `return NextResponse.json({ request: requestData })` (or however the route currently returns) with this block.

- [ ] **Step 19: Update RequestDetail type and JSX**

In `src/components/requests/request-detail.tsx`:

1. Extend `RequestWithCategories` type (local, around line 12-15):

```typescript
type RequestWithCategories = Request & {
  category: Pick<Category, 'id' | 'name'> | null
  subcategory: Pick<Category, 'id' | 'name'> | null
  paid_match: {
    match_id: string
    expert_name: string
    telegram_username: string | null
  } | null
}
```

2. Add `openTelegramLink` helper (same function as in request-card, before the component):

```typescript
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
```

3. In the JSX section, find the block that renders the expert list (guarded by `request.status === 'published'`, around line 498). Add BEFORE that block:

```tsx
{/* Ваш эксперт — shown when request is in_progress */}
{request.status === 'in_progress' && request.paid_match && (
  <div className="mb-6">
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
```

- [ ] **Step 20: Verify TypeScript compiles**

```bash
cd /Users/vladislavabrosimov/Desktop/Software/MusicTlgMiniApp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 21: Commit**

```bash
git add src/app/api/requests/[id]/route.ts src/components/requests/request-detail.tsx
git commit -m "feat: show expert contact block in request detail when in_progress"
```

---

### Task 7: Update docs

**Files:**
- Modify: `docs/roadmap.md`
- Modify: `docs/INDEX.md`

- [ ] **Step 22: Mark Phase 6 as complete in roadmap.md**

Change all `⬜` in the Phase 6 table (lines ~111–117) to `✅`.

- [ ] **Step 23: Update INDEX.md status**

Update the Статус проекта table:

```markdown
| Стадия        | 🟢 Фазы 1–6 завершены — переходим к Фазе 7          |
| Текущий фокус | Фаза 7 (поиск и каталог экспертов)                   |
| Следующий шаг | 7.1 — экран поиска / каталог экспертов               |
```

- [ ] **Step 24: Commit**

```bash
git add docs/roadmap.md docs/INDEX.md
git commit -m "docs: mark Phase 6 complete, update INDEX to Phase 7"
```

---

## Manual E2E Test Checklist

After implementation, verify in Telegram:

1. Home → request card with a `matched` match shows "Матч с [Имя]" + "Оплатить" button
2. Tap "Оплатить" → payment page opens at `/user/requests/[id]/payment/[matchId]`
3. Back Button in payment page → returns to request detail (not back to home)
4. Tap "Оплатить 1 500 ₽" → spinner appears immediately (no double-tap possible), 1.5s delay, success screen
5. Success screen shows expert name + @username + "Написать в Telegram" button
6. Tap "Написать в Telegram" → opens Telegram chat with expert
7. Tap "Вернуться к запросу" → back to request detail
8. Request detail: status shows "В работе" + "Ваш эксперт" block with @username + "Написать" button
9. Home → request card now shows expert name + "Написать" button (no more "Оплатить")
10. Refresh Home → state persists correctly
