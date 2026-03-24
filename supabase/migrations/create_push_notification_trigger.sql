-- Enable pg_net extension (allows HTTP requests from Postgres)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function that fires on notification INSERT and calls the Edge Function via pg_net
-- Only sends push for new bookings and cancellations (not modifications/moves)
-- Reads secrets from Supabase Vault (encrypted at rest) instead of hardcoding them
CREATE OR REPLACE FUNCTION public.send_push_on_notification()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  request_body JSONB;
  performed_by TEXT;
BEGIN
  -- Only send push notifications for new bookings and cancellations
  IF NEW.type NOT IN ('booking_created', 'booking_cancelled') THEN
    RETURN NEW;
  END IF;

  -- Skip push if the notification recipient is the same person who performed the action
  performed_by := NEW.metadata ->> 'performed_by_user_id';
  IF performed_by IS NOT NULL AND performed_by = NEW.user_id::text THEN
    RETURN NEW;
  END IF;

  -- Read secrets from Vault (encrypted at rest)
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;

  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  -- Fallback for supabase_url only (not for key — fail if missing)
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
  END IF;

  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    RAISE WARNING 'send_push_on_notification: service_role_key not found in Vault';
    RETURN NEW;
  END IF;

  edge_function_url := v_supabase_url || '/functions/v1/send-push-notification';

  -- Build the request payload from the NEW notification row
  request_body := jsonb_build_object(
    'user_id', NEW.user_id,
    'title', NEW.title,
    'message', NEW.message,
    'url', '/calendar'
  );

  -- Send async HTTP POST via pg_net (non-blocking, won't slow down the INSERT)
  PERFORM net.http_post(
    url := edge_function_url,
    body := request_body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old vulnerable function (had hardcoded service_role_key)
DROP FUNCTION IF EXISTS public.send_push_notification();

-- Create the trigger on the notifications table
DROP TRIGGER IF EXISTS on_notification_send_push ON public.notifications;

CREATE TRIGGER on_notification_send_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_notification();

-- Add a comment explaining the trigger
COMMENT ON FUNCTION public.send_push_on_notification() IS
  'Sends a Web Push notification via the send-push-notification Edge Function whenever a new notification is inserted. Reads secrets from Supabase Vault. Uses pg_net for async HTTP calls.';
