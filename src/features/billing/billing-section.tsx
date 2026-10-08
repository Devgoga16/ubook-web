import { CheckCircle2, Clock, CreditCard, Landmark, Smartphone, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Segmented } from '@/components/ui/controls'
import { Skeleton } from '@/components/ui/display'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { ProofUpload } from '@/components/ui/proof-upload'
import { formatDate } from '@/features/clients/api'
import { errorMessage } from '@/lib/api/client'
import type { SubscriptionStatus } from '@/lib/api/types'
import { useAuth } from '@/lib/auth/auth-context'
import { cn } from '@/lib/cn'
import { parseSoles } from '@/lib/format'
import { todayLocal } from '@/lib/time'
import { BILLING_METHODS, money, uploadBillingProof, useBilling, useReportPayment, type BillingMethod } from './api'

const STATUS: Record<SubscriptionStatus, { label: string; tone: 'ok' | 'warn' | 'bad' | 'off' | 'teal' }> = {
  trialing: { label: 'Prueba gratis', tone: 'teal' },
  active: { label: 'Activa', tone: 'ok' },
  past_due: { label: 'Pago pendiente', tone: 'warn' },
  expired: { label: 'Vencida', tone: 'bad' },
  cancelled: { label: 'Cancelada', tone: 'off' },
}

