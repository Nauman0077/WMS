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
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Qty</th>
                    <th>Qty Shipped</th>
                    <th>Unit Price</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((line) => (
                    <tr key={line.lineId}>
                      <td>{line.skuCode}</td>
                      <td>{line.productName}</td>
                      <td>{line.quantity}</td>
                      <td>{line.quantityShipped}</td>
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
