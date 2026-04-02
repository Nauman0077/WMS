"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

interface VendorOption {
  vendorId: string
  vendorName: string
}

interface AllowedSku {
  mappingId: string
  skuId: string
  skuCode: string
  skuName: string
  barcode: string
  vendorSku: string
  unitCost: number
  casePack: number
}

interface PurchaseOrderLineForm {
  skuId: string
  manufacturerSku: string
  orderedQty: string
  unitCost: string
  expectedDate: string
  notes: string
}

const initialLine: PurchaseOrderLineForm = {
  skuId: "",
  manufacturerSku: "",
  orderedQty: "1",
  unitCost: "0",
  expectedDate: "",
  notes: "",
}

export function PurchaseOrderCreateForm() {
  const router = useRouter()
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [allowedSkus, setAllowedSkus] = useState<AllowedSku[]>([])

  const [vendorId, setVendorId] = useState("")
  const [warehouse, setWarehouse] = useState("")
  const [status, setStatus] = useState("Pending")
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10))
  const [expectedDate, setExpectedDate] = useState("")
  const [poId, setPoId] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [notes, setNotes] = useState("")
  const [shippingAmount, setShippingAmount] = useState("0")
  const [lines, setLines] = useState<PurchaseOrderLineForm[]>([{ ...initialLine }])
  const [errorText, setErrorText] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadReferenceData() {
      const [vendorResponse, refResponse] = await Promise.all([fetch("/api/vendors"), fetch("/api/reference-data")])

      if (vendorResponse.ok) {
        const vendorData = await vendorResponse.json()
        const nextVendors = (vendorData.vendors ?? []).map((vendor: VendorOption) => ({
          vendorId: vendor.vendorId,
          vendorName: vendor.vendorName,
        }))
        setVendors(nextVendors)
        if (nextVendors.length > 0) {
          setVendorId(nextVendors[0].vendorId)
        }
      }

      if (refResponse.ok) {
        const refData = await refResponse.json()
        if ((refData.warehouses ?? []).length > 0) {
          setWarehouse(refData.warehouses[0])
        }
      }
    }
    void loadReferenceData()
  }, [])

  useEffect(() => {
    async function loadAllowedSkus() {
      if (!vendorId) {
        return
      }
      const response = await fetch(`/api/vendors/${vendorId}/allowed-skus`)
      if (!response.ok) {
        return
      }
      const data = await response.json()
      const skus = data.skus ?? []
      setAllowedSkus(skus)
      setLines((current) =>
        current.map((line) => {
          if (skus.length === 0) {
            return { ...line, skuId: "", manufacturerSku: "", unitCost: "0" }
          }

          const currentSku = skus.find((sku: AllowedSku) => sku.skuId === line.skuId)
          if (currentSku) {
            return {
              ...line,
              manufacturerSku: currentSku.vendorSku,
            }
          }

          return {
            ...line,
            skuId: skus[0].skuId,
            manufacturerSku: skus[0].vendorSku,
            unitCost: String(skus[0].unitCost),
          }
        }),
      )
    }
    void loadAllowedSkus()
  }, [vendorId])

  const subtotal = useMemo(() => {
    return lines.reduce((sum, line) => sum + Number(line.orderedQty || 0) * Number(line.unitCost || 0), 0)
  }, [lines])

  const totalAmount = subtotal + Number(shippingAmount || 0)

  function updateLine(index: number, patch: Partial<PurchaseOrderLineForm>) {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)))
  }

  function addLine() {
    const firstSku = allowedSkus[0]
    setLines((current) => [
      ...current,
      {
        ...initialLine,
        skuId: firstSku?.skuId ?? "",
        manufacturerSku: firstSku?.vendorSku ?? "",
        unitCost: String(firstSku?.unitCost ?? 0),
        expectedDate,
      },
    ])
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorText("")
    setSaving(true)

    const payload = {
      vendorId,
      warehouse: warehouse || "Primary",
      status,
      orderDate,
      expectedDate,
      poDisplayId: poId,
      trackingNumber,
      notes,
      shippingAmount: Number(shippingAmount),
      lines: lines.map((line) => ({
        skuId: line.skuId,
        orderedQty: Number(line.orderedQty),
        unitCost: Number(line.unitCost),
        expectedDate: line.expectedDate || expectedDate,
        notes: line.notes,
      })),
    }

    const response = await fetch("/api/purchase-orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    if (!response.ok) {
      setSaving(false)
      setErrorText(data.message ?? "Unable to create purchase order.")
      return
    }

    router.push(`/purchase-orders/${data.purchaseOrder.poId}`)
    router.refresh()
  }

  return (
    <form className="po-create-layout" onSubmit={handleSubmit}>
      <section className="panel panel-elevated">
        <div className="panel-title">Purchase Order Header</div>
        <p className="status-note">System PO Number is auto-generated on create. PO ID below is editable.</p>
        <div className="vendor-form-grid">
          <div className="field-stack">
            <label>Vendor *</label>
            <select className="input" value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
              {vendors.map((vendor) => (
                <option key={vendor.vendorId} value={vendor.vendorId}>
                  {vendor.vendorName}
                </option>
              ))}
            </select>
          </div>

          <div className="field-stack">
            <label>PO ID (Editable)</label>
            <input className="input" value={poId} onChange={(event) => setPoId(event.target.value)} placeholder="PO-ID-001" />
          </div>

          <div className="field-stack">
            <label>Status</label>
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="Pending">Pending</option>
              <option value="In Transit">In Transit</option>
              <option value="Received">Received</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="field-stack">
            <label>Order Date</label>
            <input className="input" type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} />
          </div>

          <div className="field-stack">
            <label>Expected Date</label>
            <input className="input" type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} />
          </div>

          <div className="field-stack">
            <label>Tracking Number</label>
            <input className="input" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} />
          </div>

          <div className="field-stack field-span-2">
            <label>Notes</label>
            <textarea className="note-area slim" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
      </section>

      <section className="panel spaced-panel panel-elevated">
        <div className="panel-title with-action">
          <span>Line Items (Vendor restricted)</span>
          <button className="ghost-button" type="button" onClick={addLine} disabled={allowedSkus.length === 0}>
            + Add Line
          </button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Manufacturer SKU</th>
                <th>Ordered Qty</th>
                <th>Unit Cost</th>
                <th>Line Total</th>
                <th>Expected Date</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`line-${index}`}>
                  <td>
                    <select
                      className="input"
                      value={line.skuId}
                      onChange={(event) => {
                        const selected = allowedSkus.find((sku) => sku.skuId === event.target.value)
                        updateLine(index, {
                          skuId: event.target.value,
                          manufacturerSku: selected?.vendorSku ?? "",
                          unitCost: String(selected?.unitCost ?? 0),
                        })
                      }}
                    >
                      {allowedSkus.length === 0 ? <option value="">No vendor-mapped SKUs</option> : null}
                      {allowedSkus.map((sku) => (
                        <option key={sku.mappingId} value={sku.skuId}>
                          {sku.skuCode} - {sku.skuName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input className="input" value={line.manufacturerSku} readOnly />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      value={line.orderedQty}
                      onChange={(event) => updateLine(index, { orderedQty: event.target.value })}
                    />
                  </td>
                  <td>
                    <input className="input" value={line.unitCost} onChange={(event) => updateLine(index, { unitCost: event.target.value })} />
                  </td>
                  <td>{(Number(line.orderedQty || 0) * Number(line.unitCost || 0)).toFixed(2)}</td>
                  <td>
                    <input
                      className="input"
                      type="date"
                      value={line.expectedDate}
                      onChange={(event) => updateLine(index, { expectedDate: event.target.value })}
                    />
                  </td>
                  <td>
                    <input className="input" value={line.notes} onChange={(event) => updateLine(index, { notes: event.target.value })} />
                  </td>
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
            <label>Shipping Amount</label>
            <input className="input" value={shippingAmount} onChange={(event) => setShippingAmount(event.target.value)} />
          </div>
          <div className="field-stack">
            <label>Total Amount</label>
            <input className="input" value={totalAmount.toFixed(2)} readOnly />
          </div>
        </div>
      </section>

      {errorText ? <p className="error-text">{errorText}</p> : null}

      <div className="save-bar">
        <p className="save-hint">PO line SKU options are restricted to mappings assigned to the selected vendor.</p>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create Purchase Order"}
        </button>
      </div>
    </form>
  )
}
