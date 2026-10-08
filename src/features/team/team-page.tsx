import { useQuery } from '@tanstack/react-query'
import { Check, ChevronRight, Copy, Mail, RotateCw, UserPlus, Users, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { formatDate } from '@/features/clients/api'
import { useProfessionals } from '@/features/professionals/api'
import { api, errorMessage } from '@/lib/api/client'
import type { Branch, Invitation } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { branchesQueryKey } from '@/lib/auth/branch-context'
import { cn } from '@/lib/cn'
import { memberName, useInvitationActions, useInvitations, useMembers, useRoles } from './api'

function PendingInvitation({ inv, roleName, canManage }: { inv: Invitation; roleName: string; canManage: boolean }) {
  const { resend, revoke } = useInvitationActions()
  const [notice, setNotice] = useState<string | null>(null)
  const busy = resend.isPending || revoke.isPending
  const expired = new Date(inv.expiresAt).getTime() < Date.now()

  const doResend = async () => {
    setNotice(null)
    try {
      const sent = await resend.mutateAsync(inv.id)
      await navigator.clipboard?.writeText(sent.inviteUrl).catch(() => {})
      setNotice(sent.emailSent ? 'Reenviada. Copiamos el enlace nuevo por si quieres mandarlo por WhatsApp.' : 'No se pudo enviar el correo; copiamos el enlace para que lo compartas.')
    } catch (e) {
      setNotice(errorMessage(e))
    }
  }
  const doRevoke = async () => {
    if (!window.confirm(`¿Cancelar la invitación de ${inv.email}? El enlace dejará de funcionar.`)) return
    try {
      await revoke.mutateAsync(inv.id)
    } catch (e) {
      setNotice(errorMessage(e))
    }
  }

  return (
    <li className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-[34px] flex-none place-items-center rounded-full bg-surface-2 text-muted">
          <Mail size={16} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">
            {`${inv.firstName} ${inv.lastName}`.trim()} <span className="font-normal text-muted">· {inv.email}</span>
          </div>
          <div className="text-xs text-muted">
            {roleName} · {expired ? <span className="font-semibold text-bad">Venció</span> : `Vence el ${formatDate(inv.expiresAt)}`}
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button size="sm" onClick={doResend} disabled={busy}>
              <RotateCw size={13} aria-hidden /> Reenviar
            </Button>
            <Button size="sm" variant="ghost" onClick={doRevoke} disabled={busy} aria-label={`Cancelar invitación de ${inv.email}`}>
              <X size={13} aria-hidden /> Cancelar
            </Button>
          </div>
        )}
      </div>
      {notice && (
        <p role="status" className="m-0 flex items-center gap-1.5 pl-[46px] text-xs text-teal-ink">
          <Copy size={12} aria-hidden /> {notice}
        </p>
      )}
    </li>
  )
}

/** Ajustes / Equipo: quiénes tienen acceso, con qué rol, e invitaciones pendientes. */
export function TeamPage() {
  const navigate = useNavigate()
  const { can, readOnly } = useAccess()
  const canManage = can('member.manage') && !readOnly
  const members = useMembers(true)
  const roles = useRoles()
  const invitations = useInvitations()
  const professionals = useProfessionals(can('professional.read'))
  const branches = useQuery({ queryKey: branchesQueryKey, queryFn: () => api<Branch[]>('/branches') })

  const roleName = (ids: string[]) => ids.map((id) => roles.data?.find((r) => r.id === id)?.name).filter(Boolean).join(', ') || '—'
  const branchNames = (ids: string[]) =>
    ids.length === 0 ? 'Todas las sedes' : ids.map((id) => branches.data?.find((b) => b.id === id)?.name).filter(Boolean).join(', ')
  const proOf = (membershipId: string) => professionals.data?.find((p) => p.membershipId === membershipId)

  const list = members.data ?? []
  const pending = invitations.data ?? []
  const active = list.filter((m) => m.status === 'active').length

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-muted">
          {active} {active === 1 ? 'persona con acceso' : 'personas con acceso'}
          {pending.length > 0 && ` · ${pending.length} ${pending.length === 1 ? 'invitación pendiente' : 'invitaciones pendientes'}`}
        </p>
        {canManage && (
          <Button variant="primary" onClick={() => navigate('/equipo/invitar')}>
            <UserPlus size={14} aria-hidden /> Invitar persona
          </Button>
        )}
      </div>

      {pending.length > 0 && (
        <Card>
          <CardHeader title="Invitaciones pendientes" />
          <ul className="m-0 list-none p-0">
            {pending.map((inv) => (
              <PendingInvitation key={inv.id} inv={inv} roleName={roleName(inv.roleIds)} canManage={canManage} />
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title="Miembros" />
        {members.isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : members.isError ? (
          <p className="m-0 text-sm text-bad">{errorMessage(members.error)}</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {list.map((m) => {
              const pro = proOf(m.id)
              return (
                <li key={m.id} className="border-t border-line first:border-t-0">
                  <Link
                    to={`/equipo/${m.id}`}
                    className={cn('-mx-2 flex flex-wrap items-center gap-3 rounded-control px-2 py-3 text-ink hover:bg-surface-2', m.status === 'suspended' && 'opacity-60')}
                  >
                    <Avatar name={memberName(m)} color={pro?.color} round />
                    <div className="min-w-[180px] flex-1">
                      <div className="flex items-center gap-2 font-semibold">
                        {memberName(m)}
                        {m.status === 'suspended' && <Tag tone="off">Suspendido</Tag>}
                      </div>
                      <div className="truncate text-xs text-muted">{m.user?.email}</div>
                    </div>
                    <div className="min-w-[160px] text-sm">
                      <div className="font-semibold">{roleName(m.roleIds)}</div>
                      <div className="truncate text-xs text-muted">{branchNames(m.branchIds)}</div>
                    </div>
                    <div className="hidden w-[150px] text-xs sm:block">
                      {pro ? (
                        <span className="inline-flex items-center gap-1 text-teal-ink">
                          <Check size={13} aria-hidden /> Agenda de {pro.displayName}
                        </span>
                      ) : (
                        <span className="text-muted">Sin agenda propia</span>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-muted" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {list.length === 1 && pending.length === 0 && (
        <Card>
          <EmptyState
            icon={Users}
            title="Por ahora estás solo tú"
            description="Invita a tus profesionales y a recepción. Cada uno entra con su cuenta y ve solo lo que le toca."
            action={
              canManage && (
                <Button variant="primary" size="sm" onClick={() => navigate('/equipo/invitar')}>
                  <UserPlus size={13} aria-hidden /> Invitar persona
                </Button>
              )
            }
          />
        </Card>
      )}
    </>
  )
}
