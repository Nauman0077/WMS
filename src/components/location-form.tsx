"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { CreateLocationInput, LocationRecord, ValidationErrors } from "@/lib/wms-types"

interface LocationFormProps {
  mode: "create" | "edit"
  initialLocation?: LocationRecord
  locationId?: string
  warehouses: string[]
}

interface LocationFormState {
  warehouse: string
  locationCode: string
  locationName: string
  locationType: string
  isActive: boolean
  isPickable: boolean
  isReceivable: boolean
  isSellable: boolean
  sortOrder: string
  notes: string
}

const DEFAULT_TYPES = ["receiving", "pick", "bulk", "returns", "quarantine", "storage"]

function buildPayload(state: LocationFormState): CreateLocationInput {
  return {
    warehouse: state.warehouse,
    locationCode: state.locationCode,
    locationName: state.locationName,
    locationType: state.locationType,
    isActive: state.isActive,
    isPickable: state.isPickable,
    isReceivable: state.isReceivable,
    isSellable: state.isSellable,
    sortOrder: Number(state.sortOrder || 0),
    notes: state.notes,
  }
}

export function LocationForm({ mode, initialLocation, locationId, warehouses }: LocationFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<LocationFormState>({
    warehouse: initialLocation?.warehouse || warehouses[0] || "",
    locationCode: initialLocation?.locationCode || "",
    locationName: initialLocation?.locationName || "",
    locationType: initialLocation?.locationType || "storage",
    isActive: initialLocation?.isActive ?? true,
    isPickable: initialLocation?.isPickable ?? false,
    isReceivable: initialLocation?.isReceivable ?? false,
    isSellable: initialLocation?.isSellable ?? true,
    sortOrder: String(initialLocation?.sortOrder ?? 100),
    notes: initialLocation?.notes || "",
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    setMessage("")

    const response = await fetch(mode === "create" ? "/api/locations" : `/api/locations/${locationId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(form)),
    })

    const data = await response.json()
    if (!response.ok) {
      setSaving(false)
      setErrors(data.errors ?? {})
      setMessage(data.message ?? "Unable to save location.")
      return
    }

    router.push(`/locations/${data.location.locationId}`)
    router.refresh()
  }

  return (
    <form className="vendor-form" onSubmit={handleSubmit}>
      <section className="panel panel-elevated">
        <div className="panel-title">{mode === "create" ? "Create Location" : "Edit Location"}</div>
        <div className="vendor-form-grid">
          <div className="field-stack">
            <label>Warehouse</label>
            <select className="input" value={form.warehouse} onChange={(event) => setForm((prev) => ({ ...prev, warehouse: event.target.value }))}>
              {warehouses.map((warehouse) => (
                <option key={warehouse} value={warehouse}>
                  {warehouse}
                </option>
              ))}
            </select>
            {errors.warehouse ? <p className="error-text">{errors.warehouse}</p> : null}
          </div>
          <div className="field-stack">
            <label>Location Code</label>
            <input className="input" value={form.locationCode} onChange={(event) => setForm((prev) => ({ ...prev, locationCode: event.target.value }))} />
            {errors.locationCode ? <p className="error-text">{errors.locationCode}</p> : null}
          </div>
          <div className="field-stack">
            <label>Location Name</label>
            <input className="input" value={form.locationName} onChange={(event) => setForm((prev) => ({ ...prev, locationName: event.target.value }))} />
            {errors.locationName ? <p className="error-text">{errors.locationName}</p> : null}
          </div>
          <div className="field-stack">
            <label>Location Type</label>
            <select className="input" value={form.locationType} onChange={(event) => setForm((prev) => ({ ...prev, locationType: event.target.value }))}>
              {DEFAULT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label>Sort Order</label>
            <input className="input" type="number" value={form.sortOrder} onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))} />
          </div>
          <div className="field-stack field-span-2">
            <label>Flags</label>
            <div className="holds-section">
              <label className="check-row"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} /> <span>Active</span></label>
              <label className="check-row"><input type="checkbox" checked={form.isPickable} onChange={(event) => setForm((prev) => ({ ...prev, isPickable: event.target.checked }))} /> <span>Pickable</span></label>
              <label className="check-row"><input type="checkbox" checked={form.isReceivable} onChange={(event) => setForm((prev) => ({ ...prev, isReceivable: event.target.checked }))} /> <span>Receivable</span></label>
              <label className="check-row"><input type="checkbox" checked={form.isSellable} onChange={(event) => setForm((prev) => ({ ...prev, isSellable: event.target.checked }))} /> <span>Sellable</span></label>
            </div>
          </div>
          <div className="field-stack field-span-2">
            <label>Notes</label>
            <textarea className="note-area slim" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </div>
        </div>
        {message ? <p className="status-note">{message}</p> : null}
        <div className="right-action">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : mode === "create" ? "Create Location" : "Save Location"}
          </button>
        </div>
      </section>
    </form>
  )
}
