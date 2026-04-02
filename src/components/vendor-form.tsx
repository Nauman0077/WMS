"use client"

import { FormEvent, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CreateVendorInput, ValidationErrors, VendorRecord } from "@/lib/wms-types"

interface VendorFormProps {
  mode: "create" | "edit"
  vendorId?: string
  initialVendor?: VendorRecord
}

interface VendorFormState {
  vendorName: string
  email: string
  contactName: string
  phone: string
  accountNumber: string
  address1: string
  address2: string
  city: string
  state: string
  postalCode: string
  country: string
  notes: string
}

const initialState: VendorFormState = {
  vendorName: "",
  email: "",
  contactName: "",
  phone: "",
  accountNumber: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "United States",
  notes: "",
}

function toVendorCode(vendorName: string): string {
  const normalized = vendorName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return normalized ? normalized.slice(0, 24) : ""
}

function buildPayload(form: VendorFormState, existing?: VendorRecord): CreateVendorInput {
  return {
    vendorCode: existing?.vendorCode || toVendorCode(form.vendorName),
    vendorName: form.vendorName.trim(),
    accountNumber: form.accountNumber.trim(),
    contactName: form.contactName.trim(),
    contactEmail: form.email.trim(),
    contactPhone: form.phone.trim(),
    address1: form.address1.trim(),
    address2: form.address2.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    postalCode: form.postalCode.trim(),
    country: form.country.trim() || "United States",
    notes: form.notes.trim(),
  }
}

export function VendorForm({ mode, vendorId, initialVendor }: VendorFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<VendorFormState>(() => {
    if (!initialVendor) {
      return initialState
    }

    return {
      vendorName: initialVendor.vendorName,
      email: initialVendor.contactEmail,
      contactName: initialVendor.contactName,
      phone: initialVendor.contactPhone,
      accountNumber: initialVendor.accountNumber,
      address1: initialVendor.address1,
      address2: initialVendor.address2,
      city: initialVendor.city,
      state: initialVendor.state,
      postalCode: initialVendor.postalCode,
      country: initialVendor.country || "United States",
      notes: initialVendor.notes,
    }
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [serverMessage, setServerMessage] = useState("")
  const [saving, setSaving] = useState(false)

  const title = useMemo(() => (mode === "create" ? "Create Vendor" : "Update Vendor"), [mode])

  function update<K extends keyof VendorFormState>(key: K, value: VendorFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setServerMessage("")
    setErrors({})

    const payload = buildPayload(form, initialVendor)

    const response = await fetch(mode === "create" ? "/api/vendors" : `/api/vendors/${vendorId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    if (!response.ok) {
      setSaving(false)
      setServerMessage(data.message ?? "Unable to save vendor.")
      setErrors(data.errors ?? {})
      return
    }

    router.push(`/vendors/${data.vendor.vendorId}`)
    router.refresh()
  }

  return (
    <form className="vendor-form" onSubmit={handleSubmit}>
      <section className="panel panel-elevated">
        <div className="panel-title">{title}</div>
        <div className="vendor-form-grid">
          <div className="field-stack">
            <label>Vendor Name *</label>
            <input
              className={errors.vendorName ? "input error" : "input"}
              value={form.vendorName}
              onChange={(event) => update("vendorName", event.target.value)}
            />
            {errors.vendorName ? <p className="error-text">{errors.vendorName}</p> : null}
          </div>

          <div className="field-stack">
            <label>Email</label>
            <input className="input" value={form.email} onChange={(event) => update("email", event.target.value)} />
          </div>

          <div className="field-stack">
            <label>Contact Name</label>
            <input className="input" value={form.contactName} onChange={(event) => update("contactName", event.target.value)} />
          </div>

          <div className="field-stack">
            <label>Phone</label>
            <input className="input" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          </div>

          <div className="field-stack">
            <label>Account Number</label>
            <input
              className="input"
              value={form.accountNumber}
              onChange={(event) => update("accountNumber", event.target.value)}
            />
          </div>

          <div className="field-stack field-span-2">
            <label>Address 1</label>
            <input className="input" value={form.address1} onChange={(event) => update("address1", event.target.value)} />
          </div>

          <div className="field-stack field-span-2">
            <label>Address 2</label>
            <input className="input" value={form.address2} onChange={(event) => update("address2", event.target.value)} />
          </div>

          <div className="field-stack">
            <label>City</label>
            <input className="input" value={form.city} onChange={(event) => update("city", event.target.value)} />
          </div>

          <div className="field-stack">
            <label>State</label>
            <input className="input" value={form.state} onChange={(event) => update("state", event.target.value)} />
          </div>

          <div className="field-stack">
            <label>Postal Code</label>
            <input className="input" value={form.postalCode} onChange={(event) => update("postalCode", event.target.value)} />
          </div>

          <div className="field-stack">
            <label>Country</label>
            <input className="input" value={form.country} onChange={(event) => update("country", event.target.value)} />
          </div>

          <div className="field-stack field-span-2">
            <label>Notes</label>
            <textarea className="note-area slim" value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </div>
        </div>

        {serverMessage ? <p className="server-message">{serverMessage}</p> : null}

        <div className="right-action">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : mode === "create" ? "Create Vendor" : "Save Vendor"}
          </button>
        </div>
      </section>
    </form>
  )
}
