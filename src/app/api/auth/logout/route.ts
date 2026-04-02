import { NextResponse } from "next/server"
import { SESSION_COOKIE_NAME } from "@/lib/auth-session"
import { revokeSession } from "@/lib/wms-repository"

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? ""
  const token = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.split("=")[1]

  if (token) {
    await revokeSession(token)
  }

  const response = NextResponse.json({ message: "Logged out." })
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    path: "/",
    expires: new Date(0),
  })
  return response
}
