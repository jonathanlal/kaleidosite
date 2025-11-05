import { getLatestHtml, getLatestId, getModel, getIncludeImage, getImagePrompt, setLatest, appendHistory, setLatestMeta, setLatestLocal, appendHistoryLocal, setLatestMetaLocal } from '@/lib/edge-config'
import { withLock } from '@/lib/redis'
import { createSitePlan, buildSiteFromPlan, mergeUsage } from '@/lib/site-builder'
import { postProcessHtml } from '@/lib/postprocess'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function newId() {
  // @ts-ignore
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

export async function GET() {
  let html = await getLatestHtml()
  let id = await getLatestId()

  if (!html) {
    const result = await withLock('lock:pregen', 60000, async () => {
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
      try {
        await setLatest(nid, newHtml, ts)
        await appendHistory(nid, ts)
        await setLatestMeta({ id: nid, ts, brief: plan.summary, plan, usage, model })
      } catch {
        await setLatestLocal(nid, newHtml, ts)
        await appendHistoryLocal(nid, ts)
        await setLatestMetaLocal({ id: nid, ts, brief: plan.summary, plan, usage, model })
      }
      return { id: nid, html: newHtml }
    })
    html = result.html
    id = result.id
  }

  const body = postProcessHtml(html!, { id: id || undefined, embedControls: false })
  return new Response(body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
