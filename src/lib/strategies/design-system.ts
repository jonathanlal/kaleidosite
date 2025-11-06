/**
 * Strategy D: Design System First (Improved Current Approach)
 *
 * This is the current multi-pass approach but with improvements for better cohesion.
 * Delegates to the existing site-builder logic.
 */

import { createSitePlan, buildSiteFromPlan, SitePlanResult } from '../site-builder'

export async function generateDesignSystemSite(seed: string, hint?: string, options: any = {}): Promise<SitePlanResult & { html: string; imageSrc?: string }> {
  // Step 1: Generate design system and plan
  const { plan, usage: planUsage } = await createSitePlan(seed, hint)

  // Step 2: Build site from plan (generates sections)
  const { html, usage: buildUsage, imageSrc } = await buildSiteFromPlan(plan, {
    ...options,
    siteId: seed,
  })

  // Combine usage stats
  const usage = planUsage && buildUsage ? {
    inputTokens: (planUsage.inputTokens || 0) + (buildUsage.inputTokens || 0),
    outputTokens: (planUsage.outputTokens || 0) + (buildUsage.outputTokens || 0),
    model: planUsage.model || buildUsage.model || 'unknown'
  } : planUsage || buildUsage

  return { plan, usage, html, imageSrc }
}
