import { useQuery } from '@tanstack/react-query'
import { Ban, CalendarDays, RotateCcw, UserX } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { BackLink, FormActions, FormSection } from '@/components/ui/page'
import { formatDate } from '@/features/clients/api'
import { useProfessionals } from '@/features/professionals/api'
import { api, errorMessage } from '@/lib/api/client'
import type { Branch, Member, Role } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { useAuth } from '@/lib/auth/auth-context'
import { branchesQueryKey } from '@/lib/auth/branch-context'
import { usePageMeta } from '@/lib/page-meta'
import { BranchPicker, RolePicker } from './access-fields'
import { memberName, useMembers, useRoles, useUpdateMember } from './api'

function MemberForm({ member, roles, branches, isMe }: { member: Member; roles: Role[]; branches: Branch[]; isMe: boolean }) {
  const { can, isOwner, readOnly } = useAccess()
  const update = useUpdateMember()
  const [roleIds, setRoleIds] = useState(member.roleIds)
  const [branchIds, setBranchIds] = useState(member.branchIds)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const isOwnerMember = roles.some((r) => r.templateKey === 'owner' && member.roleIds.includes(r.id))
  // Solo un Dueño cambia a otro Dueño.
  const editable = can('member.manage') && !readOnly && (!isOwnerMember || isOwner)
  const dirty = [...roleIds].sort().join() !== [...member.roleIds].sort().join() || branchIds.join() !== member.branchIds.join()
  const suspended = member.status === 'suspended'

  const run = async (body: Parameters<typeof update.mutateAsync>[0]) => {
    setError(null)
    setSaved(false)
    try {
      await update.mutateAsync(body)
      setSaved(true)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Card>
      {error && (
        <div role="alert" className="mb-4 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
          {error}
        </div>
      )}
      <fieldset disabled={!editable || update.isPending} className="m-0 flex min-w-0 flex-col border-0 p-0">
        <FormSection title="Rol" description="Qué puede ver y hacer en el negocio.">
          <RolePicker roles={roles} value={roleIds} onChange={setRoleIds} canAssignOwner={isOwner} />
        </FormSection>
        {branches.length > 1 && (
          <FormSection title="Sedes" description="Dónde trabaja.">
            <BranchPicker branches={branches} value={branchIds} onChange={setBranchIds} />
          </FormSection>
        )}
        {!isMe && (
          <FormSection
            title={suspended ? 'Acceso suspendido' : 'Suspender acceso'}
            description={suspended ? 'No puede entrar a este negocio. Su historial se conserva.' : 'Deja de poder entrar de inmediato. Sus citas y fichas se conservan.'}
          >
            <div>
              {suspended ? (
                <Button onClick={() => run({ id: member.id, status: 'active' })}>
                  <RotateCcw size={14} aria-hidden /> Reactivar acceso
                </Button>
              ) : (
                <Button
                  variant="danger"
                  onClick={() => window.confirm(`¿Suspender el acceso de ${memberName(member)}?`) && run({ id: member.id, status: 'suspended' })}
                >
                  <Ban size={14} aria-hidden /> Suspender acceso
                </Button>
              )}
            </div>
          </FormSection>
        )}
        {editable && (
          <FormActions hint={saved && !dirty ? 'Cambios guardados' : isMe ? 'Si te quitas permisos, los perderás al guardar.' : undefined}>
            <Button variant="primary" disabled={!dirty || roleIds.length === 0} onClick={() => run({ id: member.id, roleIds, branchIds })}>
              {update.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </FormActions>
        )}
      </fieldset>
    </Card>
  )
}

/** Equipo / miembro: su rol, sedes, agenda vinculada y suspensión. */
export function MemberPage() {
  const { id } = useParams<{ id: string }>()
  const { can } = useAccess()
  const myMembershipId = useAuth().me?.access?.membershipId
  const members = useMembers(true)
  const roles = useRoles()
  const professionals = useProfessionals(can('professional.read'))
  const branches = useQuery({ queryKey: branchesQueryKey, queryFn: () => api<Branch[]>('/branches') })
  const member = members.data?.find((m) => m.id === id)
  usePageMeta(member ? { title: memberName(member), crumb: `Ajustes / Equipo / ${memberName(member)}` } : null)

  if (members.isLoading || roles.isLoading) return <Skeleton className="h-[320px] rounded-card" />
  if (!member || !roles.data) {
    return (
      <Card>
        <EmptyState
          icon={UserX}
          title="No encontramos a esta persona"
          action={
            <Link to="/equipo" className="text-sm font-semibold text-brand hover:underline">
              Volver a Equipo
            </Link>
          }
        />
      </Card>
    )
  }

  const pro = professionals.data?.find((p) => p.membershipId === member.id)
  const isMe = member.id === myMembershipId

  return (
    <>
      <BackLink to="/equipo" label="Equipo" />
      <Card className="flex flex-wrap items-center gap-5 p-6">
        <Avatar name={memberName(member)} color={pro?.color} size="lg" round className="size-16 text-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-xl font-semibold">{memberName(member)}</h2>
            {isMe && <Tag tone="brand">Tú</Tag>}
            {member.status === 'suspended' ? <Tag tone="off">Suspendido</Tag> : <Tag tone="ok">Activo</Tag>}
          </div>
          <div className="mt-1 text-sm text-muted">
            {member.user?.email} · En el equipo desde {formatDate(member.createdAt)}
          </div>
        </div>
        {pro ? (
          <Link
            to={`/profesionales/${pro.id}`}
            className="inline-flex items-center gap-1.5 rounded-control border border-line-strong px-3.5 py-2 text-sm font-semibold text-ink-2 hover:border-teal"
          >
            <CalendarDays size={14} aria-hidden /> Agenda de {pro.displayName}
          </Link>
        ) : (
          <span className="text-xs text-muted">Sin agenda propia · se vincula desde el perfil del profesional</span>
        )}
      </Card>
      <MemberForm
        key={`${member.id}-${member.status}`}
        member={member}
        roles={roles.data}
        branches={(branches.data ?? []).filter((b) => b.isActive)}
        isMe={isMe}
      />
    </>
  )
}
