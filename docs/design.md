# Design

> Детализированное описание дизайна: визуальное направление, токены, типографика, компоненты.
> Источник: Figma референс (threelegsteam@gmail.com, файл `zhtYkkEiLLt7tDYFE2EYMa`)

---

## Визуальное направление

**Dark / Immersive / Musical** — тёмный navy/indigo фон, яркий сине-фиолетовый акцент, иммерсивные фото артистов и исполнителей.

Вдохновение: музыкальные мобильные плееры (Spotify, Apple Music). Акцент на фотографиях артистов, blur-эффектах, глубине слоёв.

---

## Цвета

| Токен | Hex | Назначение |
|---|---|---|
| `--color-bg` | `#0b002a` | Основной фон страниц |
| `--color-bg-secondary` | `#171039` | Карточки, поверхности |
| `--color-accent-from` | `#4400FF` | Акцент (начало градиента) |
| `--color-accent-to` | `#3901D2` | Акцент (конец градиента) |
| `--color-muted` | `#A092B2` | Второстепенный текст, иконки |
| `--color-text` | `#FFFFFF` | Основной текст |
| `--color-text-secondary` | `rgba(255,255,255,0.6)` | Второстепенный текст |
| `--color-border` | `rgba(255,255,255,0.08)` | Границы, разделители |

**Акцентный градиент:** `linear-gradient(162deg, #4400FF 18%, #3901D2 103%)`

---

## Типографика

**Шрифт:** Poppins (загружать через `next/font/google`)

| Начертание | Использование |
|---|---|
| SemiBold (600) | Заголовки, кнопки |
| Medium (500) | Подзаголовки, метки |
| Regular (400) | Основной текст, описания |

```css
/* Подключение */
import { Poppins } from 'next/font/google'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})
```

---

## Компоненты (ключевые паттерны)

### Кнопки
- Primary: gradient `#4400FF → #3901D2`, `border-radius: 1000px`, `border: 1px solid rgba(255,255,255,0.02)`
- Secondary/Ghost: `background: rgba(255,255,255,0.08)`, `border-radius: 99px`

### Карточки
- Background: `#171039`
- Border: `1px solid rgba(255,255,255,0.08)`
- Border-radius: `16px`

### Фильтры / чипы
- Inactive: `background: rgba(255,255,255,0.08)`, text `rgba(255,255,255,0.6)`
- Active: accent gradient фон, text `#FFFFFF`

### Bottom Navigation
- Background: `#171039` + blur
- Height: `64px` + safe area
- 4 иконки

---

## Figma референс

- Файл: `zhtYkkEiLLt7tDYFE2EYMa`
- Презентация: `node-id=43:28`
- Color & Typography: `node-id=43:32`
- App screens: `node-id=43:64`
