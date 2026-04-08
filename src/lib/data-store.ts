import { randomUUID, scryptSync } from "node:crypto"
import path from "node:path"
import { appendCsvRow, ensureCsvFile, fromBool, fromNumber, readCsvRows } from "@/lib/csv-core"

const DATA_DIR = path.join(process.cwd(), "data")

export const CSV_FILES = {
  users: {
    path: path.join(DATA_DIR, "users.csv"),
    headers: [
      "user_id",
      "username",
      "email",
      "password_hash",
      "password_salt",
      "full_name",
      "role",
      "is_active",
      "created_at",
      "updated_at",
      "last_login_at",
    ],
  },
  sessions: {
    path: path.join(DATA_DIR, "sessions.csv"),
    headers: [
      "session_id",
      "user_id",
      "username",
      "issued_at",
      "expires_at",
      "revoked_at",
      "ip",
      "user_agent",
    ],
  },
  skus: {
    path: path.join(DATA_DIR, "skus.csv"),
    headers: [
      "sku_id",
      "sku_code",
      "name",
      "barcode",
      "warehouse",
      "value",
      "price",
      "weight_lb",
      "height_in",
      "width_in",
      "length_in",
      "customs_value",
      "customs_description",
      "country_of_manufacture",
      "value_currency",
      "tariff_code",
      "tags",
      "active",
      "custom_item",
      "is_final_sale",
      "dropship_only",
      "built_kit",
      "is_assembly",
      "ignore_on_invoice",
      "ignore_on_customs",
      "is_virtual",
      "needs_serial_number",
      "lithium_ion",
      "auto_fulfill",
      "auto_pack",
      "ships_alone",
      "uom_enabled",
      "uom_type",
      "uom_component_sku",
      "uom_quantity",
      "on_hand",
      "available",
      "allocated",
      "reserved",
      "backorder",
      "non_sellable_total",
      "created_at",
      "updated_at",
    ],
  },
  skuNotes: {
    path: path.join(DATA_DIR, "sku_notes.csv"),
    headers: ["sku_id", "product_note", "packer_note", "return_note", "updated_at", "updated_by"],
  },
  skuLocations: {
    path: path.join(DATA_DIR, "sku_locations.csv"),
    headers: [
      "assignment_id",
      "sku_id",
      "warehouse",
      "location_id",
      "location",
      "quantity",
      "created_at",
      "updated_at",
    ],
  },
  locations: {
    path: path.join(DATA_DIR, "locations.csv"),
    headers: [
      "location_id",
      "warehouse",
      "location_code",
      "location_name",
      "location_type",
      "is_active",
      "is_pickable",
      "is_receivable",
      "is_sellable",
      "sort_order",
      "notes",
      "created_at",
      "updated_at",
    ],
  },
  vendors: {
    path: path.join(DATA_DIR, "vendors.csv"),
    headers: [
      "vendor_id",
      "vendor_code",
      "vendor_name",
      "account_number",
      "contact_name",
      "contact_email",
      "contact_phone",
      "shipping_address_1",
      "shipping_address_2",
      "shipping_city",
      "shipping_state",
      "shipping_postal_code",
      "shipping_country",
      "notes_internal",
      "created_at",
      "updated_at",
    ],
  },
  vendorSkuMap: {
    path: path.join(DATA_DIR, "vendor_sku_map.csv"),
    headers: [
      "mapping_id",
      "vendor_id",
      "sku_id",
      "sku_code",
      "sku_name",
      "vendor_sku",
      "unit_cost",
      "lead_time_days",
      "active",
      "created_at",
      "updated_at",
    ],
  },
  purchaseOrders: {
    path: path.join(DATA_DIR, "purchase_orders.csv"),
    headers: [
      "po_id",
      "po_number",
      "vendor_id",
      "vendor_name",
      "warehouse",
      "status",
      "order_date",
      "expected_date",
      "received_date",
      "reference_number",
      "shipping_method",
      "notes_internal",
      "subtotal",
      "shipping_amount",
      "total_amount",
      "created_by",
      "created_at",
      "updated_at",
    ],
  },
  purchaseOrderLines: {
    path: path.join(DATA_DIR, "purchase_order_lines.csv"),
    headers: [
      "po_line_id",
      "po_id",
      "line_number",
      "sku_id",
      "sku_code",
      "product_name",
      "vendor_sku",
      "ordered_qty",
      "received_qty",
      "unit_cost",
      "expected_date",
      "line_status",
      "notes",
      "created_at",
      "updated_at",
    ],
  },
  purchaseOrderHistory: {
    path: path.join(DATA_DIR, "purchase_order_history.csv"),
    headers: ["history_id", "po_id", "event_type", "event_message", "changed_by", "location", "created_at"],
  },
  orders: {
    path: path.join(DATA_DIR, "orders.csv"),
    headers: [
      "order_id",
      "order_number",
      "external_order_number",
      "shop_name",
      "customer_name",
      "customer_email",
      "shipping_carrier",
      "shipping_method",
      "shipping_address_1",
      "shipping_address_2",
      "shipping_city",
      "shipping_state",
      "shipping_postal_code",
      "shipping_country",
      "warehouse",
      "status",
      "payment_status",
      "flagged",
      "priority_order",
      "fraud_hold",
      "address_hold",
      "operator_hold",
      "payment_hold",
      "hold_until_date",
      "placed_at",
      "required_ship_date",
      "shipped_at",
      "notes",
      "subtotal",
      "shipping_amount",
      "tax_amount",
      "total_amount",
      "created_at",
      "updated_at",
    ],
  },
  orderLines: {
    path: path.join(DATA_DIR, "order_lines.csv"),
    headers: [
      "line_id",
      "order_id",
      "sku_id",
      "sku_code",
      "product_name",
      "allocated_warehouse",
      "quantity",
      "pending_fulfillment",
      "quantity_allocated",
      "quantity_backordered",
      "quantity_shipped",
      "unit_price",
      "line_total",
      "created_at",
      "updated_at",
    ],
  },
  orderHistory: {
    path: path.join(DATA_DIR, "order_history.csv"),
    headers: ["history_id", "order_id", "event_type", "event_message", "changed_by", "created_at"],
  },
  inventoryLog: {
    path: path.join(DATA_DIR, "inventory_log.csv"),
    headers: [
      "log_id",
      "sku_id",
      "date",
      "warehouse",
      "location",
      "changed_by",
      "old_on_hand",
      "new_on_hand",
      "reference_type",
      "reference_id",
      "note",
    ],
  },
} as const

