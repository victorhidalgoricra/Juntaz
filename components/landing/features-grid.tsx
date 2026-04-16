import { RevealOnScroll } from './reveal';

const features = [
  {
    title: 'Score de confianza',
    description: 'Mide cumplimiento y constancia para tomar mejores decisiones en cada ronda.',
    icon: '🛡️',
    cardClass: 'bg-[var(--text)] text-white',
    descClass: 'text-slate-300'
  },
  {
    title: 'Sin caos en WhatsApp',
    description: 'Todo el estado de aportes y turnos en un panel único y claro para el grupo.',
    icon: '💬',
    cardClass: 'bg-[var(--accent-bg)] text-[var(--text)]',
    descClass: 'text-[var(--muted)]'
  },
  {
    title: 'Incentivos por turno',
    description: 'Configura beneficios para el orden y la puntualidad de cada integrante.',
    icon: '🎯',
    cardClass: 'bg-[var(--green-bg)] text-[var(--text)]',
    descClass: 'text-[var(--muted)]'
  },
  {
    title: 'Seguimiento en tiempo real',
    description: 'Visualiza aportes, turnos y avances del ciclo sin perder el contexto del grupo.',
    icon: '🧾',
    cardClass: 'bg-[var(--amber-bg)] text-[var(--text)]',
    descClass: 'text-[var(--muted)]'
  },
  {
    title: 'Funciona en el celular',
    description: 'Diseño móvil primero para registrar pagos y avances en segundos.',
    icon: '📱',
    cardClass: 'bg-[var(--accent-bg)] text-[var(--text)]',
    descClass: 'text-[var(--muted)]'
  },
  {
    title: 'Para cualquier grupo',
    description: 'Taxistas, universitarios, familias y emprendedores en un mismo sistema.',
    icon: '🤝',
    cardClass: 'bg-[#FEE2E2] text-[var(--text)]',
    descClass: 'text-[var(--muted)]'
  }
];

export function FeaturesGrid() {
  return (
    <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.title} className={`rounded-[var(--r)] border border-[var(--border)] p-6 ${feature.cardClass}`}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-sm)] bg-white/75 text-lg">{feature.icon}</span>
            <h3 className="mt-4 text-[15px] font-semibold">{feature.title}</h3>
            <p className={`mt-2 text-[13px] leading-relaxed ${feature.descClass}`}>{feature.description}</p>
          </article>
        ))}
      </div>
    </RevealOnScroll>
  );
}
