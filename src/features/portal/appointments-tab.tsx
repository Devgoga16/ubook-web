import { CalendarX2, History } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { FilterChips, Segmented } from '@/components/ui/controls'
import { EmptyState } from '@/components/ui/display'
import type { PortalAccount, PortalAppointments } from './api'
import { AppointmentItem, BookButton } from './parts'

/** Todas las citas de la cuenta: próximas e historial, filtrables por persona. */
export function AppointmentsTab({ slug, account, appointments }: { slug: string; account: PortalAccount; appointments: PortalAppointments }) {
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming')
  const [person, setPerson] = useState('all')
  const several = account.profiles.length > 1
  const list = appointments[when].filter((a) => person === 'all' || a.clientId === person)

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <Segmented
          aria-label="Cuándo"
          value={when}
          onValueChange={setWhen}
          options={[
            { value: 'upcoming', label: `Próximas · ${appointments.upcoming.length}` },
            { value: 'past', label: 'Historial' },
          ]}
        />
        {several && (
          <FilterChips
            aria-label="Persona"
            value={person}
            onValueChange={setPerson}
            options={[{ value: 'all', label: 'Todos' }, ...account.profiles.map((p) => ({ value: p.id, label: p.firstName }))]}
          />
        )}
        <div className="ml-auto">
          <BookButton slug={slug} forClientId={person === 'all' ? undefined : person} label="Reservar" />
        </div>
      </div>
      {list.length === 0 ? (
        <EmptyState
          icon={when === 'upcoming' ? CalendarX2 : History}
          title={when === 'upcoming' ? 'No hay citas próximas' : 'Aún no hay citas anteriores'}
          description={when === 'upcoming' ? 'Cuando reserves, la cita aparecerá aquí para cambiarla o cancelarla.' : 'Aquí verás tus visitas y podrás repetirlas con un toque.'}
        />
      ) : (
        <ul className="m-0 list-none p-0">
          {list.map((a) => (
            <AppointmentItem key={a.token} a={a} slug={slug} profile={account.profiles.find((p) => p.id === a.clientId)} showPerson={several} />
          ))}
        </ul>
      )}
    </Card>
  )
}
