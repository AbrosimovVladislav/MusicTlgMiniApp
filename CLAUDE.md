# CLAUDE.md — MusicTlgMiniApp

## Overview

This file defines the rules, patterns, and conventions Claude must follow for this project. Read this file fully before starting any task.

---

## Current Project

**MusicTlgMiniApp** — Telegram Mini App на музыкальную тематику.

Stack: Next.js + TypeScript + Tailwind CSS v4 + Supabase + @telegram-apps/sdk-react.

Документация: [`docs/INDEX.md`](docs/INDEX.md)

---

## Session Protocol

**Каждая новая сессия должна начинаться так:**

1. Прочитать [`docs/INDEX.md`](docs/INDEX.md) — он укажет, куда идти дальше
2. По ссылкам из INDEX прочитать нужные части доки (plan, progress, architecture)
3. Определить, на каком шаге находимся
4. Сообщить пользователю:
   - Текущий шаг и его цель
   - Что уже сделано
   - Что осталось сделать
   - Предложить конкретное следующее действие

**Правила работы с документацией:**
- После любых изменений — обновить соответствующий doc-файл
- Завершил шаг → обновить статус в `docs/roadmap.md` и `docs/INDEX.md`
- Начали новую фичу → создать файл в `docs/features/`
- Приняли дизайн-решение → зафиксировать в `docs/design.md`
- Статус в `docs/INDEX.md` держать актуальным

Не начинать писать код без подтверждения от пользователя.

---

## Mobile-First Mandate

Telegram Mini App открывается **только в мобильном клиенте Telegram**.

- Все экраны — mobile-first, никакого desktop-layout
- Максимальная ширина контента: `max-w-md` (448px)
- На широких экранах — центрируется как мобильное приложение
- Touch-friendly: кнопки минимум 44px, никаких hover-only элементов
- Bottom navigation (не sidebar, не top nav)
- Учитывать safe area / viewport Telegram: `100vh` заменить на `var(--tg-viewport-height)`
- Уважать тему Telegram (dark/light) через CSS-переменные SDK

---

## Tech Stack

- **Framework**: Next.js 15 (App Router) — Turbopack по умолчанию
- **Language**: TypeScript (strict mode, no `any`)
- **Styling**: Tailwind CSS v4 + CSS-first конфигурация через `@theme` в globals.css (без `tailwind.config.js`)
- **UI Components**: shadcn/ui — Radix UI, Base UI
- **Telegram SDK**: `@tma.js/sdk-react` v3 — initData, viewport, theme params, back button, haptics
- **Database**: Supabase — `@supabase/supabase-js` v2, `@supabase/ssr`
- **State Management**: Zustand для глобального состояния, TanStack Query v5 для серверного
- **Forms**: React Hook Form v7 + Zod v3
- **Icons**: Lucide React

---

## Project Structure

```
/app                    # Next.js App Router pages & layouts
  /api                  # API route handlers (включая Telegram webhook)
  /[feature]            # Страницы фич приложения
/components
  /ui                   # shadcn/ui primitives (auto-generated, не редактировать вручную)
  /shared               # Переиспользуемые компоненты
  /[feature]            # Компоненты конкретных фич
/lib
  /supabase             # Supabase client, server helpers
  /telegram             # Telegram initData validation, helpers
  /utils.ts             # cn(), formatters, helpers
  /validations          # Zod schemas
/hooks                  # Custom React hooks
/types                  # Global TypeScript types
/public                 # Static assets
```

---

## Telegram Mini App Patterns

### SDK Initialization

`@tma.js/sdk-react` — hooks-only библиотека, провайдер не нужен. Хуки работают напрямую в клиентских компонентах.

```typescript
// Доступные хуки:
import { useLaunchParams, useRawInitData, useSignal } from '@tma.js/sdk-react'
```

### Получение пользователя из initData

```typescript
'use client'
import { useLaunchParams } from '@tma.js/sdk-react'

export function useCurrentUser() {
  const launchParams = useLaunchParams()
  return launchParams?.initData?.user ?? null
}
```

### Валидация initData на сервере (API Routes)

```typescript
// lib/telegram/validate.ts
import { validate, parse } from '@telegram-apps/init-data-node'

export function validateTelegramInitData(initDataRaw: string) {
  validate(initDataRaw, process.env.TELEGRAM_BOT_TOKEN!)
  return parse(initDataRaw)
}
```

### Тема Telegram

```typescript
// Подписка на тему в layout или provider
import { useThemeParams } from '@tma.js/sdk-react'

// CSS переменные Telegram доступны напрямую:
// var(--tg-theme-bg-color)
// var(--tg-theme-text-color)
// var(--tg-theme-button-color)
// var(--tg-theme-accent-text-color)
```

### Viewport и Safe Area

```typescript
// Всегда использовать viewport height из Telegram SDK, не 100vh
import { useViewport } from '@tma.js/sdk-react'

// В CSS:
// height: var(--tg-viewport-stable-height)
```

### Back Button

```typescript
'use client'
import { useBackButton } from '@tma.js/sdk-react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useBackNavigation() {
  const backButton = useBackButton()
  const router = useRouter()

  useEffect(() => {
    backButton.show()
    backButton.on('click', () => router.back())
    return () => backButton.hide()
  }, [backButton, router])
}
```

---

## Code Style Rules

### General

- Всегда предпочитать **Server Components**, если компонент не требует интерактивности
- Клиентские компоненты явно помечать `"use client"`
- `cn()` из `lib/utils` для всех условных Tailwind классов
- Имена файлов: **kebab-case** (`track-card.tsx`)
- Имена компонентов: **PascalCase** (`TrackCard`)
- Никогда не использовать `any` — использовать `unknown` и narrowing

