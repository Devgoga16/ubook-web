import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, Download, Minus, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Segmented } from '@/components/ui/controls'
import { EmptyState, Skeleton, Table, Td, Th, Tr } from '@/components/ui/display'
import { Input, Select } from '@/components/ui/field'
import { api, errorMessage } from '@/lib/api/client'
import { useBranch } from '@/lib/auth/branch-context'
import { cn } from '@/lib/cn'
import { formatCents } from '@/lib/format'
import { addDaysYmd, todayLocal } from '@/lib/time'
import { BarList, ColumnChart, DataTable, Heatmap, LineChart } from './charts'

interface Metric {
  value: number | null
  previous: number | null
}

interface Report {
  period: { from: string; to: string; days: number }
  previous: { from: string; to: string }
  advanced: boolean
  branchReports: boolean
  kpis: {
    sales: Metric
    collected: Metric | null
    attended: Metric
    averageTicket: Metric
    occupancy: Metric
    noShowRate: Metric
    newClients: Metric
    recurringRate: { value: number | null; clients: number; returning: number } | null
    cancelled: Metric
  }
  byDay: Array<{ date: string; sales: number; appointments: number }>
  byService: Array<{ serviceName: string; appointments: number; sales: number }>
  byProfessional?: Array<{ professionalId: string; displayName: string; color: string; attended: number; sales: number; occupancy: number | null; noShows: number; commission: number; tips: number }>
  heatmap?: { hours: number[]; cells: Array<{ weekday: number; hour: number; percent: number | null }> }
  noShowTrend?: Array<{ month: string; total: number; noShows: number; rate: number | null }>
  topClients?: Array<{ clientId: string; name: string; visits: number; sales: number }>
  byBranch?: Array<{ branchId: string; name: string; sales: number; attended: number; occupancy: number | null; noShowRate: number }>
}

type Range = '7' | '30' | '90' | '365' | 'custom'
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const STATUS_ES: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  checked_in: 'En el local',
  in_progress: 'En atención',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

const shortDate = (ymd: string) => {
  const [, m, d] = ymd.split('-').map(Number) as [number, number, number]
  return `${d} ${MONTHS[m - 1]}`
}
const soles = (c: number) => (c >= 100_000 ? `S/ ${(c / 100_000).toFixed(1)}k` : `S/ ${Math.round(c / 100)}`)

/** Ventas por día; si el periodo es largo, por semana o por mes. */
function groupSales(byDay: Report['byDay']) {
  if (byDay.length <= 31) return byDay.map((d) => ({ key: d.date, label: shortDate(d.date), value: d.sales, detail: `${d.appointments} citas` }))
  const monthly = byDay.length > 120
  const groups = new Map<string, { label: string; value: number; appointments: number }>()
  for (const d of byDay) {
    let key: string
    let label: string
    if (monthly) {
      key = d.date.slice(0, 7)
      label = `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(2, 4)}`
    } else {
      // Semana que empieza el lunes.
      const wd = new Date(`${d.date}T12:00:00Z`).getUTCDay() || 7
      key = addDaysYmd(d.date, 1 - wd)
      label = shortDate(key)
    }
    const g = groups.get(key) ?? { label, value: 0, appointments: 0 }
    g.value += d.sales
    g.appointments += d.appointments
    groups.set(key, g)
  }
  return [...groups].map(([key, g]) => ({ key, label: g.label, value: g.value, detail: `${monthly ? 'Mes' : 'Semana del'} ${g.label} · ${g.appointments} citas` }))
}

