import Link from 'next/link';
import { PublicNav } from '@/components/marketing/public-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <h1 className="text-3xl font-bold">Demo sin login</h1>
        <p className="text-slate-600">Explora un preview comercial del producto antes de registrarte.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Card><p className="text-sm">Junta: Barrio Centro</p><p className="mt-2 text-2xl font-bold">S/ 1,000</p><p className="text-xs text-slate-500">Pozo estimado</p></Card>
          <Card><p className="text-sm">Participantes</p><p className="mt-2 text-2xl font-bold">5/8</p></Card>
          <Card><p className="text-sm">Próxima entrega</p><p className="mt-2 text-2xl font-bold">Ronda #2</p></Card>
        </div>
        <Link href="/login?redirect=/dashboard"><Button>Ver mi dashboard</Button></Link>
      </main>
    </div>
  );
}