### TypeScript

```typescript
// ✅ Good
interface TrackCardProps {
  track: Pick<Track, 'id' | 'title' | 'artist' | 'coverUrl'>
  onPlay?: (id: string) => void
}

// ❌ Bad
const TrackCard = (props: any) => { ... }
```

### Imports order

1. React / Next.js
2. Сторонние библиотеки (включая @telegram-apps/*)
3. Internal components (`@/components/...`)
4. Internal lib/hooks/types (`@/lib/...`, `@/hooks/...`, `@/types/...`)
5. Styles

---

## Design System

### Philosophy

Телеграм Mini App с музыкальной нишей — эстетика должна быть **тёмная, иммерсивная, музыкальная**. Никаких generic AI-интерфейсов.

Перед созданием любого компонента или страницы — читать **frontend-design skill** (`~/.claude/skills/frontend-design/SKILL.md`).

### Aesthetic Direction

**Dark / Immersive / Musical** — вдохновение: Spotify, Apple Music, музыкальные плееры.

- Тёмный фон с глубиной (многослойность)
- Акцентный цвет — сине-фиолетовый градиент (`#4400FF → #3901D2`)
- Фото артистов как главный визуальный элемент
- Плавные переходы, blur-эффекты, градиенты

### Typography Rules

- **Шрифт**: **Poppins** (SemiBold 600, Medium 500, Regular 400) — загружать через `next/font/google`
- **Никогда**: Inter, Roboto, Arial как основной шрифт

### Color Tokens (globals.css)

Детальное описание — [`docs/design.md`](docs/design.md).

```css
@import "tailwindcss";

@theme {
  --color-bg: #0b002a;
  --color-bg-secondary: #171039;

  --color-accent-from: #4400ff;
  --color-accent-to: #3901d2;

  --color-text: #ffffff;
  --color-text-secondary: rgba(255, 255, 255, 0.6);
  --color-muted: #a092b2;

  --color-border: rgba(255, 255, 255, 0.08);

  --font-sans: "Poppins", sans-serif;
}
```

### Spacing & Layout

- Spacing scale Tailwind — последовательно
- Bottom navigation height: `h-16` (64px) + safe area
- Контент не должен перекрываться bottom nav — `pb-20` на основном контейнере

---

## Supabase Patterns

### Client Setup

```typescript
// lib/supabase/client.ts — browser client
import { createBrowserClient } from '@supabase/ssr'
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// lib/supabase/server.ts — server component client
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export const createClient = async () => { ... }
```

### Auth Strategy

Авторизация — через **Telegram initData**, не через Supabase Auth.

- Telegram User ID используется как идентификатор пользователя
- API роуты валидируют initData перед любым запросом к БД
- В Supabase таблицах поле `telegram_user_id bigint` как основной идентификатор

### Data Fetching

```typescript
// ✅ Всегда типизировать запросы
const { data, error } = await supabase
  .from('tracks')
  .select('id, title, artist, cover_url, duration')
  .eq('is_published', true)
  .order('created_at', { ascending: false })

if (error) throw new Error(error.message)
```

---

## MCP Servers

### Supabase MCP

- Перед любым запросом к БД → интроспектировать схему через MCP
- При создании миграций и новых таблиц
- Для генерации TypeScript типов из схемы

**Workflow:**
1. MCP → список таблиц и колонок
2. Не придумывать имена колонок — всегда проверять через MCP
3. `supabase gen types` для TypeScript типов

---

## Common Patterns

### Server Action

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTrack(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('tracks').insert({ ... })
  if (error) return { success: false, error: error.message }
  revalidatePath('/tracks')
  return { success: true }
}
```

### Loading & Error States

- Всегда обрабатывать `loading`, `error`, `empty` для компонентов с data fetching
- `Suspense` + `loading.tsx` для page-level loading
- `error.tsx` для page-level error boundary

---

## Performance Rules

- Images: `next/image` с явными `width` / `height` или `fill`
- Fonts: только через `next/font` — никогда `<link>` в HTML
- Dynamic imports: `next/dynamic` для тяжёлых компонентов (аудио-плеер, визуализации)
- Bundle: импортировать только нужные иконки, не весь пакет

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-only, никогда не в клиент

# Telegram
TELEGRAM_BOT_TOKEN=             # server-only, для валидации initData
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=
```

Никогда не передавать `SUPABASE_SERVICE_ROLE_KEY` и `TELEGRAM_BOT_TOKEN` в клиентские компоненты.

---

## Skills Reference

| Task                                    | Skill            |
| --------------------------------------- | ---------------- |
| Любой UI компонент, страница            | `frontend-design` |
| Word document export                    | `docx`           |
| PDF generation                          | `pdf`            |
| Excel / spreadsheet                     | `xlsx`           |
| Anthropic API в приложении              | `product-self-knowledge` |

**Правило**: Всегда читать соответствующий skill перед началом задачи.

---

## What Claude Should NOT Do

- ❌ Использовать тип `any`
- ❌ Использовать generic шрифты (Inter, Roboto, Arial) как основной
- ❌ Придумывать имена колонок Supabase без проверки схемы
- ❌ Использовать `100vh` вместо `var(--tg-viewport-stable-height)`
- ❌ Игнорировать тему Telegram (dark/light) при стилизации
- ❌ Пропускать валидацию initData в API роутах
- ❌ Делать UI без чтения `frontend-design` skill
- ❌ Пропускать loading/error состояния в data-fetching компонентах
- ❌ Клиентский компонент там, где хватит серверного
