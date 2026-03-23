# Auditoría de Schema Public — Supabase

**Proyecto:** Smartflow labs - Barbershops (`omeeupvetsacxbgojifx`)
**Fecha:** 2026-03-23
**Schema:** `public`
**Total tablas:** 14

---

## Resumen: ¿Tiene `business_id`?

| Tabla | `business_id` | RLS |
|---|---|---|
| `businesses` | N/A (es la tabla padre) | Si |
| `users` | Si | Si |
| `clients` | Si | Si |
| `services` | Si | Si |
| `bookings` | Si | Si |
| `business_hours` | Si | Si |
| `holidays` | Si | Si |
| `settings` | Si | Si |
| `calendar` | Si | Si |
| `barber_schedules` | Si | Si |
| `barber_time_off` | Si | Si |
| `notifications` | Si | Si |
| `push_subscriptions` | Si | Si |
| `consultations` | Si | Si |

> **Todas las tablas tienen `business_id`** (excepto `businesses` que es la tabla raíz).

---

## 1. `businesses` (4 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| **id** (PK) | uuid | NO | `gen_random_uuid()` |
| business_name | text | NO | — |
| email | text (UNIQUE) | NO | — |
| phone | text | SI | — |
| address | text | SI | — |
| logo_url | text | SI | — |
| plan_type | text | SI | `'trial'` |
| status | text | SI | `'active'` |
| trial_ends_at | timestamptz | SI | — |
| timezone | text | SI | `'Europe/Madrid'` |
| currency | text | SI | `'EUR'` |
| language | text | SI | `'es'` |
| created_at | timestamptz | SI | `now()` |
| updated_at | timestamptz | SI | `now()` |
| location_url | text | SI | — |
| contact_email | text | SI | — |
| website | text | SI | — |
| antelacion_min (horas) | text | SI | — |
| antelacion_max (dias) | text | SI | — |

**PKs:** `id`
**FKs (entrantes):** Referenciada por `users`, `clients`, `services`, `bookings`, `business_hours`, `holidays`, `settings`, `calendar`, `barber_schedules`, `barber_time_off`, `notifications`, `push_subscriptions`, `consultations`

---

## 2. `users` (13 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| **id** (PK) | uuid | NO | `gen_random_uuid()` |
| business_id (FK) | uuid | SI | — |
| email | text (UNIQUE) | NO | — |
| full_name | text | NO | — |
| role | text | SI | `'admin'` |
| avatar_url | text | SI | — |
| is_active | boolean | SI | `true` |
| last_login_at | timestamptz | SI | — |
| created_at | timestamptz | SI | `now()` |
| updated_at | timestamptz | SI | `now()` |
| calendar_id | text | SI | — |
| working_schedule | jsonb | SI | `{...}` (horario semanal) |
| break_times | jsonb | SI | `'[]'` |
| days_off | jsonb | SI | `'[]'` |
| booking_buffer_minutes | integer | SI | `0` |
| timezone | varchar | SI | `'Europe/Madrid'` |
| schedule | jsonb | SI | `{...}` (turnos por día) |
| time_off | jsonb | SI | `'[]'` |
| bio | text | SI | — |
| phone | text | SI | — |
| auth_uid | uuid (UNIQUE) | SI | — |

**PKs:** `id`
**FKs (salientes):** `business_id` → `businesses.id`
**FKs (entrantes):** Referenciada por `bookings.user_id`, `calendar.user_id`, `calendar.created_by`, `barber_schedules.barber_id`, `barber_time_off.barber_id`, `notifications.user_id`, `push_subscriptions.user_id`, `consultations.contacted_by`

---

## 3. `clients` (125 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| **id** (PK) | uuid | NO | `gen_random_uuid()` |
| business_id (FK) | uuid | SI | — |
| name | text | NO | — |
| phone | text | SI | — |
| email | text | SI | — |
| notes | text | SI | — |
| tags | text[] | SI | — |
| total_visits | integer | SI | `0` |
| total_spent | numeric | SI | `0` |
| last_visit_at | timestamptz | SI | — |
| created_at | timestamptz | SI | `now()` |
| updated_at | timestamptz | SI | `now()` |

**PKs:** `id`
**FKs (salientes):** `business_id` → `businesses.id`
**FKs (entrantes):** Referenciada por `bookings.client_id`

---

