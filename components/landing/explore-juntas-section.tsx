import Link from 'next/link';
import { RevealOnScroll } from './reveal';

const publicJuntas = [
  { emoji: '🚗', name: 'Taxistas Norte', people: '12 personas', fee: 'S/ 800', type: 'Semanal', slots: '3 cupos', open: true },
  { emoji: '🎓', name: 'Universidad', people: '10 personas', fee: 'S/ 800', type: 'Quincenal', slots: 'Completa', open: false },
  { emoji: '💼', name: 'Emprendedores', people: '8 personas', fee: 'S/ 1,200', type: 'Mensual', slots: '2 cupos', open: true }
];

export function ExploreJuntasSection() {
  return (
    <RevealOnScroll className="border-y border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 md:px-6 md:py-14">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Explorar sin registrarse</p>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text)]">Únete a una junta pública ahora</h2>
          <p className="max-w-md text-sm leading-relaxed text-[var(--muted)]">
            Mira juntas abiertas, revisa cupos disponibles y conoce la dinámica antes de crear tu propio grupo.
          </p>
          <Link href="/explorar" className="inline-flex rounded-[var(--r-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)]">
            Ver todas las juntas →
          </Link>
        </div>

        <div className="space-y-3">
          {publicJuntas.map((junta) => (
            <article key={junta.name} className="grid grid-cols-[1fr_auto] items-center rounded-[var(--r)] border border-[var(--border)] bg-[var(--bg)] p-4">
              <div>
                <p className="text-base font-semibold capitalize text-[var(--text)]">{junta.emoji} {junta.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{junta.people} · cuota {junta.fee} · {junta.type}</p>
              </div>

              <div className="text-right">
                <p className="font-[var(--mono)] text-sm font-medium text-[var(--text)]">{junta.fee}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{junta.slots}</p>
                <button
                  type="button"
                  disabled={!junta.open}
                  className={[
                    'mt-2 inline-flex rounded-[var(--r-sm)] px-3 py-1.5 text-xs font-semibold',
                    junta.open
                      ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)]'
                      : 'cursor-not-allowed bg-[var(--faint)] text-[#67645E]'
                  ].join(' ')}
                >
                  {junta.open ? 'Unirme' : 'Completa'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </RevealOnScroll>
  );
}
