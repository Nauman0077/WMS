import Link from "next/link"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"
import { ORDER_STATUS_OPTIONS } from "@/lib/order-statuses"
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
      <section className="panel panel-elevated">
        <div className="panel-title">Filters</div>
        <div className="vendor-form-grid">
          <div className="field-stack">
            <label>Warehouse</label>
            <select className="input">
              <option>All</option>
            </select>
          </div>
          <div className="field-stack">
            <label>Shipping Carrier</label>
            <select className="input">
              <option>All</option>
            </select>
          </div>
          <div className="field-stack">
            <label>Status</label>
            <select className="input">
              <option>All</option>
              {ORDER_STATUS_OPTIONS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label>Search</label>
            <input className="input" placeholder="Order #, customer, email" />
          </div>
        </div>
      </section>

      <section className="panel spaced-panel panel-elevated table-panel">
        <div className="table-meta">Showing 1 to {orders.length} of {orders.length} entries</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>External #</th>
                <th>Placed</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Customer</th>
                <th>Shop</th>
                <th>Carrier</th>
                <th>Method</th>
                <th>Warehouse</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={11}>No orders found.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.orderId}>
                    <td>
                      <Link className="table-link" href={`/orders/${order.orderId}`}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>{order.externalOrderNumber || "-"}</td>
                    <td>{new Date(order.placedAt).toLocaleString()}</td>
                    <td>{order.status}</td>
                    <td>{order.paymentStatus}</td>
                    <td>{order.customerName}</td>
                    <td>{order.shopName}</td>
                    <td>{order.shippingCarrier}</td>
                    <td>{order.shippingMethod}</td>
                    <td>{order.warehouse}</td>
                    <td>{order.totalAmount.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </WmsShell>
  )
}