## 4. `services` (27 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| **id** (PK) | uuid | NO | `gen_random_uuid()` |
| business_id (FK) | uuid | SI | — |
| name | text | NO | — |
| description | text | SI | — |
| duration_minutes | integer | NO | — |
| price | numeric | NO | — |
| color | text | SI | `'#3B82F6'` |
| buffer_before_minutes | integer | SI | `0` |
| buffer_after_minutes | integer | SI | `0` |
| is_active | boolean | SI | `true` |
| display_order | integer | SI | `0` |
| created_at | timestamptz | SI | `now()` |
| updated_at | timestamptz | SI | `now()` |
| is_consultation | boolean | SI | `false` |
| service_photo | text | SI | — |

**PKs:** `id`
**FKs (salientes):** `business_id` → `businesses.id`
**FKs (entrantes):** Referenciada por `bookings.service_id`, `consultations.service_id`

---

## 5. `bookings` (788 filas)

| Columna | Tipo | Nullable | Default | Check |
|---|---|---|---|---|
| **id** (PK) | uuid | NO | `gen_random_uuid()` | — |
| business_id (FK) | uuid | SI | — | — |
| client_id (FK) | uuid | SI | — | — |
| service_id (FK) | uuid | SI | — | — |
| user_id (FK) | uuid | SI | — | — |
| booking_date | date | NO | — | — |
| start_time | time | NO | — | — |
| end_time | time | NO | — | — |
| status | text | SI | `'confirmed'` | — |
| source | text | SI | `'online'` | — |
| client_name | text | NO | — | — |
| client_phone | text | SI | — | — |
| client_email | text | SI | — | — |
| service_name | text | NO | — | — |
| service_duration | integer | NO | — | — |
| service_price | numeric | NO | — | — |
| notes | text | SI | — | — |
| cancellation_reason | text | SI | — | — |
| reminder_sent_at | timestamptz | SI | — | — |
| created_at | timestamptz | SI | `now()` | — |
| updated_at | timestamptz | SI | `now()` | — |
| barber | text | SI | — | — |
| cancel_token | uuid | SI | `gen_random_uuid()` | — |
| booking_type | varchar | SI | `'booking'` | IN ('booking','event') |
| event_name | varchar | SI | — | — |
| is_recurring | boolean | SI | `false` | — |
| recurrence_rule | jsonb | SI | — | — |
| location | varchar | SI | — | — |
| color | varchar | SI | — | — |

**PKs:** `id`
**FKs (salientes):** `business_id` → `businesses.id`, `client_id` → `clients.id`, `service_id` → `services.id`, `user_id` → `users.id`
**FKs (entrantes):** Referenciada por `consultations.booking_id`

---

## 6. `business_hours` (28 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| **id** (PK) | uuid | NO | `gen_random_uuid()` |
| business_id (FK) | uuid | SI | — |
| day_of_week | integer | NO | — |
| is_open | boolean | SI | `true` |
| open_time | time | SI | — |
| close_time | time | SI | — |
| created_at | timestamptz | SI | `now()` |
| updated_at | timestamptz | SI | `now()` |

**PKs:** `id`
**FKs (salientes):** `business_id` → `businesses.id`
**Unique:** `(business_id, day_of_week)`

---

## 7. `holidays` (0 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| **id** (PK) | uuid | NO | `gen_random_uuid()` |
| business_id (FK) | uuid | SI | — |
| holiday_date | date | NO | — |
| name | text | SI | — |
| is_closed | boolean | SI | `true` |
| created_at | timestamptz | SI | `now()` |

**PKs:** `id`
**FKs (salientes):** `business_id` → `businesses.id`
**Unique:** `(business_id, holiday_date)`

---

## 8. `settings` (0 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| **id** (PK) | uuid | NO | `gen_random_uuid()` |
| business_id (FK) | uuid | SI | — |
| key | text | NO | — |
| value | jsonb | NO | — |
| updated_at | timestamptz | SI | `now()` |

**PKs:** `id`
**FKs (salientes):** `business_id` → `businesses.id`
**Unique:** `(business_id, key)`

---

## 9. `calendar` (0 filas)

| Columna | Tipo | Nullable | Default | Check |
|---|---|---|---|---|
| **id** (PK) | uuid | NO | `gen_random_uuid()` | — |
| business_id (FK) | uuid | NO | — | — |
| user_id (FK) | uuid | NO | — | — |
| block_type | text | NO | — | IN ('time_off','break','blocked','available') |
| start_date | date | NO | — | — |
| end_date | date | NO | — | — |
| start_time | time | SI | — | — |
| end_time | time | SI | — | — |
| is_recurring | boolean | SI | `false` | — |
| recurrence_rule | jsonb | SI | — | — |
| title | text | SI | — | — |
| notes | text | SI | — | — |
| is_active | boolean | SI | `true` | — |
| created_at | timestamptz | SI | `now()` | — |
| updated_at | timestamptz | SI | `now()` | — |
| created_by (FK) | uuid | SI | — | — |

