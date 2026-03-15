import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram/validate'
import { createServiceClient } from '@/lib/supabase/service'

function getInitDataRaw(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('tma ')) return auth.slice(4)
  return null
}

export interface ExpertCardData {
  id: string
  user: {
    first_name: string
    last_name: string | null
    photo_url: string | null
  }
  description: string | null
  consultation_price: number | null
  categories: { id: string; name: string }[]
  match_status: 'user_liked' | 'expert_liked' | 'matched' | 'paid' | null
  match_id: string | null
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

  // Найти пользователя
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_user_id', Number(tgUser.id))
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Получить запрос — убедиться что он принадлежит пользователю
  const { data: req, error: reqError } = await supabase
    .from('requests')
    .select('id, category_id, subcategory_id')
    .eq('id', requestId)
    .eq('user_id', user.id)
    .single()

  if (reqError || !req) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  // Собрать релевантные category_id для поиска экспертов
  const relevantCategoryIds = [req.category_id, req.subcategory_id].filter(Boolean) as string[]

  if (relevantCategoryIds.length === 0) {
    return NextResponse.json({ experts: [] })
  }

  // Найти expert_profiles у которых есть хотя бы одна из этих категорий
  const { data: expertCatRows, error: catError } = await supabase
    .from('expert_categories')
    .select('expert_id')
    .in('category_id', relevantCategoryIds)

  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 })
  }

  const expertIds = [...new Set((expertCatRows ?? []).map((r) => r.expert_id))]

  if (expertIds.length === 0) {
    return NextResponse.json({ experts: [] })
  }

  // Загрузить профили экспертов с пользователями
  const { data: profiles, error: profilesError } = await supabase
    .from('expert_profiles')
    .select(`
      id,
      description,
      consultation_price,
      users!expert_profiles_user_id_fkey(first_name, last_name, photo_url)
    `)
    .in('id', expertIds)
    .eq('is_visible', true)

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  // Загрузить все категории для этих экспертов
  const { data: allExpertCats } = await supabase
    .from('expert_categories')
    .select('expert_id, categories(id, name)')
    .in('expert_id', expertIds)

  const categoryMap: Record<string, { id: string; name: string }[]> = {}
  for (const row of allExpertCats ?? []) {
    if (!categoryMap[row.expert_id]) categoryMap[row.expert_id] = []
    if (row.categories) {
      categoryMap[row.expert_id].push(row.categories as { id: string; name: string })
    }
  }

  // Загрузить существующие матчи для этого запроса
  const { data: existingMatches } = await supabase
    .from('matches')
    .select('id, expert_id, status')
    .eq('request_id', requestId)
    .in('expert_id', expertIds)

  const matchMap: Record<string, { id: string; status: 'user_liked' | 'expert_liked' | 'matched' | 'paid' }> = {}
  for (const m of existingMatches ?? []) {
    matchMap[m.expert_id] = { id: m.id, status: m.status }
  }

  const experts: ExpertCardData[] = (profiles ?? []).map((p) => {
    const userRow = p.users as { first_name: string; last_name: string | null; photo_url: string | null } | null
    const match = matchMap[p.id]
    return {
      id: p.id,
      user: {
        first_name: userRow?.first_name ?? '',
        last_name: userRow?.last_name ?? null,
        photo_url: userRow?.photo_url ?? null,
      },
      description: p.description,
      consultation_price: p.consultation_price,
      categories: categoryMap[p.id] ?? [],
      match_status: match?.status ?? null,
      match_id: match?.id ?? null,
    }
  })

  return NextResponse.json({ experts })
}
