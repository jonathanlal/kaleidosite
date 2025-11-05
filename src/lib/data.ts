import { getRedis } from './redis';
import { uploadJson } from './blob';

const PREGEN_QUEUE_KEY = 'pregen_queue';

export async function getLatestMeta<T = any>(): Promise<T | null> {
  const blobUrlBase = process.env.BLOB_URL;
  if (!blobUrlBase) {
    throw new Error("BLOB_URL environment variable is not set.");
  }
  const blobUrl = `${blobUrlBase}/kaleidosite/latest_meta.json`;
  try {
    const response = await fetch(blobUrl, { next: { revalidate: 10 } }); // Revalidate every 10 seconds
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function getPregenQueue(): Promise<string[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    return await redis.lrange(PREGEN_QUEUE_KEY, 0, -1);
  } catch {
    return [];
  }
}

export async function updatePregenQueue(queue: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.ltrim(PREGEN_QUEUE_KEY, queue.length, -1);
}

export async function addSiteToPregenQueue(id: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.lpush(PREGEN_QUEUE_KEY, id);
}