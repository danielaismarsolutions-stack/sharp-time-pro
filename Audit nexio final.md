# AUDIT NEXIO FINAL — Informe Consolidado

**Proyecto:** Nexio (sharp-time-pro) — Smartflow Labs  
**Fecha:** 2026-03-24  
**Auditor:** Claude (asistido por Claude Code + Supabase MCP)  
**Alcance:** Infraestructura Supabase completa + código fuente frontend  
**Escala objetivo:** ~30 negocios activos en 6-12 meses

---

## 1. RESUMEN EJECUTIVO

| Área | Estado | Veredicto |
|------|--------|-----------|
| **Seguridad** | 🔴 | Service role key expuesta en DB, Edge Functions sin auth, fallback silencioso a anon key, storage sin aislamiento entre negocios |
| **Aislamiento entre tenants** | 🟡 | RLS bien implementado en la mayoría de tablas, pero policies anón permiten leer datos de TODOS los negocios. Storage no filtra por business_id |
| **Escalabilidad** | 🔴 | N+1 críticos (1+2N queries por carga de barberos), 91% del fetching sin cache, reports calculados en el navegador, sin paginación real |
| **Coste** | 🟡 | Plan Pro ($25/mes) suficiente para 30 negocios, pero sin optimización de imágenes y con polling innecesario el bandwidth subirá rápido |
| **Arquitectura** | 🟡 | Base sólida (React Query instalado, RLS consistente, índices en business_id), pero adopción incompleta de buenas prácticas |

---

## 2. TOP 10 PROBLEMAS CRÍTICOS

Estos son los problemas que hay que resolver **antes de escalar a 30 clientes**, ordenados por riesgo:

| # | ID | Problema | Riesgo real |
|---|-----|---------|-------------|
| 1 | **C1** | `service_role_key` hardcodeada en texto plano en función PG `send_push_notification()` | Cualquier usuario con acceso al dashboard o pg_proc obtiene acceso total bypass-RLS a toda la DB |
| 2 | **SEC-001** | Edge Function `send-push-notification` sin verificación JWT ni validación de origen | Cualquier persona puede enviar push notifications arbitrarias a cualquier usuario |
| 3 | **SEC-002** | `getAuthHeaders()` hace fallback silencioso a anon key cuando la sesión expira | Queries se ejecutan como anon → policies `qual=true` exponen datos de TODOS los negocios |
| 4 | **RLS-ANON** | Policies anón con `qual=true` en businesses, business_hours, holidays, services | Cualquier visitante puede listar datos (emails, teléfonos, precios) de todos los negocios |
| 5 | **STOR-01** | Storage policies no filtran por business_id — cualquier autenticado puede manipular archivos de otro negocio | Un barbero del negocio A puede borrar fotos del negocio B |
| 6 | **TRIG-DUP** | Triggers duplicados `trigger_update_client_stats` + `trigger_update_client_stats_insert` | `total_visits` y `total_spent` se duplican en cada booking INSERT |
| 7 | **SCALE-015** | N+1 en barberos: `getAll()` ejecuta 1 + 2N queries (schedule + timeoff por barbero) | Con 10 barberos = 21 queries; se ejecuta en Calendar, Reports, Barbers, cada realtime update |
| 8 | **SCALE-019** | React Query solo en 1/11 componentes — 91% del data fetching sin cache | Cada navegación entre páginas re-fetcha todo, multiplicando requests ×3-5 |
| 9 | **SCALE-006** | Bookings con `limit: 10000` sin paginación real | Reports intenta cargar un año entero de bookings en una request |
| 10 | **SCALE-008** | Agregaciones de reports (KPIs, revenue, top clients) calculadas en JavaScript del navegador | Con miles de bookings, descarga MBs de JSON y los procesa en el cliente |

---

## 3. TABLA CONSOLIDADA DE HALLAZGOS

### 3.1 Seguridad (18 hallazgos)

