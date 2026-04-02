"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ValidationErrors } from "@/lib/wms-types"

interface FormState {
  customItem: boolean
  name: string
  value: string
  weightLb: string
  sku: string
  barcode: string
  warehouse: string
  uomItem: boolean
  uomType: string
  componentSku: string
  componentQuantity: string
  selectedVendors: string[]
}

const initialForm: FormState = {
  customItem: false,
  name: "",
  value: "0.00",
  weightLb: "0.00",
  sku: "",
  barcode: "",
  warehouse: "",
  uomItem: false,
  uomType: "Inner pack",
  componentSku: "",
  componentQuantity: "0.00",
  selectedVendors: [],
}

export function SkuCreateForm() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [saving, setSaving] = useState(false)
  const [serverMessage, setServerMessage] = useState("")
  const [vendorFilter, setVendorFilter] = useState("")
  const [vendorOptions, setVendorOptions] = useState<string[]>([])
  const [warehouseOptions, setWarehouseOptions] = useState<string[]>([])

  useEffect(() => {
    async function loadReferenceData() {
      const response = await fetch("/api/reference-data")
      if (!response.ok) {
        return
      }
      const data = await response.json()
      const vendors = (data.vendors ?? []).map((vendor: { vendorName: string }) => vendor.vendorName)
      const warehouses = data.warehouses ?? []
      setVendorOptions(vendors)
      setWarehouseOptions(warehouses)
      if (warehouses.length > 0) {
        setForm((current) => ({
          ...current,
          warehouse: current.warehouse || warehouses[0],
        }))
      }
    }
    void loadReferenceData()
  }, [])

  const filteredVendors = useMemo(() => {
    if (!vendorFilter.trim()) {
      return vendorOptions
    }
    const lowered = vendorFilter.trim().toLowerCase()
    return vendorOptions.filter((vendor) => vendor.toLowerCase().includes(lowered))
  }, [vendorFilter, vendorOptions])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setServerMessage("")
    setErrors({})

    const payload = {
      customItem: form.customItem,
      name: form.name,
      value: Number(form.value),
      weightLb: Number(form.weightLb),
      sku: form.sku,
      barcode: form.barcode,
      warehouse: form.warehouse,
      uomItem: form.uomItem,
      uomType: form.uomType,
      componentSku: form.componentSku,
      componentQuantity: Number(form.componentQuantity),
      selectedVendors: form.selectedVendors,
    }

    const response = await fetch("/api/skus", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      setSaving(false)
      setServerMessage(data.message ?? "Unable to save product.")
      setErrors(data.errors ?? {})
      return
    }

    router.push(`/products/${data.sku.id}`)
    router.refresh()
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function toggleVendor(vendor: string) {
    setForm((current) => {
      const selected = current.selectedVendors.includes(vendor)
      return {
        ...current,
        selectedVendors: selected
          ? current.selectedVendors.filter((entry) => entry !== vendor)
          : [...current.selectedVendors, vendor],
      }
    })
  }

  return (
    <form className="sku-create-grid" onSubmit={handleSubmit}>
      <section className="panel panel-elevated">
        <div className="panel-title">Details</div>

        <div className="form-intro">
          <p>Build SKU identity, warehouse defaults, and unit configuration.</p>
          <span className="intro-chip">Parity Mode</span>
        </div>

        <label className="check-row">
          <input
            type="checkbox"
            checked={form.customItem}
            onChange={(event) => updateField("customItem", event.target.checked)}
          />
          <span>This is a custom item.</span>
        </label>

        <div className="field-stack">
          <label htmlFor="name">Name: *</label>
          <input
            id="name"
            className={errors.name ? "input error" : "input"}
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="None"
          />
          {errors.name ? <p className="error-text">{errors.name}</p> : null}
        </div>

        <div className="field-stack">
          <label htmlFor="value">Value:</label>
          <input
            id="value"
            className="input"
            value={form.value}
            onChange={(event) => updateField("value", event.target.value)}
          />
          <small>This is your cost for account purposes (not the selling price).</small>
        </div>

        <div className="field-stack">
          <label htmlFor="weight">Weight (lb):</label>
          <input
            id="weight"
            className="input"
            value={form.weightLb}
            onChange={(event) => updateField("weightLb", event.target.value)}
          />
        </div>

        <div className="field-stack">
          <label htmlFor="sku">Sku: *</label>
          <input
            id="sku"
            className={errors.sku ? "input error" : "input"}
            value={form.sku}
            onChange={(event) => updateField("sku", event.target.value)}
            placeholder="Sku"
          />
          {errors.sku ? <p className="error-text">{errors.sku}</p> : null}
        </div>

        <div className="field-stack">
          <label htmlFor="barcode">Barcode:</label>
          <input
            id="barcode"
            className="input"
            value={form.barcode}
            onChange={(event) => updateField("barcode", event.target.value)}
            placeholder="If you don't enter a barcode, we will generate one for you."
          />
        </div>

        <div className="field-stack">
          <label htmlFor="warehouse">Warehouse</label>
          <select
            id="warehouse"
            className={errors.warehouse ? "input error" : "input"}
            value={form.warehouse}
            onChange={(event) => updateField("warehouse", event.target.value)}
          >
            {warehouseOptions.map((warehouse) => (
              <option key={warehouse} value={warehouse}>
                {warehouse}
              </option>
            ))}
          </select>
          {errors.warehouse ? <p className="error-text">{errors.warehouse}</p> : null}
        </div>

        <div className="field-stack">
          <label htmlFor="image">Product Image:</label>
          <div className="image-upload-row">
            <input id="image" className="input" type="file" disabled />
            <button className="tiny-button" type="button" disabled>
              +
            </button>
          </div>
        </div>

        <label className="check-row">
          <input
            type="checkbox"
            checked={form.uomItem}
            onChange={(event) => updateField("uomItem", event.target.checked)}
          />
          <span>This is a UOM item</span>
        </label>

        <div className="field-stack">
          <label htmlFor="uomType">UOM Type:</label>
          <select
            id="uomType"
            className="input"
            disabled={!form.uomItem}
            value={form.uomType}
            onChange={(event) => updateField("uomType", event.target.value)}
          >
            <option>Inner pack</option>
            <option>Master case</option>
            <option>Carton</option>
          </select>
        </div>

        <div className="field-stack">
          <label htmlFor="component">Component: *</label>
          <input
            id="component"
            className={errors.componentSku ? "input error" : "input"}
            disabled={!form.uomItem}
            value={form.componentSku}
            onChange={(event) => updateField("componentSku", event.target.value)}
            placeholder="Search for a product to add"
          />
          {errors.componentSku ? <p className="error-text">{errors.componentSku}</p> : null}
        </div>

        <div className="field-stack">
          <label htmlFor="componentQty">Quantity</label>
          <input
            id="componentQty"
            className={errors.componentQuantity ? "input error" : "input"}
            disabled={!form.uomItem}
            value={form.componentQuantity}
            onChange={(event) => updateField("componentQuantity", event.target.value)}
          />
          {errors.componentQuantity ? <p className="error-text">{errors.componentQuantity}</p> : null}
        </div>

        {serverMessage ? <p className="server-message">{serverMessage}</p> : null}
      </section>

      <aside className="panel panel-elevated vendor-panel">
        <div className="panel-title">Vendors</div>
        <div className="vendor-meta">
          <span>{form.selectedVendors.length} selected</span>
          <span>{filteredVendors.length} visible</span>
        </div>
        <div className="field-stack compact">
          <input
            className="input"
            value={vendorFilter}
            onChange={(event) => setVendorFilter(event.target.value)}
            placeholder="Search vendors"
          />
        </div>
        <div className="vendor-list">
          {filteredVendors.map((vendor) => (
            <label key={vendor} className="check-row vendor-row">
              <input
                type="checkbox"
                checked={form.selectedVendors.includes(vendor)}
                onChange={() => toggleVendor(vendor)}
              />
              <span>{vendor}</span>
            </label>
          ))}
        </div>
      </aside>

      <div className="save-bar">
        <p className="save-hint">Auto-generates barcode when empty. Required fields: Name and SKU.</p>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Product"}
        </button>
      </div>
    </form>
  )
}
