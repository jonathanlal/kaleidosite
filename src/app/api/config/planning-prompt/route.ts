import { NextResponse } from 'next/server'
import { getPlanningPrompt, setPlanningPrompt } from '@/lib/edge-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const prompt = await getPlanningPrompt()
  return NextResponse.json({ ok: true, prompt })
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') || ''
    let prompt: string | null = null
    if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({}))
      prompt = typeof body?.prompt === 'string' ? body.prompt : null
    } else {
      const form = await req.formData().catch(() => null)
      const v = form?.get('prompt')
      if (typeof v === 'string') prompt = v
    }
    if (prompt === null) return NextResponse.json({ ok: false, error: 'invalid_prompt' }, { status: 400 })

    await setPlanningPrompt(prompt)
    console.log('[config/planning-prompt] Planning prompt updated, length:', prompt.length)

    // Redirect back to admin for form submissions
    if (!ct.includes('application/json')) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }

    return NextResponse.json({ ok: true, prompt })
  } catch (e: any) {
    console.error('[config/planning-prompt] Update failed:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'set planning prompt failed' }, { status: 500 })
  }
}
