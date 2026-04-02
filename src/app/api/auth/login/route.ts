import { NextResponse } from "next/server"
import { SESSION_COOKIE_NAME, requestMetadata } from "@/lib/auth-session"
import { authenticateUser, createUserSession } from "@/lib/wms-repository"
import { LoginInput } from "@/lib/wms-types"

export async function POST(request: Request) {
  const body = (await request.json()) as LoginInput
  const usernameOrEmail = body.usernameOrEmail?.trim() ?? ""
  const password = body.password ?? ""

  if (!usernameOrEmail || !password) {
    return NextResponse.json(
      { message: "Username/email and password are required." },
      { status: 400 },
    )
  }

  const user = await authenticateUser({ usernameOrEmail, password })
  if (!user) {
    return NextResponse.json({ message: "Invalid credentials." }, { status: 401 })
  }

  const metadata = await requestMetadata()
  const session = await createUserSession(user, metadata)
  const response = NextResponse.json({
    message: "Logged in successfully.",
    user: {
      userId: user.userId,
      username: user.username,
      role: user.role,
    },
  })

  response.cookies.set(SESSION_COOKIE_NAME, session.sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: new Date(session.expiresAt),
  })

  return response
}
