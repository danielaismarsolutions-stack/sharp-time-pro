# Auditoría RLS — Schema Public

**Proyecto:** Smartflow labs - Barbershops (`omeeupvetsacxbgojifx`)
**Fecha:** 2026-03-23
**Schema:** `public`
**Total tablas:** 14

---

## Función auxiliar: `get_my_business_id()`

```sql
CREATE OR REPLACE FUNCTION public.get_my_business_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT business_id FROM public.users WHERE auth_uid = auth.uid() LIMIT 1;
$$;
```

Obtiene el `business_id` del usuario autenticado buscando por `auth.uid()` en `public.users`.

---

## Resumen rápido

| Tabla | RLS | Policies | Filtra business_id | Anon access | Estado |
|---|---|---|---|---|---|
| `businesses` | ✅ | 2 | ✅ (`id = get_my_business_id()`) | 🔴 SELECT sin filtro | ⚠️ |
| `users` | ✅ | 3 | ✅ (parcial) | — | ⚠️ |
| `clients` | ✅ | 1 | ✅ | — | ✅ |
| `services` | ✅ | 2 | ✅ | ⚠️ SELECT `is_active=true` (sin filtro business) | ⚠️ |
| `bookings` | ✅ | 1 | ✅ | — | ✅ |
| `business_hours` | ✅ | 2 | ✅ | 🔴 SELECT sin filtro | ⚠️ |
| `holidays` | ✅ | 2 | ✅ | 🔴 SELECT sin filtro | ⚠️ |
| `settings` | ✅ | 0 | — | — | 🔴 Sin policies |
| `calendar` | ✅ | 0 | — | — | 🔴 Sin policies |
| `barber_schedules` | ✅ | 1 | ✅ | — | ✅ |
| `barber_time_off` | ✅ | 1 | ✅ | — | ✅ |
| `notifications` | ✅ | 1 | ✅ | — | ✅ |
| `push_subscriptions` | ✅ | 1 | ✅ | — | ✅ |
| `consultations` | ✅ | 1 | ✅ | — | ✅ |

---

## Detalle por tabla

### 1. `businesses`

- **RLS habilitado:** ✅
- **RLS forzado:** No

| Policy | Rol | Comando | USING (qual) | WITH CHECK |
|---|---|---|---|---|
| `anon_read_businesses` | anon | SELECT | `true` | — |
| `auth_business_all_businesses` | authenticated | ALL | `id = get_my_business_id()` | `id = get_my_business_id()` |

🔴 **`anon_read_businesses`**: Permite a usuarios anónimos leer **TODOS** los negocios sin ningún filtro. Expone datos de todos los businesses (nombre, email, teléfono, dirección, etc.).

---

### 2. `users`

- **RLS habilitado:** ✅
- **RLS forzado:** No

| Policy | Rol | Comando | USING (qual) | WITH CHECK |
|---|---|---|---|---|
| `auth_users_select` | authenticated | SELECT | `auth_uid = auth.uid() OR email = auth.jwt()->>'email' OR business_id = get_my_business_id()` | — |
| `auth_users_update` | authenticated | UPDATE | `auth_uid = auth.uid() OR email = auth.jwt()->>'email' OR business_id = get_my_business_id()` | igual |
| `auth_users_delete` | authenticated | DELETE | `business_id = get_my_business_id()` | — |

⚠️ **Observaciones:**
- No hay policy de INSERT — los usuarios autenticados no pueden crear registros directamente (bloqueado por RLS).
- SELECT/UPDATE permiten acceso por `auth_uid`, `email` o `business_id`, lo cual es correcto para onboarding + operación normal.
- Sin acceso anón.

---

### 3. `clients`

- **RLS habilitado:** ✅
- **RLS forzado:** No

| Policy | Rol | Comando | USING (qual) | WITH CHECK |
|---|---|---|---|---|
| `auth_business_all_clients` | authenticated | ALL | `business_id = get_my_business_id()` | `business_id = get_my_business_id()` |

✅ Correcta. Solo acceso autenticado, filtrado por business_id.

---

### 4. `services`

- **RLS habilitado:** ✅
- **RLS forzado:** No

| Policy | Rol | Comando | USING (qual) | WITH CHECK |
|---|---|---|---|---|
| `anon_read_services` | anon | SELECT | `is_active = true` | — |
| `auth_business_all_services` | authenticated | ALL | `business_id = get_my_business_id()` | `business_id = get_my_business_id()` |

🔴 **`anon_read_services`**: Permite a anónimos leer **todos** los servicios activos de **todos** los negocios. No filtra por `business_id`. Expone precios, duraciones y nombres de servicios de cualquier negocio.

---

### 5. `bookings`

- **RLS habilitado:** ✅
- **RLS forzado:** No

| Policy | Rol | Comando | USING (qual) | WITH CHECK |
|---|---|---|---|---|
| `auth_business_all_bookings` | authenticated | ALL | `business_id = get_my_business_id()` | `business_id = get_my_business_id()` |

✅ Correcta. Sin acceso anón. Filtrada por business_id.

⚠️ **Nota:** Las reservas online las crea presumiblemente una Edge Function con `service_role`. No hay policy anón para INSERT, lo cual es correcto si se usa service_role.

---

### 6. `business_hours`

- **RLS habilitado:** ✅
- **RLS forzado:** No

| Policy | Rol | Comando | USING (qual) | WITH CHECK |
|---|---|---|---|---|
| `anon_read_business_hours` | anon | SELECT | `true` | — |
| `auth_business_all_business_hours` | authenticated | ALL | `business_id = get_my_business_id()` | `business_id = get_my_business_id()` |

