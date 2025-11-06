import { NextResponse } from 'next/server'
import { listAllBlobs } from '@/lib/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface GroupedSite {
  id: string
  html?: string
  json?: string
  images: string[]
  uploadedAt?: Date
}

export async function GET() {
  try {
    const blobs = await listAllBlobs()

    // Group blobs by site ID
    const sitesMap = new Map<string, GroupedSite>()

    for (const blob of blobs) {
      const pathname = new URL(blob.url).pathname
      const filename = pathname.split('/').pop() || ''

      // Extract site ID from filename
      let siteId: string | null = null

      if (filename.endsWith('.html')) {
        siteId = filename.replace('.html', '')
      } else if (filename.endsWith('.json') && filename !== 'latest_meta.json') {
        siteId = filename.replace('.json', '')
      } else if (filename.match(/\.png$/)) {
        // Extract site ID from image filename (format: siteId-randomsuffix.png)
        const match = filename.match(/^(.+?)-[a-zA-Z0-9]+\.png$/)
        if (match) siteId = match[1]
      }

      if (!siteId) continue

      if (!sitesMap.has(siteId)) {
        sitesMap.set(siteId, { id: siteId, images: [] })
      }

      const site = sitesMap.get(siteId)!

      if (filename.endsWith('.html')) {
        site.html = blob.url
        site.uploadedAt = new Date(blob.uploadedAt)
      } else if (filename.endsWith('.json')) {
        site.json = blob.url
      } else if (filename.endsWith('.png')) {
        site.images.push(blob.url)
      }
    }

    // Convert map to array and sort by upload date
    const sites = Array.from(sitesMap.values())
      .sort((a, b) => {
        const aTime = a.uploadedAt?.getTime() || 0
        const bTime = b.uploadedAt?.getTime() || 0
        return bTime - aTime // Most recent first
      })

    // Also get just images
    const allImages = blobs
      .filter(blob => blob.url.endsWith('.png'))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

    return NextResponse.json({
      ok: true,
      sites,
      images: allImages,
      totalBlobs: blobs.length
    })
  } catch (e: any) {
    console.error('[list-sites] Failed:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'list failed' }, { status: 500 })
  }
}
