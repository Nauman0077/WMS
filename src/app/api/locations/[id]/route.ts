import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { getLocationById, listLocationBalancesForLocation, patchLocation } from "@/lib/wms-repository"
import { PatchLocationInput } from "@/lib/wms-types"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const location = await getLocationById(id)
  if (!location) {
    return NextResponse.json({ message: "Location not found" }, { status: 404 })
  }

  const balances = await listLocationBalancesForLocation(id)
  return NextResponse.json({ location, balances })
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const body = (await request.json()) as PatchLocationInput
  const result = await patchLocation(id, body)
  if (!result) {
    return NextResponse.json({ message: "Location not found" }, { status: 404 })
  }
  if ("ok" in result && result.ok === false) {
    return NextResponse.json({ message: "Validation failed", errors: result.errors }, { status: 422 })
  }

  return NextResponse.json({ location: result })
}