🔴 **`anon_read_business_hours`**: `qual = true` — permite leer horarios de **todos** los negocios sin filtro.

---

### 7. `holidays`

- **RLS habilitado:** ✅
- **RLS forzado:** No

| Policy | Rol | Comando | USING (qual) | WITH CHECK |
|---|---|---|---|---|
| `anon_read_holidays` | anon | SELECT | `true` | — |
| `auth_business_all_holidays` | authenticated | ALL | `business_id = get_my_business_id()` | `business_id = get_my_business_id()` |

🔴 **`anon_read_holidays`**: `qual = true` — permite leer festivos de **todos** los negocios sin filtro.

---

### 8. `settings` 🔴

- **RLS habilitado:** ✅
- **RLS forzado:** No

| Policy | Rol | Comando | USING (qual) | WITH CHECK |
|---|---|---|---|---|
| *(ninguna)* | — | — | — | — |

🔴 **Sin policies.** RLS está habilitado, por lo que la tabla queda **completamente bloqueada** para todos los roles (ni authenticated ni anon pueden leer/escribir). Si la app necesita acceder a settings, esto es un bug. Solo accesible via `service_role`.

---

### 9. `calendar` 🔴

- **RLS habilitado:** ✅
- **RLS forzado:** No

| Policy | Rol | Comando | USING (qual) | WITH CHECK |
|---|---|---|---|---|
| *(ninguna)* | — | — | — | — |

🔴 **Sin policies.** Misma situación que `settings`: tabla completamente bloqueada. Tiene 0 filas, posiblemente porque nadie puede escribir en ella desde el cliente.

---

### 10. `barber_schedules`

- **RLS habilitado:** ✅
- **RLS forzado:** No

| Policy | Rol | Comando | USING (qual) | WITH CHECK |
|---|---|---|---|---|
| `auth_business_all_barber_schedules` | authenticated | ALL | `business_id = get_my_business_id()` | `business_id = get_my_business_id()` |

✅ Correcta. Solo acceso autenticado, filtrado por business_id.

---

### 11. `barber_time_off`

- **RLS habilitado:** ✅
- **RLS forzado:** No

| Policy | Rol | Comando | USING (qual) | WITH CHECK |
|---|---|---|---|---|
| `auth_business_all_barber_time_off` | authenticated | ALL | `business_id = get_my_business_id()` | `business_id = get_my_business_id()` |

✅ Correcta. Solo acceso autenticado, filtrado por business_id.

---

### 12. `notifications`

- **RLS habilitado:** ✅
- **RLS forzado:** No

| Policy | Rol | Comando | USING (qual) | WITH CHECK |
|---|---|---|---|---|
| `auth_business_all_notifications` | authenticated | ALL | `business_id = get_my_business_id()` | `business_id = get_my_business_id()` |

✅ Correcta. Solo acceso autenticado, filtrado por business_id.

⚠️ **Nota menor:** Filtra solo por business_id, no por user_id. Cualquier usuario del mismo negocio puede ver/modificar notificaciones de otros usuarios del negocio.

---

### 13. `push_subscriptions`

- **RLS habilitado:** ✅
- **RLS forzado:** No

| Policy | Rol | Comando | USING (qual) | WITH CHECK |
|---|---|---|---|---|
| `auth_business_all_push_subscriptions` | authenticated | ALL | `business_id = get_my_business_id()` | `business_id = get_my_business_id()` |

✅ Correcta. Solo acceso autenticado, filtrado por business_id.

---

### 14. `consultations`

- **RLS habilitado:** ✅
- **RLS forzado:** No

| Policy | Rol | Comando | USING (qual) | WITH CHECK |
|---|---|---|---|---|
| `auth_business_all_consultations` | authenticated | ALL | `business_id = get_my_business_id()` | `business_id = get_my_business_id()` |

✅ Correcta. Solo acceso autenticado, filtrado por business_id.

---

## Hallazgos y recomendaciones

### 🔴 Críticos

| # | Problema | Tabla(s) | Riesgo |
|---|---|---|---|
| 1 | **Tablas sin policies** | `settings`, `calendar` | Tablas bloqueadas — no accesibles desde el cliente. Si se necesitan, falta crear policies. |
| 2 | **Anon SELECT sin filtro de business_id** | `businesses`, `business_hours`, `holidays` | Cualquier visitante anónimo puede leer datos de **todos** los negocios. |
| 3 | **Anon SELECT filtra solo `is_active`** | `services` | Servicios activos de **todos** los negocios visibles para anónimos. Expone precios. |

### ⚠️ A revisar

| # | Problema | Tabla(s) | Detalle |
|---|---|---|---|
| 4 | **`users` sin policy INSERT** | `users` | No se puede crear un usuario desde el cliente (puede ser intencional si se usa trigger o Edge Function). |
| 5 | **`notifications` sin filtro user_id** | `notifications` | Un barbero puede ver/editar notificaciones de otro barbero del mismo negocio. |
| 6 | **`rls_forced = false` en todas** | todas | El owner de la tabla (postgres) bypasea RLS. Esto es el default de Supabase y no es un problema si no se usa el service_role indebidamente. |

### 💡 Recomendaciones para policies anón

Las policies `anon` con `qual = true` son necesarias para el booking público, pero deberían filtrar por `business_id` pasado como parámetro en la query del cliente:

```sql
-- Ejemplo: restringir anon a un business_id específico
CREATE POLICY "anon_read_business_hours" ON business_hours
  FOR SELECT TO anon
  USING (business_id = current_setting('request.headers')::json->>'x-business-id');
```

O alternativamente, usar una Edge Function con `service_role` para la página de booking público y eliminar las policies anón por completo.
