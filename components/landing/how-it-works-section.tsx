import { RevealOnScroll } from './reveal';

const steps = [
  {
    title: 'Crea la junta',
    description: 'Define monto, personas, frecuencia e incentivos.'
  },
  {
    title: 'Invita a tu grupo',
    description: 'Comparte enlace de invitación y verificación de identidad.'
  },
  {
    title: 'Todos aportan',
    description: 'Yape/Plin/tarjeta, recordatorios automáticos y control de mora.'
  },
  {
    title: 'El turno cobra',
    description: 'Desembolso con trazabilidad completa.'
  }
];

export function HowItWorksSection() {
  return (
    <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Así funciona</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">De la idea al cobro en 4 pasos</h2>

      <div className="relative mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6 md:before:absolute md:before:left-10 md:before:right-10 md:before:top-7 md:before:h-px md:before:bg-[var(--border)] md:before:content-['']">
        {steps.map((step, index) => (
          <article key={step.title} className="relative rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <span
              className={[
                'relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full text-base font-semibold',
                index === 0
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]'
              ].join(' ')}
            >
              {index + 1}
            </span>
            <h3 className="mt-4 text-sm font-semibold text-[var(--text)]">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{step.description}</p>
          </article>
        ))}
      </div>
    </RevealOnScroll>
  );
}
