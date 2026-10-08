import { Mail, MessageCircle, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { AUTOMATIONS, INDUSTRIES } from './content'
import { formatMoney } from '@/lib/format'
import { SERVICE_COLORS } from '@/features/services/colors'

/** Elige un flujo y mira el mensaje que recibe el cliente. */
export function AutomationsDemo() {
  const [active, setActive] = useState(1)
  const flow = AUTOMATIONS[active]!
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col gap-1.5" role="tablist" aria-label="Automatizaciones">
        {AUTOMATIONS.map((a, i) => (
          <button
            key={a.key}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-tile border border-transparent px-3.5 py-2.5 text-left transition',
              i === active ? 'border-line bg-surface shadow-card' : 'hover:bg-surface/60',
            )}
          >
            <span className={cn('size-2 flex-none rounded-full', i === active ? 'bg-teal' : 'bg-line-strong')} aria-hidden />
            <span className="flex-1 text-md font-semibold">{a.label}</span>
            <span className="text-xs text-muted">{a.when}</span>
          </button>
        ))}
      </div>

      <div className="relative flex min-h-[300px] flex-col overflow-hidden rounded-[20px] border border-line bg-surface p-5 shadow-card" role="tabpanel">
        <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-line pb-4">
          <span className="bg-grad grid size-10 flex-none place-items-center rounded-full text-sm font-bold" aria-hidden>
            BL
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">Barbería Lima Centro</div>
            <div className="text-2xs text-ok">enviado automáticamente</div>
          </div>
          <span className="flex flex-none gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-soft px-2 py-1 text-2xs font-semibold text-teal-ink">
              <MessageCircle size={11} aria-hidden /> WhatsApp
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-1 text-2xs font-semibold text-brand">
              <Mail size={11} aria-hidden /> Correo
            </span>
          </span>
        </div>
        <div key={flow.key} className="animate-pop max-w-[88%] rounded-[16px] rounded-tl-[4px] bg-teal-soft px-4 py-3 text-md leading-relaxed">
          {flow.message}
          <div className="mt-1 text-right text-2xs text-muted">{flow.when} · ✓✓</div>
        </div>
        <p className="mt-auto mb-0 pt-6 text-xs text-muted">
          Personaliza el texto con variables como <code className="rounded bg-surface-2 px-1">{'{{cliente.nombre}}'}</code> y
          prueba el envío antes de activarlo. Cada mensaje queda en el registro de envíos.
        </p>
      </div>
    </div>
  )
}

const SALES = [42, 55, 48, 62, 58, 71, 66, 80, 74, 88, 83, 96]
const HEAT_DAYS = ['L', 'M', 'M', 'J', 'V', 'S']
const HEAT = [
  [2, 3, 5, 4, 3, 6, 7, 5],
  [1, 3, 4, 3, 2, 5, 6, 4],
  [2, 4, 5, 5, 3, 6, 8, 6],
  [3, 4, 6, 5, 4, 7, 8, 7],
  [4, 6, 7, 6, 5, 8, 9, 9],
  [7, 9, 9, 8, 6, 8, 9, 8],
]

/** Vista previa de reportes, con datos de ejemplo. */
export function ReportsPreview() {
  const max = Math.max(...SALES)
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid grid-cols-3 gap-3 sm:col-span-2">
        {[
          ['Ventas del mes', formatMoney(18420), '+12%', true],
          ['Ocupación', '78%', '+6 pts', true],
          ['Tasa de faltas', '4.1%', '−2 pts', false],
        ].map(([label, value, delta, up]) => (
          <div key={label as string} className="rounded-card border border-line bg-surface p-4 shadow-card">
            <div className="text-2xs font-semibold text-muted">{label}</div>
            <div className="tabular mt-1 text-xl font-bold tracking-[-.02em]">{value}</div>
            <div className="mt-0.5 inline-flex items-center gap-1 text-2xs font-bold text-ok">
              {up ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />} {delta}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="mb-3 text-sm font-bold">Ventas por semana</div>
        <div className="flex h-[130px] items-end gap-1.5" aria-hidden>
          {SALES.map((v, i) => (
            <div
              key={i}
              data-reveal
              className="flex-1 rounded-t-[5px] bg-grad"
              style={{ height: `${(v / max) * 100}%`, '--reveal-delay': `${i * 40}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      <div className="rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between text-sm font-bold">
          Ocupación por día y hora
          <span className="text-2xs font-normal text-muted">más oscuro = más lleno</span>
        </div>
        <div className="grid grid-cols-[14px_repeat(8,minmax(0,1fr))] gap-1" aria-hidden>
          {HEAT.map((row, r) => (
            <div key={r} className="contents">
              <span className="text-[10px] leading-[18px] text-muted">{HEAT_DAYS[r]}</span>
              {row.map((v, c) => (
                <span
                  key={c}
                  className="h-[18px] rounded-[4px]"
                  style={{ backgroundColor: `color-mix(in oklab, var(--teal-ink) ${v * 10 + 6}%, var(--surface-2))` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="m-0 text-2xs text-muted sm:col-span-2">Datos de ejemplo.</p>
    </div>
  )
}

/** Cada rubro arranca con servicios y fichas a su medida. */
export function IndustriesDemo() {
  const [active, setActive] = useState(0)
  const ind = INDUSTRIES[active]!
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap justify-center gap-2" role="tablist" aria-label="Rubros">
        {INDUSTRIES.map((x, i) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              'cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition',
              i === active ? 'bg-grad border-transparent shadow-card' : 'border-line-strong bg-surface text-ink-2 hover:border-teal',
            )}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div key={ind.key} className="animate-pop grid gap-4 md:grid-cols-[1.2fr_1fr]" role="tabpanel">
        <div className="rounded-[20px] border border-line bg-surface p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="m-0 text-lg font-bold">Servicios sugeridos</h3>
            <span className="text-2xs text-muted">Edítalos a tu gusto</span>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {ind.services.map(([name, minutes, price], i) => (
              <li key={name} className="flex items-center gap-3 rounded-tile bg-surface-2 px-3.5 py-3">
                <span className="h-8 w-1 rounded-full" style={{ backgroundColor: SERVICE_COLORS[i] }} aria-hidden />
                <span className="flex-1 text-md font-semibold">{name}</span>
                <span className="text-xs text-muted">{minutes} min</span>
                <span className="tabular w-16 text-right text-md font-bold">{formatMoney(price)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 mb-0 text-body text-ink-2">✨ {ind.extra}</p>
        </div>
        <div className="rounded-[20px] border border-line bg-surface p-6 shadow-card">
          <div className="mb-1 text-2xs font-bold tracking-[.08em] text-teal-ink uppercase">Plantilla de ficha</div>
          <h3 className="mt-0 mb-4 text-lg font-bold">{ind.record}</h3>
          <div className="flex flex-col gap-3">
            {ind.fields.map((f) => (
              <div key={f}>
                <div className="mb-1 text-xs font-semibold text-ink-2">{f}</div>
                <div className="h-9 rounded-control border border-line bg-surface-2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
