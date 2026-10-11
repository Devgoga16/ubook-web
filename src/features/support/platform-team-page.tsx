import { Check, Copy, MailCheck, Send, TriangleAlert, UserPlus, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState, Skeleton, Table, Td, Th } from '@/components/ui/display'
import { Field, Input, Select } from '@/components/ui/field'
import { formatDate } from '@/features/clients/api'
import { ApiError, errorMessage } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/auth-context'
import { ROLE_LABEL, usePlatformTeam, usePlatformTeamActions, type PlatformInvite, type PlatformRole, type PlatformTeamMember } from './api'

const ROLE_HELP: Record<PlatformRole, string> = {
  support: 'Atiende tickets, consulta negocios y pagos, y puede ver un negocio en solo lectura. No cambia planes, no aprueba pagos, no suspende ni elimina negocios.',
  super_admin: 'Acceso total a la plataforma, incluido este equipo.',
}

/** Enlace de invitación, para pasarlo a mano si el correo no llega. */
function InviteLink({ invite, email, onClose }: { invite: PlatformInvite; email: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard?.writeText(invite.inviteUrl).catch(() => {})
    setCopied(true)
  }
  return (
    <div className={`flex flex-col gap-2.5 rounded-[12px] px-3.5 py-3 ${invite.emailSent ? 'bg-ok-bg' : 'bg-warn-bg'}`}>
      <div className={`flex items-center gap-2 text-sm font-semibold ${invite.emailSent ? 'text-ok' : 'text-warn'}`}>
        {invite.emailSent ? <MailCheck size={16} aria-hidden /> : <TriangleAlert size={16} aria-hidden />}
        {invite.emailSent ? `Invitación enviada a ${email}` : `No pudimos enviar el correo a ${email}`}
      </div>
      <p className="m-0 text-xs text-ink-2">
        Con este enlace crea su contraseña. Vence el {formatDate(invite.expiresAt)} y sirve una sola vez{invite.emailSent ? '; también puedes pasárselo tú.' : '. Pásaselo por WhatsApp o como prefieras.'}
      </p>
      <div className="flex gap-2">
        <Input readOnly value={invite.inviteUrl} aria-label="Enlace de invitación" onFocus={(e) => e.target.select()} className="text-xs" />
        <Button onClick={() => void copy()}>
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? 'Copiado' : 'Copiar'}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Listo
        </Button>
      </div>
    </div>
  )
}

