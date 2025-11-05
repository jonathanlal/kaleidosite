import { NextResponse } from 'next/server'
import { getModel, getIncludeImage, getImagePrompt } from '@/lib/edge-config'
import { withLock, getRedis } from '@/lib/redis'
import { createSitePlan, buildSiteFromPlan, mergeUsage } from '@/lib/site-builder'
import { uploadHtml, uploadJson } from '@/lib/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PREGEN_QUEUE_KEY = 'pregen_queue';

function newId() {
  // @ts-ignore
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

async function generateAndServe(req: Request) {
    const result = await withLock('lock:pregen', 120000, async () => {
      const nid = newId()
      const planResult = await createSitePlan(nid)
      const plan = planResult.plan
      const model = (await getModel()) || undefined
      if (model) process.env.OPENAI_MODEL = model
      const includeImage = (await getIncludeImage()) || false
      const imagePrompt = (await getImagePrompt()) || undefined
      const { html: newHtml, usage: renderUsage } = await buildSiteFromPlan(plan, {
        sizeHint: 'medium',
        siteId: nid,
        includeImage,
        imagePrompt,
        embedControls: false,
      })
      const ts = Date.now()
      const usage = mergeUsage(planResult.usage, renderUsage)
      const meta = { id: nid, ts, brief: plan.summary, plan, usage, model };
      
      await uploadHtml(`site_${nid}.html`, newHtml);
      await uploadJson(`site_${nid}_meta.json`, meta);
      
      // Also trigger background generation to fill the queue
      fetch(new URL('/api/background-gen', req.url), { method: 'POST' });

      return { id: nid, html: newHtml }
    })
    
    return NextResponse.redirect(new URL(`/site/${result.id}`, req.url));
}

export async function GET(req: Request) {
  const redis = getRedis();
  if (redis) {
    const siteId = await redis.rpop(PREGEN_QUEUE_KEY);
    if (siteId) {
      // Trigger a background generation
      fetch(new URL('/api/background-gen', req.url), { method: 'POST' });
      // Redirect to the pre-generated site
      return NextResponse.redirect(new URL(`/site/${siteId}`, req.url));
    }
  }

  return generateAndServe(req);
}
