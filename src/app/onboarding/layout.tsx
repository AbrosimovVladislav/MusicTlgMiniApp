import { RouteGuard } from '@/components/shared/route-guard'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // allowedRole не задан → только для пользователей БЕЗ роли
  return <RouteGuard>{children}</RouteGuard>
}
