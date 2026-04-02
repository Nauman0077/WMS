import { deleteSku, getSkuById, patchSku } from "@/lib/wms-repository"
import { PatchSkuInput } from "@/lib/wms-types"
import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const { id } = await context.params
  const sku = await getSkuById(id)

  if (!sku) {
    return NextResponse.json({ message: "SKU not found" }, { status: 404 })
  }

  return NextResponse.json({ sku })
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const { id } = await context.params
  const body = (await request.json()) as PatchSkuInput
  const updated = await patchSku(id, body)

  if (!updated) {
    return NextResponse.json({ message: "SKU not found" }, { status: 404 })
  }

  return NextResponse.json({ sku: updated })
}

export async function DELETE(_: Request, context: RouteContext) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const result = await deleteSku(id)
  if (!result.ok) {
    return NextResponse.json({ message: "Delete blocked", errors: result.errors }, { status: 422 })
  }

  return NextResponse.json({ ok: true })
}
