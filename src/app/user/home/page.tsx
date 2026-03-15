import { RouteGuard } from '@/components/shared/route-guard'

export default function UserHomePage() {
  return (
    <RouteGuard allowedRole="user">
      <main className="min-h-screen flex flex-col items-center justify-center px-5 text-center">
        <div className="text-4xl mb-4">🎧</div>
        <h1 className="text-xl font-semibold text-white">Привет, Слушатель!</h1>
        <p className="text-text-secondary text-sm mt-2">
          Здесь будет твой главный экран.
          <br />Фаза 3 — совсем скоро.
        </p>
      </main>
    </RouteGuard>
  )
}
