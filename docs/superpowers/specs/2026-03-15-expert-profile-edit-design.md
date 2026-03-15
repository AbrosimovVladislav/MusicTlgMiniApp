# Редактирование профиля эксперта — Спецификация

**Дата:** 2026-03-15
**Статус:** Утверждена

---

## Проблема

Из настроек (`/profile`) кнопка «Профиль эксперта» ведёт на `/expert/profile/setup` — 4-шаговый онбординг-визард. Эксперт вынужден заполнять все поля заново при каждом редактировании.

## Решение

Отдельная страница `/expert/profile/edit` с предзаполненными данными и всеми полями на одном скроллируемом экране — без шагов.

---

## Архитектура

### Новые файлы

- `src/app/expert/profile/edit/page.tsx` — серверный компонент, загружает категории
- `src/components/expert/expert-profile-edit-form.tsx` — клиентский компонент, форма редактирования

### Изменяемые файлы

- `src/app/profile/page.tsx` — только `ActionCard` onClick (строка ~157):
  `push('/expert/profile/setup')` → `push('/expert/profile/edit')`

  **`handleAddExpert` НЕ трогать** — он ведёт на `/expert/profile/setup?upgrade=true` для первичной регистрации эксперта.

### Неизменяемое

- `src/app/expert/profile/setup/page.tsx` — онбординг остаётся как есть
- `src/components/expert/profile-setup-form.tsx` — не модифицируется
- `src/app/api/expert/profile/route.ts` — тот же POST-эндпоинт для создания и редактирования

---

## Поток данных

1. Монтирование → `GET /api/expert/profile` (заголовок `Authorization: tma <initDataRaw>`)
2. Загрузка → скелетон
3. Успех → предзаполнить состояние формы:
   - `first_name` ← `profile.user.first_name` (всегда из ответа API, не из Zustand)
   - `last_name` ← `profile.user.last_name`
   - `description` ← `profile.description`
   - `category_ids` ← `profile.categories.map(c => c.id)`
   - `consultation_price` ← `String(profile.consultation_price)` (число → строка для `<input>`)
   - `telegram_username` ← `profile.telegram_username`
4. GET вернул 404 → редирект на `/expert/profile/setup`
5. Другая ошибка GET → сообщение об ошибке + кнопка повтора
6. Отправка → `POST /api/expert/profile` (`consultation_price` конвертируется в `Number` перед отправкой)
7. Успех POST → скрыть Back Button, затем `router.back()`
8. Ошибка POST → инлайн-ошибка, остаться на странице

---

## Состояние формы

```typescript
interface EditFormData {
  first_name: string
  last_name: string
  description: string
  category_ids: string[]
  consultation_price: string  // строка для input, конвертируется в number при отправке
  telegram_username: string
}
```

---

## Валидация (только клиентская)

- `description` ≥ 20 символов
- `category_ids` ≥ 1 выбрана
- `consultation_price` > 0
- `telegram_username` ≥ 2 символов
- `first_name`: минимум не проверяется

---

## Навигация

- Telegram Back Button показывается при монтировании → `router.back()`
- При успешном сохранении → скрыть Back Button, затем `router.back()`
- Cleanup в `useEffect` скрывает Back Button при размонтировании

---

## UI

Один скроллируемый экран, фиксированная кнопка «Сохранить» снизу. Секции: заголовок, фото (только отображение) + поля имени, описание, категории, цена, Telegram username.

---

## Вне скоупа

- Смена роли пользователя
- Загрузка фото (фото берётся из Telegram, только отображение)
- Переключатель `is_visible` (API всегда ставит `true`)
