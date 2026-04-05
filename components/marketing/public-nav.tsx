import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function PublicNav() {
  return (
    <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-primary">Juntas Digitales</Link>
        <nav className="hidden gap-5 text-sm text-slate-700 md:flex">
          <Link href="/">Inicio</Link>
          <Link href="/como-funciona">Cómo funciona</Link>
          <Link href="/demo">Demo</Link>
          <Link href="/explorar">Explorar juntas</Link>
        </nav>
        <div className="flex gap-2">
          <Link href="/login"><Button variant="ghost">Iniciar sesión</Button></Link>
          <Link href="/register"><Button>Registrarme</Button></Link>
        </div>
      </div>
    </header>
  );
}
