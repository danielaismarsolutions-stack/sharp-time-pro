# Auditoría Fase 3A — Índices, Queries N+1 y Escalabilidad

**Proyecto:** Smartflow labs - Barbershops (`omeeupvetsacxbgojifx`)
**Fecha:** 2026-03-23
**Datos actuales:** ~788 bookings, 125 clients, 1140 notifications, 13 users, 27 services

---

## 1. Estadísticas de tablas (producción)

| Tabla | Filas | Tamaño total | Seq scans | Idx scans | Ratio seq % | Problema |
|---|---|---|---|---|---|---|
| `notifications` | 1,140 | 808 kB | 820 | 26,835 | 3% | ✅ OK |
| `bookings` | 788 | 672 kB | 2,132 | 8,962 | 19% | ⚠️ |
| `clients` | 125 | 208 kB | 1,931 | 2,774 | 41% | ⚠️ |
| `barber_schedules` | 105 | 88 kB | **9,649** | 1,741 | **85%** | 🔴 |
| `business_hours` | 28 | 88 kB | **2,349** | 38 | **98%** | 🔴 |
| `services` | 27 | 96 kB | **10,501** | 172 | **98%** | 🔴 |
| `users` | 13 | 200 kB | 4,160 | 30,925 | 12% | ⚠️ |
| `consultations` | 21 | 112 kB | 141 | 263 | 35% | ⚠️ |
| `businesses` | 4 | 48 kB | 160 | 5,813 | 3% | ✅ OK |

> **Nota:** Las tablas pequeñas (< 100 filas) hacen seq scans porque el planner de PostgreSQL decide que es más rápido que usar un índice. Esto es normal y no es un problema **ahora**, pero a escala (cientos de negocios) será problemático.

---

## 2. Índices no utilizados (0 scans o casi 0)

| Índice | Tabla | Scans | Tamaño | Recomendación |
|---|---|---|---|---|
| `idx_bookings_recurring` | bookings | **0** | 8 kB | ❌ Eliminar — nunca usado |
| `idx_bookings_service` | bookings | 3 | 16 kB | ⚠️ Revisar — casi nunca usado |
| `idx_bookings_type` | bookings | 33 | 16 kB | ⚠️ Bajo uso |
| `unique_day_per_business` | business_hours | 0 | 16 kB | Mantener — constraint de integridad |
| `businesses_email_key` | businesses | 0 | 16 kB | Mantener — constraint UNIQUE |
| `calendar_active_idx` | calendar | 0 | 16 kB | ❌ Tabla muerta, eliminar |
| `calendar_business_idx` | calendar | 0 | 16 kB | ❌ Tabla muerta, eliminar |
| `calendar_dates_idx` | calendar | 0 | 16 kB | ❌ Tabla muerta, eliminar |
| `calendar_user_idx` | calendar | 0 | 16 kB | ❌ Tabla muerta, eliminar |
| `idx_consultations_created` | consultations | 0 | 16 kB | ⚠️ El código ordena por `created_at DESC` pero el índice no se usa (tabla pequeña) |
| `idx_consultations_status` | consultations | 0 | 16 kB | ❌ Eliminar — nunca usado |
| `idx_services_business_active` | services | 0 | 16 kB | ⚠️ Debería usarse pero tabla muy pequeña |
| `users_email_key` | users | 0 | 16 kB | Mantener — constraint UNIQUE (duplicado funcional de `idx_users_email` que tiene 63 scans) |
| `idx_notifications_user_unread` | notifications | **1** | **80 kB** | 🔴 Índice parcial de 80 kB casi nunca usado, más grande que la mayoría |
| `idx_push_subscriptions_business_id` | push_subscriptions | 0 | 16 kB | ⚠️ Nunca usado |

**Índices más usados (top 5):**

