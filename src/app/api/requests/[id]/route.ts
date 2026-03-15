import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram/validate'
import { createClient } from '@/lib/supabase/server'

function getInitDataRaw(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('tma ')) return auth.slice(4)
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params
  const supabase = await createClient()

  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_user_id', Number(tgUser.id))
    .single()

  if (userError || !dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { data: req, error } = await supabase
    .from('requests')
    .select(`
      id, description, status, is_active, budget,
      created_at, updated_at, expires_at,
      category:categories!requests_category_id_fkey(id, name),
      subcategory:categories!requests_subcategory_id_fkey(id, name)
    `)
    .eq('id', id)
    .eq('user_id', dbUser.id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  // Fetch paid match for in_progress requests
  let paid_match: {
    match_id: string
    expert_name: string
    telegram_username: string | null
  } | null = null

  if (req.status === 'in_progress') {
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
        .select('telegram_username, display_first_name, display_last_name, users!expert_profiles_user_id_fkey(first_name, last_name)')
        .eq('id', paidMatch.expert_id)
        .single()

      if (profile) {
        const userRow = profile.users as { first_name: string; last_name: string | null } | null
        paid_match = {
          match_id: paidMatch.id,
          expert_name:
            [profile.display_first_name, profile.display_last_name].filter(Boolean).join(' ') ||
            [userRow?.first_name, userRow?.last_name].filter(Boolean).join(' ') ||
            'Эксперт',
          telegram_username: profile.telegram_username,
        }
      }
    }
  }

  return NextResponse.json({ request: { ...req, paid_match } })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params
  const supabase = await createClient()

  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_user_id', Number(tgUser.id))
    .single()

  if (userError || !dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
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

  const { description, budget, publish, category_id, subcategory_id } = body as {
    description?: unknown
    budget?: unknown
    publish?: unknown
    category_id?: unknown
    subcategory_id?: unknown
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof description === 'string' && description.trim().length >= 10) {
    updates.description = description.trim()
  }

  if (typeof budget === 'number' && budget > 0) {
    updates.budget = budget
  } else if (budget === null) {
    updates.budget = null
  }

  if (typeof category_id === 'string' && category_id) {
    updates.category_id = category_id
    // Reset subcategory when category changes (unless a new one is provided)
    updates.subcategory_id = null
  } else if (category_id === null) {
    updates.category_id = null
    updates.subcategory_id = null
  }

  if (typeof subcategory_id === 'string' && subcategory_id) {
    updates.subcategory_id = subcategory_id
  } else if (subcategory_id === null) {
    updates.subcategory_id = null
  }

  if (publish === true) {
    updates.status = 'published'
    updates.is_active = true
    updates.expires_at = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  }

  const { data: updated, error } = await supabase
    .from('requests')
    .update(updates)
    .eq('id', id)
    .eq('user_id', dbUser.id)
    .select(`
      id, description, status, is_active, budget, expires_at,
      category:categories!requests_category_id_fkey(id, name),
      subcategory:categories!requests_subcategory_id_fkey(id, name)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ request: updated })
}
