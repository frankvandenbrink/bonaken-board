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

async function formRequest<T>(url: string, method: string, data: FormData): Promise<T> {
  const res = await fetch(BASE + url, { method, body: data })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Er ging iets mis')
  return json
}

export function useApi() {
  return {
    get: <T>(url: string) => request<T>(url),
    post: <T>(url: string, body: unknown) =>
      request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
    patch: <T>(url: string, body: unknown) =>
      request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
    del: <T>(url: string) =>
      request<T>(url, { method: 'DELETE' }),
    postForm: <T>(url: string, data: FormData) =>
      formRequest<T>(url, 'POST', data),
    patchForm: <T>(url: string, data: FormData) =>
      formRequest<T>(url, 'PATCH', data),
  }
}
