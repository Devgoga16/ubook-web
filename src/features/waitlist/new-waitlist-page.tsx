import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Segmented } from '@/components/ui/controls'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { BackLink, FormActions, FormSection } from '@/components/ui/page'
import { ClientPicker } from '@/features/clients/client-picker'
import { useProfessionals } from '@/features/professionals/api'
import { useServices } from '@/features/services/api'
import { errorMessage } from '@/lib/api/client'
import type { Client } from '@/lib/api/types'
import { useBranch } from '@/lib/auth/branch-context'
import { usePageMeta } from '@/lib/page-meta'
import { addDaysYmd, todayLocal } from '@/lib/time'
import { TIME_OF_DAY, useWaitlistActions, type TimeOfDay } from './api'

/** Lista de espera / Agregar: quién, qué y cuándo le sirve. */
export function NewWaitlistPage() {
  const navigate = useNavigate()
  const { current } = useBranch()
  const services = useServices()
  const professionals = useProfessionals()
  const { add } = useWaitlistActions()
  usePageMeta({ title: 'Agregar a la lista de espera', crumb: 'Agenda / Lista de espera / Agregar' })

  const today = todayLocal()
  const [client, setClient] = useState<Client | null>(null)
  const [serviceId, setServiceId] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(addDaysYmd(today, 7))
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('any')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const staff = (professionals.data ?? []).filter((p) => p.isActive && current && p.branchIds.includes(current.id))
  const offered = (services.data ?? []).filter((s) => !s.isArchived && staff.some((p) => p.services.some((x) => x.serviceId === s.id)))
  const doers = staff.filter((p) => p.services.some((x) => x.serviceId === serviceId))

  const submit = async () => {
    setError(null)
    if (!client) return setError('Elige o registra al cliente')
    if (!serviceId) return setError('Elige el servicio')
    if (dateTo < dateFrom) return setError('La fecha final debe ser posterior a la inicial')
    try {
      await add.mutateAsync({
        branchId: current!.id,
        serviceId,
        professionalId: professionalId || undefined,
        clientId: client.id,
        dateFrom,
        dateTo,
        timeOfDay,
        notes: notes.trim() || undefined,
      })
      navigate('/lista-espera')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <>
      <BackLink to="/lista-espera" label="Lista de espera" />
      <Card>
        {error && (
          <div role="alert" className="mb-4 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
            {error}
          </div>
        )}
        <FormSection title="Cliente" description="Búscalo por nombre o celular, o regístralo.">
          <ClientPicker value={client} onChange={setClient} />
        </FormSection>
        <FormSection title="Qué necesita" description={current ? `En ${current.name}.` : undefined}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Servicio">
              {(p) => (
                <Select
                  {...p}
                  value={serviceId}
                  onChange={(e) => {
                    setServiceId(e.target.value)
                    setProfessionalId('')
                  }}
                >
                  <option value="">Elige un servicio</option>
                  {offered.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Profesional">
              {(p) => (
                <Select {...p} value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} disabled={!serviceId}>
                  <option value="">Cualquiera</option>
                  {doers.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.displayName}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </FormSection>
        <FormSection title="Cuándo le sirve" description="Le mostraremos los horarios libres dentro de estas fechas.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Desde">{(p) => <Input {...p} type="date" value={dateFrom} min={today} onChange={(e) => e.target.value && setDateFrom(e.target.value)} />}</Field>
            <Field label="Hasta">{(p) => <Input {...p} type="date" value={dateTo} min={dateFrom} onChange={(e) => e.target.value && setDateTo(e.target.value)} />}</Field>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-2xs font-semibold text-muted">Momento del día</span>
            <Segmented
              aria-label="Momento del día"
              value={timeOfDay}
              onValueChange={setTimeOfDay}
              options={(Object.keys(TIME_OF_DAY) as TimeOfDay[]).map((t) => ({ value: t, label: TIME_OF_DAY[t] }))}
              className="self-start"
            />
          </div>
          <Field label="Nota (opcional)">{(p) => <Textarea {...p} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej.: solo después de las 5 pm" />}</Field>
        </FormSection>
        <FormActions>
          <Button onClick={() => navigate('/lista-espera')}>Cancelar</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={add.isPending}>
            {add.isPending ? 'Guardando…' : 'Agregar a la lista'}
          </Button>
        </FormActions>
      </Card>
    </>
  )
}
