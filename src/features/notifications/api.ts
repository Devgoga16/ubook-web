import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type NotificationType = 'booking_created' | 'booking_pending' | 'deposit_submitted' | 'booking_cancelled' | 'booking_rescheduled' | 'waitlist_joined'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  appointmentId: string | null
  createdAt: string
  read: boolean
}

export interface NotificationFeed {
  unread: number
  items: AppNotification[]
}

const key = ['notifications'] as const

/** Avisos del equipo. Se consultan cada minuto mientras la pestaña está abierta. */
export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: key,
    queryFn: () => api<NotificationFeed>('/notifications'),
    enabled,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<{ unread: 0 }>('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData<NotificationFeed>(key, (prev) => prev && { unread: 0, items: prev.items.map((n) => ({ ...n, read: true })) })
    },
  })
}
