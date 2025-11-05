import { get } from '@vercel/edge-config'
import { localGet, localSet } from './local-store'

export async function getHtmlById(id: string): Promise<string | null> {
  if (!id) return null
  try {
    const key = `site_${id}`
    const value = await get<string>(key)
    return typeof value === 'string' ? value : null
  } catch {
    // Fallback to local
    return (await localGet<string>(`site_${id}`)) ?? null
  }
}

export async function saveHtmlById(id: string, html: string): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const configId = process.env.EDGE_CONFIG_ID
  if (!token || !configId) {
    // Local fallback
    await localSet(`site_${id}`, html)
    return
  }

  const body = {
    items: [
      {
        operation: 'upsert',
        key: `site_${id}`,
        // Store as plain string to keep it a single-file HTML document
        value: html,
        description: `Generated at ${new Date().toISOString()}`,
      },
    ],
  }

  try {
    const res = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // Writes must happen in Node.js runtime, not Edge
      cache: 'no-store',
    })

    if (!res.ok) {
      const msg = await res.text()
      throw new Error(`Edge Config write failed: ${res.status} ${res.statusText} ${msg}`)
    }
  } catch (err) {
    console.error('[edge-config] saveHtmlById fallback', err)
    await localSet(`site_${id}`, html)
  }
}

export async function setLatest(id: string, html: string, ts: number = Date.now()): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const configId = process.env.EDGE_CONFIG_ID
  if (!token || !configId) throw new Error('Missing VERCEL_API_TOKEN or EDGE_CONFIG_ID')
  const body = {
    items: [
      { operation: 'upsert', key: 'site_latest_id', value: id },
      { operation: 'upsert', key: 'site_latest_html', value: html },
      { operation: 'upsert', key: 'site_latest_ts', value: ts },
    ],
  }
  const res = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Edge Config latest write failed: ${res.status} ${res.statusText} ${msg}`)
  }
}

export async function getLatestHtml(): Promise<string | null> {
  try {
    const value = await get<string>('site_latest_html')
    return typeof value === 'string' ? value : null
  } catch {
    return (await localGet<string>('site_latest_html')) ?? null
  }
}

export async function getLatestId(): Promise<string | null> {
  try {
    const value = await get<string>('site_latest_id')
    return typeof value === 'string' ? value : null
  } catch {
    return (await localGet<string>('site_latest_id')) ?? null
  }
}

export async function getLatestTs(): Promise<number | null> {
  try {
    const value = await get<number>('site_latest_ts')
    return typeof value === 'number' ? value : null
  } catch {
    const v = await localGet<number>('site_latest_ts')
    return typeof v === 'number' ? v : null
  }
}

export async function getLatestMetaValue<T = any>(): Promise<T | null> {
  try {
    const value = await get<T>('site_latest_meta')
    return (value as any) ?? null
  } catch {
    const v = await localGet<T>('site_latest_meta')
    return (v as any) ?? null
  }
}

export type SiteIndexEntry = [id: string, ts: number]

export async function getHistory(): Promise<SiteIndexEntry[]> {
  try {
    const arr = await get<SiteIndexEntry[]>('site_index')
    if (!Array.isArray(arr)) return []
    return arr.filter((x) => Array.isArray(x) && x.length === 2 && typeof x[0] === 'string' && typeof x[1] === 'number')
  } catch {
    return (await localGet<SiteIndexEntry[]>('site_index')) ?? []
  }
}

export async function setLatestMeta(meta: Record<string, any>): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const configId = process.env.EDGE_CONFIG_ID
  if (!token || !configId) throw new Error('Missing VERCEL_API_TOKEN or EDGE_CONFIG_ID')
  const body = { items: [{ operation: 'upsert', key: 'site_latest_meta', value: meta }] }
  const res = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Edge Config meta write failed: ${res.status} ${res.statusText} ${msg}`)
  }
}

