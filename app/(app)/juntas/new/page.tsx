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
    defaultValues: { moneda: 'PEN', frecuencia_pago: 'semanal', visibilidad: 'privada', cerrar_inscripciones: false }
  });

  useEffect(() => {
    if (!user) router.replace('/login?redirect=/juntas/new');
  }, [user, router]);

  if (!user) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Necesitas iniciar sesión para crear una junta. Redirigiendo...</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <h1 className="text-xl font-semibold">Crear junta</h1>
      <form
        className="grid gap-3 md:grid-cols-2"
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
            const slugBase = makeSlug(values.nombre);
            const slug = `${slugBase}-${juntaId.slice(0, 6)}`;
            const created = {
              ...values,
              id: juntaId,
              slug,
              invite_token: crypto.randomUUID(),
              admin_id: user.id,
              estado: 'borrador' as const,
              created_at: new Date().toISOString()
            };
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
            setErrorMsg(error instanceof Error ? error.message : 'No se pudo crear la junta. Intenta nuevamente.');
          } finally {
            setLoading(false);
          }
        })}
      >
        <Input placeholder="Nombre" {...register('nombre')} />
        <Input placeholder="Descripción" {...register('descripcion')} />
        <Select {...register('moneda')}><option value="PEN">PEN</option><option value="USD">USD</option></Select>
        <Input type="number" placeholder="Participantes" {...register('participantes_max')} />
        <Input type="number" placeholder="Monto por cuota" {...register('monto_cuota')} />
        <Select {...register('frecuencia_pago')}><option value="semanal">Semanal</option><option value="quincenal">Quincenal</option><option value="mensual">Mensual</option></Select>
        <Input type="date" {...register('fecha_inicio')} />
        <Input type="number" placeholder="Día límite pago" {...register('dia_limite_pago')} />
        <Input type="number" placeholder="Penalidad mora" {...register('penalidad_mora')} />
        <Select {...register('visibilidad')}><option value="privada">Privada</option><option value="invitacion">Invitación</option></Select>
        <label className="col-span-full flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('cerrar_inscripciones')} /> Cerrar inscripciones al completar
        </label>
        {formState.errors.nombre && <p className="col-span-full text-xs text-red-500">{formState.errors.nombre.message}</p>}
        {errorMsg && <p className="col-span-full text-xs text-red-500">{errorMsg}</p>}
        <Button className="col-span-full" disabled={loading}>{loading ? 'Creando...' : 'Guardar junta'}</Button>
      </form>
    </Card>
  );
}
