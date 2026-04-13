import { PublicNav } from '@/components/marketing/public-nav';
import { Card } from '@/components/ui/card';

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <h1 className="text-3xl font-bold">Cómo funciona</h1>
        <Card>1) Crea la junta con reglas y turnos.</Card>
        <Card>2) Comparte enlace de invitación y completa participantes.</Card>
        <Card>3) Registra pagos, aprueba aportes y monitorea morosidad.</Card>
        <Card>4) Ejecuta entregas del pozo por ronda con trazabilidad.</Card>
      </main>
    </div>
  );
}
