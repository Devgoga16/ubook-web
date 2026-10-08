import { Check, Search, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { ApiError, errorMessage } from '@/lib/api/client'
import type { Client } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { useClientSearch, useCreateClient } from './api'


/** Buscar un cliente por nombre o celular, o registrarlo en el momento. */
export function ClientPicker({ value, onChange }: { value: Client | null; onChange: (c: Client) => void }) {
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' })
  const [error, setError] = useState<string | null>(null)
  const results = useClientSearch(search)
  const create = useCreateClient()

  const [shared, setShared] = useState<string | null>(null)

  const submit = async (allowSharedPhone = false) => {
    setError(null)
    setShared(null)
    if (!form.firstName.trim()) return setError('Escribe el nombre')
    if (form.phone && !/^9\d{8}$/.test(form.phone.replace(/\s/g, ''))) return setError('Celular de 9 dígitos que empiece con 9')
    try {
      const client = await create.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        phone: form.phone ? form.phone.replace(/\s/g, '') : undefined,
        allowSharedPhone,
      })
      onChange(client)
      setCreating(false)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CLIENT_PHONE_TAKEN') setShared((e.details?.name as string) ?? 'otro cliente')
      else setError(errorMessage(e))
    }
  }

  if (creating) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nombre">{(p) => <Input {...p} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoFocus />}</Field>
          <Field label="Apellido">{(p) => <Input {...p} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />}</Field>
          <Field label="Celular">{(p) => <Input {...p} value={form.phone} inputMode="numeric" placeholder="987 654 321" onChange={(e) => setForm({ ...form, phone: e.target.value })} />}</Field>
        </div>
        {error && <p role="alert" className="m-0 text-xs font-semibold text-bad">{error}</p>}
        {shared && (
          <div role="alert" className="flex flex-wrap items-center gap-2 rounded-control bg-warn-bg px-3 py-2 text-xs text-warn">
            <span>
              Ese celular ya es de <b>{shared}</b>. ¿Es la misma persona?
            </span>
            <Button
              size="sm"
              onClick={() => {
                setSearch(form.phone)
                setCreating(false)
                setShared(null)
              }}
            >
              Sí, elegirla
            </Button>
            <Button size="sm" disabled={create.isPending} onClick={() => void submit(true)}>
              No, es otra persona
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={() => setCreating(false)}>Volver a buscar</Button>
          <Button variant="primary" disabled={create.isPending} onClick={() => void submit()}>
            {create.isPending ? 'Guardando…' : 'Guardar cliente'}
          </Button>
        </div>
      </div>
    )
  }

  const list = results.data ?? []
  return (
    <div className="flex flex-col gap-3">
      <label className="relative">
        <span className="sr-only">Buscar cliente</span>
        <Search size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Busca por nombre o celular" className="pl-9" autoFocus />
      </label>
      {error && <p role="alert" className="m-0 text-xs font-semibold text-warn">{error}</p>}
      <ul role="listbox" aria-label="Clientes" className="m-0 flex list-none flex-col gap-1 p-0">
        {list.map((c) => {
          const on = value?.id === c.id
          const name = `${c.firstName} ${c.lastName}`.trim()
          return (
            <li key={c.id}>
              <button
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => onChange(c)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 rounded-[10px] border border-transparent px-2.5 py-2 text-left hover:bg-surface-2',
                  on && 'border-teal bg-teal-soft/50',
                )}
              >
                <Avatar name={name} size="xs" round />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{name}</span>
                  <span className="text-xs text-muted">{c.phone ?? 'Sin celular'}</span>
                </span>
                {on && <Check size={16} className="text-teal-ink" aria-hidden />}
              </button>
            </li>
          )
        })}
        {!results.isLoading && list.length === 0 && (
          <li className="px-2.5 py-3 text-sm text-muted">{search ? 'No encontramos clientes con ese dato.' : 'Aún no tienes clientes.'}</li>
        )}
      </ul>
      <Button
        className="self-start"
        onClick={() => {
          const digits = search.replace(/\D/g, '')
          setForm({ firstName: digits.length >= 6 ? '' : search, lastName: '', phone: digits.length >= 6 ? digits : '' })
          setError(null)
          setCreating(true)
        }}
      >
        <UserPlus size={14} aria-hidden /> Nuevo cliente
      </Button>
    </div>
  )
}
