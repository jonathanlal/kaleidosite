import { NextResponse } from 'next/server'
import { get } from '@vercel/edge-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [id, ts] = await Promise.all([
      get<string>('site_latest_id').catch(() => null),
      get<number>('site_latest_ts').catch(() => null),
    ])
    return NextResponse.json({ ok: true, latest: { id, ts } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'status error' }, { status: 500 })
  }
}


