"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { SkuRecord } from "@/lib/wms-types"

interface ProductsTableClientProps {
  initialSkus: SkuRecord[]
}

interface BulkFormState {
  active: "" | "true" | "false"
  warehouse: string
  value: string
  price: string
}

const initialBulkForm: BulkFormState = {
  active: "",
  warehouse: "",
  value: "",
  price: "",
}

export function ProductsTableClient({ initialSkus }: ProductsTableClientProps) {
  const [rows, setRows] = useState<SkuRecord[]>(initialSkus)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkForm, setBulkForm] = useState<BulkFormState>(initialBulkForm)
  const [statusText, setStatusText] = useState("")

  const filteredRows = useMemo(() => {
    const text = search.trim().toLowerCase()
    if (!text) {
      return rows
    }
    return rows.filter(
      (entry) =>
        entry.name.toLowerCase().includes(text) ||
        entry.sku.toLowerCase().includes(text) ||
        entry.barcode.toLowerCase().includes(text),
    )
  }, [rows, search])

  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every((entry) => selectedIds.includes(entry.id))

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !filteredRows.some((row) => row.id === id)))
      return
    }

    setSelectedIds((current) => {
      const next = new Set(current)
      filteredRows.forEach((row) => next.add(row.id))
      return Array.from(next)
    })
  }

  function toggleRow(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  async function applyBulkEdit() {
    if (selectedIds.length === 0) {
      setStatusText("Select at least one SKU for bulk edit.")
      return
    }

    const patch: Record<string, unknown> = {}
    if (bulkForm.active) {
      patch.active = bulkForm.active === "true"
    }
    if (bulkForm.warehouse.trim()) {
      patch.warehouse = bulkForm.warehouse.trim()
    }
    if (bulkForm.value.trim()) {
      patch.value = Number(bulkForm.value)
    }
    if (bulkForm.price.trim()) {
      patch.price = Number(bulkForm.price)
    }

    if (Object.keys(patch).length === 0) {
      setStatusText("Choose at least one field to update.")
      return
    }

    const response = await fetch("/api/skus/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skuIds: selectedIds, patch }),
    })
    const data = await response.json()
    if (!response.ok) {
      setStatusText(data.message ?? "Bulk update failed.")
      return
    }

    setRows((current) =>
      current.map((row) =>
        selectedIds.includes(row.id)
          ? {
              ...row,
              active: typeof patch.active === "boolean" ? patch.active : row.active,
              warehouse: typeof patch.warehouse === "string" ? patch.warehouse : row.warehouse,
              value: typeof patch.value === "number" ? patch.value : row.value,
              price: typeof patch.price === "number" ? patch.price : row.price,
            }
          : row,
      ),
    )
    setStatusText(`Bulk updated ${data.updatedCount} SKU(s).`)
    setBulkForm(initialBulkForm)
  }

  async function deleteRow(id: string) {
    const confirmed = window.confirm("Delete this SKU? This cannot be undone.")
    if (!confirmed) {
      return
    }

    const response = await fetch(`/api/skus/${id}`, { method: "DELETE" })
    const data = await response.json()
    if (!response.ok) {
      const details = data?.errors ? Object.values(data.errors).join(" ") : data?.message
      setStatusText(details || "Unable to delete SKU.")
      return
    }

    setRows((current) => current.filter((row) => row.id !== id))
    setSelectedIds((current) => current.filter((item) => item !== id))
    setStatusText("SKU deleted.")
  }

  return (
    <section className="panel table-panel panel-elevated">
      <div className="table-meta">Showing 1 to {filteredRows.length} of {rows.length} entries</div>

      <div className="table-toolbar">
        <div className="search-row">
          <span>Search:</span>
          <input className="input small" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="button-row">
          <button className="ghost-button" type="button">
            Export All Rows
          </button>
        </div>
      </div>

      <div className="panel spaced-panel" style={{ marginTop: 0 }}>
        <div className="panel-title">Bulk Edit Selected</div>
        <div className="vendor-form-grid">
          <div className="field-stack">
            <label>Selected</label>
            <input className="input" value={`${selectedIds.length}`} readOnly />
          </div>
          <div className="field-stack">
            <label>Active</label>
            <select className="input" value={bulkForm.active} onChange={(event) => setBulkForm((prev) => ({ ...prev, active: event.target.value as BulkFormState["active"] }))}>
              <option value="">No change</option>
              <option value="true">Set active</option>
              <option value="false">Set inactive</option>
            </select>
          </div>
          <div className="field-stack">
            <label>Warehouse</label>
            <input
              className="input"
              placeholder="No change"
              value={bulkForm.warehouse}
              onChange={(event) => setBulkForm((prev) => ({ ...prev, warehouse: event.target.value }))}
            />
          </div>
          <div className="field-stack">
            <label>Value</label>
            <input
              className="input"
              type="number"
              placeholder="No change"
              value={bulkForm.value}
              onChange={(event) => setBulkForm((prev) => ({ ...prev, value: event.target.value }))}
            />
          </div>
          <div className="field-stack">
            <label>Price</label>
            <input
              className="input"
              type="number"
              placeholder="No change"
              value={bulkForm.price}
              onChange={(event) => setBulkForm((prev) => ({ ...prev, price: event.target.value }))}
            />
          </div>
          <div className="field-stack">
            <label>Apply</label>
            <button className="primary-button" type="button" onClick={() => void applyBulkEdit()}>
              Update Selected
            </button>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} />
              </th>
              <th>Name</th>
              <th>SKU</th>
              <th>On Hand</th>
              <th>Available</th>
              <th>Allocated</th>
              <th>Backorder</th>
              <th>Barcode</th>
              <th>Warehouse</th>
              <th>Price</th>
              <th>Value</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={13}>No products found.</td>
              </tr>
            ) : (
              filteredRows.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(entry.id)} onChange={() => toggleRow(entry.id)} />
                  </td>
                  <td>
                    <Link className="table-link" href={`/products/${entry.id}`}>
                      {entry.name}
                    </Link>
                  </td>
                  <td>{entry.sku}</td>
                  <td>{entry.inventory.onHand}</td>
                  <td>{entry.inventory.available}</td>
                  <td>{entry.inventory.allocated}</td>
                  <td>{entry.inventory.backorder}</td>
                  <td>{entry.barcode}</td>
                  <td>{entry.warehouse}</td>
                  <td>{entry.price.toFixed(2)}</td>
                  <td>{entry.value.toFixed(2)}</td>
                  <td>{entry.active ? "Yes" : "No"}</td>
                  <td>
                    <button className="danger-button" type="button" onClick={() => void deleteRow(entry.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {statusText ? <p className="status-note">{statusText}</p> : null}
    </section>
  )
}