let initPromise: Promise<void> | undefined

export function getDataDir(): string {
  return DATA_DIR
}

export async function ensureDataStore(): Promise<void> {
  if (!initPromise) {
    initPromise = initializeStore()
  }
  return initPromise
}

async function initializeStore(): Promise<void> {
  await Promise.all(
    Object.values(CSV_FILES).map((file) => ensureCsvFile(file.path, [...file.headers])),
  )

  await seedAdminUser()
  await seedSkuAndVendors()
  await seedOrders()
  await seedLocationsAndBalances()
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex")
}

async function seedAdminUser(): Promise<void> {
  const rows = await readCsvRows(CSV_FILES.users.path, [...CSV_FILES.users.headers])
  const exists = rows.some((row) => row.username.toLowerCase() === "admin")
  if (exists) {
    return
  }

  const now = new Date().toISOString()
  const salt = randomUUID()
  const hash = hashPassword("admin", salt)

  await appendCsvRow(CSV_FILES.users.path, [...CSV_FILES.users.headers], {
    user_id: randomUUID(),
    username: "admin",
    email: "admin@local.wms",
    password_hash: hash,
    password_salt: salt,
    full_name: "System Admin",
    role: "admin",
    is_active: fromBool(true),
    created_at: now,
    updated_at: now,
    last_login_at: "",
  })
}

