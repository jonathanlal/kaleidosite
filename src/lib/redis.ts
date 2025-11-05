import { Redis } from '@upstash/redis'

export function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export type LockResult = { ok: boolean; token?: string }

export async function acquireLock(key: string, ttlMs: number): Promise<LockResult> {
  const redis = getRedis()
  if (!redis) return { ok: true, token: 'local-dev-no-lock' }
  const token = crypto.randomUUID()
  const ok = await redis.set(key, token, { nx: true, px: ttlMs })
  return { ok: !!ok, token: ok ? token : undefined }
}

export async function releaseLock(key: string, token?: string) {
  const redis = getRedis()
  if (!redis) return true
  if (!token) return false
  // Unlock safely only if our token matches
  const script = `
    if redis.call('get', KEYS[1]) == ARGV[1] then
      return redis.call('del', KEYS[1])
    else
      return 0
    end
  `
  try {
    await redis.eval(script, [key], [token])
    return true
  } catch {
    return false
  }
}

export async function withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>, waitMs = 115000, pollMs = 1500): Promise<T> {
  const start = Date.now()
  while (true) {
    const { ok, token } = await acquireLock(key, ttlMs)
    if (ok) {
      try {
        const res = await fn()
        return res
      } finally {
        await releaseLock(key, token)
      }
    }
    if (Date.now() - start > waitMs) {
      throw new Error('Timed out waiting for generation lock')
    }
    await new Promise((r) => setTimeout(r, pollMs))
  }
}

function minuteKey(prefix: string, t = Date.now()) {
  const m = Math.floor(t / 60000)
  return `${prefix}:${m}`
}

export async function consumeRate(limitPerMin: number): Promise<{ ok: boolean; count: number; limit: number } | null> {
  const redis = getRedis()
  if (!redis) return null
  const key = minuteKey('rate:gen')
  const count = (await redis.incr(key)) as unknown as number
  if (count === 1) {
    // expire after ~70s to allow drift
    await redis.expire(key, 70)
  }
  return { ok: count <= limitPerMin, count, limit: limitPerMin }
}

export async function getCurrentRateCount(): Promise<number | null> {
  const redis = getRedis()
  if (!redis) return null
  const key = minuteKey('rate:gen')
  const v = await redis.get<number>(key)
  return typeof v === 'number' ? v : 0
}

export async function incrCurrentRate(): Promise<number | null> {
  const redis = getRedis()
  if (!redis) return null
  const key = minuteKey('rate:gen')
  const count = (await redis.incr(key)) as unknown as number
  if (count === 1) await redis.expire(key, 70)
  return count
}
