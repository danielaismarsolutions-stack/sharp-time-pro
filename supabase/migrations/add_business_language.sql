-- Idioma de la aplicación por negocio ('es' | 'en').
-- Lo lee el frontend (LanguageContext) y las edge functions de email
-- (send-booking-email, send-reminder-email) para localizar plantillas.
-- Idempotente: se puede ejecutar varias veces sin efectos secundarios.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'es';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'businesses_language_check'
      AND conrelid = 'public.businesses'::regclass
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_language_check CHECK (language IN ('es', 'en'));
  END IF;
END $$;

COMMENT ON COLUMN public.businesses.language IS
  'Idioma de la app y de los emails para este negocio: es (español) | en (inglés)';
