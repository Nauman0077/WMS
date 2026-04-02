import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { createPurchaseOrder, listPurchaseOrders } from "@/lib/wms-repository"
import { CreatePurchaseOrderInput } from "@/lib/wms-types"

export async function GET() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const purchaseOrders = await listPurchaseOrders()
  return NextResponse.json({ purchaseOrders })
}

export async function POST(request: Request) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const body = (await request.json()) as CreatePurchaseOrderInput
  const result = await createPurchaseOrder(body, session.username)

  if (!result.ok) {
    return NextResponse.json({ message: "Validation failed", errors: result.errors }, { status: 422 })
  }
  return NextResponse.json({ purchaseOrder: result.purchaseOrder }, { status: 201 })
}
