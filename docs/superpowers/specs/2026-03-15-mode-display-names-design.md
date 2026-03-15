# Mode-Specific Display Names — Design Spec

**Date:** 2026-03-15
**Status:** Approved

---

## Problem

Each account can have two modes (user + expert). Currently both modes share the same name from `users.first_name/last_name`.

Additionally, `/api/auth` overwrites `first_name/last_name` from Telegram on every app open — so custom user-mode names are silently reset each session.

The user wants independent display names per mode:
- As a **user**: seen by experts (e.g. in requests)
- As an **expert**: seen by users (e.g. in expert cards)

---

## Solution

Each mode owns its name independently:

| Mode | Storage | Visible to |
|------|---------|-----------|
| 👤 User | `users.first_name`, `users.last_name` | Experts (in requests) |
| 🎤 Expert | `expert_profiles.display_first_name`, `expert_profiles.display_last_name` | Users (in expert cards) |

---

## Database

**Migration 1 — stop overwriting user-mode name on login:**

`/api/auth` keeps syncing `username` and `photo_url` from Telegram (they can't be changed in-app), but **stops syncing `first_name`/`last_name`** on UPDATE. On INSERT (new user), Telegram values are still used as the initial default.

**Migration 2 — add columns to `expert_profiles`:**
```sql
ALTER TABLE expert_profiles
  ADD COLUMN display_first_name text,
  ADD COLUMN display_last_name  text;
```

When a new expert profile is created (`POST /api/expert/profile`), initialize `display_first_name/last_name` from the `first_name/last_name` sent in the request. Existing profiles get `null` and fall back to `users.first_name/last_name` until they set their own.

---

## Auth Store

Add `expertName: { first_name: string; last_name: string | null } | null` to Zustand store — **not persisted** (excluded from `partialize`, same as `user`).

Populated during app init when role is `expert` or `both`. Updated after saving expert profile name via PATCH.

---

## API Changes

### `POST /api/auth` (init)
- **Change:** on UPDATE of existing user, remove `first_name`/`last_name` from the update payload — only sync `username`, `photo_url`, `updated_at`
- On INSERT (new user): keep Telegram values as defaults

### `GET /api/auth` or init flow
When returning user data, also fetch and return `expert_name: { first_name, last_name }` if `role` includes expert (reading `display_first_name/last_name` from `expert_profiles`, falling back to `users` names if null).

### `POST /api/expert/profile` (setup / full update)
- **Change:** write `first_name`/`last_name` body params to `expert_profiles.display_first_name/last_name` instead of `users` table
- Require `first_name` to be non-empty (add validation)
- Init `display_first_name/last_name` from request body on upsert

### `PATCH /api/expert/profile` (new — name-only update)
Lightweight endpoint for changing expert display name from the profile page without requiring all profile fields:
```
PATCH /api/expert/profile
Authorization: tma <initDataRaw>
Body: { display_first_name: string, display_last_name?: string }
Returns: { expert_name: { first_name, last_name } }
```

### `GET /api/expert/profile`
Return `display_first_name`/`display_last_name` directly (with fallback to user names if null).

---

## Profile Page (`/profile`)

**Header name:**
```
currentMode === 'expert'
  ? expertName?.first_name ?? user.first_name
  : user.first_name
```

**"Изменить имя" action:** available in both modes.
- User mode → calls `PATCH /api/user/profile` (existing) → updates `user` in store
- Expert mode → calls `PATCH /api/expert/profile` (new) → updates `expertName` in store

The inline edit form is the same UI already in place — no new component needed.

---

## Expert Cards (matching screen)

Expert cards fetch from API. The display name must come from `expert_profiles.display_first_name/last_name` (with fallback). Not from `users` table.

---

## Types

After migration, regenerate `database.types.ts` via Supabase MCP (`generate_typescript_types`). Do this before writing TypeScript code that references the new columns.

---

## Files Affected

1. `src/app/api/auth/route.ts` — stop syncing `first_name/last_name` on update
2. DB migration — add `display_first_name/last_name` to `expert_profiles`
3. `src/types/database.types.ts` — regenerate after migration
4. `src/lib/store/auth.ts` — add `expertName` field (not persisted)
5. `src/app/api/expert/profile/route.ts` — GET returns display name; POST writes to `expert_profiles`; add PATCH
6. `src/app/api/auth/route.ts` — return `expert_name` in response when applicable
7. `src/app/profile/page.tsx` — mode-aware header; name edit in both modes
8. `src/components/expert/expert-profile-edit-form.tsx` — save display name to `expert_profiles`, add first_name validation
9. Expert card components — use `display_first_name/last_name` from profile API
