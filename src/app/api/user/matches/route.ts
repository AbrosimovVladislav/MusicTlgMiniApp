import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram/validate'
import { createServiceClient } from '@/lib/supabase/service'

function getInitDataRaw(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('tma ')) return auth.slice(4)
  return null
}

export interface MatchWithExpert {
  match_id: string
  match_status: 'user_liked' | 'expert_liked' | 'matched' | 'paid'
  expert_id: string
  expert: {
    first_name: string
    last_name: string | null
    photo_url: string | null
    description: string | null
    consultation_price: number | null
    categories: { id: string; name: string }[]
  }
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

  const requestId = request.nextUrl.searchParams.get('request_id')
  if (!requestId) {
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

  // Проверить что запрос принадлежит пользователю
  const { data: req, error: reqError } = await supabase
    .from('requests')
    .select('id')
    .eq('id', requestId)
    .eq('user_id', user.id)
    .single()

  if (reqError || !req) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  // Получить все матчи для этого запроса
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, expert_id, status')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 })
  }

  if (!matches || matches.length === 0) {
    return NextResponse.json({ matches: [] })
  }

  const expertIds = matches.map((m) => m.expert_id)

  // Загрузить профили
  const { data: profiles } = await supabase
    .from('expert_profiles')
    .select(`
      id,
      description,
      consultation_price,
      users!expert_profiles_user_id_fkey(first_name, last_name, photo_url)
    `)
    .in('id', expertIds)

  // Загрузить категории
  const { data: expertCats } = await supabase
    .from('expert_categories')
    .select('expert_id, categories(id, name)')
    .in('expert_id', expertIds)

  const categoryMap: Record<string, { id: string; name: string }[]> = {}
  for (const row of expertCats ?? []) {
    if (!categoryMap[row.expert_id]) categoryMap[row.expert_id] = []
    if (row.categories) {
      categoryMap[row.expert_id].push(row.categories as { id: string; name: string })
    }
  }

  const profileMap: Record<string, typeof profiles extends (infer T)[] | null ? T : never> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = p
  }

  const result: MatchWithExpert[] = matches.map((m) => {
    const p = profileMap[m.expert_id]
    const userRow = p?.users as { first_name: string; last_name: string | null; photo_url: string | null } | null
    return {
      match_id: m.id,
      match_status: m.status,
      expert_id: m.expert_id,
      expert: {
        first_name: userRow?.first_name ?? '',
        last_name: userRow?.last_name ?? null,
        photo_url: userRow?.photo_url ?? null,
        description: p?.description ?? null,
        consultation_price: p?.consultation_price ?? null,
        categories: categoryMap[m.expert_id] ?? [],
      },
    }
  })

  return NextResponse.json({ matches: result })
}
