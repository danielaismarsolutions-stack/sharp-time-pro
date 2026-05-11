-- When the ONLY watched field that changed is `end_time`, this is a
-- per-appointment duration tweak (custom end time feature). In that case
-- we deliberately skip queueing the client modification email.
-- All other modification paths (date/time/service/barber changes) keep
-- the existing behavior unchanged.
CREATE OR REPLACE FUNCTION public.handle_booking_modification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 1) Did any user-facing field actually change?
  IF NOT (
       NEW.booking_date IS DISTINCT FROM OLD.booking_date
    OR NEW.start_time   IS DISTINCT FROM OLD.start_time
    OR NEW.end_time     IS DISTINCT FROM OLD.end_time
    OR NEW.service_id   IS DISTINCT FROM OLD.service_id
    OR NEW.service_name IS DISTINCT FROM OLD.service_name
    OR NEW.user_id      IS DISTINCT FROM OLD.user_id
    OR NEW.barber       IS DISTINCT FROM OLD.barber
  ) THEN
    RETURN NEW;
  END IF;

  -- 1b) If end_time is the ONLY watched field that changed, treat it as a
  --     silent per-appointment duration adjustment: do not notify the client.
  IF NEW.end_time     IS DISTINCT FROM OLD.end_time
     AND NEW.booking_date IS NOT DISTINCT FROM OLD.booking_date
     AND NEW.start_time   IS NOT DISTINCT FROM OLD.start_time
     AND NEW.service_id   IS NOT DISTINCT FROM OLD.service_id
     AND NEW.service_name IS NOT DISTINCT FROM OLD.service_name
     AND NEW.user_id      IS NOT DISTINCT FROM OLD.user_id
     AND NEW.barber       IS NOT DISTINCT FROM OLD.barber
  THEN
    RETURN NEW;
  END IF;

  -- 2) Skip if this is a status change (cancellation / completion own that flow)
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- 3) Only notify for active future bookings with an email
  IF NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;
  IF NEW.booking_date < CURRENT_DATE THEN
    RETURN NEW;
  END IF;
  IF NEW.client_email IS NULL OR NEW.client_email = '' THEN
    RETURN NEW;
  END IF;

  -- 4) Capture the OLD state so the email can render "before -> after"
  NEW.modification_previous := jsonb_build_object(
    'booking_date', OLD.booking_date,
    'start_time',   OLD.start_time,
    'end_time',     OLD.end_time,
    'service_name', OLD.service_name,
    'barber',       OLD.barber
  );

  -- 5) Reset trackers so the cron picks this row up on its next tick
  NEW.modification_sent_at         := NULL;
  NEW.modification_attempts        := 0;
  NEW.modification_last_attempt_at := NULL;

  RETURN NEW;
END;
$function$;
