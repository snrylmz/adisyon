import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/m']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const hasSession = !!req.cookies.get('adisyon_session')?.value

  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  if (hasSession && pathname === '/login') {
    const url = req.nextUrl.clone()
    url.pathname = '/tables'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/|api/|manifest.json|icons/|favicon.ico|favicon.png).*)'],
}
