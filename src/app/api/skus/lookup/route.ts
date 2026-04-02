import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { getSkuLookup } from "@/lib/wms-repository"

export async function GET() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const skus = await getSkuLookup()
  return NextResponse.json({ skus })
}
