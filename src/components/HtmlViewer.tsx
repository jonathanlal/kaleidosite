"use client"

import { useMemo, useState } from 'react'

export default function HtmlViewer({ html, id }: { html: string; id?: string }) {
  const sanitized = useMemo(() => sanitize(html), [html])
  const [loading, setLoading] = useState(false)
  async function handleNew() {
    try {
      setLoading(true)
      await fetch('/api/pregen', { method: 'POST', keepalive: true })
      location.reload()
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-white/80 text-sm">
          {id ? (
            <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 border border-white/15">
              <span className="text-white/60">Latest ID</span>
              <code className="text-white text-xs">{id}</code>
              <a className="underline hover:no-underline" href={`/site/${id}`}>Permalink</a>
            </span>
          ) : (
            <span className="opacity-70">Generated</span>
          )}
        </div>
        <div className="space-x-2">
          <button onClick={handleNew} disabled={loading} className="px-3 py-1.5 rounded-md bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white text-sm font-medium">
            {loading ? 'Generating…' : 'New Site'}
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-white/10 shadow-xl bg-white/5 backdrop-blur overflow-hidden">
        <iframe
          title="Generated Site"
          sandbox=""
          srcDoc={sanitized}
          className="w-full h-[78vh] bg-black"
        />
      </div>
      <div className="mt-4 text-xs text-white/50">
        Rendered in a sandboxed iframe (scripts disabled) for safety.
      </div>
    </div>
  )
}

function sanitize(input: string): string {
  try {
    let out = input || ''
    // Strip <script> blocks
    out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    // Remove inline event handlers like onclick="..."
    out = out.replace(/ on[a-z]+\s*=\s*"[^"]*"/gi, '')
    out = out.replace(/ on[a-z]+\s*=\s*'[^']*'/gi, '')
    out = out.replace(/ on[a-z]+\s*=\s*[^\s>]+/gi, '')
    // Disallow embedding external fonts/images via http(s) if present
    out = out.replace(/url\(\s*(['"])https?:\/\/[^)]+\1\s*\)/gi, 'none')
    return out
  } catch {
    return '<!doctype html><html><head><meta charset="utf-8"><style>body{background:#000;color:#fff;font:14px/1.5 system-ui;padding:24px}</style></head><body>Failed to render document.</body></html>'
  }
}
