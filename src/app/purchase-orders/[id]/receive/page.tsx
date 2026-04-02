import { notFound } from "next/navigation"
import { PurchaseOrderReceiver } from "@/components/purchase-order-receiver"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"
import { getPurchaseOrderById } from "@/lib/wms-repository"

interface PurchaseOrderReceivePageProps {
  params: Promise<{ id: string }>
}

export default async function PurchaseOrderReceivePage({ params }: PurchaseOrderReceivePageProps) {
  await requireSessionOrRedirect()
  const { id } = await params
  const purchaseOrder = await getPurchaseOrderById(id)

  if (!purchaseOrder) {
    notFound()
  }

  return (
    <WmsShell title={`Receive PO: ${purchaseOrder.poNumber}`}>
      <PurchaseOrderReceiver purchaseOrder={purchaseOrder} />
    </WmsShell>
  )
}
