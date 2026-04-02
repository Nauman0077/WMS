"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ORDER_STATUS_DEFAULT, ORDER_STATUS_OPTIONS } from "@/lib/order-statuses"

interface SkuLookup {
  skuId: string
  skuCode: string
  name: string
}

interface OrderLineForm {
  skuId: string
  quantity: string
  unitPrice: string
}

const initialLine: OrderLineForm = {
  skuId: "",
  quantity: "1",
  unitPrice: "0",
}

export function OrderCreateForm() {
  const router = useRouter()
  const [skuLookup, setSkuLookup] = useState<SkuLookup[]>([])
  const [warehouses, setWarehouses] = useState<string[]>([])
  const [shopName, setShopName] = useState("Nobltravel Store")
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [shippingCarrier, setShippingCarrier] = useState("UPS")
  const [shippingMethod, setShippingMethod] = useState("Ground")
  const [shippingAddress1, setShippingAddress1] = useState("")
  const [shippingAddress2, setShippingAddress2] = useState("")
  const [shippingCity, setShippingCity] = useState("")
  const [shippingState, setShippingState] = useState("")
  const [shippingPostalCode, setShippingPostalCode] = useState("")
  const [shippingCountry, setShippingCountry] = useState("United States")
  const [warehouse, setWarehouse] = useState("")
  const [status, setStatus] = useState(ORDER_STATUS_DEFAULT)
  const [paymentStatus, setPaymentStatus] = useState("Paid")
  const [placedAt, setPlacedAt] = useState(new Date().toISOString().slice(0, 10))
  const [requiredShipDate, setRequiredShipDate] = useState("")
  const [notes, setNotes] = useState("")
  const [shippingAmount, setShippingAmount] = useState("0")
  const [taxAmount, setTaxAmount] = useState("0")
  const [lines, setLines] = useState<OrderLineForm[]>([{ ...initialLine }])
  const [errorText, setErrorText] = useState("")

  useEffect(() => {
    Promise.all([fetch("/api/skus/lookup"), fetch("/api/reference-data")])
      .then(async ([skuResponse, referenceResponse]) => {
        if (skuResponse.ok) {
          const skuData = await skuResponse.json()
          const skus = skuData.skus ?? []
          setSkuLookup(skus)
          if (skus.length > 0) {
            setLines([{ ...initialLine, skuId: skus[0].skuId }])
          }
        }
        if (referenceResponse.ok) {
          const referenceData = await referenceResponse.json()
          const nextWarehouses = referenceData.warehouses ?? []
          setWarehouses(nextWarehouses)
          if (nextWarehouses.length > 0) {
            setWarehouse(nextWarehouses[0])
          }
        }
      })
      .catch(() => {
        setErrorText("Unable to load reference data.")
      })
  }, [])

  const subtotal = useMemo(() => {
    return lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0)
  }, [lines])

  const total = subtotal + Number(shippingAmount || 0) + Number(taxAmount || 0)

  function addLine() {
    setLines((current) => [...current, { ...initialLine, skuId: skuLookup[0]?.skuId ?? "" }])
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
  }

  function updateLine(index: number, patch: Partial<OrderLineForm>) {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorText("")

    const payload = {
      shopName,
      customerName,
      customerEmail,
      shippingCarrier,
      shippingMethod,
      shippingAddress1,
      shippingAddress2,
      shippingCity,
      shippingState,
      shippingPostalCode,
      shippingCountry,
      warehouse,
      status,
      paymentStatus,
      placedAt,
      requiredShipDate,
      notes,
      shippingAmount: Number(shippingAmount),
      taxAmount: Number(taxAmount),
      lines: lines.map((line) => ({
        skuId: line.skuId,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      })),
    }

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) {
      setErrorText(data.message ?? "Unable to create order.")
      return
    }

    router.push(`/orders/${data.order.orderId}`)
    router.refresh()
  }

  return (
    <form className="po-create-layout" onSubmit={handleSubmit}>
      <section className="panel panel-elevated">
        <div className="panel-title">Order Header</div>
        <div className="vendor-form-grid">
          <div className="field-stack">
            <label>Shop Name</label>
            <input className="input" value={shopName} onChange={(event) => setShopName(event.target.value)} />
          </div>
          <div className="field-stack">
            <label>Customer Name</label>
            <input className="input" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
          </div>
          <div className="field-stack">
            <label>Customer Email</label>
            <input className="input" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} />
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
            <label>Shipping Carrier</label>
            <input className="input" value={shippingCarrier} onChange={(event) => setShippingCarrier(event.target.value)} />
          </div>
          <div className="field-stack">
            <label>Shipping Method</label>
            <input className="input" value={shippingMethod} onChange={(event) => setShippingMethod(event.target.value)} />
          </div>
          <div className="field-stack">
            <label>Warehouse</label>
            <select className="input" value={warehouse} onChange={(event) => setWarehouse(event.target.value)}>
              {warehouses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label>Placed Date</label>
            <input className="input" type="date" value={placedAt} onChange={(event) => setPlacedAt(event.target.value)} />
          </div>
          <div className="field-stack">
            <label>Required Ship Date</label>
            <input
              className="input"
              type="date"
              value={requiredShipDate}
              onChange={(event) => setRequiredShipDate(event.target.value)}
            />
          </div>
          <div className="field-stack field-span-2">
            <label>Address Line 1</label>
            <input className="input" value={shippingAddress1} onChange={(event) => setShippingAddress1(event.target.value)} />
          </div>
          <div className="field-stack field-span-2">
            <label>Address Line 2</label>
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
            <input
              className="input"
              value={shippingPostalCode}
              onChange={(event) => setShippingPostalCode(event.target.value)}
            />
          </div>
          <div className="field-stack">
            <label>Country</label>
            <input className="input" value={shippingCountry} onChange={(event) => setShippingCountry(event.target.value)} />
          </div>
          <div className="field-stack field-span-2">
            <label>Notes</label>
            <textarea className="note-area slim" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
      </section>

      <section className="panel spaced-panel panel-elevated">
        <div className="panel-title with-action">
          <span>Line Items</span>
          <button className="ghost-button" type="button" onClick={addLine}>
            + Add Line
          </button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Line Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`order-line-${index}`}>
                  <td>
                    <select className="input" value={line.skuId} onChange={(event) => updateLine(index, { skuId: event.target.value })}>
                      {skuLookup.map((sku) => (
                        <option key={sku.skuId} value={sku.skuId}>
                          {sku.skuCode} - {sku.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      value={line.quantity}
                      onChange={(event) => updateLine(index, { quantity: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      value={line.unitPrice}
                      onChange={(event) => updateLine(index, { unitPrice: event.target.value })}
                    />
                  </td>
                  <td>{(Number(line.quantity || 0) * Number(line.unitPrice || 0)).toFixed(2)}</td>
                  <td>
                    <button className="danger-button" type="button" onClick={() => removeLine(index)} disabled={lines.length <= 1}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel spaced-panel panel-elevated">
        <div className="panel-title">Totals</div>
        <div className="vendor-form-grid">
          <div className="field-stack">
            <label>Subtotal</label>
            <input className="input" value={subtotal.toFixed(2)} readOnly />
          </div>
          <div className="field-stack">
            <label>Shipping</label>
            <input className="input" type="number" value={shippingAmount} onChange={(event) => setShippingAmount(event.target.value)} />
          </div>
          <div className="field-stack">
            <label>Tax</label>
            <input className="input" type="number" value={taxAmount} onChange={(event) => setTaxAmount(event.target.value)} />
          </div>
          <div className="field-stack">
            <label>Total</label>
            <input className="input" value={total.toFixed(2)} readOnly />
          </div>
        </div>
      </section>

      {errorText ? <p className="error-text">{errorText}</p> : null}

      <div className="save-bar">
        <p className="save-hint">Orders follow ShipHero-style headers, filters, and fulfillment status tracking.</p>
        <button className="primary-button" type="submit">
          Create Order
        </button>
      </div>
    </form>
  )
}