| ID | Severidad | Descripción | Esfuerzo (h) |
|----|-----------|-------------|--------------|
| C1 | 🔴 CRÍTICO | service_role_key hardcodeada en función PG send_push_notification() | 2 |
| SEC-001 | 🔴 CRÍTICO | Edge Function send-push-notification sin auth — cualquiera envía push | 2 |
| SEC-002 | 🔴 CRÍTICO | Fallback silencioso a anon key cuando sesión expira | 2 |
| RLS-ANON | 🔴 CRÍTICO | Policies anón con qual=true en 4 tablas — expone datos de todos los negocios | 4 |
| STOR-01 | 🔴 CRÍTICO | Storage sin filtro business_id — cross-tenant file access | 6 |
| SEC-016 | 🟠 ALTO | Storage migration da permisos upload/update/delete a rol anon | 1 |
| SEC-017 | 🟠 ALTO | Logo upload acepta SVG (XSS via JavaScript embebido) | 1 |
| SEC-003 | 🟠 ALTO | rememberMe es noop — sesión siempre en localStorage | 3 |
| SEC-004 | 🟠 ALTO | URL param id sin validación UUID en ClientDetail | 1 |
| SEC-005 | 🟠 ALTO | Interpolación de IDs en URLs REST sin encodeURIComponent | 3 |
| A1 | 🟠 ALTO | Anon key hardcodeado como fallback en api.ts | 1 |
| A2 | 🟠 ALTO | DELETE notifications sin filtro user_id — barbero borra notificaciones de otro | 1 |
| FUNC-DUP | 🟠 ALTO | get_business_id() duplicada sin search_path — risk de hijacking | 1 |
| SEC-007 | 🟡 MEDIO | Sin rate limiting en login | 3 |
| SEC-009 | 🟡 MEDIO | Eventos calendar en localStorage sin protección | 4 |
| SEC-014 | 🟡 MEDIO | Validación de imágenes solo client-side — buckets sin restricción | 2 |
| SEC-018 | 🟡 MEDIO | WhatsApp URL sin encodeURIComponent en ConsultationDetailModal | 0.5 |
| SEC-012 | 🟢 BAJO | Password sin requisitos de complejidad | 1 |

### 3.2 Integridad de datos (2 hallazgos)

| ID | Severidad | Descripción | Esfuerzo (h) |
|----|-----------|-------------|--------------|
| TRIG-DUP | 🔴 CRÍTICO | Triggers duplicados — total_visits y total_spent se duplican en cada INSERT | 1 |
| TZ-HARD | 🟡 MEDIO | auto_complete_past_bookings() usa Europe/Madrid hardcodeado | 2 |

### 3.3 Escalabilidad (16 hallazgos)

| ID | Severidad | Descripción | Esfuerzo (h) |
|----|-----------|-------------|--------------|
| SCALE-015 | 🔴 CRÍTICO | N+1 en barberos: 1+2N queries en getAll() | 3 |
| SCALE-019 | 🔴 CRÍTICO | React Query solo en 1/11 componentes — 91% sin cache | 16 |
| SCALE-005 | 🔴 CRÍTICO | select(*) en todas las queries — sin column projection | 6 |
| SCALE-006 | 🔴 CRÍTICO | Bookings limit:10000 sin paginación real | 6 |
| SCALE-008 | 🟠 ALTO | Reports: agregación completa en JavaScript del cliente | 12 |
| SCALE-007 | 🟠 ALTO | Clientes sin paginación — carga todos en una request | 4 |
| SCALE-017 | 🟠 ALTO | Canales realtime con nombre fijo colisionan multi-tenant | 2 |
| SCALE-020 | 🟠 ALTO | Mismos datos fetcheados 3-5× sin cache compartida | (cubierto por SCALE-019) |
| SCALE-024 | 🟠 ALTO | Avatares sin optimización — 5MB renderizados a 48px | 3 |
| SCALE-001 | 🟠 ALTO | Falta índice compuesto consultations(business_id, created_at DESC) | 0.5 |
| SCALE-002 | 🟠 ALTO | Falta índice para conflict check bookings(business_id, booking_date, barber) | 0.5 |
| SCALE-012 | 🟡 MEDIO | Queries barber_schedules/time_off sin business_id → 85% seq scans | 2 |
| SCALE-016 | 🟡 MEDIO | N PATCH requests en updateOrder de servicios | 3 |
| SCALE-018 | 🟡 MEDIO | 9 canales realtime/usuario — no consolidados | 4 |
| SCALE-022 | 🟡 MEDIO | Zero useMutation — sin invalidación automática tras mutaciones | 8 |
| SCALE-014 | 🟢 BAJO | Polling cada 30s además de realtime en reports | 0.5 |

