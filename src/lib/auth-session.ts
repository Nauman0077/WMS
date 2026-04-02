import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { getSessionByToken } from "@/lib/wms-repository"

export const SESSION_COOKIE_NAME = "wms_session"

export async function getCurrentSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? ""
  if (!token) {
    return undefined
  }
  return getSessionByToken(token)
}

export async function requireSessionOrRedirect() {
  const session = await getCurrentSession()
  if (!session) {
    redirect("/auth/login")
  }
  return session
}

export async function requestMetadata() {
  const headerStore = await headers()
  return {
    ip: headerStore.get("x-forwarded-for") ?? "local",
    userAgent: headerStore.get("user-agent") ?? "unknown",
  }
}