function InviteForm({ onInvited }: { onInvited: (invite: PlatformInvite, email: string) => void }) {
  const { invite } = usePlatformTeamActions()
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', role: 'support' as PlatformRole })
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string[]>>({})

  const submit = async () => {
    setError(null)
    setFields({})
    if (!f.firstName.trim() || !f.lastName.trim() || !f.email.trim()) return setError('Completa nombre, apellidos y correo')
    try {
      const email = f.email.trim().toLowerCase()
      const sent = await invite.mutateAsync({ firstName: f.firstName.trim(), lastName: f.lastName.trim(), email, role: f.role })
      setF({ firstName: '', lastName: '', email: '', role: 'support' })
      onInvited(sent, email)
    } catch (e) {
      if (e instanceof ApiError) setFields(e.fields)
      setError(errorMessage(e))
    }
  }

  return (
    <Card>
      <CardHeader title="Invitar a una persona" />
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Nombre">{(p) => <Input {...p} value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} autoComplete="off" />}</Field>
          <Field label="Apellidos">{(p) => <Input {...p} value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} autoComplete="off" />}</Field>
          <Field label="Correo" error={fields.email?.[0]}>
            {(p) => <Input {...p} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="nombre@unifytec.com" autoComplete="off" />}
          </Field>
          <Field label="Rol">
            {(p) => (
              <Select {...p} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as PlatformRole })}>
                <option value="support">{ROLE_LABEL.support}</option>
                <option value="super_admin">{ROLE_LABEL.super_admin}</option>
              </Select>
            )}
          </Field>
        </div>
        <p className="m-0 text-xs text-muted">
          <b className="font-semibold text-ink-2">{ROLE_LABEL[f.role]}:</b> {ROLE_HELP[f.role]}
        </p>
        {error && (
          <p role="alert" className="m-0 text-sm font-semibold text-bad">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" variant="primary" disabled={invite.isPending}>
            <UserPlus size={14} aria-hidden /> {invite.isPending ? 'Enviando…' : 'Enviar invitación'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function MemberRow({ m, isMe, onInvite, onError }: { m: PlatformTeamMember; isMe: boolean; onInvite: (invite: PlatformInvite, email: string) => void; onError: (message: string | null) => void }) {
  const { update, resend, remove } = usePlatformTeamActions()
  const name = `${m.firstName} ${m.lastName}`.trim()
  const busy = update.isPending || resend.isPending || remove.isPending
  const run = async (fn: () => Promise<unknown>) => {
    onError(null)
    try {
      await fn()
    } catch (e) {
      onError(errorMessage(e))
    }
  }

  return (
    <tr className={m.isActive ? undefined : 'opacity-60'}>
      <Td>
        <div className="flex items-center gap-2.5">
          <Avatar name={name} size="xs" round />
          <div>
            <div className="font-semibold">
              {name} {isMe && <span className="font-normal text-muted">(tú)</span>}
            </div>
            <div className="text-xs text-muted">{m.email}</div>
          </div>
        </div>
      </Td>
      <Td>
        {isMe || !m.isActive ? (
          ROLE_LABEL[m.platformRole]
        ) : (
          <Select
            aria-label={`Rol de ${name}`}
            value={m.platformRole}
            disabled={busy}
            onChange={(e) => {
              const role = e.target.value as PlatformRole
              if (role === 'super_admin' && !window.confirm(`¿Dar acceso total de super admin a ${name}?`)) return
              void run(() => update.mutateAsync({ id: m.id, role }))
            }}
            className="w-[150px]"
          >
            <option value="support">{ROLE_LABEL.support}</option>
            <option value="super_admin">{ROLE_LABEL.super_admin}</option>
          </Select>
        )}
      </Td>
      <Td>{!m.isActive ? <Tag tone="off">Sin acceso</Tag> : m.pending ? <Tag tone="warn">Invitación pendiente</Tag> : <Tag tone="ok">Activo</Tag>}</Td>
      <Td className="text-muted">{m.lastLoginAt ? formatDate(m.lastLoginAt) : '—'}</Td>
      <Td>
        <div className="flex justify-end gap-2">
          {m.pending && m.isActive && (
            <>
              <Button size="sm" disabled={busy} onClick={() => void run(async () => onInvite(await resend.mutateAsync(m.id), m.email))}>
                <Send size={12} aria-hidden /> Reenviar
              </Button>
              <Button size="sm" variant="danger" disabled={busy} onClick={() => window.confirm(`¿Cancelar la invitación de ${name}?`) && void run(() => remove.mutateAsync(m.id))}>
                Cancelar
              </Button>
            </>
          )}
          {!m.pending && !isMe && m.isActive && (
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={() => window.confirm(`¿Quitar el acceso a ${name}? Se cierran sus sesiones al instante. Sus tickets y respuestas se conservan.`) && void run(() => update.mutateAsync({ id: m.id, isActive: false }))}
            >
              Quitar acceso
            </Button>
          )}
          {!m.isActive && (
            <Button size="sm" disabled={busy} onClick={() => void run(() => update.mutateAsync({ id: m.id, isActive: true }))}>
              Devolver acceso
            </Button>
          )}
        </div>
      </Td>
    </tr>
  )
}

/** Equipo de plataforma: quién atiende soporte y quién administra uBook. */
export function PlatformTeamPage() {
  const { me } = useAuth()
  const team = usePlatformTeam()
  const [invite, setInvite] = useState<{ invite: PlatformInvite; email: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const members = team.data ?? []

  return (
    <>
      <InviteForm onInvited={(i, email) => setInvite({ invite: i, email })} />
      {invite && <InviteLink invite={invite.invite} email={invite.email} onClose={() => setInvite(null)} />}

      <Card>
        <CardHeader title="Equipo de plataforma" />
        {error && (
          <p role="alert" className="mb-3 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
            {error}
          </p>
        )}
        {team.isError ? (
          <p className="m-0 text-sm text-bad">No se pudo cargar el equipo.</p>
        ) : team.isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <EmptyState icon={UsersRound} title="Aún no hay equipo" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Persona</Th>
                <Th>Rol</Th>
                <Th>Estado</Th>
                <Th>Último ingreso</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <MemberRow key={m.id} m={m} isMe={m.id === me?.user.id} onInvite={(i, email) => setInvite({ invite: i, email })} onError={setError} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
