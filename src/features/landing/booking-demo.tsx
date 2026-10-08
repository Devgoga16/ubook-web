import { ArrowLeft, CalendarCheck, Check, ChevronRight, Clock, RotateCcw, User, Wallet } from 'lucide-react'
import { useState } from 'react'
import { SERVICE_COLORS } from '@/features/services/colors'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'

const SERVICES: Array<{ name: string; minutes: number; price: number; pro: string }> = [
  { name: 'Corte clásico', minutes: 30, price: 35, pro: 'Luis' },
  { name: 'Corte y barba', minutes: 50, price: 55, pro: 'Luis' },
  { name: 'Afeitado con toalla caliente', minutes: 30, price: 30, pro: 'Andrés' },
  { name: 'Color y estilo', minutes: 90, price: 120, pro: 'Valeria' },
]

const SLOTS = ['9:00', '9:30', '10:30', '11:00', '12:30', '3:00', '4:00', '5:30']
/** Horarios ocupados por día, para que la demo se sienta real. */
const TAKEN = [[1, 4], [0, 2, 5], [3, 6], [1, 7], [2, 4, 5]]

const dayFmt = new Intl.DateTimeFormat('es-PE', { weekday: 'short' })
const longFmt = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })

type Step = 'service' | 'time' | 'confirm' | 'done'

/** Los próximos 5 días desde mañana, sin domingos. */
function nextOpenDays(): Date[] {
  const out: Date[] = []
  const d = new Date()
  while (out.length < 5) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0) out.push(new Date(d))
  }
  return out
}

