# Auditoría Fase 2B — Auth, Flujo Público, Inputs y Tokens

**Proyecto:** Smartflow labs - Barbershops
**Fecha:** 2026-03-23
**Alcance:** Autenticación, autorización, flujo público de reservas, sanitización de inputs, manejo de tokens

---

## 1. Arquitectura de autenticación

### 1.1 Flujo de login

```
Login.tsx → AuthContext.login() → supabase.auth.signInWithPassword()
  → onAuthStateChange('SIGNED_IN') → resolveUser(session)
  → fetchUserProfile(auth_uid, email, accessToken) → REST API /users
  → setBusinessId(profile.businessId) → setUser(profile)
```

- **Provider:** Solo email/password (Supabase Auth)
- **Token storage:** Supabase JS SDK usa `localStorage` por defecto (`persistSession: true`)
- **Token refresh:** `autoRefreshToken: true` — el SDK renueva automáticamente
- **business_id derivación:** Del campo `business_id` en tabla `users`, vinculado al usuario autenticado
- **business_id almacenamiento:** Variable en memoria (`_businessId` en `src/config/session.ts:4`), NO en localStorage

### 1.2 Rutas y guards

**Archivo:** `src/App.tsx`

| Ruta | Guard | Rol requerido |
|---|---|---|
| `/login` | Ninguno (pública) | — |
| `/terminos` | Ninguno (pública) | — |
| `/privacidad` | Ninguno (pública) | — |
| `/cookies` | Ninguno (pública) | — |
| `*` (404) | Ninguno (pública) | — |
| `/calendar` | `ProtectedRoute` | authenticated |
| `/consultations` | `ProtectedRoute` | authenticated |
| `/clients` | `ProtectedRoute` | authenticated |
| `/clients/:id` | `ProtectedRoute` | authenticated |
| `/settings` | `ProtectedRoute` | authenticated |
| `/dashboard` | `ProtectedRoute` + `AdminRoute` | admin/owner |
| `/barbers` | `ProtectedRoute` + `AdminRoute` | admin/owner |
| `/services` | `ProtectedRoute` + `AdminRoute` | admin/owner |
| `/reports` | `ProtectedRoute` + `AdminRoute` | admin/owner |

**Guards:**
- `ProtectedRoute` (`src/components/ProtectedRoute.tsx`): Verifica `isAuthenticated` del AuthContext. Redirige a `/login` si no autenticado.
- `AdminRoute` (`src/components/AdminRoute.tsx`): Verifica `isAdmin` (role = 'admin' o 'owner'). Redirige a `/calendar` si no admin.

### 1.3 No hay flujo de reserva pública en este frontend

Este frontend (`sharp-time-pro`) es el **panel de administración** del negocio. No hay rutas de booking público. Las reservas públicas se hacen a través de:
- **Edge Functions** (`availability`, `book-appointment`, `cancel-booking`, `submit-consultation`) — accesibles directamente por URL sin pasar por este frontend
- Posiblemente una app/web pública separada que consume esas Edge Functions

---

## 2. Hallazgos de seguridad

### SEC-001 | 🔴 CRÍTICO | Edge Function `send-push-notification` sin validación de origen
**Archivo:** `supabase/functions/send-push-notification/index.ts:273-287`
**Riesgo:** La función acepta `user_id`, `title`, `message` del body de la request sin verificar JWT (`verify_jwt: false`). Cualquier persona puede enviar push notifications arbitrarias a cualquier usuario conociendo su `user_id`.
**CORS:** `Access-Control-Allow-Origin: *`
```typescript
// Línea 280: acepta user_id del request body sin auth
const { user_id, title, message, url } = await req.json();
```
**Fix sugerido:** Habilitar `verify_jwt: true` o validar que la request viene del trigger de Supabase verificando un header secreto compartido.

---

