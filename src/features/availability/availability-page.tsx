import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Segmented } from '@/components/ui/controls'
import { Skeleton } from '@/components/ui/display'
import { useAccess } from '@/lib/auth/access'
import { useBranch } from '@/lib/auth/branch-context'
import { useBranchesWithHours } from './api'
import { ExceptionsCard } from './exceptions-card'
import { OpeningHoursCard } from './opening-hours-card'
import { RulesSection } from './rules-section'

/** Ajustes / Disponibilidad (prototipo: S.reglas). */
export function AvailabilityPage() {
  const { can, readOnly } = useAccess()
  const { current } = useBranch()
  const branches = useBranchesWithHours()
  const active = (branches.data ?? []).filter((b) => b.isActive)
  const [branchId, setBranchId] = useState<string | null>(null)
  const branch = active.find((b) => b.id === (branchId ?? current?.id)) ?? active[0]
  const canEditBranches = can('branch.manage') && !readOnly

  return (
    <>
      <p className="m-0 max-w-[75ch] text-muted">
        Estas reglas deciden qué horarios se ofrecen al cliente. Un horario se ofrece solo si la sede está abierta, el
        profesional trabaja y no hay feriado ni ausencia.
      </p>

      <section aria-labelledby="rules-title" className="flex flex-col gap-3">
        <h2 id="rules-title" className="m-0 text-md font-bold">
          Reglas de reserva
        </h2>
        <RulesSection canEdit={can('organization.manage') && !readOnly} />
      </section>

      <section aria-labelledby="hours-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="hours-title" className="m-0 text-md font-bold">
            Horario y feriados por sede
          </h2>
          {active.length > 1 && branch && (
            <Segmented
              aria-label="Sede"
              value={branch.id}
              onValueChange={setBranchId}
              options={active.map((b) => ({ value: b.id, label: b.name }))}
            />
          )}
        </div>
        {branches.isLoading || !branch ? (
          <Skeleton className="h-[360px] rounded-card" />
        ) : branches.isError ? (
          <Card>
            <p className="m-0 text-sm text-bad">No se pudieron cargar las sedes.</p>
          </Card>
        ) : (
          <div className="grid items-start gap-[18px] min-[1440px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <OpeningHoursCard
              key={`hours-${branch.id}`}
              branch={branch}
              branches={active}
              canEdit={canEditBranches}
            />
            <ExceptionsCard key={`exceptions-${branch.id}`} branch={branch} canEdit={canEditBranches} />
          </div>
        )}
      </section>
    </>
  )
}