### 3.4 Código muerto / limpieza (6 hallazgos)

| ID | Severidad | Descripción | Esfuerzo (h) |
|----|-----------|-------------|--------------|
| DEAD-01 | 🟡 MEDIO | Tablas settings y calendar sin RLS policies y sin código que las use | 1 |
| DEAD-02 | 🟡 MEDIO | Tabla holidays con policies pero sin código que la use | 0.5 |
| DEAD-03 | 🟡 MEDIO | Función send_push_on_notification() huérfana (mejora no conectada) | 0.5 |
| DEAD-04 | 🟢 BAJO | 6 índices en tabla calendar muerta (0 scans) | 0.5 |
| DEAD-05 | 🟢 BAJO | Hook useWeeklyBookings.ts nunca importado | 0.5 |
| DEAD-06 | 🟢 BAJO | Mock auth code legacy en api.ts | 0.5 |

---

## 4. PLAN DE SPRINTS

### Sprint 1 — URGENTE (antes de onboardear más clientes) — ~25 horas

| Prioridad | ID | Tarea | Horas |
|-----------|----|-------|-------|
| 1 | C1 | Rotar service_role_key + reemplazar función PG con versión que usa current_setting() + migrar trigger | 2 |
| 2 | SEC-001 | Habilitar verify_jwt en send-push-notification o validar header secreto | 2 |
| 3 | SEC-002 | Eliminar fallback a anon key — redirigir a login si no hay sesión | 2 |
| 4 | RLS-ANON | Restringir policies anón para que filtren por business_id (ver SQL abajo) | 4 |
| 5 | STOR-01 | Añadir business_id a rutas de storage + policies que validen el path | 6 |
| 6 | TRIG-DUP | Eliminar trigger duplicado trigger_update_client_stats | 1 |
| 7 | SCALE-015 | Refactorizar getAll() de barberos: 3 queries batch en vez de 1+2N | 3 |
| 8 | — | Crear 3 índices faltantes (ver SQL abajo) | 1 |
| 9 | SCALE-012 | Añadir business_id a queries de barber_schedules/time_off | 2 |
| 10 | SEC-016 | Eliminar rol anon de storage policies de barber-avatars | 1 |
| 11 | SEC-017 | Restringir logo upload a whitelist MIME (no SVG) | 1 |

### Sprint 2 — IMPORTANTE (próximas 4 semanas) — ~45 horas

| Prioridad | ID | Tarea | Horas |
|-----------|----|-------|-------|
| 1 | SCALE-019 | Migrar todos los data fetches a useQuery con queryKeys consistentes | 16 |
| 2 | SCALE-006 | Implementar paginación real en bookings (cursor-based o offset) | 6 |
| 3 | SCALE-005 | Añadir select con columnas específicas en todas las queries | 6 |
| 4 | SCALE-007 | Añadir paginación en lista de clientes | 4 |
| 5 | SCALE-024 | Optimizar avatar upload (reusar optimizeImage() de uploadServicePhoto) | 3 |
| 6 | SEC-005 | Añadir encodeURIComponent a valores interpolados en URLs REST | 3 |
| 7 | SEC-003 | Implementar rememberMe real | 3 |
| 8 | SCALE-017 | Añadir businessId a nombres de canales realtime fijos | 2 |
| 9 | A1 | Mover anon key a variables de entorno, eliminar fallback hardcoded | 1 |
| 10 | A2 | Añadir filtro user_id en DELETE/PATCH de notifications | 1 |

### Sprint 3 — OPTIMIZACIONES (cuando haya tiempo) — ~40 horas

