import { postProcessHtml } from './postprocess'
import { requireOpenAI, GenUsage } from './openai'
import { uploadImageFromBase64 } from './blob'

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3'

export type SitePalette = {
  name: string
  background: string
  surface: string
  primary: string
  secondary: string
  accent: string
  text: string
}

export type SiteSectionPlan = {
  id: string
  title: string
  purpose: string
  features: string[]
  interactive: string[]
}

export type SitePlan = {
  seed: string
  summary: string
  slogan: string
  vibe: string
  motif: string
  palette: SitePalette
  sections: SiteSectionPlan[]
  includeHeader?: boolean
  layoutStyle?: string
}

export type SitePlanResult = {
  plan: SitePlan
  usage?: GenUsage
}

type SizeHint = 'small' | 'medium' | 'large'

function slugify(value: string, fallback: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || fallback
}

function sanitiseHex(value: string, fallback: string) {
  const hex = value.trim()
  if (/^#[0-9a-f]{6}$/i.test(hex)) return hex
  if (/^#[0-9a-f]{3}$/i.test(hex)) return hex
  return fallback
}

function ensurePlan(plan: SitePlan): SitePlan {
  const palette = plan.palette || ({} as SitePalette)
  const safePlan: SitePlan = {
    seed: plan.seed || `seed-${Date.now()}`,
    summary: plan.summary || 'A wildly imaginative single-page experience packed with stories, interactions, and surprises.',
    slogan: plan.slogan || 'KaleidoVibe',
    vibe: plan.vibe || 'Playful, confident, and a bit surreal',
    motif: plan.motif || 'Layered gradients, floating particles, and delightful micro-interactions',
    palette: {
      name: palette.name || 'Chromatic Echo',
      background: sanitiseHex(palette.background || '#0b0b10', '#0b0b10'),
      surface: sanitiseHex(palette.surface || '#141422', '#141422'),
      primary: sanitiseHex(palette.primary || '#8b5cf6', '#8b5cf6'),
      secondary: sanitiseHex(palette.secondary || '#22d3ee', '#22d3ee'),
      accent: sanitiseHex(palette.accent || '#f97316', '#f97316'),
      text: sanitiseHex(palette.text || '#f1f5f9', '#f1f5f9'),
    },
    sections: (plan.sections || []).slice(0, 7),
  }

  if (!safePlan.sections.length) {
    safePlan.sections = [
      {
        id: 'hero',
        title: 'Hero',
        purpose: 'Introduce the concept with a bold headline, supporting copy, and a primary call-to-action.',
        features: ['Commanding headline', 'Supporting blurb', 'Primary CTA button'],
        interactive: ['Animated headline reveal', 'Button hover micro-interaction'],
      },
    ]
  }

  const seen = new Set<string>()
  safePlan.sections = safePlan.sections.map((section, index) => {
    const fallback = `section-${index + 1}`
    const id = index === 0 ? 'hero' : slugify(section.id || section.title || fallback, fallback)
    const uniqueId = seen.has(id) ? `${id}-${index}` : id
    seen.add(uniqueId)
    return {
      id: index === 0 ? 'hero' : uniqueId,
      title: section.title || `Section ${index + 1}`,
      purpose: section.purpose || 'Tell a short story that advances the experience.',
      features: section.features?.filter(Boolean) ?? ['Headline', 'Body copy', 'CTA'],
      interactive: section.interactive?.filter(Boolean) ?? ['Subtle hover animations on key elements'],
    }
  })

  return safePlan
}

function combineUsage(...entries: (GenUsage | undefined)[]): GenUsage {
  let input = 0
  let output = 0
  const models = new Set<string>()
  for (const entry of entries) {
    if (!entry) continue
    if (entry.inputTokens) input += entry.inputTokens
    if (entry.outputTokens) output += entry.outputTokens
    if (entry.model) models.add(entry.model)
  }
  return {
    inputTokens: input || undefined,
    outputTokens: output || undefined,
    model: Array.from(models).join(', ') || undefined,
  }
}

function extractText(resp: any): string | undefined {
  try {
    if (!resp) return undefined
    if (typeof resp.output_text === 'string') return resp.output_text.trim()
    const out = resp.output || resp.responses || []
    for (const item of out) {
      const content = item?.content || []
      for (const c of content) {
        if (typeof c?.text === 'string') return c.text.trim()
      }
    }
    const content = resp?.content
    if (Array.isArray(content)) {
      for (const c of content) {
        if (typeof c?.text === 'string') return c.text.trim()
      }
    }
  } catch {
    return undefined
  }
  return undefined
}

function normalizeHtml(input: string) {
  let out = input.trim()
  out = out.replace(/^```[a-zA-Z]*\s*\n?/, '')
  out = out.replace(/\n?```\s*$/, '')
  return out.trim()
}

function ensureImage(html: string, imageSrc?: string) {
  if (!imageSrc) return html
  if (html.includes('id="kaleidosite-ai-image"')) return html
  const figure = `\n<figure id="kaleidosite-ai-image" style="max-width:420px;margin:24px auto;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(0,0,0,.25);background:linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.02));padding:16px;text-align:center">` +
    `<img src="${imageSrc}" alt="AI generated illustration" style="width:100%;height:auto;border-radius:14px;display:block;" />` +
    `<figcaption style="margin-top:12px;font-size:14px;letter-spacing:.02em;opacity:.75;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">Fresh render straight from the Kaleido engine.</figcaption></figure>`

  if (html.includes('<!-- KALEIDOSITE_AI_IMAGE_SLOT -->')) {
    return html.replace('<!-- KALEIDOSITE_AI_IMAGE_SLOT -->', figure)
  }
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

export async function createSitePlan(seed: string, hint?: string): Promise<SitePlanResult> {
  const openai = requireOpenAI()
  const {getPlanningPrompt} = await import('./edge-config')
  const customPrompt = await getPlanningPrompt()

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      seed: { type: 'string' },
      summary: { type: 'string' },
      slogan: { type: 'string' },
      vibe: { type: 'string' },
      motif: { type: 'string' },
      includeHeader: { type: 'boolean' },
      layoutStyle: { type: 'string' },
      palette: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          background: { type: 'string' },
          surface: { type: 'string' },
          primary: { type: 'string' },
          secondary: { type: 'string' },
          accent: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['background', 'surface', 'primary', 'secondary', 'accent', 'text'],
      },
      sections: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            purpose: { type: 'string' },
            features: {
              type: 'array',
              minItems: 3,
              items: { type: 'string' },
            },
            interactive: {
              type: 'array',
              minItems: 2,
              items: { type: 'string' },
            },
          },
          required: ['title', 'purpose', 'features', 'interactive'],
        },
      },
    },
    required: ['summary', 'slogan', 'vibe', 'motif', 'palette', 'sections', 'includeHeader', 'layoutStyle'],
  }

  const defaultSystemPrompt = 'You are an avant-garde web experience architect with EXTREME creativity. Design WILDLY IMAGINATIVE, feature-rich single-page websites that push boundaries. Each site MUST be COMPLETELY DIFFERENT with unique themes, layouts, and interactions.\n\n' +
    'CRITICAL RULES:\n' +
    '- Make sites COMPLEX and FEATURE-PACKED (3-5 sections)\n' +
    '- Each section needs 3+ unique features and 2+ interactive elements\n' +
    '- 40% of sites should have NO HEADER (includeHeader: false) for variety\n' +
    '- Vary layoutStyle dramatically each time: "experimental", "minimalist", "maximalist", "brutalist", "glassmorphic", "retro", "futuristic", "organic", "geometric", "cyberpunk", "vaporwave", "brutalist", "swiss", "memphis"\n' +
    '- Use BOLD, WILD, unexpected color palettes - avoid common combinations!\n' +
    '- Vary vibe dramatically: "playful", "serious", "mysterious", "energetic", "calm", "chaotic", "elegant", "edgy", "whimsical", "dark", "light", "corporate", "artistic", "technical"\n' +
    '- Include diverse section types: galleries, timelines, comparison tables, pricing grids, testimonials, interactive demos, data visualizations, quizzes, animations, parallax effects, carousels, accordions, tabs, modals, etc.\n' +
    '- IMPORTANT: slogan must be a SHORT COMPOUND WORD (e.g., "NeonPulse", "CyberBloom", "QuantumVibe", "EchoFlux") - NOT a sentence!\n' +
    '- Be EXTREMELY creative with themes - explore unusual concepts, niches, and ideas\n' +
    '- NO two sites should feel similar - maximize variation!\n\n' +
    'Schema: ' + JSON.stringify(schema)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 1.6,
    top_p: 0.95,
    frequency_penalty: 1.2,
    presence_penalty: 1.0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: customPrompt || defaultSystemPrompt,
      },
      {
        role: 'user',
        content: `Seed: ${seed}\n\nCreate an EXTRAORDINARY, UNIQUE single-page experience that's COMPLETELY DIFFERENT from anything you've created before. Push creative boundaries to the MAX. ${hint || 'Surprise me with something wild, unexpected, and feature-rich!'}\n\nReturn ONLY valid JSON matching the schema.`,
      },
    ],
  })

  const text = response.choices[0].message.content
  const parsed = text ? JSON.parse(text) : {}
  const plan = ensurePlan({ seed, ...parsed })
  const usage = response.usage
    ? {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        model: response.model || 'gpt-4o-mini',
      }
    : undefined
  return { plan, usage }
}

