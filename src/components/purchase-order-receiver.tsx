"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { LocationRecord, PurchaseOrderEntry } from "@/lib/wms-types"

interface PurchaseOrderReceiverProps {
  purchaseOrder: PurchaseOrderEntry
}

export function PurchaseOrderReceiver({ purchaseOrder }: PurchaseOrderReceiverProps) {
  const router = useRouter()
  const [changedBy, setChangedBy] = useState("admin")
  const [statusText, setStatusText] = useState("")
  const [availableLocations, setAvailableLocations] = useState<LocationRecord[]>([])
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([])
  const [bulkLocationId, setBulkLocationId] = useState("")
  const [pendingByLineId, setPendingByLineId] = useState<Record<string, string>>(() => {
    const output: Record<string, string> = {}
    purchaseOrder.lines.forEach((line) => {
      output[line.poLineId] = "0"
    })
    return output
  })
  const [locationByLineId, setLocationByLineId] = useState<Record<string, string>>({})

  useEffect(() => {
    let alive = true

    async function loadLocations() {
      const response = await fetch("/api/reference-data")
      if (!response.ok) {
        return
      }
      const data = await response.json()
      if (!alive) {
        return
      }

      const warehouseLocations = (data.locationsByWarehouse?.[purchaseOrder.warehouse] ?? []).filter(
        (location: LocationRecord) => location.isActive,
      )
      setAvailableLocations(warehouseLocations)

      const defaultLocation =
        warehouseLocations.find((location: LocationRecord) => location.locationCode === "RECEIVING") ??
        warehouseLocations.find((location: LocationRecord) => location.isReceivable) ??
        warehouseLocations[0]

      if (defaultLocation) {
        setBulkLocationId(defaultLocation.locationId)
        setLocationByLineId(() => {
          const next: Record<string, string> = {}
          purchaseOrder.lines.forEach((line) => {
            next[line.poLineId] = defaultLocation.locationId
          })
          return next
        })
      }
    }

    void loadLocations()
    return () => {
      alive = false
    }
  }, [purchaseOrder.lines, purchaseOrder.warehouse])

  const remainingTotal = useMemo(() => {
    return purchaseOrder.lines.reduce((sum, line) => sum + Math.max(0, line.orderedQty - line.receivedQty), 0)
  }, [purchaseOrder.lines])

  const isClosed = purchaseOrder.status === "Closed"
  const selectableLines = purchaseOrder.lines.filter((line) => Math.max(0, line.orderedQty - line.receivedQty) > 0)
  const allSelected = selectableLines.length > 0 && selectableLines.every((line) => selectedLineIds.includes(line.poLineId))

  function toggleLineSelection(lineId: string) {
    setSelectedLineIds((current) =>
      current.includes(lineId) ? current.filter((value) => value !== lineId) : [...current, lineId],
    )
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedLineIds([])
      return
    }
    setSelectedLineIds(selectableLines.map((line) => line.poLineId))
  }

  function applyBulkLocation() {
    if (!bulkLocationId || selectedLineIds.length === 0) {
      setStatusText("Select lines and a bulk location first.")
      return
    }

    setLocationByLineId((current) => {
      const next = { ...current }
      selectedLineIds.forEach((lineId) => {
        next[lineId] = bulkLocationId
      })
      return next
    })
    setStatusText("Bulk location assigned to selected lines.")
  }

  function buildReceiveLines(mode: "selected" | "complete") {
    return purchaseOrder.lines
      .map((line) => {
        const remaining = Math.max(0, line.orderedQty - line.receivedQty)
        const selected = selectedLineIds.includes(line.poLineId)
        const receiveQty = mode === "complete" ? remaining : selected ? Number(pendingByLineId[line.poLineId] ?? 0) : 0
        return {
          poLineId: line.poLineId,
          receiveQty,
          location: locationByLineId[line.poLineId],
        }
      })
      .filter((line) => line.receiveQty > 0)
  }

  async function submitReceive(mode: "selected" | "complete") {
    setStatusText("")
    const lines = buildReceiveLines(mode)

    if (lines.length === 0) {
      setStatusText("No receivable quantities found.")
      return
    }

    const missingLocation = lines.some((line) => !line.location)
    if (missingLocation) {
      setStatusText("Every received line must have a destination location.")
      return
    }

    const totalUnits = lines.reduce((sum, line) => sum + line.receiveQty, 0)
    const locationCodes = Array.from(
      new Set(
        lines
          .map((line) => availableLocations.find((location) => location.locationId === line.location)?.locationCode)
          .filter((value): value is string => Boolean(value)),
      ),
    )

    const confirmed = window.confirm(
      `Receive ${totalUnits} unit(s) into ${locationCodes.join(", ") || purchaseOrder.warehouse}?`,
    )
    if (!confirmed) {
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
      const details = data?.errors ? Object.values(data.errors).join(" ") : data?.message
      setStatusText(details || "Unable to receive purchase order.")
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
        <div className="field-stack">
          <label>Bulk Location</label>
          <select className="input" value={bulkLocationId} onChange={(event) => setBulkLocationId(event.target.value)}>
            <option value="">Select location</option>
            {availableLocations.map((location) => (
              <option key={location.locationId} value={location.locationId}>
                {location.locationCode} - {location.locationName}
              </option>
            ))}
          </select>
        </div>
        <div className="field-stack">
          <label>Bulk Assign</label>
          <button className="secondary-button" type="button" onClick={applyBulkLocation} disabled={isClosed}>
            Apply To Selected
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              </th>
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
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedLineIds.includes(line.poLineId)}
                      disabled={isClosed || remaining <= 0}
                      onChange={() => toggleLineSelection(line.poLineId)}
                    />
                  </td>
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
                      value={locationByLineId[line.poLineId] ?? ""}
                      onChange={(event) =>
                        setLocationByLineId((current) => ({
                          ...current,
                          [line.poLineId]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select location</option>
                      {availableLocations.map((location) => (
                        <option key={location.locationId} value={location.locationId}>
                          {location.locationCode} - {location.locationName}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="right-action" style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
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
