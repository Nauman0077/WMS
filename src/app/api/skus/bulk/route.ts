import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { bulkPatchSkus } from "@/lib/wms-repository"
import { BulkPatchSkusInput } from "@/lib/wms-types"

export async function PATCH(request: Request) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as BulkPatchSkusInput
  const result = await bulkPatchSkus(body)
  if (!result.ok) {
    return NextResponse.json({ message: "Validation failed", errors: result.errors }, { status: 422 })
  }

  return NextResponse.json({ updatedCount: result.updatedCount })
}
