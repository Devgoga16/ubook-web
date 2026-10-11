import { Receipt, Wallet } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState, Skeleton, Table, Td, Th } from '@/components/ui/display'
import { KpiFlat } from '@/components/ui/kpi'
import { formatDate } from '@/features/clients/api'
import type { PaymentMethod } from '@/lib/api/types'
import { formatCents } from '@/lib/format'
import { usePortalPayments, type PortalAccount, type PortalAppointments } from './api'
import { LinkButton, personName } from './parts'

const METHOD: Record<PaymentMethod, string> = { cash: 'Efectivo', yape: 'Yape', plin: 'Plin', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' }

/** Pagos: lo cobrado en el negocio y los adelantos de las citas próximas. */
export function PaymentsTab({ slug, token, account, appointments }: { slug: string; token: string; account: PortalAccount; appointments: PortalAppointments }) {
  const payments = usePortalPayments(slug, token)
  const several = account.profiles.length > 1
  const deposits = appointments.upcoming.filter((a) => a.deposit)
  const items = payments.data?.items ?? []

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <KpiFlat icon={Wallet} label={`Pagado en ${new Date().getFullYear()}`} value={payments.data ? formatCents(payments.data.totalThisYear) : '—'} />
        <KpiFlat icon={Receipt} label="Pagos registrados" value={payments.data ? String(items.length) : '—'} />
      </div>

      {deposits.length > 0 && (
        <Card>
          <CardHeader title="Adelantos de tus próximas citas" />
          <ul className="m-0 list-none p-0">
            {deposits.map((a) => (
              <li key={a.token} className="flex flex-wrap items-center gap-3 border-t border-line py-2.5 text-sm first:border-t-0">
                <div className="min-w-[200px] flex-1">
                  <b className="font-semibold">{a.serviceName}</b>
                  <span className="text-muted"> · {formatDate(a.startsAt)}</span>
                  {several && <span className="text-muted"> · {personName(account.profiles, a.clientId)}</span>}
                </div>
                <b className="tabular font-semibold">{formatCents(a.deposit!.amount)}</b>
                <span className={a.deposit!.status === 'approved' ? 'font-semibold text-ok' : a.deposit!.status === 'rejected' ? 'font-semibold text-bad' : 'font-semibold text-warn'}>
                  {a.deposit!.status === 'approved' ? 'Validado' : a.deposit!.status === 'rejected' ? 'No validado' : 'En revisión'}
                </span>
                <LinkButton small to={`/reserva/${a.token}`}>
                  Ver cita
                </LinkButton>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title="Historial de pagos" />
        {payments.isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : payments.isError ? (
          <p className="m-0 text-sm text-bad">No pudimos cargar tus pagos.</p>
        ) : items.length === 0 ? (
          <EmptyState icon={Receipt} title="Aún no hay pagos" description="Lo que pagues en tus visitas aparecerá aquí, con la fecha y el medio de pago." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Servicio</Th>
                {several && <Th>Persona</Th>}
                <Th>Medio de pago</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <Td className="text-muted">{formatDate(`${p.date}T12:00:00Z`)}</Td>
                  <Td className="font-semibold">
                    {p.serviceName}
                    {p.discount > 0 && <span className="ml-2 text-xs font-normal text-ok">−{formatCents(p.discount)} dscto.</span>}
                    {p.tip > 0 && <span className="ml-2 text-xs font-normal text-muted">incluye {formatCents(p.tip)} de propina</span>}
                  </Td>
                  {several && <Td>{personName(account.profiles, p.clientId)}</Td>}
                  <Td className="text-muted">{p.methods.map((m) => METHOD[m.method]).join(' + ')}</Td>
                  <Td className="text-right font-semibold">{formatCents(p.total)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
