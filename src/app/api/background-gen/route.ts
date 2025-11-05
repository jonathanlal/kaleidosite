import { NextResponse } from 'next/server'
import { generateAndStore } from '@/lib/generate'
import { getRedis } from '@/lib/redis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PREGEN_QUEUE_KEY = 'pregen_queue';
const PREGEN_QUEUE_SIZE = 5;

export async function POST() {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ ok: false, error: 'Redis not configured' }, { status: 500 });
  }

  const currentSize = await redis.llen(PREGEN_QUEUE_KEY);
  const missingSites = PREGEN_QUEUE_SIZE - currentSize;

  if (missingSites > 0) {
    const generationPromises = Array.from({ length: missingSites }, () => generateAndStore(crypto.randomUUID()));
    const newSites = await Promise.all(generationPromises);
    const newIds = newSites.map(site => site.id);
    
    if (newIds.length > 0) {
      await redis.lpush(PREGEN_QUEUE_KEY, ...newIds);
    }
  }

  return NextResponse.json({ ok: true });
}