/** Indicador con variación contra el periodo anterior. */
function Stat({ label, value, metric, format, upIsGood = true, featured }: { label: string; value: string; metric?: Metric | null; format?: (n: number) => string; upIsGood?: boolean; featured?: boolean }) {
  let delta: { text: string; good: boolean | null; dir: 'up' | 'down' | 'flat' } | null = null
  if (metric && metric.value != null && metric.previous != null) {
    const diff = metric.value - metric.previous
    const dir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
    const text =
      format ? `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${format(Math.abs(diff))}` : metric.previous > 0 ? `${diff >= 0 ? '+' : '−'}${Math.abs(Math.round((diff / metric.previous) * 100))}%` : diff > 0 ? 'Nuevo' : 'Sin cambio'
    delta = { text, dir, good: dir === 'flat' ? null : (dir === 'up') === upIsGood }
  }
  const Icon = delta?.dir === 'up' ? ArrowUpRight : delta?.dir === 'down' ? ArrowDownRight : Minus
  return (
    <div className={cn('flex flex-col gap-1 rounded-card p-4', featured ? 'bg-grad' : 'bg-surface shadow-card')}>
      <span className={cn('text-xs font-semibold', !featured && 'text-muted')}>{label}</span>
      <span className="tabular text-xl font-semibold">{value}</span>
      {delta && (
        <span
          title="Comparado con el periodo anterior"
          className={cn(
            'flex items-center gap-1 text-2xs font-semibold',
            featured ? 'opacity-90' : delta.good === null ? 'text-muted' : delta.good ? 'text-ok' : 'text-bad',
          )}
        >
          <Icon size={12} aria-hidden /> {delta.text}
        </span>
      )}
    </div>
  )
}

