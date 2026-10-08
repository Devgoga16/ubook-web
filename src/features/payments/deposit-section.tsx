import { Check, ImageIcon, X } from 'lucide-react'
import { useState } from 'react'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { DefinitionList } from '@/components/ui/display'
import { Field, Input } from '@/components/ui/field'
import { Modal } from '@/components/ui/overlays'
import { DEPOSIT_METHOD_LABEL } from '@/features/booking/api'
import { errorMessage } from '@/lib/api/client'
import type { Appointment } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { formatCents } from '@/lib/format'
import { useDepositActions } from './api'
import { ProofImage } from './proof-image'

const STATUS = {
  pending_review: { label: 'Por validar', tone: 'warn' },
  approved: { label: 'Validado', tone: 'ok' },
  rejected: { label: 'Rechazado', tone: 'bad' },
} as const

const at = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' })

/** Adelanto de una reserva online: ver la foto y validarlo o rechazarlo. */
export function DepositSection({ a }: { a: Appointment }) {
  const { can, readOnly, hasFeature } = useAccess()
  const { approve, reject } = useDepositActions(a.id)
  const [showProof, setShowProof] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const d = a.deposit
  if (!d || !hasFeature('manual_payments')) return null

  const canReview = d.status === 'pending_review' && can('payment.create') && !readOnly
  const meta = STATUS[d.status]

  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
      setRejecting(false)
      setReason('')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Card>
      <CardHeader
        title="Adelanto"
        actions={<Tag tone={meta.tone}>{meta.label}</Tag>}
      />
      <div className="flex flex-col gap-4">
        {d.status === 'pending_review' && (
          <p className="m-0 rounded-control bg-warn-bg px-3 py-2 text-sm text-warn">
            El cliente subió su comprobante. Revisa que el pago haya llegado antes de validarlo: al validarlo se registra el cobro y se confirma la cita.
          </p>
        )}
        <DefinitionList
          items={[
            { label: 'Monto', value: formatCents(d.amount) },
            { label: 'Método', value: DEPOSIT_METHOD_LABEL[d.method] },
            { label: 'N.º de operación', value: d.reference || '—' },
            { label: 'Enviado', value: at.format(new Date(d.submittedAt)) },
            ...(d.status === 'rejected' && d.rejectReason ? [{ label: 'Motivo del rechazo', value: d.rejectReason }] : []),
          ]}
        />
        {error && <p role="alert" className="m-0 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowProof(true)}>
            <ImageIcon size={14} aria-hidden /> Ver comprobante
          </Button>
          {canReview && (
            <>
              <Button variant="primary" disabled={approve.isPending} onClick={() => void run(() => approve.mutateAsync())}>
                <Check size={14} aria-hidden /> Validar adelanto
              </Button>
              <Button variant="danger" onClick={() => setRejecting(true)}>
                <X size={14} aria-hidden /> Rechazar
              </Button>
            </>
          )}
        </div>
      </div>

      <Modal open={showProof} onOpenChange={setShowProof} title="Comprobante del adelanto">
        {showProof && <ProofImage path={`/appointments/${a.id}/deposit/proof`} />}
      </Modal>

      <Modal open={rejecting} onOpenChange={setRejecting} title="Rechazar el adelanto">
        <div className="flex flex-col gap-3.5">
          <p className="m-0 text-sm text-muted">La cita se cancelará y el horario quedará libre. Le avisaremos al cliente con el motivo.</p>
          <Field label="Motivo">
            {(p) => <Input {...p} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: el pago no llegó a nuestra cuenta" maxLength={300} autoFocus />}
          </Field>
          <div className="flex justify-end gap-2.5 pt-1">
            <Button onClick={() => setRejecting(false)}>Volver</Button>
            <Button variant="danger" disabled={reason.trim().length < 3 || reject.isPending} onClick={() => void run(() => reject.mutateAsync(reason.trim()))}>
              Rechazar y cancelar cita
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}