| Índice | Tabla | Scans | Función |
|---|---|---|---|
| `users_auth_uid_key` | users | 20,763 | RLS `get_my_business_id()` |
| `idx_notifications_user_recent` | notifications | 23,595 | Listado notificaciones |
| `idx_barber_time_off_lookup` | barber_time_off | 10,988 | Availability check |
| `businesses_pkey` | businesses | 5,813 | RLS lookups |
| `idx_bookings_business_date_status` | bookings | 5,317 | Calendar view |

---

## 3. Cobertura de índices por `business_id`

| Tabla | Tiene `business_id` | Índice en `business_id` | Estado |
|---|---|---|---|
| `users` | ✅ | ✅ `idx_users_business_active(business_id, is_active)` | ✅ |
| `clients` | ✅ | ✅ `idx_clients_business(business_id)` | ✅ |
| `services` | ✅ | ✅ `idx_services_business_active(business_id, is_active)` | ✅ (pero 0 scans) |
| `bookings` | ✅ | ✅ `idx_bookings_business_date(business_id, booking_date)` | ✅ |
| `business_hours` | ✅ | ✅ `idx_business_hours_business_day(business_id, day_of_week)` | ✅ |
| `holidays` | ✅ | ✅ `idx_holidays_business_date(business_id, holiday_date)` | ✅ |
| `settings` | ✅ | ✅ `idx_settings_business_key(business_id, key)` | ✅ |
| `calendar` | ✅ | ✅ `calendar_business_idx(business_id)` | ✅ (tabla muerta) |
| `barber_schedules` | ✅ | ✅ `idx_barber_schedules_lookup(business_id, barber_id, day_of_week)` | ✅ |
| `barber_time_off` | ✅ | ✅ `idx_barber_time_off_lookup(business_id, barber_id, start_date, end_date)` | ✅ |
| `notifications` | ✅ | ✅ `idx_notifications_business_id(business_id)` | ✅ |
| `push_subscriptions` | ✅ | ✅ `idx_push_subscriptions_business_id(business_id)` | ✅ |
| `consultations` | ✅ | ✅ `idx_consultations_business(business_id)` | ✅ |

> **Todas las tablas con `business_id` tienen índice.** ✅ Sin embargo, muchos no se usan porque las tablas son pequeñas.

---

## 4. Índices faltantes para queries del código

### SCALE-001 | 🟠 ALTO | Falta índice compuesto `(business_id, created_at DESC)` en `consultations`
**Query:** `src/services/supabaseConsultations.ts:9-11`
```typescript
.from('consultations').select('*')
.eq('business_id', getBusinessId())
.order('created_at', { ascending: false })
```
**Índice existente:** `idx_consultations_business(business_id)` + `idx_consultations_created(created_at DESC)` (separados)
**Problema:** PostgreSQL no puede combinar dos índices B-tree para un ORDER BY eficiente. Necesita un compuesto.
**Impacto a escala:** Con miles de consultas, el ORDER BY requerirá un sort en memoria.
**Fix:** `CREATE INDEX idx_consultations_business_created ON consultations (business_id, created_at DESC);`

---

### SCALE-002 | 🟠 ALTO | Falta índice `(business_id, barber, booking_date)` en `bookings` para conflict check
**Query:** `src/services/supabaseBookings.ts:377-381`
```typescript
url.searchParams.append('business_id', `eq.${getBusinessId()}`);
url.searchParams.append('booking_date', `eq.${date}`);
url.searchParams.append('barber', `eq.${barber}`);
```
**Índice existente:** `idx_bookings_business_date(business_id, booking_date)` — no incluye `barber`
**Impacto a escala:** Cada creación/edición de evento ejecuta esta query de conflictos. Sin índice optimizado, escanea todos los bookings del día.
**Fix:** `CREATE INDEX idx_bookings_conflict_check ON bookings (business_id, booking_date, barber) WHERE status IN ('confirmed', 'pending');`

---