| Prioridad | ID | Tarea | Horas |
|-----------|----|-------|-------|
| 1 | SCALE-008 | Mover agregaciones de reports a SQL server-side (funciones RPC) | 12 |
| 2 | SCALE-022 | Migrar mutaciones a useMutation con invalidación de cache | 8 |
| 3 | SCALE-018 | Consolidar canales realtime (1 canal multi-tabla por business) | 4 |
| 4 | SEC-009 | Migrar eventos de localStorage a tabla calendar en Supabase | 4 |
| 5 | SCALE-016 | Reemplazar N PATCHs en updateOrder con RPC batch | 3 |
| 6 | SEC-007 | Rate limiting visual + CAPTCHA en login | 3 |
| 7 | SEC-014 | Configurar MIME/size limits en buckets de Supabase (server-side) | 2 |
| 8 | TZ-HARD | Parametrizar timezone en auto_complete_past_bookings() | 2 |
| 9 | — | Eliminar código muerto (6 ítems) | 2 |

---

## 5. SQL Y CÓDIGO DE REMEDIACIÓN

### 5.1 Rotar service_role_key y migrar trigger (C1)

```sql
-- Paso 1: Migrar el trigger para usar la función mejorada
DROP TRIGGER IF EXISTS on_notification_send_push ON notifications;

CREATE TRIGGER on_notification_send_push
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_on_notification();

-- Paso 2: Eliminar la función vulnerable
DROP FUNCTION IF EXISTS send_push_notification();

-- Paso 3: Después de esto, rotar la service_role_key desde el dashboard de Supabase
-- Dashboard → Settings → API → Service Role Key → Regenerate
```

### 5.2 Eliminar trigger duplicado (TRIG-DUP)

```sql
-- Este trigger duplica el incremento de total_visits y total_spent
DROP TRIGGER IF EXISTS trigger_update_client_stats ON bookings;

-- Mantener solo trigger_update_client_stats_insert (AFTER INSERT)
-- y trigger_update_client_stats_update (AFTER UPDATE)

-- Verificar datos actuales y corregir duplicados:
UPDATE clients c SET
  total_visits = (
    SELECT COUNT(*) FROM bookings b
    WHERE b.client_id = c.id AND b.status = 'completed'
  ),
  total_spent = (
    SELECT COALESCE(SUM(b.service_price), 0) FROM bookings b
    WHERE b.client_id = c.id AND b.status = 'completed'
  );
```

### 5.3 Restringir policies anón (RLS-ANON)

```sql
-- OPCIÓN A: Filtrar por business_id en la query del frontend público
-- (el frontend de booking pasa business_id como parámetro)

-- businesses: solo el business específico
DROP POLICY IF EXISTS "anon_read_businesses" ON businesses;
CREATE POLICY "anon_read_businesses" ON businesses
  FOR SELECT TO anon
  USING (true);
  -- Nota: businesses no tiene business_id propio, 
  -- la restricción se hace seleccionando solo columnas públicas 
  -- desde la Edge Function con service_role

-- business_hours: solo del business solicitado
DROP POLICY IF EXISTS "anon_read_business_hours" ON business_hours;
CREATE POLICY "anon_read_business_hours" ON business_hours
  FOR SELECT TO anon
  USING (false); -- Bloquear acceso anón directo

-- holidays: igual
DROP POLICY IF EXISTS "anon_read_holidays" ON holidays;
CREATE POLICY "anon_read_holidays" ON holidays
  FOR SELECT TO anon
  USING (false);

-- services: igual
DROP POLICY IF EXISTS "anon_read_services" ON services;
CREATE POLICY "anon_read_services" ON services
  FOR SELECT TO anon
  USING (false);

-- OPCIÓN B (RECOMENDADA): Eliminar TODAS las policies anón
-- y servir los datos públicos exclusivamente desde Edge Functions
-- con service_role (que ya existen: availability, get-services, etc.)
-- Esto es más seguro porque centraliza el control de acceso.
```

### 5.4 Storage: aislamiento por business_id (STOR-01)

