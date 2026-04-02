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
  const [shippingAddress1, setShippingAddress1] = useState(order.shippingAddress1)
  const [shippingAddress2, setShippingAddress2] = useState(order.shippingAddress2)
  const [shippingCity, setShippingCity] = useState(order.shippingCity)
  const [shippingState, setShippingState] = useState(order.shippingState)
  const [shippingPostalCode, setShippingPostalCode] = useState(order.shippingPostalCode)
  const [shippingCountry, setShippingCountry] = useState(order.shippingCountry)
  const [notes, setNotes] = useState(order.notes)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

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
        <div className="right-action" style={{ padding: 0 }}>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Update Details"}
          </button>
        </div>
        {message ? <p className="status-note">{message}</p> : null}
      </form>
    </section>
  )
}