### SCALE-003 | 🟡 MEDIO | Falta índice `(client_id, business_id, booking_date DESC)` en `bookings`
**Query:** `src/services/supabaseClients.ts:168`
```
/bookings?client_id=eq.${clientId}&business_id=eq.${getBusinessId()}&order=booking_date.desc,start_time.desc
```
**Índice existente:** `idx_bookings_client(client_id)` — no incluye business_id ni ordering
**Impacto a escala:** Historial de bookings por cliente hace seq scan + sort si hay muchos bookings.
**Fix:** `CREATE INDEX idx_bookings_client_date ON bookings (client_id, business_id, booking_date DESC);`

---

### SCALE-004 | 🟡 MEDIO | Falta índice `(business_id, booking_date, user_id)` en `bookings` para calendar view por barbero
**Query usada en:** Calendar component filtra por barbero y fecha
**Índice existente:** `idx_bookings_business_date(business_id, booking_date)` — cubre parcialmente pero user_id no está
**Fix:** No urgente — el índice actual cubre la mayoría de los casos. Solo si se añade filtro por barbero en calendar.

---

## 5. Hallazgos de queries

### SCALE-005 | 🔴 CRÍTICO | `select('*')` en TODAS las queries — sin column projection
**Archivos afectados:**
- `src/services/supabaseConsultations.ts:9` — `.select('*')`
- `src/services/supabaseBookings.ts:104-148` — No especifica `select`, devuelve `*` por defecto
- `src/services/supabaseClients.ts:133` — No especifica `select`, devuelve `*`
- `src/services/supabaseBarbers.ts:193` — No especifica `select`, devuelve `*`
- `src/services/supabaseServices.ts:102` — No especifica `select`, devuelve `*`
- `src/services/supabaseBusinesses.ts:47` — No especifica `select`, devuelve `*`
- `src/services/supabaseBusinessHours.ts:129` — No especifica `select`, devuelve `*`
- `src/services/supabaseNotifications.ts:84` — No especifica `select`, devuelve `*`

**Impacto a escala:** Cada query transfiere TODAS las columnas. La tabla `users` tiene 21 columnas incluyendo `working_schedule`, `schedule`, `break_times`, `days_off`, `time_off` que son JSONB grandes. La tabla `bookings` tiene 29 columnas. Esto multiplica el ancho de banda y tiempo de parse innecesariamente.

**Excepción correcta:** `checkEventConflicts()` en `supabaseBookings.ts:381` sí usa `select=id,client_name,start_time,end_time,status,booking_type` ✅

**Fix:** Añadir `select` con solo las columnas necesarias en cada query. Especialmente en `users` donde los JSONB de schedule son pesados.

---

### SCALE-006 | 🔴 CRÍTICO | Bookings `limit: 10000` — sin paginación real
**Archivo:** `src/services/supabaseBookings.ts:132`
```typescript
url.searchParams.append('limit', '10000');
```
**Usado por:**
- `useReportsData.ts:254` — Reports carga TODOS los bookings del período (puede ser un año entero)
- Calendar view — carga todos los bookings del rango visible
- `getByClient()` — carga TODOS los bookings de un cliente

**Impacto a escala:** Con 100 negocios × 20 bookings/día × 365 días = 730,000 bookings en un año. La query `getAll()` de reports intentaría cargar decenas de miles de registros en una sola request.

**Fix:** Implementar paginación real con `offset`/`limit` o cursor-based pagination. Para reports, usar agregaciones en el servidor (SQL `SUM`, `COUNT`, `GROUP BY`) en lugar de cargar todo al cliente.

---

### SCALE-007 | 🟠 ALTO | Clientes sin paginación — carga todos en una request
**Archivo:** `src/services/supabaseClients.ts:133`
```typescript
let endpoint = `/clients?business_id=eq.${getBusinessId()}&order=created_at.desc`;
```
**Sin `limit` ni `offset`.** Carga TODOS los clientes del negocio.

**Impacto a escala:** Una barbería activa puede tener 5,000+ clientes en un año. Sin paginación, la lista cargará todos de golpe.

**Fix:** Añadir paginación: `&limit=50&offset=0` con infinite scroll o paginación por botones.

---

