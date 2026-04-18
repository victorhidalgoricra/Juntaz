'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PublicNav } from '@/components/marketing/public-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createJuntaSchema } from '@/features/juntas/schemas';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { makeSlug } from '@/lib/slug';
import { generateAccessCode } from '@/lib/access-code';
import { createJuntaRecord } from '@/services/juntas.repository';
import { generarCronograma } from '@/services/schedule.service';

const DEMO_DRAFT_KEY = 'jd-demo-create-draft';

type DemoValues = z.infer<typeof createJuntaSchema>;

export default function DemoPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { juntas, schedules, members, setData } = useAppStore();
  const [authGate, setAuthGate] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, setError, formState } = useForm<DemoValues>({
    defaultValues: {
      nombre: '',
      descripcion: '',
      participantes_max: 8,
      monto_cuota: 20,
      tipo_junta: 'normal',
      turn_assignment_mode: 'random',
      frecuencia_pago: 'semanal',
      fecha_inicio: '',
      visibilidad: 'privada'
    }
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DEMO_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<DemoValues>;
      reset({
        nombre: parsed.nombre ?? '',
        descripcion: parsed.descripcion ?? '',
        participantes_max: parsed.participantes_max ?? 8,
        monto_cuota: parsed.monto_cuota ?? 20,
        tipo_junta: parsed.tipo_junta ?? 'normal',
        turn_assignment_mode: parsed.turn_assignment_mode ?? 'random',
        frecuencia_pago: parsed.frecuencia_pago ?? 'semanal',
        fecha_inicio: parsed.fecha_inicio ?? '',
        visibilidad: parsed.visibilidad ?? 'privada'
      });
    } catch {
      // ignore malformed drafts
    }
  }, [reset]);

  const saveDraft = (values: DemoValues) => {
    try {
      window.localStorage.setItem(DEMO_DRAFT_KEY, JSON.stringify(values));
    } catch {
      // ignore storage errors
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setErrorMsg(null);
    setAuthGate(false);

    const parsed = createJuntaSchema.safeParse(values);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue.path[0] as keyof DemoValues, { message: issue.message });
      return;
    }

    const normalized = parsed.data;
    saveDraft(normalized);

    if (!user) {
      setAuthGate(true);
      return;
    }

    try {
      setLoading(true);
      const juntaId = crypto.randomUUID();
      const slug = `${makeSlug(normalized.nombre)}-${juntaId.slice(0, 6)}`;
      const accessCode = normalized.visibilidad === 'privada' ? generateAccessCode('PRIV') : undefined;

      const junta = {
        id: juntaId,
        admin_id: user.id,
        slug,
        invite_token: crypto.randomUUID(),
        access_code: accessCode,
        integrantes_actuales: 1,
        is_member_current_user: true,
        nombre: normalized.nombre.trim(),
        descripcion: normalized.descripcion,
        moneda: 'PEN' as const,
        participantes_max: normalized.participantes_max,
        monto_cuota: normalized.monto_cuota,
        cuota_base: normalized.monto_cuota,
        bolsa_base: normalized.participantes_max * normalized.monto_cuota,
        tipo_junta: normalized.tipo_junta,
        turn_assignment_mode: normalized.turn_assignment_mode,
        incentivo_porcentaje: 0,
        incentivo_regla: 'primero_ultimo' as const,
        incentivo_turnos: [],
        premio_primero_pct: 0,
        descuento_ultimo_pct: 0,
        fee_plataforma_pct: 0,
        frecuencia_pago: normalized.frecuencia_pago,
        fecha_inicio: normalized.fecha_inicio,
        dia_limite_pago: 1,
        visibilidad: normalized.visibilidad,
        cerrar_inscripciones: false,
        estado: 'borrador' as const,
        created_at: new Date().toISOString()
      };

      const persistResult = await createJuntaRecord(junta);
      if (!persistResult.ok) throw new Error(persistResult.message);

      const cronograma = generarCronograma({
        juntaId,
        participantes: normalized.participantes_max,
        monto: normalized.monto_cuota,
        frecuencia: normalized.frecuencia_pago,
        fechaInicio: normalized.fecha_inicio
      });

      setData({
        juntas: [junta, ...juntas.filter((item) => item.id !== juntaId)],
        schedules: [...schedules.filter((item) => item.junta_id !== juntaId), ...cronograma],
        members: [
          ...members,
          {
            id: crypto.randomUUID(),
            junta_id: juntaId,
            profile_id: user.id,
            estado: 'activo',
            rol: 'admin',
            orden_turno: 1
          }
        ]
      });

      try {
        window.localStorage.removeItem(DEMO_DRAFT_KEY);
      } catch {
        // ignore
      }

      router.push(`/juntas/${juntaId}`);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'No se pudo completar tu creación. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <PublicNav />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Crea tu junta desde Demo</h1>
          <p className="text-sm text-slate-600">Completa el formulario real. Si aún no inicias sesión, te guiamos para continuar sin perder tu avance.</p>
        </div>

        <Card className="space-y-4 p-5">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Nombre de junta</label>
              <Input placeholder="Ej: Junta Taxistas Centro" {...register('nombre')} />
              {formState.errors.nombre && <p className="text-xs text-red-500">{formState.errors.nombre.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Descripción</label>
              <Input placeholder="Breve descripción" {...register('descripcion')} />
            </div>

            <div>
              <label className="text-sm font-medium">Integrantes</label>
              <Input type="number" min={4} max={20} {...register('participantes_max', { valueAsNumber: true })} />
              {formState.errors.participantes_max && <p className="text-xs text-red-500">{formState.errors.participantes_max.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Cuota (S/)</label>
              <Input type="number" min={20} {...register('monto_cuota', { valueAsNumber: true })} />
              {formState.errors.monto_cuota && <p className="text-xs text-red-500">{formState.errors.monto_cuota.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Frecuencia</label>
              <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" {...register('frecuencia_pago')}>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Fecha inicio</label>
              <Input type="date" {...register('fecha_inicio')} />
              {formState.errors.fecha_inicio && <p className="text-xs text-red-500">{formState.errors.fecha_inicio.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Visibilidad</label>
              <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" {...register('visibilidad')}>
                <option value="privada">Privada</option>
                <option value="publica">Pública</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Asignación de turnos</label>
              <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" {...register('turn_assignment_mode')}>
                <option value="random">Aleatoria</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            <input type="hidden" {...register('tipo_junta')} value="normal" />

            <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
              <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear junta'}</Button>
              <Link href="/explorar"><Button type="button" variant="outline">Explorar juntas</Button></Link>
            </div>
          </form>

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

          {authGate && (
            <Card className="space-y-2 border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">Para completar la creación, primero inicia sesión o regístrate.</p>
              <p className="text-xs text-amber-800">Guardamos lo que ya llenaste para retomar este flujo al volver.</p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/login?redirect=${encodeURIComponent('/demo?resume=1')}`}><Button>Iniciar sesión</Button></Link>
                <Link href={`/register?redirect=${encodeURIComponent('/demo?resume=1')}`}><Button variant="outline">Registrarme</Button></Link>
              </div>
            </Card>
          )}
        </Card>
      </main>
    </div>
  );
}
