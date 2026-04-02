import { VendorForm } from "@/components/vendor-form"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"

export default async function CreateVendorPage() {
  await requireSessionOrRedirect()
  return (
    <WmsShell title="Create Vendor">
      <VendorForm mode="create" />
    </WmsShell>
  )
}
