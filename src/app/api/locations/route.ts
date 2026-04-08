import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { createLocation, listLocations } from "@/lib/wms-repository"
import { CreateLocationInput } from "@/lib/wms-types"

export async function GET() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const locations = await listLocations()
  return NextResponse.json({ locations })
}

export async function POST(request: Request) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as CreateLocationInput
  const result = await createLocation(body)
  if (!result.ok) {
    return NextResponse.json({ message: "Validation failed", errors: result.errors }, { status: 422 })
  }

  return NextResponse.json({ location: result.location }, { status: 201 })
}