/** Demo interactiva de la página de reservas que ve el cliente final. */
export function BookingDemo() {
  const [days] = useState(nextOpenDays)

  const [step, setStep] = useState<Step>('service')
  const [service, setService] = useState(0)
  const [day, setDay] = useState(0)
  const [slot, setSlot] = useState<number | null>(null)
  const s = SERVICES[service]!

  const reset = () => {
    setStep('service')
    setSlot(null)
    setDay(0)
  }

  const back = step === 'time' ? 'service' : step === 'confirm' ? 'time' : null

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div className="absolute -inset-10 glow opacity-70 blur-2xl" aria-hidden />
      {/* Marco del celular */}
      <div className="relative rounded-[42px] border border-line-strong bg-ink/90 p-2.5 dark:bg-surface-2 shadow-[0_30px_70px_-20px_rgb(31_34_69/0.45)]">
        <div className="relative flex h-[600px] flex-col overflow-hidden rounded-[34px] bg-bg">
          <div className="absolute top-2 left-1/2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-ink/90 dark:bg-surface-2" aria-hidden />

          <div className="bg-grad px-5 pt-10 pb-12">
            <div className="flex items-center gap-3">
              {back ? (
                <button
                  type="button"
                  onClick={() => setStep(back)}
                  aria-label="Volver"
                  className="grid size-8 cursor-pointer place-items-center rounded-full bg-white/20 hover:bg-white/30"
                >
                  <ArrowLeft size={15} aria-hidden />
                </button>
              ) : (
                <span className="grid size-10 place-items-center rounded-[12px] bg-white/20 text-md font-bold" aria-hidden>
                  BL
                </span>
              )}
              <div className="min-w-0">
                <div className="truncate text-md font-semibold">Barbería Lima Centro</div>
                <div className="text-2xs opacity-90">Av. Larco 345, Miraflores</div>
              </div>
            </div>
          </div>

          <div className="-mt-7 flex min-h-0 flex-1 flex-col px-3.5 pb-4">
            <div key={step} className="animate-pop flex min-h-0 flex-1 flex-col rounded-card bg-surface p-4 shadow-card">
              {step === 'service' && (
                <>
                  <StepTitle n={1} title="Elige tu servicio" />
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {SERVICES.map((sv, i) => (
                      <li key={sv.name}>
                        <button
                          type="button"
                          onClick={() => {
                            setService(i)
                            setStep('time')
                          }}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-tile border border-line p-2.5 text-left hover:border-teal hover:bg-teal-soft/40"
                        >
                          <span className="h-9 w-1 flex-none rounded-full" style={{ backgroundColor: SERVICE_COLORS[i] }} aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-bold">{sv.name}</span>
                            <span className="text-2xs text-muted">
                              {sv.minutes} min · con {sv.pro}
                            </span>
                          </span>
                          <span className="tabular text-xs font-bold">{formatMoney(sv.price)}</span>
                          <ChevronRight size={14} className="text-muted" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-auto mb-0 pt-3 text-center text-2xs text-muted">Toca un servicio para continuar</p>
                </>
              )}

              {step === 'time' && (
                <>
                  <StepTitle n={2} title="¿Cuándo vienes?" />
                  <div className="mb-3 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Día">
                    {days.map((d, i) => (
                      <button
                        key={d.toISOString()}
                        type="button"
                        role="radio"
                        aria-checked={i === day}
                        onClick={() => {
                          setDay(i)
                          setSlot(null)
                        }}
                        className={cn(
                          'flex cursor-pointer flex-col items-center rounded-tile border border-line py-1.5 text-ink-2',
                          i === day && 'bg-grad border-transparent',
                        )}
                      >
                        <span className="text-[10px] capitalize opacity-80">{dayFmt.format(d).replace('.', '')}</span>
                        <span className="text-md font-bold">{d.getDate()}</span>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Hora">
                    {SLOTS.map((t, i) => {
                      const taken = TAKEN[day]!.includes(i)
                      return (
                        <button
                          key={t}
                          type="button"
                          role="radio"
                          aria-checked={slot === i}
                          disabled={taken}
                          onClick={() => setSlot(i)}
                          className={cn(
                            'tabular cursor-pointer rounded-control border border-line py-2 text-xs font-semibold text-ink-2 hover:border-teal',
                            'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-2 disabled:text-muted disabled:line-through',
                            slot === i && 'border-teal bg-teal-soft text-teal-ink',
                          )}
                        >
                          {t}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-3 mb-0 text-2xs text-muted">Solo verás horarios realmente libres.</p>
                  <button
                    type="button"
                    disabled={slot === null}
                    onClick={() => setStep('confirm')}
                    className="bg-grad mt-auto cursor-pointer rounded-control py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continuar
                  </button>
                </>
              )}

              {step === 'confirm' && slot !== null && (
                <>
                  <StepTitle n={3} title="Revisa tu reserva" />
                  <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-xs">
                    <SummaryRow icon={CalendarCheck} label={s.name} detail={`${s.minutes} min`} />
                    <SummaryRow icon={Clock} label={longFmt.format(days[day]!)} detail={SLOTS[slot]!} />
                    <SummaryRow icon={User} label={`Con ${s.pro}`} detail="Sede Miraflores" />
                  </ul>
                  <div className="mt-3 rounded-tile bg-teal-soft p-3 text-2xs text-teal-ink">
                    <div className="mb-0.5 flex items-center gap-1.5 font-bold">
                      <Wallet size={12} aria-hidden /> Adelanto de {formatMoney(10)} por Yape o Plin
                    </div>
                    Sube la foto de tu comprobante y el negocio confirma tu cita.
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs">
                    <span className="text-muted">Total en el local</span>
                    <b className="tabular text-md">{formatMoney(s.price)}</b>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('done')}
                    className="bg-grad mt-auto cursor-pointer rounded-control py-2.5 text-sm font-semibold"
                  >
                    Reservar ahora
                  </button>
                </>
              )}

              {step === 'done' && slot !== null && (
                <div className="flex flex-1 flex-col items-center text-center">
                  <span className="bg-grad mt-2 grid size-14 place-items-center rounded-full shadow-card">
                    <Check size={28} strokeWidth={3} aria-hidden />
                  </span>
                  <h4 className="mt-3 mb-0.5 text-lg font-bold">¡Listo, reservado!</h4>
                  <p className="m-0 text-2xs text-muted">Cita #UB-1043 · te enviamos los detalles</p>
                  <div className="mt-4 w-full rounded-[12px] rounded-tl-[3px] bg-teal-soft p-3 text-left text-2xs leading-snug">
                    <div className="mb-1 font-bold text-teal-ink">WhatsApp · Barbería Lima Centro</div>
                    ¡Hola! Tu cita de <b>{s.name}</b> quedó para el <b>{longFmt.format(days[day]!)}</b> a las{' '}
                    <b>{SLOTS[slot]}</b> con {s.pro}. Si necesitas cambiarla, usa tu enlace. 💈
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-auto inline-flex cursor-pointer items-center gap-1.5 rounded-control border border-line-strong px-3 py-2 text-xs font-semibold text-ink-2 hover:border-teal"
                  >
                    <RotateCcw size={13} aria-hidden /> Probar otra vez
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="grid size-5 place-items-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">{n}</span>
      <h4 className="m-0 text-sm font-bold">{title}</h4>
      <span className="ml-auto text-2xs text-muted">{n}/3</span>
    </div>
  )
}

function SummaryRow({ icon: Icon, label, detail }: { icon: typeof Clock; label: string; detail: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="grid size-8 flex-none place-items-center rounded-tile bg-surface-2 text-teal-ink">
        <Icon size={14} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate font-semibold first-letter:uppercase">{label}</span>
      <span className="tabular text-muted">{detail}</span>
    </li>
  )
}
