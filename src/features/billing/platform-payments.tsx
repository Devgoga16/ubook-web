import { Check, ImageIcon, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { FilterChips } from '@/components/ui/controls'
import { Skeleton } from '@/components/ui/display'
import { Input } from '@/components/ui/field'
import { Modal } from '@/components/ui/overlays'
import { formatDate } from '@/features/clients/api'
import { ProofImage } from '@/features/payments/proof-image'
import { errorMessage } from '@/lib/api/client'
import { BILLING_METHODS, money, usePlatformPayments, usePlatformReview, type SubscriptionPayment } from './api'

export function PaymentRow({ p }: { p: SubscriptionPayment }) {
  const { approve, reject } = usePlatformReview()
  const [rejecting, setRejecting] = useState(false)
  const [showProof, setShowProof] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(errorMessage(e))
    }
  }
  return (
    <li className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[200px] flex-1">
          <b className="font-semibold">{p.organization?.name ?? 'Negocio'}</b>
          <div className="text-xs text-muted">
            {p.planCode} {p.billingCycle === 'yearly' ? 'anual' : 'mensual'} · {BILLING_METHODS[p.method]} op. <b className="font-mono">{p.reference}</b> · pagado el {formatDate(`${p.paidOn}T12:00:00Z`)}
            {p.note && ` · ${p.note}`}
            {p.rejectReason && ` · ${p.rejectReason}`}
            {p.periodEnd && p.status === 'approved' && ` · activo hasta el ${formatDate(p.periodEnd)}`}
          </div>
        </div>
        <b className="tabular font-semibold">{money(p.amount, p.currency)}</b>
        {p.hasProof ? (
          <Button size="sm" onClick={() => setShowProof(true)}>
            <ImageIcon size={13} aria-hidden /> Comprobante
          </Button>
        ) : (
          <span className="text-2xs text-muted">Sin foto</span>
        )}
        {p.status === 'pending' && !rejecting && (
          <div className="flex gap-2">
            <Button size="sm" variant="primary" disabled={approve.isPending} onClick={() => window.confirm(`¿Confirmar el pago de ${p.organization?.name}? Se activará su plan.`) && void run(() => approve.mutateAsync(p.id))}>
              <Check size={13} aria-hidden /> Aprobar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(true)}>
              <X size={13} aria-hidden /> Rechazar
            </Button>
          </div>
        )}
      </div>
      {rejecting && (
        <div className="flex flex-wrap gap-2">
          <Input aria-label="Motivo del rechazo" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: no encontramos la operación" className="min-w-[240px] flex-1" autoFocus />
          <Button size="sm" onClick={() => setRejecting(false)}>
            Volver
          </Button>
          <Button size="sm" variant="danger" disabled={reason.trim().length < 3 || reject.isPending} onClick={() => void run(() => reject.mutateAsync({ id: p.id, reason: reason.trim() }))}>
            Rechazar pago
          </Button>
        </div>
      )}
      {error && <p className="m-0 text-xs font-semibold text-bad">{error}</p>}
      <Modal open={showProof} onOpenChange={setShowProof} title={`Comprobante · ${p.organization?.name ?? 'Negocio'} · op. ${p.reference}`}>
        {showProof && <ProofImage path={`/platform/billing/payments/${p.id}/proof`} />}
      </Modal>
    </li>
  )
}

/** Superadmin: pagos de suscripción reportados por los negocios. */
export function PlatformPayments() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const list = usePlatformPayments(status)
  const items = list.data ?? []
  return (
    <Card>
      <CardHeader
        title="Pagos de suscripción"
        actions={
          <FilterChips
            aria-label="Estado"
            value={status}
            onValueChange={setStatus}
            options={[
              { value: 'pending', label: `Por revisar${status === 'pending' && list.data ? ` · ${items.length}` : ''}` },
              { value: 'approved', label: 'Aprobados' },
              { value: 'rejected', label: 'Rechazados' },
            ]}
          />
        }
      />
      {list.isLoading ? (
        <Skeleton className="h-20" />
      ) : items.length === 0 ? (
        <p className="m-0 text-sm text-muted">{status === 'pending' ? 'No hay pagos por revisar.' : 'Sin pagos en este estado.'}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((p) => (
            <PaymentRow key={p.id} p={p} />
          ))}
        </ul>
      )}
    </Card>
  )
}
