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

  const { expert_id, request_id } = body as Record<string, unknown>

  if (typeof expert_id !== 'string' || !expert_id) {
    return NextResponse.json({ error: 'expert_id is required' }, { status: 400 })
  }
  if (typeof request_id !== 'string' || !request_id) {
    return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Найти пользователя
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_user_id', Number(tgUser.id))
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Убедиться что запрос принадлежит пользователю
  const { data: req, error: reqError } = await supabase
    .from('requests')
    .select('id')
    .eq('id', request_id)
    .eq('user_id', user.id)
    .single()

  if (reqError || !req) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  // Проверить существующий матч
  const { data: existing } = await supabase
    .from('matches')
    .select('id, status')
    .eq('expert_id', expert_id)
    .eq('request_id', request_id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'expert_liked') {
      // Эксперт уже откликнулся — взаимный матч
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

    // Уже лайкнул или матч
    return NextResponse.json({ match: existing, result: 'already_liked' })
  }

  // Нет матча — создаём user_liked
  const { data: created, error: createError } = await supabase
    .from('matches')
    .insert({ expert_id, request_id, status: 'user_liked' })
    .select('id, status')
    .single()

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  return NextResponse.json({ match: created, result: 'liked' }, { status: 201 })
}
