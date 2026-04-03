# Juntas Digitales (MVP Web Comercial)

MVP web de juntas/panderos con experiencia **pública primero** y login por intención.

## Rutas

### Públicas
- `/`
- `/como-funciona`
- `/demo`
- `/junta/[slug]`
- `/login`, `/register`, `/forgot-password`

### Privadas
- `/dashboard`
- `/juntas`
- `/juntas/new`
- `/juntas/[id]` (+ members/schedule/payments)
- `/profile`, `/notifications`, `/settings`

### Admin global
- `/admin` (requiere rol global `admin`)

## Variables de entorno
```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ENABLE_MOCKS=true`
- `NEXT_PUBLIC_ADMIN_EMAILS=` correos admin para modo mock (CSV)

## Ejecutar local
```bash
npm install
npm run dev
```

## Migraciones / seeds
1. `supabase/migrations/001_init.sql`
2. `supabase/migrations/002_public_links_and_global_roles.sql`
3. `supabase/migrations/003_junta_simulator_fields.sql`
4. `supabase/seed/seed.sql`
5. `supabase/seed/seed_admin.sql`

## Asignarme rol admin global
### Opción SQL directa (recomendada)
```sql
insert into public.user_global_roles (profile_id, role)
values ('TU_PROFILE_ID_UUID', 'admin')
on conflict do nothing;
```

### Opción mock local
En `.env.local`:
```env
NEXT_PUBLIC_ENABLE_MOCKS=true
NEXT_PUBLIC_ADMIN_EMAILS=tu-correo@dominio.com
```

## Cambios funcionales clave
- Login limpio (sin mostrar credenciales demo/admin en UI).
- Flujo crear junta robusto con validación, manejo de errores, loading, guard de sesión y persistencia (Supabase si está activo, mock si no).
- Pantalla de detalle de junta rediseñada como simulador financiero:
  - controles de grupo/aporte/premio/descuento/fee
  - cards de bolsa, fee e ingreso por ciclo
  - tabla de turnos con perfil ideal
- Backoffice admin con KPIs, tabla de juntas, tabla de usuarios e incidencias.
- `/juntas` estable con empty states y CTA claros.

## Checklist manual rápido
- [ ] Login/registro funcionan sin textos sensibles en UI.
- [ ] `/juntas` no crashea.
- [ ] `/juntas/new` guarda y redirige al detalle.
- [ ] `/juntas/[id]` muestra simulador + tabla de turnos.
- [ ] `/admin` accesible solo con rol global `admin`.
