# Feature: Expert Profile & Expert Home

## Статус

✅ Полностью реализовано (Phase 2 + Phase 5)

---

## Флоу эксперта

```
Выбор роли "Эксперт"
       ↓
/expert/profile/setup  (4-шаговая форма)
       ↓ сохранить
/expert/home  (главная эксперта)
       ↓ клик на запрос
/expert/requests/[id]  (детали + откликнуться)
```

---

## Экраны

### 1. `/expert/profile/setup`

**Компонент:** `components/expert/profile-setup-form.tsx`

4 шага:
1. **О себе** — имя, фамилия, фото из Telegram
2. **Опыт** — текстовое описание (мин. 20 символов, макс. 500)
3. **Специализация** — выбор категорий (мин. 1)
4. **Стоимость** — цена консультации (₽) + Telegram username

После сохранения → редирект на `/expert/home`

---

### 2. `/expert/home`

**Компонент:** `app/expert/home/page.tsx`

При загрузке:
- GET `/api/expert/profile` — если 404, редирект на `/expert/profile/setup`
- GET `/api/expert/home` — загружает два раздела

**Раздел "Меня лайкнули"** (приоритет):
- Запросы, где юзер лайкнул этого эксперта (`match_status = user_liked`)
- Карточка выделена фиолетовым бордером

**Раздел "Запросы по вашим категориям"**:
- Все активные `published` запросы, где `category_id` или `subcategory_id` совпадает с категориями эксперта
- Исключаются запросы из раздела "Меня лайкнули"
- Показывает статус матча если есть (`expert_liked`)

---

### 3. `/expert/requests/[id]`

**Компонент:** `app/expert/requests/[id]/page.tsx`

Показывает:
- Имя автора запроса
- Категория / подкатегория
- Полное описание запроса
- Бюджет (если указан)
- Текущий статус матча (баннер)

**Кнопки:**
| Ситуация | Кнопка |
|----------|--------|
| Нет матча | "Откликнуться" → `expert_liked` |
| `user_liked` | "❤️ Принять — это матч!" → `matched` |
| `expert_liked` | "Отклик уже отправлен" (disabled) |
| `matched` / `paid` | "Матч состоялся" (disabled) |

---

## API

### `GET /api/expert/profile`

Заголовок: `Authorization: tma <initDataRaw>`

Возвращает профиль эксперта с категориями. `404` если профиль не создан.

```json
{
  "profile": {
    "id": "uuid",
    "description": "...",
    "consultation_price": 3000,
    "telegram_username": "username",
    "is_visible": true,
    "user": { "first_name": "...", "last_name": null, "photo_url": "..." },
    "categories": [{ "id": "uuid", "name": "Сведение", "parent_id": "uuid" }]
  }
}
```

### `POST /api/expert/profile`

Создаёт / обновляет профиль эксперта. Body содержит `initDataRaw` + все поля профиля.

### `GET /api/expert/home`

Заголовок: `Authorization: tma <initDataRaw>`

```json
{
  "liked_me": [RequestForExpert],
  "by_category": [RequestForExpert]
}
```

`RequestForExpert`:
```typescript
{
  id: string
  description: string
  status: string
  created_at: string
  category: { id: string; name: string } | null
  subcategory: { id: string; name: string } | null
  user: { first_name: string; photo_url: string | null } | null
  match_status: 'user_liked' | 'expert_liked' | 'matched' | 'paid' | null
  match_id: string | null
}
```

### `GET /api/expert/requests/[id]`

Заголовок: `Authorization: tma <initDataRaw>`

Возвращает детали запроса + `match_status` и `match_id` для этого эксперта.

### `POST /api/matches`

Заголовок: `Authorization: tma <initDataRaw>`

Body:
```json
{ "request_id": "uuid" }
```

Ответ:
```json
{
  "match": { "id": "uuid", "status": "expert_liked" | "matched" },
  "result": "responded" | "matched" | "already_responded"
}
```

Логика:
- Нет матча → создаёт `expert_liked`
- Есть `user_liked` → обновляет до `matched`
- Есть `expert_liked` / `matched` → возвращает `already_responded`

---

## База данных

**Таблицы:**
- `expert_profiles` — профиль (user_id FK, description, consultation_price, telegram_username, is_visible)
- `expert_categories` — категории эксперта (expert_id FK, category_id FK)
- `matches` — матчи (expert_id FK → expert_profiles.id, request_id FK, status enum)

**match_status enum:** `user_liked` | `expert_liked` | `matched` | `paid`
