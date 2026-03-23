# Auditoría Fase 3B — Realtime, Frontend Data Fetching, Imágenes y Edge Functions

**Proyecto:** Smartflow labs - Barbershops (`omeeupvetsacxbgojifx`)
**Fecha:** 2026-03-23

---

## 1. Supabase Realtime — Subscriptions

### 1.1 Inventario de canales por componente

| Componente | Canal | Tabla | Filtro | Cleanup |
|---|---|---|---|---|
| `Calendar.tsx:252` | `bookings-realtime` | bookings | `business_id=eq.X` | ✅ removeChannel |
| `Calendar.tsx:316` | `calendar-users-sync-{ts}` | users | `business_id=eq.X` | ✅ removeChannel |
| `Barbers.tsx:99` | `barbers-sync-{ts}` | users | `business_id=eq.X` | ✅ removeChannel |
| `Settings.tsx:134` | `business_hours_changes` | business_hours | `business_id=eq.X` | ✅ removeChannel |
| `Consultations.tsx` (via service) | `consultations` | consultations | `business_id=eq.X` | ✅ removeChannel |
| `BusinessBrandContext.tsx:68` | `business_brand_changes` | businesses | `id=eq.X` | ✅ removeChannel |
| `NotificationContext.tsx:130` | `notifications-{userId}-{ts}` | notifications | `user_id=eq.X` | ✅ removeChannel |
| `useReportsData.ts:274` | `reports-bookings-{ts}` | bookings | `business_id=eq.X` | ✅ removeChannel |
| `useReportsData.ts:285` | `reports-users-{ts}` | users | `business_id=eq.X` | ✅ removeChannel |

**Total: 9 canales realtime**

### 1.2 Canales activos por página (sesión de un admin)

| Página | Canales activos | Contextos globales |
|---|---|---|
| Calendar | 2 (bookings + users) | + 2 (brand + notifications) = **4** |
| Reports | 2 (bookings + users) | + 2 = **4** |
| Barbers | 1 (users) | + 2 = **3** |
| Settings | 1 (business_hours) | + 2 = **3** |
| Consultations | 1 (consultations) | + 2 = **3** |
| Dashboard | 0 | + 2 = **2** |
| Clients | 0 | + 2 = **2** |

**Máximo concurrente por usuario: 4 canales** (en Calendar o Reports).

### 1.3 Análisis multi-tenant

---

### SCALE-017 | 🟠 ALTO | Canales realtime no escalan con multi-tenant — nombre fijo colisiona entre negocios
**Archivos:**
- `Calendar.tsx:252` — canal `'bookings-realtime'` (nombre fijo)
- `Settings.tsx:134` — canal `'business_hours_changes'` (nombre fijo)
- `supabaseConsultations.ts:83` — canal `'consultations'` (nombre fijo)
- `BusinessBrandContext.tsx:68` — canal `'business_brand_changes'` (nombre fijo)

**Problema:** Cuatro canales usan nombres fijos sin incluir `business_id` ni `user_id`. Si dos usuarios de negocios distintos están conectados al mismo tiempo en la misma instancia de Supabase, los canales con nombre fijo podrían colisionar (Supabase usa el canal como identificador de multiplexing). Los filtros `business_id=eq.X` protegen los datos, pero el canal podría recibir eventos de otros negocios que son descartados.

**Contraste:** `Calendar.tsx:316`, `Barbers.tsx:99`, `NotificationContext.tsx:130`, `useReportsData.ts:274,285` usan `Date.now()` o `userId` para hacer los nombres únicos ✅.

**Impacto a escala:** Con 100 negocios simultáneos, los canales fijos multiplexan tráfico innecesario.

**Fix:**
```typescript
// Antes
.channel('bookings-realtime')
// Después
.channel(`bookings-realtime-${getBusinessId()}`)
```

---

