import { NextResponse } from 'next/server'
import { randomBrief } from '@/lib/random-brief'
import { generateCrazyHtmlDetails } from '@/lib/openai'
import { saveHtmlById, setLatest, appendHistory, setLatestMeta, getRateLimit, getModel, getIncludeImage, getImagePrompt, setLatestLocal, appendHistoryLocal, setLatestMetaLocal } from '@/lib/edge-config'
import { withLock, getCurrentRateCount, incrCurrentRate } from '@/lib/redis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function newId() {
  // @ts-ignore
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

export async function POST() {
  try {
    const result = await withLock('lock:pregen', 60000, async () => {
      // Rate limit check (global per minute)
      const limit = await getRateLimit()
      if (limit && limit > 0) {
        const current = (await getCurrentRateCount()) ?? 0
        if (current >= limit) {
          return { rateLimited: true, limit, current }
        }
        await incrCurrentRate()
      }
      const id = newId()
      const brief = randomBrief(id)
      const model = (await getModel()) || undefined
      if (model) process.env.OPENAI_MODEL = model
      const includeImage = (await getIncludeImage()) || false
      const imagePrompt = (await getImagePrompt()) || undefined
      const { html: raw, usage } = await generateCrazyHtmlDetails(brief, 'medium', id, includeImage, imagePrompt)
      const html = minifyHtml(raw)
      await saveHtmlById(id, html)
      const ts = Date.now()
      try {
        await setLatest(id, html, ts)
        await appendHistory(id, ts)
        await setLatestMeta({ id, ts, brief, usage, model })
      } catch {
        // Local fallback
        await setLatestLocal(id, html, ts)
        await appendHistoryLocal(id, ts)
        await setLatestMetaLocal({ id, ts, brief, usage, model })
      }
      return { id, ts, usage }
    })
    if ((result as any)?.rateLimited) {
      return NextResponse.json({ ok: false, error: 'rate_limited', ...result }, { status: 429 })
    }
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'pregen failed' }, { status: 500 })
  }
}

export async function GET() {
  // Allow GET to behave like POST for simplicity
  return POST()
}

function minifyHtml(input: string): string {
  try {
    let out = input
    out = out.replace(/<!--([\s\S]*?)-->/g, '')
    out = out.replace(/\s{2,}/g, ' ')
    out = out.split('\n').map((l) => l.trim()).join('')
    return out
  } catch {
    return input
  }
}
