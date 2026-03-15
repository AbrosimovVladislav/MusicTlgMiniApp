import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram/validate'
import { createClient } from '@/lib/supabase/server'
import type { TablesInsert } from '@/types/database.types'

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

  return NextResponse.json({ requests })
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