async function generateSectionContent(
  plan: SitePlan,
  section: SiteSectionPlan,
  index: number,
  total: number,
  tokenBudget: number,
) {
  const openai = requireOpenAI()
  const hints: string[] = []
  if (index === 0) {
    hints.push('This is the HERO section - make it SPECTACULAR! Must include: a bold headline with animation, compelling subtext, multiple CTAs with hover effects, background gradients/animations, and the literal comment <!-- KALEIDOSITE_AI_IMAGE_SLOT --> for imagery. Add scroll indicators, floating elements, or particle effects for extra polish.')
  } else {
    hints.push('Create a seamless transition from the previous section. Add visual interest and maintain engagement.')
  }
  if (!section.interactive.length) {
    section.interactive.push('Add hover/tap interactions', 'Include smooth animations or transitions')
  }

  // Load custom section prompt if available
  const {getSectionPrompt} = await import('./edge-config')
  const customPrompt = await getSectionPrompt()

  const defaultSystemPrompt =
    'You are a MASTER front-end designer creating cutting-edge, feature-rich web sections. Output ONLY HTML markup (no wrapping <section> tags). You MUST include inline <style> and/or <script> tags to create:\n\n' +
    '- Rich interactive elements (buttons, forms, sliders, toggles, animations)\n' +
    '- Advanced CSS (gradients, transforms, transitions, keyframe animations, grid/flexbox layouts)\n' +
    '- JavaScript for interactivity (click handlers, animations, data visualization, dynamic effects)\n' +
    '- Creative layouts (cards, grids, timelines, comparison tables, galleries, tabs, accordions)\n' +
    '- Micro-interactions and delightful UX details\n\n' +
    'Make each section visually STUNNING and HIGHLY INTERACTIVE. Use the palette colors creatively. No external resources - everything inline.'

  const messages = [
    {
      role: 'system' as const,
      content: customPrompt || defaultSystemPrompt,
    },
    {
      role: 'user' as const,
      content: JSON.stringify(
        {
          summary: plan.summary,
          slogan: plan.slogan,
          palette: plan.palette,
          vibe: plan.vibe,
          motif: plan.motif,
          layoutStyle: plan.layoutStyle,
          section,
          position: { index, total },
          hints,
        },
        null,
        2,
      ) + '\n\nCreate an EXCEPTIONAL, feature-rich section that implements ALL the features and interactive elements listed. Push creative boundaries!',
    },
  ]

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const chat = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: tokenBudget,
    temperature: 1.1,
  })

  const html = chat.choices?.[0]?.message?.content?.trim() || ''
  const usage: GenUsage | undefined = chat.usage
    ? {
        inputTokens: chat.usage.prompt_tokens,
        outputTokens: chat.usage.completion_tokens,
        model: chat.model,
      }
    : undefined

  return { html: normalizeHtml(html), usage }
}

