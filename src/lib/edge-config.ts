import { get } from '@vercel/edge-config'
import { localGet, localSet } from './local-store'

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

export async function addToHistory(id: string, ts: number = Date.now()): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const configId = process.env.EDGE_CONFIG_ID

  // Get current history
  const currentHistory = await getHistory()

  // Add new entry at the beginning
  const newEntry: SiteIndexEntry = [id, ts]
  const newHistory: SiteIndexEntry[] = [newEntry, ...currentHistory].slice(0, 500) // Keep last 500

  if (!token || !configId) {
    // Save locally
    await localSet('site_index', newHistory)
    console.log('[edge-config] Added to local history:', id)
    return
  }

  // Save to Edge Config
  const body = { items: [{ operation: 'upsert', key: 'site_index', value: newHistory }] }
  const res = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    console.error('[edge-config] Failed to add to history:', res.status)
    // Fallback to local
    await localSet('site_index', newHistory)
  } else {
    console.log('[edge-config] Added to Edge Config history:', id)
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

// Planning system prompt
export async function getPlanningPrompt(): Promise<string | null> {
  try {
    const v = await get<string>('site_config_planning_prompt')
    if (typeof v === 'string' && v.length) return v
  } catch {}
  const local = await localGet<string>('site_config_planning_prompt')
  if (typeof local === 'string' && local.length) return local
  return null
}

export async function setPlanningPrompt(prompt: string): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const configId = process.env.EDGE_CONFIG_ID
  if (!token || !configId) {
    await localSet('site_config_planning_prompt', prompt)
    return
  }
  const body = { items: [{ operation: 'upsert', key: 'site_config_planning_prompt', value: prompt }] }
  const res = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Edge Config set planning prompt failed: ${res.status} ${res.statusText} ${msg}`)
  }
}

// Section generation system prompt
export async function getSectionPrompt(): Promise<string | null> {
  try {
    const v = await get<string>('site_config_section_prompt')
    if (typeof v === 'string' && v.length) return v
  } catch {}
  const local = await localGet<string>('site_config_section_prompt')
  if (typeof local === 'string' && local.length) return local
  return null
}

export async function setSectionPrompt(prompt: string): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const configId = process.env.EDGE_CONFIG_ID
  if (!token || !configId) {
    await localSet('site_config_section_prompt', prompt)
    return
  }
  const body = { items: [{ operation: 'upsert', key: 'site_config_section_prompt', value: prompt }] }
  const res = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Edge Config set section prompt failed: ${res.status} ${res.statusText} ${msg}`)
  }
}