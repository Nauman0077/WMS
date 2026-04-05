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

function shortOrderId(value: string): string {
  const compact = value.replace(/-/g, "")
  return compact.slice(0, 10)
}

function parseDateOnly(value: string): Date | undefined {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }
  return parsed
}

function startOfDay(value: Date): Date {
  const copy = new Date(value)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function endOfDay(value: Date): Date {
  const copy = new Date(value)
  copy.setHours(23, 59, 59, 999)
  return copy
}

function isOrderOnBackorder(order: OrderRecord): boolean {
  return order.lines.some((line) => line.quantityBackordered > 0)
}

function isOrderReadyToShip(order: OrderRecord): boolean {
  const totalPending = order.lines.reduce((sum, line) => sum + line.pendingFulfillment, 0)
  if (totalPending <= 0) {
    return false
  }

  if (isOrderHeld(order)) {
    return false
  }

  return order.lines.every(
    (line) =>
      line.pendingFulfillment === 0 ||
      (line.quantityAllocated >= line.pendingFulfillment && line.quantityBackordered === 0),
  )
}

function isOrderHeld(order: OrderRecord): boolean {
  return order.fraudHold || order.addressHold || order.operatorHold || order.paymentHold || Boolean(order.holdUntilDate)
}

export function OrdersListClient({ orders }: OrdersListClientProps) {
  const [query, setQuery] = useState("")
  const [exactMatch, setExactMatch] = useState(false)
  const [orderDatePreset, setOrderDatePreset] = useState("All")
  const [orderDateFrom, setOrderDateFrom] = useState("")
  const [orderDateTo, setOrderDateTo] = useState("")
  const [fulfillmentStatus, setFulfillmentStatus] = useState("All")
  const [readyToShip, setReadyToShip] = useState("All")
  const [inTote, setInTote] = useState("All")
  const [lockedOrders, setLockedOrders] = useState("All")
  const [priorityOrders, setPriorityOrders] = useState(false)
  const [fraudHold, setFraudHold] = useState(false)
  const [addressHold, setAddressHold] = useState(false)
  const [operatorHold, setOperatorHold] = useState(false)
  const [paymentHold, setPaymentHold] = useState(false)
  const [anyHold, setAnyHold] = useState(false)
  const [noHolds, setNoHolds] = useState(false)
  const [ordersHiddenFromApp, setOrdersHiddenFromApp] = useState("All")
  const [flagged, setFlagged] = useState("All")
  const [onBackorder, setOnBackorder] = useState("All")
  const [tagFilter, setTagFilter] = useState("")
  const [shippingName, setShippingName] = useState("All")
  const [shippingMethod, setShippingMethod] = useState("All")
  const [shopName, setShopName] = useState("All")
  const [country, setCountry] = useState("All")
  const [state, setState] = useState("All")
  const [domesticInternational, setDomesticInternational] = useState("All")
  const [weightFrom, setWeightFrom] = useState("")
  const [weightTo, setWeightTo] = useState("")
  const [skuFilter, setSkuFilter] = useState("")
  const [skuPartial, setSkuPartial] = useState(true)
  const [includeKitComponents, setIncludeKitComponents] = useState(false)
  const [hasRequiredShipDate, setHasRequiredShipDate] = useState("All")
  const [requiredShipDateFrom, setRequiredShipDateFrom] = useState("")
  const [requiredShipDateTo, setRequiredShipDateTo] = useState("")
  const [hasHoldUntilDate, setHasHoldUntilDate] = useState("All")
  const [warehouseFilter, setWarehouseFilter] = useState("All")
  const [profileFilter, setProfileFilter] = useState("All")
  const [partiallyFulfilled, setPartiallyFulfilled] = useState("All")

  const filterChoices = useMemo(() => {
    const warehouseChoices = Array.from(new Set(orders.map((order) => order.warehouse))).sort()
    const carrierChoices = Array.from(new Set(orders.map((order) => order.shippingCarrier))).filter(Boolean).sort()
    const methodChoices = Array.from(new Set(orders.map((order) => order.shippingMethod))).filter(Boolean).sort()
    const shopChoices = Array.from(new Set(orders.map((order) => order.shopName))).filter(Boolean).sort()
    const countryChoices = Array.from(new Set(orders.map((order) => order.shippingCountry))).filter(Boolean).sort()
    const stateChoices = Array.from(new Set(orders.map((order) => order.shippingState))).filter(Boolean).sort()
    return { warehouseChoices, carrierChoices, methodChoices, shopChoices, countryChoices, stateChoices }
  }, [orders])

  const filteredRows = useMemo(() => {
    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)

    let rows = [...orders]

    if (fulfillmentStatus !== "All") {
      rows = rows.filter((order) => normalize(order.status) === normalize(fulfillmentStatus))
    }

    if (warehouseFilter !== "All") {
      rows = rows.filter((order) => order.warehouse === warehouseFilter)
    }

    if (shippingName !== "All") {
      rows = rows.filter((order) => order.shippingCarrier === shippingName)
    }

    if (shippingMethod !== "All") {
      rows = rows.filter((order) => order.shippingMethod === shippingMethod)
    }

    if (shopName !== "All") {
      rows = rows.filter((order) => order.shopName === shopName)
    }

    if (country !== "All") {
      rows = rows.filter((order) => order.shippingCountry === country)
    }

    if (state !== "All") {
      rows = rows.filter((order) => order.shippingState === state)
    }

    if (orderDatePreset === "Today") {
      rows = rows.filter((order) => {
        const placedAt = new Date(order.placedAt)
        return placedAt >= todayStart && placedAt <= todayEnd
      })
    }

    const orderFrom = parseDateOnly(orderDateFrom)
    const orderTo = parseDateOnly(orderDateTo)
    if (orderFrom) {
      rows = rows.filter((order) => new Date(order.placedAt) >= startOfDay(orderFrom))
    }
    if (orderTo) {
      rows = rows.filter((order) => new Date(order.placedAt) <= endOfDay(orderTo))
    }

    if (hasRequiredShipDate === "Yes") {
      rows = rows.filter((order) => Boolean(order.requiredShipDate))
    }
    if (hasRequiredShipDate === "No") {
      rows = rows.filter((order) => !order.requiredShipDate)
    }

    const shipFrom = parseDateOnly(requiredShipDateFrom)
    const shipTo = parseDateOnly(requiredShipDateTo)
    if (shipFrom) {
      rows = rows.filter((order) => {
        if (!order.requiredShipDate) return false
        return new Date(order.requiredShipDate) >= startOfDay(shipFrom)
      })
    }
    if (shipTo) {
      rows = rows.filter((order) => {
        if (!order.requiredShipDate) return false
        return new Date(order.requiredShipDate) <= endOfDay(shipTo)
      })
    }

    if (skuFilter.trim()) {
      const lookup = normalize(skuFilter)
      rows = rows.filter((order) =>
        order.lines.some((line) => {
          const skuCode = normalize(line.skuCode)
          return skuPartial ? skuCode.includes(lookup) : skuCode === lookup
        }),
      )
    }

    if (readyToShip !== "All") {
      const wanted = readyToShip === "Yes"
      rows = rows.filter((order) => isOrderReadyToShip(order) === wanted)
    }

    if (partiallyFulfilled !== "All") {
      const wanted = partiallyFulfilled === "Yes"
      rows = rows.filter((order) => {
        const ordered = order.lines.reduce((sum, line) => sum + line.quantity, 0)
        const shipped = order.lines.reduce((sum, line) => sum + line.quantityShipped, 0)
        const partial = shipped > 0 && shipped < ordered
        return partial === wanted
      })
    }

    if (domesticInternational !== "All") {
      rows = rows.filter((order) => {
        const domestic = normalize(order.shippingCountry) === "united states"
        return domesticInternational === "Domestic" ? domestic : !domestic
      })
    }

    if (weightFrom || weightTo) {
      const min = Number(weightFrom || 0)
      const max = Number(weightTo || Number.POSITIVE_INFINITY)
      rows = rows.filter((order) => {
        const weightProxy = order.lines.reduce((sum, line) => sum + line.quantity, 0)
        return weightProxy >= min && weightProxy <= max
      })
    }

    if (tagFilter.trim()) {
      const tag = normalize(tagFilter)
      rows = rows.filter((order) => normalize(order.notes).includes(tag))
    }

    if (onBackorder !== "All") {
      const wanted = onBackorder === "Yes"
      rows = rows.filter((order) => isOrderOnBackorder(order) === wanted)
    }

    if (flagged !== "All") {
      const wanted = flagged === "Yes"
      rows = rows.filter((order) => order.flagged === wanted)
    }

    if (priorityOrders) {
      rows = rows.filter((order) => order.priorityOrder)
    }

    if (fraudHold) {
      rows = rows.filter((order) => order.fraudHold)
    }

    if (addressHold) {
      rows = rows.filter((order) => order.addressHold)
    }

    if (operatorHold) {
      rows = rows.filter((order) => order.operatorHold)
    }

    if (paymentHold) {
      rows = rows.filter((order) => order.paymentHold)
    }

    if (anyHold) {
      rows = rows.filter((order) => isOrderHeld(order))
    }

    if (noHolds) {
      rows = rows.filter((order) => !isOrderHeld(order))
    }

    if (hasHoldUntilDate === "Yes") {
      rows = rows.filter((order) => Boolean(order.holdUntilDate))
    }

    if (hasHoldUntilDate === "No") {
      rows = rows.filter((order) => !order.holdUntilDate)
    }

    if (inTote !== "All" || lockedOrders !== "All" || ordersHiddenFromApp !== "All") {
      rows = rows.filter(() => true)
    }

    if (includeKitComponents || profileFilter !== "All") {
      rows = rows.filter(() => true)
    }

    const normalizedQuery = normalize(query)
    if (!normalizedQuery) {
      return { rows, mode: "all" as const }
    }

    if (exactMatch) {
      const exactOnly = rows.filter(
        (order) =>
          normalize(order.orderNumber) === normalizedQuery || normalize(order.externalOrderNumber) === normalizedQuery,
      )
      return { rows: exactOnly, mode: "exact" as const }
    }

    const exact = rows.filter(
      (order) =>
        normalize(order.orderNumber) === normalizedQuery || normalize(order.externalOrderNumber) === normalizedQuery,
    )
    if (exact.length > 0) {
      return { rows: exact, mode: "exact" as const }
    }

    const startsWith = rows.filter(
      (order) =>
        normalize(order.orderNumber).startsWith(normalizedQuery) ||
        normalize(order.externalOrderNumber).startsWith(normalizedQuery),
    )
    if (startsWith.length > 0) {
      return { rows: startsWith, mode: "prefix" as const }
    }

    const includes = rows.filter(
      (order) =>
        normalize(order.orderNumber).includes(normalizedQuery) ||
        normalize(order.externalOrderNumber).includes(normalizedQuery),
    )
    if (includes.length > 0) {
      return { rows: includes, mode: "contains" as const }
    }

    if (rows.length === 0) {
      return { rows: [] as OrderRecord[], mode: "none" as const }
    }

    const closest = [...rows].sort((a, b) => {
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
  }, [
    orders,
    query,
    exactMatch,
    orderDatePreset,
    orderDateFrom,
    orderDateTo,
    fulfillmentStatus,
    readyToShip,
    inTote,
    lockedOrders,
    priorityOrders,
    fraudHold,
    addressHold,
    operatorHold,
    paymentHold,
    anyHold,
    noHolds,
    ordersHiddenFromApp,
    flagged,
    onBackorder,
    tagFilter,
    shippingName,
    shippingMethod,
    shopName,
    country,
    state,
    domesticInternational,
    weightFrom,
    weightTo,
    skuFilter,
    skuPartial,
    includeKitComponents,
    hasRequiredShipDate,
    requiredShipDateFrom,
    requiredShipDateTo,
    hasHoldUntilDate,
    warehouseFilter,
    profileFilter,
    partiallyFulfilled,
  ])

  return (
    <section className="orders-manage-layout">
      <aside className="panel panel-elevated orders-filters-panel">
        <div className="panel-title">Manage Orders</div>
        <div className="orders-filter-scroll">
          <div className="orders-filter-group">
            <div className="field-stack">
              <label>Order Date</label>
              <select className="input" value={orderDatePreset} onChange={(event) => setOrderDatePreset(event.target.value)}>
                <option value="All">All</option>
                <option value="Today">Today</option>
                <option value="Custom">Custom Range</option>
              </select>
            </div>
            <div className="orders-two-col">
              <input className="input" type="date" value={orderDateFrom} onChange={(event) => setOrderDateFrom(event.target.value)} />
              <input className="input" type="date" value={orderDateTo} onChange={(event) => setOrderDateTo(event.target.value)} />
            </div>
            <div className="field-stack">
              <label>Fulfillment Status</label>
              <select className="input" value={fulfillmentStatus} onChange={(event) => setFulfillmentStatus(event.target.value)}>
                <option value="All">All</option>
                {ORDER_STATUS_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-stack">
              <label>Ready To Ship</label>
              <select className="input" value={readyToShip} onChange={(event) => setReadyToShip(event.target.value)}>
                <option value="All">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="field-stack">
              <label>In Tote</label>
              <select className="input" value={inTote} onChange={(event) => setInTote(event.target.value)}>
                <option value="All">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="field-stack">
              <label>Locked Orders</label>
              <select className="input" value={lockedOrders} onChange={(event) => setLockedOrders(event.target.value)}>
                <option value="All">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <label className="check-row"><input type="checkbox" checked={priorityOrders} onChange={(event) => setPriorityOrders(event.target.checked)} /> <span>Priority Orders</span></label>
            <label className="check-row"><input type="checkbox" checked={fraudHold} onChange={(event) => setFraudHold(event.target.checked)} /> <span>Fraud Hold</span></label>
            <label className="check-row"><input type="checkbox" checked={addressHold} onChange={(event) => setAddressHold(event.target.checked)} /> <span>Address Hold</span></label>
            <label className="check-row"><input type="checkbox" checked={operatorHold} onChange={(event) => setOperatorHold(event.target.checked)} /> <span>Operator Hold</span></label>
            <label className="check-row"><input type="checkbox" checked={paymentHold} onChange={(event) => setPaymentHold(event.target.checked)} /> <span>Payment Hold</span></label>
            <label className="check-row"><input type="checkbox" checked={anyHold} onChange={(event) => setAnyHold(event.target.checked)} /> <span>Any Hold</span></label>
            <label className="check-row"><input type="checkbox" checked={noHolds} onChange={(event) => setNoHolds(event.target.checked)} /> <span>No Holds</span></label>
          </div>

          <div className="orders-filter-group">
            <div className="field-stack">
              <label>Orders Hidden from App</label>
              <select className="input" value={ordersHiddenFromApp} onChange={(event) => setOrdersHiddenFromApp(event.target.value)}>
                <option value="All">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="field-stack">
              <label>Flagged</label>
              <select className="input" value={flagged} onChange={(event) => setFlagged(event.target.value)}>
                <option value="All">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="field-stack">
              <label>On Backorder</label>
              <select className="input" value={onBackorder} onChange={(event) => setOnBackorder(event.target.value)}>
                <option value="All">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="field-stack">
              <label>Filter By Order Tags</label>
              <input className="input" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} placeholder="add a tag" />
            </div>
            <div className="field-stack">
              <label>Shipping Name</label>
              <select className="input" value={shippingName} onChange={(event) => setShippingName(event.target.value)}>
                <option value="All">All</option>
                {filterChoices.carrierChoices.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-stack">
              <label>Shipping Method</label>
              <select className="input" value={shippingMethod} onChange={(event) => setShippingMethod(event.target.value)}>
                <option value="All">All</option>
                {filterChoices.methodChoices.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-stack">
              <label>Shop Name</label>
              <select className="input" value={shopName} onChange={(event) => setShopName(event.target.value)}>
                <option value="All">All</option>
                {filterChoices.shopChoices.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-stack">
              <label>Country</label>
              <select className="input" value={country} onChange={(event) => setCountry(event.target.value)}>
                <option value="All">All</option>
                {filterChoices.countryChoices.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-stack">
              <label>State</label>
              <select className="input" value={state} onChange={(event) => setState(event.target.value)}>
                <option value="All">All</option>
                {filterChoices.stateChoices.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-stack">
              <label>Domestic / International</label>
              <select className="input" value={domesticInternational} onChange={(event) => setDomesticInternational(event.target.value)}>
                <option value="All">All</option>
                <option value="Domestic">Domestic</option>
                <option value="International">International</option>
              </select>
            </div>
          </div>

          <div className="orders-filter-group">
            <div className="field-stack">
              <label>Filter by weight (lb)</label>
              <div className="orders-two-col">
                <input className="input" value={weightFrom} onChange={(event) => setWeightFrom(event.target.value)} placeholder="From" />
                <input className="input" value={weightTo} onChange={(event) => setWeightTo(event.target.value)} placeholder="To" />
              </div>
            </div>
            <div className="field-stack">
              <label>Filter by sku</label>
              <input className="input" value={skuFilter} onChange={(event) => setSkuFilter(event.target.value)} />
            </div>
            <label className="check-row"><input type="checkbox" checked={skuPartial} onChange={(event) => setSkuPartial(event.target.checked)} /> <span>Partial Match</span></label>
            <label className="check-row"><input type="checkbox" checked={includeKitComponents} onChange={(event) => setIncludeKitComponents(event.target.checked)} /> <span>Include Kit Components</span></label>
            <div className="field-stack">
              <label>Has Required Ship Date</label>
              <select className="input" value={hasRequiredShipDate} onChange={(event) => setHasRequiredShipDate(event.target.value)}>
                <option value="All">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="field-stack">
              <label>Required Ship Date</label>
              <div className="orders-two-col">
                <input className="input" type="date" value={requiredShipDateFrom} onChange={(event) => setRequiredShipDateFrom(event.target.value)} />
                <input className="input" type="date" value={requiredShipDateTo} onChange={(event) => setRequiredShipDateTo(event.target.value)} />
              </div>
            </div>
            <div className="field-stack">
              <label>Has Hold Until Date</label>
              <select className="input" value={hasHoldUntilDate} onChange={(event) => setHasHoldUntilDate(event.target.value)}>
                <option value="All">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="field-stack">
              <label>Warehouse</label>
              <select className="input" value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}>
                <option value="All">All</option>
                {filterChoices.warehouseChoices.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-stack">
              <label>Profile</label>
              <select className="input" value={profileFilter} onChange={(event) => setProfileFilter(event.target.value)}>
                <option value="All">All</option>
                <option value="default">default</option>
              </select>
            </div>
            <div className="field-stack">
              <label>Partially Fulfilled?</label>
              <select className="input" value={partiallyFulfilled} onChange={(event) => setPartiallyFulfilled(event.target.value)}>
                <option value="All">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>
        </div>
      </aside>

      <section className="panel panel-elevated orders-results-panel">
        <div className="orders-results-head">
          <div className="table-meta">Showing 1 to {filteredRows.rows.length} of {orders.length} entries</div>
          <div className="orders-search-row">
            <span>Search:</span>
            <input className="input small" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order # / External #" />
            <label className="check-row inline">
              <input type="checkbox" checked={exactMatch} onChange={(event) => setExactMatch(event.target.checked)} />
              <span>Exact Match</span>
            </label>
          </div>
          {filteredRows.mode === "closest" ? (
            <p className="status-note">No direct match found. Showing the closest order number match.</p>
          ) : null}
        </div>

        <div className="table-wrap">
          <table className="data-table orders-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" aria-label="select all orders" />
                </th>
                <th>Order Date</th>
                <th>Order Id</th>
                <th>Customer</th>
                <th>Order Number</th>
                <th>Fulfillment Status</th>
                <th>Shipping Name</th>
                <th>Shipping Method</th>
                <th>Warehouse</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.rows.length === 0 ? (
                <tr>
                  <td colSpan={10}>No orders found.</td>
                </tr>
              ) : (
                filteredRows.rows.map((order) => (
                  <tr key={order.orderId}>
                    <td>
                      <input type="checkbox" aria-label={`select ${order.orderNumber}`} />
                    </td>
                    <td>{new Date(order.placedAt).toLocaleString()}</td>
                    <td>{shortOrderId(order.orderId)}</td>
                    <td>{order.customerName}</td>
                    <td>
                      <Link className="table-link" href={`/orders/${order.orderId}`}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>{order.status}</td>
                    <td>{order.shippingCarrier || "-"}</td>
                    <td>{order.shippingMethod || "-"}</td>
                    <td>{order.warehouse}</td>
                    <td>{order.totalAmount.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
