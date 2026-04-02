import { SkuCreateForm } from "@/components/sku-create-form"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"

export default async function CreateProductPage() {
  await requireSessionOrRedirect()
  return (
    <WmsShell title="Add Product">
      <SkuCreateForm />
    </WmsShell>
  )
}
