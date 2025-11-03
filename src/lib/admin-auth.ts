export function isAdminRequest(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN
  if (!token) return true
  const hdr = req.headers.get('x-admin-token') || ''
  if (hdr && hdr === token) return true
  const cookie = req.headers.get('cookie') || ''
  if (cookie.split(/;\s*/).some((p) => p === `admin=${token}`)) return true
  return false
}

export function unauthorized(): Response {
  return new Response('Not Found', { status: 404 })
}

