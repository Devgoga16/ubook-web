import { useQuery } from '@tanstack/react-query'
import { Check, Copy, MailCheck, MessageCircle, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { BackLink, FormActions, FormSection } from '@/components/ui/page'
import { useProfessionals } from '@/features/professionals/api'
import { ApiError, api, errorMessage } from '@/lib/api/client'
import type { Branch, InvitationSent } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { useAuth } from '@/lib/auth/auth-context'
import { branchesQueryKey } from '@/lib/auth/branch-context'
import { usePageMeta } from '@/lib/page-meta'
import { BranchPicker, RolePicker } from './access-fields'
import { useInvitationActions, useRoles, whatsappInviteUrl } from './api'

function Sent({ sent, onAnother }: { sent: InvitationSent; onAnother: () => void }) {
  const { me } = useAuth()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard?.writeText(sent.inviteUrl).catch(() => {})
    setCopied(true)
  }
  return (
    <Card className="flex flex-col items-center gap-4 px-6 py-10 text-center">
      <span className={`grid size-14 place-items-center rounded-[16px] ${sent.emailSent ? 'bg-ok-bg text-ok' : 'bg-warn-bg text-warn'}`}>
        {sent.emailSent ? <MailCheck size={26} aria-hidden /> : <TriangleAlert size={26} aria-hidden />}
      </span>
      <div>
        <h2 className="m-0 text-xl font-semibold">{sent.emailSent ? 'Invitación enviada' : 'Invitación creada'}</h2>
        <p className="mt-1 mb-0 max-w-[48ch] text-sm text-muted">
          {sent.emailSent
            ? `Le llegó un correo a ${sent.email}. También puedes mandarle el enlace por WhatsApp.`
            : `No pudimos enviar el correo a ${sent.email}. Mándale este enlace por WhatsApp.`}{' '}
          Vence en 7 días.
        </p>
      </div>
      <div className="flex w-full max-w-[520px] gap-2">
        <Input readOnly value={sent.inviteUrl} aria-label="Enlace de invitación" onFocus={(e) => e.target.select()} className="text-xs" />
        <Button onClick={copy}>
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        <a
          href={whatsappInviteUrl(sent.firstName, me?.organization?.name ?? 'nuestro negocio', sent.inviteUrl)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-control border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold text-ink-2 hover:border-teal"
        >
          <MessageCircle size={14} aria-hidden /> Enviar por WhatsApp
        </a>
        <Button onClick={onAnother}>Invitar a otra persona</Button>
        <Link to="/equipo" className="inline-flex items-center rounded-control px-3.5 py-2 text-sm font-semibold text-brand hover:underline">
          Volver a Equipo
        </Link>
      </div>
    </Card>
  )
}

/** Equipo / Invitar: página completa con datos, rol, sedes y su agenda. */
export function InvitePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { can, isOwner } = useAccess()
  const roles = useRoles()
  const professionals = useProfessionals(can('professional.read'))
  const branches = useQuery({ queryKey: branchesQueryKey, queryFn: () => api<Branch[]>('/branches') })
  const { invite } = useInvitationActions()
  usePageMeta({ title: 'Invitar persona', crumb: 'Ajustes / Equipo / Invitar' })

  const presetPro = params.get('profesional') ?? ''
  const pro = professionals.data?.find((p) => p.id === presetPro)
  const roleByKey = (key: string) => roles.data?.find((r) => r.templateKey === key)?.id ?? ''

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', roleIds: [] as string[], branchIds: [] as string[], professionalId: presetPro })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<InvitationSent | null>(null)

  // Al venir desde un profesional: nombre y rol Profesional por defecto.
  const firstName = form.firstName || (pro && !form.email ? pro.displayName.split(' ')[0]! : form.firstName)
  const roleIds = form.roleIds.length ? form.roleIds : [roleByKey(presetPro ? 'professional' : 'receptionist')].filter(Boolean)
  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, firstName, roleIds, ...patch }))
    setErrors({})
  }

  const activeBranches = (branches.data ?? []).filter((b) => b.isActive)
  const free = (professionals.data ?? []).filter((p) => p.isActive && !p.membershipId)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const next: Record<string, string> = {}
    if (!firstName.trim()) next.firstName = 'Escribe su nombre'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Correo inválido'
    if (!roleIds.length) next.roleIds = 'Elige un rol'
    setErrors(next)
    if (Object.keys(next).length) return
    try {
      setSent(
        await invite.mutateAsync({
          email: form.email.trim(),
          firstName: firstName.trim(),
          lastName: form.lastName.trim() || undefined,
          roleIds,
          branchIds: form.branchIds,
          professionalId: form.professionalId || undefined,
        }),
      )
    } catch (err) {
      setError(errorMessage(err))
      if (err instanceof ApiError && err.code === 'ALREADY_MEMBER') setErrors({ email: 'Ya es parte del equipo' })
    }
  }

  if (sent) {
    return (
      <>
        <BackLink to="/equipo" label="Equipo" />
        <Sent
          sent={sent}
          onAnother={() => {
            setSent(null)
            setForm({ firstName: '', lastName: '', email: '', roleIds: [], branchIds: [], professionalId: '' })
            navigate('/equipo/invitar', { replace: true })
          }}
        />
      </>
    )
  }

  return (
    <>
      <BackLink to="/equipo" label="Equipo" />
      <Card>
        <form noValidate onSubmit={submit} className="flex flex-col">
          {error && (
            <div role="alert" className="mb-4 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
              {error}
            </div>
          )}
          <fieldset disabled={invite.isPending} className="m-0 flex min-w-0 flex-col border-0 p-0">
            <FormSection title="¿A quién invitas?" description="Le llega un correo para crear su acceso.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre" error={errors.firstName}>
                  {(p) => <Input {...p} value={firstName} onChange={(e) => set({ firstName: e.target.value })} autoFocus />}
                </Field>
                <Field label="Apellido (opcional)">{(p) => <Input {...p} value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} />}</Field>
              </div>
              <Field label="Correo" error={errors.email}>
                {(p) => <Input {...p} type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} autoComplete="off" />}
              </Field>
            </FormSection>

            <FormSection title="Rol" description="Define qué puede ver y hacer. Puedes cambiarlo después.">
              {roles.data && <RolePicker roles={roles.data} value={roleIds} onChange={(ids) => set({ roleIds: ids })} canAssignOwner={isOwner} error={errors.roleIds} />}
            </FormSection>

            {activeBranches.length > 1 && (
              <FormSection title="Sedes" description="Dónde trabaja. Recepción solo ve la agenda de sus sedes.">
                <BranchPicker branches={activeBranches} value={form.branchIds} onChange={(ids) => set({ branchIds: ids })} />
              </FormSection>
            )}

            {professionals.data && (free.length > 0 || pro) && (
              <FormSection title="Su agenda" description="Si atiende clientes, vincúlalo a su perfil de profesional para que vea sus citas.">
                <Field label="Perfil de profesional">
                  {(p) => (
                    <Select {...p} value={form.professionalId} onChange={(e) => set({ professionalId: e.target.value })}>
                      <option value="">No atiende clientes</option>
                      {(pro && !free.includes(pro) ? [pro, ...free] : free).map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.displayName}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </FormSection>
            )}

            <FormActions>
              <Button onClick={() => navigate('/equipo')}>Cancelar</Button>
              <Button type="submit" variant="primary">
                {invite.isPending ? 'Enviando…' : 'Enviar invitación'}
              </Button>
            </FormActions>
          </fieldset>
        </form>
      </Card>
    </>
  )
}
