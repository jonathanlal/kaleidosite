import OpenAI from "openai"

const apiKey = process.env.OPENAI_API_KEY
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini"
const FALLBACK_MODEL = process.env.OPENAI_FALLBACK_MODEL || "gpt-4o"
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "dall-e-3"
const TEMP = Math.min(Math.max(parseFloat(process.env.OPENAI_TEMPERATURE || "0.8"), 0), 1.5)

export function requireOpenAI() {
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set")
  return new OpenAI({ apiKey })
}

export type GenUsage = {
  inputTokens?: number
  outputTokens?: number
  model?: string
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

async function chatHtml(openai: OpenAI, model: string, messages: ChatMessage[], maxTokens: number) {
  const chat = await openai.chat.completions.create({
    model,
    messages: messages as any,
    temperature: TEMP,
    max_tokens: maxTokens,
  })
  const content = chat.choices?.[0]?.message?.content?.trim()
  const usage: GenUsage = {
    inputTokens: chat.usage?.prompt_tokens ?? undefined,
    outputTokens: chat.usage?.completion_tokens ?? undefined,
    model: chat.model,
  }
  return { content, usage }
}

export async function generateCrazyHtml(brief: string, sizeHint: "small" | "medium" | "large" = "medium") {
  const openai = requireOpenAI()
  const sizeTokens = sizeHint === "small" ? 900 : sizeHint === "large" ? 1600 : 1200

  const system = [
    "You output a single, valid HTML5 document with inline <style> and optional inline <script> for small interactions.",
    "Keep it simple, sturdy, and playful. No external resources or network calls.",
    "Focus on fun language and tasteful animations (soft marquee, gentle float, subtle color pulse).",
    "Avoid heavy effects: no 3D transforms, perspective, complex filters, or container queries.",
    "Structure: nav bar with anchors to hero, features, about, testimonials OR faq, contact. Hero must be at least 100vh.",
    "Nav links must be unique and each target id must exist. No duplicate href values.",
    "Accessibility: semantic headings, good contrast, skip-link, large tap targets.",
    "Interactivity: vanilla JS only, use buttons, preventDefault for scroll links, smooth scrolling allowed. No alert/confirm/prompt.",
    "Return ONLY raw HTML (no Markdown fences, no commentary).",
    "Prefer SVG pattern backgrounds over flat gradients when possible.",
  ].join(" ")

  const user = [
    "Design brief (simple + playful):",
    brief,
    "",
    "Hard constraints:",
    "- Single-file HTML. Inline CSS inside <style>. Optional inline <script> for small interactions.",
    "- No external resources or network calls.",
    "- Create nav links to #hero, #features, #about, #testimonials or #faq, #contact and ensure matching section ids.",
    "- No lorem ipsum. Use original, clever copy (no self-referential “odd/strange” wording).",
    "- Keep layout sturdy and mostly single-column.",
    "- Use at most one or two small keyframe animations.",
    "- Favor microcopy and vivid descriptions over visual complexity.",
    "- Keep under ~20KB of characters when possible.",
    "- Buttons must trigger in-page effects (toggle content or scroll).",
    "- NEVER include Markdown fences. Output only HTML.",
  ].join("\n")

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ]

  try {
    const { content } = await chatHtml(openai, DEFAULT_MODEL, messages, sizeTokens)
    if (content) return normalizeHtml(content)
  } catch (err) {
    console.error("Primary HTML generation failed", err)
  }

  try {
    const { content } = await chatHtml(openai, FALLBACK_MODEL, messages, sizeTokens)
    if (content) return normalizeHtml(content)
  } catch (err) {
    console.error("Fallback HTML generation failed", err)
  }

  return minimalHtml("KaleidoSite", "We're warming up the creative engines.")
}

