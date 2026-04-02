import Link from "next/link"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"
import { listPurchaseOrders } from "@/lib/wms-repository"

export default async function PurchaseOrdersPage() {
  await requireSessionOrRedirect()
  const purchaseOrders = await listPurchaseOrders()

  return (
    <WmsShell
      title="Purchase Orders"
      actions={
        <Link className="primary-link" href="/purchase-orders/create">
          Create Purchase Order
        </Link>
      }
    >
      <section className="panel table-panel">
        <div className="table-meta">Showing {purchaseOrders.length} purchase orders</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>PO ID</th>
                <th>Status</th>
                <th>Vendor</th>
                <th>Order Date</th>
                <th>Expected Date</th>
                <th>Tracking</th>
                <th>Total Amount</th>
                <th>Lines</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((po) => (
                <tr key={po.poId}>
                  <td>
                    <Link className="table-link" href={`/purchase-orders/${po.poId}`}>
                      {po.poNumber}
                    </Link>
                  </td>
                  <td>{po.poDisplayId || "-"}</td>
                  <td>{po.status}</td>
                  <td>{po.vendorName}</td>
                  <td>{po.orderDate}</td>
                  <td>{po.expectedDate}</td>
                  <td>{po.trackingNumber || "-"}</td>
                  <td>{po.totalAmount.toFixed(2)}</td>
                  <td>{po.lines.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </WmsShell>
  )
}
