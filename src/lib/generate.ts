import { uploadHtml, uploadJson } from './blob'
import { createSitePlan, buildSiteFromPlan, mergeUsage } from './site-builder'
import { getModel, getIncludeImage, getImagePrompt } from './edge-config'

export async function generateAndStore(id: string): Promise<{ id: string; html: string; brief: string }> {
  const planResult = await createSitePlan(id)
  const plan = planResult.plan

  // Respect config options
  const model = (await getModel()) || undefined
  if (model) process.env.OPENAI_MODEL = model
  const includeImage = (await getIncludeImage()) || false
  const imagePrompt = (await getImagePrompt()) || undefined

  const { html: raw, usage: renderUsage } = await buildSiteFromPlan(plan, {
    sizeHint: 'medium',
    siteId: id,
    includeImage,
    imagePrompt,
    embedControls: false,
  })

  const html = minifyHtml(raw)
  const ts = Date.now()
  const usage = mergeUsage(planResult.usage, renderUsage)
  const meta = { id, ts, brief: plan.summary, plan, usage, model }

  // Store both HTML and metadata
  await uploadHtml(`site_${id}.html`, html)
  await uploadJson(`site_${id}_meta.json`, meta)

  return { id, html, brief: plan.summary }
}

function minifyHtml(input: string): string {
  try {
    let out = input
    // Remove HTML comments
    out = out.replace(/<!--([\s\S]*?)-->/g, '')
    // Collapse multiple spaces
    out = out.replace(/\s{2,}/g, ' ')
    // Trim lines
    out = out.split('\n').map((l) => l.trim()).join('')
    return out
  } catch {
    return input
  }
}