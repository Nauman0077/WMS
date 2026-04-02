"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { VendorSkuMapping } from "@/lib/wms-types"

interface SkuLookup {
  skuId: string
  skuCode: string
  name: string
  barcode: string
}

interface VendorSkuManagerProps {
  vendorId: string
}

interface MappingForm {
  skuId: string
  manufacturerSku: string
  price: string
  leadTimeDays: string
}

const initialForm: MappingForm = {
  skuId: "",
  manufacturerSku: "",
  price: "0",
  leadTimeDays: "",
}

export function VendorSkuManager({ vendorId }: VendorSkuManagerProps) {
  const [skuLookup, setSkuLookup] = useState<SkuLookup[]>([])
  const [mappings, setMappings] = useState<VendorSkuMapping[]>([])
  const [form, setForm] = useState<MappingForm>(initialForm)
  const [statusText, setStatusText] = useState("")
  const [filterText, setFilterText] = useState("")
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let alive = true
    Promise.all([fetch("/api/skus/lookup"), fetch(`/api/vendors/${vendorId}/sku-mappings`)])
      .then(async ([lookupResponse, mappingsResponse]) => {
        if (!alive) {
          return
        }

        if (lookupResponse.ok) {
          const lookupData = await lookupResponse.json()
          if (!alive) {
            return
          }
          const skus = lookupData.skus ?? []
          setSkuLookup(skus)
          if (skus.length > 0) {
            setForm((current) => ({
              ...current,
              skuId: current.skuId || skus[0].skuId,
            }))
          }
        }

        if (mappingsResponse.ok) {
          const mappingData = await mappingsResponse.json()
          if (!alive) {
            return
          }
          setMappings(mappingData.mappings ?? [])
        }
      })
      .catch(() => {
        if (alive) {
          setStatusText("Unable to load vendor SKU mappings.")
        }
      })

    return () => {
      alive = false
    }
  }, [vendorId, reloadTick])

  const filteredMappings = useMemo(() => {
    if (!filterText.trim()) {
      return mappings
    }
    const lowered = filterText.trim().toLowerCase()
    return mappings.filter((mapping) => {
      return (
        mapping.skuCode.toLowerCase().includes(lowered) ||
        mapping.skuName.toLowerCase().includes(lowered) ||
        mapping.vendorSku.toLowerCase().includes(lowered)
      )
    })
  }, [filterText, mappings])

  function selectedSkuFromLookup() {
    return skuLookup.find((sku) => sku.skuId === form.skuId)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatusText("")

    const selected = selectedSkuFromLookup()
    if (!selected) {
      setStatusText("Select a valid SKU.")
      return
    }

    const response = await fetch(`/api/vendors/${vendorId}/sku-mappings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        skuId: form.skuId,
        vendorSku: form.manufacturerSku || selected.skuCode,
        unitCost: Number(form.price),
        leadTimeDays: Number(form.leadTimeDays || 0),
        active: true,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      setStatusText(data.message ?? "Unable to save mapping.")
      return
    }

    setStatusText("Vendor SKU mapping saved.")
    setForm((current) => ({
      ...current,
      manufacturerSku: "",
      price: "0",
      leadTimeDays: "",
    }))
    setReloadTick((current) => current + 1)
  }

  async function handleDelete(mappingId: string) {
    const response = await fetch(`/api/vendors/${vendorId}/sku-mappings/${mappingId}`, {
      method: "DELETE",
    })
    if (!response.ok) {
      setStatusText("Unable to delete mapping.")
      return
    }
    setStatusText("Mapping deleted.")
    setReloadTick((current) => current + 1)
  }

  return (
    <section className="panel spaced-panel">
      <div className="panel-title">Vendor SKU Assignments</div>
      <form className="vendor-mapping-form" onSubmit={handleSubmit}>
        <div className="field-stack">
          <label>SKU</label>
          <select className="input" value={form.skuId} onChange={(event) => setForm((prev) => ({ ...prev, skuId: event.target.value }))}>
            {skuLookup.map((sku) => (
              <option key={sku.skuId} value={sku.skuId}>
                {sku.skuCode} - {sku.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field-stack">
          <label>Manufacturer SKU</label>
          <input
            className="input"
            value={form.manufacturerSku}
            onChange={(event) => setForm((prev) => ({ ...prev, manufacturerSku: event.target.value }))}
          />
        </div>

        <div className="field-stack">
          <label>Price</label>
          <input className="input" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} />
        </div>

        <div className="field-stack">
          <label>Lead Time (days)</label>
          <input
            className="input"
            value={form.leadTimeDays}
            onChange={(event) => setForm((prev) => ({ ...prev, leadTimeDays: event.target.value }))}
          />
        </div>

        <button className="primary-button" type="submit">
          Save SKU Mapping
        </button>
      </form>

      <div className="table-toolbar mapping-toolbar">
        <div className="search-row">
          <span>Search:</span>
          <input className="input small" value={filterText} onChange={(event) => setFilterText(event.target.value)} />
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Manufacturer SKU</th>
              <th>Price</th>
              <th>Lead Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMappings.length === 0 ? (
              <tr>
                <td colSpan={6}>No vendor SKU mappings found.</td>
              </tr>
            ) : (
              filteredMappings.map((mapping) => (
                <tr key={mapping.mappingId}>
                  <td>{mapping.skuCode}</td>
                  <td>{mapping.skuName}</td>
                  <td>{mapping.vendorSku || "-"}</td>
                  <td>{mapping.unitCost.toFixed(2)}</td>
                  <td>{mapping.leadTimeDays || "-"}</td>
                  <td>
                    <button className="danger-button" type="button" onClick={() => handleDelete(mapping.mappingId)}>
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
