'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { createJuntaSchema } from '@/features/juntas/schemas';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { generarCronograma } from '@/services/schedule.service';
import { makeSlug } from '@/lib/slug';
import { generateAccessCode } from '@/lib/access-code';
import { createJuntaRecord, fetchJuntaById, fetchPublicJuntas } from '@/services/juntas.repository';
import { calcularSimulacionJunta } from '@/services/incentive.service';

export default function NewJuntaPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const allJuntas = useAppStore((s) => (Array.isArray(s.juntas) ? s.juntas : []));
  const allSchedules = useAppStore((s) => (Array.isArray(s.schedules) ? s.schedules : []));
  const allMembers = useAppStore((s) => (Array.isArray(s.members) ? s.members : []));
  const setData = useAppStore((s) => s.setData);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { control, register, handleSubmit, setError, formState } = useForm<z.infer<typeof createJuntaSchema>>({
    defaultValues: {
      frecuencia_pago: 'semanal',
      visibilidad: 'privada',
      tipo_junta: 'normal',
      incentivo_porcentaje: 5,
      incentivo_regla: 'primero_ultimo'
    }
  });

  const form = useWatch({ control });
  const simulacion = calcularSimulacionJunta({
    participantes: Number(form.participantes_max || 2),
    cuotaBase: Number(form.monto_cuota || 0),
    frecuencia: form.frecuencia_pago ?? 'semanal',
    fechaInicio: form.fecha_inicio || new Date().toISOString(),
    tipoJunta: form.tipo_junta ?? 'normal',
    incentivoPorcentaje: form.incentivo_porcentaje,
    incentivoRegla: form.incentivo_regla
  });

  useEffect(() => {
    if (!user) router.replace('/login?redirect=/juntas/new');
  }, [user, router]);

  if (!user) return <Card>Redirigiendo a login...</Card>;

  return (
    <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-[1.3fr_0.7fr]">
      <Card className="space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Crear junta</h1>
          <p className="text-sm text-slate-600">Configura una junta normal o una junta con incentivos redistributivos.</p>
        </div>

        <form
          className="grid gap-3"
          onSubmit={handleSubmit(async (values) => {
            setErrorMsg(null);
            const parsed = createJuntaSchema.safeParse(values);
            if (!parsed.success) {
              const issue = parsed.error.issues[0];
              setError(issue.path[0] as 'nombre', { message: issue.message });
              return;
            }

            try {
              setLoading(true);
              console.log('[Crear Junta] submit values', values);
              const juntaId = crypto.randomUUID();
              const slug = `${makeSlug(values.nombre)}-${juntaId.slice(0, 6)}`;
              const bolsaBase = values.participantes_max * values.monto_cuota;
              const created = {
                id: juntaId,
                admin_id: user.id,
                slug,
                invite_token: crypto.randomUUID(),
                access_code: values.visibilidad === 'privada' ? generateAccessCode('PRIV') : undefined,
                nombre: values.nombre,
                descripcion: values.descripcion,
                moneda: 'PEN' as const,
                participantes_max: values.participantes_max,
                monto_cuota: values.monto_cuota,
                cuota_base: values.monto_cuota,
                bolsa_base: bolsaBase,
                tipo_junta: values.tipo_junta,
                incentivo_porcentaje: values.tipo_junta === 'incentivo' ? Number(values.incentivo_porcentaje ?? 0) : 0,
                incentivo_regla: values.tipo_junta === 'incentivo' ? values.incentivo_regla ?? 'primero_ultimo' : 'primero_ultimo',
                premio_primero_pct: 0,
                descuento_ultimo_pct: 0,
                fee_plataforma_pct: 0,
                frecuencia_pago: values.frecuencia_pago,
                fecha_inicio: values.fecha_inicio,
                dia_limite_pago: 1,
                visibilidad: values.visibilidad,
                cerrar_inscripciones: false,
                estado: 'borrador' as const,
                created_at: new Date().toISOString()
              };

              const persist = await createJuntaRecord(created);
              if (!persist.ok) throw new Error(persist.message);

              const postCreateById = await fetchJuntaById(juntaId);
              if (process.env.NODE_ENV === 'development') {
                console.log('[Crear Junta] post-create fetch by id', {
                  juntaId,
                  visibilidad: values.visibilidad,
                  ok: postCreateById.ok,
                  data: postCreateById.ok ? postCreateById.data : null,
                  error: postCreateById.ok ? null : postCreateById.message
                });
              }

              if (values.visibilidad === 'publica') {
                const postCreatePublicCatalog = await fetchPublicJuntas();
                if (process.env.NODE_ENV === 'development') {
                  const existsInPublicCatalog =
                    postCreatePublicCatalog.ok && postCreatePublicCatalog.data.some((item) => item.id === juntaId);
                  console.log('[Crear Junta] post-create public catalog fetch', {
                    juntaId,
                    ok: postCreatePublicCatalog.ok,
                    existsInPublicCatalog,
                    size: postCreatePublicCatalog.ok ? postCreatePublicCatalog.data.length : 0,
                    error: postCreatePublicCatalog.ok ? null : postCreatePublicCatalog.message
                  });
                }
              }

              const schedule = generarCronograma({
                juntaId,
                participantes: values.participantes_max,
                monto: values.monto_cuota,
                frecuencia: values.frecuencia_pago,
                fechaInicio: values.fecha_inicio
              });

              setData({
                juntas: [created, ...allJuntas],
                schedules: [...allSchedules, ...schedule],
                members: [...allMembers, { id: crypto.randomUUID(), junta_id: juntaId, profile_id: user.id, estado: 'activo', rol: 'admin', orden_turno: 1 }]
              });

              router.push(`/juntas/${juntaId}`);
            } catch (error) {
              setErrorMsg(error instanceof Error ? error.message : 'No se pudo crear la junta.');
            } finally {
              setLoading(false);
            }
          })}
        >
          <label className="text-sm font-medium">Nombre de la junta</label>
          <Input placeholder="Ej: Junta Emprendedores" {...register('nombre')} />

          <label className="text-sm font-medium">Descripción (opcional)</label>
          <textarea className="min-h-24 rounded-md border border-slate-300 p-3 text-sm" placeholder="Describe el objetivo de la junta" {...register('descripcion')} />

          <label className="text-sm font-medium">Tamaño del grupo</label>
          <Input type="number" {...register('participantes_max')} />

          <label className="text-sm font-medium">Cuota base por ronda</label>
          <Input type="number" {...register('monto_cuota')} />

          <label className="text-sm font-medium">Tipo de junta</label>
          <Select {...register('tipo_junta')}>
            <option value="normal">Normal</option>
            <option value="incentivo">Con incentivos</option>
          </Select>

          <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">
            {form.tipo_junta === 'incentivo'
              ? 'Los primeros turnos reciben menos y los últimos más. Las cuotas se redistribuyen entre participantes sin que la plataforma retenga dinero.'
              : 'Todos aportan lo mismo y todos reciben el mismo monto base según su turno.'}
          </div>

          {form.tipo_junta === 'incentivo' && (
            <>
              <label className="text-sm font-medium">Porcentaje incentivo (%)</label>
              <Input type="number" step="0.01" min="0" {...register('incentivo_porcentaje')} />

              <label className="text-sm font-medium">Regla incentivo</label>
              <Select {...register('incentivo_regla')}>
                <option value="primero_ultimo">Solo primer y último</option>
                <option value="escalonado">Escalonado por posición (beta)</option>
              </Select>
            </>
          )}

          <label className="text-sm font-medium">Frecuencia de turnos</label>
          <Select {...register('frecuencia_pago')}>
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
          </Select>

          <label className="text-sm font-medium">Fecha de inicio</label>
          <Input type="date" {...register('fecha_inicio')} />

          <label className="text-sm font-medium">Visibilidad</label>
          <Controller
            control={control}
            name="visibilidad"
            render={({ field }) => (
              <Select
                name={field.name}
                value={field.value ?? 'privada'}
                onChange={(event) => {
                  const nextValue = event.target.value as 'publica' | 'privada';
                  console.log('[Crear Junta] visibilidad change', nextValue);
                  field.onChange(nextValue);
                }}
                onBlur={field.onBlur}
              >
                <option value="publica">Pública</option>
                <option value="privada">Privada</option>
              </Select>
            )}
          />

          {(formState.errors.nombre || formState.errors.incentivo_porcentaje) && (
            <p className="text-xs text-red-500">{formState.errors.nombre?.message || formState.errors.incentivo_porcentaje?.message}</p>
          )}
          {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
          <Button disabled={loading}>{loading ? 'Creando...' : 'Crear junta'}</Button>
        </form>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-lg font-semibold">Resumen en vivo</h2>
        <p className="text-sm text-slate-600">Tipo: <span className="font-medium capitalize">{form.tipo_junta || 'normal'}</span></p>
        <p className="text-sm text-slate-600">Grupo: <span className="font-medium">{form.participantes_max || 0}</span> personas</p>
        <p className="text-sm text-slate-600">Cuota base: <span className="font-medium">S/ {form.monto_cuota || 0}</span></p>
        <p className="text-sm text-slate-600">Bolsa base: <span className="font-medium">S/ {simulacion.bolsaBase}</span></p>
        <p className="text-sm text-slate-600">Incentivo: <span className="font-medium">{simulacion.incentivoPorcentaje}%</span></p>
        <p className="text-sm text-slate-600">Frecuencia: <span className="font-medium capitalize">{form.frecuencia_pago || '—'}</span></p>
        <p className="text-sm text-slate-600">Visibilidad: <span className="font-medium capitalize">{form.visibilidad || '—'}</span></p>
        <div className="rounded-md bg-slate-100 p-3 text-xs text-slate-600">
          Plataforma: no retiene dinero. Todo ajuste se redistribuye entre participantes.
        </div>
      </Card>
    </div>
  );
}
