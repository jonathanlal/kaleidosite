import { NextResponse } from 'next/server'
import { getAll } from '@vercel/edge-config'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PatchItem =
  | { operation: 'upsert'; key: string; value: any; description?: string | null }
  | { operation: 'delete'; key: string }

async function patch(items: PatchItem[]) {
  const token = process.env.VERCEL_API_TOKEN
  const configId = process.env.EDGE_CONFIG_ID
  if (!token || !configId) throw new Error('Missing VERCEL_API_TOKEN or EDGE_CONFIG_ID')
  const res = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Edge Config batch failed: ${res.status} ${res.statusText} ${msg}`)
  }
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return unauthorized()
  const url = new URL(req.url)
  const params = url.searchParams
  const dry = params.get('dry') === '1'
  const deleteOld = params.get('delete') !== '0'

  const all = await getAll().catch(() => ({} as Record<string, any>))
  const entries = Object.entries(all)
  const plan: { old: string; next: string }[] = []
  for (const [k] of entries) {
    if (k.includes(':')) {
      plan.push({ old: k, next: k.replace(/:/g, '_') })
    }
  }

  if (dry || plan.length === 0) {
    return NextResponse.json({ ok: true, changed: plan.length, plan })
  }

  // Execute in small chunks
  const chunkSize = 50
  for (let i = 0; i < plan.length; i += chunkSize) {
    const chunk = plan.slice(i, i + chunkSize)
    const items: PatchItem[] = []
    for (const { old, next } of chunk) {
      items.push({ operation: 'upsert', key: next, value: all[old] })
      if (deleteOld) items.push({ operation: 'delete', key: old })
    }
    await patch(items)
  }

  return NextResponse.json({ ok: true, changed: plan.length })
}
