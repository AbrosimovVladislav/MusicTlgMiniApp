import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram/validate'
import { createClient } from '@/lib/supabase/server'
import type { TablesInsert } from '@/types/database.types'

export async function POST(request: NextRequest) {
  console.log('[/api/auth] POST received')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    console.error('[/api/auth] Invalid JSON body')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || !('initDataRaw' in body)) {
    console.error('[/api/auth] Missing initDataRaw')
    return NextResponse.json({ error: 'initDataRaw is required' }, { status: 400 })
  }

  const { initDataRaw } = body as { initDataRaw: unknown }
  if (typeof initDataRaw !== 'string' || !initDataRaw) {
    console.error('[/api/auth] initDataRaw is empty or not a string')
    return NextResponse.json({ error: 'initDataRaw must be a non-empty string' }, { status: 400 })
  }

  console.log('[/api/auth] validating initData, length:', initDataRaw.length)

  let initData: ReturnType<typeof validateTelegramInitData>
  try {
    initData = validateTelegramInitData(initDataRaw)
  } catch (err) {
    console.error('[/api/auth] validateTelegramInitData threw:', String(err))
    return NextResponse.json({ error: 'Invalid Telegram initData' }, { status: 401 })
  }

  const tgUser = initData.user
  if (!tgUser) {
    console.error('[/api/auth] No user field in initData')
    return NextResponse.json({ error: 'No user in initData' }, { status: 400 })
  }

  console.log('[/api/auth] tgUser id:', tgUser.id, 'username:', tgUser.username)

  const supabase = await createClient()
  const telegramUserId = Number(tgUser.id)

  // Check if user already exists
  const { data: existing, error: existingError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_user_id', telegramUserId)
    .single()

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('[/api/auth] supabase select error:', existingError.message)
  }

  const now = new Date().toISOString()
  const SELECT_FIELDS = 'id, telegram_user_id, first_name, last_name, username, photo_url, role, created_at, updated_at'

  if (existing) {
    console.log('[/api/auth] updating existing user id:', existing.id)
    // Update existing user — sync only Telegram-controlled fields, NOT first_name/last_name
    const { data: user, error } = await supabase
      .from('users')
      .update({
        username: tgUser.username ?? null,
        photo_url: tgUser.photo_url ?? null,
        updated_at: now,
      })
      .eq('id', existing.id)
      .select(SELECT_FIELDS)
      .single()

    if (error) {
      console.error('[/api/auth] update error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    console.log('[/api/auth] update success, role:', user?.role)
    return NextResponse.json({ user })
  }

  // Insert new user
  console.log('[/api/auth] inserting new user')
  const insertData: TablesInsert<'users'> = {
    telegram_user_id: telegramUserId,
    first_name: tgUser.first_name,
    last_name: tgUser.last_name ?? null,
    username: tgUser.username ?? null,
    photo_url: tgUser.photo_url ?? null,
  }

  const { data: user, error } = await supabase
    .from('users')
    .insert(insertData)
    .select(SELECT_FIELDS)
    .single()

  if (error) {
    console.error('[/api/auth] insert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  console.log('[/api/auth] insert success, new user id:', user?.id)
  return NextResponse.json({ user })
}
