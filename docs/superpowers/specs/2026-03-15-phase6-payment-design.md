# Phase 6 — Оплата и передача контактов

**Дата:** 2026-03-15
**Статус:** Approved

---

## Цель

Финальный шаг MVP — после взаимного матча пользователь оплачивает консультацию (мок) и получает Telegram username эксперта.

---

## БД — подтверждённые колонки

| Таблица | Колонка | Тип | Примечание |
|---|---|---|---|
| `matches` | `status` | enum | значения: `user_liked`, `expert_liked`, `matched`, `paid` — все есть |
| `requests` | `status` | enum | значения: `draft`, `published`, `matched`, `in_progress`, `completed` — все есть |
| `expert_profiles` | `telegram_username` | text, nullable | username эксперта — берём отсюда |
| `expert_profiles` | `consultation_price` | integer, nullable | цена консультации — берём отсюда |
| `expert_profiles` | `display_first_name` | text, nullable | имя эксперта |
| `expert_profiles` | `display_last_name` | text, nullable | фамилия эксперта |

Миграции не требуются.

---

## Флоу

```
Home (карточка запроса со статусом requests.status = 'matched' ИЛИ наличие matches.status = 'matched')
  → кнопка «Оплатить консультацию»
  → /user/requests/[id]/payment/[matchId]
  → idle: блок эксперта + захардкоженная карта + кнопка «Оплатить»
  → loading: 1500ms
  → success: username эксперта + «Написать в Telegram» + «Вернуться к запросу»
  → router.push('/user/requests/[id]')  → там статус in_progress, контакты видны
```

---

## Экраны

### 1. Request Card на Home — изменение `request-card.tsx`

**Условие показа:** в данных карточки есть `matched_match` — объект с первым матчем статуса `matched` (если несколько, берём первый по дате).

**Добавить под основным контентом:**
- Разделитель
- Пульсирующая зелёная точка + текст «Матч с [display_first_name display_last_name]»
- Кнопка «Оплатить консультацию» → `router.push('/user/requests/[id]/payment/[matchId]')`

**Если `matches.status = 'paid'`:** вместо кнопки оплаты показывать имя эксперта + кнопку «Написать» → `openLink('https://t.me/{telegram_username}')`.

### 2. Страница оплаты `/user/requests/[id]/payment/[matchId]`

**Состояния:** `idle` → `loading` → `success` → `error`

#### idle state
- Заголовок «Оплата консультации»
- Back Button Telegram SDK → `router.push('/user/requests/[id]')`
- Блок эксперта: фото (`photo_url` из `users`), `display_first_name display_last_name`, первая категория
- Сумма крупно: `{consultation_price} ₽` (из `expert_profiles.consultation_price`)
- Секция карты:
  - Захардкоженная карта с радио: `VISA •••• 4242` (selected)
  - Кнопка `+ Добавить карту` — визуальная, disabled
- CTA «Оплатить {consultation_price} ₽»

#### loading state
- При нажатии кнопки «Оплатить»: **синхронно** ставить `isLoading = true` — блокирует повторный клик немедленно
- CTA кнопка: disabled + spinner
- Остальной контент: opacity-50, pointer-events-none
- Back Button Telegram SDK: **скрыть** во время loading (нельзя навигировать назад пока идёт оплата)
- Через 1500ms → вызвать `POST /api/user/payment`

#### success state (replace всего контента страницы)
- Анимированная иконка чекмарка (зелёная)
- «Оплата прошла!»
- «Ваш эксперт: [Имя]»
- `@{telegram_username}` — крупно (если `telegram_username` null → показать «Контакт будет передан через бота»)
- Кнопка «Написать в Telegram» → `openLink('https://t.me/{telegram_username}')` через Telegram SDK (показывать только если `telegram_username` не null)
- Кнопка «Вернуться к запросу» → `router.push('/user/requests/[id]')`
- Back Button Telegram SDK → тоже `router.push('/user/requests/[id]')` (не возвращать на форму оплаты)

#### error state
- Иконка ошибки
- Текст ошибки из API
- Кнопка «Попробовать снова» → возвращает в idle state

### 3. Request Detail `/user/requests/[id]` — изменение

**Если `requests.status = 'in_progress'`:**
- Статус отображается как «В работе»
- Блок «Ваш эксперт»: фото, имя, `@telegram_username`, кнопка «Написать в Telegram»

---

## API

### `POST /api/user/payment`

**Auth:** `Authorization: tma {initDataRaw}`

**Body:** `{ "match_id": "uuid" }`

**Логика:**
1. Валидировать initData → `telegram_user_id`
2. Найти `users.id` по `telegram_user_id`
3. Найти матч: `matches WHERE id = match_id` — если не найден → **404** (не раскрывать существование чужого матча)
4. Найти запрос: `requests WHERE id = matches.request_id AND user_id = users.id` — если не найден → **404** (IDOR: одинаковый ответ независимо от того, матч существует или нет)
5. Проверить `matches.status`:
   - Если `paid` → идемпотентность: вернуть `{ success: true, telegram_username, already_paid: true }`
   - Если не `matched` → вернуть 409
6. Обновить `matches.status = 'paid'`
7. Обновить `requests.status = 'in_progress'` — только если текущий статус `matched` (guard: `WHERE status = 'matched'`)
8. Получить `expert_profiles WHERE id = matches.expert_id` → взять `telegram_username` (может быть null), `display_first_name`, `display_last_name`
9. Вернуть `{ success: true, telegram_username: string | null, expert_name: string }`

**Ответ 200:**
```json
{
  "success": true,
  "telegram_username": "expertusername",
  "expert_name": "Иван Петров"
}
```

**Ошибки:**
- 401 — невалидный initData
- 404 — матч не найден или не принадлежит этому пользователю
- 409 — матч не в статусе `matched` (и не `paid`)
- 500 — DB error

---

## API List Requests — изменение `GET /api/requests`

Добавить в ответ для каждого запроса поле `matched_match`:

```json
{
  "matched_match": {
    "match_id": "uuid",
    "match_status": "matched" | "paid",
    "expert_name": "Иван Петров",
    "expert_photo": "url",
    "consultation_price": 1500,
    "telegram_username": "string | null"  // только если match_status = 'paid'
  } | null
}
```

**Приоритет выборки:** если есть матч со статусом `paid` — вернуть его. Иначе — первый `matched` по дате. Логика: `paid` матч означает оплата прошла → показать контакты, а не кнопку оплаты повторно.

---

## Навигация

| Ситуация | Поведение |
|---|---|
| Back Button на payment idle | `router.push('/user/requests/[id]')` |
| Back Button на payment success | `router.push('/user/requests/[id]')` |
| Кнопка «Вернуться к запросу» | `router.push('/user/requests/[id]')` |
| «Написать в Telegram» | `openLink('https://t.me/{username}')` через SDK |

---

## Данные — refresh после оплаты

- После `POST /api/user/payment` успешен → `router.push('/user/requests/[id]')`
- Страница запроса при монтировании делает свежий fetch → получает актуальный статус `in_progress`
- Никакого кэша не нужно инвалидировать отдельно

---

## Multiple matched матчи

Редкий кейс. В MVP: на request card показываем только первый `matched` матч по дате создания. Пользователь платит за него. Остальные `matched` матчи остаются в статусе `matched` — обрабатываются позже (POST MVP).

---

## Out of scope (MVP)

- Реальная оплата (Telegram Stars, эквайринг)
- Уведомление эксперту об оплате через бота
- Отзыв после оплаты
- Автоматическое закрытие остальных `matched` матчей после оплаты
