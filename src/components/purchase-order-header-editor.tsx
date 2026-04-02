"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { PurchaseOrderEntry } from "@/lib/wms-types"

interface PurchaseOrderHeaderEditorProps {
  purchaseOrder: PurchaseOrderEntry
}

export function PurchaseOrderHeaderEditor({ purchaseOrder }: PurchaseOrderHeaderEditorProps) {
  const router = useRouter()
  const [status, setStatus] = useState(purchaseOrder.status)
  const [poId, setPoId] = useState(purchaseOrder.poDisplayId)
  const [tracking, setTracking] = useState(purchaseOrder.trackingNumber)
  const [notes, setNotes] = useState(purchaseOrder.notes)
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage("")

    const response = await fetch(`/api/purchase-orders/${purchaseOrder.poId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
        poDisplayId: poId,
        trackingNumber: tracking,
        notes,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      setSaving(false)
      setMessage(data.message ?? "Unable to update purchase order.")
      return
    }

    setSaving(false)
    setMessage("Purchase order updated.")
    router.refresh()
  }

  return (
    <section className="panel spaced-panel panel-elevated">
      <div className="panel-title">Edit PO Header</div>
      <form className="vendor-form-grid" onSubmit={handleSubmit}>
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
          <label>PO ID (Editable)</label>
          <input className="input" value={poId} onChange={(event) => setPoId(event.target.value)} />
        </div>
        <div className="field-stack">
          <label>Tracking Number</label>
          <input className="input" value={tracking} onChange={(event) => setTracking(event.target.value)} />
        </div>
        <div className="field-stack field-span-2">
          <label>Notes</label>
          <textarea className="note-area slim" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>

        <div className="right-action" style={{ gridColumn: "1 / -1" }}>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save PO Header"}
          </button>
        </div>
        {message ? <p className="status-note" style={{ gridColumn: "1 / -1" }}>{message}</p> : null}
      </form>
    </section>
  )
}
