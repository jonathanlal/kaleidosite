import { NextResponse } from 'next/server'
import { getModel, getIncludeImage, getImagePrompt } from '@/lib/edge-config'
import { withLock } from '@/lib/redis'
import { createSitePlan, buildSiteFromPlan, mergeUsage } from '@/lib/site-builder'
import { postProcessHtml } from '@/lib/postprocess'
import { uploadHtml, uploadJson } from '@/lib/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function newId() {
  // @ts-ignore
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

export async function GET(req: Request) {
  const blobUrl = `${process.env.BLOB_URL}/kaleidosite/latest.html`;
  let response = await fetch(blobUrl);
  let html = response.ok ? await response.text() : null;
  
  let id: string | null = null;

  if (!html) {
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
      
      await uploadHtml(`site_${nid}`, newHtml);
      await uploadJson(`site_${nid}_meta`, meta);
      await uploadJson('latest_meta', meta);
      await uploadHtml('latest', newHtml);

      return { id: nid, html: newHtml }
    })
    html = result.html
    id = result.id
  } else {
    // get id from latest_meta.json
    const metaUrl = `${process.env.BLOB_URL}/kaleidosite/latest_meta.json`;
    const metaResponse = await fetch(metaUrl);
    if (metaResponse.ok) {
      const meta = await metaResponse.json();
      id = meta.id;
    }
  }

  const body = postProcessHtml(html!, { id: id || undefined, embedControls: true })
  return new Response(body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}