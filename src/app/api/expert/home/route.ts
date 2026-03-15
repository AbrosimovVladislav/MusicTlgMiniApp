import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram/validate'
import { createServiceClient } from '@/lib/supabase/service'

type MatchStatus = 'user_liked' | 'expert_liked' | 'matched' | 'paid'

interface RequestForExpert {
  id: string
  description: string
  status: string
  created_at: string
  is_active: boolean
  category: { id: string; name: string } | null
  subcategory: { id: string; name: string } | null
  user: { first_name: string; photo_url: string | null } | null
  match_status: MatchStatus | null
  match_id: string | null
}

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

  // Найти профиль эксперта
  const { data: profile, error: profileError } = await supabase
    .from('expert_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Категории эксперта
  const { data: expertCategories } = await supabase
    .from('expert_categories')
    .select('category_id')
    .eq('expert_id', profile.id)

  const categoryIds = expertCategories?.map((ec) => ec.category_id) ?? []

  // Раздел 1: запросы где пользователь лайкнул этого эксперта (user_liked)
  const { data: likedMeMatches } = await supabase
    .from('matches')
    .select(`
      id,
      status,
      request_id,
      requests!matches_request_id_fkey(
        id, description, status, created_at, is_active,
        category:categories!requests_category_id_fkey(id, name),
        subcategory:categories!requests_subcategory_id_fkey(id, name),
        user:users!requests_user_id_fkey(first_name, photo_url)
      )
    `)
    .eq('expert_id', profile.id)
    .eq('status', 'user_liked')
    .order('created_at', { ascending: false })

  const likedMe: RequestForExpert[] = (likedMeMatches ?? [])
    .filter((m) => m.requests !== null)
    .map((m) => {
      const req = m.requests as {
        id: string
        description: string
        status: string
        created_at: string
        is_active: boolean
        category: { id: string; name: string } | null
        subcategory: { id: string; name: string } | null
        user: { first_name: string; photo_url: string | null } | null
      }
      return {
        id: req.id,
        description: req.description,
        status: req.status,
        created_at: req.created_at,
        is_active: req.is_active,
        category: req.category,
        subcategory: req.subcategory,
        user: req.user,
        match_status: m.status,
        match_id: m.id,
      }
    })

  const likedMeRequestIds = likedMe.map((r) => r.id)

  // Раздел 2: все активные запросы по категориям эксперта
  // (исключая те, что уже в "Меня лайкнули")
  let byCategory: RequestForExpert[] = []

  if (categoryIds.length > 0) {
    const { data: categoryRequests } = await supabase
      .from('requests')
      .select(`
        id, description, status, created_at, is_active,
        category:categories!requests_category_id_fkey(id, name),
        subcategory:categories!requests_subcategory_id_fkey(id, name),
        user:users!requests_user_id_fkey(first_name, photo_url)
      `)
      .or(
        `category_id.in.(${categoryIds.join(',')}),subcategory_id.in.(${categoryIds.join(',')})`
      )
      .eq('status', 'published')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50)

    // Получить все матчи эксперта для этих запросов
    const allRequestIds = (categoryRequests ?? []).map((r) => r.id)
    let matchMap: Record<string, { id: string; status: 'user_liked' | 'expert_liked' | 'matched' | 'paid' }> = {}

    if (allRequestIds.length > 0) {
      const { data: expertMatches } = await supabase
        .from('matches')
        .select('id, request_id, status')
        .eq('expert_id', profile.id)
        .in('request_id', allRequestIds)

      matchMap = Object.fromEntries(
        (expertMatches ?? []).map((m) => [m.request_id, { id: m.id, status: m.status }])
      )
    }

    byCategory = (categoryRequests ?? [])
      .filter((r) => !likedMeRequestIds.includes(r.id))
      .map((r) => {
        const match = matchMap[r.id]
        return {
          id: r.id,
          description: r.description,
          status: r.status,
          created_at: r.created_at,
          is_active: r.is_active,
          category: r.category as { id: string; name: string } | null,
          subcategory: r.subcategory as { id: string; name: string } | null,
          user: r.user as { first_name: string; photo_url: string | null } | null,
          match_status: (match?.status ?? null) as 'user_liked' | 'expert_liked' | 'matched' | 'paid' | null,
          match_id: match?.id ?? null,
        }
      })
  }

  return NextResponse.json({ liked_me: likedMe, by_category: byCategory })
}
