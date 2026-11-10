/** Same-origin requests only; the browser supplies Origin and existing Payload session cookies. */
export async function mailRequest<T>(path: string, data?: unknown, key?: string): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    method: data === undefined ? 'GET' : 'POST',
    headers:
      data === undefined
        ? undefined
        : { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data),
  })
  const value = await response.json()
  if (!response.ok) throw new Error(typeof value.error === 'string' ? value.error : 'error')
  return value as T
}
