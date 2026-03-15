import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram/validate'
import { createServiceClient } from '@/lib/supabase/service'

function getInitDataRaw(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('tma ')) return auth.slice(4)
  return null
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

  const { request_id } = body as Record<string, unknown>

  if (typeof request_id !== 'string' || !request_id) {
    return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_user_id', Number(tgUser.id))
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('expert_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Expert profile not found' }, { status: 404 })
  }

  // Проверить существующий матч
  const { data: existing } = await supabase
    .from('matches')
    .select('id, status')
    .eq('expert_id', profile.id)
    .eq('request_id', request_id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'user_liked') {
      // Пользователь уже лайкнул — обновляем до matched
      const { data: updated, error: updateError } = await supabase
        .from('matches')
        .update({ status: 'matched', updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('id, status')
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ match: updated, result: 'matched' })
    }

    // Уже откликнулся или матч
    return NextResponse.json({ match: existing, result: 'already_responded' })
  }

  // Нет матча — создаём expert_liked
  const { data: created, error: createError } = await supabase
    .from('matches')
    .insert({ expert_id: profile.id, request_id, status: 'expert_liked' })
    .select('id, status')
    .single()

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  return NextResponse.json({ match: created, result: 'responded' }, { status: 201 })
}
