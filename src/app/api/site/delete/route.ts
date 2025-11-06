import { NextResponse } from 'next/server'
import { deleteSite } from '@/lib/blob'
import { getHistory } from '@/lib/edge-config'
import { localSet } from '@/lib/local-store'
import { getRedis } from '@/lib/redis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { siteId } = await req.json()
    if (!siteId || typeof siteId !== 'string') {
      return NextResponse.json({ ok: false, error: 'invalid_site_id' }, { status: 400 })
    }

    console.log('[delete-site] Deleting site:', siteId)

    // Delete from blob storage (HTML, JSON, images)
    const deletedCount = await deleteSite(siteId)

    // Remove from history
    const history = await getHistory()
    const newHistory = history.filter(([id]) => id !== siteId)

    const token = process.env.VERCEL_API_TOKEN
    const configId = process.env.EDGE_CONFIG_ID

    if (!token || !configId) {
      await localSet('site_index', newHistory)
    } else {
      const body = { items: [{ operation: 'upsert', key: 'site_index', value: newHistory }] }
      const res = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
      if (!res.ok) {
        console.warn('[delete-site] Failed to update Edge Config, falling back to local')
        await localSet('site_index', newHistory)
      }
    }

    // Remove from pregeneration queue if present
    const redis = getRedis()
    if (redis) {
      try {
        await redis.lrem('pregen_queue', 0, siteId)
        console.log('[delete-site] Removed from pregen queue')
      } catch (err) {
        console.warn('[delete-site] Failed to remove from queue:', err)
      }
    }

    console.log('[delete-site] Successfully deleted site:', siteId, 'blobs deleted:', deletedCount)

    return NextResponse.json({ ok: true, deletedCount })
  } catch (e: any) {
    console.error('[delete-site] Delete failed:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'delete failed' }, { status: 500 })
  }
}
