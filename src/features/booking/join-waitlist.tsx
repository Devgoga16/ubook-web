import { useMutation } from '@tanstack/react-query'
import { BellPlus, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox, Segmented } from '@/components/ui/controls'
import { Field, Input } from '@/components/ui/field'
import { api, errorMessage } from '@/lib/api/client'
import { addDaysYmd, todayLocal } from '@/lib/time'
import { TIME_OF_DAY, type TimeOfDay } from '@/features/waitlist/api'

/** "¿Ningún horario te sirve?": el cliente se anota y el negocio le avisa cuando se libere uno. */
export function JoinWaitlist({ slug, businessName, branchId, serviceId, professionalId }: { slug: string; businessName: string; branchId: string; serviceId: string; professionalId?: string }) {
  const today = todayLocal()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ dateFrom: today, dateTo: addDaysYmd(today, 7), timeOfDay: 'any' as TimeOfDay, firstName: '', lastName: '', phone: '', email: '', accepts: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const join = useMutation({
    mutationFn: () =>
      api<{ ok: true; firstName: string }>(`/public/businesses/${slug}/waitlist`, {
        method: 'POST',
        skipRefresh: true,
        body: {
          branchId,
          serviceId,
          professionalId,
          dateFrom: form.dateFrom,
          dateTo: form.dateTo,
          timeOfDay: form.timeOfDay,
          client: { firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.replace(/\s/g, ''), email: form.email.trim() || undefined },
          acceptsTerms: true,
        },
      }),
  })
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  if (join.isSuccess) {
    return (
      <p className="m-0 flex items-start gap-2 rounded-[12px] bg-ok-bg px-4 py-3 text-sm text-ok">
        <CheckCircle2 size={18} className="mt-0.5 flex-none" aria-hidden />
        <span>
          <b className="font-semibold">¡Listo, {join.data.firstName}!</b> Estás en la lista de espera. {businessName} te avisará apenas se libere un horario que te sirva.
        </span>
      </p>
    )
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex cursor-pointer items-center gap-2 self-start text-sm font-semibold text-brand hover:underline">
        <BellPlus size={15} aria-hidden /> ¿Ningún horario te sirve? Únete a la lista de espera
      </button>
    )
  }

  const submit = () => {
    const next: Record<string, string> = {}
    if (!form.firstName.trim()) next.firstName = 'Escribe tu nombre'
    if (!form.lastName.trim()) next.lastName = 'Escribe tu apellido'
    if (!/^9\d{8}$/.test(form.phone.replace(/\s/g, ''))) next.phone = 'Celular de 9 dígitos que empiece con 9'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Correo inválido'
    if (form.dateTo < form.dateFrom) next.dateTo = 'Debe ser posterior a "Desde"'
    if (!form.accepts) next.accepts = 'Necesitamos tu autorización'
    setErrors(next)
    if (!Object.keys(next).length) join.mutate()
  }

  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-teal-line bg-surface-2/40 p-4">
      <b className="text-sm font-semibold">Lista de espera</b>
      <p className="m-0 text-xs text-muted">Dinos cuándo te sirve y te avisaremos por WhatsApp o correo si se libera un horario.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Desde">{(p) => <Input {...p} type="date" min={today} value={form.dateFrom} onChange={(e) => e.target.value && set({ dateFrom: e.target.value })} />}</Field>
        <Field label="Hasta" error={errors.dateTo}>{(p) => <Input {...p} type="date" min={form.dateFrom} value={form.dateTo} onChange={(e) => e.target.value && set({ dateTo: e.target.value })} />}</Field>
      </div>
      <Segmented
        aria-label="Momento del día"
        value={form.timeOfDay}
        onValueChange={(v) => set({ timeOfDay: v })}
        options={(Object.keys(TIME_OF_DAY) as TimeOfDay[]).map((t) => ({ value: t, label: TIME_OF_DAY[t] }))}
        className="self-start"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" error={errors.firstName}>{(p) => <Input {...p} value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} autoComplete="given-name" />}</Field>
        <Field label="Apellido" error={errors.lastName}>{(p) => <Input {...p} value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} autoComplete="family-name" />}</Field>
        <Field label="Celular" error={errors.phone}>{(p) => <Input {...p} value={form.phone} onChange={(e) => set({ phone: e.target.value })} inputMode="tel" placeholder="987 654 321" />}</Field>
        <Field label="Correo (opcional)" error={errors.email}>{(p) => <Input {...p} type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />}</Field>
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 text-xs">
        <Checkbox checked={form.accepts} onCheckedChange={(v) => set({ accepts: v === true })} className="mt-0.5" />
        <span>
          Autorizo a {businessName} a usar mis datos para avisarme sobre horarios disponibles (Ley N.º 29733).
          {errors.accepts && <span className="block font-semibold text-bad">{errors.accepts}</span>}
        </span>
      </label>
      {join.isError && <p className="m-0 text-sm font-semibold text-bad">{errorMessage(join.error)}</p>}
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button size="sm" variant="primary" disabled={join.isPending} onClick={submit}>
          {join.isPending ? 'Enviando…' : 'Anotarme'}
        </Button>
      </div>
    </div>
  )
}
