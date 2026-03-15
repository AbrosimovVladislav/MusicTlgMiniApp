import { createClient } from '@/lib/supabase/server'
import { ProfileSetupForm } from '@/components/expert/profile-setup-form'

export default async function ProfileSetupPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, sort_order')
    .order('sort_order')

  return <ProfileSetupForm categories={categories ?? []} />
}
