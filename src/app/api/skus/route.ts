import { createSku, listSkus } from "@/lib/sku-store"
import { CreateSkuInput } from "@/lib/wms-types"
import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"

export async function GET() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const skus = await listSkus()
  return NextResponse.json({ skus })
}

export async function POST(request: Request) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const body = (await request.json()) as CreateSkuInput
  const result = await createSku(body)

  if (!result.ok) {
    return NextResponse.json(
      {
        message: "Validation failed",
        errors: result.errors,
      },
      { status: 422 },
    )
  }

  return NextResponse.json({ sku: result.sku }, { status: 201 })
}
