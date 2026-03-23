# Auditoría Fase 2A — Queries a Supabase y Secretos en Código

**Proyecto:** Smartflow labs - Barbershops
**Fecha:** 2026-03-23
**Alcance:** Todo el código fuente (`src/`, `supabase/`, archivos raíz)

---

## Arquitectura de acceso a datos

El código usa **dos patrones** para acceder a Supabase:

1. **Supabase JS Client** (`supabase.from(...)`) — usado en consultations, push_subscriptions, storage, service photos
2. **REST API directo via `fetch()`** — usado en bookings, barbers, clients, services, businesses, business_hours, notifications

Ambos patrones pasan el JWT del usuario autenticado. **No se usa `service_role` en ningún lugar del frontend.**

---

## 1. Inventario completo de queries

### 1.1 Queries CON filtro explícito de `business_id` ✅

| Archivo | Línea | Tabla | Operación | Filtro |
|---|---|---|---|---|
| `src/services/supabaseConsultations.ts` | 10 | consultations | SELECT | `.eq('business_id', getBusinessId())` |
| `src/services/supabaseConsultations.ts` | 90 | consultations | REALTIME | `filter: business_id=eq.${getBusinessId()}` |
| `src/utils/uploadServicePhoto.ts` | 150-153 | services | UPDATE | `.eq('business_id', businessId)` |
| `src/utils/uploadServicePhoto.ts` | 184-187 | services | UPDATE | `.eq('business_id', businessId)` |
| `src/services/supabaseBookings.ts` | 104 | bookings | GET | `business_id=eq.{id}` |
| `src/services/supabaseBookings.ts` | 155 | bookings | GET | `business_id=eq.{id}` |
| `src/services/supabaseBookings.ts` | 178 | bookings | POST | `business_id` en payload |
| `src/services/supabaseBookings.ts` | 209 | bookings | PATCH | `business_id=eq.{id}` |
| `src/services/supabaseBookings.ts` | 243 | bookings | DELETE | `business_id=eq.{id}` |
| `src/services/supabaseBookings.ts` | 377 | bookings | GET | `business_id=eq.{id}` |
| `src/services/supabaseBookings.ts` | 468 | bookings | POST | `business_id` en payload |
| `src/services/supabaseBookings.ts` | 535 | bookings | PATCH | `business_id=eq.{id}` |
| `src/services/supabaseBookings.ts` | 558 | bookings | DELETE | `business_id=eq.{id}` |
| `src/services/supabaseBarbers.ts` | 193 | users | GET | `business_id=eq.{id}` |
| `src/services/supabaseBarbers.ts` | 227 | users | GET | `business_id=eq.{id}` |
| `src/services/supabaseBarbers.ts` | 264 | users | POST | `business_id` en payload |
| `src/services/supabaseBarbers.ts` | 314 | users | PATCH | `business_id=eq.{id}` |
| `src/services/supabaseBarbers.ts` | 390 | barber_schedules | POST | `business_id` en payload |
| `src/services/supabaseBarbers.ts` | 436 | barber_time_off | POST | `business_id` en payload |
| `src/services/supabaseBarbers.ts` | 473 | barber_time_off | POST | `business_id` en payload |
| `src/services/supabaseBarbers.ts` | 498 | barber_time_off | DELETE | `business_id=eq.{id}` |
| `src/services/supabaseBarbers.ts` | 518 | users | PATCH | `business_id=eq.{id}` |
| `src/services/supabaseClients.ts` | 133 | clients | GET | `business_id=eq.{id}` |
| `src/services/supabaseClients.ts` | 148 | clients | GET | `business_id=eq.{id}` |
| `src/services/supabaseClients.ts` | 160 | clients | GET | `business_id=eq.{id}` |
| `src/services/supabaseClients.ts` | 168 | bookings | GET | `business_id=eq.{id}` |
| `src/services/supabaseClients.ts` | 196 | clients | POST | `business_id` en payload |
| `src/services/supabaseClients.ts` | 213 | clients | PATCH | `business_id=eq.{id}` |
| `src/services/supabaseClients.ts` | 237 | clients | DELETE | `business_id=eq.{id}` |
| `src/services/supabaseClients.ts` | 247 | bookings | GET | `business_id=eq.{id}` |
| `src/services/supabaseServices.ts` | 102 | services | GET | `business_id=eq.{id}` |
| `src/services/supabaseServices.ts` | 116 | services | GET | `business_id=eq.{id}` |
| `src/services/supabaseServices.ts` | 132 | services | POST | `business_id` en payload |
| `src/services/supabaseServices.ts` | 149 | services | PATCH | `business_id=eq.{id}` |
| `src/services/supabaseServices.ts` | 166 | services | PATCH | `business_id=eq.{id}` |
| `src/services/supabaseServices.ts` | 182 | services | PATCH | `business_id=eq.{id}` |
| `src/services/supabaseBusinesses.ts` | 47 | businesses | GET | `id=eq.{businessId}` |
| `src/services/supabaseBusinesses.ts` | 69 | businesses | PATCH | `id=eq.{businessId}` |
| `src/services/supabaseBusinesses.ts` | 91 | businesses | GET | `id=eq.{businessId}` |
| `src/services/supabaseBusinesses.ts` | 110 | businesses | PATCH | `id=eq.{businessId}` |
| `src/services/supabaseBusinessHours.ts` | 129 | business_hours | GET | `business_id=eq.{id}` |
| `src/services/supabaseBusinessHours.ts` | 152 | business_hours | DELETE | `business_id=eq.{id}` |
| `src/services/supabaseBusinessHours.ts` | 197 | business_hours | POST | `business_id` en payload |
| `src/services/supabaseNotifications.ts` | 124 | notifications | PATCH | `business_id=eq.{id}` |
| `src/services/supabaseNotifications.ts` | 171 | notifications | DELETE | `business_id=eq.{id}` |
| `src/services/supabaseNotifications.ts` | 194-210 | notifications | POST | `business_id` en payload |
| `src/services/supabaseNotifications.ts` | 229 | users | GET | `business_id=eq.{id}` |
| `src/services/supabaseNotifications.ts` | 263-286 | notifications | POST | `business_id` en payload |
| `src/services/supabaseNotifications.ts` | 331-353 | notifications | POST | `business_id` en payload |
| `src/hooks/usePushNotifications.ts` | 79-87 | push_subscriptions | UPSERT | `business_id` en payload |

