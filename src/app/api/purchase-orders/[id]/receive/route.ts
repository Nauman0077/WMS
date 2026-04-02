import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { receivePurchaseOrder } from "@/lib/wms-repository"
import { ReceivePurchaseOrderInput } from "@/lib/wms-types"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const { id } = await context.params
  const body = (await request.json()) as ReceivePurchaseOrderInput
  const result = await receivePurchaseOrder(id, body)

  if (!result.ok) {
    return NextResponse.json({ message: "Validation failed", errors: result.errors }, { status: 422 })
  }

  return NextResponse.json({ purchaseOrder: result.purchaseOrder })
}
