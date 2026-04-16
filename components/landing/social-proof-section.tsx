'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RevealOnScroll } from './reveal';

type Stat = { value: number; prefix?: string; suffix?: string; label: string };

const stats: Stat[] = [
  { value: 2400, suffix: '+', label: 'personas registradas' },
  { value: 480, prefix: 'S/ ', suffix: 'k', label: 'gestionados en juntas' },
  { value: 94, suffix: '%', label: 'tasa de pago a tiempo' }
];

function CountUp({ stat }: { stat: Stat }) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const start = performance.now();
          const duration = 1200;

          const tick = (now: number) => {
            const elapsed = Math.min((now - start) / duration, 1);
            setValue(Math.round(stat.value * elapsed));
            if (elapsed < 1) raf = requestAnimationFrame(tick);
          };

          raf = requestAnimationFrame(tick);
          observer.disconnect();
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [stat.value]);

  const text = useMemo(() => `${stat.prefix ?? ''}${value.toLocaleString('es-PE')}${stat.suffix ?? ''}`, [stat.prefix, stat.suffix, value]);

  return <p ref={ref} className="font-[var(--mono)] text-4xl font-bold text-[var(--text)] md:text-[40px]">{text}</p>;
}

export function SocialProofSection() {
  return (
    <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 py-10 text-center md:px-6 md:py-14">
      <h2 className="text-3xl font-bold tracking-tight text-[var(--text)]">Juntas que funcionan, en números</h2>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-6">
            <CountUp stat={stat} />
            <p className="mt-2 text-[13px] text-[var(--muted)]">{stat.label}</p>
          </article>
        ))}
      </div>
    </RevealOnScroll>
  );
}
