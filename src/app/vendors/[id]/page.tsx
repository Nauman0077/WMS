import { notFound } from "next/navigation"
import { VendorForm } from "@/components/vendor-form"
import { VendorSkuManager } from "@/components/vendor-sku-manager"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"
import { getVendorById } from "@/lib/wms-repository"

interface VendorDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function VendorDetailPage({ params }: VendorDetailPageProps) {
  await requireSessionOrRedirect()
  const { id } = await params
  const vendor = await getVendorById(id)

  if (!vendor) {
    notFound()
  }

  return (
    <WmsShell title={`Vendor: ${vendor.vendorName}`}>
      <VendorForm mode="edit" vendorId={vendor.vendorId} initialVendor={vendor} />
      <VendorSkuManager vendorId={vendor.vendorId} />
    </WmsShell>
  )
}
