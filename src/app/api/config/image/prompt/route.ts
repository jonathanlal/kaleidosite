import { setImagePrompt } from '@/lib/edge-config'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const formData = await req.formData()
  const imagePrompt = formData.get('imagePrompt') as string
  try {
    await setImagePrompt(imagePrompt || '')
    console.log('[config/image/prompt] Image prompt updated:', imagePrompt ? 'custom prompt set' : 'cleared')
    return NextResponse.redirect(new URL('/admin', req.url))
  } catch (e: any) {
    console.error('[config/image/prompt] Update failed:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