async function seedSkuAndVendors(): Promise<void> {
  const skuRows = await readCsvRows(CSV_FILES.skus.path, [...CSV_FILES.skus.headers])
  const vendorRows = await readCsvRows(CSV_FILES.vendors.path, [...CSV_FILES.vendors.headers])
  const mapRows = await readCsvRows(CSV_FILES.vendorSkuMap.path, [...CSV_FILES.vendorSkuMap.headers])
  const noteRows = await readCsvRows(CSV_FILES.skuNotes.path, [...CSV_FILES.skuNotes.headers])

  const now = new Date().toISOString()

  if (vendorRows.length === 0) {
    await appendCsvRow(CSV_FILES.vendors.path, [...CSV_FILES.vendors.headers], {
      vendor_id: "VENDOR-ABC",
      vendor_code: "ABC",
      vendor_name: "Vendor ABC",
      account_number: "ACC-ABC-001",
      contact_name: "Alex Buyer",
      contact_email: "sales@vendorabc.example",
      contact_phone: "+1 702 555 0100",
      shipping_address_1: "100 Industrial Ave",
      shipping_address_2: "Dock 4",
      shipping_city: "Las Vegas",
      shipping_state: "NV",
      shipping_postal_code: "89101",
      shipping_country: "United States",
      notes_internal: "Default seeded vendor",
      created_at: now,
      updated_at: now,
    })
  }

  if (skuRows.length === 0) {
    await appendCsvRow(CSV_FILES.skus.path, [...CSV_FILES.skus.headers], {
      sku_id: "518002659",
      sku_code: "ALLB1",
      name: "Wheel Without Lock for Carry-On - Mini Cherry Red",
      barcode: "1764963412",
      warehouse: "Las Vegas, USA - Nysonian - All Brands / Primary",
      value: fromNumber(0.45),
      price: fromNumber(0),
      weight_lb: fromNumber(0),
      height_in: fromNumber(0),
      width_in: fromNumber(0),
      length_in: fromNumber(0),
      customs_value: fromNumber(0),
      customs_description: "",
      country_of_manufacture: "United States of America",
      value_currency: "USD",
      tariff_code: "0",
      tags: "",
      active: fromBool(true),
      custom_item: fromBool(false),
      is_final_sale: fromBool(false),
      dropship_only: fromBool(false),
      built_kit: fromBool(false),
      is_assembly: fromBool(false),
      ignore_on_invoice: fromBool(false),
      ignore_on_customs: fromBool(false),
      is_virtual: fromBool(false),
      needs_serial_number: fromBool(false),
      lithium_ion: fromBool(false),
      auto_fulfill: fromBool(false),
      auto_pack: fromBool(false),
      ships_alone: fromBool(false),
      uom_enabled: fromBool(false),
      uom_type: "Inner pack",
      uom_component_sku: "",
      uom_quantity: fromNumber(0),
      on_hand: fromNumber(50),
      available: fromNumber(50),
      allocated: fromNumber(0),
      reserved: fromNumber(0),
      backorder: fromNumber(0),
      non_sellable_total: fromNumber(0),
      created_at: now,
      updated_at: now,
    })
  }

  if (noteRows.length === 0) {
    await appendCsvRow(CSV_FILES.skuNotes.path, [...CSV_FILES.skuNotes.headers], {
      sku_id: "518002659",
      product_note: "",
      packer_note: "",
      return_note: "",
      updated_at: now,
      updated_by: "seed",
    })
  }

  const hasMapping = mapRows.some((row) => row.vendor_id === "VENDOR-ABC" && row.sku_id === "518002659")
  if (!hasMapping) {
    await appendCsvRow(CSV_FILES.vendorSkuMap.path, [...CSV_FILES.vendorSkuMap.headers], {
      mapping_id: randomUUID(),
      vendor_id: "VENDOR-ABC",
      sku_id: "518002659",
      sku_code: "ALLB1",
      sku_name: "Wheel Without Lock for Carry-On - Mini Cherry Red",
      vendor_sku: "ALLB1",
      unit_cost: fromNumber(0.45),
      lead_time_days: fromNumber(14),
      active: fromBool(true),
      created_at: now,
      updated_at: now,
    })
  }
}

async function seedOrders(): Promise<void> {
  const [orders, lines, history, skuRows] = await Promise.all([
    readCsvRows(CSV_FILES.orders.path, [...CSV_FILES.orders.headers]),
    readCsvRows(CSV_FILES.orderLines.path, [...CSV_FILES.orderLines.headers]),
    readCsvRows(CSV_FILES.orderHistory.path, [...CSV_FILES.orderHistory.headers]),
    readCsvRows(CSV_FILES.skus.path, [...CSV_FILES.skus.headers]),
  ])

  if (orders.length > 0 || skuRows.length === 0) {
    return
  }

  const now = new Date().toISOString()
  const sku = skuRows[0]
  const orderId = randomUUID()

  await appendCsvRow(CSV_FILES.orders.path, [...CSV_FILES.orders.headers], {
    order_id: orderId,
    order_number: "ORD-1000",
    external_order_number: "WEB-50001",
    shop_name: "Nobltravel Store",
    customer_name: "Jamie Rivera",
    customer_email: "jamie.rivera@example.com",
    shipping_carrier: "UPS",
    shipping_method: "Ground",
    shipping_address_1: "245 Market Street",
    shipping_address_2: "Apt 12",
    shipping_city: "San Francisco",
    shipping_state: "CA",
    shipping_postal_code: "94105",
    shipping_country: "United States",
    warehouse: sku.warehouse,
    status: "Unfulfilled",
    payment_status: "Paid",
    flagged: fromBool(false),
    priority_order: fromBool(false),
    fraud_hold: fromBool(false),
    address_hold: fromBool(false),
    operator_hold: fromBool(false),
    payment_hold: fromBool(false),
    hold_until_date: "",
    placed_at: now,
    required_ship_date: now,
    shipped_at: "",
    notes: "Seed order",
    subtotal: fromNumber(49.99),
    shipping_amount: fromNumber(6.5),
    tax_amount: fromNumber(4.1),
    total_amount: fromNumber(60.59),
    created_at: now,
    updated_at: now,
  })

  if (lines.length === 0) {
    await appendCsvRow(CSV_FILES.orderLines.path, [...CSV_FILES.orderLines.headers], {
      line_id: randomUUID(),
      order_id: orderId,
      sku_id: sku.sku_id,
      sku_code: sku.sku_code,
      product_name: sku.name,
      allocated_warehouse: sku.warehouse,
      quantity: fromNumber(1),
      pending_fulfillment: fromNumber(1),
      quantity_allocated: fromNumber(1),
      quantity_backordered: fromNumber(0),
      quantity_shipped: fromNumber(0),
      unit_price: fromNumber(49.99),
      line_total: fromNumber(49.99),
      created_at: now,
      updated_at: now,
    })
  }

  if (history.length === 0) {
    await appendCsvRow(CSV_FILES.orderHistory.path, [...CSV_FILES.orderHistory.headers], {
      history_id: randomUUID(),
      order_id: orderId,
      event_type: "created",
      event_message: "Order created",
      changed_by: "seed",
      created_at: now,
    })
  }
}

