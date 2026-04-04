'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
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
import { createJuntaRecord } from '@/services/juntas.repository';

export default function NewJuntaPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const allJuntas = useAppStore((s) => (Array.isArray(s.juntas) ? s.juntas : []));
  const allSchedules = useAppStore((s) => (Array.isArray(s.schedules) ? s.schedules : []));
  const allMembers = useAppStore((s) => (Array.isArray(s.members) ? s.members : []));
  const setData = useAppStore((s) => s.setData);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, setError, formState } = useForm<z.infer<typeof createJuntaSchema>>({
    defaultValues: { frecuencia_pago: 'semanal', visibilidad: 'privada' }
  });

  useEffect(() => {
    if (!user) router.replace('/login?redirect=/juntas/new');
  }, [user, router]);

  if (!user) return <Card>Redirigiendo a login...</Card>;

  return (
    <Card className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Crear junta</h1>
      <p className="text-sm text-slate-600">Configura solo lo esencial para validar rápido tu junta.</p>

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
            const juntaId = crypto.randomUUID();
            const slug = `${makeSlug(values.nombre)}-${juntaId.slice(0, 6)}`;
            const created = {
              id: juntaId,
              admin_id: user.id,
              slug,
              invite_token: crypto.randomUUID(),
              nombre: values.nombre,
              descripcion: values.descripcion,
              moneda: 'PEN' as const,
              participantes_max: values.participantes_max,
              monto_cuota: values.monto_cuota,
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
              members: [...allMembers, { id: crypto.randomUUID(), junta_id: juntaId, profile_id: user.id, estado: 'activo', orden_turno: 1 }]
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

        <label className="text-sm font-medium">Aporte por turno/período</label>
        <Input type="number" {...register('monto_cuota')} />

        <label className="text-sm font-medium">Frecuencia de turnos</label>
        <Select {...register('frecuencia_pago')}>
          <option value="semanal">Semanal</option>
          <option value="quincenal">Quincenal</option>
          <option value="mensual">Mensual</option>
        </Select>

        <label className="text-sm font-medium">Fecha de inicio</label>
        <Input type="date" {...register('fecha_inicio')} />

        <label className="text-sm font-medium">Visibilidad</label>
        <Select {...register('visibilidad')}>
          <option value="publica">Pública</option>
          <option value="privada">Privada</option>
        </Select>

        {formState.errors.nombre && <p className="text-xs text-red-500">{formState.errors.nombre.message}</p>}
        {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
        <Button disabled={loading}>{loading ? 'Creando...' : 'Crear junta'}</Button>
      </form>
    </Card>
  );
}