### 1.2 Queries SIN filtro de `business_id` (dependen solo de RLS) ⚠️

| # | Severidad | Archivo | Línea | Tabla | Operación | Filtro usado | Riesgo |
|---|---|---|---|---|---|---|---|
| Q1 | **BAJO** | `src/services/supabaseConsultations.ts` | 30-33 | consultations | UPDATE | `.eq('id', id)` solo | RLS filtra por business_id. Seguro mientras RLS esté activo. |
| Q2 | **BAJO** | `src/services/supabaseConsultations.ts` | 49-52 | consultations | UPDATE | `.eq('id', id)` solo | Igual que Q1 |
| Q3 | **BAJO** | `src/services/supabaseConsultations.ts` | 60-63 | consultations | DELETE | `.eq('id', id)` solo | Igual que Q1 |
| Q4 | **BAJO** | `src/services/supabaseConsultations.ts` | 71-74 | consultations | UPDATE | `.eq('id', id)` solo | Igual que Q1 |
| Q5 | **MEDIO** | `src/services/supabaseBarbers.ts` | 156 | barber_schedules | GET | `barber_id=eq.{id}` solo | RLS protege, pero no valida que el barber_id pertenezca al business del usuario. Un usuario podría intentar consultar horarios de un barbero de otro negocio (RLS lo bloquearía). |
| Q6 | **MEDIO** | `src/services/supabaseBarbers.ts` | 175 | barber_time_off | GET | `barber_id=eq.{id}` solo | Igual que Q5 |
| Q7 | **MEDIO** | `src/services/supabaseBarbers.ts` | 357 | barber_schedules | DELETE | `barber_id=eq.{id}` solo | DELETE sin business_id. RLS protege, pero mejor práctica añadir filtro explícito. |
| Q8 | **MEDIO** | `src/services/supabaseBarbers.ts` | 414 | barber_time_off | DELETE | `barber_id=eq.{id}` solo | Igual que Q7 |
| Q9 | **MEDIO** | `src/services/supabaseNotifications.ts` | 84 | notifications | GET | `user_id=eq.{id}` solo | Sin filtro business_id. RLS protege por business_id, pero un usuario podría pasar un user_id ajeno (RLS lo filtraría igualmente por business). |
| Q10 | **MEDIO** | `src/services/supabaseNotifications.ts` | 101 | notifications | GET | `user_id=eq.{id}` solo | Igual que Q9 |
| Q11 | **MEDIO** | `src/services/supabaseNotifications.ts` | 140 | notifications | PATCH | `user_id=eq.{id}` solo | Sin business_id en filtro. Un barbero podría marcar como leídas las notificaciones de otro barbero del mismo negocio (RLS solo filtra por business_id, no user_id). |
| Q12 | **ALTO** | `src/services/supabaseNotifications.ts` | 156 | notifications | DELETE | `user_id=eq.{id}` solo | **Un barbero podría borrar todas las notificaciones de otro barbero del mismo negocio** pasando su user_id. RLS filtra por business_id pero no por user_id. |
| Q13 | **BAJO** | `src/hooks/usePushNotifications.ts` | 112-114 | push_subscriptions | DELETE | `endpoint=eq.{endpoint}` solo | El endpoint es único por dispositivo. RLS protege por business_id. |
| Q14 | **BAJO** | `src/contexts/AuthContext.tsx` | 41 | users | GET | `auth_uid=eq.{id}` | Lookup de login — correcto, auth_uid es único. |
| Q15 | **BAJO** | `src/contexts/AuthContext.tsx` | 60 | users | GET | `email=eq.{email}` | Fallback de login — correcto, email es único. |
| Q16 | **BAJO** | `src/contexts/AuthContext.tsx` | 73 | users | PATCH | `id=eq.{id}` | Link auth_uid — RLS protege. |

