import { uploadHtml } from './blob'
import { createSitePlan, buildSiteFromPlan } from './site-builder'

export async function generateAndStore(id: string): Promise<{ id: string; html: string; brief: string }> {
  const planResult = await createSitePlan(id)
  const { html: raw } = await buildSiteFromPlan(planResult.plan, { sizeHint: 'medium', siteId: id })
  const html = minifyHtml(raw)
  await uploadHtml(`site_${id}.html`, html)
  return { id, html, brief: planResult.plan.summary }
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