import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram/validate'
import { createServiceClient } from '@/lib/supabase/service'

function getInitDataRaw(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('tma ')) return auth.slice(4)
  return null
}

export interface PaymentResponse {
  success: true
  telegram_username: string | null
  expert_name: string
  already_paid?: true
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

  const { match_id } = body as Record<string, unknown>
  if (typeof match_id !== 'string' || !match_id) {
    return NextResponse.json({ error: 'match_id is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Find user
  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_user_id', Number(tgUser.id))
    .single()

  if (userError || !dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Find match — consistent 404 for not found or unauthorized (IDOR protection)
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, status, expert_id, request_id')
    .eq('id', match_id)
    .maybeSingle()

  if (matchError || !match) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Verify ownership via request (same 404 to avoid leaking match existence)
  const { data: req, error: reqError } = await supabase
    .from('requests')
    .select('id, status')
    .eq('id', match.request_id)
    .eq('user_id', dbUser.id)
    .maybeSingle()

  if (reqError || !req) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Get expert profile
  const { data: expertProfile, error: profileError } = await supabase
    .from('expert_profiles')
    .select('telegram_username, display_first_name, display_last_name')
    .eq('id', match.expert_id)
    .single()

  if (profileError || !expertProfile) {
    return NextResponse.json({ error: 'Expert profile not found' }, { status: 404 })
  }

  const expertName =
    [expertProfile.display_first_name, expertProfile.display_last_name]
      .filter(Boolean)
      .join(' ') || 'Эксперт'

  // Idempotency: already paid — return success without re-processing
  if (match.status === 'paid') {
    return NextResponse.json({
      success: true,
      telegram_username: expertProfile.telegram_username,
      expert_name: expertName,
      already_paid: true,
    } satisfies PaymentResponse & { already_paid: true })
  }

  // Guard: must be in matched status
  if (match.status !== 'matched') {
    return NextResponse.json({ error: 'Match is not in matched status' }, { status: 409 })
  }

  // Update match to paid
  const { error: matchUpdateError } = await supabase
    .from('matches')
    .update({ status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', match_id)

  if (matchUpdateError) {
    return NextResponse.json({ error: matchUpdateError.message }, { status: 500 })
  }

  // Update request to in_progress — allow from published or matched
  await supabase
    .from('requests')
    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', match.request_id)
    .in('status', ['published', 'matched'])

  return NextResponse.json({
    success: true,
    telegram_username: expertProfile.telegram_username,
    expert_name: expertName,
  } satisfies PaymentResponse)
}