### SEC-002 | 🔴 CRÍTICO | `getAuthHeaders()` cae a anon key si no hay sesión
**Archivo:** `src/lib/supabase.ts:18`
**Riesgo:** Si la sesión expira o no existe, `getAuthHeaders()` devuelve el anon key como Bearer token. Todas las queries REST que usan esta función ejecutarían como `anon` role — lo cual con las policies anón actuales (`qual = true` en businesses, business_hours, holidays, services) daría acceso a datos de TODOS los negocios.
```typescript
const token = session?.access_token ?? SUPABASE_CONFIG.anonKey;
```
**Escenario:** Token expira → refresh falla → siguiente query filtra `?business_id=eq.X` pero se ejecuta como anon → RLS policy anón permite `true` en businesses/business_hours → leak de datos.
**Fix sugerido:** Si no hay sesión activa, redirigir al login en lugar de hacer fallback al anon key. Nunca usar anon key como Bearer en el panel admin.

---

### SEC-003 | 🟠 ALTO | Parámetro `rememberMe` es noop — sesión siempre persistente
**Archivo:** `src/contexts/AuthContext.tsx:142`, `src/pages/Login.tsx:40`
**Riesgo:** El usuario ve un checkbox "Recuérdame durante 30 días" pero el parámetro `_rememberMe` se ignora completamente (prefijo `_`). Supabase siempre persiste la sesión en localStorage (`persistSession: true`). Esto significa:
- La sesión **siempre** persiste, incluso si el usuario no marca "Recuérdame"
- En dispositivos compartidos, otro usuario podría acceder a la cuenta
```typescript
// Línea 142: _rememberMe ignorado
const login = async (email: string, password: string, _rememberMe = false) => {
```
**Fix sugerido:** Implementar lógica real para `rememberMe`: si es false, usar `sessionStorage` en lugar de `localStorage`, o hacer `signOut()` al cerrar la pestaña.

---

### SEC-004 | 🟠 ALTO | `ClientDetail` usa `id` de URL sin validación
**Archivo:** `src/pages/ClientDetail.tsx:45`
**Riesgo:** El parámetro `id` de la URL (`/clients/:id`) se pasa directamente a las queries de Supabase sin validar formato UUID. Aunque RLS protege contra acceso cross-business, un valor malicioso podría causar errores o inyección en la query string REST.
```typescript
const { id } = useParams<{ id: string }>();
// Usado directamente en: supabaseClientsApi.getWithBookings(id)
```
**Fix sugerido:** Validar que `id` sea un UUID válido antes de pasarlo a la API.

---

### SEC-005 | 🟠 ALTO | Queries REST construyen URLs por interpolación sin encode
**Archivos múltiples:**
- `src/services/supabaseNotifications.ts:84` — `user_id=eq.${userId}`
- `src/services/supabaseNotifications.ts:156` — `user_id=eq.${userId}`
- `src/services/supabaseBarbers.ts:156` — `barber_id=eq.${barberId}`
- `src/services/supabaseBarbers.ts:175` — `barber_id=eq.${barberId}`
- `src/services/supabaseBarbers.ts:357` — `barber_id=eq.${barberId}`
- `src/services/supabaseBookings.ts:104+` — múltiples parámetros

**Riesgo:** Los IDs se interpolan directamente en la URL sin `encodeURIComponent()`. Aunque los IDs son UUIDs generados por el sistema (no input del usuario), si alguno fuera manipulado podría inyectar operadores PostgREST (ej: `or`, `not`).

**Nota:** `AuthContext.tsx` sí usa `encodeURIComponent()` correctamente en las líneas 41, 60, 73. Pero los services no.

**Fix sugerido:** Usar `encodeURIComponent()` en todos los valores interpolados en URLs de query, especialmente en los que vienen de parámetros de URL.

---

