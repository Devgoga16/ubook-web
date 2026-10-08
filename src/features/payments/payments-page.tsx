import { ArrowDownLeft, ArrowUpRight, Banknote, CreditCard, HandCoins, Landmark, Lock, LockOpen, Receipt, Smartphone, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { FilterChips, Segmented } from '@/components/ui/controls'
import { EmptyState, Skeleton, Table, Td, Th, Tr } from '@/components/ui/display'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { KpiFlat } from '@/components/ui/kpi'
import { RouteTabs, useTab } from '@/components/ui/page'
import { useProfessionals } from '@/features/professionals/api'
import { errorMessage } from '@/lib/api/client'
import type { PaymentView } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { useAuth } from '@/lib/auth/auth-context'
import { useBranch } from '@/lib/auth/branch-context'
import { cn } from '@/lib/cn'
import { formatCents, parseSoles } from '@/lib/format'
import { addDaysYmd, formatLongDate, formatTime, todayLocal } from '@/lib/time'
import { methodLabel, useCashActions, useCashDay, useCommissions, usePayments } from './api'

const TABS = ['caja', 'pagos', 'comisiones'] as const
type Tab = (typeof TABS)[number]
type Range = 'today' | 'week' | 'month' | 'custom'

function rangeFor(r: Range, custom: { from: string; to: string }): { from: string; to: string } {
  const today = todayLocal()
  if (r === 'today') return { from: today, to: today }
  if (r === 'week') return { from: addDaysYmd(today, -6), to: today }
  if (r === 'month') return { from: `${today.slice(0, 8)}01`, to: today }
  return custom
}

function RangePicker({ range, setRange, custom, setCustom }: { range: Range; setRange: (r: Range) => void; custom: { from: string; to: string }; setCustom: (c: { from: string; to: string }) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Segmented
        aria-label="Periodo"
        value={range}
        onValueChange={setRange}
        options={[
          { value: 'today', label: 'Hoy' },
          { value: 'week', label: '7 días' },
          { value: 'month', label: 'Este mes' },
          { value: 'custom', label: 'Fechas' },
        ]}
      />
      {range === 'custom' && (
        <div className="flex items-center gap-2 text-sm">
          <Input type="date" aria-label="Desde" value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="w-auto" />
          <span className="text-muted">a</span>
          <Input type="date" aria-label="Hasta" value={custom.to} min={custom.from} max={todayLocal()} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="w-auto" />
        </div>
      )}
    </div>
  )
}

function PaymentsTable({ items, showDate }: { items: PaymentView[]; showDate?: boolean }) {
  if (items.length === 0) return <p className="m-0 py-6 text-center text-sm text-muted">No hay cobros en este periodo.</p>
  return (
    <Table>
      <thead>
        <tr>
          <Th>Recibo</Th>
          <Th>{showDate ? 'Fecha' : 'Hora'}</Th>
          <Th>Cliente</Th>
          <Th>Servicio</Th>
          <Th>Método</Th>
          <Th className="text-right">Propina</Th>
          <Th className="text-right">Total</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((p) => (
          <Tr key={p.id} className={cn(p.status === 'voided' && 'opacity-55')}>
            <Td>
              <Link to={`/agenda/citas/${p.appointmentId}`} className="font-semibold text-ink hover:underline">
                R-{String(p.number).padStart(5, '0')}
              </Link>
              {p.status === 'voided' && (
                <Tag tone="off" className="ml-2">
                  Anulado
                </Tag>
              )}
            </Td>
            <Td className="text-ink-2">{showDate ? `${p.localDate.split('-').reverse().slice(0, 2).join('/')} ${formatTime(p.createdAt)}` : formatTime(p.createdAt)}</Td>
            <Td>{p.clientName}</Td>
            <Td className="text-ink-2">
              {p.serviceName} <span className="text-muted">· {p.professionalName}</span>
            </Td>
            <Td className="text-ink-2">{p.methods.map((m) => methodLabel(m.method)).join(' + ')}</Td>
            <Td className="text-right">{p.tip ? formatCents(p.tip) : '—'}</Td>
            <Td className={cn('text-right font-semibold', p.status === 'voided' && 'line-through')}>{formatCents(p.total)}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  )
}

/* ---------- Caja del día ---------- */

function CashTab() {
  const { current, branches, setCurrent } = useBranch()
  const { can, readOnly } = useAccess()
  const [date, setDate] = useState(todayLocal())
  const day = useCashDay(current?.id, date)
  const { movement, close, reopen } = useCashActions()
  const [mv, setMv] = useState({ type: 'out' as 'in' | 'out', amount: '', concept: '' })
  const [closeForm, setCloseForm] = useState({ opening: '', counted: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const isToday = date === todayLocal()
  const canWrite = can('payment.create') && !readOnly

  const d = day.data
  const opening = parseSoles(closeForm.opening || '0')
  const counted = closeForm.counted ? parseSoles(closeForm.counted) : null
  const expected = d && opening !== null ? opening + d.cashFromDay : null
  const diff = expected !== null && counted !== null ? counted - expected : null

  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {branches.length > 1 && (
          <Select aria-label="Sede" value={current?.id ?? ''} onChange={(e) => setCurrent(e.target.value)} className="w-auto">
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        )}
        <Input type="date" aria-label="Día" value={date} max={todayLocal()} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-auto" />
        <span className="text-sm font-semibold">{formatLongDate(date)}</span>
        {d?.close ? <Tag tone="ok">Caja cerrada</Tag> : isToday && <Tag tone="teal">Caja abierta</Tag>}
      </div>

      {day.isLoading || !d ? (
        <Skeleton className="h-[300px] rounded-card" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiFlat icon={HandCoins} label="Cobrado" value={formatCents(d.totals.collected)} />
            <KpiFlat icon={Banknote} label="Efectivo" value={formatCents(d.totals.byMethod.cash)} />
            <KpiFlat icon={Smartphone} label="Yape / Plin" value={formatCents(d.totals.byMethod.yape + d.totals.byMethod.plin)} />
            <KpiFlat icon={CreditCard} label="Tarjeta / Transf." value={formatCents(d.totals.byMethod.card + d.totals.byMethod.transfer + d.totals.byMethod.other)} />
          </div>
          <p className="m-0 text-xs text-muted">
            {d.totals.count} {d.totals.count === 1 ? 'cobro' : 'cobros'} · Servicios {formatCents(d.totals.sales)} · Propinas {formatCents(d.totals.tips)}
            {d.totals.discount > 0 && ` · Descuentos ${formatCents(d.totals.discount)}`}
          </p>

          {error && (
            <p role="alert" className="m-0 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
              {error}
            </p>
          )}

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader title="Cobros del día" />
              <PaymentsTable items={d.payments} />
            </Card>

            <div className="flex flex-col gap-4">
              <Card className="flex flex-col gap-3">
                <CardHeader title="Movimientos de efectivo" className="mb-0" />
                {d.movements.length === 0 ? (
                  <p className="m-0 text-sm text-muted">Gastos, retiros o ingresos de efectivo que no son cobros.</p>
                ) : (
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {d.movements.map((m) => (
                      <li key={m.id} className="flex items-center gap-2 text-sm">
                        {m.type === 'in' ? <ArrowDownLeft size={15} className="text-ok" aria-hidden /> : <ArrowUpRight size={15} className="text-bad" aria-hidden />}
                        <span className="flex-1 truncate">{m.concept}</span>
                        <span className={cn('tabular font-semibold', m.type === 'in' ? 'text-ok' : 'text-bad')}>
                          {m.type === 'in' ? '+' : '−'}
                          {formatCents(m.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {canWrite && isToday && !d.close && (
                  <div className="flex flex-col gap-2 border-t border-line pt-3">
                    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                      <Select aria-label="Tipo" value={mv.type} onChange={(e) => setMv({ ...mv, type: e.target.value as 'in' | 'out' })} className="w-auto">
                        <option value="out">Salida</option>
                        <option value="in">Entrada</option>
                      </Select>
                      <Input aria-label="Monto" inputMode="decimal" placeholder="Monto S/" value={mv.amount} onChange={(e) => setMv({ ...mv, amount: e.target.value })} />
                    </div>
                    <Input aria-label="Concepto" placeholder="Concepto (ej.: compra de toallas)" value={mv.concept} onChange={(e) => setMv({ ...mv, concept: e.target.value })} />
                    <Button
                      size="sm"
                      className="self-end"
                      disabled={movement.isPending}
                      onClick={async () => {
                        const amount = parseSoles(mv.amount)
                        if (!amount || mv.concept.trim().length < 2) return setError('Ingresa el monto y el concepto del movimiento')
                        if (await run(() => movement.mutateAsync({ branchId: d.branchId, type: mv.type, amount, concept: mv.concept.trim() })))
                          setMv({ type: mv.type, amount: '', concept: '' })
                      }}
                    >
                      Registrar movimiento
                    </Button>
                  </div>
                )}
              </Card>

              <Card className="flex flex-col gap-3">
                <CardHeader title={d.close ? 'Cierre de caja' : 'Cerrar caja'} className="mb-0" />
                {d.close ? (
                  <>
                    <dl className="m-0 grid grid-cols-[1fr_auto] gap-y-1.5 text-sm">
                      <dt className="text-muted">Fondo inicial</dt>
                      <dd className="tabular m-0 text-right">{formatCents(d.close.openingCash)}</dd>
                      <dt className="text-muted">Efectivo esperado</dt>
                      <dd className="tabular m-0 text-right">{formatCents(d.close.expectedCash)}</dd>
                      <dt className="text-muted">Efectivo contado</dt>
                      <dd className="tabular m-0 text-right">{formatCents(d.close.countedCash)}</dd>
                      <dt className="font-semibold">Diferencia</dt>
                      <dd className={cn('tabular m-0 text-right font-semibold', d.close.difference < 0 ? 'text-bad' : d.close.difference > 0 ? 'text-warn' : 'text-ok')}>
                        {d.close.difference === 0 ? 'Cuadra' : `${d.close.difference > 0 ? '+' : '−'}${formatCents(Math.abs(d.close.difference))}`}
                      </dd>
                    </dl>
                    {d.close.notes && <p className="m-0 text-xs text-muted">{d.close.notes}</p>}
                    {can('payment.void') && !readOnly && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="self-start"
                        disabled={reopen.isPending}
                        onClick={() => window.confirm('¿Reabrir la caja de este día? Se podrán registrar o anular cobros otra vez.') && run(() => reopen.mutateAsync({ branchId: d.branchId, date }))}
                      >
                        <LockOpen size={13} aria-hidden /> Reabrir caja
                      </Button>
                    )}
                  </>
                ) : canWrite ? (
                  <>
                    <p className="m-0 text-xs text-muted">Cuenta el efectivo al final del día. Después del cierre no se pueden registrar ni anular cobros de este día.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Fondo inicial (S/)">
                        {(p) => <Input {...p} inputMode="decimal" placeholder="0.00" value={closeForm.opening} onChange={(e) => setCloseForm({ ...closeForm, opening: e.target.value })} />}
                      </Field>
                      <Field label="Efectivo contado (S/)">
                        {(p) => <Input {...p} inputMode="decimal" placeholder="0.00" value={closeForm.counted} onChange={(e) => setCloseForm({ ...closeForm, counted: e.target.value })} />}
                      </Field>
                    </div>
                    {expected !== null && (
                      <p className="m-0 flex justify-between text-sm">
                        <span className="text-muted">Debería haber</span>
                        <b className="tabular font-semibold">{formatCents(expected)}</b>
                      </p>
                    )}
                    {diff !== null && (
                      <p className={cn('m-0 flex justify-between text-sm font-semibold', diff < 0 ? 'text-bad' : diff > 0 ? 'text-warn' : 'text-ok')}>
                        <span>{diff === 0 ? 'Cuadra' : diff < 0 ? 'Falta' : 'Sobra'}</span>
                        <span className="tabular">{formatCents(Math.abs(diff))}</span>
                      </p>
                    )}
                    <Textarea aria-label="Notas del cierre" rows={2} placeholder="Notas (opcional)" value={closeForm.notes} onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })} />
                    <Button
                      variant="primary"
                      disabled={close.isPending || opening === null || counted === null}
                      onClick={() =>
                        opening !== null &&
                        counted !== null &&
                        run(() => close.mutateAsync({ branchId: d.branchId, date, openingCash: opening, countedCash: counted, notes: closeForm.notes.trim() || undefined }))
                      }
                    >
                      <Lock size={14} aria-hidden /> Cerrar caja
                    </Button>
                  </>
                ) : (
                  <p className="m-0 text-sm text-muted">Aún no se cerró.</p>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ---------- Pagos ---------- */

function PaymentsTab({ branchId, mine }: { branchId?: string; mine?: string }) {
  const { can, scope } = useAccess()
  const [range, setRange] = useState<Range>('week')
  const [custom, setCustom] = useState({ from: addDaysYmd(todayLocal(), -30), to: todayLocal() })
  const [pro, setPro] = useState('')
  const professionals = useProfessionals(can('professional.read'))
  const r = rangeFor(range, custom)
  const list = usePayments({ ...r, branchId, professionalId: mine ?? (pro || undefined) })
  const t = list.data?.totals

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <RangePicker range={range} setRange={setRange} custom={custom} setCustom={setCustom} />
        {scope('payment.read') !== 'own' && !mine && professionals.data && (
          <Select aria-label="Profesional" value={pro} onChange={(e) => setPro(e.target.value)} className="w-auto">
            <option value="">Todos los profesionales</option>
            {professionals.data.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </Select>
        )}
      </div>
      {t && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiFlat icon={HandCoins} label="Cobrado" value={formatCents(t.collected)} />
          <KpiFlat icon={Receipt} label="Servicios" value={formatCents(t.sales)} />
          <KpiFlat icon={Wallet} label="Propinas" value={formatCents(t.tips)} />
          <KpiFlat icon={Landmark} label="Cobros" value={String(t.count)} />
        </div>
      )}
      <Card>
        {list.isLoading ? <Skeleton className="h-40" /> : <PaymentsTable items={list.data?.items ?? []} showDate />}
      </Card>
    </div>
  )
}

/* ---------- Comisiones ---------- */

function CommissionsTab({ branchId, mine }: { branchId?: string; mine?: string }) {
  const [range, setRange] = useState<Range>('month')
  const [custom, setCustom] = useState({ from: addDaysYmd(todayLocal(), -30), to: todayLocal() })
  const rows = useCommissions({ ...rangeFor(range, custom), branchId, professionalId: mine })
  const data = rows.data ?? []
  const sum = (k: 'sales' | 'commission' | 'tips' | 'toPay' | 'appointments') => data.reduce((a, r) => a + r[k], 0)

  return (
    <div className="flex flex-col gap-4">
      <RangePicker range={range} setRange={setRange} custom={custom} setCustom={setCustom} />
      <Card>
        <CardHeader title="Comisiones y propinas" />
        {rows.isLoading ? (
          <Skeleton className="h-40" />
        ) : data.length === 0 ? (
          <EmptyState icon={HandCoins} title="Sin cobros en este periodo" description="Las comisiones se calculan con el % de cada profesional al momento de cobrar. Las propinas van completas al profesional." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Profesional</Th>
                <Th className="text-right">Citas</Th>
                <Th className="text-right">Ventas</Th>
                <Th className="text-right">% actual</Th>
                <Th className="text-right">Comisión</Th>
                <Th className="text-right">Propinas</Th>
                <Th className="text-right">A pagar</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <Tr key={r.professionalId}>
                  <Td>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={r.displayName} color={r.color ?? undefined} size="xs" round />
                      <span className="font-semibold">{r.displayName}</span>
                    </span>
                  </Td>
                  <Td className="text-right">{r.appointments}</Td>
                  <Td className="text-right">{formatCents(r.sales)}</Td>
                  <Td className="text-right text-muted">{r.commissionPercent != null ? `${r.commissionPercent}%` : '—'}</Td>
                  <Td className="text-right">{formatCents(r.commission)}</Td>
                  <Td className="text-right">{formatCents(r.tips)}</Td>
                  <Td className="text-right font-semibold">{formatCents(r.toPay)}</Td>
                </Tr>
              ))}
              <tr>
                <Td className="font-semibold">Total</Td>
                <Td className="text-right font-semibold">{sum('appointments')}</Td>
                <Td className="text-right font-semibold">{formatCents(sum('sales'))}</Td>
                <Td />
                <Td className="text-right font-semibold">{formatCents(sum('commission'))}</Td>
                <Td className="text-right font-semibold">{formatCents(sum('tips'))}</Td>
                <Td className="text-right font-semibold">{formatCents(sum('toPay'))}</Td>
              </tr>
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}

/** Negocio / Pagos: caja del día, historial de cobros y comisiones. */
export function PaymentsPage() {
  const { can, scope } = useAccess()
  const { me } = useAuth()
  const { current } = useBranch()
  const own = scope('payment.read') === 'own'
  const professionals = useProfessionals(can('professional.read'))
  // Dueño o recepción que también atiende: puede ver solo lo suyo.
  const myPro = professionals.data?.find((p) => p.membershipId === me?.access?.membershipId)
  const [onlyMine, setOnlyMine] = useState(false)
  const mine = !own && onlyMine && myPro ? myPro.id : undefined
  const allowed: Tab[] = own ? ['pagos', 'comisiones'] : [...TABS]
  const tab = useTab<Tab>(allowed, allowed[0]!)
  const [allBranches, setAllBranches] = useState(false)
  const branchId = allBranches || own || mine ? undefined : current?.id

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RouteTabs<Tab>
          fallback={allowed[0]!}
          tabs={[
            ...(own ? [] : [{ value: 'caja' as const, label: 'Caja del día' }]),
            { value: 'pagos', label: own ? 'Mis cobros' : 'Pagos' },
            { value: 'comisiones', label: own ? 'Mis comisiones' : 'Comisiones' },
          ]}
        />
        {!own && tab !== 'caja' && (
          <div className="flex flex-wrap gap-2">
          {myPro && (
            <FilterChips
              aria-label="Qué ver"
              value={onlyMine ? 'mine' : 'all'}
              onValueChange={(v) => setOnlyMine(v === 'mine')}
              options={[
                { value: 'all', label: 'Todo el negocio' },
                { value: 'mine', label: 'Solo lo mío' },
              ]}
            />
          )}
          {!mine && (
          <FilterChips
            aria-label="Sedes"
            value={allBranches ? 'all' : 'current'}
            onValueChange={(v) => setAllBranches(v === 'all')}
            options={[
              { value: 'current', label: current?.name ?? 'Esta sede' },
              { value: 'all', label: 'Todas las sedes' },
            ]}
          />
          )}
          </div>
        )}
      </div>
      {tab === 'caja' && <CashTab />}
      {tab === 'pagos' && <PaymentsTab branchId={branchId} mine={mine} />}
      {tab === 'comisiones' && <CommissionsTab branchId={branchId} mine={mine} />}
    </>
  )
}