### SCALE-018 | 🟡 MEDIO | 9 canales realtime por usuario — overhead de conexión
**Problema:** Cada usuario admin con Calendar abierto mantiene 4 canales WebSocket simultáneos. Supabase tiene un límite de conexiones concurrentes por proyecto (200 en plan free, 500 en pro). Con 50 usuarios concurrentes × 4 canales = 200 canales, se alcanza el límite del plan free.

**Fix sugerido:** Consolidar canales — un solo canal por business_id que escuche cambios en múltiples tablas:
```typescript
supabase
  .channel(`business-${businessId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `business_id=eq.${businessId}` }, handleBookings)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `business_id=eq.${businessId}` }, handleUsers)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations', filter: `business_id=eq.${businessId}` }, handleConsultations)
  .subscribe();
```

---

## 2. Frontend Data Fetching y Cache

### 2.1 Estado de React Query

**Configuración:** `src/App.tsx:31`
```typescript
const queryClient = new QueryClient(); // SIN opciones custom
```

**Defaults activos (TanStack Query):**
- `staleTime: 0` — dato se considera stale inmediatamente
- `gcTime: 300000` (5 min) — cache en memoria
- `refetchOnWindowFocus: true` — re-fetch al cambiar de pestaña
- `retry: 3` — 3 reintentos automáticos
- `refetchOnMount: true` — re-fetch al montar componente

### 2.2 Adopción de React Query

| Componente | Usa React Query | Método de fetching | Cache |
|---|---|---|---|
| Reports (`useReportsData.ts`) | ✅ 3 queries | `useQuery` con `staleTime` | ✅ |
| Calendar (`Calendar.tsx`) | ❌ | `useState` + `useEffect` + `useCallback` | ❌ |
| Dashboard (`Dashboard.tsx`) | ❌ | `useState` + `useEffect` | ❌ |
| Barbers (`Barbers.tsx`) | ❌ | `useState` + `useEffect` | ❌ |
| Clients (`Clients.tsx`) | ❌ | `useState` + `useEffect` | ❌ |
| ClientDetail (`ClientDetail.tsx`) | ❌ | `useState` + `useEffect` | ❌ |
| Services (`Services.tsx`) | ❌ | `useState` + `useEffect` | ❌ |
| Consultations (`Consultations.tsx`) | ❌ | `useState` + `useEffect` | ❌ |
| Settings (`Settings.tsx`) | ❌ | `useState` + `useEffect` | ❌ |
| Notifications (`NotificationContext.tsx`) | ❌ | `useState` + `useEffect` | ❌ |
| Business Brand (`BusinessBrandContext.tsx`) | ❌ | `useState` + `useEffect` | ❌ |

**Solo 1 de 11 componentes usa React Query. El 91% del data fetching no tiene cache.**

---

### SCALE-019 | 🔴 CRÍTICO | React Query apenas adoptado — 91% de fetching sin cache
**Problema:** React Query está instalado y configurado pero solo se usa en Reports (3 queries). Todas las demás páginas hacen `useState` + `useEffect` + fetch directo, lo que significa:
- **Cada navegación re-fetch todo** — ir de Calendar a Clients y volver a Calendar hace 3 fetches nuevos (bookings, clients, barbers)
- **Sin deduplicación** — si Calendar y un modal abierto necesitan bookings, se hacen 2 requests independientes
- **Sin cache entre páginas** — los datos de barberos se fetch en Calendar, Barbers, Reports, BookingModal... cada uno independientemente
- **Sin retry automático** fuera de Reports
- **Sin background refetch** cuando el usuario vuelve a la pestaña

**Impacto:** Multiplica por 3-5× el número de requests al servidor comparado con una implementación con cache.

**Fix:** Migrar todos los data fetches a `useQuery`:
```typescript
// Antes (Calendar.tsx)
const [bookings, setBookings] = useState([]);
useEffect(() => {
  supabaseBookingsApi.getAll(filters).then(setBookings);
}, [filters]);