**PKs:** `id`
**FKs (salientes):** `business_id` → `businesses.id`, `user_id` → `users.id`, `created_by` → `users.id`

---

## 10. `barber_schedules` (105 filas)

| Columna | Tipo | Nullable | Default | Check |
|---|---|---|---|---|
| **id** (PK) | uuid | NO | `gen_random_uuid()` | — |
| business_id (FK) | uuid | NO | — | — |
| barber_id (FK) | uuid | NO | — | — |
| day_of_week | smallint | NO | — | 0..6 |
| start_time | time | NO | — | — |
| end_time | time | NO | — | — |
| created_at | timestamptz | SI | `now()` | — |
| updated_at | timestamptz | SI | `now()` | — |

**PKs:** `id`
**FKs (salientes):** `business_id` → `businesses.id`, `barber_id` → `users.id`

---

## 11. `barber_time_off` (8 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| **id** (PK) | uuid | NO | `gen_random_uuid()` |
| business_id (FK) | uuid | NO | — |
| barber_id (FK) | uuid | NO | — |
| start_date | date | NO | — |
| end_date | date | NO | — |
| reason | text | SI | — |
| created_at | timestamptz | SI | `now()` |

**PKs:** `id`
**FKs (salientes):** `business_id` → `businesses.id`, `barber_id` → `users.id`

---

## 12. `notifications` (1140 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| **id** (PK) | uuid | NO | `gen_random_uuid()` |
| business_id (FK) | uuid | NO | — |
| user_id (FK) | uuid | NO | — |
| type | text | NO | — |
| title | text | NO | — |
| message | text | NO | — |
| metadata | jsonb | SI | `'{}'` |
| is_read | boolean | NO | `false` |
| created_at | timestamptz | SI | `now()` |

**PKs:** `id`
**FKs (salientes):** `business_id` → `businesses.id`, `user_id` → `users.id`

---

## 13. `push_subscriptions` (2 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| **id** (PK) | uuid | NO | `gen_random_uuid()` |
| user_id (FK) | uuid | NO | — |
| business_id (FK) | uuid | NO | — |
| endpoint | text (UNIQUE) | NO | — |
| p256dh | text | NO | — |
| auth | text | NO | — |
| created_at | timestamptz | SI | `now()` |
| updated_at | timestamptz | SI | `now()` |

**PKs:** `id`
**FKs (salientes):** `user_id` → `users.id`, `business_id` → `businesses.id`

---

## 14. `consultations` (21 filas)

| Columna | Tipo | Nullable | Default | Check |
|---|---|---|---|---|
| **id** (PK) | uuid | NO | `gen_random_uuid()` | — |
| business_id (FK) | uuid | NO | — | — |
| service_id (FK) | uuid | SI | — | — |
| service_name | text | NO | — | — |
| client_name | text | NO | — | — |
| client_phone | text | SI | — | — |
| client_email | text | SI | — | — |
| client_notes | text | SI | — | — |
| photo_url | text | SI | — | — |
| status | text | SI | `'new'` | IN ('new','contacted','scheduled','completed','cancelled') |
| staff_notes | text | SI | — | — |
| contacted_at | timestamptz | SI | — | — |
| contacted_by (FK) | uuid | SI | — | — |
| booking_id (FK) | uuid | SI | — | — |
| created_at | timestamptz | SI | `now()` | — |
| updated_at | timestamptz | SI | `now()` | — |

**PKs:** `id`
**FKs (salientes):** `business_id` → `businesses.id`, `service_id` → `services.id`, `contacted_by` → `users.id`, `booking_id` → `bookings.id`

---

## Índices

### `barber_schedules`
| Índice | Tipo | Columnas |
|---|---|---|
| `barber_schedules_pkey` | UNIQUE (btree) | `id` |
| `idx_barber_schedules_lookup` | btree | `business_id, barber_id, day_of_week` |

### `barber_time_off`
| Índice | Tipo | Columnas |
|---|---|---|
| `barber_time_off_pkey` | UNIQUE (btree) | `id` |
| `idx_barber_time_off_lookup` | btree | `business_id, barber_id, start_date, end_date` |

