import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2, Search, Unlink, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Segmented } from '@/components/ui/controls'
import { EmptyState, Skeleton } from '@/components/ui/display'
import { Field, Input, Select } from '@/components/ui/field'
import { api, errorMessage } from '@/lib/api/client'
import type { Client } from '@/lib/api/types'
import { ageFrom, formatPhone, fullName, useClientSearch } from './api'

export const RELATIONSHIPS = ['Hijo/a', 'Padre/Madre', 'Pareja', 'Hermano/a', 'Abuelo/a', 'Nieto/a', 'Otro'] as const

export interface FamilyMember {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  birthDate: string | null
  relationship: string
}

export interface ClientFamily {
  guardian: FamilyMember | null
  dependents: FamilyMember[]
}

const familyKey = (id: string) => ['clients', id, 'family'] as const

export function useClientFamily(id: string | undefined) {
  return useQuery({ queryKey: familyKey(id ?? ''), queryFn: () => api<ClientFamily>(`/clients/${id}/family`), enabled: !!id })
}

function useFamilyActions(clientId: string) {
  const qc = useQueryClient()
  // El vínculo cambia la ficha de las dos personas.
  const refresh = () => qc.invalidateQueries({ queryKey: ['clients'] })
  return {
    add: useMutation({
      mutationFn: (body: { clientId?: string; firstName?: string; lastName?: string; birthDate?: string; documentId?: string; relationship?: string }) =>
        api<ClientFamily>(`/clients/${clientId}/dependents`, { method: 'POST', body }),
      onSuccess: refresh,
    }),
    setRelationship: useMutation({
      mutationFn: ({ id, relationship }: { id: string; relationship: string }) => api<ClientFamily>(`/clients/${id}/guardian`, { method: 'PATCH', body: { relationship } }),
      onSuccess: refresh,
    }),
    unlink: useMutation({ mutationFn: (id: string) => api<ClientFamily>(`/clients/${id}/guardian`, { method: 'DELETE' }), onSuccess: refresh }),
  }
}

function RelationshipSelect({ value, onChange, disabled, label }: { value: string; onChange: (v: string) => void; disabled?: boolean; label: string }) {
  return (
    <Select aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="w-[150px]">
      <option value="">Parentesco…</option>
      {RELATIONSHIPS.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </Select>
  )
}

function MemberRow({ member, canEdit, actions, onError }: { member: FamilyMember; canEdit: boolean; actions: ReturnType<typeof useFamilyActions>; onError: (m: string | null) => void }) {
  const name = fullName(member)
  const age = ageFrom(member.birthDate ?? undefined)
  const busy = actions.setRelationship.isPending || actions.unlink.isPending
  const run = (promise: Promise<unknown>) => {
    onError(null)
    promise.catch((e) => onError(errorMessage(e)))
  }
  return (
    <li className="flex flex-wrap items-center gap-3 border-t border-line py-3 first:border-t-0">
      <Avatar name={name} round />
      <div className="min-w-[180px] flex-1">
        <Link to={`/clientes/${member.id}`} className="font-semibold text-ink hover:underline">
          {name}
        </Link>
        <div className="text-xs text-muted">
          {[age !== null ? `${age} años` : null, member.phone ? formatPhone(member.phone) : 'Sin celular propio', member.email].filter(Boolean).join(' · ')}
        </div>
      </div>
      {canEdit ? (
        <>
          <RelationshipSelect label={`Parentesco de ${name}`} value={member.relationship} disabled={busy} onChange={(relationship) => run(actions.setRelationship.mutateAsync({ id: member.id, relationship }))} />
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => window.confirm(`¿Quitar el vínculo con ${name}? Dejará de aparecer en el portal de su responsable. Su ficha y sus citas se conservan.`) && run(actions.unlink.mutateAsync(member.id))}
          >
            <Unlink size={12} aria-hidden /> Quitar vínculo
          </Button>
        </>
      ) : (
        member.relationship && <span className="text-sm text-muted">{member.relationship}</span>
      )}
    </li>
  )
}

