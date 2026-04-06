-- Support public/private visibility in juntas
DO $$ BEGIN
  ALTER TYPE public.junta_visibility ADD VALUE IF NOT EXISTS 'publica';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Optional normalization if old value was used for open/public juntas
update public.juntas
set visibilidad = 'publica'
where visibilidad::text = 'invitacion';
