import Link from 'next/link';
import { PublicNav } from '@/components/marketing/public-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />
      <main className="mx-auto max-w-6xl space-y-12 px-4 py-10">
        <section className="grid items-center gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">Ahorro colaborativo digital</p>
            <h1 className="text-4xl font-bold leading-tight">Gestiona tu junta de ahorro con confianza y orden.</h1>
            <p className="text-slate-600">Organiza turnos, cuotas, pagos y entregas del pozo en una sola plataforma diseñada para validar rápido y crecer contigo.</p>
            <div className="flex gap-3">
              <Link href="/login?redirect=/juntas/new"><Button>Crear mi junta</Button></Link>
              <Link href="/demo"><Button variant="outline">Ver demo</Button></Link>
            </div>
          </div>
          <Card className="space-y-3 p-6">
            <h2 className="text-xl font-semibold">¿Cómo funciona una junta digital?</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
              <li>Creas tu junta y defines reglas (monto, frecuencia, turnos).</li>
              <li>Invitas participantes por enlace.</li>
              <li>Se registran aportes y se controla la mora.</li>
              <li>Entregas del pozo con trazabilidad.</li>
            </ol>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ['Sin caos en WhatsApp', 'Todo el historial y estado de pagos en un panel claro.'],
            ['Más transparencia', 'Turnos, moras y entregas visibles para todos los miembros.'],
            ['Escalable', 'Empieza web hoy y evoluciona a móvil cuando quieras.']
          ].map(([t, d]) => <Card key={t}><h3 className="font-semibold">{t}</h3><p className="mt-2 text-sm text-slate-600">{d}</p></Card>)}
        </section>
      </main>
    </div>
  );
}
