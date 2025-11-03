import { setIncludeImage } from '@/lib/edge-config'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const formData = await req.formData()
  const includeImage = formData.get('includeImage') === 'on'
  try {
    await setIncludeImage(includeImage)
    return NextResponse.redirect(new URL('/admin', req.url))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
