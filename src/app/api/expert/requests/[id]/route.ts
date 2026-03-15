import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram/validate'
import { createServiceClient } from '@/lib/supabase/service'

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

  const { data: req, error: reqError } = await supabase
    .from('requests')
    .select(`
      id, description, status, is_active, budget, created_at,
      category:categories!requests_category_id_fkey(id, name),
      subcategory:categories!requests_subcategory_id_fkey(id, name),
      user:users!requests_user_id_fkey(first_name, photo_url)
    `)
    .eq('id', id)
    .maybeSingle()

  if (reqError || !req) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  // Найти матч эксперта с этим запросом
  const { data: match } = await supabase
    .from('matches')
    .select('id, status')
    .eq('expert_id', profile.id)
    .eq('request_id', id)
    .maybeSingle()

  return NextResponse.json({
    request: {
      ...req,
      match_status: match?.status ?? null,
      match_id: match?.id ?? null,
    },
  })
}