### SCALE-008 | 🟠 ALTO | Reports: toda la lógica de agregación en el cliente
**Archivo:** `src/hooks/useReportsData.ts:306-384`
**Problema:** Los reports descargan TODOS los bookings del período (actual + anterior) y calculan KPIs, revenue trends, service breakdown, barber metrics, top clients, etc. **todo en JavaScript en el navegador**.

**Queries ejecutadas por carga de reports:**
1. `getAll({ start_date, end_date })` — bookings del período actual (hasta 10,000)
2. `getAll({ start_date, end_date })` — bookings del período anterior (hasta 10,000)
3. `getAll()` — todos los barberos

**Impacto a escala:** Con un año de datos (miles de bookings), el navegador descarga MBs de JSON, los parsea, y ejecuta múltiples `filter()`, `reduce()`, `map()` sobre todo el dataset. Esto será lento e insostenible con volúmenes reales.

**Fix:** Mover las agregaciones a SQL (funciones `rpc()` o views materializadas):
```sql
-- Ejemplo: revenue por período
SELECT SUM(service_price) as revenue, COUNT(*) as count
FROM bookings
WHERE business_id = $1 AND booking_date BETWEEN $2 AND $3 AND status = 'completed';
```

---

### SCALE-009 | 🟡 MEDIO | N+1 implícito en `getWithBookings()` — 2 queries secuenciales
**Archivo:** `src/services/supabaseClients.ts:158-182`
```typescript
// Query 1: Get client
const clients = await supabaseFetch<DbClient[]>(clientEndpoint);
// Query 2: Get bookings
const bookingsData = await supabaseFetch<DbBooking[]>(bookingsEndpoint);
```
**Problema:** 2 queries secuenciales (no en paralelo) para un solo client detail. No es N+1 clásico (no hay loop), pero podría ser una sola query con join o ejecutarse en paralelo.
**Impacto a escala:** Latencia duplicada en la vista de detalle del cliente.
**Fix:** Usar `Promise.all()` para ejecutar ambas queries en paralelo, o usar un join en la query.

---

### SCALE-010 | 🟡 MEDIO | N+1 en push notifications — loop de deletes
**Archivo:** `supabase/functions/send-push-notification/index.ts:331-337`
```typescript
for (const sub of expiredEndpoints) {
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
}
```
**Problema:** Delete individual por cada subscription expirada dentro de un loop `for`.
**Impacto a escala:** Con muchas suscripciones expiradas, esto hace N queries DELETE individuales.
**Fix:** Usar un solo DELETE con filtro `IN`:
```typescript
const endpoints = expiredEndpoints.map(s => s.endpoint);
await supabase.from("push_subscriptions").delete().in("endpoint", endpoints);
```

---

### SCALE-011 | 🟡 MEDIO | Notifications sin paginación — `limit=20` hardcodeado
**Archivo:** `src/services/supabaseNotifications.ts:84`
```typescript
const url = `...notifications?user_id=eq.${userId}&order=created_at.desc&limit=${limit}`;
// limit defaults to 20
```
**Evaluación:** Tiene `limit=20` lo cual es bueno, pero no hay paginación (no hay `offset` para cargar más). El usuario solo ve las últimas 20 notificaciones.
**Impacto:** Bajo — 20 es razonable para un panel de notificaciones.

---

### SCALE-012 | 🟡 MEDIO | `barber_schedules` y `barber_time_off`: queries sin `business_id` causan seq scans innecesarios
**Archivos:**
- `src/services/supabaseBarbers.ts:156` — `barber_schedules?barber_id=eq.${barberId}`
- `src/services/supabaseBarbers.ts:175` — `barber_time_off?barber_id=eq.${barberId}`

**Problema dual:**
1. **Seguridad:** No filtran por `business_id` (ya documentado en SEC-005)
2. **Performance:** Los índices compuestos `idx_barber_schedules_lookup(business_id, barber_id, day_of_week)` y `idx_barber_time_off_lookup(business_id, barber_id, start_date, end_date)` tienen `business_id` como **primer campo**. Una query que filtra solo por `barber_id` (segundo campo) **no puede usar el índice compuesto eficientemente** → seq scan.

