import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { getOrderById, patchOrder } from "@/lib/wms-repository"
import { PatchOrderInput } from "@/lib/wms-types"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const order = await getOrderById(id)
  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 })
  }

  return NextResponse.json({ order })
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const body = (await request.json()) as PatchOrderInput
  const updated = await patchOrder(id, body)
  if (!updated) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 })
  }

  return NextResponse.json({ order: updated })
}
