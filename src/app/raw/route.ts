import { getLatestHtml, getLatestId, getModel, getIncludeImage, getImagePrompt, setLatest, appendHistory, setLatestMeta, setLatestLocal, appendHistoryLocal, setLatestMetaLocal } from '@/lib/edge-config'
import { withLock } from '@/lib/redis'
import { randomBrief } from '@/lib/random-brief'
import { generateCrazyHtmlDetails } from '@/lib/openai'
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
      const brief = randomBrief(nid)
      const model = (await getModel()) || undefined
      if (model) process.env.OPENAI_MODEL = model
      const includeImage = (await getIncludeImage()) || false
      const imagePrompt = (await getImagePrompt()) || undefined
      const { html: raw, usage } = await generateCrazyHtmlDetails(brief, 'medium', nid, includeImage, imagePrompt)
      const newHtml = postProcessHtml(raw, { id: nid, embedControls: false })
      const ts = Date.now()
      try {
        await setLatest(nid, newHtml, ts)
        await appendHistory(nid, ts)
        await setLatestMeta({ id: nid, ts, brief, usage, model })
      } catch {
        await setLatestLocal(nid, newHtml, ts)
        await appendHistoryLocal(nid, ts)
        await setLatestMetaLocal({ id: nid, ts, brief, usage, model })
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
