import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const token = process.env.ADMIN_TOKEN
  if (!token) return NextResponse.json({ ok: false, error: 'ADMIN_TOKEN not set' }, { status: 400 })
  try {
    const ct = req.headers.get('content-type') || ''
    let provided: string | null = null
    if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({}))
      provided = typeof body?.token === 'string' ? body.token : null
    } else {
      const form = await req.formData().catch(() => null)
      const v = form?.get('token')
      if (typeof v === 'string') provided = v
    }
    if (!provided || provided !== token) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 })
    }
    const res = NextResponse.json({ ok: true })
    res.headers.set('Set-Cookie', `admin=${token}; Path=/; HttpOnly; SameSite=Lax; Secure`)
    return res
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'login failed' }, { status: 500 })
  }
}

