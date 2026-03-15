import { createClient } from '@/lib/supabase/server'
import { ExpertProfileEditForm } from '@/components/expert/expert-profile-edit-form'

export default async function ExpertProfileEditPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, sort_order')
    .order('sort_order')

  return <ExpertProfileEditForm categories={categories ?? []} />
}
