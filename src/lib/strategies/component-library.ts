import { requireOpenAI, GenUsage } from '../openai'
import { SitePlan, SitePlanResult } from '../site-builder'

/**
 * Strategy C: Component Library Approach
 *
 * Defines reusable Tailwind components. AI composes sections using only these components.
 * Ensures consistency while maintaining flexibility.
 */

const COMPONENT_LIBRARY = `
COMPONENT LIBRARY - Use ONLY these components:

<!-- BUTTON -->
<button class="btn-primary">Text</button>
<button class="btn-secondary">Text</button>
Styles: .btn-primary = px-6 py-3 bg-[var(--color-primary)] rounded-lg font-semibold hover:scale-105 transition-transform
        .btn-secondary = px-6 py-3 bg-white/10 backdrop-blur-sm rounded-lg font-semibold hover:scale-105 transition-transform

<!-- CARD -->
<div class="card">
  <h3 class="card-title">Title</h3>
  <p class="card-text">Content</p>
</div>
Styles: .card = p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all hover:-translate-y-1
        .card-title = text-xl font-bold mb-2
        .card-text = text-white/70

<!-- CONTAINER -->
<div class="container">Content</div>
Styles: .container = max-w-6xl mx-auto px-4

<!-- SECTION -->
<div class="section">Content</div>
Styles: .section = py-20

<!-- GRID -->
<div class="grid-2">...</div>
<div class="grid-3">...</div>
<div class="grid-4">...</div>
Styles: .grid-2 = grid md:grid-cols-2 gap-6
        .grid-3 = grid md:grid-cols-3 gap-6
        .grid-4 = grid md:grid-cols-4 gap-6

<!-- HEADING -->
<h1 class="heading-1">Text</h1>
<h2 class="heading-2">Text</h2>
<h3 class="heading-3">Text</h3>
Styles: .heading-1 = text-5xl md:text-6xl font-bold mb-6
        .heading-2 = text-4xl font-bold mb-4
        .heading-3 = text-2xl font-bold mb-3

<!-- BADGE -->
<span class="badge">Text</span>
Styles: .badge = px-3 py-1 bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-full text-sm font-medium

<!-- GRADIENT BOX -->
<div class="gradient-box">Content</div>
Styles: .gradient-box = p-12 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 border border-white/10

RULES:
- ONLY use these components
- Apply additional Tailwind utility classes as needed (spacing, sizing, flexbox, etc.)
- Combine components to create sections
- Maintain consistent spacing: use py-20 for sections, mb-8 for spacing between elements
- Use animate-on-scroll class for elements that should fade in on scroll
`

export async function generateComponentLibrarySite(seed: string, hint?: string): Promise<SitePlanResult & { html: string }> {
  const openai = requireOpenAI()

  const systemPrompt = `You are composing a website using a predefined component library.

${COMPONENT_LIBRARY}

OUTPUT: JSON object with:
- plan: {summary, slogan, vibe, motif, palette (6 hex colors), sections: [{id, title}]}
- sections: array of HTML strings, each using ONLY the components above

Create 3-5 sections. Each section should:
1. Start with <div class="section"><div class="container">
2. Use ONLY the predefined components
3. End with </div></div>
4. Be visually distinct but consistent in style`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 1.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Seed: ${seed}\n\nCompose a ${hint || 'professional'} website using the component library.\n\nReturn JSON with plan and sections fields.` }
    ],
    max_tokens: 3000,
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
    sections: parsed.plan?.sections || [],
    includeHeader: false,
    layoutStyle: 'component-library'
  }

  const sectionsHtml = (parsed.sections || []).map((s: string, i: number) =>
    `<section id="${plan.sections[i]?.id || `section-${i}`}">\n${s}\n</section>`
  ).join('\n')

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
    /* Component Library Styles */
    .btn-primary { @apply px-6 py-3 bg-[var(--color-primary)] rounded-lg font-semibold hover:scale-105 transition-transform; }
    .btn-secondary { @apply px-6 py-3 bg-white/10 backdrop-blur-sm rounded-lg font-semibold hover:scale-105 transition-transform; }
    .card { @apply p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all hover:-translate-y-1; }
    .card-title { @apply text-xl font-bold mb-2; }
    .card-text { @apply text-white/70; }
    .container { @apply max-w-6xl mx-auto px-4; }
    .section { @apply py-20; }
    .grid-2 { @apply grid md:grid-cols-2 gap-6; }
    .grid-3 { @apply grid md:grid-cols-3 gap-6; }
    .grid-4 { @apply grid md:grid-cols-4 gap-6; }
    .heading-1 { @apply text-5xl md:text-6xl font-bold mb-6; }
    .heading-2 { @apply text-4xl font-bold mb-4; }
    .heading-3 { @apply text-2xl font-bold mb-3; }
    .badge { @apply px-3 py-1 bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-full text-sm font-medium; }
    .gradient-box { @apply p-12 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 border border-white/10; }
    .animate-on-scroll { @apply opacity-0 translate-y-8 transition-all duration-700; }
    .animate-on-scroll.visible { @apply opacity-100 translate-y-0; }
  </style>
</head>
<body>
  ${sectionsHtml}
  <footer class="py-12 text-center text-white/50 text-sm">
    <p>${plan.summary}</p>
  </footer>
  <script>
    // Scroll animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  </script>
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