// Después
const { data: bookings = [] } = useQuery({
  queryKey: ['bookings', businessId, filters],
  queryFn: () => supabaseBookingsApi.getAll(filters),
  staleTime: 1000 * 60 * 2,
});
```

---

### SCALE-020 | 🟠 ALTO | Datos duplicados — mismos datos fetcheados en múltiples componentes sin cache compartida
**Datos afectados:**

| Dato | Componentes que lo fetchean independientemente |
|---|---|
| **Bookings** | Calendar.tsx, Dashboard.tsx, Reports (useQuery), BookingModal.tsx, ConsultationBookingModal.tsx |
| **Barbers** | Calendar.tsx, Barbers.tsx, Reports (useQuery) |
| **Clients** | Calendar.tsx, Clients.tsx |
| **Services** | Calendar.tsx, Services.tsx |
| **Business Hours** | Calendar.tsx, Settings.tsx |

**Impacto:** Navegando entre Calendar → Dashboard → Calendar genera: `getAll(bookings)` × 3 + `getAll(barbers)` × 2. Cada `getAll(barbers)` dispara 1+2N queries (SCALE-015). Con 10 barberos, solo navegar entre 2 páginas genera ~63 queries.

---

### SCALE-021 | 🟡 MEDIO | `staleTime: 0` por defecto — re-fetch innecesario al montar
**Archivo:** `src/App.tsx:31`
**Problema:** El `QueryClient` no tiene `staleTime` global. Incluso las 3 queries de Reports con `staleTime: 120000` se re-fetch si el componente se desmontado/remontado en menos de 2 minutos.
**Fix:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutos
      refetchOnWindowFocus: false,
    },
  },
});
```

---

### SCALE-022 | 🟡 MEDIO | Zero `useMutation` — sin invalidación automática tras mutaciones
**Problema:** Ninguna mutación (create, update, delete) usa `useMutation`. Esto significa que tras crear un booking, el código hace un `setState` local o llama `loadData()` manualmente, sin invalidar las caches de otros componentes que podrían tener datos stale.

**Ejemplo:** Crear un booking en Calendar no invalida la cache de Dashboard ni Reports. Si el usuario navega a Reports, verá datos stale hasta que el polling de 30s o el realtime lo actualice.

**Fix:** Usar `useMutation` con `onSuccess: () => queryClient.invalidateQueries(['bookings'])`.

---

### SCALE-023 | 🟢 BAJO | Hook muerto `useWeeklyBookings.ts`
**Archivo:** `src/hooks/useWeeklyBookings.ts`
**Problema:** Define un hook `useWeeklyBookings` con React Query pero **nunca se importa ni usa** en ningún componente. Código muerto.
**Fix:** Eliminar el archivo.

---

## 3. Imágenes — Optimización y Subida

### 3.1 Resumen de pipelines de subida

| Upload | Archivo | Compresión | Resize | Formato | Validación | Thumbnails |
|---|---|---|---|---|---|---|
| **Service Photo** | `uploadServicePhoto.ts` | ✅ quality 0.8 | ✅ max 800×800 | ✅ → WebP | ✅ MIME + size | ❌ |
| **Avatar Barbero** | `supabaseStorage.ts` | ❌ | ❌ | ❌ | ✅ MIME + size | ❌ |
| **Logo Negocio** | `Settings.tsx:208` | ❌ | ❌ | ❌ | ⚠️ Solo `image/*` | ❌ |

---

### SCALE-024 | 🟠 ALTO | Avatares de barberos se suben sin optimización — 5MB renderizados a 48px
**Archivos:**
- Upload: `src/services/supabaseStorage.ts:29-34` — upload raw, sin compresión
- Render: `src/components/barbers/BarberCard.tsx:58` — `h-12 w-12` (48×48px)
- Render: `src/components/barbers/AvatarUpload.tsx:101` — `h-20 w-20` (80×80px)

