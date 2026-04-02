import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { getWarehouseOptions, listVendors } from "@/lib/wms-repository"

export async function GET() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const [vendors, warehouses] = await Promise.all([listVendors(), getWarehouseOptions()])
  return NextResponse.json({
    vendors: vendors.map((vendor) => ({ vendorId: vendor.vendorId, vendorName: vendor.vendorName })),
    warehouses,
  })
}
