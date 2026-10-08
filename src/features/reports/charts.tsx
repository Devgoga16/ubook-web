import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Gráficos de una sola serie (un tono, sin leyenda): barras ≤ 24px con punta
 * redondeada, líneas de 2px, cuadrícula fina y tooltip al pasar el mouse.
 * El texto usa tokens de texto, nunca el color de la serie.
 */

/** Ticks limpios para el eje: 0, 50, 100… */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0]
  const raw = max / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw
  const ticks: number[] = []
  for (let v = 0; v <= max + step * 0.01; v += step) ticks.push(v)
  if (ticks[ticks.length - 1]! < max) ticks.push(ticks[ticks.length - 1]! + step)
  return ticks
}

/** Tooltip sobre el gráfico, alineado a la marca (left en % del ancho). */
function Tooltip({ left, children }: { left: number; children: ReactNode }) {
  const edge = left < 15 ? '0%' : left > 85 ? '-100%' : '-50%'
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 -translate-y-[calc(100%+6px)] rounded-[8px] border border-line bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap text-ink shadow-card"
      style={{ left: `${left}%`, translate: `${edge} 0` }}
    >
      {children}
    </div>
  )
}

/** Datos del gráfico como tabla (accesibilidad y lectura exacta). */
export function DataTable({ columns, rows }: { columns: string[]; rows: Array<Array<string | number>> }) {
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer font-semibold text-muted hover:text-ink">Ver como tabla</summary>
      <div className="mt-2 max-h-64 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={c} className={cn('border-b border-line px-2 py-1.5 font-medium text-muted', i === 0 ? 'text-left' : 'text-right')}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j} className={cn('tabular border-b border-line px-2 py-1.5', j === 0 ? 'text-left' : 'text-right')}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

/* ---------- Columnas (una serie en el tiempo) ---------- */

export function ColumnChart({
  data,
  format,
  label,
  height = 200,
}: {
  data: Array<{ key: string; label: string; value: number; detail?: string }>
  format: (v: number) => string
  label: string
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640
  const pad = { top: 12, right: 8, bottom: 22, left: 52 }
  const inner = { w: W - pad.left - pad.right, h: height - pad.top - pad.bottom }
  const ticks = niceTicks(Math.max(...data.map((d) => d.value), 0))
  const max = ticks[ticks.length - 1] || 1
  const band = inner.w / Math.max(data.length, 1)
  const barW = Math.min(24, Math.max(3, band - 2))
  const y = (v: number) => pad.top + inner.h - (v / max) * inner.h
  // Etiquetas del eje x: como máximo ~8 para que no choquen.
  const every = Math.ceil(data.length / 8)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.left - 8} y={y(t) + 3} fontSize={10} textAnchor="end" fill="var(--muted)">
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.left + band * i + band / 2
          const h = Math.max(0, y(0) - y(d.value))
          const r = Math.min(4, h, barW / 2)
          const x0 = cx - barW / 2
          const top = y(0) - h
          return (
            <g key={d.key}>
              {/* Zona de hover más grande que la barra. */}
              <rect x={pad.left + band * i} y={pad.top} width={band} height={inner.h} fill="transparent" onMouseEnter={() => setHover(i)} />
              {h > 0 && (
                <path
                  d={`M${x0} ${y(0)} V${top + r} Q${x0} ${top} ${x0 + r} ${top} H${x0 + barW - r} Q${x0 + barW} ${top} ${x0 + barW} ${top + r} V${y(0)} Z`}
                  fill="var(--brand)"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                  pointerEvents="none"
                />
              )}
              {i % every === 0 && (
                <text x={cx} y={height - 6} fontSize={10} textAnchor="middle" fill="var(--muted)">
                  {d.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {hover !== null && data[hover] && (
        <Tooltip left={((pad.left + band * hover + band / 2) / W) * 100}>
          <b className="font-semibold">{format(data[hover].value)}</b>
          <span className="text-muted"> · {data[hover].label}</span>
          {data[hover].detail && <span className="block text-muted">{data[hover].detail}</span>}
        </Tooltip>
      )}
    </div>
  )
}

/* ---------- Barras horizontales (ranking) ---------- */

export function BarList({ data, format }: { data: Array<{ label: string; value: number; detail?: string }>; format: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_auto] items-center gap-3 text-sm" title={d.detail}>
          <span className="truncate">{d.label}</span>
          <span className="h-2.5 overflow-hidden rounded-r-[4px] bg-surface-2">
            <span className="block h-full rounded-r-[4px] bg-[var(--brand)]" style={{ width: `${(d.value / max) * 100}%` }} />
          </span>
          <b className="tabular text-right font-semibold">{format(d.value)}</b>
        </li>
      ))}
    </ul>
  )
}

/* ---------- Mapa de calor (secuencial, un tono) ---------- */

