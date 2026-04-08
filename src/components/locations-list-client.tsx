"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { LocationRecord } from "@/lib/wms-types"

interface LocationsListClientProps {
  locations: LocationRecord[]
}

export function LocationsListClient({ locations }: LocationsListClientProps) {
  const [warehouseFilter, setWarehouseFilter] = useState("All")
  const [typeFilter, setTypeFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")

  const warehouseOptions = Array.from(new Set(locations.map((location) => location.warehouse)))
  const typeOptions = Array.from(new Set(locations.map((location) => location.locationType)))

  const filtered = useMemo(() => {
    return locations.filter((location) => {
      if (warehouseFilter !== "All" && location.warehouse !== warehouseFilter) {
        return false
      }
      if (typeFilter !== "All" && location.locationType !== typeFilter) {
        return false
      }
      if (statusFilter === "Active" && !location.isActive) {
        return false
      }
      if (statusFilter === "Inactive" && location.isActive) {
        return false
      }
      return true
    })
  }, [locations, warehouseFilter, typeFilter, statusFilter])

  return (
    <>
      <section className="panel panel-elevated">
        <div className="panel-title">Location Filters</div>
        <div className="vendor-form-grid">
          <div className="field-stack">
            <label>Warehouse</label>
            <select className="input" value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}>
              <option value="All">All</option>
              {warehouseOptions.map((warehouse) => (
                <option key={warehouse} value={warehouse}>
                  {warehouse}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label>Type</label>
            <select className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="All">All</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label>Status</label>
            <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </section>

      <section className="panel spaced-panel panel-elevated table-panel">
        <div className="table-meta">Showing {filtered.length} of {locations.length} locations</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Warehouse</th>
                <th>Type</th>
                <th>Pickable</th>
                <th>Receivable</th>
                <th>Sellable</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>No locations found.</td>
                </tr>
              ) : (
                filtered.map((location) => (
                  <tr key={location.locationId}>
                    <td>
                      <Link className="table-link" href={`/locations/${location.locationId}`}>
                        {location.locationCode}
                      </Link>
                    </td>
                    <td>{location.locationName}</td>
                    <td>{location.warehouse}</td>
                    <td>{location.locationType}</td>
                    <td>{location.isPickable ? "Yes" : "No"}</td>
                    <td>{location.isReceivable ? "Yes" : "No"}</td>
                    <td>{location.isSellable ? "Yes" : "No"}</td>
                    <td>{location.isActive ? "Yes" : "No"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
