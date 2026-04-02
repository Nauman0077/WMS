import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { getVendorAllowedSkus } from "@/lib/wms-repository"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const { id } = await context.params
  const skus = await getVendorAllowedSkus(id)
  return NextResponse.json({ skus })
}
