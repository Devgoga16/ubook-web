import { ArrowRight, Check, Minus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Segmented } from '@/components/ui/controls'
import { formatPlanPrice, planHighlights, usePlans } from '@/features/auth/plans'
import type { FeatureValue } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { COMPARE_ROWS, FALLBACK_PLANS } from './content'

function cell(value: FeatureValue) {
  if (value === true) return <Check size={16} className="mx-auto text-teal-ink" aria-label="Incluido" />
  if (value === false || value === 0) return <Minus size={16} className="mx-auto text-line-strong" aria-label="No incluido" />
  if (value === null) return <span className="font-semibold">Ilimitado</span>
  return <span className="tabular font-semibold">{value}</span>
}

/** Planes reales de la API; si no responde, los planes por defecto. */
export function Pricing() {
  const { data } = usePlans()
  const plans = (data?.length ? data : FALLBACK_PLANS).slice().sort((a, b) => a.sortOrder - b.sortOrder)
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [compare, setCompare] = useState(false)

  return (
    <div className="flex flex-col items-center gap-10">
      <Segmented
        aria-label="Periodo de facturación"
        value={cycle}
        onValueChange={setCycle}
        options={[
          { value: 'monthly', label: 'Mensual' },
          { value: 'yearly', label: 'Anual · 2 meses gratis' },
        ]}
      />

      <div data-reveal className="grid w-full items-stretch gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const featured = plan.code === 'pro'
          const price = cycle === 'monthly' ? plan.price.monthly : plan.price.yearly
          return (
            <div
              key={plan.code}
              className={cn(
                'relative flex flex-col rounded-[22px] p-[1.5px]',
                featured ? 'bg-grad shadow-[0_25px_60px_-20px_rgb(36_51_82/0.55)] lg:-my-4' : 'bg-line',
              )}
            >
              <div className="flex flex-1 flex-col gap-6 rounded-[21px] bg-surface p-7 text-ink">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="m-0 text-xl font-bold">{plan.name}</h3>
                    {featured && <span className="bg-grad rounded-full px-2.5 py-1 text-2xs font-bold">Más elegido</span>}
                  </div>
                  <p className="mt-1.5 mb-0 min-h-[36px] text-sm text-muted">{plan.description}</p>
                </div>
                <div className="tabular">
                  <span className="text-[44px] leading-none font-bold tracking-[-.03em]">
                    {formatPlanPrice(price, plan.price.currency)}
                  </span>
                  <span className="text-sm text-muted"> / {cycle === 'monthly' ? 'mes' : 'año'}</span>
                  <div className="mt-1.5 h-4 text-xs text-teal-ink">
                    {cycle === 'yearly' && `Equivale a ${formatPlanPrice(Math.round(price / 12), plan.price.currency)} al mes`}
                  </div>
                </div>
                <Link
                  to={`/registro?plan=${plan.code}`}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-3 text-md font-semibold no-underline transition',
                    featured ? 'bg-grad hover:brightness-110' : 'border border-line-strong text-ink hover:border-teal',
                  )}
                >
                  Probar 30 días gratis <ArrowRight size={16} aria-hidden />
                </Link>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-body">
                  {planHighlights(plan).map((h) => (
                    <li key={h} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid size-[18px] flex-none place-items-center rounded-full bg-teal-soft text-teal-ink">
                        <Check size={11} strokeWidth={3} aria-hidden />
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>

      <p className="m-0 text-center text-sm text-muted">
        Precios en soles, incluyen todas las actualizaciones. Sin contratos: cambia o cancela cuando quieras.
      </p>

      <button
        type="button"
        onClick={() => setCompare((v) => !v)}
        aria-expanded={compare}
        className="cursor-pointer rounded-full border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink-2 hover:border-teal"
      >
        {compare ? 'Ocultar comparación' : 'Comparar todas las funciones'}
      </button>

      {compare && (
        <div className="animate-pop w-full overflow-x-auto rounded-[18px] border border-line bg-surface">
          <table className="w-full min-w-[560px] border-collapse text-body">
            <thead>
              <tr className="border-b border-line">
                <th className="px-5 py-4 text-left text-sm font-bold">Funciones</th>
                {plans.map((p) => (
                  <th key={p.code} className={cn('px-4 py-4 text-center text-sm font-bold', p.code === 'pro' && 'text-teal-ink')}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map(([key, label]) => (
                <tr key={key} className="border-b border-line last:border-0 hover:bg-surface-2">
                  <td className="px-5 py-3 text-ink-2">{label}</td>
                  {plans.map((p) => (
                    <td key={p.code} className={cn('px-4 py-3 text-center', p.code === 'pro' && 'bg-teal-soft/30')}>
                      {cell(p.features[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
