import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { Card } from '@/components/ui/card'
import { Stepper } from '@/components/ui/display'
import { BackLink } from '@/components/ui/page'
import { api } from '@/lib/api/client'
import type { Branch } from '@/lib/api/types'
import { useAccess } from '@/lib/auth/access'
import { branchesQueryKey } from '@/lib/auth/branch-context'
import { useMembers, useProfessionals } from './api'
import { ProfileForm } from './profile-form'

/** Alta de profesional: primero sus datos; después servicios y horario en su ficha. */
export function NewProfessionalPage() {
  const navigate = useNavigate()
  const { can } = useAccess()
  const branches = useQuery({ queryKey: branchesQueryKey, queryFn: () => api<Branch[]>('/branches') })
  const members = useMembers(can('member.read'))
  const professionals = useProfessionals()

  return (
    <>
      <BackLink to="/profesionales" label="Profesionales" />
      <Stepper steps={['Datos', 'Servicios', 'Horario']} current={0} />
      <Card className="p-6">
        {branches.data && (
          <ProfileForm
            professional={null}
            branches={branches.data.filter((b) => b.isActive)}
            members={members.data ?? (can('member.read') ? [] : null)}
            takenMemberships={(professionals.data ?? []).map((p) => p.membershipId).filter((m): m is string => !!m)}
            onSaved={(p) => navigate(`/profesionales/${p.id}?tab=servicios`, { replace: true })}
            onCancel={() => navigate('/profesionales')}
          />
        )}
      </Card>
    </>
  )
}