```sql
-- Paso 1: Reorganizar archivos con prefijo business_id
-- Estructura actual: barber-avatars/avatars/foto.jpg
-- Estructura nueva:  barber-avatars/{business_id}/avatars/foto.jpg

-- Paso 2: Policies que validen el path
DROP POLICY IF EXISTS "Auth users manage storage" ON storage.objects;

CREATE POLICY "auth_upload_own_business" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('barber-avatars', 'services_photos', 'business-logos', 'consultation-photos')
    AND (storage.foldername(name))[1] = (SELECT get_my_business_id()::text)
  );

CREATE POLICY "auth_update_own_business" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('barber-avatars', 'services_photos', 'business-logos', 'consultation-photos')
    AND (storage.foldername(name))[1] = (SELECT get_my_business_id()::text)
  );

CREATE POLICY "auth_delete_own_business" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('barber-avatars', 'services_photos', 'business-logos', 'consultation-photos')
    AND (storage.foldername(name))[1] = (SELECT get_my_business_id()::text)
  );

-- Lectura pública se mantiene (las URLs son públicas por diseño)
CREATE POLICY "public_read_all" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id IN ('barber-avatars', 'services_photos', 'business-logos', 'consultation-photos'));
```

**Cambio requerido en el código:**
```typescript
// Antes (supabaseStorage.ts)
const filePath = `avatars/${fileName}`;

// Después
const filePath = `${getBusinessId()}/avatars/${fileName}`;
```

### 5.5 Índices faltantes (SCALE-001, 002, 003)

```sql
-- Consultations ordenadas por fecha
CREATE INDEX idx_consultations_business_created
ON consultations (business_id, created_at DESC);

-- Conflict check en bookings
CREATE INDEX idx_bookings_conflict_check
ON bookings (business_id, booking_date, barber)
WHERE status IN ('confirmed', 'pending');

-- Historial de bookings por cliente
CREATE INDEX idx_bookings_client_date
ON bookings (client_id, business_id, booking_date DESC);

-- Limpieza: eliminar índices muertos
DROP INDEX IF EXISTS calendar_active_idx;
DROP INDEX IF EXISTS calendar_business_idx;
DROP INDEX IF EXISTS calendar_dates_idx;
DROP INDEX IF EXISTS calendar_user_idx;
DROP INDEX IF EXISTS idx_bookings_recurring;
DROP INDEX IF EXISTS idx_consultations_status;
```

### 5.6 Fix N+1 en barberos (SCALE-015)

```typescript
// src/services/supabaseBarbers.ts — reemplazar getAll()
async getAll(): Promise<Barber[]> {
  const businessId = getBusinessId();
  
  // 3 queries en paralelo en vez de 1 + 2N
  const [users, allSchedules, allTimeOff] = await Promise.all([
    supabaseFetch<DbUser[]>(
      `/users?business_id=eq.${businessId}&is_active=eq.true&select=id,full_name,email,role,avatar_url,bio,phone,is_active`
    ),
    supabaseFetch<DbSchedule[]>(
      `/barber_schedules?business_id=eq.${businessId}&select=id,barber_id,day_of_week,start_time,end_time`
    ),
    supabaseFetch<DbTimeOff[]>(
      `/barber_time_off?business_id=eq.${businessId}&select=id,barber_id,start_date,end_date,reason`
    ),
  ]);

  return users.map(user => mapUserToBarber(
    user,
    allSchedules.filter(s => s.barber_id === user.id),
    allTimeOff.filter(t => t.barber_id === user.id),
  ));
}
```

### 5.7 Fix fallback a anon key (SEC-002)

```typescript
// src/lib/supabase.ts — reemplazar getAuthHeaders()
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    // NO hacer fallback a anon key — forzar re-login
    throw new Error('SESSION_EXPIRED');
  }
  
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'apikey': SUPABASE_CONFIG.anonKey,
    'Content-Type': 'application/json',
  };
}

// En cada service, capturar el error:
try {
  const data = await supabaseFetch('/endpoint');
} catch (err) {
  if (err.message === 'SESSION_EXPIRED') {
    // Redirigir a login
    window.location.href = '/login';
    return;
  }
  throw err;
}
```

### 5.8 Eliminar función duplicada (FUNC-DUP)

```sql
-- Eliminar la versión sin search_path
DROP FUNCTION IF EXISTS get_business_id();
-- Mantener solo get_my_business_id() que tiene SET search_path = 'public'
```

---

## 6. ESTIMACIÓN DE COSTES SUPABASE — 30 NEGOCIOS

### 6.1 Estimaciones por componente