export async function generateCrazyHtmlDetails(
  brief: string,
  sizeHint: "small" | "medium" | "large" = "medium",
  siteId?: string,
  includeImage?: boolean,
  imagePrompt?: string
) {
  const openai = requireOpenAI()
  const sizeTokens = sizeHint === "small" ? 900 : sizeHint === "large" ? 1600 : 1200

  let imageB64: string | undefined
  if (includeImage) {
    try {
      const response = await openai.images.generate({
        model: IMAGE_MODEL,
        prompt: imagePrompt || brief,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      })
      imageB64 = response?.data?.[0]?.b64_json ?? undefined
    } catch (err) {
      console.error("Image generation failed", err)
    }
  }

  const system = [
    "You output a single, valid HTML5 document with inline <style> and optional inline <script> for interactions.",
    "Keep it unique, sturdy, and playful. No external network calls, but inline base64 images are allowed.",
    "Use inventive microcopy, confident tone, and widely-supported animations.",
    "Structure: navigation bar with anchor links covering hero, features, about, testimonials or FAQ, contact. Hero >= 100vh.",
    "Nav links must be unique with matching section ids. Use delightfully odd but readable labels.",
    "Accessibility: semantic headings, good contrast, skip-link, large tap targets.",
    "Interactivity via vanilla JS with addEventListener, prefer <button>, preventDefault to avoid reloads. Smooth scrolling allowed.",
    "Return ONLY raw HTML—no Markdown fences, no commentary.",
    "Each section should feel like a real product/company page with tangible details.",
  ].join(" ")

  const userParts = [
    "Design brief:",
    brief,
    "",
    "Hard constraints:",
    "- Single-file HTML. Inline CSS in <style>. Inline <script> allowed for small enhancements.",
    "- No external resources or network calls. Inline base64 images are acceptable.",
    "- Create nav links with unique href targets. Ensure sections exist with matching ids.",
    "- No lorem ipsum—write original, specific copy for each section.",
    "- Layout must remain resilient (mostly single-column with simple positioning).",
    "- Feel free to use subtle keyframe animations. Keep them performant.",
    "- Buttons must trigger in-page effects or smooth-scroll.",
    "- Do not include Markdown fences. Output only HTML.",
  ]

  if (imageB64) {
    userParts.push(
      "- Include this base64 image somewhere meaningful in the page (you may style it):",
      `<img src="data:image/png;base64,${imageB64}" alt="Generated illustration" />`
    )
  }

  if (siteId) {
    userParts.push(`- Mention the id ${siteId} once inside a footer note or metadata block.`)
  }

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: userParts.join("\n") },
  ]

  try {
    const { content, usage } = await chatHtml(openai, DEFAULT_MODEL, messages, sizeTokens)
    if (content) {
      const html = ensureImage(normalizeHtml(content), imageB64)
      return { html, usage }
    }
  } catch (err) {
    console.error("Primary detailed generation failed", err)
  }

  try {
    const { content, usage } = await chatHtml(openai, FALLBACK_MODEL, messages, sizeTokens)
    if (content) {
      const html = ensureImage(normalizeHtml(content), imageB64)
      return { html, usage }
    }
  } catch (err) {
    console.error("Fallback detailed generation failed", err)
  }

  return {
    html: minimalHtml("KaleidoSite", "Dynamically created websites with AI."),
    usage: { model: "local-fallback" },
  }
}

function normalizeHtml(input: string): string {
  let out = input.trim()
  out = out.replace(/^```[a-zA-Z]*\s*\n?/, "")
  out = out.replace(/\n?```\s*$/, "")
  return out.trim()
}

function ensureImage(html: string, imageB64?: string) {
  if (!imageB64) return html
  if (/data:image\//i.test(html)) return html
  const figure = `\n<figure id="kaleidosite-ai-image" style="max-width:520px;margin:24px auto;border-radius:20px;overflow:hidden;box-shadow:0 18px 45px rgba(0,0,0,.25);background:linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.02));padding:18px;text-align:center">` +
    `<img src="data:image/png;base64,${imageB64}" alt="AI generated illustration" style="width:100%;height:auto;border-radius:14px;display:block;" />` +
    `<figcaption style="margin-top:12px;font-size:14px;letter-spacing:.02em;opacity:.75;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">Fresh render straight from the Kaleido engine.</figcaption></figure>`

  if (/<section[^>]*id=["']hero["'][^>]*>/i.test(html)) {
    return html.replace(/(<section[^>]*id=["']hero["'][^>]*>)/i, `$1${figure}`)
  }
  if (/<main\b[^>]*>/i.test(html)) {
    return html.replace(/(<main\b[^>]*>)/i, `$1${figure}`)
  }
  if (/<body\b[^>]*>/i.test(html)) {
    return html.replace(/(<body\b[^>]*>)/i, `$1${figure}`)
  }
  if (html.includes('</body>')) return html.replace('</body>', `${figure}</body>`)
  return `${html}${figure}`
}

function minimalHtml(title: string, subtitle: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
  html,body{height:100%;margin:0}
  body{display:grid;place-items:center;background:#0b0b10;color:#fff;font:16px/1.6 system-ui}
  .card{max-width:720px;margin:24px;padding:24px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}
  h1{font-size:clamp(28px,6vw,48px);margin:0 0 8px}
  p{opacity:.8}
  </style></head><body>
  <main class="card"><h1>${title}</h1><p>${subtitle}</p></main>
  </body></html>`
}
