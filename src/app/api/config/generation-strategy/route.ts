import { NextResponse } from 'next/server'
import { getGenerationStrategy, setGenerationStrategy } from '@/lib/edge-config'
import { GenerationStrategy } from '@/lib/generation-strategies'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const strategy = await getGenerationStrategy()
  return NextResponse.json({ ok: true, strategy })
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') || ''
    let strategy: string | null = null
    if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({}))
      strategy = typeof body?.strategy === 'string' ? body.strategy : null
    } else {
      const form = await req.formData().catch(() => null)
      const v = form?.get('strategy')
      if (typeof v === 'string') strategy = v
    }

    const validStrategies: GenerationStrategy[] = ['single-pass', 'template-based', 'component-library', 'design-system']
    if (!strategy || !validStrategies.includes(strategy as GenerationStrategy)) {
      return NextResponse.json({ ok: false, error: 'invalid_strategy' }, { status: 400 })
    }

    await setGenerationStrategy(strategy as GenerationStrategy)
    console.log('[config/generation-strategy] Strategy updated to:', strategy)

    // Redirect back to admin for form submissions
    if (!ct.includes('application/json')) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }

    return NextResponse.json({ ok: true, strategy })
  } catch (e: any) {
    console.error('[config/generation-strategy] Update failed:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'set strategy failed' }, { status: 500 })
  }
}
