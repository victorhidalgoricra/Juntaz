import Link from 'next/link';

const navLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/explorar', label: 'Explorar juntas' }
];

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-[100] border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/85">
      <div className="mx-auto flex h-[60px] w-full max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="text-lg font-bold text-[var(--accent)]">Juntas Digitales</Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--text)] md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-[var(--accent)]">{link.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-[var(--r-sm)] px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--accent-bg)] md:inline-flex">
            Iniciar sesión
          </Link>
          <Link href="/register" className="inline-flex rounded-[var(--r-sm)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)]">
            Registrarme
          </Link>
        </div>
      </div>
    </header>
  );
}
