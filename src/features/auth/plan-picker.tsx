import { Check } from 'lucide-react'
import { useState } from 'react'
import { Segmented } from '@/components/ui/controls'
import { Skeleton } from '@/components/ui/display'
import { cn } from '@/lib/cn'
import { formatPlanPrice, planHighlights, usePlans } from './plans'


/** Tarjetas de planes para elegir con cuál empieza la prueba gratis. */
export function PlanPicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const { data: plans, isLoading, isError } = usePlans()
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly')

  if (isError) return <p className="m-0 text-sm text-bad">No pudimos cargar los planes. Recarga la página.</p>

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        aria-label="Periodo de facturación"
        value={cycle}
        onValueChange={setCycle}
        options={[
          { value: 'monthly', label: 'Mensual' },
          { value: 'yearly', label: 'Anual · 2 meses gratis' },
        ]}
        className="self-start"
      />
      <div role="radiogroup" aria-label="Plan" className="grid gap-3 md:grid-cols-3">
        {isLoading &&
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-[260px] rounded-card" />)}
        {plans?.map((plan) => {
          const on = plan.code === value
          const price = cycle === 'monthly' ? plan.price.monthly : plan.price.yearly
          return (
            <button
              key={plan.code}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(plan.code)}
              className={cn(
                'relative flex cursor-pointer flex-col gap-3 rounded-card border-[1.5px] border-line bg-surface p-4 text-left text-ink hover:border-teal-line',
                on && 'border-teal shadow-[0_0_0_4px_var(--teal-soft)]',
              )}
            >
              {plan.code === 'pro' && (
                <span className="bg-grad absolute -top-2.5 right-3 rounded-full px-2 py-0.5 text-2xs font-semibold">
                  Recomendado
                </span>
              )}
              <div>
                <div className="text-md font-bold">{plan.name}</div>
                <div className="mt-0.5 text-xs text-muted">{plan.description}</div>
              </div>
              <div className="tabular">
                <span className="text-2xl font-semibold">{formatPlanPrice(price, plan.price.currency)}</span>
                <span className="text-xs text-muted"> / {cycle === 'monthly' ? 'mes' : 'año'}</span>
              </div>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-xs">
                {planHighlights(plan).map((h) => (
                  <li key={h} className="flex items-start gap-1.5">
                    <Check size={13} strokeWidth={2.5} className="mt-px flex-none text-teal-ink" aria-hidden />
                    {h}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>
    </div>
  )
}
