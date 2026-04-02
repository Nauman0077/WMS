"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ORDER_STATUS_OPTIONS } from "@/lib/order-statuses"
import { OrderRecord } from "@/lib/wms-types"

interface OrdersListClientProps {
  orders: OrderRecord[]
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0))

  for (let i = 0; i <= m; i += 1) dp[i][0] = i
  for (let j = 0; j <= n; j += 1) dp[0][j] = j

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }

  return dp[m][n]
}

export function OrdersListClient({ orders }: OrdersListClientProps) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query)

    const base =
      statusFilter === "All" ? orders : orders.filter((order) => normalize(order.status) === normalize(statusFilter))

    if (!normalizedQuery) {
      return { rows: base, mode: "all" as const }
    }

    const exact = base.filter(
      (order) =>
        normalize(order.orderNumber) === normalizedQuery || normalize(order.externalOrderNumber) === normalizedQuery,
    )
    if (exact.length > 0) {
      return { rows: exact, mode: "exact" as const }
    }

    const startsWith = base.filter(
      (order) =>
        normalize(order.orderNumber).startsWith(normalizedQuery) ||
        normalize(order.externalOrderNumber).startsWith(normalizedQuery),
    )
    if (startsWith.length > 0) {
      return { rows: startsWith, mode: "prefix" as const }
    }

    const includes = base.filter(
      (order) =>
        normalize(order.orderNumber).includes(normalizedQuery) ||
        normalize(order.externalOrderNumber).includes(normalizedQuery),
    )
    if (includes.length > 0) {
      return { rows: includes, mode: "contains" as const }
    }

    if (base.length === 0) {
      return { rows: [] as OrderRecord[], mode: "none" as const }
    }

    const closest = [...base].sort((a, b) => {
      const aScore = Math.min(
        editDistance(normalize(a.orderNumber), normalizedQuery),
        editDistance(normalize(a.externalOrderNumber), normalizedQuery),
      )
      const bScore = Math.min(
        editDistance(normalize(b.orderNumber), normalizedQuery),
        editDistance(normalize(b.externalOrderNumber), normalizedQuery),
      )
      return aScore - bScore
    })

    return { rows: closest.slice(0, 1), mode: "closest" as const }
  }, [orders, query, statusFilter])

  return (
    <>
      <section className="panel panel-elevated">
        <div className="panel-title">Filters</div>
        <div className="vendor-form-grid">
          <div className="field-stack">
            <label>Status</label>
            <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All</option>
              {ORDER_STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack field-span-2">
            <label>Search Order # / External #</label>
            <input
              className="input"
              placeholder="Try ORD-1000"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel spaced-panel panel-elevated table-panel">
        <div className="table-meta">Showing {filtered.rows.length} result(s) of {orders.length} total entries</div>
        {filtered.mode === "closest" ? (
          <p className="status-note">No direct match found. Showing the closest order number match.</p>
        ) : null}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>External #</th>
                <th>Placed</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Customer</th>
                <th>Shop</th>
                <th>Carrier</th>
                <th>Method</th>
                <th>Warehouse</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.rows.length === 0 ? (
                <tr>
                  <td colSpan={11}>No orders found.</td>
                </tr>
              ) : (
                filtered.rows.map((order) => (
                  <tr key={order.orderId}>
                    <td>
                      <Link className="table-link" href={`/orders/${order.orderId}`}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>{order.externalOrderNumber || "-"}</td>
                    <td>{new Date(order.placedAt).toLocaleString()}</td>
                    <td>{order.status}</td>
                    <td>{order.paymentStatus}</td>
                    <td>{order.customerName}</td>
                    <td>{order.shopName}</td>
                    <td>{order.shippingCarrier}</td>
                    <td>{order.shippingMethod}</td>
                    <td>{order.warehouse}</td>
                    <td>{order.totalAmount.toFixed(2)}</td>
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
