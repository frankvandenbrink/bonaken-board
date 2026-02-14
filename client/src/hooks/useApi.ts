const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Er ging iets mis')
  return data
}

export function useApi() {
  return {
    get: <T>(url: string) => request<T>(url),
    post: <T>(url: string, body: unknown) =>
      request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
    patch: <T>(url: string, body: unknown) =>
      request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  }
}