function csvDownload(filename: string, header: string[], rows: Array<Array<string | number>>) {
  const esc = (v: string | number) => (typeof v === 'number' ? String(v) : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  // BOM para que Excel lea bien tildes y ñ.
  const text = '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Negocio / Reportes. */
export function ReportsPage() {
  const { branches } = useBranch()
  const [range, setRange] = useState<Range>('30')
  const [custom, setCustom] = useState({ from: addDaysYmd(todayLocal(), -29), to: todayLocal() })
  const [branchId, setBranchId] = useState('')
  const [exporting, setExporting] = useState<string | null>(null)

  const period = useMemo(() => {
    if (range === 'custom') return custom
    const to = todayLocal()
    return { from: addDaysYmd(to, -(Number(range) - 1)), to }
  }, [range, custom])
  const qs = new URLSearchParams({ ...period, ...(branchId && { branchId }) })
  const report = useQuery({
    queryKey: ['reports', period, branchId],
    queryFn: () => api<Report>(`/reports?${qs}`),
    placeholderData: keepPreviousData,
  })

  const exportCsv = async () => {
    setExporting(null)
    try {
      const rows = await api<Array<Record<string, string | number>>>(`/reports/export?${qs}`)
      csvDownload(
        `ubook-citas-${period.from}_${period.to}.csv`,
        ['Fecha', 'Hora', 'Sede', 'Profesional', 'Cliente', 'Celular', 'Servicio', 'Estado', 'Precio (S/)', 'Descuento (S/)', 'Pagado (S/)', 'Propina (S/)', 'Métodos'],
        rows.map((r) => [
          r.date!,
          r.time!,
          r.branch!,
          r.professional!,
          r.client!,
          r.phone!,
          r.service!,
          STATUS_ES[r.status as string] ?? r.status!,
          (Number(r.price) / 100).toFixed(2),
          (Number(r.discount) / 100).toFixed(2),
          (Number(r.paid) / 100).toFixed(2),
          (Number(r.tip) / 100).toFixed(2),
          r.methods!,
        ]),
      )
    } catch (e) {
      setExporting(errorMessage(e))
    }
  }

  const r = report.data
  const k = r?.kpis

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            aria-label="Periodo"
            value={range}
            onValueChange={setRange}
            options={[
              { value: '7', label: '7 días' },
              { value: '30', label: '30 días' },
              { value: '90', label: 'Trimestre' },
              { value: '365', label: 'Año' },
              { value: 'custom', label: 'Fechas' },
            ]}
          />
          {range === 'custom' && (
            <div className="flex items-center gap-2 text-sm">
              <Input type="date" aria-label="Desde" value={custom.from} max={custom.to} onChange={(e) => e.target.value && setCustom({ ...custom, from: e.target.value })} className="w-auto" />
              <span className="text-muted">a</span>
              <Input type="date" aria-label="Hasta" value={custom.to} min={custom.from} onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value })} className="w-auto" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {branches.length > 1 && (
            <Select aria-label="Sede" value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-auto">
              <option value="">Todas las sedes</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
          {r?.advanced && (
            <Button onClick={() => void exportCsv()}>
              <Download size={14} aria-hidden /> Exportar a Excel
            </Button>
          )}
        </div>
      </div>
      {exporting && <p className="m-0 text-sm text-bad">{exporting}</p>}

      {report.isLoading || !r || !k ? (
        report.isError ? (
          <Card>
            <p className="m-0 text-sm text-bad">{errorMessage(report.error)}</p>
          </Card>
        ) : (
          <Skeleton className="h-[420px] rounded-card" />
        )
      ) : (
        <div className={cn('flex flex-col gap-4 transition-opacity', report.isPlaceholderData && 'opacity-60')}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat featured label="Ventas" value={formatCents(k.sales.value ?? 0)} metric={k.sales} />
            {k.collected && <Stat label="Cobrado" value={formatCents(k.collected.value ?? 0)} metric={k.collected} />}
            <Stat label="Citas atendidas" value={String(k.attended.value ?? 0)} metric={k.attended} />
            <Stat label="Ticket promedio" value={formatCents(k.averageTicket.value ?? 0)} metric={k.averageTicket} />
            <Stat label="Ocupación" value={k.occupancy.value != null ? `${k.occupancy.value}%` : '—'} metric={k.occupancy} format={(n) => `${Math.round(n * 10) / 10} pts`} />
            <Stat label="Faltas" value={`${k.noShowRate.value ?? 0}%`} metric={k.noShowRate} format={(n) => `${Math.round(n * 10) / 10} pts`} upIsGood={false} />
            <Stat label="Clientes nuevos" value={String(k.newClients.value ?? 0)} metric={k.newClients} />
            {k.recurringRate && (
              <Stat
                label="Clientes que vuelven"
                value={k.recurringRate.value != null ? `${k.recurringRate.value}%` : '—'}
                metric={null}
              />
            )}
          </div>
          <p className="m-0 -mt-1 text-xs text-muted">
            Variación frente al periodo anterior ({shortDate(r.previous.from)} – {shortDate(r.previous.to)}).
            {k.recurringRate && k.recurringRate.clients > 0 && ` De ${k.recurringRate.clients} clientes atendidos, ${k.recurringRate.returning} ya habían venido antes.`}
          </p>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader title="Ventas" actions={<span className="text-xs text-muted">Citas completadas</span>} />
              {k.sales.value ? (
                <>
                  <ColumnChart data={groupSales(r.byDay)} format={soles} label={`Ventas entre ${r.period.from} y ${r.period.to}`} />
                  <DataTable columns={['Fecha', 'Citas', 'Ventas']} rows={r.byDay.map((d) => [d.date, d.appointments, formatCents(d.sales)])} />
                </>
              ) : (
                <EmptyState icon={Sparkles} title="Sin ventas en este periodo" description="Las ventas se cuentan cuando una cita se marca como completada." />
              )}
            </Card>
            <Card>
              <CardHeader title="Ventas por servicio" />
              {r.byService.length ? (
                <>
                  <BarList data={r.byService.slice(0, 8).map((s) => ({ label: s.serviceName, value: s.sales, detail: `${s.appointments} citas` }))} format={formatCents} />
                  <DataTable columns={['Servicio', 'Citas', 'Ventas']} rows={r.byService.map((s) => [s.serviceName, s.appointments, formatCents(s.sales)])} />
                </>
              ) : (
                <p className="m-0 text-sm text-muted">Todavía no hay servicios completados.</p>
              )}
            </Card>
          </div>

          {!r.advanced ? (
            <Card className="flex flex-wrap items-center gap-4">
              <span className="grid size-11 place-items-center rounded-[12px] bg-brand-soft text-brand">
                <Sparkles size={20} aria-hidden />
              </span>
              <div className="min-w-[220px] flex-1">
                <b className="font-semibold">Reportes completos en el plan Pro</b>
                <p className="m-0 text-sm text-muted">Mapa de ocupación por día y hora, rendimiento por profesional, tendencia de faltas, mejores clientes y exportación a Excel.</p>
              </div>
            </Card>
          ) : (
            <>
              <div className="grid items-start gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Ocupación por día y hora" actions={<span className="text-xs text-muted">Más oscuro = más lleno</span>} />
                  {r.heatmap && r.heatmap.hours.length ? (
                    <Heatmap hours={r.heatmap.hours} cells={r.heatmap.cells} />
                  ) : (
                    <p className="m-0 text-sm text-muted">Define los horarios de tus profesionales para ver la ocupación.</p>
                  )}
                </Card>
                <Card>
                  <CardHeader title="Tasa de faltas" actions={<span className="text-xs text-muted">Últimos 12 meses</span>} />
                  {r.noShowTrend && r.noShowTrend.some((m) => m.total > 0) ? (
                    <>
                      <LineChart
                        data={r.noShowTrend.map((m) => ({
                          key: m.month,
                          label: `${MONTHS[Number(m.month.slice(5)) - 1]} ${m.month.slice(2, 4)}`,
                          value: m.total ? m.rate : null,
                          detail: m.total ? `${m.noShows} de ${m.total} citas` : undefined,
                        }))}
                        format={(v) => `${Math.round(v * 10) / 10}%`}
                        label="Tasa de faltas por mes en los últimos 12 meses"
                      />
                      <DataTable
                        columns={['Mes', 'Citas', 'Faltas', 'Tasa']}
                        rows={r.noShowTrend.map((m) => [m.month, m.total, m.noShows, m.rate != null ? `${m.rate}%` : '—'])}
                      />
                    </>
                  ) : (
                    <p className="m-0 text-sm text-muted">Aún no hay citas atendidas o faltas registradas.</p>
                  )}
                </Card>
              </div>

              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <Card>
                  <CardHeader title="Rendimiento por profesional" />
                  {r.byProfessional?.length ? (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Profesional</Th>
                          <Th className="text-right">Atendidas</Th>
                          <Th className="text-right">Ventas</Th>
                          <Th className="text-right">Ocupación</Th>
                          <Th className="text-right">Faltas</Th>
                          <Th className="text-right">Comisión + propinas</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.byProfessional.map((p) => (
                          <Tr key={p.professionalId}>
                            <Td>
                              <span className="flex items-center gap-2.5">
                                <Avatar name={p.displayName} color={p.color} size="xs" round />
                                <span className="font-semibold">{p.displayName}</span>
                              </span>
                            </Td>
                            <Td className="text-right">{p.attended}</Td>
                            <Td className="text-right">{formatCents(p.sales)}</Td>
                            <Td className="text-right">{p.occupancy != null ? `${p.occupancy}%` : '—'}</Td>
                            <Td className="text-right">{p.noShows}</Td>
                            <Td className="text-right">{formatCents(p.commission + p.tips)}</Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <p className="m-0 text-sm text-muted">Sin actividad en este periodo.</p>
                  )}
                </Card>
                <Card>
                  <CardHeader title="Mejores clientes" />
                  {r.topClients?.length ? (
                    <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
                      {r.topClients.map((c, i) => (
                        <li key={c.clientId} className="flex items-center gap-3 text-sm">
                          <span className="tabular w-4 text-xs text-muted">{i + 1}</span>
                          <Link to={`/clientes/${c.clientId}`} className="min-w-0 flex-1 truncate font-semibold text-ink hover:underline">
                            {c.name}
                          </Link>
                          <span className="text-xs text-muted">{c.visits === 1 ? '1 visita' : `${c.visits} visitas`}</span>
                          <b className="tabular w-[84px] text-right font-semibold">{formatCents(c.sales)}</b>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="m-0 text-sm text-muted">Sin clientes atendidos en este periodo.</p>
                  )}
                  <Link to="/clientes?segmento=at_risk" className="mt-3 inline-block text-xs font-semibold text-brand hover:underline">
                    Ver clientes por recuperar
                  </Link>
                </Card>
              </div>
            </>
          )}

          {r.byBranch && (
            <Card>
              <CardHeader title="Comparativa por sede" />
              <Table>
                <thead>
                  <tr>
                    <Th>Sede</Th>
                    <Th className="text-right">Ventas</Th>
                    <Th className="text-right">Atendidas</Th>
                    <Th className="text-right">Ocupación</Th>
                    <Th className="text-right">Faltas</Th>
                  </tr>
                </thead>
                <tbody>
                  {r.byBranch.map((b) => (
                    <Tr key={b.branchId}>
                      <Td className="font-semibold">{b.name}</Td>
                      <Td className="text-right">{formatCents(b.sales)}</Td>
                      <Td className="text-right">{b.attended}</Td>
                      <Td className="text-right">{b.occupancy != null ? `${b.occupancy}%` : '—'}</Td>
                      <Td className="text-right">{b.noShowRate}%</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
