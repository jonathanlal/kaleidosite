import { NextResponse } from 'next/server'
import { getRateLimit, setRateLimit } from '@/lib/edge-config'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const limit = await getRateLimit()
  return NextResponse.json({ ok: true, limit })
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return unauthorized()
  try {
    const ct = req.headers.get('content-type') || ''
    let limit: number | null = null
    if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({}))
      limit = Number(body?.limit)
    } else {
      const form = await req.formData().catch(() => null)
      const v = form?.get('limit')
      if (typeof v === 'string') limit = Number(v)
    }
    if (!limit || !Number.isFinite(limit) || limit <= 0) {
      return NextResponse.json({ ok: false, error: 'invalid_limit' }, { status: 400 })
    }
    await setRateLimit(limit)
    return NextResponse.json({ ok: true, limit })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'set rate failed' }, { status: 500 })
  }
}
