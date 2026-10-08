import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { Invitation, InvitationSent, Member, Role } from '@/lib/api/types'

const membersKey = ['members'] as const
const invitationsKey = ['invitations'] as const

export { useMembers } from '@/features/professionals/api'

export function useRoles(enabled = true) {
  return useQuery({ queryKey: ['roles'], queryFn: () => api<Role[]>('/roles'), enabled, staleTime: 60_000 })
}

export function useInvitations(enabled = true) {
  return useQuery({ queryKey: invitationsKey, queryFn: () => api<Invitation[]>('/invitations'), enabled })
}

export interface InviteInput {
  email: string
  firstName: string
  lastName?: string
  roleIds: string[]
  branchIds: string[]
  professionalId?: string
}

export function useInvitationActions() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: invitationsKey })
  return {
    invite: useMutation({
      mutationFn: (body: InviteInput) => api<InvitationSent>('/invitations', { method: 'POST', body }),
      onSuccess: refresh,
    }),
    resend: useMutation({
      mutationFn: (id: string) => api<InvitationSent>(`/invitations/${id}/resend`, { method: 'POST' }),
      onSuccess: refresh,
    }),
    revoke: useMutation({
      mutationFn: (id: string) => api<void>(`/invitations/${id}`, { method: 'DELETE' }),
      onSuccess: refresh,
    }),
  }
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; roleIds?: string[]; branchIds?: string[]; status?: 'active' | 'suspended' }) =>
      api<Member>(`/members/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey }),
  })
}

/** Qué puede hacer cada rol de plantilla, en palabras simples. */
export const ROLE_HINTS: Record<string, string> = {
  owner: 'Todo, incluida la suscripción.',
  admin: 'Todo el negocio salvo la suscripción.',
  receptionist: 'Agenda, clientes y cobros de sus sedes.',
  professional: 'Solo su agenda, sus clientes y sus fichas.',
}

export const memberName = (m: Pick<Member, 'user'>) => (m.user ? `${m.user.firstName} ${m.user.lastName}`.trim() : 'Usuario')

/** Mensaje listo para mandar por WhatsApp con el enlace de la invitación. */
export function whatsappInviteUrl(firstName: string, organizationName: string, inviteUrl: string): string {
  const text = `Hola ${firstName}, te invité a ${organizationName} en uBook. Crea tu acceso aquí: ${inviteUrl}`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
