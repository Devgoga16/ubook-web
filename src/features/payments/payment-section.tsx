import { Ban, Plus, Receipt, Trash2, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Tag } from '@/components/ui/badges'
import { Button, IconButton } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/controls'
import { Skeleton } from '@/components/ui/display'
import { Field, Input, Select } from '@/components/ui/field'
import { errorMessage } from '@/lib/api/client'
import type { Appointment, AppointmentPayments, PaymentMethod, PaymentView } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { cn } from '@/lib/cn'
import { formatCents, parseSoles } from '@/lib/format'
import { formatTime } from '@/lib/time'
import { METHODS, methodLabel, useAppointmentPayments, usePaymentActions } from './api'

const STATUS = {
  paid: { label: 'Pagado', tone: 'ok' },
  partial: { label: 'Pago parcial', tone: 'warn' },
  unpaid: { label: 'Por cobrar', tone: 'off' },
} as const

const soles = (cents: number) => (cents / 100).toFixed(2)
const cents = (text: string) => (text.trim() === '' ? 0 : parseSoles(text))

interface Row {
  method: PaymentMethod
  amount: string
  reference: string
}

function ChargeForm({ a, summary, onDone }: { a: Appointment; summary: AppointmentPayments; onDone: () => void }) {
  const { pay } = usePaymentActions()
  const [discount, setDiscount] = useState('')
  const [tip, setTip] = useState('')
  const [rows, setRows] = useState<Row[]>([{ method: 'cash', amount: soles(summary.balance), reference: '' }])
  const [cashGiven, setCashGiven] = useState('')
  const [complete, setComplete] = useState(['confirmed', 'checked_in', 'in_progress'].includes(a.status))
  const [error, setError] = useState<string | null>(null)

  const d = cents(discount)
  const t = cents(tip)
  const amounts = rows.map((r) => cents(r.amount))
  const invalid = d === null || t === null || amounts.some((x) => x === null || x <= 0)
  const received = amounts.reduce<number>((acc, x) => acc + (x ?? 0), 0)
  const toCharge = Math.max(0, summary.balance - (d ?? 0))
  const applied = received - (t ?? 0)
  const left = toCharge - applied
  const onlyCash = rows.length === 1 && rows[0]!.method === 'cash'
  const given = cents(cashGiven)
  const change = onlyCash && given ? given - received : null

  // Al cambiar descuento o propina, el primer monto sigue cubriendo el total.
  const syncFirst = (nextD: number | null, nextT: number | null) => {
    if (rows.length !== 1 || nextD === null || nextT === null) return
    setRows([{ ...rows[0]!, amount: soles(Math.max(0, summary.balance - nextD) + nextT) }])
  }
  const setRow = (i: number, patch: Partial<Row>) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const submit = async () => {
    setError(null)
    if (invalid) return setError('Revisa los montos')
    if (applied < 0) return setError('La propina no puede ser mayor que lo cobrado')
    if (left < 0) return setError(`Estás cobrando ${formatCents(-left)} de más. Si es propina, regístrala como propina.`)
    try {
      await pay.mutateAsync({
        appointmentId: a.id,
        methods: rows.map((r, i) => ({ method: r.method, amount: amounts[i]!, reference: r.reference.trim() || undefined })),
        discount: d || undefined,
        tip: t || undefined,
        complete: complete && left === 0 ? true : undefined,
      })
      onDone()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-[12px] border border-teal-line bg-surface-2/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Descuento (S/)" hint={summary.discount ? `Ya tiene ${formatCents(summary.discount)} de descuento` : undefined}>
          {(p) => (
            <Input
              {...p}
              inputMode="decimal"
              placeholder="0.00"
              value={discount}
              onChange={(e) => {
                setDiscount(e.target.value)
                syncFirst(cents(e.target.value), t)
              }}
            />
          )}
        </Field>
        <Field label="Propina (S/)" hint="Va completa al profesional.">
          {(p) => (
            <Input
              {...p}
              inputMode="decimal"
              placeholder="0.00"
              value={tip}
              onChange={(e) => {
                setTip(e.target.value)
                syncFirst(d, cents(e.target.value))
              }}
            />
          )}
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-2xs font-semibold text-muted">¿Cómo paga?</span>
        {rows.map((r, i) => {
          const meta = METHODS.find((m) => m.value === r.method)!
          return (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_110px_auto] gap-2 sm:grid-cols-[170px_110px_minmax(0,1fr)_auto]">
              <Select aria-label="Método de pago" value={r.method} onChange={(e) => setRow(i, { method: e.target.value as PaymentMethod })}>
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
              <Input aria-label="Monto" inputMode="decimal" value={r.amount} onChange={(e) => setRow(i, { amount: e.target.value })} className="tabular" />
              <Input
                aria-label={meta.reference ?? 'Referencia'}
                placeholder={meta.reference ? `${meta.reference} (opcional)` : '—'}
                disabled={!meta.reference}
                value={r.reference}
                onChange={(e) => setRow(i, { reference: e.target.value })}
                className="col-span-2 sm:col-span-1 sm:col-start-3 sm:row-start-1"
              />
              <IconButton aria-label="Quitar método" disabled={rows.length === 1} onClick={() => setRows((list) => list.filter((_, j) => j !== i))} className="col-start-3 row-start-1 sm:col-start-4">
                <Trash2 size={15} aria-hidden />
              </IconButton>
            </div>
          )
        })}
        {rows.length < 4 && (
          <Button
            size="sm"
            variant="ghost"
            className="self-start"
            onClick={() => setRows([...rows, { method: 'yape', amount: left > 0 ? soles(left) : '', reference: '' }])}
          >
            <Plus size={13} aria-hidden /> Dividir pago
          </Button>
        )}
      </div>

      {onlyCash && (
        <div className="grid items-end gap-3 sm:grid-cols-2">
          <Field label="¿Con cuánto paga? (opcional)">
            {(p) => <Input {...p} inputMode="decimal" placeholder="Ej.: 100" value={cashGiven} onChange={(e) => setCashGiven(e.target.value)} />}
          </Field>
          {change !== null && (
            <p className={cn('m-0 pb-2 text-sm font-semibold', change < 0 ? 'text-bad' : 'text-ok')}>
              {change < 0 ? `Faltan ${formatCents(-change)}` : `Vuelto: ${formatCents(change)}`}
            </p>
          )}
        </div>
      )}

      <dl className="m-0 grid grid-cols-[1fr_auto] gap-y-1 border-t border-line pt-3 text-sm">
        <dt className="text-muted">Saldo del servicio</dt>
        <dd className="tabular m-0 text-right">{formatCents(summary.balance)}</dd>
        {!!d && (
          <>
            <dt className="text-muted">Descuento</dt>
            <dd className="tabular m-0 text-right">−{formatCents(d)}</dd>
          </>
        )}
        {!!t && (
          <>
            <dt className="text-muted">Propina</dt>
            <dd className="tabular m-0 text-right">+{formatCents(t)}</dd>
          </>
        )}
        <dt className="font-semibold">Total a recibir</dt>
        <dd className="tabular m-0 text-right font-semibold">{formatCents(toCharge + (t ?? 0))}</dd>
        {!invalid && left > 0 && (
          <>
            <dt className="text-warn">Quedará pendiente</dt>
            <dd className="tabular m-0 text-right text-warn">{formatCents(left)}</dd>
          </>
        )}
      </dl>

      {['confirmed', 'checked_in', 'in_progress'].includes(a.status) && (
        <label className={cn('flex cursor-pointer items-center gap-2.5 text-sm', left > 0 && 'opacity-50')}>
          <Checkbox checked={complete && left === 0} disabled={left > 0} onCheckedChange={(v) => setComplete(v === true)} />
          Marcar la cita como completada
        </label>
      )}

      {error && (
        <p role="alert" className="m-0 text-sm font-semibold text-bad">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2.5">
        <Button onClick={onDone} disabled={pay.isPending}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={submit} disabled={pay.isPending || invalid || received === 0}>
          {pay.isPending ? 'Cobrando…' : `Cobrar ${formatCents(received)}`}
        </Button>
      </div>
    </div>
  )
}

function PaymentRow({ p, canVoid }: { p: PaymentView; canVoid: boolean }) {
  const { void: voidPayment } = usePaymentActions()
  const [voiding, setVoiding] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const voided = p.status === 'voided'

  return (
    <li className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Receipt size={16} className="text-muted" aria-hidden />
        <span className={cn('flex-1 text-sm', voided && 'line-through opacity-60')}>
          <b className="font-semibold">R-{String(p.number).padStart(5, '0')}</b>{' '}
          <span className="text-muted">
            · {p.localDate.split('-').reverse().join('/')} {formatTime(p.createdAt)} · {p.methods.map((m) => `${methodLabel(m.method)} ${formatCents(m.amount)}`).join(' + ')}
          </span>
        </span>
        <span className={cn('tabular text-sm font-semibold', voided && 'line-through opacity-60')}>{formatCents(p.total)}</span>
        {voided ? (
          <Tag tone="off">Anulado</Tag>
        ) : (
          canVoid &&
          !voiding && (
            <Button size="sm" variant="ghost" onClick={() => setVoiding(true)}>
              <Ban size={13} aria-hidden /> Anular
            </Button>
          )
        )}
      </div>
      {(p.tip > 0 || p.discount > 0 || p.note) && !voided && (
        <p className="m-0 pl-7 text-xs text-muted">
          {[p.discount > 0 && `Descuento ${formatCents(p.discount)}`, p.tip > 0 && `Propina ${formatCents(p.tip)}`, p.note].filter(Boolean).join(' · ')}
        </p>
      )}
      {voided && p.voidReason && <p className="m-0 pl-7 text-xs text-muted">Motivo: {p.voidReason}</p>}
      {voiding && (
        <div className="flex flex-wrap items-end gap-2 pl-7">
          <Field label="Motivo de la anulación" error={error ?? undefined} className="min-w-[220px] flex-1">
            {(f) => <Input {...f} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />}
          </Field>
          <Button size="sm" onClick={() => (setVoiding(false), setError(null))}>
            Volver
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={voidPayment.isPending}
            onClick={async () => {
              if (reason.trim().length < 3) return setError('Escribe el motivo')
              try {
                await voidPayment.mutateAsync({ id: p.id, reason: reason.trim() })
                setVoiding(false)
              } catch (e) {
                setError(errorMessage(e))
              }
            }}
          >
            Anular pago
          </Button>
        </div>
      )}
    </li>
  )
}

/** Cobro de la cita: saldo, pagos registrados y formulario para cobrar. */
export function PaymentSection({ a }: { a: Appointment }) {
  const { can, hasFeature, readOnly } = useAccess()
  const enabled = can('payment.read') && hasFeature('manual_payments')
  const summary = useAppointmentPayments(a.id, enabled)
  const [charging, setCharging] = useState(false)
  if (!enabled) return null

  const s = summary.data
  const canCharge = can('payment.create') && !readOnly && a.status !== 'cancelled'
  const status = s ? STATUS[s.status] : null

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            Cobro {status && <Tag tone={status.tone}>{status.label}</Tag>}
          </span>
        }
        actions={
          canCharge &&
          s &&
          !charging && (
            <Button size="sm" variant={s.balance > 0 ? 'primary' : 'default'} onClick={() => setCharging(true)}>
              <Wallet size={13} aria-hidden /> {s.balance > 0 ? `Cobrar ${formatCents(s.balance)}` : 'Agregar propina'}
            </Button>
          )
        }
      />
      {summary.isLoading || !s ? (
        <Skeleton className="h-20" />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Precio', s.price],
              ['Descuento', s.discount],
              ['Pagado', s.paid],
              ['Saldo', s.balance],
            ].map(([label, value]) => (
              <div key={label as string}>
                <div className="text-2xs font-semibold text-muted">{label}</div>
                <div className={cn('tabular text-md font-semibold', label === 'Saldo' && (value as number) > 0 && 'text-warn')}>{formatCents(value as number)}</div>
              </div>
            ))}
          </div>
          {s.tips > 0 && <p className="m-0 text-xs text-muted">Propinas: {formatCents(s.tips)}</p>}
          {charging && <ChargeForm a={a} summary={s} onDone={() => setCharging(false)} />}
          {s.payments.length > 0 && (
            <ul className="m-0 list-none p-0">
              {s.payments.map((p) => (
                <PaymentRow key={p.id} p={p} canVoid={can('payment.void') && !readOnly} />
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}
