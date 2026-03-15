import { RouteGuard } from '@/components/shared/route-guard'
import { CreateRequestForm } from '@/components/requests/create-request-form'

export default function NewRequestPage() {
  return (
    <RouteGuard allowedRole="user">
      <CreateRequestForm />
    </RouteGuard>
  )
}