function buildCss(palette: SitePalette) {
  return `
:root {
  --color-bg: ${palette.background};
  --color-surface: ${palette.surface};
  --color-primary: ${palette.primary};
  --color-secondary: ${palette.secondary};
  --color-accent: ${palette.accent};
  --color-text: ${palette.text};
}
* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  background: radial-gradient(circle at 10% 20%, ${palette.surface} 0%, transparent 55%), radial-gradient(circle at 90% 10%, rgba(255,255,255,0.08) 0%, transparent 55%), var(--color-bg);
  color: var(--color-text);
  line-height: 1.65;
}
a { color: inherit; }
.skip-link {
  position: absolute;
  left: -999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
.skip-link:focus {
  left: 16px;
  top: 16px;
  width: auto;
  height: auto;
  padding: 12px 18px;
  border-radius: 999px;
  background: var(--color-primary);
  color: #fff;
  z-index: 9999;
}
header.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(18px);
  background: rgba(11,11,16,0.7);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}
.brand {
  font-size: clamp(1rem, 2vw, 1.4rem);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
  flex-shrink: 0;
}
nav.site-nav {
  display: flex;
  gap: 12px;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.3) transparent;
  -webkit-overflow-scrolling: touch;
  padding: 4px 0;
  max-width: 100%;
}
nav.site-nav::-webkit-scrollbar {
  height: 6px;
}
nav.site-nav::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.3);
  border-radius: 3px;
}
.nav-link {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.06);
  text-decoration: none;
  font-size: 0.85rem;
  transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}
.nav-link:hover,
.nav-link:focus-visible {
  transform: translateY(-2px);
  background: var(--color-primary);
  color: #fff;
}
main#main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 36px 24px 120px;
}
.section-block {
  margin: 72px 0;
  padding: 48px clamp(18px,4vw,42px);
  border-radius: 32px;
  background: rgba(12,12,24,0.55);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 25px 55px rgba(0,0,0,0.35);
}
.section-inner {
  max-width: 840px;
  margin: 0 auto;
  display: grid;
  gap: 24px;
}
footer.site-footer {
  padding: 48px 24px 64px;
  text-align: center;
  background: rgba(10,10,18,0.65);
  border-top: 1px solid rgba(255,255,255,0.08);
}
@media (max-width: 640px) {
  .header-inner { flex-direction: column; align-items: flex-start; }
  nav.site-nav { width: 100%; gap: 12px; }
  .nav-link { flex: 1 1 auto; text-align: center; }
  .section-block { margin: 48px 0; padding: 36px 18px; border-radius: 24px; }
}
`
}

