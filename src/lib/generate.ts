import { uploadHtml, uploadJson } from './blob'
import { mergeUsage } from './site-builder'
import { getModel, getIncludeImage, addToHistory } from './edge-config'
import { generateSite } from './strategies'

export async function generateAndStore(id: string): Promise<{ id: string; html: string; brief: string }> {
  // Respect config options
  const model = (await getModel()) || undefined
  if (model) process.env.OPENAI_MODEL = model
  const includeImage = (await getIncludeImage()) || false

  // Use strategy router to generate site
  const { plan, html: raw, usage } = await generateSite(id, undefined, {
    sizeHint: 'medium',
    siteId: id,
    includeImage,
    embedControls: false,
  })

  const html = minifyHtml(raw)
  const ts = Date.now()
  const meta = { id, ts, brief: plan.summary, plan, usage, model }

  // Store both HTML and metadata
  await uploadHtml(`site_${id}.html`, html)
  await uploadJson(`site_${id}_meta.json`, meta)

  // Add to history
  await addToHistory(id, ts)

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