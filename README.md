# Juntas Digitales (MVP Web Comercial)

MVP web de juntas/panderos con experiencia **pública primero**: el usuario puede explorar sin login y autenticarse solo cuando quiere ejecutar acciones privadas.

## Rutas

### Públicas (sin login)
- `/` Landing comercial
- `/como-funciona`
- `/demo`
- `/junta/[slug]` (vista de invitación)
- `/login`, `/register`, `/forgot-password`

### Privadas (requieren login)
- `/dashboard`
- `/juntas`
- `/juntas/new`
- `/juntas/[id]`
- `/juntas/[id]/members`
- `/juntas/[id]/schedule`
- `/juntas/[id]/payments`
- `/profile`
- `/notifications`
- `/settings`

### Admin (requiere rol global `system_admin`)
- `/admin`

## Variables de entorno

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL=`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=`
- `NEXT_PUBLIC_ENABLE_MOCKS=true`

> Con `NEXT_PUBLIC_ENABLE_MOCKS=true`, la app levanta sin credenciales externas para demo comercial.

## Ejecutar local

```bash
npm install
npm run dev
```

Abrir: `http://localhost:3000`

## Deploy en Vercel Preview
1. Push branch.
2. Importar repo en Vercel.
3. Configurar env vars del proyecto.
4. Crear Preview Deploy.
5. Probar rutas públicas y privadas.

## SQL / Supabase
- Base inicial: `supabase/migrations/001_init.sql`
- Ajustes nuevos: `supabase/migrations/002_public_links_and_global_roles.sql`
- Seed demo base: `supabase/seed/seed.sql`
- Seed admin global: `supabase/seed/seed_admin.sql`

## Usuario admin seed (demo)
- **Email:** `admin@juntasdigitales.pe`
- **UUID seed:** `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`

> En modo mock, al iniciar sesión con ese email se habilita backoffice `/admin`.

## Checklist manual de validación
- [ ] Entrar a `/` sin login y ver landing comercial.
- [ ] Navegar a `/como-funciona` y `/demo` sin login.
- [ ] Desde CTA “Crear mi junta” pedir login y volver a `/juntas/new` tras autenticación.
- [ ] Crear junta y validar enlace público `/junta/[slug]`.
- [ ] En `/junta/[slug]`, botón “Quiero unirme” pide login si es anónimo.
- [ ] Usuario autenticado puede crear/editar junta en estado borrador.
- [ ] Admin de junta puede editar turnos en integrantes.
- [ ] Acceso `/admin` solo para rol global admin.
- [ ] Backoffice muestra KPIs, lista juntas e incluye bloquear junta.
