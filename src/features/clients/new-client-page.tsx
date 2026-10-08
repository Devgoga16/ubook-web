import { useNavigate } from 'react-router'
import { Card } from '@/components/ui/card'
import { BackLink } from '@/components/ui/page'
import { usePageMeta } from '@/lib/page-meta'
import { useCreateClient } from './api'
import { ClientForm } from './client-form'

export function NewClientPage() {
  const navigate = useNavigate()
  const create = useCreateClient()
  usePageMeta({ title: 'Nuevo cliente', crumb: 'Clientes / Nuevo' })

  return (
    <>
      <BackLink to="/clientes" label="Clientes" />
      <Card>
        <ClientForm
          client={null}
          submitLabel="Crear cliente"
          onCancel={() => navigate('/clientes')}
          onSubmit={async (input) => {
            const client = await create.mutateAsync(input)
            navigate(`/clientes/${client.id}`, { replace: true })
            return client
          }}
        />
      </Card>
    </>
  )
}
