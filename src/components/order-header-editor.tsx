"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { ORDER_STATUS_OPTIONS } from "@/lib/order-statuses"
import { OrderRecord } from "@/lib/wms-types"

interface OrderHeaderEditorProps {
  order: OrderRecord
}

export function OrderHeaderEditor({ order }: OrderHeaderEditorProps) {
  const router = useRouter()
  const [status, setStatus] = useState(order.status)
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus)
  const [requiredShipDate, setRequiredShipDate] = useState(order.requiredShipDate)
  const [flagged, setFlagged] = useState(order.flagged)
  const [priorityOrder, setPriorityOrder] = useState(order.priorityOrder)
  const [fraudHold, setFraudHold] = useState(order.fraudHold)
  const [addressHold, setAddressHold] = useState(order.addressHold)
  const [operatorHold, setOperatorHold] = useState(order.operatorHold)
  const [paymentHold, setPaymentHold] = useState(order.paymentHold)
  const [holdUntilDate, setHoldUntilDate] = useState(order.holdUntilDate)
  const [shippingAddress1, setShippingAddress1] = useState(order.shippingAddress1)
  const [shippingAddress2, setShippingAddress2] = useState(order.shippingAddress2)
  const [shippingCity, setShippingCity] = useState(order.shippingCity)
  const [shippingState, setShippingState] = useState(order.shippingState)
  const [shippingPostalCode, setShippingPostalCode] = useState(order.shippingPostalCode)
  const [shippingCountry, setShippingCountry] = useState(order.shippingCountry)
  const [notes, setNotes] = useState(order.notes)
  const [saving, setSaving] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [message, setMessage] = useState("")

  const anyHolds = fraudHold || addressHold || operatorHold || paymentHold || Boolean(holdUntilDate)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage("")

    const response = await fetch(`/api/orders/${order.orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        paymentStatus,
        flagged,
        priorityOrder,
        fraudHold,
        addressHold,
        operatorHold,
        paymentHold,
        holdUntilDate,
        requiredShipDate,
        shippingAddress1,
        shippingAddress2,
        shippingCity,
        shippingState,
        shippingPostalCode,
        shippingCountry,
        notes,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      setSaving(false)
      setMessage(data.message ?? "Unable to update order.")
      return
    }

    setSaving(false)
    setMessage("Order details updated.")
    router.refresh()
  }

  async function handleReprocess() {
    setReprocessing(true)
    setMessage("")

    const response = await fetch(`/api/orders/${order.orderId}`, {
      method: "POST",
    })

    const data = await response.json()
    if (!response.ok) {
      setReprocessing(false)
      const details = data?.errors ? Object.values(data.errors).join(" ") : data?.message
      setMessage(details || "Unable to reprocess order.")
      return
    }

    setReprocessing(false)
    setMessage(data.changed ? "Order reprocessed and allocations updated." : "Order reprocessed. No allocation changes.")
    router.refresh()
  }

  return (
    <section className="panel panel-elevated">
      <div className="panel-title">Order Details</div>
      <form className="order-details-grid" onSubmit={handleSubmit}>
        <div className="field-stack">
          <label>Order #</label>
          <input className="input" value={order.orderNumber} readOnly />
        </div>
        <div className="field-stack">
          <label>External #</label>
          <input className="input" value={order.externalOrderNumber || "-"} readOnly />
        </div>
        <div className="field-stack">
          <label>Customer</label>
          <input className="input" value={order.customerName} readOnly />
        </div>
        <div className="field-stack">
          <label>Email</label>
          <input className="input" value={order.customerEmail} readOnly />
        </div>
        <div className="field-stack">
          <label>Status</label>
          <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
            {ORDER_STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="field-stack">
          <label>Payment Status</label>
          <select className="input" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>
        <div className="field-stack">
          <label>Placed At</label>
          <input className="input" value={new Date(order.placedAt).toLocaleString()} readOnly />
        </div>
        <div className="field-stack">
          <label>Required Ship Date</label>
          <input
            className="input"
            type="date"
            value={requiredShipDate ? requiredShipDate.slice(0, 10) : ""}
            onChange={(event) => setRequiredShipDate(event.target.value)}
          />
        </div>
        <div className="field-stack">
          <label>Shipping Carrier</label>
          <input className="input" value={order.shippingCarrier || "-"} readOnly />
        </div>
        <div className="field-stack">
          <label>Shipping Method</label>
          <input className="input" value={order.shippingMethod || "-"} readOnly />
        </div>
        <div className="field-stack">
          <label>Warehouse</label>
          <input className="input" value={order.warehouse} readOnly />
        </div>
        <div className="field-stack">
          <label>Total Amount</label>
          <input className="input" value={order.totalAmount.toFixed(2)} readOnly />
        </div>
        <div className="field-stack">
          <label>Flagged</label>
          <label className="check-row"><input type="checkbox" checked={flagged} onChange={(event) => setFlagged(event.target.checked)} /> <span>Flagged Order</span></label>
        </div>
        <div className="field-stack">
          <label>Priority Order</label>
          <label className="check-row"><input type="checkbox" checked={priorityOrder} onChange={(event) => setPriorityOrder(event.target.checked)} /> <span>Priority Order</span></label>
        </div>
        <div className="field-stack">
          <label>Shipping Address 1</label>
          <input className="input" value={shippingAddress1} onChange={(event) => setShippingAddress1(event.target.value)} />
        </div>
        <div className="field-stack">
          <label>Shipping Address 2</label>
          <input className="input" value={shippingAddress2} onChange={(event) => setShippingAddress2(event.target.value)} />
        </div>
        <div className="field-stack">
          <label>City</label>
          <input className="input" value={shippingCity} onChange={(event) => setShippingCity(event.target.value)} />
        </div>
        <div className="field-stack">
          <label>State</label>
          <input className="input" value={shippingState} onChange={(event) => setShippingState(event.target.value)} />
        </div>
        <div className="field-stack">
          <label>Postal Code</label>
          <input className="input" value={shippingPostalCode} onChange={(event) => setShippingPostalCode(event.target.value)} />
        </div>
        <div className="field-stack">
          <label>Country</label>
          <input className="input" value={shippingCountry} onChange={(event) => setShippingCountry(event.target.value)} />
        </div>
        <div className="field-stack">
          <label>Internal Notes</label>
          <textarea className="note-area slim" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <div className="field-stack field-span-2">
          <label>Holds</label>
          <div className="holds-section">
            <label className="check-row"><input type="checkbox" checked={fraudHold} onChange={(event) => setFraudHold(event.target.checked)} /> <span>Fraud Hold</span></label>
            <label className="check-row"><input type="checkbox" checked={addressHold} onChange={(event) => setAddressHold(event.target.checked)} /> <span>Address Hold</span></label>
            <label className="check-row"><input type="checkbox" checked={operatorHold} onChange={(event) => setOperatorHold(event.target.checked)} /> <span>Operator Hold</span></label>
            <label className="check-row"><input type="checkbox" checked={paymentHold} onChange={(event) => setPaymentHold(event.target.checked)} /> <span>Payment Hold</span></label>
            <div className="field-stack">
              <label>Hold Until Date</label>
              <input className="input" type="date" value={holdUntilDate ? holdUntilDate.slice(0, 10) : ""} onChange={(event) => setHoldUntilDate(event.target.value)} />
            </div>
            <div className="field-stack">
              <label>Any Holds Active</label>
              <input className="input" value={anyHolds ? "Yes" : "No"} readOnly />
            </div>
          </div>
        </div>
        <div className="right-action" style={{ padding: 0 }}>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button className="secondary-button" type="button" disabled={reprocessing} onClick={() => void handleReprocess()}>
              {reprocessing ? "Reprocessing..." : "Reprocess"}
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Update Details"}
            </button>
          </div>
        </div>
        {message ? <p className="status-note">{message}</p> : null}
      </form>
    </section>
  )
}
