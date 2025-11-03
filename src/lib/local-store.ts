import { promises as fs } from 'fs'
import path from 'path'

type Store = Record<string, any>

const DATA_DIR = path.join(process.cwd(), '.data')
const STORE_PATH = path.join(DATA_DIR, 'edge.json')

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch {}
}

async function readStore(): Promise<Store> {
  try {
    const buf = await fs.readFile(STORE_PATH)
    return JSON.parse(buf.toString('utf8')) as Store
  } catch {
    return {}
  }
}

async function writeStore(data: Store) {
  await ensureDir()
  const json = JSON.stringify(data, null, 0)
  await fs.writeFile(STORE_PATH, json, 'utf8')
}

export async function localGet<T = any>(key: string): Promise<T | null> {
  const data = await readStore()
  return (key in data ? (data as any)[key] : null) as T | null
}

export async function localSet(key: string, value: any) {
  const data = await readStore()
  ;(data as any)[key] = value
  await writeStore(data)
}

