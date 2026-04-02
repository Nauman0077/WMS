import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { assignVendorSku, listVendorSkuMappings } from "@/lib/wms-repository"
import { CreateVendorSkuInput } from "@/lib/wms-types"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const mappings = await listVendorSkuMappings(id)
  return NextResponse.json({ mappings })
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const body = (await request.json()) as CreateVendorSkuInput
  const result = await assignVendorSku(id, body)
  if (!result.ok) {
    return NextResponse.json({ message: "Validation failed", errors: result.errors }, { status: 422 })
  }
  return NextResponse.json({ mapping: result.mapping }, { status: 201 })
}
