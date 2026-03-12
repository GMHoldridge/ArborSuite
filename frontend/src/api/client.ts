const API_BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('arbor_token')
}

export function setToken(token: string) {
  localStorage.setItem('arbor_token', token)
}

export function clearToken() {
  localStorage.removeItem('arbor_token')
}

export function hasToken(): boolean {
  return !!getToken()
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Don't set Content-Type for FormData (browser sets boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (resp.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || `HTTP ${resp.status}`)
  }

  return resp.json()
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),
}
