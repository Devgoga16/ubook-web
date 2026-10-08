import { Plus, Tag as TagIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, ProgressBar, Skeleton } from '@/components/ui/display'
import { formatDate } from '@/features/clients/api'
import { useServices } from '@/features/services/api'
import { useAccess } from '@/lib/auth/access'
import { cn } from '@/lib/cn'
import { formatCents } from '@/lib/format'
import { todayLocal } from '@/lib/time'
import { promoRules, promoValue, usePromotions, type Promotion } from './api'

function status(p: Promotion, today: string): { label: string; tone: 'ok' | 'off' | 'warn' } {
  if (!p.isActive) return { label: 'Pausado', tone: 'off' }
  if (p.validTo && p.validTo < today) return { label: 'Vencido', tone: 'off' }
  if (p.maxUses != null && p.uses >= p.maxUses) return { label: 'Agotado', tone: 'warn' }
  if (p.validFrom && p.validFrom > today) return { label: 'Programado', tone: 'warn' }
  return { label: 'Activo', tone: 'ok' }
}

/** Negocio / Promociones: cupones de descuento para reservas online. */
export function PromotionsPage() {
  const navigate = useNavigate()
  const { readOnly } = useAccess()
  const promos = usePromotions()
  const services = useServices()
  const serviceName = (id: string) => services.data?.find((s) => s.id === id)?.name
  const today = todayLocal()
  const list = promos.data ?? []

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 max-w-[60ch] text-sm text-muted">Tus clientes escriben el código al reservar en tu página y ven el precio con descuento.</p>
        {!readOnly && (
          <Button variant="primary" onClick={() => navigate('/promociones/nueva')}>
            <Plus size={14} aria-hidden /> Nuevo cupón
          </Button>
        )}
      </div>

      {promos.isLoading ? (
        <Skeleton className="h-[160px] rounded-card" />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={TagIcon}
            title="Aún no tienes cupones"
            description="Crea uno para atraer clientes nuevos (BIENVENIDO) o llenar los horarios flojos (MARTESDUO: solo martes en la mañana)."
            action={
              !readOnly && (
                <Button variant="primary" size="sm" onClick={() => navigate('/promociones/nueva')}>
                  <Plus size={13} aria-hidden /> Crear cupón
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 p-0">
          {list.map((p) => {
            const st = status(p, today)
            return (
              <li key={p.id}>
                <Link
                  to={`/promociones/${p.id}`}
                  className={cn('flex h-full overflow-hidden rounded-card bg-surface text-ink shadow-card hover:shadow-[0_0_0_1.5px_var(--teal-line),var(--shadow)]', st.tone === 'off' && 'opacity-70')}
                >
                  <div className="bg-grad flex w-[96px] flex-none flex-col items-center justify-center gap-0.5 border-r-2 border-dashed border-white/40 px-2 text-center">
                    <span className="text-xl font-semibold">{promoValue(p)}</span>
                    <span className="text-2xs opacity-90">dscto.</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-[6px] bg-surface-2 px-2 py-0.5 font-mono text-sm font-semibold tracking-wide">{p.code}</span>
                      <Tag tone={st.tone} className="ml-auto">
                        {st.label}
                      </Tag>
                    </div>
                    {p.description && <div className="truncate text-sm">{p.description}</div>}
                    <div className="truncate text-xs text-muted">{promoRules(p, serviceName)}</div>
                    <div className="mt-auto flex justify-between pt-1 text-xs text-muted">
                      <span>{p.validTo ? `Vence ${formatDate(`${p.validTo}T12:00:00Z`)}` : 'Sin vencimiento'}</span>
                      <span>
                        {p.uses}
                        {p.maxUses != null && ` / ${p.maxUses}`} usos{p.discountGiven ? ` · ${formatCents(p.discountGiven)}` : ''}
                      </span>
                    </div>
                    {p.maxUses != null && <ProgressBar value={(p.uses / p.maxUses) * 100} label={`Usos de ${p.code}`} />}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
