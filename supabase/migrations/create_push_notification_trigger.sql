-- Enable pg_net extension (allows HTTP requests from Postgres)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function that fires on notification INSERT and calls the Edge Function via pg_net
CREATE OR REPLACE FUNCTION public.send_push_on_notification()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  request_body JSONB;
BEGIN
  -- Build the Edge Function URL from Supabase project URL
  -- This reads from a config table or uses the known project URL
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
    'url', CASE NEW.type
      WHEN 'booking_created' THEN '/calendar'
      WHEN 'booking_cancelled' THEN '/calendar'
      WHEN 'booking_modified' THEN '/calendar'
      WHEN 'booking_deleted' THEN '/calendar'
      WHEN 'booking_status_changed' THEN '/calendar'
      WHEN 'booking_reminder' THEN '/calendar'
      WHEN 'event_created' THEN '/calendar'
      WHEN 'event_modified' THEN '/calendar'
      WHEN 'event_deleted' THEN '/calendar'
      WHEN 'client_created' THEN '/clients'
      WHEN 'client_modified' THEN '/clients'
      WHEN 'client_deleted' THEN '/clients'
      WHEN 'consultation_created' THEN '/consultations'
      WHEN 'consultation_updated' THEN '/consultations'
      WHEN 'consultation_deleted' THEN '/consultations'
      WHEN 'service_created' THEN '/services'
      WHEN 'service_modified' THEN '/services'
      WHEN 'service_deleted' THEN '/services'
      ELSE '/'
    END
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

-- Create the trigger on the notifications table
DROP TRIGGER IF EXISTS trigger_push_on_notification ON public.notifications;

CREATE TRIGGER trigger_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_notification();

-- Add a comment explaining the trigger
COMMENT ON FUNCTION public.send_push_on_notification() IS
  'Sends a Web Push notification via the send-push-notification Edge Function whenever a new notification is inserted. Uses pg_net for async HTTP calls.';
