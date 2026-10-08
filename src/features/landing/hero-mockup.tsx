import { BellRing, CalendarDays, ChartColumn, Check, Clock, House, Search, Users, Wallet } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { SERVICE_COLORS } from '@/features/services/colors'
import { cn } from '@/lib/cn'

const DAYS = ['Lun 6', 'Mar 7', 'Mié 8', 'Jue 9', 'Vie 10']
const HOURS = ['9:00', '10:00', '11:00', '12:00', '1:00', '2:00']

/** [día, hora de inicio (desde 9:00), duración en horas, servicio, cliente, color] */
const BLOCKS: Array<[number, number, number, string, string, number]> = [
  [0, 0, 1, 'Corte y barba', 'Diego R.', 0],
  [0, 2, 1.5, 'Color completo', 'Lucía M.', 3],
  [1, 0.5, 1, 'Manicure gel', 'Ana P.', 1],
  [1, 3, 1, 'Sesión individual', 'Jorge T.', 2],
  [2, 1, 2, 'Masaje relajante', 'Carla V.', 5],
  [2, 4, 1, 'Corte clásico', 'Marco S.', 0],
  [3, 0, 1, 'Limpieza dental', 'Sofía L.', 4],
  [3, 2.5, 1, 'Brushing', 'Valeria C.', 3],
  [4, 1.5, 1, 'Corte y barba', 'Camila F.', 0],
  [4, 3.5, 1.5, 'Facial hidratante', 'Paula G.', 1],
]

const ROW = 46

/** Ventana del producto, dibujada con HTML: una semana de agenda real. */
export function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[1040px]" aria-hidden>
      <div className="absolute -inset-x-10 -inset-y-12 glow opacity-80 blur-2xl" />

      <div className="relative overflow-hidden rounded-[18px] border border-line bg-surface shadow-[0_30px_80px_-20px_rgb(31_34_69/0.35)]">
        {/* Barra de ventana */}
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-bad/60" />
          <span className="size-2.5 rounded-full bg-warn/60" />
          <span className="size-2.5 rounded-full bg-ok/60" />
          <div className="mx-auto flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-2xs text-muted">
            <Search size={11} /> uBook · Agenda
          </div>
        </div>

        <div className="flex">
          {/* Menú lateral */}
          <div className="hidden w-[150px] flex-none flex-col gap-1 border-r border-line p-3 md:flex">
            <Logo size="sm" className="mb-3 px-1.5" />
            {[
              [House, 'Dashboard'],
              [CalendarDays, 'Agenda'],
              [Users, 'Clientes'],
              [Wallet, 'Pagos'],
              [BellRing, 'Mensajes'],
              [ChartColumn, 'Reportes'],
            ].map(([Icon, label], i) => {
              const I = Icon as typeof House
              return (
                <div
                  key={label as string}
                  className={cn(
                    'flex items-center gap-2 rounded-control px-2 py-1.5 text-2xs font-semibold text-ink-2',
                    i === 1 && 'bg-brand-soft text-brand',
                  )}
                >
                  <I size={13} /> {label as string}
                </div>
              )
            })}
          </div>

          {/* Agenda semanal */}
          <div className="min-w-0 flex-1 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-md font-bold">Semana del 6 de octubre</div>
                <div className="text-2xs text-muted">Sede Miraflores · 4 profesionales</div>
              </div>
              <div className="flex gap-1.5">
                <span className="hidden rounded-full bg-surface-2 px-2.5 py-1 text-2xs font-semibold text-ink-2 sm:inline">Semana</span>
                <span className="bg-grad rounded-full px-2.5 py-1 text-2xs font-semibold whitespace-nowrap">+ Nueva cita</span>
              </div>
            </div>

            <div className="grid grid-cols-[34px_repeat(5,minmax(0,1fr))] text-2xs">
              <div />
              {DAYS.map((d, i) => (
                <div key={d} className={cn('pb-2 text-center font-semibold text-muted', i === 2 && 'text-teal-ink')}>
                  {d}
                </div>
              ))}
              <div className="relative col-span-6 grid grid-cols-[34px_repeat(5,minmax(0,1fr))]">
                <div>
                  {HOURS.map((h) => (
                    <div key={h} style={{ height: ROW }} className="pr-1.5 text-right text-[10px] text-muted">
                      {h}
                    </div>
                  ))}
                </div>
                {DAYS.map((d, day) => (
                  <div key={d} className="relative border-l border-line" style={{ height: ROW * HOURS.length }}>
                    {HOURS.map((h, i) => (
                      <div key={h} className="border-t border-line" style={{ height: ROW, borderTopStyle: i ? 'dashed' : 'solid' }} />
                    ))}
                    {BLOCKS.filter((b) => b[0] === day).map(([, start, len, service, client, color]) => (
                      <div
                        key={service + start}
                        className="absolute inset-x-1 overflow-hidden rounded-[7px] px-1.5 py-1 text-white shadow-sm"
                        style={{
                          top: start * ROW + 2,
                          height: len * ROW - 4,
                          backgroundColor: SERVICE_COLORS[color],
                        }}
                      >
                        <div className="truncate text-[10px] leading-tight font-bold">{service}</div>
                        <div className="truncate text-[9.5px] leading-tight opacity-85">{client}</div>
                      </div>
                    ))}
                    {day === 2 && (
                      <div className="absolute inset-x-0 z-10 flex items-center" style={{ top: ROW * 3.4 }}>
                        <span className="size-2 -translate-x-1 rounded-full bg-teal" />
                        <span className="h-[2px] flex-1 bg-teal" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas flotantes */}
      <div className="animate-float absolute top-[52%] -left-3 hidden w-[230px] rounded-card border border-line bg-surface p-3 shadow-pop sm:block lg:-left-14">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-full bg-ok-bg text-ok">
            <Check size={16} strokeWidth={3} />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-bold">Adelanto validado</div>
            <div className="text-2xs text-muted">Yape · S/ 20.00 · Op. 482913</div>
          </div>
        </div>
      </div>

      <div
        className="animate-float absolute -right-3 bottom-[14%] hidden w-[250px] rounded-card border border-line bg-surface p-3 shadow-pop sm:block lg:-right-12"
        style={{ animationDelay: '-3s' }}
      >
        <div className="mb-1.5 flex items-center gap-1.5 text-2xs font-bold text-teal-ink">
          <BellRing size={12} /> WhatsApp · Recordatorio
        </div>
        <div className="rounded-[10px] rounded-tl-[3px] bg-teal-soft px-2.5 py-2 text-2xs leading-snug text-ink">
          Camila, te esperamos mañana a las 4:00 p. m. ¿Necesitas cambiar la hora? Hazlo aquí 👉
        </div>
      </div>

      <div
        className="animate-float absolute -top-6 right-[12%] hidden rounded-card border border-line bg-surface px-3.5 py-2.5 shadow-pop md:block"
        style={{ animationDelay: '-1.5s' }}
      >
        <div className="flex items-center gap-2 text-2xs text-muted">
          <Clock size={12} /> Reserva online · hace 2 min
        </div>
        <div className="text-xs font-bold">Nueva cita: Corte y barba</div>
      </div>
    </div>
  )
}
