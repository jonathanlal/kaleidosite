import { NextResponse } from 'next/server'
import { getModel, setModel } from '@/lib/edge-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const model = await getModel()
  return NextResponse.json({ ok: true, model })
}

export async function POST(req: Request) {
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
    console.log('[config/model] Model updated to:', model)

    // Redirect back to admin for form submissions
    if (!ct.includes('application/json')) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }

    return NextResponse.json({ ok: true, model })
  } catch (e: any) {
    console.error('[config/model] Update failed:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'set model failed' }, { status: 500 })
  }
}
