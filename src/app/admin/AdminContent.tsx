'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface GroupedSite {
  id: string
  html?: string
  json?: string
  images: string[]
  uploadedAt?: string
}

interface BlobInfo {
  url: string
  pathname: string
  size: number
  uploadedAt: string
}

export function SitesManager() {
  const [sites, setSites] = useState<GroupedSite[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchSites = async () => {
    try {
      const res = await fetch('/api/site/list')
      const data = await res.json()
      if (data.ok) {
        setSites(data.sites || [])
      }
    } catch (err) {
      console.error('Failed to fetch sites:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSites()
  }, [])

  const handleDelete = async (siteId: string) => {
    if (!confirm(`Are you sure you want to delete site "${siteId}"? This will also delete all associated images.`)) {
      return
    }

    setDeleting(siteId)
    try {
      const res = await fetch('/api/site/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId })
      })
      const data = await res.json()
      if (data.ok) {
        setSites(sites.filter(s => s.id !== siteId))
      } else {
        alert(`Failed to delete: ${data.error}`)
      }
    } catch (err) {
      alert(`Failed to delete: ${err}`)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return <div className="p-4 text-white/70">Loading sites...</div>
  }

  if (sites.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 p-4 bg-white/5">
        <div className="text-white/70">
          No sites generated yet. Click "Generate Now" to create your first site!
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-white/10 divide-y divide-white/10 bg-white/5 max-h-[600px] overflow-y-auto">
      {sites.map((site) => {
        const timeAgo = site.uploadedAt ? (() => {
          const diff = Date.now() - new Date(site.uploadedAt).getTime()
          const minutes = Math.floor(diff / 60000)
          const hours = Math.floor(diff / 3600000)
          const days = Math.floor(diff / 86400000)
          return days > 0 ? `${days}d ago` : hours > 0 ? `${hours}h ago` : minutes > 0 ? `${minutes}m ago` : 'just now'
        })() : ''

        return (
          <div key={site.id} className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link
                  className="underline hover:text-primary transition-colors font-medium truncate"
                  href={`/site/${site.id}`}
                >
                  {site.id}
                </Link>
                {site.images.length > 0 && (
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                    {site.images.length} image{site.images.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="text-xs text-white/60 flex items-center gap-3">
                {timeAgo && <span>{timeAgo}</span>}
                {site.uploadedAt && (
                  <span className="hidden sm:inline">
                    {new Date(site.uploadedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDelete(site.id)}
              disabled={deleting === site.id}
              className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {deleting === site.id ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function ImagesGallery() {
  const [images, setImages] = useState<BlobInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch('/api/site/list')
        const data = await res.json()
        if (data.ok) {
          setImages(data.images || [])
        }
      } catch (err) {
        console.error('Failed to fetch images:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchImages()
  }, [])

  if (loading) {
    return <div className="p-4 text-white/70">Loading images...</div>
  }

  if (images.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 p-4 bg-white/5">
        <div className="text-white/70">No images generated yet.</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {images.map((img) => (
        <a
          key={img.url}
          href={img.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-primary transition-colors bg-black/40"
        >
          <img
            src={img.url}
            alt="Generated"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-2 text-xs text-white/90 truncate">
              {img.pathname.split('/').pop()}
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}
