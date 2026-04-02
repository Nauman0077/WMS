import { notFound } from "next/navigation"
import Link from "next/link"
import { PurchaseOrderHeaderEditor } from "@/components/purchase-order-header-editor"
import { PurchaseOrderDeleteButton } from "@/components/purchase-order-delete-button"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"
import { getPurchaseOrderById } from "@/lib/wms-repository"

interface PurchaseOrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function PurchaseOrderDetailPage({ params }: PurchaseOrderDetailPageProps) {
  await requireSessionOrRedirect()
  const { id } = await params
  const purchaseOrder = await getPurchaseOrderById(id)

  if (!purchaseOrder) {
    notFound()
  }

  return (
    <WmsShell
      title={`Purchase Order: ${purchaseOrder.poNumber}`}
      actions={
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link className="primary-link" href={`/purchase-orders/${purchaseOrder.poId}/receive`}>
            Receive Purchase Order
          </Link>
          <PurchaseOrderDeleteButton poId={purchaseOrder.poId} />
        </div>
      }
    >
      <section className="panel panel-elevated">
        <div className="panel-title">Purchase Order Header</div>
        <div className="vendor-form-grid">
          <div className="field-stack">
            <label>PO Number</label>
            <input className="input" value={purchaseOrder.poNumber} readOnly />
          </div>
          <div className="field-stack">
            <label>Status</label>
            <input className="input" value={purchaseOrder.status} readOnly />
          </div>
          <div className="field-stack">
            <label>PO ID (Editable)</label>
            <input className="input" value={purchaseOrder.poDisplayId || "-"} readOnly />
          </div>
          <div className="field-stack">
            <label>Vendor</label>
            <input className="input" value={purchaseOrder.vendorName} readOnly />
          </div>
          <div className="field-stack">
            <label>Tracking Number</label>
            <input className="input" value={purchaseOrder.trackingNumber || "-"} readOnly />
          </div>
          <div className="field-stack">
            <label>Order Date</label>
            <input className="input" value={purchaseOrder.orderDate} readOnly />
          </div>
          <div className="field-stack">
            <label>Expected Date</label>
            <input className="input" value={purchaseOrder.expectedDate} readOnly />
          </div>
          <div className="field-stack">
            <label>Received Date</label>
            <input className="input" value={purchaseOrder.receivedDate || "-"} readOnly />
          </div>
          <div className="field-stack">
            <label>Shipping Amount</label>
            <input className="input" value={purchaseOrder.shippingAmount.toFixed(2)} readOnly />
          </div>
          <div className="field-stack">
            <label>Subtotal</label>
            <input className="input" value={purchaseOrder.subtotal.toFixed(2)} readOnly />
          </div>
          <div className="field-stack">
            <label>Total Amount</label>
            <input className="input" value={purchaseOrder.totalAmount.toFixed(2)} readOnly />
          </div>
          <div className="field-stack field-span-2">
            <label>Notes</label>
            <textarea className="note-area slim" value={purchaseOrder.notes} readOnly />
          </div>
        </div>
      </section>

      <PurchaseOrderHeaderEditor purchaseOrder={purchaseOrder} />

      <section className="panel spaced-panel panel-elevated">
        <div className="panel-title">Line Items</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Line</th>
                <th>SKU</th>
                <th>Product</th>
                <th>Manufacturer SKU</th>
                <th>Ordered</th>
                <th>Received</th>
                <th>Remaining</th>
                <th>Unit Cost</th>
                <th>Line Total</th>
                <th>Expected Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrder.lines.map((line) => (
                <tr key={line.poLineId}>
                  <td>{line.lineNumber}</td>
                  <td>{line.skuCode}</td>
                  <td>{line.productName}</td>
                  <td>{line.vendorSku}</td>
                  <td>{line.orderedQty}</td>
                  <td>{line.receivedQty}</td>
                  <td>{Math.max(0, line.orderedQty - line.receivedQty)}</td>
                  <td>{line.unitCost.toFixed(2)}</td>
                  <td>{(line.orderedQty * line.unitCost).toFixed(2)}</td>
                  <td>{line.expectedDate}</td>
                  <td>{line.lineStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel spaced-panel panel-elevated">
        <div className="panel-title">History</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>Message</th>
                <th>Changed By</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrder.history.length === 0 ? (
                <tr>
                  <td colSpan={5}>No history events recorded.</td>
                </tr>
              ) : (
                purchaseOrder.history.map((entry) => (
                  <tr key={entry.historyId}>
                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                    <td>{entry.eventType}</td>
                    <td>{entry.eventMessage}</td>
                    <td>{entry.changedBy || "-"}</td>
                    <td>{entry.location || "-"}</td>
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
