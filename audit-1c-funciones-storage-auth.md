# Auditoría: Funciones, Triggers, Edge Functions, Storage y Auth

**Proyecto:** Smartflow labs - Barbershops (`omeeupvetsacxbgojifx`)
**Fecha:** 2026-03-23

---

## 1. Funciones PostgreSQL custom (schema `public`)

**Total:** 11 funciones

### 1.1 Funciones auxiliares RLS

| Función | Retorno | Lenguaje | SECURITY DEFINER | Volatilidad | Descripción |
|---|---|---|---|---|---|
| `get_my_business_id()` | uuid | sql | ✅ | STABLE | Obtiene `business_id` del usuario autenticado via `auth.uid()`. Usada en todas las policies RLS. `search_path = 'public'`. |
| `get_business_id()` | uuid | sql | ✅ | STABLE | **Duplicada** de `get_my_business_id()` pero **sin** `SET search_path`. |

🔴 **`get_business_id()`** es un duplicado sin `search_path` fijado — vulnerabilidad de search_path hijacking en funciones `SECURITY DEFINER`. Debería eliminarse o alinearse con `get_my_business_id()`.

### 1.2 Funciones de triggers — Bookings

| Función | Retorno | Lenguaje | SECURITY DEFINER | Descripción |
|---|---|---|---|---|
| `create_booking_notification()` | trigger | plpgsql | ✅ | Crea notificaciones al owner y barbero en INSERT/UPDATE de bookings. Detecta cancelaciones. |
| `send_booking_email()` | trigger | plpgsql | ✅ | Llama a Edge Function `send-booking-email` via `net.http_post`. Solo si `client_email` no es null. |
| `update_client_stats()` | trigger | plpgsql | ❌ | Actualiza `total_visits`, `total_spent`, `last_visit_at` en clients cuando un booking pasa a `completed`. |

### 1.3 Funciones de triggers — Consultas

| Función | Retorno | Lenguaje | SECURITY DEFINER | Descripción |
|---|---|---|---|---|
| `create_consultation_notification()` | trigger | plpgsql | ✅ | Crea notificaciones al owner en INSERT y en cambios de status de consultations. |
| `update_consultations_updated_at()` | trigger | plpgsql | ❌ | Actualiza `updated_at` en consultations. |

### 1.4 Funciones de triggers — Push notifications

| Función | Retorno | Lenguaje | SECURITY DEFINER | Descripción |
|---|---|---|---|---|
| `send_push_notification()` | trigger | plpgsql | ✅ | 🔴 **Contiene `service_role_key` hardcodeado** en el código fuente. Llama a Edge Function `send-push-notification`. Solo para `booking_created`/`booking_cancelled`. |
| `send_push_on_notification()` | trigger | plpgsql | ✅ | Versión mejorada que usa `current_setting('app.settings.service_role_key')`. Fallback a URL hardcodeada. **No está asociada a ningún trigger activo** — parece ser un reemplazo no finalizado. |

🔴 **CRÍTICO — `send_push_notification()`**: El `service_role_key` está **hardcodeado en texto plano** dentro de la función. Cualquier usuario con acceso a `pg_proc` o al dashboard puede leerlo. Este key da acceso total bypass-RLS a toda la base de datos.

### 1.5 Funciones utilitarias

| Función | Retorno | Lenguaje | SECURITY DEFINER | Descripción |
|---|---|---|---|---|
| `update_updated_at_column()` | trigger | plpgsql | ❌ | Actualiza `updated_at = now()`. Genérica. |
| `auto_complete_past_bookings()` | void | sql | ✅ | Marca como `completed` los bookings con `status = 'confirmed'` cuya fecha+hora ya pasó. Usa timezone `Europe/Madrid` hardcodeado. |
| `rls_auto_enable()` | event_trigger | plpgsql | ✅ | Auto-habilita RLS en tablas nuevas del schema `public`. |

⚠️ **`auto_complete_past_bookings()`**: Usa `'Europe/Madrid'` hardcodeado. Si hay negocios en otros timezones, el cálculo será incorrecto.

---

## 2. Triggers

**Total:** 11 triggers activos en 4 tablas

### `bookings` (6 triggers)

| Trigger | Evento | Timing | Función | Estado |
|---|---|---|---|---|
| `on_booking_created` | INSERT | AFTER | `create_booking_notification` | ✅ Activo |
| `on_booking_send_email` | INSERT | AFTER | `send_booking_email` | ✅ Activo |
| `on_booking_updated` | UPDATE | AFTER | `create_booking_notification` | ✅ Activo |
| `trigger_update_client_stats` | INSERT | AFTER | `update_client_stats` | ✅ Activo |
| `trigger_update_client_stats_insert` | INSERT | AFTER | `update_client_stats` | ✅ Activo |
| `trigger_update_client_stats_update` | UPDATE | AFTER | `update_client_stats` | ✅ Activo |

