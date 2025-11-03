import { getHtmlById } from '@/lib/edge-config'
import { postProcessHtml } from '@/lib/postprocess'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function ensureFooterWithId(html: string, id?: string) {
  if (!id) return html
  if (html.includes(id)) return html
  const footer = `\n<footer><small style=\"position:fixed;left:0;right:0;bottom:8px;text-align:center;opacity:.6\">id: ${id}</small></footer>`
  if (html.includes('</body>')) return html.replace('</body>', `${footer}\n</body>`) 
  if (html.includes('</html>')) return html.replace('</html>', `${footer}\n</html>`) 
  return `${html}${footer}`
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const html = await getHtmlById(id)
  if (!html) return new Response('Not found', { status: 404 })
  const body = postProcessHtml(html, { id, embedControls: false })
  const csp = [
    "default-src 'none'",
    "script-src 'none'",
    "style-src 'unsafe-inline' 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    // No frames inside this page; allow being viewed top-level
    "frame-src 'none'",
  ].join('; ')
  return new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp } })
}


