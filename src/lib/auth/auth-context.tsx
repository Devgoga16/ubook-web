import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, refreshSession, tokenStore, type TokenResponse } from '../api/client'
import type { Me } from '../api/types'

export interface RegisterInput {
  firstName: string
  lastName: string
  email: string
  phone?: string
  password: string
  organization: { name: string; businessType?: string; planCode?: string; timezone?: string; ownerAttends?: boolean }
}

export interface CreateOrganizationInput {
  name: string
  businessType?: string
  planCode?: string
}

type Status = 'loading' | 'anonymous' | 'authenticated'

interface AuthContextValue {
  status: Status
  me: Me | null
  login: (email: string, password: string) => Promise<Me>
  register: (input: RegisterInput) => Promise<Me>
  logout: () => Promise<void>
  switchOrganization: (organizationId: string) => Promise<Me>
  createOrganization: (input: CreateOrganizationInput) => Promise<Me>
  acceptInvitation: (input: { token: string; password: string; firstName?: string; lastName?: string }) => Promise<Me>
  reload: () => Promise<Me>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<Status>('loading')
  const [me, setMe] = useState<Me | null>(null)

  const clear = useCallback(() => {
    tokenStore.set(null)
    setMe(null)
    setStatus('anonymous')
    queryClient.clear()
  }, [queryClient])

  const loadMe = useCallback(async () => {
    const data = await api<Me>('/auth/me')
    setMe(data)
    setStatus('authenticated')
    return data
  }, [])

  /** Guarda el token nuevo y recarga el contexto. Los datos del negocio anterior se descartan. */
  const startSession = useCallback(
    async (res: TokenResponse) => {
      tokenStore.set(res.accessToken)
      queryClient.clear()
      return loadMe()
    },
    [loadMe, queryClient],
  )

  useEffect(() => {
    tokenStore.onSessionLost(clear)
    let cancelled = false
    void refreshSession().then(async (res) => {
      if (cancelled) return
      // Sin sesión al abrir: no hay datos privados que borrar, y vaciar la caché
      // cortaría las consultas públicas en curso (página de reservas).
      if (!res) {
        setMe(null)
        setStatus('anonymous')
        return
      }
      try {
        await loadMe()
      } catch {
        clear()
      }
    })
    return () => {
      cancelled = true
    }
  }, [clear, loadMe])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      me,
      login: async (email, password) =>
        startSession(await api<TokenResponse>('/auth/login', { method: 'POST', body: { email, password }, skipRefresh: true })),
      register: async (input) =>
        startSession(await api<TokenResponse>('/auth/register', { method: 'POST', body: input, skipRefresh: true })),
      logout: async () => {
        try {
          await api('/auth/logout', { method: 'POST', skipRefresh: true })
        } finally {
          clear()
        }
      },
      switchOrganization: async (organizationId) =>
        startSession(await api<TokenResponse>('/auth/switch-organization', { method: 'POST', body: { organizationId } })),
      createOrganization: async (input) =>
        startSession(await api<TokenResponse>('/auth/organizations', { method: 'POST', body: input })),
      acceptInvitation: async (input) =>
        startSession(await api<TokenResponse>('/auth/accept-invitation', { method: 'POST', body: input, skipRefresh: true })),
      reload: loadMe,
    }),
    [status, me, startSession, clear, loadMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fuera de AuthProvider')
  return ctx
}
