import { generateCrazyHtml } from './openai'
import { saveHtmlById } from './edge-config'
import { randomBrief } from './random-brief'

export async function generateAndStore(id: string): Promise<{ id: string; html: string; brief: string }> {
  const brief = randomBrief(id)
  const raw = await generateCrazyHtml(brief, 'medium')
  const html = minifyHtml(raw)
  await saveHtmlById(id, html)
  return { id, html, brief }
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