### SEC-006 | 🟡 MEDIO | `Settings.tsx` — tab param de URL sin sanitización estricta
**Archivo:** `src/pages/Settings.tsx:69-72`
**Riesgo:** El parámetro `tab` del URL se lee con `useSearchParams()` y se valida contra una lista de tabs permitidos (`ADMIN_TABS`/`BARBER_TABS`), lo cual es correcto. Sin embargo, el valor se pasa a `setSearchParams()` que lo escribe de vuelta en la URL.
```typescript
const tabParam = searchParams.get('tab');
const [activeTab, setActiveTab] = useState(
  tabParam && allowedTabs.includes(tabParam) ? tabParam : defaultTab
);
```
**Evaluación:** ✅ Validado correctamente contra whitelist. Riesgo bajo.

---

### SEC-007 | 🟡 MEDIO | Sin rate limiting en login
**Archivo:** `src/pages/Login.tsx:25-56`, `src/contexts/AuthContext.tsx:142-161`
**Riesgo:** No hay rate limiting del lado del cliente para intentos de login. Supabase Auth tiene protección básica contra brute force (lockout temporal), pero no hay UI feedback ni backoff exponencial del lado del cliente.
**Fix sugerido:** Añadir delay exponencial tras intentos fallidos, o mostrar CAPTCHA después de N intentos.

---

### SEC-008 | 🟡 MEDIO | WhatsApp links inyectan datos de BD en URL
**Archivos:**
- `src/components/consultations/ConsultationTable.tsx:62`
- `src/components/consultations/ConsultationCard.tsx:39`

