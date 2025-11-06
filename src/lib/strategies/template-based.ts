import { requireOpenAI, GenUsage } from '../openai'
import { SitePlan, SitePlanResult } from '../site-builder'

/**
 * Strategy B: Template-Based System
 *
 * Uses predefined, proven section templates. AI only fills them with content.
 * Most reliable and consistent approach.
 */

const HERO_TEMPLATES = [
  // Full-bleed gradient hero
  `<div class="relative min-h-screen flex items-center justify-center overflow-hidden">
  <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-secondary)] to-[var(--color-accent)] opacity-20"></div>
  <div class="relative z-10 text-center px-4 max-w-4xl mx-auto">
    <h1 class="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]">{{title}}</h1>
    <p class="text-xl md:text-2xl mb-8 text-white/80">{{subtitle}}</p>
    <div class="flex gap-4 justify-center flex-wrap">
      <button class="px-8 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 rounded-lg font-semibold transition-all hover:scale-105">{{cta1}}</button>
      <button class="px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg font-semibold transition-all hover:scale-105">{{cta2}}</button>
    </div>
  </div>
</div>`,

  // Split hero
  `<div class="min-h-screen grid md:grid-cols-2 gap-0">
  <div class="flex items-center justify-center p-12 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-background)]">
    <div class="max-w-lg">
      <h1 class="text-4xl md:text-6xl font-bold mb-6">{{title}}</h1>
      <p class="text-lg mb-8 text-white/70">{{subtitle}}</p>
      <button class="px-6 py-3 bg-[var(--color-primary)] rounded-lg font-semibold hover:scale-105 transition-transform">{{cta1}}</button>
    </div>
  </div>
  <div class="bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 flex items-center justify-center p-12">
    <div class="w-full h-full min-h-[400px] rounded-2xl bg-white/5 backdrop-blur-lg"></div>
  </div>
</div>`
]

const FEATURE_TEMPLATES = [
  // Grid layout
  `<div class="py-20 px-4">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-4xl font-bold text-center mb-16">{{heading}}</h2>
    <div class="grid md:grid-cols-3 gap-8">
      {{#features}}
      <div class="p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all hover:-translate-y-2">
        <div class="text-4xl mb-4">{{icon}}</div>
        <h3 class="text-xl font-bold mb-3">{{title}}</h3>
        <p class="text-white/70">{{description}}</p>
      </div>
      {{/features}}
    </div>
  </div>
</div>`,

  // Alternating layout
  `<div class="py-20 px-4">
  <div class="max-w-5xl mx-auto space-y-24">
    {{#features}}
    <div class="grid md:grid-cols-2 gap-12 items-center {{#even}}md:flex-row-reverse{{/even}}">
      <div>
        <h3 class="text-3xl font-bold mb-4">{{title}}</h3>
        <p class="text-lg text-white/70">{{description}}</p>
      </div>
      <div class="h-64 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/20"></div>
    </div>
    {{/features}}
  </div>
</div>`
]

const CTA_TEMPLATES = [
  `<div class="py-32 px-4">
  <div class="max-w-4xl mx-auto text-center">
    <h2 class="text-5xl font-bold mb-6">{{heading}}</h2>
    <p class="text-xl text-white/70 mb-8">{{subheading}}</p>
    <button class="px-12 py-4 bg-[var(--color-primary)] rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-[var(--color-primary)]/30">{{cta}}</button>
  </div>
</div>`
]

function renderTemplate(template: string, data: Record<string, any>): string {
  let html = template
  // Simple template replacement
  for (const [key, value] of Object.entries(data)) {
    html = html.replaceAll(`{{${key}}}`, String(value))
  }
  return html
}

export async function generateTemplateBasedSite(seed: string, hint?: string): Promise<SitePlanResult & { html: string }> {
  const openai = requireOpenAI()

  const systemPrompt = `You are generating content to fill predefined website templates.

OUTPUT: JSON object with these fields:
- plan: {summary, slogan, vibe, motif, palette (with 6 hex colors), sections array}
- hero: {title, subtitle, cta1, cta2}
- features: {heading, items: [{icon (emoji), title, description}]} (3-4 items)
- cta: {heading, subheading, cta}

Keep content concise and impactful. Use emojis for icons.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 1.4,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Seed: ${seed}\n\nGenerate content for a ${hint || 'modern, professional'} website.\n\nReturn JSON with plan, hero, features, and cta fields.` }
    ],
    max_tokens: 2000,
  })

  const text = response.choices[0].message.content
  const parsed = text ? JSON.parse(text) : {}

  const plan: SitePlan = {
    seed,
    summary: parsed.plan?.summary || 'Generated site',
    slogan: parsed.plan?.slogan || 'Site',
    vibe: parsed.plan?.vibe || 'modern',
    motif: parsed.plan?.motif || 'clean',
    palette: parsed.plan?.palette || {
      name: 'Default',
      background: '#0a0a0f',
      surface: '#1a1a2e',
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      accent: '#ec4899',
      text: '#e5e5e5'
    },
    sections: [
      { id: 'hero', title: 'Home', purpose: 'Landing', features: [], interactive: [] },
      { id: 'features', title: 'Features', purpose: 'Showcase', features: [], interactive: [] },
      { id: 'cta', title: 'Get Started', purpose: 'Convert', features: [], interactive: [] }
    ],
    includeHeader: false,
    layoutStyle: 'template-based'
  }

  // Pick random templates
  const heroHtml = renderTemplate(HERO_TEMPLATES[Math.floor(Math.random() * HERO_TEMPLATES.length)], parsed.hero || {})
  const featureHtml = renderTemplate(FEATURE_TEMPLATES[Math.floor(Math.random() * FEATURE_TEMPLATES.length)], parsed.features || {})
  const ctaHtml = renderTemplate(CTA_TEMPLATES[0], parsed.cta || {})

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${plan.slogan}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --color-bg: ${plan.palette.background};
      --color-surface: ${plan.palette.surface};
      --color-primary: ${plan.palette.primary};
      --color-secondary: ${plan.palette.secondary};
      --color-accent: ${plan.palette.accent};
      --color-text: ${plan.palette.text};
    }
    body {
      margin: 0;
      background: var(--color-bg);
      color: var(--color-text);
      font-family: system-ui, -apple-system, sans-serif;
    }
  </style>
</head>
<body>
  <section id="hero">${heroHtml}</section>
  <section id="features">${featureHtml}</section>
  <section id="cta">${ctaHtml}</section>
  <footer class="py-12 text-center text-white/50 text-sm">
    <p>${plan.summary}</p>
  </footer>
</body>
</html>`

  const usage: GenUsage | undefined = response.usage
    ? {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        model: response.model || 'gpt-4o-mini',
      }
    : undefined

  return { plan, usage, html }
}
