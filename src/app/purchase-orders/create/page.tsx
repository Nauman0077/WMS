import { PurchaseOrderCreateForm } from "@/components/purchase-order-create-form"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"

export default async function PurchaseOrderCreatePage() {
  await requireSessionOrRedirect()
  return (
    <WmsShell title="Create Purchase Order">
      <PurchaseOrderCreateForm />
    </WmsShell>
  )
}