**Problema:** Un usuario puede subir una foto de 5MB, 4000×4000px que se renderiza a 48×48px. El navegador descarga los 5MB completos cada vez que se muestra el avatar. Con 10 barberos en la lista, esto son potencialmente 50MB de imágenes.

**Contraste:** `uploadServicePhoto.ts` SÍ optimiza (canvas resize a 800×800, WebP quality 0.8). La misma lógica debería aplicarse a avatares.

**Fix:** Aplicar el mismo pipeline de `optimizeImage()` de `uploadServicePhoto.ts` al avatar upload:
```typescript
// En supabaseStorage.ts, antes de upload:
import { optimizeImage } from '@/utils/uploadServicePhoto';
const optimizedFile = await optimizeImage(file); // resize + WebP + quality 0.8
```

---

### SCALE-025 | 🟡 MEDIO | Logo de negocio sin optimización + acepta SVG (ya reportado como SEC-017)
**Archivo:** `src/pages/Settings.tsx:208-261`
**Problema:** No hay resize, compresión, ni conversión de formato. Acepta `image/*` incluyendo SVG. Un logo de 2MB se sirve tal cual.
**Fix:** Aplicar pipeline de optimización (resize a max 400×400, WebP, quality 0.85) y restringir MIME types.

---

### SCALE-026 | 🟡 MEDIO | Sin lazy loading en imágenes
**Archivos afectados:**
- `ServicePhotoUpload.tsx:146` — `<img>` sin `loading="lazy"`
- `Settings.tsx:514` — logo `<img>` sin `loading="lazy"`
- Todos los `<AvatarImage>` en `BarberCard.tsx`, `AvatarUpload.tsx`

**Problema:** Todas las imágenes cargan eagerly. En la lista de barberos con 10+ avatares, el navegador descarga todas las imágenes al montar el componente, incluso las que están fuera del viewport.
**Fix:** Añadir `loading="lazy"` a todas las `<img>` tags excepto las above-the-fold.

---

### SCALE-027 | 🟢 BAJO | Sin thumbnails ni srcset — siempre se sirve la imagen original
**Problema:** No existe generación de thumbnails. Un avatar renderizado a 48×48 descarga el archivo original completo. No hay `srcset` para responsive images.
**Fix a futuro:** Usar Supabase Image Transformation (si está habilitado) o generar thumbnails al subir:
```
// Supabase Image Transformation URL
supabase.storage.from('barber-avatars').getPublicUrl(path, {
  transform: { width: 96, height: 96, resize: 'cover' }
})
```

---

## 4. Edge Functions

### 4.1 `send-push-notification` — Única Edge Function en el repo

**Archivo:** `supabase/functions/send-push-notification/index.ts` (355 líneas)

| Aspecto | Estado | Detalle |
|---|---|---|
| **Lógica pesada** | ⚠️ Moderada | Crypto: VAPID JWT (ES256), ECDH key exchange, HKDF, AES-128-GCM — todo via `crypto.subtle` (HW accelerated) |
| **Timeout risk** | ⚠️ Medio | Per subscription: crypto + HTTP push. Con `Promise.allSettled` en paralelo. El riesgo viene de push endpoints lentos. |
| **Error handling** | ✅ Bueno | Try/catch top-level, per-subscription catch, input validation, expired sub cleanup |
| **DB calls** | 2+ | 1 SELECT + N DELETEs secuenciales (SCALE-010 ya documentado) |
| **CORS** | 🔴 `*` | Ya documentado como SEC-015 |
| **Auth** | 🔴 Sin JWT | Ya documentado como SEC-001 |

---

### SCALE-028 | 🟡 MEDIO | Edge Function sin timeout propio — push endpoints lentos bloquean la función
**Archivo:** `supabase/functions/send-push-notification/index.ts:243-253`
```typescript
const response = await fetch(subscription.endpoint, {
  method: "POST",
  headers: { ... },
  body: encrypted,
});
```
**Problema:** El `fetch()` al push endpoint externo no tiene timeout. Si el push service (FCM, Mozilla Push, etc.) está lento, la función esperará indefinidamente hasta el timeout de Deno (default: 150s para Edge Functions de Supabase).

