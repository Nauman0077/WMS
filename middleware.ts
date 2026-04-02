import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/auth/login", "/auth/signup"]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path))
}

function isBypassPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isBypassPath(pathname)) {
    return NextResponse.next()
  }

  const sessionToken = request.cookies.get("wms_session")?.value

  if (!sessionToken && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  if (sessionToken && isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/home", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/:path*"],
}
