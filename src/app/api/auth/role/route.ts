import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram/validate'
import { createClient } from '@/lib/supabase/server'
import { Constants } from '@/types/database.types'

const VALID_ROLES = Constants.public.Enums.user_role

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { initDataRaw, role } = body as { initDataRaw: unknown; role: unknown }

  if (typeof initDataRaw !== 'string' || !initDataRaw) {
    return NextResponse.json({ error: 'initDataRaw is required' }, { status: 400 })
  }

  if (!VALID_ROLES.includes(role as never)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
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

  const { data: user, error } = await supabase
    .from('users')
    .update({ role: role as 'user' | 'expert', updated_at: new Date().toISOString() })
    .eq('telegram_user_id', Number(tgUser.id))
    .select('id, telegram_user_id, first_name, last_name, username, photo_url, role, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ user })
}