type BuildOptions = {
  sizeHint?: SizeHint
  siteId?: string
  includeImage?: boolean
  embedControls?: boolean
}

export async function buildSiteFromPlan(plan: SitePlan, options: BuildOptions = {}) {
  const { sizeHint = 'medium', siteId, includeImage } = options
  const sizeTokens = sizeHint === 'small' ? 900 : sizeHint === 'large' ? 1600 : 1200

  let imageSrc: string | undefined
  if (includeImage) {
    console.log('[site-builder] Image generation requested for', siteId)
    try {
      // Generate contextual image prompt based on the site's unique theme and characteristics
      const contextualPrompt = `Create a vibrant, artistic hero image for a website with this theme:

Summary: ${plan.summary}
Vibe: ${plan.vibe}
Visual Motif: ${plan.motif}
Color Palette: ${plan.palette.name} featuring ${plan.palette.primary}, ${plan.palette.secondary}, ${plan.palette.accent}
Layout Style: ${plan.layoutStyle || 'dynamic'}

The image should be bold, eye-catching, and perfectly match this website's unique character and aesthetic.`

      const response = await requireOpenAI().images.generate({
        model: IMAGE_MODEL,
        prompt: contextualPrompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      })
      const base64 = response?.data?.[0]?.b64_json
      if (base64) {
        console.log('[site-builder] Image generated contextually, size:', base64.length, 'bytes')
        // ALWAYS use data URI to avoid CORS issues (status 0 errors)
        // Blob URLs from different origins cause cross-origin loading failures
        imageSrc = `data:image/png;base64,${base64}`
        console.log('[site-builder] Using inline data URI (no CORS issues)')
      } else {
        console.error('[site-builder] No image data in response')
      }
    } catch (err) {
      console.error('[site-builder] Image generation failed:', err)
    }
  } else {
    console.log('[site-builder] Image generation disabled (includeImage:', includeImage, ')')
  }

  const sectionBudget = Math.max(600, Math.round(sizeTokens / Math.max(plan.sections.length, 1)) + 300)

  const sectionPromises = plan.sections.map((section, i) =>
    generateSectionContent(plan, section, i, plan.sections.length, sectionBudget)
  )

  const sectionResults = await Promise.all(sectionPromises)

  const sectionHtml: string[] = []
  const sectionUsages: GenUsage[] = []

  sectionResults.forEach((result, i) => {
    const { html, usage } = result
    if (usage) sectionUsages.push(usage)
    if (!html) return
    sectionHtml.push(
      `<section id="${plan.sections[i].id}" class="section-block" aria-labelledby="heading-${plan.sections[i].id}">
        <div class="section-inner">
          ${html}
        </div>
      </section>`
    )
  })

  const nav = plan.sections
    .map((section) => `<a class="nav-link" href="#${section.id}">${section.title}</a>`)
    .join('\n')

  const headerHtml = plan.includeHeader !== false ? `
  <header class="site-header" role="banner">
    <div class="header-inner">
      <div class="brand">${plan.slogan}</div>
      <nav class="site-nav" aria-label="Primary">
        ${nav}
      </nav>
    </div>
  </header>` : ''

  const mainTopPadding = plan.includeHeader !== false ? '36px' : '72px'

  const document = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${plan.slogan}</title>
  <style>${buildCss(plan.palette)}</style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>${headerHtml}
  <main id="main" tabindex="-1" style="padding-top: ${mainTopPadding};">
    ${sectionHtml.join('\n')}
  </main>
  <footer class="site-footer">
    <p>${plan.summary}</p>
    <small>Seed: ${plan.seed} | Layout: ${plan.layoutStyle || 'default'}</small>
  </footer>
</body>
</html>`

  const withImage = ensureImage(document, imageSrc)
  const processed = postProcessHtml(withImage, { id: siteId, embedControls: options.embedControls ?? true })
  const usage = combineUsage(...sectionUsages)
  return { html: processed, usage, imageSrc }
}

export const mergeUsage = combineUsage
