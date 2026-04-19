'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { RevealOnScroll } from './reveal';

const demoMembers = ['AL', 'MC', 'DR', 'VN', 'LP'];

export function LandingHero() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 800;
    const target = 50;
    const start = performance.now();
    let raf = 0;

    const animate = (now: number) => {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - elapsed) * (1 - elapsed);
      setProgress(Math.round(target * eased));
      if (elapsed < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  const progressStyle = useMemo(() => ({ width: `${progress}%` }), [progress]);

  return (
    <RevealOnScroll className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 md:items-center md:px-6 md:py-16">
      <div className="space-y-6">
        <p className="inline-flex items-center rounded-full bg-[var(--green-bg)] px-3 py-1 text-xs font-semibold text-[var(--green)]">
          ● Más de 120 juntas activas esta semana
        </p>

        <h1 className="text-4xl font-bold leading-tight tracking-[-1.5px] text-[var(--text)] md:text-5xl">
          Tu junta, <span className="text-[var(--accent)]">digital</span> y sin drama.
        </h1>

        <p className="max-w-xl text-[17px] leading-relaxed text-[var(--muted)]">
          Organiza turnos, aportes y cobros con tu grupo — sin WhatsApps perdidos, sin cuentas confusas, sin mora sin control.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link href="/register" className="inline-flex rounded-[var(--r-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)]">
            Crear mi junta gratis →
          </Link>
          <Link href="/explorar" className="inline-flex rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent-bg)]">
            Explorar juntas
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex">
            {demoMembers.map((member, index) => (
              <span
                key={member}
                className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--accent-bg)] text-xs font-semibold text-[var(--accent)] first:ml-0"
                style={{ zIndex: 10 - index }}
              >
                {member}
              </span>
            ))}
          </div>
          <p className="text-sm text-[var(--muted)]">+2,400 personas ya gestionan sus juntas aquí</p>
        </div>
      </div>

      <div className="relative rounded-[20px] bg-[#141412] p-7 text-white shadow-xl">
        <span className="absolute right-6 top-6 inline-flex items-center rounded-full bg-[var(--green-bg)] px-3 py-1 text-xs font-semibold text-[var(--green)]">
          ● Activa
        </span>
        <p className="text-[11px] uppercase tracking-[0.12em] text-[#9D9992]">Junta de ejemplo</p>
        <h2 className="mt-2 text-2xl font-semibold">Taxistas Norte</h2>
        <p className="mt-1 text-sm text-[#A9A69E]">Ahorro semanal con turnos automáticos</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            ['Bolsa esta semana', 'S/ 4,000'],
            ['Tu turno', 'Semana 8'],
            ['Score', '94/100'],
            ['Semana actual', '5 de 10']
          ].map(([label, value]) => (
            <div key={label} className="rounded-[var(--r-sm)] bg-[#1E1C19] p-3">
              <p className="text-[11px] text-[#9D9992]">{label}</p>
              <p className="mt-1 text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2">
          {['JV', 'RM', 'SL', 'PC', 'AG'].map((member) => (
            <span key={member} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2B2823] text-[11px] font-semibold">
              {member}
            </span>
          ))}
          <span className="inline-flex h-8 items-center justify-center rounded-full border border-[#3D3933] px-3 text-xs text-[#C8C6BF]">+5</span>
        </div>

        <div className="mt-5">
          <div className="h-2 rounded-full bg-[#2B2823]">
            <div className="h-2 rounded-full bg-[var(--green)] transition-all duration-300" style={progressStyle} />
          </div>
          <p className="mt-2 text-xs text-[#B7B2A8]">Semana 5 / 5 de 10 pagaron ✓</p>
        </div>
      </div>
    </RevealOnScroll>
  );
}
