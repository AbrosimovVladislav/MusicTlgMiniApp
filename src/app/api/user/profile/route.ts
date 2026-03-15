import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram/validate'
import { createClient } from '@/lib/supabase/server'

function getInitDataRaw(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('tma ')) return auth.slice(4)
  return null
}

export async function PATCH(request: NextRequest) {
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

  const { first_name, last_name } = body as { first_name?: unknown; last_name?: unknown }

  if (typeof first_name !== 'string' || first_name.trim().length === 0) {
    return NextResponse.json({ error: 'first_name is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: user, error } = await supabase
    .from('users')
    .update({
      first_name: first_name.trim(),
      last_name: typeof last_name === 'string' ? last_name.trim() || null : null,
      updated_at: new Date().toISOString(),
    })
    .eq('telegram_user_id', Number(tgUser.id))
    .select('id, telegram_user_id, first_name, last_name, username, photo_url, role, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ user })
}
