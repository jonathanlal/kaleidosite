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
  if (!token) {
    console.warn('[blob] No token found - image upload skipped (set BLOB_READ_WRITE_TOKEN)')
    return null
  }
  try {
    const buffer = Buffer.from(base64, 'base64')
    console.log('[blob] Uploading image:', name, 'size:', buffer.length, 'bytes')
    const result = await put(`kaleidosite/${name}.png`, buffer, {
      access: 'public',
      contentType: 'image/png',
      addRandomSuffix: true,
      token,
    })
    console.log('[blob] Image uploaded successfully:', result.url)
    return result.url
  } catch (err) {
    console.error('[blob] Image upload failed:', err)
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
    // Don't add .json extension if already present
    const fileName = name.endsWith('.json') ? name : `${name}.json`
    const result = await put(`kaleidosite/${fileName}`, JSON.stringify(data), {
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