| Recurso | Cálculo | Estimación mensual |
|---------|---------|-------------------|
| **DB size** | 14 tablas × 30 negocios × ~50 bookings/mes × 12 meses = ~18K bookings/año + clientes, notificaciones, etc. | ~200 MB primer año |
| **Auth MAUs** | 30 negocios × ~3 usuarios/negocio = ~90 MAUs | Dentro de los 50K del plan Pro |
| **Storage** | 30 negocios × ~50 fotos × ~500KB (optimizadas) = ~750 MB | < 1 GB |
| **Bandwidth** | Sin optimización: 30 negocios × 5 usuarios × select(*) × sin cache = alto. Con optimización: razonable | 5-20 GB/mes |
| **Realtime** | 30 negocios × 3 usuarios × 4 canales = ~360 conexiones simultáneas (pico) | Dentro del plan Pro (500) |
| **Edge Functions** | ~500 invocaciones/día (bookings + emails + push) | ~15K/mes — dentro del plan Pro |

### 6.2 ¿Plan Pro ($25/mes) suficiente?

**Sí, para 30 negocios el plan Pro es suficiente**, con las siguientes condiciones:

- **DB**: 500 MB incluidos en Pro, estimamos 200 MB → OK
- **Storage**: 100 GB incluidos → OK
- **Bandwidth**: 250 GB incluidos → OK si se optimizan imágenes y se añade cache
- **Realtime**: 500 conexiones simultáneas en Pro → ~360 en pico → OK pero ajustado
- **Edge Functions**: 2M invocaciones/mes incluidas → ~15K estimadas → OK

### 6.3 Riesgos de coste

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| **Bandwidth explosión** por select(*) + sin cache + polling 30s | 🔴 Alta | Implementar SCALE-005, SCALE-019, SCALE-014 |
| **Realtime al límite** con 360/500 conexiones | 🟡 Media | Consolidar canales (SCALE-018) reduce a ~120 |
| **Storage crece** por fotos sin optimizar | 🟡 Media | Implementar SCALE-024, SCALE-025 |
| **DB size** crece por notificaciones sin purga | 🟢 Baja | Añadir job de limpieza de notificaciones antiguas |

### 6.4 Optimizaciones que reducen costes

| Optimización | Ahorro estimado | Sprint |
|-------------|----------------|--------|
| Migrar a useQuery con cache de 2min | -60% requests al server | Sprint 2 |
| Añadir select con columnas específicas | -40% bandwidth por request | Sprint 2 |
| Eliminar polling 30s en reports | -2 queries × usuarios con reports abiertos × 2/min | Sprint 1 |
| Optimizar avatares (5MB → 50KB) | -99% storage por avatar | Sprint 2 |
| Consolidar canales realtime | -67% conexiones realtime | Sprint 3 |

---

## 7. CHECKLIST DE VERIFICACIÓN POST-REMEDIACIÓN

Tras cada sprint, verificar:

### Después de Sprint 1
- [ ] service_role_key rotada y vieja invalidada
- [ ] `SELECT * FROM pg_proc WHERE prosrc LIKE '%eyJ%'` no devuelve resultados
- [ ] `curl https://proyecto.supabase.co/rest/v1/businesses` devuelve 0 filas (no todas)
- [ ] `curl https://proyecto.supabase.co/rest/v1/services` devuelve 0 filas
- [ ] Un usuario autenticado del negocio A no puede listar archivos del negocio B en storage
- [ ] Crear un booking y verificar que total_visits incrementa en 1 (no 2)
- [ ] getAll() de barberos ejecuta exactamente 3 queries (verificar en Network tab)

### Después de Sprint 2
- [ ] Navegar Calendar → Clients → Calendar no hace 3 fetches de bookings (verificar Network tab)
- [ ] Lista de clientes carga en páginas de 50 con scroll infinito o botón "cargar más"
- [ ] Bookings en reports usa paginación o agregación server-side
- [ ] No hay `select(*)` en ninguna query del código (buscar con grep)

### Después de Sprint 3
- [ ] Reports page no descarga miles de bookings — usa RPC con SUM/COUNT
- [ ] `QueryClient` tiene staleTime global de al menos 2 minutos
- [ ] Todas las mutaciones usan useMutation con invalidateQueries
