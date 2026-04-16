'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createJuntaSchema } from '@/features/juntas/schemas';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { generarCronograma } from '@/services/schedule.service';
import { makeSlug } from '@/lib/slug';
import { generateAccessCode } from '@/lib/access-code';
import { createJuntaRecord } from '@/services/juntas.repository';

const steps = [
  { id: 1, title: 'Información básica' },
  { id: 2, title: 'Estructura del grupo' },
  { id: 3, title: 'Incentivos y garantía' },
  { id: 4, title: 'Confirmación' }
] as const;

type CreateJuntaValues = z.infer<typeof createJuntaSchema> & { fondo_garantia: number };

type SuccessState = {
  juntaId: string;
  nombre: string;
  accessCode?: string;
};

export default function NewJuntaPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const allJuntas = useAppStore((s) => (Array.isArray(s.juntas) ? s.juntas : []));
  const allSchedules = useAppStore((s) => (Array.isArray(s.schedules) ? s.schedules : []));
  const allMembers = useAppStore((s) => (Array.isArray(s.members) ? s.members : []));
  const setData = useAppStore((s) => s.setData);

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<SuccessState | null>(null);

  const { register, control, handleSubmit, setError, clearErrors, formState, getValues, trigger, setValue } = useForm<CreateJuntaValues>({
    defaultValues: {
      nombre: '',
      descripcion: '',
      participantes_max: 8,
      monto_cuota: 20,
      tipo_junta: 'normal',
      turn_assignment_mode: 'random',
      incentivo_porcentaje: 0,
      incentivo_regla: 'primero_ultimo',
      frecuencia_pago: 'semanal',
      fecha_inicio: '',
      visibilidad: 'privada',
      fondo_garantia: 0
    }
  });

  const form = useWatch({ control });
  const nombreLength = (form.nombre ?? '').length;

  const incentivoMonto = useMemo(() => {
    if (form.tipo_junta !== 'incentivo') return 0;
    return Math.round((Number(form.monto_cuota ?? 0) * Number(form.incentivo_porcentaje ?? 0)) / 100);
  }, [form.monto_cuota, form.incentivo_porcentaje, form.tipo_junta]);

  const previewParticipantes = Number(form.participantes_max ?? 0);
  const previewCuota = Number(form.monto_cuota ?? 0);
  const hasMeaningfulInput = useMemo(() => {
    const hasNombre = (form.nombre ?? '').trim().length > 0;
    const hasDescripcion = (form.descripcion ?? '').trim().length > 0;
    const hasStructureChanges = previewParticipantes !== 8 || previewCuota !== 20 || form.tipo_junta !== 'normal' || form.turn_assignment_mode !== 'random' || form.frecuencia_pago !== 'semanal';
    return hasNombre || hasDescripcion || hasStructureChanges;
  }, [form.descripcion, form.frecuencia_pago, form.nombre, form.tipo_junta, form.turn_assignment_mode, previewCuota, previewParticipantes]);

  useEffect(() => {
    if (!user) router.replace('/login?redirect=/juntas/new');
  }, [user, router]);

  const cycleLabel = useMemo(() => {
    if (!previewParticipantes || previewParticipantes < 1) return '—';
    if (form.frecuencia_pago === 'semanal') return `${previewParticipantes} semanas`;
    if (form.frecuencia_pago === 'quincenal') return `${previewParticipantes} quincenas`;
    return `${previewParticipantes} meses`;
  }, [form.frecuencia_pago, previewParticipantes]);

  const validateStep = async (targetStep: number) => {
    const values = getValues();

    if (targetStep === 1) {
      const trimmedName = values.nombre?.trim() ?? '';
      if (!trimmedName) {
        setError('nombre', { message: 'El nombre es obligatorio.' });
        return false;
      }
      if (trimmedName.length > 40) {
        setError('nombre', { message: 'Máximo 40 caracteres.' });
        return false;
      }
      clearErrors('nombre');
      return true;
    }

    if (targetStep === 2) {
      const participants = Number(values.participantes_max ?? 0);
      const cuota = Number(values.monto_cuota ?? 0);

      if (!Number.isInteger(participants) || participants < 4 || participants > 20) {
        setError('participantes_max', { message: 'El tamaño del grupo debe ser entero entre 4 y 20.' });
        return false;
      }
      if (cuota < 20) {
        setError('monto_cuota', { message: 'La cuota base mínima es S/20.' });
        return false;
      }

      clearErrors(['participantes_max', 'monto_cuota']);
      return true;
    }

    if (targetStep === 3) {
      if (!values.fecha_inicio) {
        setError('fecha_inicio', { message: 'Selecciona una fecha de inicio.' });
        return false;
      }

      const fondo = Number(values.fondo_garantia ?? 0);
      if (fondo < 0) {
        setError('fondo_garantia', { message: 'El fondo de garantía no puede ser negativo.' });
        return false;
      }

      clearErrors(['fecha_inicio', 'fondo_garantia']);
      return true;
    }

    return true;
  };

  const handleContinue = async () => {
    const isValid = await validateStep(step);
    if (!isValid) return;
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleGoToStep = async (target: number) => {
    if (target === step) return;
    if (target < step) {
      setStep(target);
      return;
    }

    for (let current = step; current < target; current += 1) {
      const ok = await validateStep(current);
      if (!ok) return;
    }

    setStep(target);
  };

  if (!user) return <Card>Redirigiendo a login...</Card>;

  return (
    <div className="mx-auto max-w-6xl space-y-4 lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-6 lg:space-y-0">
      <Card className="space-y-5 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Crear junta</h1>
          <p className="text-sm text-slate-600">Configura tu junta paso a paso y valida todo antes de publicarla.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          {steps.map((item) => {
            const isCurrent = step === item.id;
            const isDone = step > item.id;
            const isClickable = item.id <= step;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (!isClickable) return;
                  handleGoToStep(item.id);
                }}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                  isCurrent
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : isDone
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-500'
                } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
              >
                <p className="font-semibold">{isDone ? '✓' : item.id}. {item.title}</p>
              </button>
            );
          })}
        </div>

        {successState ? (
          <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h2 className="text-lg font-semibold text-emerald-700">¡Junta creada con éxito!</h2>
            <p className="text-sm text-emerald-900">{successState.nombre} ya está lista. Comparte este acceso con tus integrantes.</p>
            {successState.accessCode ? (
              <p className="rounded-md bg-white p-3 text-sm">Código de acceso: <span className="font-semibold">{successState.accessCode}</span></p>
            ) : (
              <p className="rounded-md bg-white p-3 text-sm break-all">Link de invitación: {`${typeof window !== 'undefined' ? window.location.origin : ''}/juntas/${successState.juntaId}`}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => router.push(`/juntas/${successState.juntaId}`)}>Ver detalle</Button>
              <Link href="/juntas"><Button type="button" variant="outline">Ir al catálogo</Button></Link>
            </div>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={handleSubmit(async (values) => {
              setErrorMsg(null);

              const validBasics = await validateStep(1);
              const validStructure = await validateStep(2);
              const validIncentive = await validateStep(3);
              const schemaOk = await trigger(['nombre', 'participantes_max', 'monto_cuota', 'fecha_inicio', 'visibilidad', 'tipo_junta', 'turn_assignment_mode', 'frecuencia_pago']);
              if (!validBasics || !validStructure || !validIncentive || !schemaOk) {
                setStep((prev) => (prev < 4 ? prev : 1));
                return;
              }

              try {
                setLoading(true);
                await new Promise((resolve) => setTimeout(resolve, 1200));

                const juntaId = crypto.randomUUID();
                const slug = `${makeSlug(values.nombre)}-${juntaId.slice(0, 6)}`;
                const bolsaBase = values.participantes_max * values.monto_cuota;
                const accessCode = values.visibilidad === 'privada' ? generateAccessCode('PRIV') : undefined;
                const created = {
                  id: juntaId,
                  admin_id: user.id,
                  slug,
                  invite_token: crypto.randomUUID(),
                  access_code: accessCode,
                  nombre: values.nombre.trim(),
                  descripcion: values.descripcion,
                  moneda: 'PEN' as const,
                  participantes_max: values.participantes_max,
                  monto_cuota: values.monto_cuota,
                  cuota_base: values.monto_cuota,
                  bolsa_base: bolsaBase,
                  tipo_junta: values.tipo_junta,
                  turn_assignment_mode: values.turn_assignment_mode,
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

                setSuccessState({ juntaId, nombre: created.nombre, accessCode });
              } catch (error) {
                setErrorMsg(error instanceof Error ? error.message : 'No se pudo crear la junta.');
              } finally {
                setLoading(false);
              }
            })}
          >
            <input type="hidden" {...register('visibilidad')} />
            <input type="hidden" {...register('frecuencia_pago')} />
            <input type="hidden" {...register('tipo_junta')} />
            <input type="hidden" {...register('turn_assignment_mode')} />

            {step === 1 && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Nombre de la junta</label>
                  <Input maxLength={40} placeholder="Ej: Junta Taxistas Centro" {...register('nombre')} />
                  <p className="mt-1 text-xs text-slate-500">{nombreLength}/40 caracteres</p>
                  {formState.errors.nombre && <p className="text-xs text-red-600">{formState.errors.nombre.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Descripción (opcional)</label>
                  <textarea
                    className="min-h-24 w-full rounded-md border border-slate-300 p-3 text-sm"
                    placeholder="Cuéntales a tus integrantes cómo funcionará esta junta y qué objetivo tiene."
                    {...register('descripcion')}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Visibilidad</label>
                  <div className="mt-2 flex gap-2">
                    {(['publica', 'privada'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          clearErrors('visibilidad');
                          setValue('visibilidad', option, { shouldDirty: true, shouldValidate: true });
                        }}
                        className={`rounded-md border px-3 py-2 text-sm ${form.visibilidad === option ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'}`}
                      >
                        {option === 'publica' ? 'Pública' : 'Privada'}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {form.visibilidad === 'publica'
                      ? 'Tu junta aparecerá en el catálogo para que otros la encuentren.'
                      : 'Solo se accede por invitación o código de acceso privado.'}
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Tamaño del grupo (4–20)</label>
                  <Input type="number" min={4} max={20} step={1} {...register('participantes_max', { valueAsNumber: true })} />
                  {formState.errors.participantes_max && <p className="text-xs text-red-600">{formState.errors.participantes_max.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Cuota base (mínimo S/20)</label>
                  <Input type="number" min={20} step={1} {...register('monto_cuota', { valueAsNumber: true })} />
                  {formState.errors.monto_cuota && <p className="text-xs text-red-600">{formState.errors.monto_cuota.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Frecuencia</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(['semanal', 'quincenal', 'mensual'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setValue('frecuencia_pago', option, { shouldDirty: true, shouldValidate: true });
                        }}
                        className={`rounded-md border px-3 py-2 text-sm capitalize ${form.frecuencia_pago === option ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de junta</label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setValue('tipo_junta', 'normal', { shouldDirty: true, shouldValidate: true });
                      }}
                      className={`rounded-md border p-3 text-left ${form.tipo_junta === 'normal' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}
                    >
                      <p className="font-semibold">Normal</p>
                      <p className="text-xs opacity-80">Todos aportan y reciben el mismo monto base.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValue('tipo_junta', 'incentivo', { shouldDirty: true, shouldValidate: true });
                      }}
                      className={`rounded-md border p-3 text-left ${form.tipo_junta === 'incentivo' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}
                    >
                      <p className="font-semibold">Con incentivos</p>
                      <p className="text-xs opacity-80">Premia turnos tardíos con redistribución interna.</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Reglas de turnos</label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setValue('turn_assignment_mode', 'random', { shouldDirty: true, shouldValidate: true })}
                      className={`rounded-md border p-3 text-left ${form.turn_assignment_mode === 'random' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}
                    >
                      <p className="font-semibold">Asignación al azar</p>
                      <p className="text-xs opacity-80">Cuando la junta inicie, los turnos se asignarán automáticamente de forma aleatoria entre los participantes.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('turn_assignment_mode', 'manual', { shouldDirty: true, shouldValidate: true })}
                      className={`rounded-md border p-3 text-left ${form.turn_assignment_mode === 'manual' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}
                    >
                      <p className="font-semibold">Asignación manual</p>
                      <p className="text-xs opacity-80">Antes de iniciar la junta, el creador podrá definir manualmente el orden de turnos.</p>
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {form.turn_assignment_mode === 'manual'
                      ? 'Podrás ordenar turnos desde Integrantes mientras la junta siga en borrador.'
                      : 'El sistema sorteará el orden cuando la junta se active.'}
                  </p>
                  {formState.errors.turn_assignment_mode && <p className="text-xs text-red-600">{formState.errors.turn_assignment_mode.message}</p>}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                {form.tipo_junta === 'incentivo' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Incentivo ({form.incentivo_porcentaje ?? 0}%)</label>
                    <Input type="range" min={0} max={20} step={1} {...register('incentivo_porcentaje', { valueAsNumber: true })} />
                    <p className="text-xs text-slate-600">
                      Turno #1 paga S/{Math.max(previewCuota - incentivoMonto, 0)} (+S/{incentivoMonto}) · Turno #{Math.max(previewParticipantes, 1)} paga S/{previewCuota + incentivoMonto} (-S/{incentivoMonto})
                    </p>
                    {Number(form.incentivo_porcentaje ?? 0) === 0 && (
                      <p className="text-xs text-amber-700">Incentivo en 0%: permitido, pero no genera redistribución.</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Fondo de garantía</label>
                  <Input type="number" min={0} step={1} {...register('fondo_garantia', { valueAsNumber: true })} />
                  {formState.errors.fondo_garantia && <p className="text-xs text-red-600">{formState.errors.fondo_garantia.message}</p>}
                  {Number(form.fondo_garantia ?? 0) === 0 && (
                    <p className="mt-1 text-xs text-amber-700">Sin fondo de protección — mayor riesgo de impago</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Fecha de inicio</label>
                  <Input type="date" {...register('fecha_inicio')} />
                  {formState.errors.fecha_inicio && <p className="text-xs text-red-600">{formState.errors.fecha_inicio.message}</p>}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div className="rounded-md border border-slate-200 p-3 text-sm">
                  <p><span className="font-medium">Nombre:</span> {form.nombre || '—'}</p>
                  <p><span className="font-medium">Visibilidad:</span> {form.visibilidad}</p>
                  <p><span className="font-medium">Integrantes:</span> {form.participantes_max}</p>
                  <p><span className="font-medium">Cuota base:</span> S/ {form.monto_cuota}</p>
                  <p><span className="font-medium">Frecuencia:</span> {form.frecuencia_pago}</p>
                  <p><span className="font-medium">Tipo:</span> {form.tipo_junta}</p>
                  <p><span className="font-medium">Asignación de turnos:</span> {form.turn_assignment_mode === 'manual' ? 'Manual' : 'Al azar'}</p>
                  <p><span className="font-medium">Incentivo:</span> {form.tipo_junta === 'incentivo' ? `${form.incentivo_porcentaje}%` : 'No aplica'}</p>
                  <p><span className="font-medium">Fondo garantía:</span> S/ {form.fondo_garantia ?? 0}</p>
                  <p><span className="font-medium">Fecha inicio:</span> {form.fecha_inicio || '—'}</p>
                </div>
                <div className="rounded-md bg-slate-100 p-3 text-xs text-slate-700">
                  La plataforma actúa como intermediario y no retiene fondos.
                </div>
              </div>
            )}

            {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <Button type="button" variant="outline" disabled={step === 1 || loading} onClick={handleBack}>Atrás</Button>
              {step < 4 ? (
                <Button type="button" onClick={handleContinue}>Continuar</Button>
              ) : (
                <Button type="submit" disabled={loading}>{loading ? 'Creando junta...' : 'Crear junta'}</Button>
              )}
            </div>
          </form>
        )}
      </Card>

      {hasMeaningfulInput && (
        <Card className="sticky top-20 hidden space-y-3 border-0 bg-[#1A1916] p-5 text-slate-100 lg:block">
          <h2 className="text-lg font-semibold [font-family:'DM_Sans',sans-serif]">Vista previa</h2>
          <p className="text-sm [font-family:'DM_Sans',sans-serif]">{(form.nombre ?? '').trim() || 'Nueva junta'}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-2 py-1 capitalize">{form.visibilidad}</span>
            <span className="rounded-full bg-white/10 px-2 py-1 capitalize">{form.frecuencia_pago}</span>
            <span className="rounded-full bg-white/10 px-2 py-1 capitalize">{form.tipo_junta}</span>
            <span className="rounded-full bg-white/10 px-2 py-1">{form.turn_assignment_mode === 'manual' ? 'turnos manuales' : 'turnos al azar'}</span>
          </div>

          <div className="space-y-1 text-sm [font-family:'DM_Mono',monospace]">
            <p>Bolsa total: S/ {(previewParticipantes * previewCuota).toFixed(2)}</p>
            <p>Cuota base: S/ {previewCuota.toFixed(2)}</p>
            <p>Duración del ciclo: {cycleLabel}</p>
            <p>Fondo garantía: S/ {Number(form.fondo_garantia ?? 0).toFixed(2)}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Integrantes</p>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: Math.min(previewParticipantes, 16) }).map((_, idx) => (
                <span key={idx} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[10px]">{idx + 1}</span>
              ))}
              {previewParticipantes > 16 && <span className="inline-flex h-6 items-center rounded-full bg-white/15 px-2 text-[10px]">+{previewParticipantes - 16}</span>}
            </div>
          </div>

          <div className="space-y-1 text-xs [font-family:'DM_Mono',monospace]">
            <p className="uppercase tracking-wide text-slate-400">Turnos simulados</p>
            {Array.from({ length: Math.min(previewParticipantes, 5) }).map((_, idx) => {
              const turno = idx + 1;
              const isFirst = turno === 1;
              const isLast = turno === previewParticipantes;
              const appliedAdjustment = form.tipo_junta === 'incentivo' && (isFirst || isLast);
              const turnoMonto = appliedAdjustment ? (isFirst ? Math.max(previewCuota - incentivoMonto, 0) : previewCuota + incentivoMonto) : previewCuota;

              return (
                <p key={turno}>
                  Turno #{turno}: S/{turnoMonto.toFixed(2)}
                  {appliedAdjustment ? isFirst ? ` (+S/${incentivoMonto})` : ` (-S/${incentivoMonto})` : ''}
                </p>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
