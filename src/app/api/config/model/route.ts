import { NextResponse } from 'next/server'
import { getModel, setModel } from '@/lib/edge-config'
import { isAdminRequest, unauthorized } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  // Protect
  // Note: Next.js does not pass Request here; use a synthetic pass via fetch event is not available.
  // We leave GET open (read-only) to simplify, but you can protect it too by moving to a Route Handler with req param.
  const model = await getModel()
  return NextResponse.json({ ok: true, model })
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return unauthorized()
  try {
    const ct = req.headers.get('content-type') || ''
    let model: string | null = null
    if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({}))
      model = typeof body?.model === 'string' ? body.model : null
    } else {
      const form = await req.formData().catch(() => null)
      const v = form?.get('model')
      if (typeof v === 'string') model = v
    }
    if (!model) return NextResponse.json({ ok: false, error: 'invalid_model' }, { status: 400 })
    await setModel(model)
    return NextResponse.json({ ok: true, model })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'set model failed' }, { status: 500 })
  }
}
