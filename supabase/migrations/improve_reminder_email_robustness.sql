-- Recordatorios robustos:
-- 1. Corrige el desfase de zona horaria: la cita (booking_date + start_time) es hora local
--    del negocio (Europe/Madrid), pero se comparaba contra NOW() como si fuera UTC.
--    Resultado: los recordatorios de "24h antes" llegaban 22h antes (verano) y los de
--    "2h antes" llegarían justo a la hora de la cita.
-- 2. Reintentos con backoff (mismo patrón que process_booking_confirmations):
--    antes se marcaba reminder_sent_at ANTES de llamar al Edge Function con pg_net
--    (fire-and-forget), así que cualquier fallo (timeout, error de Resend, cold start)
--    perdía el recordatorio para siempre. Ahora reminder_sent_at lo marca el Edge
--    Function tras el envío exitoso, y aquí se reintenta hasta 5 veces.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_last_attempt_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.bookings.reminder_attempts IS 'Intentos de envío del email de recordatorio (máx 5).';
COMMENT ON COLUMN public.bookings.reminder_last_attempt_at IS 'Último intento de envío del recordatorio.';

CREATE OR REPLACE FUNCTION public.process_booking_reminders()
RETURNS void AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  edge_function_url TEXT;
  r RECORD;
BEGIN
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;

  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    RAISE WARNING 'process_booking_reminders: supabase_url not found in Vault';
    RETURN;
  END IF;

  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    RAISE WARNING 'process_booking_reminders: service_role_key not found in Vault';
    RETURN;
  END IF;

  edge_function_url := v_supabase_url || '/functions/v1/send-reminder-email';

  FOR r IN
    SELECT
      b.id AS booking_id,
      b.business_id,
      b.client_email,
      b.client_name,
      b.service_name,
      b.barber,
      b.booking_date,
      b.start_time,
      b.end_time,
      b.cancel_token
    FROM public.bookings b
    JOIN public.businesses biz ON biz.id = b.business_id
    WHERE b.status = 'confirmed'
      AND b.client_email IS NOT NULL
      AND b.client_email <> ''
      AND b.reminder_sent_at IS NULL
      AND b.reminder_attempts < 5
      AND (b.reminder_last_attempt_at IS NULL
           OR b.reminder_last_attempt_at < NOW() - INTERVAL '4 minutes')
      AND biz.client_notification_delay IS NOT NULL
      -- Instante real de la cita: fecha+hora interpretadas en la zona horaria del negocio
      AND ((b.booking_date + b.start_time) AT TIME ZONE COALESCE(biz.timezone, 'Europe/Madrid')) > NOW()
      AND ((b.booking_date + b.start_time) AT TIME ZONE COALESCE(biz.timezone, 'Europe/Madrid'))
          - (biz.client_notification_delay || ' hours')::interval <= NOW()
    ORDER BY b.booking_date, b.start_time
    LIMIT 50
    FOR UPDATE OF b SKIP LOCKED
  LOOP
    -- Reclamar el intento ANTES de llamar (evita duplicados en ejecuciones concurrentes).
    -- reminder_sent_at lo marca el Edge Function solo si Resend acepta el email.
    UPDATE public.bookings
    SET reminder_attempts = reminder_attempts + 1,
        reminder_last_attempt_at = NOW()
    WHERE id = r.booking_id;

    PERFORM net.http_post(
      url := edge_function_url,
      body := jsonb_build_object(
        'booking_id', r.booking_id,
        'business_id', r.business_id,
        'to_email', r.client_email,
        'customer_name', r.client_name,
        'service_name', r.service_name,
        'barber_name', r.barber,
        'booking_date', r.booking_date,
        'start_time', r.start_time,
        'end_time', r.end_time,
        'cancel_token', r.cancel_token
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      timeout_milliseconds := 15000
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.process_booking_reminders() IS
  'Busca reservas que necesitan email de recordatorio y las envía vía el Edge Function send-reminder-email, con hasta 5 reintentos. Ejecutada por pg_cron cada 5 minutos.';
