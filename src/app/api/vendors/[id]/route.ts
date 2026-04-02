import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { getVendorById, patchVendor } from "@/lib/wms-repository"
import { PatchVendorInput } from "@/lib/wms-types"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const vendor = await getVendorById(id)
  if (!vendor) {
    return NextResponse.json({ message: "Vendor not found" }, { status: 404 })
  }
  return NextResponse.json({ vendor })
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const body = (await request.json()) as PatchVendorInput
  const result = await patchVendor(id, body)
  if (!result.ok) {
    return NextResponse.json({ message: "Validation failed", errors: result.errors }, { status: 422 })
  }
  return NextResponse.json({ vendor: result.vendor })
}
