import { notFound } from "next/navigation"
import { OrderHeaderEditor } from "@/components/order-header-editor"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"
import { getOrderById } from "@/lib/wms-repository"

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  await requireSessionOrRedirect()
  const { id } = await params
  const order = await getOrderById(id)
  if (!order) {
    notFound()
  }

  return (
    <WmsShell title={`Order: ${order.orderNumber}`}>
      <div className="order-detail-layout">
        <div className="order-main-stack">
          <section className="panel panel-elevated">
            <div className="panel-title">Line Items</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Allocated Warehouse</th>
                    <th>Pending Fulfillment</th>
                    <th>Ordered</th>
                    <th>Shipped</th>
                    <th>Total Allocated</th>
                    <th>Total Backordered</th>
                    <th>Unit Price</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((line) => (
                    <tr key={line.lineId}>
                      <td>
                        <strong>{line.productName}</strong>
                        <br />
                        <span className="status-note" style={{ margin: 0 }}>SKU: {line.skuCode}</span>
                      </td>
                      <td>{line.allocatedWarehouse || "-"}</td>
                      <td>{line.pendingFulfillment}</td>
                      <td>{line.quantity}</td>
                      <td>{line.quantityShipped}</td>
                      <td>{line.quantityAllocated}</td>
                      <td>{line.quantityBackordered}</td>
                      <td>{line.unitPrice.toFixed(2)}</td>
                      <td>{line.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel spaced-panel panel-elevated">
            <div className="panel-title">Order History</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>User</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {order.history.length === 0 ? (
                    <tr>
                      <td colSpan={3}>No history entries.</td>
                    </tr>
                  ) : (
                    order.history.map((entry) => (
                      <tr key={entry.historyId}>
                        <td>{new Date(entry.createdAt).toLocaleString()}</td>
                        <td>{entry.changedBy}</td>
                        <td>{entry.eventMessage}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="order-sidebar-stack">
          <OrderHeaderEditor order={order} />
        </aside>
      </div>
    </WmsShell>
  )
}
