import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { createVendor, listVendors } from "@/lib/wms-repository"
import { CreateVendorInput } from "@/lib/wms-types"

export async function GET() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const vendors = await listVendors()
  return NextResponse.json({ vendors })
}

export async function POST(request: Request) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const body = (await request.json()) as CreateVendorInput
  const result = await createVendor(body)
  if (!result.ok) {
    return NextResponse.json({ message: "Validation failed", errors: result.errors }, { status: 422 })
  }
  return NextResponse.json({ vendor: result.vendor }, { status: 201 })
}
