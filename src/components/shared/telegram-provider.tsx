'use client'

import { useAuth } from '@/hooks/use-auth'

function AuthInitializer() {
  useAuth()
  return null
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthInitializer />
      {children}
    </>
  )
}
