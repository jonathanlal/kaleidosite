import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname === '/favicon.ico') {
    const url = new URL('/icon.svg', req.url)
    const res = NextResponse.rewrite(url)
    res.headers.set('Cache-Control', 'no-store')
    return res
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/favicon.ico'],
}