🔴 **`trigger_update_client_stats` y `trigger_update_client_stats_insert`**: Ambos son AFTER INSERT y ejecutan la misma función `update_client_stats`. **Duplicados** — cada INSERT ejecuta `update_client_stats` **dos veces**, duplicando el incremento de `total_visits` y `total_spent`.

### `calendar` (1 trigger)

| Trigger | Evento | Timing | Función | Estado |
|---|---|---|---|---|
| `set_calendar_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | ✅ Activo |

### `consultations` (3 triggers)

| Trigger | Evento | Timing | Función | Estado |
|---|---|---|---|---|
| `consultations_updated_at` | UPDATE | BEFORE | `update_consultations_updated_at` | ✅ Activo |
| `on_consultation_created` | INSERT | AFTER | `create_consultation_notification` | ✅ Activo |
| `on_consultation_updated` | UPDATE | AFTER | `create_consultation_notification` | ✅ Activo |

### `notifications` (1 trigger)

| Trigger | Evento | Timing | Función | Estado |
|---|---|---|---|---|
| `on_notification_send_push` | INSERT | AFTER | `send_push_notification` | ✅ Activo |

⚠️ Usa la función con el service_role_key hardcodeado (ver hallazgo crítico arriba).

### Event triggers (sistema)

| Event Trigger | Evento | Función | Custom |
|---|---|---|---|
| `ensure_rls` | ddl_command_end | `rls_auto_enable` | ✅ Custom |
| `graphql_watch_ddl` | ddl_command_end | `increment_schema_version` | Sistema |
| `graphql_watch_drop` | sql_drop | `increment_schema_version` | Sistema |
| `issue_graphql_placeholder` | sql_drop | `set_graphql_placeholder` | Sistema |
| `issue_pg_cron_access` | ddl_command_end | `grant_pg_cron_access` | Sistema |
| `issue_pg_graphql_access` | ddl_command_end | `grant_pg_graphql_access` | Sistema |
| `issue_pg_net_access` | ddl_command_end | `grant_pg_net_access` | Sistema |
| `pgrst_ddl_watch` | ddl_command_end | `pgrst_ddl_watch` | Sistema |
| `pgrst_drop_watch` | sql_drop | `pgrst_drop_watch` | Sistema |

---

## 3. Edge Functions

**Total:** 9 funciones desplegadas

| Función | Slug | JWT Verify | Estado | Versión | Descripción |
|---|---|---|---|---|---|
| `availability-v2` | `hyper-processor` | ✅ | ACTIVE | v9 | Disponibilidad v2 (requiere auth) |
| `availability` | `availability` | ❌ | ACTIVE | v22 | Disponibilidad pública (sin JWT) |
| `book-appointment` | `book-appointment` | ❌ | ACTIVE | v16 | Crear reserva pública (sin JWT) |
| `send-booking-email` | `send-booking-email` | ❌ | ACTIVE | v17 | Envío email confirmación (llamada desde trigger) |
| `cancel-booking` | `cancel-booking` | ❌ | ACTIVE | v22 | Cancelar reserva pública (sin JWT) |
| `get-barbers` | `get-barbers` | ✅ | ACTIVE | v5 | Listar barberos (requiere auth) |
| `get-services` | `get-services` | ✅ | ACTIVE | v5 | Listar servicios (requiere auth) |
| `submit-consultation` | `submit-consultation` | ❌ | ACTIVE | v8 | Enviar consulta pública (sin JWT) |
| `send-push-notification` | `send-push-notification` | ❌ | ACTIVE | v1 | Push notification (llamada desde trigger) |

### Análisis de seguridad Edge Functions

| Estado | Funciones |
|---|---|
| ✅ Con JWT verify | `availability-v2`, `get-barbers`, `get-services` |
| 🔴 Sin JWT verify | `availability`, `book-appointment`, `send-booking-email`, `cancel-booking`, `submit-consultation`, `send-push-notification` |

⚠️ **6 de 9 Edge Functions no verifican JWT.** Esto es aceptable para las funciones públicas de booking (`availability`, `book-appointment`, `cancel-booking`, `submit-consultation`), pero:

- 🔴 **`send-booking-email`**: Sin JWT verification. Si es accesible públicamente, un atacante podría enviar emails arbitrarios.
- 🔴 **`send-push-notification`**: Sin JWT verification. Debería validar internamente que la llamada viene del trigger (via service_role_key en header).

---

## 4. Storage — Buckets

**Total:** 6 buckets — **Todos públicos**

| Bucket | Público | Límite tamaño | MIME types permitidos |
|---|---|---|---|
| `barber_photos` | ✅ | Sin límite | Sin restricción |
| `barber-avatars` | ✅ | 5 MB | image/jpeg, image/png, image/webp |
| `business-logos` | ✅ | 50 MB | image/jpeg, image/png, image/webp, image/gif |
| `consultation-photos` | ✅ | Sin límite | Sin restricción |
| `services_photos` | ✅ | 50 MB | image/jpeg, image/png, image/webp, image/gif |
| `static` | ✅ | Sin límite | Sin restricción |

🔴 **`barber_photos`**: Sin límite de tamaño ni filtro MIME — se podría subir cualquier archivo de cualquier tamaño.
🔴 **`consultation-photos`**: Sin límite de tamaño ni filtro MIME.
🔴 **`static`**: Sin límite de tamaño ni filtro MIME.
🔴 **`barber_photos` y `static`**: No tienen ninguna policy de storage — sin control de acceso de escritura más allá del bucket público.

### Storage policies (tabla `storage.objects`)

**Total:** 14 policies — RLS habilitado en `storage.objects`

| Policy | Rol | Comando | Bucket(s) | Filtro |
|---|---|---|---|---|
| `Auth users manage storage` | authenticated | ALL | `barber-avatars`, `services_photos`, `business-logos`, `consultation-photos` | Solo por bucket |
| `Authenticated users can upload barber avatars` | authenticated | INSERT | `barber-avatars` | folder = `avatars` |
| `Authenticated users can update barber avatars` | authenticated | UPDATE | `barber-avatars` | — |
| `Authenticated users can delete barber avatars` | authenticated | DELETE | `barber-avatars` | — |
| `Authenticated users can upload service photos` | authenticated | INSERT | `services_photos` | — |
| `Authenticated users can update service photos` | authenticated | UPDATE | `services_photos` | — |
| `Authenticated users can delete service photos` | authenticated | DELETE | `services_photos` | — |
| `Allow authenticated select` | authenticated | SELECT | `business-logos` | — |
| `Allow authenticated update` | authenticated | UPDATE | `business-logos` | — |
| `Public Access for Barber Avatars` | public | SELECT | `barber-avatars` | — |
| `Public read access for service photos` | public | SELECT | `services_photos` | — |
| `Allow public read consultation photos` | anon | SELECT | `consultation-photos` | — |
| `Allow public viewing` | public | SELECT | `consultation-photos` | — |
| `Anon upload consultation photos only` | anon | INSERT | `consultation-photos` | folder = `uploads` |

⚠️ **Observaciones:**
- 🔴 **Ninguna policy filtra por `business_id`** o por la identidad del usuario. Cualquier usuario autenticado de **cualquier negocio** puede subir/modificar/borrar archivos en los buckets de otro negocio.
- 🔴 **`barber_photos`** y **`static`**: Sin policies — el acceso depende enteramente del flag `public` del bucket (lectura pública sin restricción, escritura via service_role o si hay alguna policy implícita).
- ⚠️ **`Anon upload consultation photos`**: Permite upload anónimo en folder `uploads`. Riesgo de abuso (spam de archivos, almacenamiento ilimitado ya que no hay límite de tamaño).

---

## 5. Auth Providers

| Provider | Usuarios | Estado |
|---|---|---|
| `email` | 13 | ✅ Activo |

**Solo email/password está habilitado.** No hay OAuth (Google, Apple, etc.) ni SSO configurado.

---

## Resumen de hallazgos

### 🔴 Críticos

| # | Problema | Componente | Impacto |
|---|---|---|---|
| 1 | **`service_role_key` hardcodeado** en función `send_push_notification()` | Función PG | Cualquiera con acceso a `pg_proc` obtiene acceso total a la DB bypass RLS |
| 2 | **Triggers duplicados** `trigger_update_client_stats` + `trigger_update_client_stats_insert` | Triggers | `total_visits` y `total_spent` se incrementan **el doble** en cada INSERT |
| 3 | **Storage sin filtro de business_id** | Storage policies | Usuario autenticado de negocio A puede manipular archivos de negocio B |
| 4 | **Buckets sin límites** (`barber_photos`, `consultation-photos`, `static`) | Storage | Sin restricción de tamaño ni tipo MIME — riesgo de abuso de almacenamiento |

### ⚠️ Importantes

| # | Problema | Componente | Detalle |
|---|---|---|---|
| 5 | **`get_business_id()` duplicada** sin `search_path` | Función PG | Vulnerabilidad potencial de search_path hijacking en SECURITY DEFINER |
| 6 | **`send_push_on_notification()` huérfana** | Función PG | Función mejorada que no está conectada a ningún trigger |
| 7 | **Edge Functions sin JWT** (`send-booking-email`, `send-push-notification`) | Edge Functions | Accesibles públicamente sin verificación de origen |
| 8 | **Timezone hardcodeado** en `auto_complete_past_bookings()` | Función PG | Solo funciona correctamente para `Europe/Madrid` |
| 9 | **Anon upload sin límite** en `consultation-photos` | Storage | Upload anónimo sin restricción de tamaño |
