import { OrderCreateForm } from "@/components/order-create-form"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"

export default async function CreateOrderPage() {
  await requireSessionOrRedirect()

  return (
    <WmsShell title="Create Order">
      <OrderCreateForm />
    </WmsShell>
  )
}
