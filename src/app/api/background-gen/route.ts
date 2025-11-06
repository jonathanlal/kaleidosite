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
    const generationPromises = Array.from({ length: missingSites }, () =>
      generateAndStore(crypto.randomUUID())
        .catch((error) => {
          console.error('[background-gen] Generation failed:', error);
          return null; // Return null for failed generations
        })
    );

    const results = await Promise.allSettled(generationPromises);

    // Only add successfully generated sites to the queue
    const newIds = results
      .filter((result): result is PromiseFulfilledResult<{ id: string; html: string; brief: string }> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value.id);

    if (newIds.length > 0) {
      await redis.lpush(PREGEN_QUEUE_KEY, ...newIds);
      console.log(`[background-gen] Added ${newIds.length}/${missingSites} sites to queue`);
    } else {
      console.warn('[background-gen] All generations failed');
    }
  }

  return NextResponse.json({ ok: true, queueSize: await redis.llen(PREGEN_QUEUE_KEY) });
}

// Vercel crons use GET, so add a GET handler
export async function GET() {
  return POST();
}
