import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { createOrder, listOrders } from "@/lib/wms-repository"
import { CreateOrderInput } from "@/lib/wms-types"

export async function GET() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const orders = await listOrders()
  return NextResponse.json({ orders })
}

export async function POST(request: Request) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as CreateOrderInput
  const result = await createOrder(body, session.username)
  if (!result.ok) {
    return NextResponse.json({ message: "Validation failed", errors: result.errors }, { status: 422 })
  }

  return NextResponse.json({ order: result.order }, { status: 201 })
}
