'use client'

import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store/auth'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  activeIcon: React.ReactNode
}

function HomeIcon({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function ProfileIcon({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

const USER_NAV: NavItem[] = [
  {
    label: 'Главная',
    href: '/user/home',
    icon: <HomeIcon />,
    activeIcon: <HomeIcon filled />,
  },
  {
    label: 'Профиль',
    href: '/profile',
    icon: <ProfileIcon />,
    activeIcon: <ProfileIcon filled />,
  },
]

const EXPERT_NAV: NavItem[] = [
  {
    label: 'Главная',
    href: '/expert/home',
    icon: <HomeIcon />,
    activeIcon: <HomeIcon filled />,
  },
  {
    label: 'Профиль',
    href: '/profile',
    icon: <ProfileIcon />,
    activeIcon: <ProfileIcon filled />,
  },
]

export function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, currentMode } = useAuthStore()

  if (!user?.role) return null

  const items = currentMode === 'expert' ? EXPERT_NAV : USER_NAV

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-end px-2"
      style={{
        background: 'rgba(11, 0, 42, 0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
        paddingTop: '10px',
      }}
    >
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={cn(
              'flex flex-col items-center gap-1 px-6 py-1 rounded-xl transition-all duration-200 active:scale-90',
              isActive ? 'text-white' : 'text-muted'
            )}
          >
            <span
              className="transition-all duration-200"
              style={isActive ? { filter: 'drop-shadow(0 0 8px rgba(68,0,255,0.7))' } : undefined}
            >
              {isActive ? item.activeIcon : item.icon}
            </span>
            <span className={cn('text-[10px] font-medium transition-colors duration-200', isActive ? 'text-white' : 'text-muted')}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
