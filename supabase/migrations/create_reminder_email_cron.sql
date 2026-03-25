-- Add client_notification_delay column to businesses table
-- Stores the number of hours before appointment to send reminder email
-- NULL means reminders are disabled
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS client_notification_delay integer DEFAULT NULL;

ALTER TABLE public.businesses
ADD CONSTRAINT chk_client_notification_delay
CHECK (client_notification_delay IS NULL OR client_notification_delay IN (2, 4, 12, 24, 48));

COMMENT ON COLUMN public.businesses.client_notification_delay IS 'Hours before appointment to send client reminder email. NULL = disabled.';

-- Function that checks for upcoming bookings needing reminder emails
-- and calls the send-reminder-email Edge Function via pg_net
CREATE OR REPLACE FUNCTION public.process_booking_reminders()
RETURNS void AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  edge_function_url TEXT;
  r RECORD;
BEGIN
  -- Read secrets from Vault
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;

  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
  END IF;

  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    RAISE WARNING 'process_booking_reminders: service_role_key not found in Vault';
    RETURN;
  END IF;

  edge_function_url := v_supabase_url || '/functions/v1/send-reminder-email';

  -- Find all bookings that:
  -- 1. Have status 'confirmed'
  -- 2. Have a client_email
  -- 3. Their business has client_notification_delay set (not null)
  -- 4. reminder_sent_at IS NULL (not yet sent)
  -- 5. The appointment datetime minus the delay is <= NOW (it's time to send)
  -- 6. The appointment is still in the future (don't remind for past bookings)
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
      b.cancel_token,
      biz.client_notification_delay
    FROM public.bookings b
    JOIN public.businesses biz ON biz.id = b.business_id
    WHERE b.status = 'confirmed'
      AND b.client_email IS NOT NULL
      AND b.client_email != ''
      AND b.reminder_sent_at IS NULL
      AND biz.client_notification_delay IS NOT NULL
      AND (b.booking_date + b.start_time) > NOW()
      AND (b.booking_date + b.start_time - (biz.client_notification_delay || ' hours')::interval) <= NOW()
    LIMIT 50
  LOOP
    -- Mark as sent FIRST to prevent duplicate sends on concurrent runs
    UPDATE public.bookings
    SET reminder_sent_at = NOW()
    WHERE id = r.booking_id
      AND reminder_sent_at IS NULL;

    IF FOUND THEN
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
        )
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.process_booking_reminders() IS
  'Checks for upcoming bookings that need reminder emails and sends them via the send-reminder-email Edge Function. Called by pg_cron every 5 minutes.';

-- Schedule the cron job to run every 5 minutes
SELECT cron.schedule(
  'process-booking-reminders',
  '*/5 * * * *',
  $$SELECT public.process_booking_reminders()$$
);
