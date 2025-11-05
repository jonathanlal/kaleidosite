export async function getLatestMeta<T = any>(): Promise<T | null> {
  const blobUrl = `${process.env.BLOB_URL}/kaleidosite/latest_meta.json`;
  try {
    const response = await fetch(blobUrl, { next: { revalidate: 10 } }); // Revalidate every 10 seconds
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
