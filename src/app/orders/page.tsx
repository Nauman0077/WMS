import Link from "next/link"
import { OrdersListClient } from "@/components/orders-list-client"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"
import { listOrders } from "@/lib/wms-repository"

export default async function OrdersPage() {
  await requireSessionOrRedirect()
  const orders = await listOrders()

  return (
    <WmsShell
      title="Orders"
      actions={
        <Link className="primary-link" href="/orders/create">
          Create Order
        </Link>
      }
    >
      <OrdersListClient orders={orders} />
    </WmsShell>
  )
}