**Riesgo:** Se construyen URLs de WhatsApp interpolando `client_name` y `service_name` de la BD. Estos valores se pasan por `encodeURIComponent()`, lo cual es correcto para la URL. Sin embargo, si un atacante almacena HTML/JS en `client_name` a través de la API pública de consultas, el texto renderizado en la UI podría ser problemático.
```typescript
const whatsappUrl = `https://wa.me/34${consultation.client_phone.replace(/\D/g, '')}?text=Hola ${encodeURIComponent(consultation.client_name)}, ...`;
```
**Evaluación:** URL correctamente encoded. React escapa el HTML por defecto. Riesgo bajo pero el teléfono no se valida como numérico.

---

### SEC-009 | 🟡 MEDIO | `eventsStorage.ts` — localStorage sin protección
**Archivo:** `src/services/eventsStorage.ts:47,55`
**Riesgo:** Los eventos del calendario se almacenan en `localStorage` usando una key con `business_id`. Cualquier script en el mismo origen puede leer estos datos. Los datos incluyen nombres de eventos, notas, y barberos asignados.
```typescript
const raw = localStorage.getItem(getStorageKey());
localStorage.setItem(getStorageKey(), JSON.stringify(events));
```
**Fix sugerido:** Migrar a tabla en Supabase (la tabla `calendar` existe pero no se usa).

---

### SEC-010 | 🟡 MEDIO | Edge Function `send-push-notification` — `user_id` sin validación
**Archivo:** `supabase/functions/send-push-notification/index.ts:280-287`
**Riesgo:** El `user_id` recibido del body no se valida como UUID. Un valor malformado se pasa directamente a `.eq("user_id", user_id)` de Supabase JS client, que sí parametriza la query. Riesgo real bajo, pero falta validación de formato.
**Fix sugerido:** Validar formato UUID antes de usar.

---

### SEC-011 | 🟡 MEDIO | `dangerouslySetInnerHTML` en chart.tsx
**Archivo:** `src/components/ui/chart.tsx:70`
**Riesgo:** Usa `dangerouslySetInnerHTML` para inyectar CSS custom en un `<style>` tag. El contenido se genera a partir de la configuración del chart (`ChartConfig`), no de datos del usuario. El ID del chart se interpola directamente en el selector CSS.
```tsx
dangerouslySetInnerHTML={{
  __html: Object.entries(THEMES).map(([theme, prefix]) =>
    `${prefix} [data-chart=${id}] { ... }`
  )
}}
```
**Evaluación:** El `id` viene del código (prop del componente Chart), no de input del usuario. Riesgo bajo — es una librería UI (shadcn/ui). No hay datos de usuario involucrados.

---

### SEC-012 | 🟢 BAJO | Sin validación de complejidad de password
**Archivo:** `src/components/ChangePasswordDialog.tsx:46`
**Riesgo:** Solo valida longitud mínima (8 caracteres). No requiere mayúsculas, números, o caracteres especiales.
```typescript
if (password.length < 8) { ... }
```
**Fix sugerido:** Añadir requisitos de complejidad (mayúsculas, números, especiales) o usar un medidor de fortaleza.

---

### SEC-013 | 🟢 BAJO | `api.ts` contiene mock auth con token fake
**Archivo:** `src/services/api.ts:252`
**Riesgo:** El servicio mock de auth genera tokens fake (`mock-jwt-token-...`) y lee de `localStorage.getItem('auth')`. Este código parece ser legacy/mock que ya no se usa (el login real va por Supabase Auth), pero sigue en el codebase.
```typescript
token: 'mock-jwt-token-' + Math.random().toString(36).substring(2),
```
**Fix sugerido:** Eliminar código mock de auth si ya no se usa.

---

### SEC-014 | 🟢 BAJO | Validación de imágenes solo del lado del cliente
**Archivo:** `src/lib/imageValidation.ts:16-37`
**Riesgo:** La validación de tipo MIME y tamaño (5MB, solo JPG/PNG/WebP) se hace solo en el cliente. Un atacante puede bypassearla enviando requests directamente al bucket de Storage. Los buckets `barber_photos`, `consultation-photos`, `static` no tienen restricciones de MIME ni tamaño en el servidor.
**Fix sugerido:** Configurar `allowed_mime_types` y `file_size_limit` en los buckets de Supabase que no los tienen.

---

### SEC-015 | 🟢 BAJO | CORS `*` en Edge Function
**Archivo:** `supabase/functions/send-push-notification/index.ts:6`
**Riesgo:** `Access-Control-Allow-Origin: *` permite que cualquier origen llame a la Edge Function. Combinado con la falta de verificación JWT (SEC-001), cualquier web maliciosa podría enviar push notifications.
```typescript
"Access-Control-Allow-Origin": "*",
```
**Fix sugerido:** Restringir a los orígenes permitidos (dominio de la app).

---

## 3. Análisis del flujo de reserva pública

### 3.1 ¿Puede un visitante enumerar datos de otros negocios?

**Sí, parcialmente.** A través de las policies anón de RLS (documentado en audit-1b):

| Tabla | Datos expuestos a anon | Filtrado por business_id |
|---|---|---|
| `businesses` | Todo (nombre, email, teléfono, dirección) | ❌ `qual = true` |
| `business_hours` | Horarios de apertura | ❌ `qual = true` |
| `holidays` | Festivos | ❌ `qual = true` |
| `services` | Servicios activos (nombres, precios, duraciones) | ❌ Solo `is_active = true` |

Un visitante puede hacer:
```
GET /rest/v1/businesses?select=*    → Todos los negocios
GET /rest/v1/services?select=*      → Todos los servicios activos
GET /rest/v1/business_hours?select=* → Horarios de todos
```

### 3.2 Edge Functions públicas

Las Edge Functions de booking no están en este repo (solo `send-push-notification`), pero sabemos que `availability`, `book-appointment`, `cancel-booking`, y `submit-consultation` están desplegadas sin JWT verify. Presumiblemente reciben `business_id` como parámetro, lo cual es correcto para un flujo público, pero deberían validar que el business_id existe y está activo.

---

## 4. Manejo de tokens

| Aspecto | Estado | Detalle |
|---|---|---|
| **Almacenamiento** | `localStorage` | Supabase SDK default con `persistSession: true` |
| **Refresh automático** | ✅ | `autoRefreshToken: true` en `src/lib/supabase.ts:6` |
| **Detección URL** | ✅ | `detectSessionInUrl: true` (para OAuth callbacks) |
| **Expiración handling** | ⚠️ | Si refresh falla, `getAuthHeaders()` cae a anon key silenciosamente (SEC-002) |
| **Logout cleanup** | ✅ | `clearBusinessId()` + `setUser(null)` + `supabase.auth.signOut()` |
| **CSRF** | ✅ | No aplica — API usa Bearer tokens, no cookies |
| **rememberMe** | 🔴 | Noop — sesión siempre persistente (SEC-003) |

---

## 5. Resumen de hallazgos

| ID | Severidad | Descripción | Archivo:Línea |
|---|---|---|---|
| SEC-001 | 🔴 CRÍTICO | Edge Function push sin auth, cualquiera puede enviar notificaciones | `supabase/functions/send-push-notification/index.ts:273` |
| SEC-002 | 🔴 CRÍTICO | Fallback silencioso a anon key cuando sesión expira | `src/lib/supabase.ts:18` |
| SEC-003 | 🟠 ALTO | `rememberMe` es noop, sesión siempre en localStorage | `src/contexts/AuthContext.tsx:142` |
| SEC-004 | 🟠 ALTO | URL param `id` sin validación UUID en ClientDetail | `src/pages/ClientDetail.tsx:45` |
| SEC-005 | 🟠 ALTO | Interpolación de IDs en URLs REST sin `encodeURIComponent` | Múltiples services |
| SEC-006 | 🟡 MEDIO | Tab param validado correctamente (no issue) | `src/pages/Settings.tsx:69` |
| SEC-007 | 🟡 MEDIO | Sin rate limiting en login (depende de Supabase Auth) | `src/pages/Login.tsx:25` |
| SEC-008 | 🟡 MEDIO | WhatsApp URLs con datos de BD (correctamente encoded) | `ConsultationTable.tsx:62` |
| SEC-009 | 🟡 MEDIO | Eventos en localStorage sin protección | `src/services/eventsStorage.ts:47` |
| SEC-010 | 🟡 MEDIO | Edge Function no valida formato de user_id | `send-push-notification/index.ts:280` |
| SEC-011 | 🟡 MEDIO | `dangerouslySetInnerHTML` en chart (no user data) | `src/components/ui/chart.tsx:70` |
| SEC-012 | 🟢 BAJO | Password sin requisitos de complejidad | `ChangePasswordDialog.tsx:46` |
| SEC-013 | 🟢 BAJO | Mock auth code legacy en codebase | `src/services/api.ts:252` |
| SEC-014 | 🟢 BAJO | Validación de imágenes solo client-side | `src/lib/imageValidation.ts:16` |
| SEC-015 | 🟢 BAJO | CORS `*` en Edge Function sin auth | `send-push-notification/index.ts:6` |

---

## 6. Fixes priorizados

### Inmediato (Crítico)
1. **SEC-001**: Habilitar `verify_jwt: true` en `send-push-notification` o implementar validación de header secreto
2. **SEC-002**: No hacer fallback a anon key en `getAuthHeaders()`. Si no hay sesión, redirigir al login o lanzar error

### Corto plazo (Alto)
3. **SEC-003**: Implementar `rememberMe` real — usar `sessionStorage` cuando sea false, o registrar listener `beforeunload` para sign out
4. **SEC-005**: Añadir `encodeURIComponent()` a todos los valores interpolados en URLs REST
5. **SEC-004**: Validar formato UUID de parámetros de URL antes de usarlos en queries

### Medio plazo (Medio)
6. **SEC-007**: Añadir rate limiting visual y CAPTCHA tras N intentos fallidos
7. **SEC-009**: Migrar eventos de localStorage a tabla `calendar` en Supabase
8. **SEC-010**: Validar formato de inputs en Edge Functions
9. **SEC-014**: Configurar restricciones de MIME/tamaño en buckets de Supabase

### Baja prioridad
10. **SEC-012**: Mejorar política de complejidad de passwords
11. **SEC-013**: Eliminar código mock auth legacy
12. **SEC-015**: Restringir CORS a orígenes conocidos