/** Formulario para poner a alguien a cargo del cliente: uno que ya existe o uno nuevo. */
function AddDependent({ client, actions, onDone }: { client: Client; actions: ReturnType<typeof useFamilyActions>; onDone: () => void }) {
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<Client | null>(null)
  const [f, setF] = useState({ firstName: '', lastName: client.lastName ?? '', birthDate: '', documentId: '', relationship: '' })
  const [error, setError] = useState<string | null>(null)
  const results = useClientSearch(search)
  const candidates = (results.data ?? []).filter((c) => c.id !== client.id)

  const submit = async () => {
    setError(null)
    try {
      if (mode === 'existing') {
        if (!picked) return setError('Busca y elige al cliente')
        await actions.add.mutateAsync({ clientId: picked.id, relationship: f.relationship || undefined })
      } else {
        if (!f.firstName.trim()) return setError('Escribe el nombre')
        await actions.add.mutateAsync({
          firstName: f.firstName.trim(),
          lastName: f.lastName.trim() || undefined,
          birthDate: f.birthDate || undefined,
          documentId: f.documentId.trim() || undefined,
          relationship: f.relationship || undefined,
        })
      }
      onDone()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <form
      className="mb-4 flex flex-col gap-3 rounded-[14px] bg-surface-2 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <Segmented
        aria-label="Cómo agregar"
        value={mode}
        onValueChange={setMode}
        className="self-start"
        options={[
          { value: 'new', label: 'Registrar persona nueva' },
          { value: 'existing', label: 'Vincular cliente existente' },
        ]}
      />
      {mode === 'new' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre">{(p) => <Input {...p} value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} autoFocus />}</Field>
          <Field label="Apellidos">{(p) => <Input {...p} value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />}</Field>
          <Field label="Fecha de nacimiento (opcional)">{(p) => <Input {...p} type="date" value={f.birthDate} onChange={(e) => setF({ ...f, birthDate: e.target.value })} />}</Field>
          <Field label="DNI (opcional)">{(p) => <Input {...p} value={f.documentId} onChange={(e) => setF({ ...f, documentId: e.target.value })} />}</Field>
        </div>
      ) : picked ? (
        <div className="flex items-center gap-3 rounded-[12px] border border-line bg-surface p-2.5">
          <Avatar name={fullName(picked)} size="xs" round />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{fullName(picked)}</span>
          <Button size="sm" onClick={() => setPicked(null)}>
            Cambiar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="relative">
            <span className="sr-only">Buscar cliente</span>
            <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, celular o DNI" className="pl-8" autoFocus />
          </label>
          {search.trim().length >= 2 && (
            <ul className="m-0 flex max-h-[220px] list-none flex-col overflow-y-auto p-0">
              {candidates.length === 0 && !results.isLoading && <li className="px-1 py-2 text-sm text-muted">Sin resultados.</li>}
              {candidates.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setPicked(c)} className="flex w-full cursor-pointer items-center gap-2.5 rounded-control px-2 py-2 text-left text-sm hover:bg-surface">
                    <Avatar name={fullName(c)} size="xs" round />
                    <span className="min-w-0 flex-1 truncate font-semibold">{fullName(c)}</span>
                    <span className="text-xs text-muted">{formatPhone(c.phone)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <Field label={`¿Qué es de ${client.firstName}?`} className="max-w-[240px]">
        {(p) => (
          <Select {...p} value={f.relationship} onChange={(e) => setF({ ...f, relationship: e.target.value })}>
            <option value="">Sin especificar</option>
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {error && (
        <p role="alert" className="m-0 text-sm font-semibold text-bad">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={actions.add.isPending}>
          {actions.add.isPending ? 'Guardando…' : mode === 'new' ? 'Registrar a su cargo' : 'Vincular'}
        </Button>
        <Button onClick={onDone}>Cancelar</Button>
      </div>
    </form>
  )
}

/** Ficha del cliente / Familia: quién responde por él y a quiénes tiene a su cargo. */
export function ClientFamilyTab({ client, canEdit, enabled }: { client: Client; canEdit: boolean; /** El plan incluye responsables y beneficiarios. */ enabled: boolean }) {
  const family = useClientFamily(client.id)
  const actions = useFamilyActions(client.id)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (family.isLoading) return <Skeleton className="h-[200px] rounded-card" />
  const data = family.data
  if (!data) {
    return (
      <Card>
        <p className="m-0 text-sm text-bad">No se pudo cargar la familia de este cliente.</p>
      </Card>
    )
  }

  const alert = error && (
    <p role="alert" className="mb-3 rounded-control bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">
      {error}
    </p>
  )

  // Quien está a cargo de alguien no puede, a su vez, tener personas a cargo.
  if (data.guardian) {
    return (
      <Card>
        <CardHeader title="Responsable" />
        {alert}
        <p className="mt-0 mb-2 text-sm text-muted">
          {client.firstName} está a cargo de esta persona: ella gestiona sus citas desde el portal y recibe sus avisos cuando {client.firstName} no tiene celular ni correo propios.
        </p>
        <ul className="m-0 list-none p-0">
          <li className="flex flex-wrap items-center gap-3 py-2">
            <Avatar name={fullName(data.guardian)} round />
            <div className="min-w-[180px] flex-1">
              <Link to={`/clientes/${data.guardian.id}`} className="font-semibold text-ink hover:underline">
                {fullName(data.guardian)}
              </Link>
              <div className="text-xs text-muted">{[data.guardian.phone ? formatPhone(data.guardian.phone) : null, data.guardian.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</div>
            </div>
            {canEdit ? (
              <>
                <RelationshipSelect
                  label={`Parentesco de ${client.firstName} con su responsable`}
                  value={data.guardian.relationship}
                  disabled={actions.setRelationship.isPending}
                  onChange={(relationship) => {
                    setError(null)
                    actions.setRelationship.mutateAsync({ id: client.id, relationship }).catch((e) => setError(errorMessage(e)))
                  }}
                />
                <Button
                  size="sm"
                  variant="danger"
                  disabled={actions.unlink.isPending}
                  onClick={() => {
                    if (!window.confirm(`¿Quitar a ${fullName(data.guardian!)} como responsable de ${client.firstName}?`)) return
                    setError(null)
                    actions.unlink.mutateAsync(client.id).catch((e) => setError(errorMessage(e)))
                  }}
                >
                  <Unlink size={12} aria-hidden /> Quitar vínculo
                </Button>
              </>
            ) : (
              data.guardian.relationship && <span className="text-sm text-muted">{data.guardian.relationship}</span>
            )}
          </li>
        </ul>
      </Card>
    )
  }

  const canAdd = canEdit && enabled
  return (
    <Card>
      <CardHeader
        title="Personas a su cargo"
        actions={
          canAdd && !adding ? (
            <Button variant="primary" onClick={() => (setAdding(true), setError(null))}>
              <UserPlus size={14} aria-hidden /> Agregar persona
            </Button>
          ) : undefined
        }
      />
      {alert}
      {adding && <AddDependent client={client} actions={actions} onDone={() => setAdding(false)} />}
      {data.dependents.length === 0 && !adding ? (
        <EmptyState
          icon={Users}
          title={`${client.firstName} no tiene personas a su cargo`}
          description={
            enabled
              ? 'Vincula a sus hijos, padres o a quien acompañe: podrá reservar y gestionar sus citas desde el portal, y recibirá sus avisos.'
              : 'Tu plan no incluye responsables y beneficiarios. Con esa función, un cliente gestiona las citas de su familia desde su cuenta.'
          }
          action={
            canAdd ? (
              <Button variant="primary" onClick={() => setAdding(true)}>
                <Link2 size={14} aria-hidden /> Agregar persona
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="m-0 list-none p-0">
          {data.dependents.map((d) => (
            <MemberRow key={d.id} member={d} canEdit={canEdit} actions={actions} onError={setError} />
          ))}
        </ul>
      )}
    </Card>
  )
}