**Esto explica los 9,649 seq scans (85%) en `barber_schedules`.**

**Fix:** Añadir `business_id` al filtro (ya recomendado por seguridad), lo cual automáticamente usará el índice compuesto existente. No hace falta crear índice nuevo.

---

### SCALE-015 | 🔴 CRÍTICO | N+1 en `getAll()` de barberos — 1 + 2N queries
**Archivo:** `src/services/supabaseBarbers.ts:212-220`
```typescript
const barbersWithData = await Promise.all(
  users.map(async (user) => {
    const [schedule, timeOff] = await Promise.all([
      this.getSchedule(user.id),   // Query N
      this.getTimeOff(user.id),    // Query N
    ]);
    return mapUserToBarber(user, schedule, timeOff);
  })
);
```
**Problema:** Para N barberos, ejecuta 1 query (list users) + 2×N queries (schedule + time_off por barbero). Con 10 barberos = **21 queries**. Con 50 = **101 queries**.

**Impacto a escala:** Esta función se llama desde Calendar, Reports, Barbers page, y cada realtime update. Es la función más frecuente del sistema.

**Fix:** Reemplazar con 3 queries totales:
```typescript
// 1. Fetch all users
const users = await fetchUsers(businessId);
// 2. Fetch ALL schedules for business (1 query)
const allSchedules = await fetch(`barber_schedules?business_id=eq.${businessId}`);
// 3. Fetch ALL time_off for business (1 query)
const allTimeOff = await fetch(`barber_time_off?business_id=eq.${businessId}`);
// Then join in JavaScript
```

---

### SCALE-016 | 🟡 MEDIO | N+1 en `updateOrder()` de servicios — N PATCH requests
**Archivo:** `src/services/supabaseServices.ts:179-192`
```typescript
const updates = orderedIds.map((id, index) =>
  supabaseFetch(`/services?id=eq.${id}&business_id=eq.${getBusinessId()}`, {
    method: 'PATCH',
    body: JSON.stringify({ display_order: index }),
  })
);
await Promise.all(updates);
```
**Problema:** Si hay 15 servicios, envía 15 PATCH requests individuales.
**Fix:** Usar una función RPC que reciba el array de IDs y actualice en una sola query, o usar una transacción batch via PostgREST.

---

### SCALE-013 | 🟢 BAJO | `services` y `business_hours`: seq scan ratio alto (98%) pero tablas diminutas
**Problema:** 10,501 seq scans en `services` (27 filas), 2,349 en `business_hours` (28 filas).
**Evaluación:** PostgreSQL elige seq scan porque la tabla cabe entera en una sola página de 8KB. Esto es **correcto y óptimo** para tablas tan pequeñas. No es un problema real.
**A futuro:** Solo será problema si hay cientos de negocios con cientos de servicios cada uno. En ese caso, los índices existentes entrarán en juego automáticamente.

---

### SCALE-014 | 🟢 BAJO | Realtime subscriptions con polling fallback de 30s
**Archivo:** `src/hooks/useReportsData.ts:295-297`
```typescript
const pollInterval = setInterval(() => {
  queryClient.invalidateQueries({ queryKey: ['reports', 'bookings'] });
}, 30000);
```
**Problema:** Además del realtime subscription, hay un polling cada 30 segundos que invalida la cache y re-fetch los datos. Esto es innecesario si el realtime funciona correctamente.
**Impacto a escala:** Cada admin con reports abierto hace 2 queries completas (current + previous) cada 30 segundos, cargando potencialmente miles de bookings cada vez.
**Fix:** Eliminar el polling o aumentar el intervalo significativamente (5+ minutos). Confiar en realtime.

---

## 6. Resumen de hallazgos