### `bookings`
| Índice | Tipo | Columnas |
|---|---|---|
| `bookings_pkey` | UNIQUE (btree) | `id` |
| `idx_bookings_business_date` | btree | `business_id, booking_date` |
| `idx_bookings_business_date_status` | btree | `business_id, booking_date, status` |
| `idx_bookings_cancel_token` | btree | `cancel_token` |
| `idx_bookings_client` | btree | `client_id` |
| `idx_bookings_recurring` | btree (partial) | `is_recurring` WHERE `is_recurring = true` |
| `idx_bookings_service` | btree | `service_id` |
| `idx_bookings_status` | btree | `business_id, status` |
| `idx_bookings_type` | btree | `booking_type` |
| `idx_bookings_user` | btree | `user_id` |

### `business_hours`
| Índice | Tipo | Columnas |
|---|---|---|
| `business_hours_pkey` | UNIQUE (btree) | `id` |
| `idx_business_hours_business_day` | btree | `business_id, day_of_week` |
| `unique_day_per_business` | UNIQUE (btree) | `business_id, day_of_week` |

### `businesses`
| Índice | Tipo | Columnas |
|---|---|---|
| `businesses_pkey` | UNIQUE (btree) | `id` |
| `businesses_email_key` | UNIQUE (btree) | `email` |

### `calendar`
| Índice | Tipo | Columnas |
|---|---|---|
| `calendar_pkey` | UNIQUE (btree) | `id` |
| `calendar_active_idx` | btree (partial) | `is_active` WHERE `is_active = true` |
| `calendar_business_idx` | btree | `business_id` |
| `calendar_dates_idx` | btree | `start_date, end_date` |
| `calendar_user_dates_idx` | btree | `user_id, start_date, end_date` |
| `calendar_user_idx` | btree | `user_id` |

### `clients`
| Índice | Tipo | Columnas |
|---|---|---|
| `clients_pkey` | UNIQUE (btree) | `id` |
| `idx_clients_business` | btree | `business_id` |
| `idx_clients_business_name` | btree | `business_id, name` |
| `idx_clients_business_phone` | btree | `business_id, phone` |
| `idx_clients_email` | btree | `email` |
| `idx_clients_name_lower` | btree | `lower(name)` |
| `idx_clients_phone` | btree | `phone` |

### `consultations`
| Índice | Tipo | Columnas |
|---|---|---|
| `consultations_pkey` | UNIQUE (btree) | `id` |
| `idx_consultations_business` | btree | `business_id` |
| `idx_consultations_created` | btree | `created_at DESC` |
| `idx_consultations_status` | btree | `status` |

### `holidays`
| Índice | Tipo | Columnas |
|---|---|---|
| `holidays_pkey` | UNIQUE (btree) | `id` |
| `idx_holidays_business_date` | btree | `business_id, holiday_date` |
| `unique_holiday_per_business` | UNIQUE (btree) | `business_id, holiday_date` |

### `notifications`
| Índice | Tipo | Columnas |
|---|---|---|
| `notifications_pkey` | UNIQUE (btree) | `id` |
| `idx_notifications_business_id` | btree | `business_id` |
| `idx_notifications_user_recent` | btree | `user_id, created_at DESC` |
| `idx_notifications_user_unread` | btree (partial) | `user_id, is_read, created_at DESC` WHERE `is_read = false` |

### `push_subscriptions`
| Índice | Tipo | Columnas |
|---|---|---|
| `push_subscriptions_pkey` | UNIQUE (btree) | `id` |
| `push_subscriptions_endpoint_unique` | UNIQUE (btree) | `endpoint` |
| `idx_push_subscriptions_business_id` | btree | `business_id` |
| `idx_push_subscriptions_user` | btree | `user_id` |

### `services`
| Índice | Tipo | Columnas |
|---|---|---|
| `services_pkey` | UNIQUE (btree) | `id` |
| `idx_services_business_active` | btree | `business_id, is_active` |
| `idx_services_business_order` | btree | `business_id, display_order` |

### `settings`
| Índice | Tipo | Columnas |
|---|---|---|
| `settings_pkey` | UNIQUE (btree) | `id` |
| `idx_settings_business_key` | btree | `business_id, key` |
| `unique_setting_per_business` | UNIQUE (btree) | `business_id, key` |

### `users`
| Índice | Tipo | Columnas |
|---|---|---|
| `users_pkey` | UNIQUE (btree) | `id` |
| `users_email_key` | UNIQUE (btree) | `email` |
| `users_auth_uid_key` | UNIQUE (btree) | `auth_uid` |
| `idx_users_business_active` | btree | `business_id, is_active` |
| `idx_users_business_role` | btree (partial) | `business_id, role` WHERE `is_active = true` |
| `idx_users_email` | btree | `email` |

---

**Total índices:** 58
