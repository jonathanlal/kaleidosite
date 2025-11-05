# KaleidoSite

Generate a wild, over-the-top, single-file HTML website on every visit. Each site is stored as one HTML string in Vercel Edge Config under a unique UUID. The homepage renders the latest HTML directly (no iframe) and floats a tiny control bar so you can queue a fresh site.

## Quick Start

- Node 18+ recommended
- Copy `.env.example` to `.env.local` and fill values:
  - `OPENAI_API_KEY` — OpenAI API key
  - `EDGE_CONFIG` — Edge Config read URL (includes token)
  - `EDGE_CONFIG_ID` — Edge Config ID (for writes)
  - `VERCEL_API_TOKEN` — Vercel API token with permission to write Edge Config items
  - Optional: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` for locking/queueing and rate limits
  - Optional: `ADMIN_TOKEN` to protect `/admin` and config endpoints
  - Optional: `OPENAI_MODEL`, `OPENAI_FALLBACK_MODEL` to select models

```
npm install
npm run dev
```

Visit `http://localhost:3000`. Each visit serves the latest site and the floating control bar shows the current ID, a permalink, and a “New Site” button. Admin at `/admin` shows status, recent IDs, token/meta of the latest, and lets you set a per‑minute generation cap. Permalink at `/site/{id}`.

If `OPENAI_API_KEY` isn’t set yet, the homepage displays a friendly placeholder. Once envs are configured, use the “New Site” button or just refresh to queue background generation.

## How It Works

- A planning agent (gpt-5-nano) generates a palette, vibe, motifs, and section roadmap before each build.
- Home page loads the latest generated HTML from Edge Config (key: `site_latest:html`).
- If none exists (first run), it generates one synchronously and sets it as latest (with a graceful placeholder when envs are missing).
- A small inline script (added during post-processing) calls `/api/pregen` to queue the next generation after each page view.
- The `/api/pregen` route uses an Upstash Redis lock to ensure only one generation at a time. If a request arrives during processing, it waits and then runs its own generation, effectively queueing.
- Each section of the site is generated individually (using the selected gpt-4o* model) and then woven together with shared styles and navigation.
- Each completed generation stores the HTML at `site_{uuid}` and updates `site_latest:id` and `site_latest:html`.
- A compact history array `site_index` stores up to the last 200 `[id, ts]` pairs.
- Latest meta `site_latest:meta` stores `{ id, ts, brief, usage: { inputTokens, outputTokens, model } }`.

## Vercel Edge Config

- Reads use the SDK `@vercel/edge-config` and require `EDGE_CONFIG` env var set to the read URL.
- Writes use Vercel REST: `PATCH /v1/edge-config/{id}/items` using `VERCEL_API_TOKEN`.
- Keys:
  - `site_{uuid}` with `value` as the HTML string (individual archive)
  - `site_latest:id`, `site_latest:html`, `site_latest:ts` for the instant-serve latest
  - `site_index` as `[[id, ts], ...]` (capped)
- Tip: Keep HTML under ~35KB to avoid hitting per-item limits and keep costs low.

## Environment Vars

- `OPENAI_API_KEY`: required
- `EDGE_CONFIG`: read URL, e.g. `https://edge-config.vercel.com/<id>/items?token=ecfg_tr_xxx`
- `EDGE_CONFIG_ID`: the Edge Config ID
- `VERCEL_API_TOKEN`: token with Edge Config write permission
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: optional; enable locking/queuing (recommended)
  - Also used for per-minute rate limiting. Configure a cap at `/admin`.
  - Provisioning via the Vercel KV add-on will give you `KV_REST_API_URL` and `KV_REST_API_TOKEN` instead—drop those into `.env.local` and the app will pick them up automatically.
- `BLOB_READ_WRITE_TOKEN`: optional but recommended if you enable image generation. The app uploads images to Vercel Blob storage and stores only the URL in Edge Config to stay under size limits.
- `ADMIN_TOKEN`: optional; when set, protects `/admin` and config routes. Send header `x-admin-token: <token>` or login via `/api/admin/login` to set a cookie.
- `OPENAI_MODEL`, `OPENAI_FALLBACK_MODEL`: optional; override the defaults used in generation (defaults: `gpt-4o-mini`, fallback `gpt-4o`).

## Notes

- Security: The homepage renders the raw HTML (scripts included) so you can experience the site exactly as generated. Keep your admin token secret and only share permalinks you trust.
- Costs: `gpt-4o-mini` keeps per-generation cost low.
- Extensibility: Add an image toggle with `gpt-image-1` later, and a rate-limit middleware (Upstash) for budget protection.