---

## 2. Suscripciones Realtime

| Archivo | Línea | Tabla | Filtro | Estado |
|---|---|---|---|---|
| `src/pages/Settings.tsx` | 134-139 | business_hours | `business_id=eq.{id}` | ✅ |
| `src/pages/Barbers.tsx` | 99-102 | users | `business_id=eq.{id}` | ✅ |
| `src/pages/Calendar.tsx` | 252-257 | bookings | `business_id=eq.{id}` | ✅ |
| `src/pages/Calendar.tsx` | 316-319 | users | `business_id=eq.{id}` | ✅ |
| `src/services/supabaseConsultations.ts` | 82-100 | consultations | `business_id=eq.{id}` | ✅ |
| `src/contexts/BusinessBrandContext.tsx` | 68-73 | businesses | `id=eq.{id}` | ✅ |
| `src/contexts/NotificationContext.tsx` | 130-135 | notifications | `user_id=eq.{id}` | ⚠️ Filtra por user_id, no business_id |
| `src/hooks/useReportsData.ts` | 274-277 | bookings | `business_id=eq.{id}` | ✅ |
| `src/hooks/useReportsData.ts` | 285-288 | users | `business_id=eq.{id}` | ✅ |

---

## 3. Llamadas a Storage

| Archivo | Línea | Bucket | Operación | Filtro business_id | Estado |
|---|---|---|---|---|---|
| `src/services/supabaseStorage.ts` | 29-34 | barber-avatars | upload | ❌ | 🔴 Sin aislamiento por negocio |
| `src/services/supabaseStorage.ts` | 39-41 | barber-avatars | getPublicUrl | — | ✅ Solo lectura |
| `src/services/supabaseStorage.ts` | 71-73 | barber-avatars | remove | ❌ | 🔴 Sin aislamiento por negocio |
| `src/services/supabaseStorage.ts` | 98-100 | barber-avatars | getPublicUrl | — | ✅ Solo lectura |
| `src/utils/uploadServicePhoto.ts` | 126-132 | services_photos | upload | ❌ | 🔴 Sin aislamiento por negocio |
| `src/utils/uploadServicePhoto.ts` | 140-142 | services_photos | getPublicUrl | — | ✅ Solo lectura |
| `src/utils/uploadServicePhoto.ts` | 174-176 | services_photos | remove | ❌ | 🔴 Sin aislamiento por negocio |
| `src/pages/Settings.tsx` | 231-233 | business-logos | upload | ❌ | 🔴 Sin aislamiento por negocio |
| `src/pages/Settings.tsx` | 238-240 | business-logos | getPublicUrl | — | ✅ Solo lectura |

---

## 4. Llamadas Auth

