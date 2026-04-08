import { NextResponse } from "next/server"
import { getCurrentSession } from "@/lib/auth-session"
import { getWarehouseOptions, listLocations, listVendors } from "@/lib/wms-repository"

export async function GET() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const [vendors, warehouses, locations] = await Promise.all([listVendors(), getWarehouseOptions(), listLocations()])
  return NextResponse.json({
    vendors: vendors.map((vendor) => ({ vendorId: vendor.vendorId, vendorName: vendor.vendorName })),
    warehouses,
    locations,
    locationsByWarehouse: warehouses.reduce<Record<string, typeof locations>>((output, warehouse) => {
      output[warehouse] = locations.filter((location) => location.warehouse === warehouse && location.isActive)
      return output
    }, {}),
  })
}
