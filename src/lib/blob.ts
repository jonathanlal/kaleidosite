import { put } from '@vercel/blob'

const TOKEN_ENV_KEYS = [
  'BLOB_READ_WRITE_TOKEN',
  'VERCEL_BLOB_READ_WRITE_TOKEN',
  'BLOB_TOKEN',
]

function getBlobToken(): string | undefined {
  for (const key of TOKEN_ENV_KEYS) {
    const value = process.env[key]
    if (value) return value
  }
  return undefined
}

export async function uploadImageFromBase64(name: string, base64: string): Promise<string | null> {
  const token = getBlobToken()
  if (!token) return null
  try {
    const buffer = Buffer.from(base64, 'base64')
    const result = await put(`kaleidosite/${name}.png`, buffer, {
      access: 'public',
      contentType: 'image/png',
      addRandomSuffix: true,
      token,
    })
    return result.url
  } catch (err) {
    console.error('[blob] upload failed', err)
    return null
  }
}

export async function uploadHtml(name: string, html: string): Promise<string | null> {
  const token = getBlobToken()
  if (!token) return null
  try {
    const result = await put(`kaleidosite/${name}`, html, {
      access: 'public',
      contentType: 'text/html; charset=utf-8',
      addRandomSuffix: false,
      token,
    })
    return result.url
  } catch (err) {
    console.error('[blob] html upload failed', err)
    return null
  }
}

export async function uploadJson(name: string, data: any): Promise<string | null> {
  const token = getBlobToken()
  if (!token) return null
  try {
    const result = await put(`kaleidosite/${name}.json`, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      token,
    })
    return result.url
  } catch (err) {
    console.error('[blob] json upload failed', err)
    return null
  }
}