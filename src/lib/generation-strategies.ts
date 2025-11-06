// Generation strategy types

export type GenerationStrategy =
  | 'single-pass'        // A: Generate entire HTML in one API call
  | 'template-based'     // B: Use predefined templates, AI fills content
  | 'component-library'  // C: Reusable components, AI composes
  | 'design-system'      // D: Design system first, then sections (improved current)

export const GENERATION_STRATEGIES: Record<GenerationStrategy, { name: string; description: string }> = {
  'single-pass': {
    name: 'Single-Pass Full Site',
    description: 'Generates the entire HTML in one API call for maximum cohesion. Best for consistent, unified designs.'
  },
  'template-based': {
    name: 'Template-Based',
    description: 'Uses predefined section templates that AI fills with content. Most reliable and fast.'
  },
  'component-library': {
    name: 'Component Library',
    description: 'AI composes sections using reusable components. Flexible with consistent building blocks.'
  },
  'design-system': {
    name: 'Design System First',
    description: 'Generates design system first, then sections following strict rules. Current approach, improved.'
  }
}

export const DEFAULT_GENERATION_STRATEGY: GenerationStrategy = 'single-pass'
