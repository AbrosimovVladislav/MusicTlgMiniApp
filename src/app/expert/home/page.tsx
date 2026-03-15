import { RouteGuard } from '@/components/shared/route-guard'

export default function ExpertHomePage() {
  return (
    <RouteGuard allowedRole="expert">
      <main className="min-h-screen flex flex-col items-center justify-center px-5 text-center">
        <div className="text-4xl mb-4">🎤</div>
        <h1 className="text-xl font-semibold text-white">Привет, Эксперт!</h1>
        <p className="text-text-secondary text-sm mt-2">
          Здесь будет твой главный экран.
          <br />Фаза 2 — профиль эксперта.
        </p>
      </main>
    </RouteGuard>
  )
}