const DEFAULT_LOCATION_TEMPLATES = [
  {
    locationCode: "RECEIVING",
    locationName: "Receiving",
    locationType: "receiving",
    isPickable: false,
    isReceivable: true,
    isSellable: true,
    sortOrder: 10,
    notes: "Default inbound receiving area",
  },
  {
    locationCode: "PICK-01",
    locationName: "Pick 01",
    locationType: "pick",
    isPickable: true,
    isReceivable: false,
    isSellable: true,
    sortOrder: 20,
    notes: "Default primary pick face",
  },
  {
    locationCode: "BULK-01",
    locationName: "Bulk 01",
    locationType: "bulk",
    isPickable: false,
    isReceivable: false,
    isSellable: true,
    sortOrder: 30,
    notes: "Default bulk storage",
  },
  {
    locationCode: "RETURNS-01",
    locationName: "Returns 01",
    locationType: "returns",
    isPickable: false,
    isReceivable: false,
    isSellable: false,
    sortOrder: 40,
    notes: "Default returns holding area",
  },
  {
    locationCode: "QUARANTINE-01",
    locationName: "Quarantine 01",
    locationType: "quarantine",
    isPickable: false,
    isReceivable: false,
    isSellable: false,
    sortOrder: 50,
    notes: "Default non-sellable quarantine area",
  },
] as const

async function seedLocationsAndBalances(): Promise<void> {
  const [initialLocationRows, skuRows, skuLocationRows] = await Promise.all([
    readCsvRows(CSV_FILES.locations.path, [...CSV_FILES.locations.headers]),
    readCsvRows(CSV_FILES.skus.path, [...CSV_FILES.skus.headers]),
    readCsvRows(CSV_FILES.skuLocations.path, [...CSV_FILES.skuLocations.headers]),
  ])

  const now = new Date().toISOString()
  const warehouses = Array.from(new Set(skuRows.map((row) => row.warehouse).filter(Boolean)))
  const locationKeys = new Set(initialLocationRows.map((row) => `${row.warehouse}::${row.location_code}`))

  for (const warehouse of warehouses) {
    for (const template of DEFAULT_LOCATION_TEMPLATES) {
      const key = `${warehouse}::${template.locationCode}`
      if (locationKeys.has(key)) {
        continue
      }

      await appendCsvRow(CSV_FILES.locations.path, [...CSV_FILES.locations.headers], {
        location_id: randomUUID(),
        warehouse,
        location_code: template.locationCode,
        location_name: template.locationName,
        location_type: template.locationType,
        is_active: fromBool(true),
        is_pickable: fromBool(template.isPickable),
        is_receivable: fromBool(template.isReceivable),
        is_sellable: fromBool(template.isSellable),
        sort_order: fromNumber(template.sortOrder),
        notes: template.notes,
        created_at: now,
        updated_at: now,
      })
      locationKeys.add(key)
    }
  }

  const locationRows = await readCsvRows(CSV_FILES.locations.path, [...CSV_FILES.locations.headers])

  const existingBalanceKeys = new Set(
    skuLocationRows
      .filter((row) => row.sku_id && row.warehouse && row.location)
      .map((row) => `${row.sku_id}::${row.warehouse}::${row.location}`),
  )

  for (const sku of skuRows) {
    const quantity = Number(sku.on_hand || 0)
    if (quantity <= 0) {
      continue
    }

    const balanceKey = `${sku.sku_id}::${sku.warehouse}::BULK-01`
    if (existingBalanceKeys.has(balanceKey)) {
      continue
    }

    const bulkLocation = locationRows.find(
      (row) => row.warehouse === sku.warehouse && row.location_code === "BULK-01",
    )

    await appendCsvRow(CSV_FILES.skuLocations.path, [...CSV_FILES.skuLocations.headers], {
      assignment_id: randomUUID(),
      sku_id: sku.sku_id,
      warehouse: sku.warehouse,
      location_id: bulkLocation?.location_id || "",
      location: "BULK-01",
      quantity: fromNumber(quantity),
      created_at: now,
      updated_at: now,
    })
    existingBalanceKeys.add(balanceKey)
  }
}