| Archivo | Línea | Operación | Estado |
|---|---|---|---|
| `src/lib/supabase.ts` | 17 | `supabase.auth.getSession()` | ✅ |
| `src/contexts/AuthContext.tsx` | 112 | `supabase.auth.getSession()` | ✅ |
| `src/contexts/AuthContext.tsx` | 125 | `supabase.auth.onAuthStateChange()` | ✅ |
| `src/contexts/AuthContext.tsx` | 145 | `supabase.auth.signInWithPassword()` | ✅ |
| `src/contexts/AuthContext.tsx` | 166 | `supabase.auth.signOut()` | ✅ |
| `src/contexts/AuthContext.tsx` | 175 | `supabase.auth.updateUser()` | ✅ |

---

## 5. Secretos y credenciales en código

### 5.1 `.env` en `.gitignore`

✅ **Verificado.** El `.gitignore` incluye:
```
.env
.env.*
!.env.example
```
No existen archivos `.env`, `.env.local` ni `.env.production` en disco. Solo `.env.example` con placeholders.

### 5.2 Hallazgos de secretos

| # | Severidad | Archivo | Línea | Hallazgo | Detalle |
|---|---|---|---|---|---|
| S1 | 🔴 **CRÍTICO** | DB: `send_push_notification()` | (función PG) | **`service_role_key` hardcodeado** en función PostgreSQL desplegada | Documentado en audit-1c. El key `eyJhbGciOiJIUzI1NiIs...` está en texto plano en la DB. Da acceso total bypass-RLS. **El migration file en el repo (`supabase/migrations/create_push_notification_trigger.sql`) usa `current_setting()` correctamente, pero la versión desplegada en producción aún tiene el key hardcodeado.** |
| S2 | **ALTO** | `src/config/api.ts` | 8 | **Anon key hardcodeado como fallback** | `sb_publishable_Fio9nb2ZT7xPsq22fmlJ5g_NxReiNEV`. Aunque los anon keys son "públicos", hardcodearlo impide la rotación sin deploy. |
| S3 | **MEDIO** | `src/config/api.ts` | 7 | **URL de Supabase hardcodeada como fallback** | `https://omeeupvetsacxbgojifx.supabase.co`. No es un secreto, pero hardcodearlo dificulta migración/rotación. |
| S4 | **MEDIO** | `src/config/api.ts` | 13 | **URL de n8n hardcodeada como fallback** | `https://n8n2.srv1037212.hstgr.cloud/webhook`. Expone infraestructura interna de automatización. |
| S5 | **BAJO** | `src/hooks/usePushNotifications.ts` | 4 | **VAPID public key hardcodeada** | `BPIaRLAEnHh6fqFv...`. Las VAPID public keys son públicas por diseño, pero no rotable sin deploy. |
| S6 | **BAJO** | `supabase/PUSH_NOTIFICATIONS_SETUP.md` | 55 | **VAPID public key diferente en docs** | `BKKBmrY_U1UnpLeN...` — distinta a la del código. Una de las dos está desactualizada. |
| S7 | **BAJO** | `supabase/migrations/create_push_notification_trigger.sql` | 31 | **URL Supabase hardcodeada como fallback en PG** | Fallback en la función `send_push_on_notification()`. |

### 5.3 Verificaciones negativas (NO encontrado — buena señal)

- ❌ No hay tokens JWT (`eyJ`) hardcodeados en el código fuente
- ❌ No hay `sk_` / `sk-` secret keys
- ❌ No hay Resend API keys
- ❌ No hay passwords hardcodeados
- ❌ No hay `service_role` key en el código del frontend
- ❌ No hay archivos `.env` con secretos reales en disco
- ✅ Edge Function `send-push-notification/index.ts` usa `Deno.env.get()` correctamente

---

## 6. Tablas nunca accedidas desde el código

| Tabla | En DB | Accedida desde src/ | Notas |
|---|---|---|---|
| `settings` | ✅ (0 filas) | ❌ Nunca | Sin RLS policies + sin código que la use = tabla muerta |
| `calendar` | ✅ (0 filas) | ❌ Nunca | Sin RLS policies + sin código que la use = tabla muerta |
| `holidays` | ✅ (0 filas) | ❌ Nunca | Tiene policies pero no se accede desde la app |

---

## 7. Resumen de hallazgos clasificados

### 🔴 CRÍTICO

| # | Hallazgo | Archivo:Línea | Impacto |
|---|---|---|---|
| C1 | **`service_role_key` hardcodeado en DB** | DB: `send_push_notification()` | Acceso total bypass-RLS. Cualquier usuario con acceso al dashboard o `pg_proc` obtiene la key. |