/** Configuración / Plan y pagos: el plan, cómo pagar y el historial (sin pasarela). */
export function BillingSection() {
  const { reload } = useAuth()
  const billing = useBilling()
  const report = useReportPayment()
  const b = billing.data
  const [form, setForm] = useState<{ planCode: string; billingCycle: 'monthly' | 'yearly'; amount: string; currency: 'PEN'; method: BillingMethod; reference: string; paidOn: string; note: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [proofKey, setProofKey] = useState<string | null>(null)
  const [proofError, setProofError] = useState<string | undefined>()
  // Al registrar un pago se vuelve a montar la subida vacía.
  const [proofSlot, setProofSlot] = useState(0)

  if (billing.isLoading || !b) return <Skeleton className="h-[360px] rounded-card" />

  const sub = b.subscription
  const st = STATUS[sub.status]
  const current = b.plans.find((p) => p.code === sub.planCode)
  const pending = b.payments.find((p) => p.status === 'pending')
  const f = form ?? { planCode: sub.planCode, billingCycle: sub.billingCycle, amount: '', currency: 'PEN' as const, method: 'yape' as const, reference: '', paidOn: todayLocal(), note: '' }
  const set = (patch: Partial<typeof f>) => setForm({ ...f, ...patch })
  const chosen = b.plans.find((p) => p.code === f.planCode)

  const submit = async () => {
    setError(null)
    const amount = parseSoles(f.amount)
    if (!amount) return setError('Ingresa el monto que pagaste')
    if (f.reference.trim().length < 3) return setError('Escribe el número de operación')
    if (!proofKey) return setProofError('Sube la foto o captura del pago')
    try {
      await report.mutateAsync({ planCode: f.planCode, billingCycle: f.billingCycle, amount, currency: f.currency, method: f.method, reference: f.reference.trim(), paidOn: f.paidOn, note: f.note.trim(), proofKey })
      setSent(true)
      setForm(null)
      setProofKey(null)
      setProofSlot((n) => n + 1)
      void reload()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="m-0 text-lg font-semibold">Plan {current?.name ?? sub.planCode}</h3>
            <Tag tone={st.tone}>{st.label}</Tag>
          </div>
          <p className="m-0 mt-1 text-sm text-muted">
            {sub.status === 'trialing' && sub.trialEndsAt && `Tu prueba gratis termina el ${formatDate(sub.trialEndsAt)}.`}
            {sub.status === 'active' && sub.currentPeriodEnd && `Pagado hasta el ${formatDate(sub.currentPeriodEnd)} (${sub.billingCycle === 'yearly' ? 'anual' : 'mensual'}).`}
            {sub.status === 'expired' && 'Tu suscripción venció: puedes ver tus datos, pero no modificarlos hasta registrar el pago.'}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {b.plans.map((p) => (
          <div key={p.code} className={cn('flex flex-col gap-1 rounded-card border-[1.5px] bg-surface p-4', p.code === sub.planCode ? 'border-teal' : 'border-line')}>
            <div className="flex items-center justify-between">
              <b className="font-semibold">{p.name}</b>
              {p.code === sub.planCode && <Tag tone="teal">Tu plan</Tag>}
            </div>
            <span className="text-xl font-semibold">{money(p.price.monthly, p.price.currency)} <span className="text-xs font-normal text-muted">/ mes</span></span>
            <span className="text-xs text-muted">o {money(p.price.yearly, p.price.currency)} al año (2 meses gratis)</span>
            {p.description && <span className="text-xs text-muted">{p.description}</span>}
          </div>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <CardHeader title="Cómo pagar" className="mb-0" />
          {b.instructions.yape || b.instructions.bank ? (
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm">
              {b.instructions.yape && (
                <li className="flex items-start gap-2.5">
                  <Smartphone size={17} className="mt-0.5 flex-none text-teal-ink" aria-hidden />
                  <span>
                    <b className="font-semibold">Yape / Plin:</b> {b.instructions.yape}
                  </span>
                </li>
              )}
              {b.instructions.bank && (
                <li className="flex items-start gap-2.5">
                  <Landmark size={17} className="mt-0.5 flex-none text-teal-ink" aria-hidden />
                  <span>
                    <b className="font-semibold">Transferencia:</b> {b.instructions.bank}
                  </span>
                </li>
              )}
              {b.instructions.contact && <li className="text-xs text-muted">¿Dudas? {b.instructions.contact}</li>}
            </ul>
          ) : (
            <p className="m-0 text-sm text-muted">Escríbenos para coordinar el pago. Luego regístralo aquí para activar tu plan.</p>
          )}
          <p className="m-0 text-xs text-muted">Los precios están en soles. Después de pagar, regístralo con el número de operación y la foto del comprobante: lo confirmamos en menos de 24 horas hábiles.</p>
        </Card>

        <Card className="flex flex-col gap-3">
          <CardHeader title="Registrar mi pago" className="mb-0" />
          {pending ? (
            <p className="m-0 flex items-start gap-2 rounded-[10px] bg-warn-bg px-3 py-2.5 text-sm text-warn">
              <Clock size={16} className="mt-0.5 flex-none" aria-hidden />
              Tu pago de {money(pending.amount, pending.currency)} ({BILLING_METHODS[pending.method]}, op. {pending.reference}) está en revisión. Te avisaremos apenas lo confirmemos.
            </p>
          ) : (
            <>
              {sent && <p className="m-0 rounded-[10px] bg-ok-bg px-3 py-2 text-sm font-semibold text-ok">¡Gracias! Recibimos tu pago y lo revisaremos pronto.</p>}
              {error && <p role="alert" className="m-0 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">{error}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Plan">
                  {(p) => (
                    <Select {...p} value={f.planCode} onChange={(e) => set({ planCode: e.target.value })}>
                      {b.plans.map((x) => (
                        <option key={x.code} value={x.code}>
                          {x.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <div className="flex flex-col gap-1.5">
                  <span className="text-2xs font-semibold text-muted">Periodo</span>
                  <Segmented
                    aria-label="Periodo"
                    value={f.billingCycle}
                    onValueChange={(v) => set({ billingCycle: v })}
                    options={[
                      { value: 'monthly', label: 'Mensual' },
                      { value: 'yearly', label: 'Anual' },
                    ]}
                    className="self-start"
                  />
                </div>
                <Field label="Monto pagado" hint={chosen ? `Precio: ${money(f.billingCycle === 'yearly' ? chosen.price.yearly : chosen.price.monthly, chosen.price.currency)}` : undefined}>
                  {(p) => (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-muted">S/</span>
                      <Input {...p} inputMode="decimal" value={f.amount} onChange={(e) => set({ amount: e.target.value })} placeholder="0.00" />
                    </div>
                  )}
                </Field>
                <Field label="Método">
                  {(p) => (
                    <Select {...p} value={f.method} onChange={(e) => set({ method: e.target.value as BillingMethod })}>
                      {(Object.keys(BILLING_METHODS) as BillingMethod[]).map((m) => (
                        <option key={m} value={m}>
                          {BILLING_METHODS[m]}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="N.º de operación">{(p) => <Input {...p} value={f.reference} onChange={(e) => set({ reference: e.target.value })} />}</Field>
                <Field label="Fecha del pago">{(p) => <Input {...p} type="date" max={todayLocal()} value={f.paidOn} onChange={(e) => e.target.value && set({ paidOn: e.target.value })} />}</Field>
              </div>
              <ProofUpload
                key={proofSlot}
                label="Foto del comprobante"
                upload={uploadBillingProof}
                onChange={(key) => (setProofKey(key), setProofError(undefined))}
                error={proofError}
              />
              <Field label="Nota (opcional)">{(p) => <Textarea {...p} rows={2} value={f.note} onChange={(e) => set({ note: e.target.value })} />}</Field>
              <Button variant="primary" className="self-end" disabled={report.isPending} onClick={() => void submit()}>
                <CreditCard size={14} aria-hidden /> {report.isPending ? 'Enviando…' : 'Registrar pago'}
              </Button>
            </>
          )}
        </Card>
      </div>

      {b.payments.length > 0 && (
        <Card>
          <CardHeader title="Historial de pagos" />
          <ul className="m-0 list-none p-0">
            {b.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 border-t border-line py-2.5 text-sm first:border-t-0">
                {p.status === 'approved' ? <CheckCircle2 size={16} className="text-ok" aria-hidden /> : p.status === 'rejected' ? <XCircle size={16} className="text-bad" aria-hidden /> : <Clock size={16} className="text-warn" aria-hidden />}
                <span className="flex-1">
                  {formatDate(`${p.paidOn}T12:00:00Z`)} · {BILLING_METHODS[p.method]} · op. {p.reference}
                  <span className="block text-xs text-muted">
                    {b.plans.find((x) => x.code === p.planCode)?.name ?? p.planCode} {p.billingCycle === 'yearly' ? 'anual' : 'mensual'}
                    {p.status === 'approved' && p.periodEnd && ` · hasta el ${formatDate(p.periodEnd)}`}
                    {p.status === 'rejected' && p.rejectReason && ` · ${p.rejectReason}`}
                  </span>
                </span>
                <b className="tabular font-semibold">{money(p.amount, p.currency)}</b>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
