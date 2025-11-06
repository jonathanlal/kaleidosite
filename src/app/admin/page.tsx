import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  getHistory,
  getRateLimit,
  getModel,
  getIncludeImage,
} from '@/lib/edge-config'
import { getLatestMeta } from '@/lib/data'
import { getCurrentRateCount } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AdminPage() {
  const token = process.env.ADMIN_TOKEN
  if (token) {
    const cs = await cookies()
    const auth = cs.get('admin')?.value
    if (auth !== token) {
      // Redirect to login page instead of 404
      redirect('/admin/login')
    }
  }

  // Check config storage type
  const hasEdgeConfig = !!(process.env.EDGE_CONFIG_ID && process.env.VERCEL_API_TOKEN)
  const storageType = hasEdgeConfig ? 'Edge Config (cloud)' : 'Local file (.data/edge.json)'

  const latestMeta = await getLatestMeta<any>();
  const latestId = latestMeta?.id;
  const latestTs = latestMeta?.ts;

  const [history, limit, count, model, includeImage] = await Promise.all([
    getHistory(),
    getRateLimit(),
    getCurrentRateCount(),
    getModel(),
    getIncludeImage(),
  ]);

  // Calculate stats
  const totalSites = history.length
  const last24h = history.filter(([_, ts]) => Date.now() - ts < 24 * 60 * 60 * 1000).length
  const lastHour = history.filter(([_, ts]) => Date.now() - ts < 60 * 60 * 1000).length

  return (
    <main className="max-w-6xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <div className="flex gap-2">
          <form action="/api/pregen" method="post">
            <button className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">Generate Now</button>
          </form>
          {token && (
            <Link href="/admin/login?logout=1" className="px-3 py-1.5 rounded-md bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium">
              Logout
            </Link>
          )}
        </div>
      </div>

      {!hasEdgeConfig && (
        <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-sm text-blue-200/90">
            <strong>ℹ️ Using local storage:</strong> Settings are saved to <code className="bg-black/30 px-1 rounded">.data/edge.json</code>
            {' '}(not persisted to cloud). To use cloud storage, set up Edge Config with <code className="bg-black/30 px-1 rounded">EDGE_CONFIG_ID</code> and <code className="bg-black/30 px-1 rounded">VERCEL_API_TOKEN</code>.
          </p>
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-lg font-medium mb-2">Latest</h2>
        <div className="rounded-lg border border-white/10 p-4 bg-white/5">
          <div>ID: {latestId ? <Link className="underline" href={`/site/${latestId}`}>{latestId}</Link> : '-'}</div>
          <div>Time: {latestTs ? new Date(latestTs).toLocaleString() : '-'}</div>
          {latestMeta ? (
            <div className="mt-2 text-sm text-white/80 space-y-1">
              <div>Model: {latestMeta.model || latestMeta.usage?.model || '-'} - Tokens in/out: {latestMeta.usage?.inputTokens ?? '-'} / {latestMeta.usage?.outputTokens ?? '-'}</div>
              <details>
                <summary className="cursor-pointer text-white/70">Brief</summary>
                <pre className="mt-1 whitespace-pre-wrap text-xs bg-black/30 p-2 rounded">{String(latestMeta.brief || '')}</pre>
              </details>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-medium mb-2">Model</h2>
        <div className="rounded-lg border border-white/10 p-4 bg-white/5 space-y-3">
          <div>Current: <code>{model || process.env.OPENAI_MODEL || 'gpt-4o-mini'}</code></div>
          <form action="/api/config/model" method="post" className="flex items-center gap-2">
            <select name="model" className="px-2 py-1 rounded-md bg-black/40 border border-white/10">
              <option value="gpt-4o-mini">gpt-4o-mini (low cost, strong)</option>
              <option value="gpt-5-nano">gpt-5-nano (cheap, fast)</option>
              <option value="gpt-4o">gpt-4o (higher quality)</option>
            </select>
            <button className="px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium">Update</button>
          </form>
          <div className="text-xs text-white/60">Stored in {storageType}. {hasEdgeConfig ? 'Changes sync across all instances.' : 'Local changes only - not synced to deployments.'}</div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-medium mb-2">Image Generation</h2>
        <div className="rounded-lg border border-white/10 p-4 bg-white/5 space-y-3">
          <form action="/api/config/image/include" method="post" className="flex items-center gap-2">
            <input type="checkbox" name="includeImage" defaultChecked={includeImage ?? false} />
            <label>Include AI-Generated Hero Images</label>
            <button className="px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium">Update</button>
          </form>
          <div className="text-xs text-white/60">
            Images are generated contextually based on each site's unique theme, colors, vibe, and summary.
            Each site gets a custom image that matches its aesthetic.
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-medium mb-2">Statistics</h2>
        <div className="rounded-lg border border-white/10 p-4 bg-white/5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-emerald-400">{totalSites}</div>
              <div className="text-sm text-white/70">Total Sites Generated</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">{last24h}</div>
              <div className="text-sm text-white/70">Last 24 Hours</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{lastHour}</div>
              <div className="text-sm text-white/70">Last Hour</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-medium mb-2">Rate Limit</h2>
        <div className="rounded-lg border border-white/10 p-4 bg-white/5 space-y-3">
          <div>
            Current: {limit ?? 'unlimited'} per minute - This minute: {count ?? 'n/a'} {typeof limit === 'number' ? ` / ${limit}` : ''}
          </div>
          <form action="/api/config/rate" method="post" className="flex items-center gap-2">
            <input type="number" name="limit" min={1} step={1} placeholder="per minute" className="px-2 py-1 rounded-md bg-black/40 border border-white/10" />
            <button className="px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium">Update</button>
          </form>
          <div className="text-xs text-white/60">Uses Upstash Redis to count this-minute generations. Set UPSTASH env vars for accurate counts and to enforce limits.</div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Generation History</h2>
        <div className="rounded-lg border border-white/10 divide-y divide-white/10 bg-white/5 max-h-[600px] overflow-y-auto">
          {history.length === 0 ? (
            <div className="p-4 text-white/70">No sites generated yet. Click "Generate Now" to create your first site!</div>
          ) : (
            history.slice(0, 100).map(([id, ts]) => {
              const timeAgo = Date.now() - ts
              const minutes = Math.floor(timeAgo / 60000)
              const hours = Math.floor(timeAgo / 3600000)
              const days = Math.floor(timeAgo / 86400000)
              const timeStr = days > 0 ? `${days}d ago` : hours > 0 ? `${hours}h ago` : minutes > 0 ? `${minutes}m ago` : 'just now'

              return (
                <div key={id + ts} className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="truncate max-w-[70%]">
                    <Link className="underline hover:text-primary transition-colors" href={`/site/${id}`}>{id}</Link>
                  </div>
                  <div className="text-white/70 text-sm flex items-center gap-2">
                    <span className="hidden sm:inline">{new Date(ts).toLocaleString()}</span>
                    <span className="sm:hidden">{timeStr}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>
    </main>
  )
}