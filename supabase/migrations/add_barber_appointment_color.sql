-- Add per-barber default color used to render their appointment and event cards
-- on the calendar. NULL means "use the automatic palette fallback".
--
-- Robustness:
--   * Constrained to a 7-char hex string (#RRGGBB). NULL is allowed.
--   * No default → existing rows keep NULL, preserving current pastel-by-index
--     behavior until an admin explicitly picks a color.
--   * RLS on public.users already scopes reads/writes to business_id, so this
--     column is automatically isolated per business — no extra policy needed.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS appointment_color text;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_appointment_color_format_chk;

ALTER TABLE public.users
  ADD CONSTRAINT users_appointment_color_format_chk
  CHECK (appointment_color IS NULL OR appointment_color ~ '^#[0-9A-Fa-f]{6}$');