**Impacto:** Con 5 subscriptions y un push service que tarda 30s en responder, la función tarda 150s (el timeout de Deno) porque `Promise.allSettled` espera a que todas terminen.

**Fix:**
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
const response = await fetch(subscription.endpoint, {
  method: "POST",
  headers: { ... },
  body: encrypted,
  signal: controller.signal,
});
clearTimeout(timeout);
```

---

### SCALE-029 | 🟢 BAJO | Solo 1 Edge Function en el repo — el resto solo está desplegado
**Problema:** Hay 9 Edge Functions desplegadas en Supabase (audit-1c), pero solo `send-push-notification` tiene código en este repo. Las 8 restantes (`availability`, `book-appointment`, `cancel-booking`, `send-booking-email`, `get-barbers`, `get-services`, `submit-consultation`, `availability-v2`) no tienen código auditable.
**Fix:** Localizar y centralizar el código de todas las Edge Functions en este repo para poder auditarlas.

---

## 5. Resumen de hallazgos

| ID | Severidad | Descripción | Categoría |
|---|---|---|---|
| SCALE-019 | 🔴 CRÍTICO | React Query solo en 1/11 componentes — 91% sin cache | Frontend cache |
| SCALE-017 | 🟠 ALTO | Canales realtime con nombre fijo colisionan multi-tenant | Realtime |
| SCALE-020 | 🟠 ALTO | Mismos datos fetcheados 3-5× sin cache compartida | Frontend cache |
| SCALE-024 | 🟠 ALTO | Avatares sin optimización — 5MB rendidos a 48px | Imágenes |
| SCALE-018 | 🟡 MEDIO | 9 canales realtime/usuario — no consolidados | Realtime |
| SCALE-021 | 🟡 MEDIO | `staleTime: 0` — re-fetch innecesario al montar | Frontend cache |
| SCALE-022 | 🟡 MEDIO | Zero `useMutation` — sin invalidación automática | Frontend cache |
| SCALE-025 | 🟡 MEDIO | Logo sin optimización + acepta SVG | Imágenes |
| SCALE-026 | 🟡 MEDIO | Sin lazy loading en imágenes | Imágenes |
| SCALE-028 | 🟡 MEDIO | Edge Function sin timeout en fetch a push endpoints | Edge Functions |
| SCALE-023 | 🟢 BAJO | Hook muerto `useWeeklyBookings.ts` | Código muerto |
| SCALE-027 | 🟢 BAJO | Sin thumbnails ni srcset | Imágenes |
| SCALE-029 | 🟢 BAJO | 8 Edge Functions desplegadas sin código en el repo | Edge Functions |

---

## 6. Fixes priorizados

### Inmediato
1. **SCALE-019/020**: Migrar todos los data fetches a `useQuery` con queryKeys consistentes — elimina fetching duplicado y añade cache entre páginas
2. **SCALE-024**: Añadir optimización de imagen al avatar upload (reusar `optimizeImage()` de `uploadServicePhoto.ts`)
3. **SCALE-017**: Añadir `businessId` o `userId` a todos los nombres de canales realtime

### Corto plazo
4. **SCALE-021**: Configurar `staleTime` global en QueryClient (2 minutos mínimo)
5. **SCALE-022**: Migrar mutaciones a `useMutation` con invalidación de cache
6. **SCALE-018**: Consolidar canales realtime por business (1 canal multi-tabla)
7. **SCALE-028**: Añadir `AbortController` con timeout de 10s en fetch de push endpoints
8. **SCALE-026**: Añadir `loading="lazy"` a todas las imágenes below-the-fold

### Limpieza
9. **SCALE-023**: Eliminar `useWeeklyBookings.ts`
10. **SCALE-029**: Centralizar código de todas las Edge Functions en el repo
