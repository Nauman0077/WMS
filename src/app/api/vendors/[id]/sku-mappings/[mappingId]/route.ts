import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { removeVendorSkuMapping } from "@/lib/wms-repository"

interface RouteContext {
  params: Promise<{ id: string; mappingId: string }>
}

export async function DELETE(_: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id, mappingId } = await context.params
  const deleted = await removeVendorSkuMapping(id, mappingId)
  if (!deleted) {
    return NextResponse.json({ message: "Mapping not found" }, { status: 404 })
  }

  return NextResponse.json({ deleted: true })
}
