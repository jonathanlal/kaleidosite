import { requireOpenAI, GenUsage } from '../openai'
import { SitePlan, SitePlanResult } from '../site-builder'

/**
 * Strategy A: Single-Pass Full Site Generation
 *
 * Generates the entire HTML document in ONE API call for maximum cohesion.
 * The AI creates a complete, unified design with consistent spacing, colors, and components.
 */

export async function generateSinglePassSite(seed: string, hint?: string): Promise<SitePlanResult & { html: string }> {
  const openai = requireOpenAI()

  const systemPrompt = `You are a world-class web designer creating a COMPLETE, COHESIVE single-page website in ONE unified design.

OUTPUT REQUIREMENTS:
- Return a JSON object with two fields: "plan" and "html"
- "plan" contains metadata (summary, slogan, vibe, colors, etc.)
- "html" contains the COMPLETE HTML document from <!doctype html> to </html>

DESIGN SYSTEM APPROACH:
1. Establish a consistent spacing scale (use Tailwind: space-y-4, space-y-8, space-y-16, etc.)
2. Use a unified typography hierarchy (text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl, text-4xl, text-5xl)
3. Create a cohesive color system throughout
4. Use consistent component patterns (cards, buttons, grids all follow same style)
5. Maintain visual rhythm with predictable padding patterns

MANDATORY STRUCTURE:
- Include Tailwind CDN: <script src="https://cdn.tailwindcss.com"></script>
- Use sections with IDs for navigation
- Create 3-5 major sections with clear visual hierarchy
- Each section should flow naturally into the next
- Use consistent background patterns (alternating light/dark, gradients, etc.)

VISUAL COHESION:
- Pick ONE primary interaction pattern and use it throughout (e.g., all hover effects similar)
- Use ONE main layout grid system consistently
- Establish spacing rhythm: e.g., sections are py-20, cards are p-6, buttons are px-4 py-2
- Color usage: primary for CTAs, accent for highlights, text for body - stay consistent
- All cards/components should share similar border-radius, shadow, and padding

INTERACTIVITY (Add ONE <script> tag at end of body):
- Implement smooth scroll for anchor links
- Add scroll-triggered fade-ins using IntersectionObserver
- Include simple counters or progress bars
- Add hover effects consistently across all interactive elements

EXAMPLE STRUCTURE:
{
  "plan": {
    "seed": "...",
    "summary": "...",
    "slogan": "ShortName",
    "vibe": "...",
    "motif": "...",
    "palette": {
      "name": "...",
      "background": "#...",
      "surface": "#...",
      "primary": "#...",
      "secondary": "#...",
      "accent": "#...",
      "text": "#..."
    },
    "sections": [
      {"id": "hero", "title": "Hero"},
      {"id": "features", "title": "Features"},
      {"id": "showcase", "title": "Showcase"}
    ]
  },
  "html": "<!doctype html>\\n<html>...</html>"
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 1.5,
    top_p: 0.95,
    frequency_penalty: 1.0,
    presence_penalty: 0.8,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Seed: ${seed}\n\nCreate a COMPLETE, COHESIVE single-page website with a unified design system. Ensure every element follows consistent spacing, typography, colors, and interaction patterns. ${hint || 'Make it visually stunning but professionally cohesive!'}\n\nReturn JSON with "plan" and "html" fields.`
      }
    ],
    max_tokens: 4000,
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
    includeHeader: parsed.plan?.includeHeader !== false,
    layoutStyle: parsed.plan?.layoutStyle || 'unified'
  }

  const html = parsed.html || '<html><body>Generation failed</body></html>'

  const usage: GenUsage | undefined = response.usage
    ? {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        model: response.model || 'gpt-4o-mini',
      }
    : undefined

  return { plan, usage, html }
}
