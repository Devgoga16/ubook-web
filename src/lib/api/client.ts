/**
 * Cliente HTTP de uBook.
 * - El access token vive solo en memoria (no en localStorage).
 * - El refresh token es una cookie httpOnly que maneja el navegador.
 * - Ante un 401 se renueva la sesión una vez y se reintenta la petición.
 */

/**
 * Dónde está la API. Sin VITE_API_URL, en el mismo origen (/api: proxy de Vite o de Vercel).
 * Acepta la URL con o sin /api al final: "https://api.tudominio.com" → "https://api.tudominio.com/api".
 */
export function apiBaseUrl(raw: string | undefined): string {
  const url = raw?.trim().replace(/\/+$/, '')
  if (!url) return '/api'
  return url.endsWith('/api') ? url : `${url}/api`
}

const BASE_URL = apiBaseUrl(import.meta.env.VITE_API_URL)

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: Record<string, unknown>

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }

  /** Errores de validación por campo: `{ 'organization.name': [...] }`. */
  get fields(): Record<string, string[]> {
    return (this.details?.fields as Record<string, string[]> | undefined) ?? {}
  }
}

export interface TokenResponse {
  accessToken: string
  expiresIn: number
  context: { ctx: 'account' | 'staff' | 'platform'; organizationId?: string; membershipId?: string }
}

let accessToken: string | null = null
let refreshing: Promise<TokenResponse | null> | null = null
let onSessionLost: (() => void) | null = null

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token
  },
  /** Se llama cuando la sesión no se puede renovar (el front vuelve al login). */
  onSessionLost: (cb: () => void) => {
    onSessionLost = cb
  },
}

async function parseError(res: Response): Promise<ApiError> {
  let body: { code?: string; message?: string | string[]; details?: Record<string, unknown> } = {}
  try {
    body = await res.json()
  } catch {
    // Respuesta sin JSON (proxy, caída del servidor…).
  }
  const message = Array.isArray(body.message) ? body.message[0] : body.message
  const fallback = res.status >= 500 ? 'Algo salió mal. Intenta de nuevo.' : 'No se pudo completar la acción.'
  return new ApiError(res.status, body.code ?? `HTTP_${res.status}`, message ?? fallback, body.details)
}

/** Renueva el access token con la cookie. Varias llamadas simultáneas comparten la misma. */
export function refreshSession(): Promise<TokenResponse | null> {
  refreshing ??= fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (res) => {
      if (!res.ok) return null
      const data = (await res.json()) as TokenResponse
      accessToken = data.accessToken
      return data
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** No intentar renovar la sesión ante un 401 (login, registro…). */
  skipRefresh?: boolean
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipRefresh, headers, ...init } = options

  // FormData (subida de archivos): el navegador pone el Content-Type con su boundary.
  const isForm = body instanceof FormData
  const send = () =>
    fetch(`${BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !isForm && { 'Content-Type': 'application/json' }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...headers,
      },
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
    })

  let res: Response
  try {
    res = await send()
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'No hay conexión con el servidor.')
  }

  if (res.status === 401 && !skipRefresh && accessToken) {
    const renewed = await refreshSession()
    if (!renewed) {
      accessToken = null
      onSessionLost?.()
      throw await parseError(res)
    }
    res = await send()
  }

  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Enlace de un archivo devuelto por la API: los locales vienen como `/api/files/…`. */
export function fileUrl(url: string): string {
  return url.startsWith('/api/') ? `${BASE_URL}${url.slice(4)}` : url
}

/** Texto para mostrar al usuario a partir de cualquier error. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Demasiados intentos. Espera un minuto e intenta de nuevo.'
    return error.message
  }
  return 'Algo salió mal. Intenta de nuevo.'
}
