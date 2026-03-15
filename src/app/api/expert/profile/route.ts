import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram/validate'
import { createServiceClient } from '@/lib/supabase/service'

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

  const {
    initDataRaw,
    first_name,
    last_name,
    description,
    category_ids,
    consultation_price,
    telegram_username,
  } = body as Record<string, unknown>

  if (typeof initDataRaw !== 'string' || !initDataRaw) {
    return NextResponse.json({ error: 'initDataRaw is required' }, { status: 400 })
  }
  if (typeof description !== 'string' || description.trim().length < 20) {
    return NextResponse.json({ error: 'Description too short' }, { status: 400 })
  }
  if (!Array.isArray(category_ids) || category_ids.length === 0) {
    return NextResponse.json({ error: 'At least one category required' }, { status: 400 })
  }
  if (typeof consultation_price !== 'number' || consultation_price <= 0) {
    return NextResponse.json({ error: 'Invalid consultation price' }, { status: 400 })
  }
  if (typeof telegram_username !== 'string' || telegram_username.trim().length < 2) {
    return NextResponse.json({ error: 'Telegram username is required' }, { status: 400 })
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

  // Get user by telegram_user_id
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_user_id', Number(tgUser.id))
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Update first_name / last_name if provided
  if (typeof first_name === 'string' && first_name.trim()) {
    await supabase
      .from('users')
      .update({
        first_name: first_name.trim(),
        last_name: typeof last_name === 'string' ? last_name.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
  }

  // Upsert expert_profile
  const { data: profile, error: profileError } = await supabase
    .from('expert_profiles')
    .upsert(
      {
        user_id: user.id,
        description: description.trim(),
        consultation_price,
        telegram_username: (telegram_username as string).replace(/^@/, '').trim(),
        is_visible: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('id')
    .single()

  if (profileError || !profile) {
    console.error('[/api/expert/profile] upsert error:', profileError?.message)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }

  // Replace expert_categories
  await supabase.from('expert_categories').delete().eq('expert_id', profile.id)

  const categoryRows = (category_ids as string[]).map((category_id) => ({
    expert_id: profile.id,
    category_id,
  }))

  const { error: catError } = await supabase.from('expert_categories').insert(categoryRows)

  if (catError) {
    console.error('[/api/expert/profile] categories error:', catError.message)
    return NextResponse.json({ error: 'Failed to save categories' }, { status: 500 })
  }

  return NextResponse.json({ success: true, profile_id: profile.id })
}
