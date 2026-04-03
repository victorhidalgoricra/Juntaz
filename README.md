# Juntas Digitales (MVP Web)

Aplicación web para administrar juntas/panderos informales en Perú.

## 1) Stack técnico
- **Frontend:** Next.js 14 (App Router) + TypeScript estricto
- **UI:** Tailwind CSS + componentes reutilizables estilo shadcn
- **Estado global:** Zustand
- **Formularios/validaciones:** React Hook Form + Zod
- **Backend/BaaS:** Supabase (opcional en MVP local)
- **DB:** PostgreSQL (Supabase)
- **Fechas:** date-fns
- **KPIs:** Recharts

## 2) Arquitectura de carpetas

```txt
app/
  (auth)/
  (app)/
components/
  layout/
  ui/
features/
  auth/
  juntas/
hooks/
lib/
services/
store/
types/
supabase/
  migrations/
  seed/
```

## 3) Variables de entorno
Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Variables:
- `NEXT_PUBLIC_SUPABASE_URL`: URL de proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: llave pública anon de Supabase.
- `NEXT_PUBLIC_ENABLE_MOCKS`: `true|false`.
  - `true` => usa modo mock local (recomendado para validar sin credenciales).
  - `false` => usa Supabase si URL y KEY están configuradas.

## 4) Instalación y ejecución local (exacto)

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables
cp .env.example .env.local

# 3. Levantar en desarrollo
npm run dev

# 4. Abrir en navegador
# http://localhost:3000
```

## 5) Scripts disponibles
- `npm run dev` → servidor local
- `npm run build` → build producción
- `npm run start` → correr build
- `npm run typecheck` → chequeo TypeScript
- `npm run lint` → lint Next.js
- `npm run check` → typecheck + lint

## 6) Supabase: migraciones y seed
Ejecuta en SQL Editor de Supabase:
1. `supabase/migrations/001_init.sql`
2. (Opcional demo) `supabase/seed/seed.sql`

Incluye:
- tablas: profiles, juntas, junta_members, payment_schedules, payments, payouts, invitations, notifications, audit_logs
- llaves foráneas, índices, enums y restricciones
- funciones helper y **RLS policies**

## 7) Modo mock (sin credenciales)
Si no tienes Supabase listo, el proyecto **levanta igual**:
- define `NEXT_PUBLIC_ENABLE_MOCKS=true`
- el estado se persiste localmente con Zustand (localStorage)
- permite validar: auth MVP, crear juntas, miembros, cronograma, pagos, dashboard

## 8) Deploy exacto en Vercel
1. Push del repo a GitHub/GitLab/Bitbucket.
2. En Vercel: **New Project** → Import Repo.
3. Framework detectado: **Next.js**.
4. Variables de entorno en Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ENABLE_MOCKS` (`false` en producción con Supabase real).
5. Deploy.
6. Si usas Supabase Auth, agrega dominio de Vercel en la allowlist de redirect URLs de Supabase.

## 9) Flujo funcional cubierto MVP
- Registro / Login / Recuperación (MVP)
- Dashboard con KPIs
- Crear junta
- Detalle junta + activación (mínimo 2 integrantes)
- Gestión de integrantes (invitar/listar/eliminar invitado)
- Cronograma automático según frecuencia y participantes
- Pagos manuales + aprobación/rechazo
- Historial de pagos + exportación CSV
- Perfil, notificaciones y settings base

## 10) Checklist final de validación funcional
Usa este checklist al probar en web:

- [ ] La app abre en `http://localhost:3000`.
- [ ] Registro y login funcionan.
- [ ] Se puede crear una junta con todos los campos obligatorios.
- [ ] El cronograma se genera automáticamente al crear la junta.
- [ ] No permite activar junta con menos de 2 integrantes.
- [ ] Se pueden invitar integrantes y ver su estado.
- [ ] Se puede registrar pago manual.
- [ ] Admin puede aprobar/rechazar pago.
- [ ] Dashboard muestra KPIs (pagadas/vencidas/total aportado).
- [ ] Se puede exportar CSV de pagos.
- [ ] Notificaciones y perfil cargan correctamente.
- [ ] Diseño responsive usable en móvil/desktop.

## 11) Pendientes MVP -> Producción
- Integrar Supabase Auth completo (sesión server/client).
- Storage de comprobantes (Supabase Storage).
- Jobs de vencimiento y notificaciones automáticas (email/WhatsApp).
- Tests unitarios/e2e + CI.
- Observabilidad y hardening de seguridad.
