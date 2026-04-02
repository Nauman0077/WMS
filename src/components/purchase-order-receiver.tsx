"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { PurchaseOrderEntry } from "@/lib/wms-types"

interface PurchaseOrderReceiverProps {
  purchaseOrder: PurchaseOrderEntry
}

const DUMMY_LOCATION = "Dummy Location"

export function PurchaseOrderReceiver({ purchaseOrder }: PurchaseOrderReceiverProps) {
  const router = useRouter()
  const [changedBy, setChangedBy] = useState("admin")
  const [statusText, setStatusText] = useState("")
  const [pendingByLineId, setPendingByLineId] = useState<Record<string, string>>(() => {
    const output: Record<string, string> = {}
    purchaseOrder.lines.forEach((line) => {
      output[line.poLineId] = "0"
    })
    return output
  })
  const [locationByLineId, setLocationByLineId] = useState<Record<string, string>>(() => {
    const output: Record<string, string> = {}
    purchaseOrder.lines.forEach((line) => {
      output[line.poLineId] = DUMMY_LOCATION
    })
    return output
  })

  const remainingTotal = useMemo(() => {
    return purchaseOrder.lines.reduce((sum, line) => sum + Math.max(0, line.orderedQty - line.receivedQty), 0)
  }, [purchaseOrder.lines])

  const isClosed = purchaseOrder.status === "Closed"

  async function submitReceive(mode: "selected" | "complete") {
    setStatusText("")

    const lines = purchaseOrder.lines
      .map((line) => {
        const remaining = Math.max(0, line.orderedQty - line.receivedQty)
        const receiveQty = mode === "complete" ? remaining : Number(pendingByLineId[line.poLineId] ?? 0)
        return {
          poLineId: line.poLineId,
          receiveQty,
          location: locationByLineId[line.poLineId] || DUMMY_LOCATION,
        }
      })
      .filter((line) => line.receiveQty > 0)

    if (lines.length === 0) {
      setStatusText("No receivable quantities found.")
      return
    }

    const response = await fetch(`/api/purchase-orders/${purchaseOrder.poId}/receive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        changedBy,
        lines,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      setStatusText(data.message ?? "Unable to receive purchase order.")
      return
    }

    setStatusText("Inventory received successfully.")
    router.refresh()
  }

  async function markClosed() {
    const response = await fetch(`/api/purchase-orders/${purchaseOrder.poId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "Closed" }),
    })

    const data = await response.json()
    if (!response.ok) {
      setStatusText(data.message ?? "Unable to close purchase order.")
      return
    }

    setStatusText("Purchase order closed.")
    router.refresh()
  }

  return (
    <section className="panel spaced-panel panel-elevated">
      <div className="panel-title">Receive Inventory</div>
      <div className="vendor-form-grid">
        <div className="field-stack">
          <label>Changed By</label>
          <input className="input" value={changedBy} onChange={(event) => setChangedBy(event.target.value)} />
        </div>
        <div className="field-stack">
          <label>Remaining Units</label>
          <input className="input" value={String(remainingTotal)} readOnly />
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Ordered</th>
              <th>Received</th>
              <th>Remaining</th>
              <th>Receive Now</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrder.lines.map((line) => {
              const remaining = Math.max(0, line.orderedQty - line.receivedQty)
              return (
                <tr key={line.poLineId}>
                  <td>{line.skuCode}</td>
                  <td>{line.productName}</td>
                  <td>{line.orderedQty}</td>
                  <td>{line.receivedQty}</td>
                  <td>{remaining}</td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={remaining}
                      disabled={isClosed || remaining <= 0}
                      value={pendingByLineId[line.poLineId] ?? "0"}
                      onChange={(event) =>
                        setPendingByLineId((current) => ({
                          ...current,
                          [line.poLineId]: event.target.value,
                        }))
                      }
                    />
                  </td>
                  <td>
                    <select
                      className="input"
                      disabled={isClosed || remaining <= 0}
                      value={locationByLineId[line.poLineId] ?? DUMMY_LOCATION}
                      onChange={(event) =>
                        setLocationByLineId((current) => ({
                          ...current,
                          [line.poLineId]: event.target.value,
                        }))
                      }
                    >
                      <option value={DUMMY_LOCATION}>{DUMMY_LOCATION}</option>
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="right-action" style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button className="ghost-button" type="button" disabled={isClosed} onClick={() => void submitReceive("selected")}>
          Receive Selected
        </button>
        <button className="primary-button" type="button" disabled={isClosed} onClick={() => void submitReceive("complete")}>
          Receive Complete PO
        </button>
        <button className="danger-button" type="button" disabled={purchaseOrder.status === "Closed"} onClick={() => void markClosed()}>
          Mark Closed
        </button>
      </div>
      {statusText ? <p className="status-note">{statusText}</p> : null}
    </section>
  )
}
