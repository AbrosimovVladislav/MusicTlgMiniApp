import { RouteGuard } from '@/components/shared/route-guard'
import { RequestDetail } from '@/components/requests/request-detail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RequestDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <RouteGuard allowedRole="user">
      <RequestDetail requestId={id} />
    </RouteGuard>
  )
}
