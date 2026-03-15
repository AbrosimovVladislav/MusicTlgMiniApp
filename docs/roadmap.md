# Roadmap — Music Expert App MVP

Порядок реализации. Каждый шаг — закончен полностью перед переходом к следующему.

**Статусы:** `⬜ не начато` · `🔄 в процессе` · `✅ готово`

---

## Фаза 0 — Фундамент

> Инфраструктура, база данных, конфиги. Без этого ничего не работает.


| #   | Задача                                  | Статус | Фича-файл                                      |
| --- | --------------------------------------- | ------ | ---------------------------------------------- |
| 0.1 | Настройка Supabase проекта              | ✅      | —                                              |
| 0.2 | Схема БД — таблицы, связи, RLS          | ✅      | `[features/database.md](features/database.md)` |
| 0.3 | Генерация TypeScript типов из схемы     | ✅      | —                                              |
| 0.4 | Supabase client setup (`lib/supabase/`) | ✅      | —                                              |
| 0.5 | Структура проекта — папки, конвенции    | ✅      | —                                              |


---

## Фаза 1 — Auth & Онбординг

> Пользователь попадает в приложение и выбирает роль.


| #   | Задача                                                        | Статус | Фича-файл                                          |
| --- | ------------------------------------------------------------- | ------ | -------------------------------------------------- |
| 1.1 | Валидация Telegram `initData` на сервере                      | ✅      | `[features/auth.md](features/auth.md)`             |
| 1.2 | Создание / обновление пользователя в БД по `telegram_user_id` | ✅      | `[features/auth.md](features/auth.md)`             |
| 1.3 | Сплэш-экраны (1–2)                                            | ✅      | `[features/onboarding.md](features/onboarding.md)` |
| 1.4 | Экран выбора роли (User / Expert)                             | ✅      | `[features/onboarding.md](features/onboarding.md)` |
| 1.5 | Роут-гард — редирект по роли после онбординга                 | ✅      | `[features/auth.md](features/auth.md)`             |


---

## Фаза 2 — Профиль эксперта

> Эксперт заполняет профиль — без этого он не виден в системе.


| #   | Задача                                           | Статус | Фича-файл                                                  |
| --- | ------------------------------------------------ | ------ | ---------------------------------------------------------- |
| 2.1 | Многошаговая форма заполнения профиля            | ✅      | `[features/expert-profile.md](features/expert-profile.md)` |
| 2.2 | Фото из Telegram (дефолт) + возможность заменить | ✅      | `[features/expert-profile.md](features/expert-profile.md)` |
| 2.3 | Выбор категорий и подкатегорий                   | ✅      | `[features/expert-profile.md](features/expert-profile.md)` |
| 2.4 | Стоимость консультации                           | ✅      | `[features/expert-profile.md](features/expert-profile.md)` |
| 2.5 | Сохранение профиля в Supabase                    | ✅      | `[features/expert-profile.md](features/expert-profile.md)` |


---

## Фаза 3 — Создание запроса (User)

> Пользователь формирует и публикует запрос.


| #   | Задача                                               | Статус | Фича-файл                                      |
| --- | ---------------------------------------------------- | ------ | ---------------------------------------------- |
| 3.1 | Home пользователя — список запросов + CTA            | ✅      | `[features/requests.md](features/requests.md)` |
| 3.2 | Многошаговая форма создания запроса (4 шага)         | ✅      | `[features/requests.md](features/requests.md)` |
| 3.3 | Публикация запроса → статус `published`              | ✅      | `[features/requests.md](features/requests.md)` |
| 3.4 | Страница деталей запроса (статус, редактирование)    | ✅      | `[features/requests.md](features/requests.md)` |
| 3.5 | Авто-деактивация через 90 дней (`is_active = false`) | ✅      | `[features/requests.md](features/requests.md)` |


---

## Фаза 4 — Матчинг (User → Expert)

> Пользователь видит экспертов и ставит лайки.


| #   | Задача                                                      | Статус | Фича-файл                                      |
| --- | ----------------------------------------------------------- | ------ | ---------------------------------------------- |
| 4.1 | Список экспертов по категории запроса                       | ✅      | `[features/matching.md](features/matching.md)` |
| 4.2 | Карточка эксперта (превью)                                  | ✅      | `[features/matching.md](features/matching.md)` |
| 4.3 | Детальная страница эксперта (попап / экран)                 | ✅      | `[features/matching.md](features/matching.md)` |
| 4.4 | Лайк эксперта → запись в `matches` со статусом `user_liked` | ✅      | `[features/matching.md](features/matching.md)` |
| 4.5 | Экран ожидания — список лайкнутых экспертов со статусами    | ✅      | `[features/matching.md](features/matching.md)` |


---

