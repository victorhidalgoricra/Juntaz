# Juntas Digitales

## Variables de entorno
Principales (Vercel integration):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Compatibilidad legado:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Opcionales:
- `NEXT_PUBLIC_ENABLE_MOCKS=false`
- `NEXT_PUBLIC_ADMIN_EMAILS=`

## Setup
```bash
cp .env.example .env.local
npm install
npm run dev
```

## Migraciones SQL
Ejecutar en orden:
1. `supabase/migrations/001_init.sql`
2. `supabase/migrations/002_public_links_and_global_roles.sql`
3. `supabase/migrations/003_junta_simulator_fields.sql`
4. `supabase/migrations/004_public_visibility.sql`
5. `supabase/migrations/005_ensure_juntas_core.sql`
6. `supabase/migrations/006_profiles_auto_create.sql`

## Qué incluye ahora
- Formulario **simplificado** de crear junta con 7 campos esenciales.
- Guardado real en Supabase + asociación admin en `junta_members`.
- `/juntas` (mis juntas) estable con loading/empty/error.
- `/explorar` con listado de juntas públicas.
- Enlace de invitación para juntas privadas desde detalle.

## Rol admin global
```sql
insert into public.user_global_roles (profile_id, role)
values ('TU_PROFILE_ID_UUID', 'admin')
on conflict do nothing;
```


## Nota FK admin_id
`public.juntas.admin_id` referencia `public.profiles(id)` (no `auth.users`).
Por eso se incluye trigger/backfill para asegurar que todo usuario autenticado tenga profile.

## Regla de bloqueo por activación tardía
Timezone de negocio: **America/Lima**.

- Si una junta está en `borrador` y la fecha actual (America/Lima) supera `fecha_inicio`, pasa a bloqueada.
- Una junta bloqueada no permite unirse ni activarse.
- Esta validación se aplica en backend al intentar unirse o activar, y se refleja también en UI.