const WEEKDAYS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function Heatmap({ hours, cells }: { hours: number[]; cells: Array<{ weekday: number; hour: number; percent: number | null }> }) {
  const [hover, setHover] = useState<{ weekday: number; hour: number; percent: number | null } | null>(null)
  const at = (w: number, h: number) => cells.find((c) => c.weekday === w && c.hour === h)
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <div className="inline-grid min-w-full gap-[2px]" style={{ gridTemplateColumns: `36px repeat(${hours.length}, minmax(22px, 1fr))` }}>
          <span />
          {hours.map((h) => (
            <span key={h} className="text-center text-[10px] text-muted">
              {h}h
            </span>
          ))}
          {[1, 2, 3, 4, 5, 6, 7].map((w) => (
            <div key={w} className="contents">
              <span className="self-center text-[11px] text-muted">{WEEKDAYS[w]}</span>
              {hours.map((h) => {
                const c = at(w, h)
                const p = c?.percent
                return (
                  <span
                    key={h}
                    onMouseEnter={() => setHover(c ?? null)}
                    onMouseLeave={() => setHover(null)}
                    aria-label={`${WEEKDAYS[w]} ${h}:00 · ${p == null ? 'sin atención' : `${p}% ocupado`}`}
                    className={cn('h-6 rounded-[4px]', p == null && 'bg-[repeating-linear-gradient(45deg,var(--surface-2)_0_3px,transparent_3px_6px)]')}
                    style={p != null ? { background: `color-mix(in srgb, var(--brand) ${Math.max(6, p)}%, var(--surface-2))` } : undefined}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="min-h-4">
          {hover ? (
            <>
              <b className="font-semibold text-ink">
                {WEEKDAYS[hover.weekday]} {hover.hour}:00
              </b>{' '}
              · {hover.percent == null ? 'Sin horario de atención' : `${hover.percent}% ocupado`}
            </>
          ) : (
            'Pasa el mouse por una celda para ver el detalle.'
          )}
        </span>
        <span className="flex items-center gap-1.5">
          0%
          <span className="h-2 w-24 rounded-full" style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--brand) 6%, var(--surface-2)), var(--brand))' }} />
          100%
        </span>
      </div>
    </div>
  )
}

/* ---------- Línea (tendencia, una serie) ---------- */

export function LineChart({
  data,
  format,
  label,
  height = 160,
}: {
  data: Array<{ key: string; label: string; value: number | null; detail?: string }>
  format: (v: number) => string
  label: string
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640
  const pad = { top: 14, right: 16, bottom: 22, left: 44 }
  const inner = { w: W - pad.left - pad.right, h: height - pad.top - pad.bottom }
  const values = data.map((d) => d.value ?? 0)
  const ticks = niceTicks(Math.max(...values, 1), 3)
  const max = ticks[ticks.length - 1] || 1
  const x = (i: number) => pad.left + (data.length > 1 ? (i / (data.length - 1)) * inner.w : inner.w / 2)
  const y = (v: number) => pad.top + inner.h - (v / max) * inner.h
  const pts = data.map((d, i) => (d.value == null ? null : ([x(i), y(d.value)] as const)))
  const defined = pts.filter(Boolean) as Array<readonly [number, number]>
  const path = defined.map(([px, py], i) => `${i ? 'L' : 'M'}${px} ${py}`).join(' ')
  const last = defined[defined.length - 1]

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        role="img"
        aria-label={label}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - box.left) / box.width) * W
          const i = Math.round(((px - pad.left) / inner.w) * (data.length - 1))
          setHover(Math.max(0, Math.min(data.length - 1, i)))
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.left - 8} y={y(t) + 3} fontSize={10} textAnchor="end" fill="var(--muted)">
              {format(t)}
            </text>
          </g>
        ))}
        {defined.length > 1 && (
          <path d={`${path} L${defined[defined.length - 1]![0]} ${y(0)} L${defined[0]![0]} ${y(0)} Z`} fill="var(--teal)" opacity={0.1} />
        )}
        <path d={path} fill="none" stroke="var(--teal)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={y(0)} stroke="var(--line-strong)" strokeWidth={1} />}
        {hover !== null && pts[hover] && <circle cx={pts[hover]![0]} cy={pts[hover]![1]} r={4} fill="var(--teal)" stroke="var(--surface)" strokeWidth={2} />}
        {hover === null && last && <circle cx={last[0]} cy={last[1]} r={4} fill="var(--teal)" stroke="var(--surface)" strokeWidth={2} />}
        {data.map((d, i) =>
          i === 0 || i === data.length - 1 || i % 3 === 0 ? (
            <text key={d.key} x={x(i)} y={height - 6} fontSize={10} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fill="var(--muted)">
              {d.label}
            </text>
          ) : null,
        )}
      </svg>
      {hover !== null && data[hover] && (
        <Tooltip left={(x(hover) / W) * 100}>
          <b className="font-semibold">{data[hover].value == null ? 'Sin citas' : format(data[hover].value!)}</b>
          <span className="text-muted"> · {data[hover].label}</span>
          {data[hover].detail && <span className="block text-muted">{data[hover].detail}</span>}
        </Tooltip>
      )}
    </div>
  )
}
