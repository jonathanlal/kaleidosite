import { NextResponse } from 'next/server'
import { createSitePlan, buildSiteFromPlan, mergeUsage } from '@/lib/site-builder'
import { getRateLimit, getModel, getIncludeImage, addToHistory } from '@/lib/edge-config'
import { withLock, getCurrentRateCount, incrCurrentRate, getRedis } from '@/lib/redis'
import { uploadHtml, uploadJson } from '@/lib/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PREGEN_QUEUE_KEY = 'pregen_queue';

function newId() {
  // @ts-ignore
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

export async function POST() {
  try {
    const result = await withLock('lock:pregen', 120000, async () => {
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
      const planResult = await createSitePlan(id)
      const plan = planResult.plan
      const model = (await getModel()) || undefined
      if (model) process.env.OPENAI_MODEL = model
      const includeImage = (await getIncludeImage()) || false
      const { html: raw, usage: renderUsage } = await buildSiteFromPlan(plan, {
        sizeHint: 'medium',
        siteId: id,
        includeImage,
        embedControls: false,
      })
      const html = minifyHtml(raw)
      await uploadHtml(`site_${id}.html`, html)
      const ts = Date.now()
      const usage = mergeUsage(planResult.usage, renderUsage)
      const meta = { id, ts, brief: plan.summary, plan, usage, model }
      await uploadJson(`site_${id}_meta.json`, meta)

      // Set this as the latest generation
      await uploadJson('latest_meta.json', meta)
      await uploadHtml('latest.html', html)

      const redis = getRedis();
      if (redis) {
        await redis.lpush(PREGEN_QUEUE_KEY, id);
      }

      // Add to history
      await addToHistory(id, ts)

      return { id, ts, usage }
    })
    if ((result as any)?.rateLimited) {
      return NextResponse.json({ ok: false, error: 'rate_limited', ...result }, { status: 429 })
    }
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    console.error('[pregen] failed', e)
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
