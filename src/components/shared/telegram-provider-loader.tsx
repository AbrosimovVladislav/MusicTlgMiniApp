'use client'

import dynamic from 'next/dynamic'

const TelegramProvider = dynamic(
  () => import('./telegram-provider').then((m) => m.TelegramProvider),
  { ssr: false }
)

export function TelegramProviderLoader({ children }: { children: React.ReactNode }) {
  return <TelegramProvider>{children}</TelegramProvider>
}