| ID | Severidad | Descripción | Impacto a escala |
|---|---|---|---|
| SCALE-005 | 🔴 CRÍTICO | `select(*)` en todas las queries, sin column projection | Ancho de banda × N con tablas JSONB pesadas |
| SCALE-006 | 🔴 CRÍTICO | Bookings `limit: 10000`, sin paginación | Colapso con meses/años de datos |
| SCALE-015 | 🔴 CRÍTICO | N+1 en barberos: 1 + 2N queries en `getAll()` | 101 queries con 50 barberos |
| SCALE-008 | 🟠 ALTO | Reports: agregación completa en JavaScript del cliente | MBs de JSON + CPU del navegador |
| SCALE-007 | 🟠 ALTO | Clientes sin paginación | Lista de 5K+ clientes en una request |
| SCALE-001 | 🟠 ALTO | Falta índice compuesto `consultations(business_id, created_at DESC)` | Sorts en memoria |
| SCALE-002 | 🟠 ALTO | Falta índice para conflict check `bookings(business_id, booking_date, barber)` | Escaneo de todos los bookings del día |
| SCALE-012 | 🟡 MEDIO | Queries a barber_schedules/time_off sin business_id → seq scans | 85% seq scans actualmente |
| SCALE-016 | 🟡 MEDIO | N PATCH requests en updateOrder de servicios | 15+ requests para reordenar |
| SCALE-009 | 🟡 MEDIO | 2 queries secuenciales en getWithBookings | Latencia doble en client detail |
| SCALE-010 | 🟡 MEDIO | N+1 DELETE en push notifications | N queries individuales |
| SCALE-003 | 🟡 MEDIO | Falta índice `bookings(client_id, business_id, booking_date DESC)` | Historial de cliente lento |
| SCALE-011 | 🟡 MEDIO | Notifications limit=20 sin paginación adicional | Solo top 20 visibles |
| SCALE-014 | 🟢 BAJO | Polling cada 30s además de realtime | Queries innecesarias |
| SCALE-013 | 🟢 BAJO | Seq scans en tablas diminutas (services, business_hours) | Normal, no problema real |
| SCALE-004 | 🟢 BAJO | Falta índice calendar con user_id (tabla muerta) | Sin impacto actual |

---

## 7. Índices recomendados (SQL)

```sql
-- SCALE-001: Consultations ordenadas por fecha
CREATE INDEX idx_consultations_business_created
ON consultations (business_id, created_at DESC);

-- SCALE-002: Conflict check en bookings
CREATE INDEX idx_bookings_conflict_check
ON bookings (business_id, booking_date, barber)
WHERE status IN ('confirmed', 'pending');

-- SCALE-003: Historial de bookings por cliente
CREATE INDEX idx_bookings_client_date
ON bookings (client_id, business_id, booking_date DESC);
```

## 8. Índices a eliminar

```sql
-- Nunca usados, tablas muertas
DROP INDEX IF EXISTS calendar_active_idx;
DROP INDEX IF EXISTS calendar_business_idx;
DROP INDEX IF EXISTS calendar_dates_idx;
DROP INDEX IF EXISTS calendar_user_idx;

-- Nunca usados en tablas activas
DROP INDEX IF EXISTS idx_bookings_recurring;
DROP INDEX IF EXISTS idx_consultations_status;
```

## 9. Prioridades de fix

### Inmediato (antes de crecer)
1. **SCALE-015**: Eliminar N+1 en barberos — fetch schedules y time_off en batch (3 queries en vez de 1+2N)
2. **SCALE-005**: Añadir `select` con columnas específicas en todas las queries
3. **SCALE-012**: Añadir `business_id` a queries de barber_schedules/time_off (fix de seguridad + performance)
4. **Crear** los 3 índices recomendados

### Corto plazo
5. **SCALE-006/007**: Implementar paginación real en bookings y clients
6. **SCALE-008**: Mover agregaciones de reports a SQL server-side
7. **SCALE-009**: Paralelizar queries en `getWithBookings()`
8. **SCALE-016**: Reemplazar N PATCHs en updateOrder con RPC batch
9. **SCALE-014**: Eliminar polling de 30s en reports

### Limpieza
8. **Eliminar** los 6 índices no utilizados para reducir overhead de escritura
