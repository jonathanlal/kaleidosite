/**
 * Strategy Router
 *
 * Routes to the appropriate generation strategy based on configuration.
 */

import { getGenerationStrategy } from '../edge-config'
import { SitePlanResult } from '../site-builder'
import { generateSinglePassSite } from './single-pass'
import { generateTemplateBasedSite } from './template-based'
import { generateComponentLibrarySite } from './component-library'
import { generateDesignSystemSite } from './design-system'

export async function generateSite(
  seed: string,
  hint?: string,
  options: any = {}
): Promise<SitePlanResult & { html: string; imageSrc?: string }> {
  const strategy = await getGenerationStrategy()

  console.log(`[strategy-router] Using generation strategy: ${strategy}`)

  switch (strategy) {
    case 'single-pass':
      return await generateSinglePassSite(seed, hint)

    case 'template-based':
      return await generateTemplateBasedSite(seed, hint)

    case 'component-library':
      return await generateComponentLibrarySite(seed, hint)

    case 'design-system':
    default:
      return await generateDesignSystemSite(seed, hint, options)
  }
}
