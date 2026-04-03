# Juntas Digitales (MVP Web Comercial)

## Variables de entorno esperadas
Prioridad principal (Vercel Integration):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Compatibilidad legado:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Opcionales:
- `NEXT_PUBLIC_ENABLE_MOCKS=false`
- `NEXT_PUBLIC_ADMIN_EMAILS=`

## Ejecutar local
```bash
cp .env.example .env.local
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Migraciones SQL
Ejecuta en orden:
1. `supabase/migrations/001_init.sql`
2. `supabase/migrations/002_public_links_and_global_roles.sql`
3. `supabase/migrations/003_junta_simulator_fields.sql`

Seeds:
- `supabase/seed/seed.sql`
- `supabase/seed/seed_admin.sql`

## Asignar rol admin global
```sql
insert into public.user_global_roles (profile_id, role)
values ('TU_PROFILE_ID_UUID', 'admin')
on conflict do nothing;
```

## Qué quedó corregido
- Conexión Supabase centralizada con fallback de variables (incluye publishable key de Vercel).
- Login/registro conectados a Supabase Auth (signIn/signUp).
- Crear junta inserta en Supabase real y crea relación admin en `junta_members`.
- `/juntas` lee juntas reales desde Supabase (loading, empty, error).
- `/juntas/[id]` busca en Supabase cuando no está en store.
- Admin global mantenido sin exponer credenciales en UI.
