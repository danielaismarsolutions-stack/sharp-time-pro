-- Enable pg_net extension (allows HTTP requests from Postgres)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function that fires on notification INSERT and calls the Edge Function via pg_net
-- Only sends push for new bookings and cancellations (not modifications/moves)
CREATE OR REPLACE FUNCTION public.send_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
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

  -- Build the Edge Function URL from Supabase project URL
  supabase_url := current_setting('app.settings.supabase_url', true);

  -- Fallback to hardcoded project URL if setting not available
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://omeeupvetsacxbgojifx.supabase.co';
  END IF;

  service_role_key := current_setting('app.settings.service_role_key', true);

  edge_function_url := supabase_url || '/functions/v1/send-push-notification';

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
      'Authorization', 'Bearer ' || service_role_key
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the notifications table (matches existing trigger name)
DROP TRIGGER IF EXISTS on_notification_send_push ON public.notifications;

CREATE TRIGGER on_notification_send_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_notification();

-- Add a comment explaining the trigger
COMMENT ON FUNCTION public.send_push_notification() IS
  'Sends a Web Push notification via the send-push-notification Edge Function whenever a new notification is inserted. Uses pg_net for async HTTP calls.';