### 🟠 ALTO

| # | Hallazgo | Archivo:Línea | Impacto |
|---|---|---|---|
| A1 | **Anon key hardcodeado como fallback** | `src/config/api.ts:8` | Impide rotación del key sin re-deploy. Si se filtra el repo, el key queda expuesto permanentemente. |
| A2 | **DELETE notifications sin filtro user_id** | `src/services/supabaseNotifications.ts:156` | Un barbero puede borrar notificaciones de otro barbero del mismo negocio pasando su user_id. RLS solo filtra por business_id. |

### 🟡 MEDIO

| # | Hallazgo | Archivo:Línea | Impacto |
|---|---|---|---|
| M1 | **URL n8n hardcodeada** | `src/config/api.ts:13` | Expone endpoint de infraestructura interna |
| M2 | **GET barber_schedules sin business_id** | `src/services/supabaseBarbers.ts:156` | Depende 100% de RLS. Debería añadir `business_id` explícito como defensa en profundidad. |
| M3 | **GET barber_time_off sin business_id** | `src/services/supabaseBarbers.ts:175` | Igual que M2 |
| M4 | **DELETE barber_schedules sin business_id** | `src/services/supabaseBarbers.ts:357` | DELETE dependiendo solo de RLS — riesgo si RLS se desactiva accidentalmente |
| M5 | **DELETE barber_time_off sin business_id** | `src/services/supabaseBarbers.ts:414` | Igual que M4 |
| M6 | **PATCH notifications sin business_id (markAllAsRead)** | `src/services/supabaseNotifications.ts:140` | Un barbero podría marcar como leídas las notificaciones de otro del mismo negocio |
| M7 | **GET notifications sin business_id** | `src/services/supabaseNotifications.ts:84` | Filtra solo por user_id; RLS protege por business_id pero no por user_id |
| M8 | **Storage: upload/delete sin aislamiento de negocio** | `src/services/supabaseStorage.ts:29,71` / `src/utils/uploadServicePhoto.ts:126,174` / `src/pages/Settings.tsx:231` | Policies de storage no filtran por business_id ni user_id. Cualquier autenticado puede manipular archivos de otro negocio. |
| M9 | **URL Supabase hardcodeada como fallback** | `src/config/api.ts:7` | Dificulta migración/rotación de proyecto |

### 🟢 BAJO

| # | Hallazgo | Archivo:Línea | Impacto |
|---|---|---|---|
| B1 | **VAPID public key hardcodeada** | `src/hooks/usePushNotifications.ts:4` | Público por diseño, pero no rotable sin deploy |
| B2 | **VAPID keys inconsistentes** | `usePushNotifications.ts:4` vs `PUSH_NOTIFICATIONS_SETUP.md:55` | Una de las dos está desactualizada |
| B3 | **Consultations update/delete solo por id** | `src/services/supabaseConsultations.ts:30-74` | RLS protege, pero añadir business_id sería defensa en profundidad |
| B4 | **Login lookup sin business_id** | `src/contexts/AuthContext.tsx:41,60` | Esperado — el usuario aún no tiene business_id en el momento del login |
| B5 | **URL Supabase en migration SQL** | `supabase/migrations/create_push_notification_trigger.sql:31` | Fallback hardcodeado en función PG |

---

## 8. Recomendaciones priorizadas

### Inmediato (Crítico)
1. **Rotar el `service_role_key`** y reemplazar la función `send_push_notification()` en producción con la versión que usa `current_setting()` (ya existente como `send_push_on_notification()`)
2. **Migrar el trigger** `on_notification_send_push` para que use `send_push_on_notification` en lugar de `send_push_notification`

### Corto plazo (Alto)
3. **Mover el anon key a variables de entorno** — eliminar el fallback hardcodeado en `api.ts:8`
4. **Añadir filtro `user_id` en operaciones de notifications** — especialmente en `clearAllNotifications` y `markAllNotificationsAsRead`

### Medio plazo (Medio)
5. **Añadir `business_id` como filtro explícito** en todas las queries que actualmente dependen solo de RLS (defensa en profundidad)
6. **Implementar aislamiento por negocio en Storage** — prefijo de ruta con business_id y policies que lo validen
7. **Mover la URL de n8n a variable de entorno** — eliminar fallback hardcodeado
8. **Eliminar tablas muertas** (`settings`, `calendar`) o crear las policies RLS que necesitan
