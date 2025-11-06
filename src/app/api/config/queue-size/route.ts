import { NextResponse } from 'next/server'
import { getQueueSize, setQueueSize } from '@/lib/edge-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const size = await getQueueSize()
  return NextResponse.json({ ok: true, size })
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') || ''
    let size: number | null = null
    if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({}))
      size = typeof body?.size === 'number' ? body.size : null
    } else {
      const form = await req.formData().catch(() => null)
      const v = form?.get('size')
      if (typeof v === 'string') {
        const parsed = parseInt(v, 10)
        if (!isNaN(parsed) && parsed > 0) size = parsed
      }
    }
    if (!size || size < 1) return NextResponse.json({ ok: false, error: 'invalid_size' }, { status: 400 })

    await setQueueSize(size)
    console.log('[config/queue-size] Queue size updated to:', size)

    // Redirect back to admin for form submissions
    if (!ct.includes('application/json')) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }

    return NextResponse.json({ ok: true, size })
  } catch (e: any) {
    console.error('[config/queue-size] Update failed:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'set queue size failed' }, { status: 500 })
  }
}