## Фаза 5 — Матчинг (Expert → Request)

> Эксперт видит запросы и откликается.


| #   | Задача                                                  | Статус | Фича-файл                                            |
| --- | ------------------------------------------------------- | ------ | ---------------------------------------------------- |
| 5.1 | Home эксперта — раздел «Запросы по моим категориям»     | ✅      | `[features/expert-profile.md](features/expert-profile.md)` |
| 5.2 | Home эксперта — раздел «Меня лайкнули»                  | ✅      | `[features/expert-profile.md](features/expert-profile.md)` |
| 5.3 | Детальная карточка запроса + кнопка «Откликнуться»      | ✅      | `[features/expert-profile.md](features/expert-profile.md)` |
| 5.4 | Сценарий A: эксперт откликается первым → `expert_liked` | ✅      | `[features/expert-profile.md](features/expert-profile.md)` |
| 5.5 | Сценарий B: эксперт принимает лайк пользователя → матч  | ✅      | `[features/expert-profile.md](features/expert-profile.md)` |
| 5.6 | Детектирование взаимного матча → статус `matched`       | ✅      | `[features/expert-profile.md](features/expert-profile.md)` |


---

## Фаза 6 — Оплата и передача контактов

> Финальный шаг — деньги переходят, контакты раскрываются.


| #   | Задача                                              | Статус | Фича-файл                                    |
| --- | --------------------------------------------------- | ------ | -------------------------------------------- |
| 6.1 | Экран матча — обе стороны видят друг друга          | ⬜      | `[features/payment.md](features/payment.md)` |
| 6.2 | Моковый экран оплаты (заглушка)                     | ⬜      | `[features/payment.md](features/payment.md)` |
| 6.3 | После оплаты → раскрытие Telegram username эксперта | ⬜      | `[features/payment.md](features/payment.md)` |
| 6.4 | Статус запроса → `in_progress`                      | ⬜      | `[features/payment.md](features/payment.md)` |


---

## Фаза 7 — Поиск экспертов

> Отдельный экран для просмотра всех экспертов вне контекста запроса.


| #   | Задача                                         | Статус | Фича-файл                                                |
| --- | ---------------------------------------------- | ------ | -------------------------------------------------------- |
| 7.1 | Экран поиска / каталог экспертов               | ⬜      | `[features/expert-search.md](features/expert-search.md)` |
| 7.2 | Фильтрация по категории / подкатегории         | ⬜      | `[features/expert-search.md](features/expert-search.md)` |
| 7.3 | Сортировка экспертов                           | ⬜      | `[features/expert-search.md](features/expert-search.md)` |
| 7.4 | Лайк эксперта из каталога → привязка к запросу | ⬜      | `[features/expert-search.md](features/expert-search.md)` |


---

## Фаза 8 — Полировка и запуск

> Дизайн, edge cases, тестирование, продакшн.


| #   | Задача                                              | Статус | Фича-файл |
| --- | --------------------------------------------------- | ------ | --------- |
| 8.1 | Применение дизайн-системы (из `design.md`)          | ⬜      | —         |
| 8.2 | Telegram тема (dark/light) + safe area              | ⬜      | —         |
| 8.3 | Error handling, пустые состояния, loading скелетоны | ⬜      | —         |
| 8.4 | Ручное E2E тестирование полного флоу                | ⬜      | —         |
| 8.5 | Переменные окружения на Vercel (prod)               | ⬜      | —         |
| 8.6 | Финальный деплой + проверка в Telegram              | ⬜      | —         |


---

## POST MVP

> Фичи после запуска MVP — не блокируют релиз.


### Оплата через Telegram Stars

| #    | Задача                          | Статус | Фича-файл                                    |
| ---- | ------------------------------- | ------ | -------------------------------------------- |
| P2.1 | Оплата через Telegram Stars     | ⬜      | `[features/payment.md](features/payment.md)` |

### Уведомления

> Бот информирует обе стороны о событиях.

| #    | Задача                                                     | Статус | Фича-файл                                                |
| ---- | ---------------------------------------------------------- | ------ | -------------------------------------------------------- |
| N1.1 | `requestWriteAccess()` при онбординге                      | ⬜      | `[features/notifications.md](features/notifications.md)` |
| N1.2 | Bot webhook — сервер получает события и шлёт `sendMessage` | ⬜      | `[features/notifications.md](features/notifications.md)` |
| N1.3 | Уведомление: эксперт откликнулся                           | ⬜      | `[features/notifications.md](features/notifications.md)` |
| N1.4 | Уведомление: взаимный матч                                 | ⬜      | `[features/notifications.md](features/notifications.md)` |
| N1.5 | Уведомление: оплата прошла / контакты получены             | ⬜      | `[features/notifications.md](features/notifications.md)` |


