import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram/validate'
import { createClient } from '@/lib/supabase/server'
import type { TablesInsert } from '@/types/database.types'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || !('initDataRaw' in body)) {
    return NextResponse.json({ error: 'initDataRaw is required' }, { status: 400 })
  }

  const { initDataRaw } = body as { initDataRaw: unknown }
  if (typeof initDataRaw !== 'string' || !initDataRaw) {
    return NextResponse.json({ error: 'initDataRaw must be a non-empty string' }, { status: 400 })
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
  const telegramUserId = Number(tgUser.id)

  // Check if user already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_user_id', telegramUserId)
    .single()

  const now = new Date().toISOString()
  const SELECT_FIELDS = 'id, telegram_user_id, first_name, last_name, username, photo_url, role, created_at, updated_at'

  if (existing) {
    // Update existing user
    const { data: user, error } = await supabase
      .from('users')
      .update({
        first_name: tgUser.first_name,
        last_name: tgUser.last_name ?? null,
        username: tgUser.username ?? null,
        photo_url: tgUser.photo_url ?? null,
        updated_at: now,
      })
      .eq('id', existing.id)
      .select(SELECT_FIELDS)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ user })
  }

  // Insert new user
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user })
}