export async function getRateLimit(): Promise<number | null> {
  try {
    const v = await get<number>('site_config_gen_per_min')
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v
    return null
  } catch {
    const v = await localGet<number>('site_config_gen_per_min')
    return typeof v === 'number' && v > 0 ? v : null
  }
}

export async function setRateLimit(limit: number): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const configId = process.env.EDGE_CONFIG_ID
  if (!token || !configId) {
    await localSet('site_config_gen_per_min', limit)
    return
  }
  const body = { items: [{ operation: 'upsert', key: 'site_config_gen_per_min', value: limit }] }
  const res = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Edge Config set rate limit failed: ${res.status} ${res.statusText} ${msg}`)
  }
}

export async function appendHistory(id: string, ts: number): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const configId = process.env.EDGE_CONFIG_ID
  if (!token || !configId) throw new Error('Missing VERCEL_API_TOKEN or EDGE_CONFIG_ID')

  // Read current history via read endpoint
  let history: SiteIndexEntry[] = []
  try {
    const h = await get<SiteIndexEntry[]>('site_index')
    if (Array.isArray(h)) history = h as SiteIndexEntry[]
  } catch {}

  const next = [[id, ts] as SiteIndexEntry, ...history].slice(0, 200)

  const body = { items: [{ operation: 'upsert', key: 'site_index', value: next }] }
  const res = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Edge Config history write failed: ${res.status} ${res.statusText} ${msg}`)
  }
}

export async function setLatestLocal(id: string, html: string, ts: number) {
  await localSet('site_latest_id', id)
  await localSet('site_latest_html', html)
  await localSet('site_latest_ts', ts)
}

export async function setLatestMetaLocal(meta: Record<string, any>) {
  await localSet('site_latest_meta', meta)
}

export async function appendHistoryLocal(id: string, ts: number) {
  const cur = (await localGet<SiteIndexEntry[]>('site_index')) ?? []
  const next = [[id, ts], ...cur].slice(0, 200)
  await localSet('site_index', next)
}

export async function getModel(): Promise<string | null> {
  try {
    const v = await get<string>('site_config_model')
    if (typeof v === 'string' && v.length) return v
  } catch {}
  const local = await localGet<string>('site_config_model')
  if (typeof local === 'string' && local.length) return local
  return process.env.OPENAI_MODEL || null
}

export async function setModel(model: string): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const configId = process.env.EDGE_CONFIG_ID
  if (!token || !configId) {
    await localSet('site_config_model', model)
    return
  }
  const body = { items: [{ operation: 'upsert', key: 'site_config_model', value: model }] }
  const res = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Edge Config set model failed: ${res.status} ${res.statusText} ${msg}`)
  }
}

export async function getIncludeImage(): Promise<boolean | null> {
  try {
    const v = await get<boolean>('site_config_include_image')
    if (typeof v === 'boolean') return v
  } catch {}
  const local = await localGet<boolean>('site_config_include_image')
  if (typeof local === 'boolean') return local
  return null
}

export async function setIncludeImage(value: boolean): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const configId = process.env.EDGE_CONFIG_ID
  if (!token || !configId) {
    await localSet('site_config_include_image', value)
    return
  }
  const body = { items: [{ operation: 'upsert', key: 'site_config_include_image', value }] }
  const res = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Edge Config set include image failed: ${res.status} ${res.statusText} ${msg}`)
  }
}

export async function getImagePrompt(): Promise<string | null> {
  try {
    const v = await get<string>('site_config_image_prompt')
    if (typeof v === 'string' && v.length) return v
  } catch {}
  const local = await localGet<string>('site_config_image_prompt')
  if (typeof local === 'string' && local.length) return local
  return null
}

export async function setImagePrompt(prompt: string): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const configId = process.env.EDGE_CONFIG_ID
  if (!token || !configId) {
    await localSet('site_config_image_prompt', prompt)
    return
  }
  const body = { items: [{ operation: 'upsert', key: 'site_config_image_prompt', value: prompt }] }
  const res = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Edge Config set image prompt failed: ${res.status} ${res.statusText} ${msg}`)
  }
}
