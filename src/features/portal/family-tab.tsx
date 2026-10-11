import { Pencil, Trash2, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Tag } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/display'
import { Field, Input, Select } from '@/components/ui/field'
import { errorMessage } from '@/lib/api/client'
import { RELATIONSHIPS, ageText, fullName, usePortalActions, whenText, type PortalAccount, type PortalAppointments, type PortalProfile } from './api'
import { BookButton } from './parts'

interface PersonForm {
  firstName: string
  lastName: string
  birthDate: string
  documentId: string
  relationship: string
}

const EMPTY: PersonForm = { firstName: '', lastName: '', birthDate: '', documentId: '', relationship: '' }

/** Datos de una persona a cargo. Al editar no se toca el documento (lo valida el negocio). */
function PersonFields({ value, onChange, isNew }: { value: PersonForm; onChange: (next: PersonForm) => void; isNew: boolean }) {
  const set = (patch: Partial<PersonForm>) => onChange({ ...value, ...patch })
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Nombre">{(p) => <Input {...p} value={value.firstName} onChange={(e) => set({ firstName: e.target.value })} autoComplete="off" autoFocus />}</Field>
      <Field label="Apellidos">{(p) => <Input {...p} value={value.lastName} onChange={(e) => set({ lastName: e.target.value })} autoComplete="off" />}</Field>
      <Field label="Parentesco">
        {(p) => (
          <Select {...p} value={value.relationship} onChange={(e) => set({ relationship: e.target.value })}>
            <option value="">Elige…</option>
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r === 'Hijo/a' ? 'Es mi hijo/a' : r === 'Padre/Madre' ? 'Es mi padre o madre' : r === 'Pareja' ? 'Es mi pareja' : r === 'Otro' ? 'Otro' : `Es mi ${r.toLowerCase()}`}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Fecha de nacimiento (opcional)">{(p) => <Input {...p} type="date" value={value.birthDate} onChange={(e) => set({ birthDate: e.target.value })} />}</Field>
      {isNew && (
        <Field label="DNI (opcional)" hint="Ayuda al negocio a no duplicar su ficha.">
          {(p) => <Input {...p} value={value.documentId} onChange={(e) => set({ documentId: e.target.value })} inputMode="numeric" autoComplete="off" />}
        </Field>
      )}
    </div>
  )
}

function DependentCard({ slug, token, profile, nextAppointment }: { slug: string; token: string; profile: PortalProfile; nextAppointment: string | null }) {
  const { updateProfile, removeDependent } = usePortalActions(slug, token)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<PersonForm>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const name = fullName(profile)
  const age = ageText(profile.birthDate)

  const save = async () => {
    setError(null)
    if (!form.firstName.trim()) return setError('Escribe el nombre')
    try {
      await updateProfile.mutateAsync({
        clientId: profile.id,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        birthDate: form.birthDate || null,
        ...(form.relationship && { relationship: form.relationship }),
      })
      setEditing(false)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const remove = async () => {
    if (!window.confirm(`¿Quitar a ${profile.firstName} de tu cuenta? Ya no podrás ver ni reservar sus citas desde aquí.`)) return
    setError(null)
    try {
      await removeDependent.mutateAsync(profile.id)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-[16px] border border-line-strong p-4">
      {editing ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <PersonFields value={form} onChange={setForm} isNew={false} />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Avatar name={name} round />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <b className="truncate font-semibold">{name}</b>
                {profile.relationship && <Tag tone="teal">{profile.relationship}</Tag>}
              </div>
              <div className="text-xs text-muted">
                {age ?? 'Sin fecha de nacimiento'}
                {nextAppointment ? <span className="first-letter:uppercase"> · próxima cita: {nextAppointment}</span> : ' · sin citas próximas'}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <BookButton slug={slug} forClientId={profile.id} label={`Reservar para ${profile.firstName}`} small />
            <Button
              size="sm"
              onClick={() => {
                setForm({ firstName: profile.firstName, lastName: profile.lastName, birthDate: profile.birthDate, documentId: '', relationship: profile.relationship })
                setError(null)
                setEditing(true)
              }}
            >
              <Pencil size={12} aria-hidden /> Editar
            </Button>
            <Button size="sm" variant="danger" disabled={removeDependent.isPending} onClick={() => void remove()}>
              <Trash2 size={12} aria-hidden /> Quitar
            </Button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="m-0 text-xs font-semibold text-bad">
          {error}
        </p>
      )}
    </li>
  )
}

/** Familia: las personas a cargo del titular, a quienes les puede reservar citas. */
export function FamilyTab({ slug, token, account, appointments }: { slug: string; token: string; account: PortalAccount; appointments: PortalAppointments }) {
  const { addDependent } = usePortalActions(slug, token)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<PersonForm>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const dependents = account.profiles.filter((p) => !p.isHolder)
  const canAdd = account.features.guardians

  const submit = async () => {
    setError(null)
    if (!form.firstName.trim()) return setError('Escribe el nombre')
    if (!form.relationship) return setError('Elige el parentesco')
    try {
      await addDependent.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        birthDate: form.birthDate || null,
        relationship: form.relationship,
        ...(form.documentId.trim() && { documentId: form.documentId.trim() }),
      })
      setAdding(false)
      setForm(EMPTY)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Personas a tu cargo"
          actions={
            canAdd && !adding ? (
              <Button variant="primary" onClick={() => (setAdding(true), setError(null))}>
                <UserPlus size={14} aria-hidden /> Agregar persona
              </Button>
            ) : undefined
          }
        />
        <p className="mt-0 mb-4 text-sm text-muted">
          Registra a tus hijos, padres o a quien acompañes, y reserva y gestiona sus citas desde tu cuenta. Los avisos de sus citas te llegan a ti.
        </p>

        {adding && (
          <form
            className="mb-4 flex flex-col gap-3 rounded-[16px] bg-surface-2 p-4"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <b className="text-sm font-semibold">Nueva persona a tu cargo</b>
            <PersonFields value={form} onChange={setForm} isNew />
            {error && (
              <p role="alert" className="m-0 text-sm font-semibold text-bad">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={addDependent.isPending}>
                {addDependent.isPending ? 'Guardando…' : 'Agregar'}
              </Button>
              <Button onClick={() => setAdding(false)}>Cancelar</Button>
            </div>
          </form>
        )}

        {dependents.length === 0 && !adding ? (
          <EmptyState
            icon={Users}
            title="Aún no tienes personas a tu cargo"
            description={canAdd ? 'Agrega a tu familia para reservarles citas sin crearles una cuenta.' : 'Este negocio registra a las personas a cargo desde su local. Pídeselo en tu próxima visita.'}
            action={
              canAdd ? (
                <Button variant="primary" onClick={() => setAdding(true)}>
                  <UserPlus size={14} aria-hidden /> Agregar persona
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0 lg:grid-cols-2">
            {dependents.map((p) => {
              const next = appointments.upcoming.find((a) => a.clientId === p.id)
              return <DependentCard key={p.id} slug={slug} token={token} profile={p} nextAppointment={next ? whenText(next.startsAt) : null} />
            })}
          </ul>
        )}
      </Card>
    </>
  )
}
