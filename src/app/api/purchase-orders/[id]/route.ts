import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { deletePurchaseOrder, getPurchaseOrderById, patchPurchaseOrder } from "@/lib/wms-repository"
import { PatchPurchaseOrderInput } from "@/lib/wms-types"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const { id } = await context.params
  const purchaseOrder = await getPurchaseOrderById(id)
  if (!purchaseOrder) {
    return NextResponse.json({ message: "Purchase order not found" }, { status: 404 })
  }
  return NextResponse.json({ purchaseOrder })
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const { id } = await context.params
  const body = (await request.json()) as PatchPurchaseOrderInput
  const purchaseOrder = await patchPurchaseOrder(id, body)
  if (!purchaseOrder) {
    return NextResponse.json({ message: "Purchase order not found" }, { status: 404 })
  }
  return NextResponse.json({ purchaseOrder })
}

export async function DELETE(_: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const deleted = await deletePurchaseOrder(id)
  if (!deleted) {
    return NextResponse.json({ message: "Purchase order not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
