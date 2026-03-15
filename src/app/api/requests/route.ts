import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram/validate'
import { createClient } from '@/lib/supabase/server'
import type { TablesInsert } from '@/types/database.types'
import type { MatchedMatchData } from '@/types'

function getInitDataRaw(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('tma ')) return auth.slice(4)
  return null
}

export async function GET(request: NextRequest) {
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

  const supabase = await createClient()

  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_user_id', Number(tgUser.id))
    .single()

  if (userError || !dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { data: requests, error } = await supabase
    .from('requests')
    .select(`
      id, description, status, is_active, budget,
      created_at, updated_at, expires_at,
      category:categories!requests_category_id_fkey(id, name),
      subcategory:categories!requests_subcategory_id_fkey(id, name)
    `)
    .eq('user_id', dbUser.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

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

    const relevantMatches = (allMatches ?? []).filter(
      (m) => m.status === 'matched' || m.status === 'paid'
    )

    if (relevantMatches.length > 0) {
      const expertIds = [...new Set(relevantMatches.map((m) => m.expert_id))]

      const { data: profiles } = await supabase
        .from('expert_profiles')
        .select('id, display_first_name, display_last_name, consultation_price, telegram_username, users!expert_profiles_user_id_fkey(first_name, last_name, photo_url)')
        .in('id', expertIds)

      const profileMap: Record<string, {
        display_first_name: string | null
        display_last_name: string | null
        consultation_price: number | null
        telegram_username: string | null
        users: { first_name: string; last_name: string | null; photo_url: string | null } | null
      }> = {}
      for (const p of profiles ?? []) {
        profileMap[p.id] = p as typeof profileMap[string]
      }

      const photoMap: Record<string, string | null> = {}
      for (const [id, p] of Object.entries(profileMap)) {
        photoMap[id] = p.users?.photo_url ?? null
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
          [prof.display_first_name, prof.display_last_name].filter(Boolean).join(' ') ||
          [prof.users?.first_name, prof.users?.last_name].filter(Boolean).join(' ') ||
          'Эксперт'

        matchedMatchMap[reqId] = {
          match_id: best.id,
          match_status: best.status as 'matched' | 'paid',
          expert_name: expertName,
          expert_photo: photoMap[best.expert_id] ?? null,
          consultation_price: prof.consultation_price,
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

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { description, category_id, subcategory_id, budget, publish } = body as {
    description?: unknown
    category_id?: unknown
    subcategory_id?: unknown
    budget?: unknown
    publish?: unknown
  }

  if (typeof description !== 'string' || description.trim().length < 10) {
    return NextResponse.json({ error: 'Description must be at least 10 characters' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_user_id', Number(tgUser.id))
    .single()

  if (userError || !dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const isPublish = publish === true
  const expiresAt = isPublish
    ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    : null

  const insertData: TablesInsert<'requests'> = {
    user_id: dbUser.id,
    description: description.trim(),
    category_id: typeof category_id === 'string' ? category_id : null,
    subcategory_id: typeof subcategory_id === 'string' ? subcategory_id : null,
    budget: typeof budget === 'number' && budget > 0 ? budget : null,
    status: isPublish ? 'published' : 'draft',
    is_active: isPublish,
    expires_at: expiresAt,
  }

  const { data: newRequest, error } = await supabase
    .from('requests')
    .insert(insertData)
    .select('id, status, is_active')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ request: newRequest }, { status: 201 })
}
