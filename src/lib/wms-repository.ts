import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto"
import {
  appendCsvRow,
  fromBool,
  fromNumber,
  readCsvRows,
  toBool,
  toNumber,
  writeCsvRows,
} from "@/lib/csv-core"
import { CSV_FILES, ensureDataStore } from "@/lib/data-store"
import {
  BulkPatchSkusInput,
  CreateLocationInput,
  CreateOrderInput,
  CreatePurchaseOrderInput,
  CreateSkuInput,
  CreateVendorInput,
  CreateVendorSkuInput,
  InventoryLogEntry,
  LoginInput,
  LocationRecord,
  OrderHistoryEntry,
  OrderLineItem,
  OrderRecord,
  PatchLocationInput,
  PatchOrderInput,
  PatchPurchaseOrderInput,
  PatchSkuInput,
  PatchVendorInput,
  PurchaseOrderEntry,
  PurchaseOrderHistoryEntry,
  PurchaseOrderLine,
  PurchaseOrderSummaryRow,
  ReceivePurchaseOrderInput,
  SessionRecord,
  SkuLocationBalance,
  SkuRecord,
  UserRecord,
  ValidationErrors,
  VendorRecord,
  VendorSkuMapping,
} from "@/lib/wms-types"
import { ORDER_STATUS_DEFAULT, ORDER_STATUS_OPTIONS } from "@/lib/order-statuses"

const DEFAULT_WAREHOUSES = [
  "Las Vegas, USA - Nysonian - All Brands / Primary",
  "Tecate, MEX - Nysonian - NOBL / NOBL Travel Mexico",
  "China Warehouse",
]

const PO_STATUS_PENDING = "Pending"
const PO_STATUS_IN_TRANSIT = "In Transit"
const PO_STATUS_RECEIVED = "Received"
const PO_STATUS_CLOSED = "Closed"

const PO_STATUS_LOOKUP = new Map<string, string>([
  ["pending", PO_STATUS_PENDING],
  ["draft", PO_STATUS_PENDING],
  ["open", PO_STATUS_PENDING],
  ["in transit", PO_STATUS_IN_TRANSIT],
  ["in_transit", PO_STATUS_IN_TRANSIT],
  ["partial", PO_STATUS_IN_TRANSIT],
  ["received", PO_STATUS_RECEIVED],
  ["closed", PO_STATUS_CLOSED],
])

function nowIso(): string {
  return new Date().toISOString()
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex")
}

function compareHash(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
  } catch {
    return false
  }
}

function normalizeText(value: string): string {
  return value.trim()
}

function normalizePoStatus(value: string | undefined, fallback = PO_STATUS_PENDING): string {
  const normalized = normalizeText(value ?? "").toLowerCase()
  return PO_STATUS_LOOKUP.get(normalized) ?? fallback
}

const ORDER_STATUS_LOOKUP = new Map<string, string>([
  ["pending", "Unfulfilled"],
  ["in transit", "Unfulfilled"],
  ["in_transit", "Unfulfilled"],
  ["received", "Fulfilled"],
  ["closed", "Fulfilled"],
  ...ORDER_STATUS_OPTIONS.map((value) => [value.toLowerCase(), value] as const),
])

function normalizeOrderStatus(value: string | undefined, fallback = ORDER_STATUS_DEFAULT): string {
  const normalized = normalizeText(value ?? "").toLowerCase()
  return ORDER_STATUS_LOOKUP.get(normalized) ?? fallback
}

function isCanceledOrderStatus(value: string): boolean {
  return normalizeOrderStatus(value) === "Canceled"
}

function resetSkuAvailabilityForOrderReconciliation(rows: SkuRow[]): SkuRow[] {
  return rows.map((row) => ({
    ...row,
    available: Math.max(0, row.onHand - row.reserved),
    allocated: 0,
    backorder: 0,
  }))
}

function deriveVendorCode(value: string): string {
  const compact = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  if (compact) {
    return compact.slice(0, 24)
  }
  return `VENDOR-${Math.floor(Math.random() * 9000) + 1000}`
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

async function readUsers(): Promise<UserRecord[]> {
  await ensureDataStore()
  const rows = await readCsvRows(CSV_FILES.users.path, [...CSV_FILES.users.headers])
  return rows.map((row) => ({
    userId: row.user_id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    fullName: row.full_name,
    role: row.role,
    isActive: toBool(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  }))
}

async function writeUsers(users: UserRecord[]): Promise<void> {
  await writeCsvRows(
    CSV_FILES.users.path,
    [...CSV_FILES.users.headers],
    users.map((user) => ({
      user_id: user.userId,
      username: user.username,
      email: user.email,
      password_hash: user.passwordHash,
      password_salt: user.passwordSalt,
      full_name: user.fullName,
      role: user.role,
      is_active: fromBool(user.isActive),
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      last_login_at: user.lastLoginAt,
    })),
  )
}

async function readSessions(): Promise<SessionRecord[]> {
  await ensureDataStore()
  const rows = await readCsvRows(CSV_FILES.sessions.path, [...CSV_FILES.sessions.headers])
  return rows.map((row) => ({
    sessionId: row.session_id,
    userId: row.user_id,
    username: row.username,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    ip: row.ip,
    userAgent: row.user_agent,
  }))
}

async function writeSessions(sessions: SessionRecord[]): Promise<void> {
  await writeCsvRows(
    CSV_FILES.sessions.path,
    [...CSV_FILES.sessions.headers],
    sessions.map((session) => ({
      session_id: session.sessionId,
      user_id: session.userId,
      username: session.username,
      issued_at: session.issuedAt,
      expires_at: session.expiresAt,
      revoked_at: session.revokedAt,
      ip: session.ip,
      user_agent: session.userAgent,
    })),
  )
}

interface SkuRow {
  skuId: string
  skuCode: string
  name: string
  barcode: string
  warehouse: string
  value: number
  price: number
  weightLb: number
  heightIn: number
  widthIn: number
  lengthIn: number
  customsValue: number
  customsDescription: string
  countryOfManufacture: string
  valueCurrency: string
  tariffCode: string
  tags: string
  active: boolean
  customItem: boolean
  isFinalSale: boolean
  dropshipOnly: boolean
  builtKit: boolean
  isAssembly: boolean
  ignoreOnInvoice: boolean
  ignoreOnCustoms: boolean
  isVirtual: boolean
  needsSerialNumber: boolean
  lithiumIon: boolean
  autoFulfill: boolean
  autoPack: boolean
  shipsAlone: boolean
  uomEnabled: boolean
  uomType: string
  uomComponentSku: string
  uomQuantity: number
  onHand: number
  available: number
  allocated: number
  reserved: number
  backorder: number
  nonSellableTotal: number
  createdAt: string
  updatedAt: string
}

interface SkuNoteRow {
  skuId: string
  productNote: string
  packerNote: string
  returnNote: string
  updatedAt: string
  updatedBy: string
}

interface PurchaseOrderRow {
  poId: string
  poNumber: string
  vendorId: string
  vendorName: string
  warehouse: string
  status: string
  orderDate: string
  expectedDate: string
  receivedDate: string
  poDisplayId: string
  trackingNumber: string
  notes: string
  subtotal: number
  shippingAmount: number
  totalAmount: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface InventoryLogRow {
  logId: string
  skuId: string
  date: string
  warehouse: string
  location: string
  changedBy: string
  oldOnHand: number
  newOnHand: number
  referenceType: string
  referenceId: string
  note: string
}

interface PurchaseOrderHistoryRow {
  historyId: string
  poId: string
  eventType: string
  eventMessage: string
  changedBy: string
  location: string
  createdAt: string
}

interface SkuLocationAssignmentRow {
  assignmentId: string
  skuId: string
  warehouse: string
  locationId: string
  locationCode: string
  quantity: number
  createdAt: string
  updatedAt: string
}

interface LocationRow {
  locationId: string
  warehouse: string
  locationCode: string
  locationName: string
  locationType: string
  isActive: boolean
  isPickable: boolean
  isReceivable: boolean
  isSellable: boolean
  sortOrder: number
  notes: string
  createdAt: string
  updatedAt: string
}

interface OrderRow {
  orderId: string
  orderNumber: string
  externalOrderNumber: string
  shopName: string
  customerName: string
  customerEmail: string
  shippingCarrier: string
  shippingMethod: string
  shippingAddress1: string
  shippingAddress2: string
  shippingCity: string
  shippingState: string
  shippingPostalCode: string
  shippingCountry: string
  warehouse: string
  status: string
  paymentStatus: string
  flagged: boolean
  priorityOrder: boolean
  fraudHold: boolean
  addressHold: boolean
  operatorHold: boolean
  paymentHold: boolean
  holdUntilDate: string
  placedAt: string
  requiredShipDate: string
  shippedAt: string
  notes: string
  subtotal: number
  shippingAmount: number
  taxAmount: number
  totalAmount: number
  createdAt: string
  updatedAt: string
}

interface OrderLineRow {
  lineId: string
  orderId: string
  skuId: string
  skuCode: string
  productName: string
  allocatedWarehouse: string
  quantity: number
  pendingFulfillment: number
  quantityAllocated: number
  quantityBackordered: number
  quantityShipped: number
  unitPrice: number
  lineTotal: number
  createdAt: string
  updatedAt: string
}

interface OrderHistoryRow {
  historyId: string
  orderId: string
  eventType: string
  eventMessage: string
  changedBy: string
  createdAt: string
}

async function readSkuRows(): Promise<SkuRow[]> {
  await ensureDataStore()
  const rows = await readCsvRows(CSV_FILES.skus.path, [...CSV_FILES.skus.headers])
  return rows.map((row) => ({
    skuId: row.sku_id,
    skuCode: row.sku_code,
    name: row.name,
    barcode: row.barcode,
    warehouse: row.warehouse,
    value: toNumber(row.value),
    price: toNumber(row.price),
    weightLb: toNumber(row.weight_lb),
    heightIn: toNumber(row.height_in),
    widthIn: toNumber(row.width_in),
    lengthIn: toNumber(row.length_in),
    customsValue: toNumber(row.customs_value),
    customsDescription: row.customs_description,
    countryOfManufacture: row.country_of_manufacture,
    valueCurrency: row.value_currency,
    tariffCode: row.tariff_code,
    tags: row.tags,
    active: toBool(row.active),
    customItem: toBool(row.custom_item),
    isFinalSale: toBool(row.is_final_sale),
    dropshipOnly: toBool(row.dropship_only),
    builtKit: toBool(row.built_kit),
    isAssembly: toBool(row.is_assembly),
    ignoreOnInvoice: toBool(row.ignore_on_invoice),
    ignoreOnCustoms: toBool(row.ignore_on_customs),
    isVirtual: toBool(row.is_virtual),
    needsSerialNumber: toBool(row.needs_serial_number),
    lithiumIon: toBool(row.lithium_ion),
    autoFulfill: toBool(row.auto_fulfill),
    autoPack: toBool(row.auto_pack),
    shipsAlone: toBool(row.ships_alone),
    uomEnabled: toBool(row.uom_enabled),
    uomType: row.uom_type,
    uomComponentSku: row.uom_component_sku,
    uomQuantity: toNumber(row.uom_quantity),
    onHand: toNumber(row.on_hand),
    available: toNumber(row.available),
    allocated: toNumber(row.allocated),
    reserved: toNumber(row.reserved),
    backorder: toNumber(row.backorder),
    nonSellableTotal: toNumber(row.non_sellable_total),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

async function writeSkuRows(rows: SkuRow[]): Promise<void> {
  await writeCsvRows(
    CSV_FILES.skus.path,
    [...CSV_FILES.skus.headers],
    rows.map((row) => ({
      sku_id: row.skuId,
      sku_code: row.skuCode,
      name: row.name,
      barcode: row.barcode,
      warehouse: row.warehouse,
      value: fromNumber(row.value),
      price: fromNumber(row.price),
      weight_lb: fromNumber(row.weightLb),
      height_in: fromNumber(row.heightIn),
      width_in: fromNumber(row.widthIn),
      length_in: fromNumber(row.lengthIn),
      customs_value: fromNumber(row.customsValue),
      customs_description: row.customsDescription,
      country_of_manufacture: row.countryOfManufacture,
      value_currency: row.valueCurrency,
      tariff_code: row.tariffCode,
      tags: row.tags,
      active: fromBool(row.active),
      custom_item: fromBool(row.customItem),
      is_final_sale: fromBool(row.isFinalSale),
      dropship_only: fromBool(row.dropshipOnly),
      built_kit: fromBool(row.builtKit),
      is_assembly: fromBool(row.isAssembly),
      ignore_on_invoice: fromBool(row.ignoreOnInvoice),
      ignore_on_customs: fromBool(row.ignoreOnCustoms),
      is_virtual: fromBool(row.isVirtual),
      needs_serial_number: fromBool(row.needsSerialNumber),
      lithium_ion: fromBool(row.lithiumIon),
      auto_fulfill: fromBool(row.autoFulfill),
      auto_pack: fromBool(row.autoPack),
      ships_alone: fromBool(row.shipsAlone),
      uom_enabled: fromBool(row.uomEnabled),
      uom_type: row.uomType,
      uom_component_sku: row.uomComponentSku,
      uom_quantity: fromNumber(row.uomQuantity),
      on_hand: fromNumber(row.onHand),
      available: fromNumber(row.available),
      allocated: fromNumber(row.allocated),
      reserved: fromNumber(row.reserved),
      backorder: fromNumber(row.backorder),
      non_sellable_total: fromNumber(row.nonSellableTotal),
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    })),
  )
}

async function readSkuNoteRows(): Promise<SkuNoteRow[]> {
  const rows = await readCsvRows(CSV_FILES.skuNotes.path, [...CSV_FILES.skuNotes.headers])
  return rows.map((row) => ({
    skuId: row.sku_id,
    productNote: row.product_note,
    packerNote: row.packer_note,
    returnNote: row.return_note,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  }))
}

async function writeSkuNoteRows(rows: SkuNoteRow[]): Promise<void> {
  await writeCsvRows(
    CSV_FILES.skuNotes.path,
    [...CSV_FILES.skuNotes.headers],
    rows.map((row) => ({
      sku_id: row.skuId,
      product_note: row.productNote,
      packer_note: row.packerNote,
      return_note: row.returnNote,
      updated_at: row.updatedAt,
      updated_by: row.updatedBy,
    })),
  )
}

async function readSkuLocationRows(): Promise<SkuLocationAssignmentRow[]> {
  const rows = await readCsvRows(CSV_FILES.skuLocations.path, [...CSV_FILES.skuLocations.headers])
  return rows.map((row) => ({
    assignmentId: row.assignment_id,
    skuId: row.sku_id,
    warehouse: row.warehouse,
    locationId: row.location_id,
    locationCode: row.location,
    quantity: toNumber(row.quantity),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

async function writeSkuLocationRows(rows: SkuLocationAssignmentRow[]): Promise<void> {
  await writeCsvRows(
    CSV_FILES.skuLocations.path,
    [...CSV_FILES.skuLocations.headers],
    rows.map((row) => ({
      assignment_id: row.assignmentId,
      sku_id: row.skuId,
      warehouse: row.warehouse,
      location_id: row.locationId,
      location: row.locationCode,
      quantity: fromNumber(row.quantity),
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    })),
  )
}

async function readLocationRows(): Promise<LocationRow[]> {
  const rows = await readCsvRows(CSV_FILES.locations.path, [...CSV_FILES.locations.headers])
  return rows.map((row) => ({
    locationId: row.location_id,
    warehouse: row.warehouse,
    locationCode: row.location_code,
    locationName: row.location_name,
    locationType: row.location_type,
    isActive: toBool(row.is_active),
    isPickable: toBool(row.is_pickable),
    isReceivable: toBool(row.is_receivable),
    isSellable: toBool(row.is_sellable),
    sortOrder: toNumber(row.sort_order),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

async function writeLocationRows(rows: LocationRow[]): Promise<void> {
  await writeCsvRows(
    CSV_FILES.locations.path,
    [...CSV_FILES.locations.headers],
    rows.map((row) => ({
      location_id: row.locationId,
      warehouse: row.warehouse,
      location_code: row.locationCode,
      location_name: row.locationName,
      location_type: row.locationType,
      is_active: fromBool(row.isActive),
      is_pickable: fromBool(row.isPickable),
      is_receivable: fromBool(row.isReceivable),
      is_sellable: fromBool(row.isSellable),
      sort_order: fromNumber(row.sortOrder),
      notes: row.notes,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    })),
  )
}

async function ensureDefaultLocationsForWarehouses(warehouses: string[]): Promise<void> {
  const locationRows = await readLocationRows()
  const locationKeys = new Set(locationRows.map((row) => `${row.warehouse}::${row.locationCode}`))
  const now = nowIso()

  const rowsToAdd = warehouses
    .map((warehouse) => normalizeText(warehouse))
    .filter(Boolean)
    .flatMap((warehouse) =>
      DEFAULT_LOCATION_TEMPLATES.filter((template) => !locationKeys.has(`${warehouse}::${template.locationCode}`)).map(
        (template) => ({
          locationId: randomUUID(),
          warehouse,
          locationCode: template.locationCode,
          locationName: template.locationName,
          locationType: template.locationType,
          isActive: true,
          isPickable: template.isPickable,
          isReceivable: template.isReceivable,
          isSellable: template.isSellable,
          sortOrder: template.sortOrder,
          notes: template.notes,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    )

  if (rowsToAdd.length === 0) {
    return
  }

  await writeLocationRows([...locationRows, ...rowsToAdd])
}

function validateLocationInput(input: CreateLocationInput, existing: LocationRow[], editingId?: string): ValidationErrors {
  const errors: ValidationErrors = {}
  const warehouse = normalizeText(input.warehouse)
  const locationCode = normalizeText(input.locationCode).toUpperCase()

  if (!warehouse) {
    errors.warehouse = "Warehouse is required."
  }
  if (!locationCode) {
    errors.locationCode = "Location code is required."
  }
  if (!normalizeText(input.locationName)) {
    errors.locationName = "Location name is required."
  }

  const duplicate = existing.some(
    (row) =>
      row.locationId !== editingId &&
      row.warehouse.trim().toLowerCase() === warehouse.toLowerCase() &&
      row.locationCode.trim().toLowerCase() === locationCode.toLowerCase(),
  )

  if (duplicate) {
    errors.locationCode = "Location code already exists in this warehouse."
  }

  return errors
}

function resolveWarehouseLocation(
  warehouse: string,
  locationRows: LocationRow[],
  requestedLocation?: string,
): LocationRow | undefined {
  const activeRows = locationRows.filter((row) => row.warehouse === warehouse && row.isActive)
  const normalizedRequested = normalizeText(requestedLocation ?? "")

  if (normalizedRequested) {
    return activeRows.find(
      (row) => row.locationId === normalizedRequested || row.locationCode.toLowerCase() === normalizedRequested.toLowerCase(),
    )
  }

  return (
    activeRows.find((row) => row.locationCode === "RECEIVING") ||
    activeRows.find((row) => row.isReceivable) ||
    activeRows[0]
  )
}

async function readVendorRows(): Promise<VendorRecord[]> {
  const rows = await readCsvRows(CSV_FILES.vendors.path, [...CSV_FILES.vendors.headers])
  return rows.map((row) => ({
    vendorId: row.vendor_id,
    vendorCode: row.vendor_code,
    vendorName: row.vendor_name,
    accountNumber: row.account_number,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    address1: row.shipping_address_1,
    address2: row.shipping_address_2,
    city: row.shipping_city,
    state: row.shipping_state,
    postalCode: row.shipping_postal_code,
    country: row.shipping_country,
    notes: row.notes_internal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

async function writeVendorRows(rows: VendorRecord[]): Promise<void> {
  await writeCsvRows(
    CSV_FILES.vendors.path,
    [...CSV_FILES.vendors.headers],
    rows.map((row) => ({
      vendor_id: row.vendorId,
      vendor_code: row.vendorCode,
      vendor_name: row.vendorName,
      account_number: row.accountNumber,
      contact_name: row.contactName,
      contact_email: row.contactEmail,
      contact_phone: row.contactPhone,
      shipping_address_1: row.address1,
      shipping_address_2: row.address2,
      shipping_city: row.city,
      shipping_state: row.state,
      shipping_postal_code: row.postalCode,
      shipping_country: row.country,
      notes_internal: row.notes,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    })),
  )
}

async function readVendorMappings(): Promise<VendorSkuMapping[]> {
  const rows = await readCsvRows(CSV_FILES.vendorSkuMap.path, [...CSV_FILES.vendorSkuMap.headers])
  return rows.map((row) => ({
    mappingId: row.mapping_id,
    vendorId: row.vendor_id,
    skuId: row.sku_id,
    skuCode: row.sku_code,
    skuName: row.sku_name,
    vendorSku: row.vendor_sku,
    unitCost: toNumber(row.unit_cost),
    leadTimeDays: toNumber(row.lead_time_days),
    active: toBool(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

async function writeVendorMappings(rows: VendorSkuMapping[]): Promise<void> {
  await writeCsvRows(
    CSV_FILES.vendorSkuMap.path,
    [...CSV_FILES.vendorSkuMap.headers],
    rows.map((row) => ({
      mapping_id: row.mappingId,
      vendor_id: row.vendorId,
      sku_id: row.skuId,
      sku_code: row.skuCode,
      sku_name: row.skuName,
      vendor_sku: row.vendorSku,
      unit_cost: fromNumber(row.unitCost),
      lead_time_days: fromNumber(row.leadTimeDays),
      active: fromBool(row.active),
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    })),
  )
}

async function readPurchaseOrderRows(): Promise<PurchaseOrderRow[]> {
  const rows = await readCsvRows(CSV_FILES.purchaseOrders.path, [...CSV_FILES.purchaseOrders.headers])
  return rows.map((row) => ({
    poId: row.po_id,
    poNumber: row.po_number,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    warehouse: row.warehouse,
    status: normalizePoStatus(row.status),
    orderDate: row.order_date,
    expectedDate: row.expected_date,
    receivedDate: row.received_date,
    poDisplayId: row.reference_number,
    trackingNumber: row.shipping_method,
    notes: row.notes_internal,
    subtotal: toNumber(row.subtotal),
    shippingAmount: toNumber(row.shipping_amount),
    totalAmount: toNumber(row.total_amount),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

async function writePurchaseOrderRows(rows: PurchaseOrderRow[]): Promise<void> {
  await writeCsvRows(
    CSV_FILES.purchaseOrders.path,
    [...CSV_FILES.purchaseOrders.headers],
    rows.map((row) => ({
      po_id: row.poId,
      po_number: row.poNumber,
      vendor_id: row.vendorId,
      vendor_name: row.vendorName,
      warehouse: row.warehouse,
      status: row.status,
      order_date: row.orderDate,
      expected_date: row.expectedDate,
      received_date: row.receivedDate,
      reference_number: row.poDisplayId,
      shipping_method: row.trackingNumber,
      notes_internal: row.notes,
      subtotal: fromNumber(row.subtotal),
      shipping_amount: fromNumber(row.shippingAmount),
      total_amount: fromNumber(row.totalAmount),
      created_by: row.createdBy,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    })),
  )
}

async function readPurchaseOrderLines(): Promise<PurchaseOrderLine[]> {
  const rows = await readCsvRows(CSV_FILES.purchaseOrderLines.path, [...CSV_FILES.purchaseOrderLines.headers])
  return rows.map((row) => ({
    poLineId: row.po_line_id,
    poId: row.po_id,
    lineNumber: toNumber(row.line_number),
    skuId: row.sku_id,
    skuCode: row.sku_code,
    productName: row.product_name,
    vendorSku: row.vendor_sku,
    orderedQty: toNumber(row.ordered_qty),
    receivedQty: toNumber(row.received_qty),
    unitCost: toNumber(row.unit_cost),
    lineTotal: toNumber(row.ordered_qty) * toNumber(row.unit_cost),
    expectedDate: row.expected_date,
    lineStatus: normalizePoStatus(row.line_status),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

async function writePurchaseOrderLines(rows: PurchaseOrderLine[]): Promise<void> {
  await writeCsvRows(
    CSV_FILES.purchaseOrderLines.path,
    [...CSV_FILES.purchaseOrderLines.headers],
    rows.map((row) => ({
      po_line_id: row.poLineId,
      po_id: row.poId,
      line_number: fromNumber(row.lineNumber),
      sku_id: row.skuId,
      sku_code: row.skuCode,
      product_name: row.productName,
      vendor_sku: row.vendorSku,
      ordered_qty: fromNumber(row.orderedQty),
      received_qty: fromNumber(row.receivedQty),
      unit_cost: fromNumber(row.unitCost),
      expected_date: row.expectedDate,
      line_status: row.lineStatus,
      notes: row.notes,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    })),
  )
}

async function readOrderRows(): Promise<OrderRow[]> {
  const rows = await readCsvRows(CSV_FILES.orders.path, [...CSV_FILES.orders.headers])
  return rows.map((row) => ({
    orderId: row.order_id,
    orderNumber: row.order_number,
    externalOrderNumber: row.external_order_number,
    shopName: row.shop_name,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    shippingCarrier: row.shipping_carrier,
    shippingMethod: row.shipping_method,
    shippingAddress1: row.shipping_address_1,
    shippingAddress2: row.shipping_address_2,
    shippingCity: row.shipping_city,
    shippingState: row.shipping_state,
    shippingPostalCode: row.shipping_postal_code,
    shippingCountry: row.shipping_country,
    warehouse: row.warehouse,
    status: normalizeOrderStatus(row.status),
    paymentStatus: row.payment_status,
    flagged: toBool(row.flagged),
    priorityOrder: toBool(row.priority_order),
    fraudHold: toBool(row.fraud_hold),
    addressHold: toBool(row.address_hold),
    operatorHold: toBool(row.operator_hold),
    paymentHold: toBool(row.payment_hold),
    holdUntilDate: row.hold_until_date,
    placedAt: row.placed_at,
    requiredShipDate: row.required_ship_date,
    shippedAt: row.shipped_at,
    notes: row.notes,
    subtotal: toNumber(row.subtotal),
    shippingAmount: toNumber(row.shipping_amount),
    taxAmount: toNumber(row.tax_amount),
    totalAmount: toNumber(row.total_amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

async function writeOrderRows(rows: OrderRow[]): Promise<void> {
  await writeCsvRows(
    CSV_FILES.orders.path,
    [...CSV_FILES.orders.headers],
    rows.map((row) => ({
      order_id: row.orderId,
      order_number: row.orderNumber,
      external_order_number: row.externalOrderNumber,
      shop_name: row.shopName,
      customer_name: row.customerName,
      customer_email: row.customerEmail,
      shipping_carrier: row.shippingCarrier,
      shipping_method: row.shippingMethod,
      shipping_address_1: row.shippingAddress1,
      shipping_address_2: row.shippingAddress2,
      shipping_city: row.shippingCity,
      shipping_state: row.shippingState,
      shipping_postal_code: row.shippingPostalCode,
      shipping_country: row.shippingCountry,
      warehouse: row.warehouse,
      status: row.status,
      payment_status: row.paymentStatus,
      flagged: fromBool(row.flagged),
      priority_order: fromBool(row.priorityOrder),
      fraud_hold: fromBool(row.fraudHold),
      address_hold: fromBool(row.addressHold),
      operator_hold: fromBool(row.operatorHold),
      payment_hold: fromBool(row.paymentHold),
      hold_until_date: row.holdUntilDate,
      placed_at: row.placedAt,
      required_ship_date: row.requiredShipDate,
      shipped_at: row.shippedAt,
      notes: row.notes,
      subtotal: fromNumber(row.subtotal),
      shipping_amount: fromNumber(row.shippingAmount),
      tax_amount: fromNumber(row.taxAmount),
      total_amount: fromNumber(row.totalAmount),
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    })),
  )
}

async function readOrderLineRows(): Promise<OrderLineRow[]> {
  const rows = await readCsvRows(CSV_FILES.orderLines.path, [...CSV_FILES.orderLines.headers])
  return rows.map((row) => ({
    lineId: row.line_id,
    orderId: row.order_id,
    skuId: row.sku_id,
    skuCode: row.sku_code,
    productName: row.product_name,
    allocatedWarehouse: row.allocated_warehouse,
    quantity: toNumber(row.quantity),
    pendingFulfillment: toNumber(row.pending_fulfillment),
    quantityAllocated: toNumber(row.quantity_allocated),
    quantityBackordered: toNumber(row.quantity_backordered),
    quantityShipped: toNumber(row.quantity_shipped),
    unitPrice: toNumber(row.unit_price),
    lineTotal: toNumber(row.line_total),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

async function writeOrderLineRows(rows: OrderLineRow[]): Promise<void> {
  await writeCsvRows(
    CSV_FILES.orderLines.path,
    [...CSV_FILES.orderLines.headers],
    rows.map((row) => ({
      line_id: row.lineId,
      order_id: row.orderId,
      sku_id: row.skuId,
      sku_code: row.skuCode,
      product_name: row.productName,
      allocated_warehouse: row.allocatedWarehouse,
      quantity: fromNumber(row.quantity),
      pending_fulfillment: fromNumber(row.pendingFulfillment),
      quantity_allocated: fromNumber(row.quantityAllocated),
      quantity_backordered: fromNumber(row.quantityBackordered),
      quantity_shipped: fromNumber(row.quantityShipped),
      unit_price: fromNumber(row.unitPrice),
      line_total: fromNumber(row.lineTotal),
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    })),
  )
}

async function readOrderHistoryRows(): Promise<OrderHistoryRow[]> {
  const rows = await readCsvRows(CSV_FILES.orderHistory.path, [...CSV_FILES.orderHistory.headers])
  return rows.map((row) => ({
    historyId: row.history_id,
    orderId: row.order_id,
    eventType: row.event_type,
    eventMessage: row.event_message,
    changedBy: row.changed_by,
    createdAt: row.created_at,
  }))
}

async function appendOrderHistoryRow(entry: OrderHistoryEntry): Promise<void> {
  await appendCsvRow(CSV_FILES.orderHistory.path, [...CSV_FILES.orderHistory.headers], {
    history_id: entry.historyId,
    order_id: entry.orderId,
    event_type: entry.eventType,
    event_message: entry.eventMessage,
    changed_by: entry.changedBy,
    created_at: entry.createdAt,
  })
}

async function readPurchaseOrderHistoryRows(): Promise<PurchaseOrderHistoryRow[]> {
  const rows = await readCsvRows(CSV_FILES.purchaseOrderHistory.path, [...CSV_FILES.purchaseOrderHistory.headers])
  return rows.map((row) => ({
    historyId: row.history_id,
    poId: row.po_id,
    eventType: row.event_type,
    eventMessage: row.event_message,
    changedBy: row.changed_by,
    location: row.location,
    createdAt: row.created_at,
  }))
}

async function appendPurchaseOrderHistoryRow(entry: PurchaseOrderHistoryEntry): Promise<void> {
  await appendCsvRow(CSV_FILES.purchaseOrderHistory.path, [...CSV_FILES.purchaseOrderHistory.headers], {
    history_id: entry.historyId,
    po_id: entry.poId,
    event_type: entry.eventType,
    event_message: entry.eventMessage,
    changed_by: entry.changedBy,
    location: entry.location,
    created_at: entry.createdAt,
  })
}

function mapPurchaseOrderHistoryRow(row: PurchaseOrderHistoryRow): PurchaseOrderHistoryEntry {
  return {
    historyId: row.historyId,
    poId: row.poId,
    eventType: row.eventType,
    eventMessage: row.eventMessage,
    changedBy: row.changedBy,
    location: row.location,
    createdAt: row.createdAt,
  }
}

async function readInventoryLogs(): Promise<InventoryLogRow[]> {
  const rows = await readCsvRows(CSV_FILES.inventoryLog.path, [...CSV_FILES.inventoryLog.headers])
  return rows.map((row) => ({
    logId: row.log_id,
    skuId: row.sku_id,
    date: row.date,
    warehouse: row.warehouse,
    location: row.location,
    changedBy: row.changed_by,
    oldOnHand: toNumber(row.old_on_hand),
    newOnHand: toNumber(row.new_on_hand),
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    note: row.note,
  }))
}

async function writeInventoryLogs(rows: InventoryLogRow[]): Promise<void> {
  await writeCsvRows(
    CSV_FILES.inventoryLog.path,
    [...CSV_FILES.inventoryLog.headers],
    rows.map((row) => ({
      log_id: row.logId,
      sku_id: row.skuId,
      date: row.date,
      warehouse: row.warehouse,
      location: row.location,
      changed_by: row.changedBy,
      old_on_hand: fromNumber(row.oldOnHand),
      new_on_hand: fromNumber(row.newOnHand),
      reference_type: row.referenceType,
      reference_id: row.referenceId,
      note: row.note,
    })),
  )
}

function mapLogRow(row: InventoryLogRow): InventoryLogEntry {
  return {
    logId: row.logId,
    skuId: row.skuId,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    date: row.date,
    warehouse: row.warehouse,
    location: row.location,
    changedBy: row.changedBy,
    oldOnHand: row.oldOnHand,
    newOnHand: row.newOnHand,
    note: row.note,
  }
}

function mapPurchaseOrderSummary(
  po: PurchaseOrderRow,
  lines: PurchaseOrderLine[],
): PurchaseOrderSummaryRow {
  const quantity = lines.reduce((sum, line) => sum + line.orderedQty, 0)
  const quantityReceived = lines.reduce((sum, line) => sum + line.receivedQty, 0)
  return {
    poDate: po.orderDate,
    poId: po.poId,
    poNumber: po.poNumber,
    vendorName: po.vendorName,
    quantity,
    quantityReceived,
    sellAhead: 0,
    fulfillmentStatus: po.status,
  }
}

function mapLocationRecord(row: LocationRow): LocationRecord {
  return {
    locationId: row.locationId,
    warehouse: row.warehouse,
    locationCode: row.locationCode,
    locationName: row.locationName,
    locationType: row.locationType,
    isActive: row.isActive,
    isPickable: row.isPickable,
    isReceivable: row.isReceivable,
    isSellable: row.isSellable,
    sortOrder: row.sortOrder,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapSkuLocationBalance(
  row: SkuLocationAssignmentRow,
  locationById: Map<string, LocationRow>,
  locationByCode: Map<string, LocationRow>,
): SkuLocationBalance {
  const location =
    locationById.get(row.locationId) ?? locationByCode.get(`${row.warehouse}::${row.locationCode}`)

  return {
    assignmentId: row.assignmentId,
    skuId: row.skuId,
    warehouse: row.warehouse,
    locationId: location?.locationId ?? row.locationId,
    locationCode: location?.locationCode ?? row.locationCode,
    locationName: location?.locationName ?? row.locationCode,
    locationType: location?.locationType ?? "storage",
    isPickable: location?.isPickable ?? false,
    isSellable: location?.isSellable ?? true,
    quantity: row.quantity,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function applyLocationBalancesToSkuRows(
  skuRows: SkuRow[],
  skuLocationRows: SkuLocationAssignmentRow[],
  locationRows: LocationRow[],
  now: string,
): { nextSkuRows: SkuRow[]; changed: boolean } {
  const locationById = new Map(locationRows.map((row) => [row.locationId, row]))
  const locationByCode = new Map(locationRows.map((row) => [`${row.warehouse}::${row.locationCode}`, row]))
  const balancesBySku = new Map<string, SkuLocationAssignmentRow[]>()
  skuLocationRows.forEach((row) => {
    const bucket = balancesBySku.get(row.skuId) ?? []
    bucket.push(row)
    balancesBySku.set(row.skuId, bucket)
  })

  let changed = false
  const nextSkuRows = skuRows.map((row) => {
    const balances = balancesBySku.get(row.skuId) ?? []
    const sellableOnHand = balances.reduce((sum, balance) => {
      const location = locationById.get(balance.locationId) ?? locationByCode.get(`${balance.warehouse}::${balance.locationCode}`)
      if (!location?.isActive || !location.isSellable) {
        return sum
      }
      return sum + balance.quantity
    }, 0)
    const nonSellableTotal = balances.reduce((sum, balance) => {
      const location = locationById.get(balance.locationId) ?? locationByCode.get(`${balance.warehouse}::${balance.locationCode}`)
      if (!location?.isActive || location.isSellable) {
        return sum
      }
      return sum + balance.quantity
    }, 0)
    const available = Math.max(0, sellableOnHand - row.allocated - row.reserved)

    if (row.onHand === sellableOnHand && row.nonSellableTotal === nonSellableTotal && row.available === available) {
      return row
    }

    changed = true
    return {
      ...row,
      onHand: sellableOnHand,
      nonSellableTotal,
      available,
      updatedAt: now,
    }
  })

  return { nextSkuRows, changed }
}

async function syncSkuInventoryFromLocations(): Promise<void> {
  await ensureDataStore()

  const [skuRows, skuLocationRows, locationRows] = await Promise.all([
    readSkuRows(),
    readSkuLocationRows(),
    readLocationRows(),
  ])

  if (locationRows.length === 0) {
    return
  }

  const locationById = new Map(locationRows.map((row) => [row.locationId, row]))
  const locationByCode = new Map(locationRows.map((row) => [`${row.warehouse}::${row.locationCode}`, row]))
  const now = nowIso()
  let locationBalanceChanged = false

  const nextBalances = skuLocationRows.map((row) => {
    const location =
      locationById.get(row.locationId) ?? locationByCode.get(`${row.warehouse}::${row.locationCode}`)
    if (!location) {
      return row
    }

    if (row.locationId === location.locationId && row.locationCode === location.locationCode) {
      return row
    }

    locationBalanceChanged = true
    return {
      ...row,
      locationId: location.locationId,
      locationCode: location.locationCode,
      updatedAt: now,
    }
  })

  const { nextSkuRows, changed: skuChanged } = applyLocationBalancesToSkuRows(skuRows, nextBalances, locationRows, now)

  const writes: Promise<void>[] = []
  if (locationBalanceChanged) {
    writes.push(writeSkuLocationRows(nextBalances))
  }
  if (skuChanged) {
    writes.push(writeSkuRows(nextSkuRows))
  }

  if (writes.length > 0) {
    await Promise.all(writes)
  }
}

function mapSkuRecord(
  sku: SkuRow,
  notes: SkuNoteRow | undefined,
  vendorMappings: VendorSkuMapping[],
  vendors: VendorRecord[],
  purchaseOrders: PurchaseOrderRow[],
  poLines: PurchaseOrderLine[],
  skuLocationBalances: SkuLocationBalance[],
  inventoryLogs: InventoryLogRow[],
): SkuRecord {
  const skuMappings = vendorMappings.filter((mapping) => mapping.skuId === sku.skuId)
  const vendorById = new Map(vendors.map((vendor) => [vendor.vendorId, vendor]))

  const vendorAssignments = skuMappings.map((mapping) => ({
    vendorId: mapping.vendorId,
    name: vendorById.get(mapping.vendorId)?.vendorName ?? mapping.vendorId,
    vendorSku: mapping.vendorSku || "None",
    vendorCost: mapping.unitCost,
  }))

  const selectedVendors = vendorAssignments.map((vendor) => vendor.name)

  const skuPoLines = poLines.filter((line) => line.skuId === sku.skuId)
  const poLineByPo = new Map<string, PurchaseOrderLine[]>()
  skuPoLines.forEach((line) => {
    const bucket = poLineByPo.get(line.poId) ?? []
    bucket.push(line)
    poLineByPo.set(line.poId, bucket)
  })

  const purchaseOrderSummary = purchaseOrders
    .filter((po) => poLineByPo.has(po.poId))
    .map((po) => mapPurchaseOrderSummary(po, poLineByPo.get(po.poId) ?? []))

  const skuLogs = inventoryLogs
    .filter((entry) => entry.skuId === sku.skuId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(mapLogRow)

  return {
    id: sku.skuId,
    active: sku.active,
    customItem: sku.customItem,
    name: sku.name,
    sku: sku.skuCode,
    barcode: sku.barcode,
    warehouse: sku.warehouse,
    value: sku.value,
    price: sku.price,
    weightLb: sku.weightLb,
    dimensionsIn: {
      height: sku.heightIn,
      width: sku.widthIn,
      length: sku.lengthIn,
    },
    customsValue: sku.customsValue,
    customsDescription: sku.customsDescription,
    countryOfManufacture: sku.countryOfManufacture,
    valueCurrency: sku.valueCurrency,
    tariffCode: sku.tariffCode,
    tags: sku.tags ? sku.tags.split("|").filter(Boolean) : [],
    flags: {
      isFinalSale: sku.isFinalSale,
      dropshipOnly: sku.dropshipOnly,
      builtKit: sku.builtKit,
      isAssembly: sku.isAssembly,
      ignoreOnInvoice: sku.ignoreOnInvoice,
      ignoreOnCustoms: sku.ignoreOnCustoms,
      isVirtual: sku.isVirtual,
      needsSerialNumber: sku.needsSerialNumber,
      lithiumIon: sku.lithiumIon,
      autoFulfill: sku.autoFulfill,
      autoPack: sku.autoPack,
      shipsAlone: sku.shipsAlone,
    },
    notes: {
      product: notes?.productNote ?? "",
      packer: notes?.packerNote ?? "",
      returnNote: notes?.returnNote ?? "",
    },
    uom: {
      enabled: sku.uomEnabled,
      type: sku.uomType,
      componentSku: sku.uomComponentSku,
      quantity: sku.uomQuantity,
    },
    selectedVendors,
    inventory: {
      onHand: sku.onHand,
      available: sku.available,
      allocated: sku.allocated,
      reserved: sku.reserved,
      backorder: sku.backorder,
      nonSellableTotal: sku.nonSellableTotal,
    },
    vendorAssignments,
    purchaseOrders: purchaseOrderSummary,
    locationBalances: skuLocationBalances,
    inventoryLog: skuLogs,
    createdAt: sku.createdAt,
    updatedAt: sku.updatedAt,
  }
}

function validateCreateSku(input: CreateSkuInput, existingSkus: SkuRow[]): ValidationErrors {
  const errors: ValidationErrors = {}
  if (!normalizeText(input.name)) {
    errors.name = "Name is required."
  }
  if (!normalizeText(input.sku)) {
    errors.sku = "SKU is required."
  }
  if (!normalizeText(input.warehouse)) {
    errors.warehouse = "Warehouse is required."
  }
  if (input.uomItem && !normalizeText(input.componentSku)) {
    errors.componentSku = "Component is required when UOM item is enabled."
  }
  if (input.uomItem && Number(input.componentQuantity) <= 0) {
    errors.componentQuantity = "Quantity must be greater than 0 for UOM item."
  }

  const duplicate = existingSkus.some(
    (row) => row.skuCode.trim().toLowerCase() === normalizeText(input.sku).toLowerCase(),
  )
  if (duplicate) {
    errors.sku = "SKU already exists."
  }

  return errors
}

function generateBarcode(): string {
  const segmentA = `${Math.floor(Math.random() * 900000) + 100000}`
  const segmentB = `${Math.floor(Math.random() * 900000) + 100000}`
  return `${segmentA}${segmentB}`
}

function buildPoNumber(existing: PurchaseOrderRow[]): string {
  const prefix = "PO-"
  const numbers = existing
    .map((po) => po.poNumber)
    .filter((value) => value.startsWith(prefix))
    .map((value) => Number(value.slice(prefix.length)))
    .filter((value) => Number.isFinite(value))
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1000
  return `${prefix}${next}`
}

export async function authenticateUser(input: LoginInput): Promise<UserRecord | undefined> {
  const users = await readUsers()
  const loginKey = normalizeText(input.usernameOrEmail).toLowerCase()
  const user = users.find(
    (entry) =>
      entry.username.toLowerCase() === loginKey ||
      (entry.email && entry.email.toLowerCase() === loginKey),
  )

  if (!user || !user.isActive) {
    return undefined
  }

  const hash = hashPassword(input.password, user.passwordSalt)
  if (!compareHash(hash, user.passwordHash)) {
    return undefined
  }

  user.lastLoginAt = nowIso()
  user.updatedAt = nowIso()
  const nextUsers = users.map((entry) => (entry.userId === user.userId ? user : entry))
  await writeUsers(nextUsers)

  return user
}

export async function createUserSession(
  user: UserRecord,
  metadata: { ip: string; userAgent: string },
): Promise<SessionRecord> {
  const now = nowIso()
  const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
  const session: SessionRecord = {
    sessionId: randomUUID(),
    userId: user.userId,
    username: user.username,
    issuedAt: now,
    expiresAt: expiry,
    revokedAt: "",
    ip: metadata.ip,
    userAgent: metadata.userAgent,
  }
  await appendCsvRow(CSV_FILES.sessions.path, [...CSV_FILES.sessions.headers], {
    session_id: session.sessionId,
    user_id: session.userId,
    username: session.username,
    issued_at: session.issuedAt,
    expires_at: session.expiresAt,
    revoked_at: session.revokedAt,
    ip: session.ip,
    user_agent: session.userAgent,
  })
  return session
}

export async function getSessionByToken(token: string): Promise<SessionRecord | undefined> {
  if (!token) {
    return undefined
  }
  const sessions = await readSessions()
  const now = Date.now()
  return sessions.find(
    (session) =>
      session.sessionId === token &&
      !session.revokedAt &&
      new Date(session.expiresAt).getTime() > now,
  )
}

export async function revokeSession(token: string): Promise<void> {
  if (!token) {
    return
  }
  const sessions = await readSessions()
  const now = nowIso()
  const next = sessions.map((session) =>
    session.sessionId === token ? { ...session, revokedAt: now } : session,
  )
  await writeSessions(next)
}

export async function getWarehouseOptions(): Promise<string[]> {
  await ensureDefaultLocationsForWarehouses(DEFAULT_WAREHOUSES)
  const skus = await readSkuRows()
  const warehouses = new Set(DEFAULT_WAREHOUSES)
  skus.forEach((sku) => {
    if (sku.warehouse) {
      warehouses.add(sku.warehouse)
    }
  })
  return Array.from(warehouses)
}

export async function listLocations(): Promise<LocationRecord[]> {
  const warehouses = await getWarehouseOptions()
  await ensureDefaultLocationsForWarehouses(warehouses)
  const rows = await readLocationRows()
  return rows
    .sort((a, b) => {
      if (a.warehouse !== b.warehouse) {
        return a.warehouse.localeCompare(b.warehouse)
      }
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder
      }
      return a.locationCode.localeCompare(b.locationCode)
    })
    .map(mapLocationRecord)
}

export async function getLocationById(locationId: string): Promise<LocationRecord | undefined> {
  const rows = await listLocations()
  return rows.find((row) => row.locationId === locationId)
}

export async function listWarehouseLocations(warehouse: string): Promise<LocationRecord[]> {
  const rows = await listLocations()
  return rows.filter((row) => row.warehouse === warehouse && row.isActive)
}

export async function listLocationBalancesForSku(skuId: string): Promise<SkuLocationBalance[]> {
  await ensureDataStore()
  const [locationRows, balanceRows] = await Promise.all([readLocationRows(), readSkuLocationRows()])
  const locationById = new Map(locationRows.map((row) => [row.locationId, row]))
  const locationByCode = new Map(locationRows.map((row) => [`${row.warehouse}::${row.locationCode}`, row]))

  return balanceRows
    .filter((row) => row.skuId === skuId)
    .map((row) => mapSkuLocationBalance(row, locationById, locationByCode))
    .sort((a, b) => {
      if (a.warehouse !== b.warehouse) {
        return a.warehouse.localeCompare(b.warehouse)
      }
      return a.locationCode.localeCompare(b.locationCode)
    })
}

export async function listLocationBalancesForLocation(locationId: string): Promise<(SkuLocationBalance & { skuName: string; skuCode: string })[]> {
  await ensureDataStore()
  const [locationRows, balanceRows, skuRows] = await Promise.all([readLocationRows(), readSkuLocationRows(), readSkuRows()])
  const targetLocation = locationRows.find((row) => row.locationId === locationId)
  if (!targetLocation) {
    return []
  }
  const locationById = new Map(locationRows.map((row) => [row.locationId, row]))
  const locationByCode = new Map(locationRows.map((row) => [`${row.warehouse}::${row.locationCode}`, row]))
  const skuById = new Map(skuRows.map((row) => [row.skuId, row]))

  return balanceRows
    .filter(
      (row) =>
        row.locationId === locationId ||
        (row.warehouse === targetLocation.warehouse && row.locationCode === targetLocation.locationCode),
    )
    .map((row) => {
      const balance = mapSkuLocationBalance(row, locationById, locationByCode)
      const sku = skuById.get(row.skuId)
      return {
        ...balance,
        skuName: sku?.name ?? row.skuId,
        skuCode: sku?.skuCode ?? row.skuId,
      }
    })
    .sort((a, b) => a.skuCode.localeCompare(b.skuCode))
}

export async function createLocation(
  input: CreateLocationInput,
): Promise<{ ok: true; location: LocationRecord } | { ok: false; errors: ValidationErrors }> {
  await ensureDefaultLocationsForWarehouses([input.warehouse])
  const rows = await readLocationRows()
  const errors = validateLocationInput(input, rows)
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  const now = nowIso()
  const row: LocationRow = {
    locationId: randomUUID(),
    warehouse: normalizeText(input.warehouse),
    locationCode: normalizeText(input.locationCode).toUpperCase(),
    locationName: normalizeText(input.locationName),
    locationType: normalizeText(input.locationType) || "storage",
    isActive: input.isActive ?? true,
    isPickable: input.isPickable ?? false,
    isReceivable: input.isReceivable ?? false,
    isSellable: input.isSellable ?? true,
    sortOrder: Number(input.sortOrder) || 100,
    notes: normalizeText(input.notes ?? ""),
    createdAt: now,
    updatedAt: now,
  }

  await writeLocationRows([...rows, row])
  await syncSkuInventoryFromLocations()
  return { ok: true, location: mapLocationRecord(row) }
}

export async function patchLocation(
  locationId: string,
  input: PatchLocationInput,
): Promise<LocationRecord | undefined | { ok: false; errors: ValidationErrors }> {
  const rows = await readLocationRows()
  const target = rows.find((row) => row.locationId === locationId)
  if (!target) {
    return undefined
  }

  const nextInput: CreateLocationInput = {
    warehouse: input.warehouse ?? target.warehouse,
    locationCode: input.locationCode ?? target.locationCode,
    locationName: input.locationName ?? target.locationName,
    locationType: input.locationType ?? target.locationType,
    isActive: input.isActive ?? target.isActive,
    isPickable: input.isPickable ?? target.isPickable,
    isReceivable: input.isReceivable ?? target.isReceivable,
    isSellable: input.isSellable ?? target.isSellable,
    sortOrder: input.sortOrder ?? target.sortOrder,
    notes: input.notes ?? target.notes,
  }

  const errors = validateLocationInput(nextInput, rows, locationId)
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  const updatedAt = nowIso()
  const merged: LocationRow = {
    ...target,
    warehouse: normalizeText(nextInput.warehouse),
    locationCode: normalizeText(nextInput.locationCode).toUpperCase(),
    locationName: normalizeText(nextInput.locationName),
    locationType: normalizeText(nextInput.locationType) || target.locationType,
    isActive: nextInput.isActive ?? target.isActive,
    isPickable: nextInput.isPickable ?? target.isPickable,
    isReceivable: nextInput.isReceivable ?? target.isReceivable,
    isSellable: nextInput.isSellable ?? target.isSellable,
    sortOrder: Number(nextInput.sortOrder) || target.sortOrder,
    notes: normalizeText(nextInput.notes ?? target.notes),
    updatedAt,
  }

  await writeLocationRows(rows.map((row) => (row.locationId === locationId ? merged : row)))
  await syncSkuInventoryFromLocations()
  return mapLocationRecord(merged)
}

export async function listSkus(): Promise<SkuRecord[]> {
  await reconcileOrderAllocationStateIfNeeded()
  await syncSkuInventoryFromLocations()
  const [skuRows, noteRows, vendors, mappings, purchaseOrders, poLines, skuLocationRows, locationRows, logs] = await Promise.all([
    readSkuRows(),
    readSkuNoteRows(),
    readVendorRows(),
    readVendorMappings(),
    readPurchaseOrderRows(),
    readPurchaseOrderLines(),
    readSkuLocationRows(),
    readLocationRows(),
    readInventoryLogs(),
  ])

  const noteBySku = new Map(noteRows.map((note) => [note.skuId, note]))
  const locationById = new Map(locationRows.map((row) => [row.locationId, row]))
  const locationByCode = new Map(locationRows.map((row) => [`${row.warehouse}::${row.locationCode}`, row]))
  const balancesBySku = new Map<string, SkuLocationBalance[]>()
  skuLocationRows.forEach((row) => {
    const bucket = balancesBySku.get(row.skuId) ?? []
    bucket.push(mapSkuLocationBalance(row, locationById, locationByCode))
    balancesBySku.set(row.skuId, bucket)
  })

  return skuRows
    .map((row) =>
      mapSkuRecord(
        row,
        noteBySku.get(row.skuId),
        mappings,
        vendors,
        purchaseOrders,
        poLines,
        (balancesBySku.get(row.skuId) ?? []).sort((a, b) => a.locationCode.localeCompare(b.locationCode)),
        logs,
      ),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getSkuById(id: string): Promise<SkuRecord | undefined> {
  const records = await listSkus()
  return records.find((entry) => entry.id === id)
}

export async function createSku(
  input: CreateSkuInput,
): Promise<{ ok: true; sku: SkuRecord } | { ok: false; errors: ValidationErrors }> {
  await ensureDefaultLocationsForWarehouses([input.warehouse])
  const [skuRows, noteRows, vendors, mappings] = await Promise.all([
    readSkuRows(),
    readSkuNoteRows(),
    readVendorRows(),
    readVendorMappings(),
  ])
  const errors = validateCreateSku(input, skuRows)
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  const now = nowIso()
  const skuId = randomUUID()
  const nextSku: SkuRow = {
    skuId,
    skuCode: normalizeText(input.sku),
    name: normalizeText(input.name),
    barcode: normalizeText(input.barcode) || generateBarcode(),
    warehouse: normalizeText(input.warehouse),
    value: Number(input.value) || 0,
    price: 0,
    weightLb: Number(input.weightLb) || 0,
    heightIn: 0,
    widthIn: 0,
    lengthIn: 0,
    customsValue: 0,
    customsDescription: "",
    countryOfManufacture: "",
    valueCurrency: "USD",
    tariffCode: "",
    tags: "",
    active: true,
    customItem: Boolean(input.customItem),
    isFinalSale: false,
    dropshipOnly: false,
    builtKit: false,
    isAssembly: false,
    ignoreOnInvoice: false,
    ignoreOnCustoms: false,
    isVirtual: false,
    needsSerialNumber: false,
    lithiumIon: false,
    autoFulfill: false,
    autoPack: false,
    shipsAlone: false,
    uomEnabled: Boolean(input.uomItem),
    uomType: input.uomType || "Inner pack",
    uomComponentSku: normalizeText(input.componentSku),
    uomQuantity: Number(input.componentQuantity) || 0,
    onHand: 0,
    available: 0,
    allocated: 0,
    reserved: 0,
    backorder: 0,
    nonSellableTotal: 0,
    createdAt: now,
    updatedAt: now,
  }

  await writeSkuRows([nextSku, ...skuRows])
  await writeSkuNoteRows([
    {
      skuId,
      productNote: "",
      packerNote: "",
      returnNote: "",
      updatedAt: now,
      updatedBy: "system",
    },
    ...noteRows,
  ])

  const vendorIds = input.selectedVendors
    .map((vendorName) => vendors.find((vendor) => vendor.vendorName === vendorName)?.vendorId)
    .filter((value): value is string => Boolean(value))

  if (vendorIds.length > 0) {
    const nextMappings = [...mappings]
    vendorIds.forEach((vendorId) => {
      const exists = nextMappings.some((mapping) => mapping.vendorId === vendorId && mapping.skuId === skuId)
      if (!exists) {
        nextMappings.push({
          mappingId: randomUUID(),
          vendorId,
          skuId,
          skuCode: nextSku.skuCode,
          skuName: nextSku.name,
          vendorSku: nextSku.skuCode,
          unitCost: nextSku.value,
          leadTimeDays: 14,
          active: true,
          createdAt: now,
          updatedAt: now,
        })
      }
    })
    await writeVendorMappings(nextMappings)
  }

  const created = await getSkuById(skuId)
  if (!created) {
    return { ok: false, errors: { general: "Failed to load created SKU." } }
  }

  return { ok: true, sku: created }
}

export async function patchSku(id: string, input: PatchSkuInput): Promise<SkuRecord | undefined> {
  const now = nowIso()
  let skuUpdated = false

  if (
    typeof input.active === "boolean" ||
    typeof input.warehouse === "string" ||
    typeof input.value === "number" ||
    typeof input.price === "number"
  ) {
    const skuRows = await readSkuRows()
    const nextSkuRows = skuRows.map((row) => {
      if (row.skuId !== id) {
        return row
      }
      skuUpdated = true
      return {
        ...row,
        active: typeof input.active === "boolean" ? input.active : row.active,
        warehouse: typeof input.warehouse === "string" ? normalizeText(input.warehouse) || row.warehouse : row.warehouse,
        value: typeof input.value === "number" ? input.value : row.value,
        price: typeof input.price === "number" ? input.price : row.price,
        updatedAt: now,
      }
    })
    if (!skuUpdated) {
      return undefined
    }
    await writeSkuRows(nextSkuRows)
  }

  if (input.notes) {
    const rows = await readSkuNoteRows()
    let found = false
    const next = rows.map((row) => {
      if (row.skuId !== id) {
        return row
      }
      found = true
      return {
        ...row,
        productNote: input.notes?.product ?? row.productNote,
        packerNote: input.notes?.packer ?? row.packerNote,
        returnNote: input.notes?.returnNote ?? row.returnNote,
        updatedAt: now,
        updatedBy: "admin",
      }
    })

    if (!found) {
      next.push({
        skuId: id,
        productNote: input.notes?.product ?? "",
        packerNote: input.notes?.packer ?? "",
        returnNote: input.notes?.returnNote ?? "",
        updatedAt: now,
        updatedBy: "admin",
      })
    }

    await writeSkuNoteRows(next)
  }

  return getSkuById(id)
}

export async function bulkPatchSkus(
  input: BulkPatchSkusInput,
): Promise<{ ok: true; updatedCount: number } | { ok: false; errors: ValidationErrors }> {
  const skuIds = Array.from(new Set(input.skuIds.map((value) => normalizeText(value)).filter(Boolean)))
  if (skuIds.length === 0) {
    return { ok: false, errors: { skuIds: "Select at least one SKU." } }
  }

  const hasPatch = Object.values(input.patch).some((value) => value !== undefined)
  if (!hasPatch) {
    return { ok: false, errors: { patch: "Provide at least one field to update." } }
  }

  const rows = await readSkuRows()
  const idSet = new Set(skuIds)
  const now = nowIso()
  let updatedCount = 0

  const next = rows.map((row) => {
    if (!idSet.has(row.skuId)) {
      return row
    }
    updatedCount += 1
    return {
      ...row,
      active: typeof input.patch.active === "boolean" ? input.patch.active : row.active,
      warehouse:
        typeof input.patch.warehouse === "string"
          ? normalizeText(input.patch.warehouse) || row.warehouse
          : row.warehouse,
      value: typeof input.patch.value === "number" ? input.patch.value : row.value,
      price: typeof input.patch.price === "number" ? input.patch.price : row.price,
      updatedAt: now,
    }
  })

  if (updatedCount === 0) {
    return { ok: false, errors: { skuIds: "No matching SKUs found for bulk update." } }
  }

  await writeSkuRows(next)
  return { ok: true, updatedCount }
}

export async function deleteSku(
  skuId: string,
): Promise<{ ok: true } | { ok: false; errors: ValidationErrors }> {
  const [skuRows, noteRows, locationRows, vendorMappings, inventoryLogs] = await Promise.all([
    readSkuRows(),
    readSkuNoteRows(),
    readSkuLocationRows(),
    readVendorMappings(),
    readInventoryLogs(),
  ])

  const exists = skuRows.some((row) => row.skuId === skuId)
  if (!exists) {
    return { ok: false, errors: { sku: "SKU not found." } }
  }

  const locationCount = locationRows.filter((row) => row.skuId === skuId).length
  if (locationCount > 0) {
    return { ok: false, errors: { sku: "SKU cannot be deleted while locations are assigned." } }
  }

  await Promise.all([
    writeSkuRows(skuRows.filter((row) => row.skuId !== skuId)),
    writeSkuNoteRows(noteRows.filter((row) => row.skuId !== skuId)),
    writeVendorMappings(vendorMappings.filter((row) => row.skuId !== skuId)),
    writeInventoryLogs(inventoryLogs.filter((row) => row.skuId !== skuId)),
  ])

  return { ok: true }
}

export async function getSkuLookup(): Promise<{ skuId: string; skuCode: string; name: string; barcode: string; price: number }[]> {
  const rows = await readSkuRows()
  return rows.map((row) => ({
    skuId: row.skuId,
    skuCode: row.skuCode,
    name: row.name,
    barcode: row.barcode,
    price: row.price,
  }))
}

function buildOrderNumber(existing: OrderRow[]): string {
  const prefix = "ORD-"
  const numbers = existing
    .map((order) => order.orderNumber)
    .filter((value) => value.startsWith(prefix))
    .map((value) => Number(value.slice(prefix.length)))
    .filter((value) => Number.isFinite(value))
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1000
  return `${prefix}${next}`
}

function mapOrderLineRow(row: OrderLineRow): OrderLineItem {
  return {
    lineId: row.lineId,
    orderId: row.orderId,
    skuId: row.skuId,
    skuCode: row.skuCode,
    productName: row.productName,
    allocatedWarehouse: row.allocatedWarehouse,
    quantity: row.quantity,
    pendingFulfillment: row.pendingFulfillment,
    quantityAllocated: row.quantityAllocated,
    quantityBackordered: row.quantityBackordered,
    quantityShipped: row.quantityShipped,
    unitPrice: row.unitPrice,
    lineTotal: row.lineTotal,
  }
}

function mapOrderHistoryRow(row: OrderHistoryRow): OrderHistoryEntry {
  return {
    historyId: row.historyId,
    orderId: row.orderId,
    eventType: row.eventType,
    eventMessage: row.eventMessage,
    changedBy: row.changedBy,
    createdAt: row.createdAt,
  }
}

function allocateOrderLine(
  line: OrderLineRow,
  skuById: Map<string, SkuRow>,
  warehouse: string,
  now: string,
): OrderLineRow {
  const sku = skuById.get(line.skuId)
  const pendingFulfillment = Math.max(0, line.quantity - line.quantityShipped)

  if (!sku) {
    return {
      ...line,
      allocatedWarehouse: "",
      pendingFulfillment,
      quantityAllocated: 0,
      quantityBackordered: pendingFulfillment,
      updatedAt: now,
    }
  }

  const quantityAllocated = Math.min(Math.max(0, sku.available), pendingFulfillment)
  const quantityBackordered = Math.max(0, pendingFulfillment - quantityAllocated)

  sku.available = Math.max(0, sku.available - quantityAllocated)
  sku.allocated += quantityAllocated
  sku.backorder += quantityBackordered
  sku.updatedAt = now

  return {
    ...line,
    allocatedWarehouse: quantityAllocated > 0 ? warehouse : "",
    pendingFulfillment,
    quantityAllocated,
    quantityBackordered,
    updatedAt: now,
  }
}

function releaseOrderLineAllocation(
  line: OrderLineRow,
  skuById: Map<string, SkuRow>,
  now: string,
): OrderLineRow {
  const sku = skuById.get(line.skuId)
  if (sku) {
    sku.available += line.quantityAllocated
    sku.allocated = Math.max(0, sku.allocated - line.quantityAllocated)
    sku.backorder = Math.max(0, sku.backorder - line.quantityBackordered)
    sku.updatedAt = now
  }

  return {
    ...line,
    allocatedWarehouse: "",
    pendingFulfillment: 0,
    quantityAllocated: 0,
    quantityBackordered: 0,
    updatedAt: now,
  }
}

interface OrderAllocationReprocessChange {
  orderId: string
  allocatedAdded: number
  backorderReduced: number
}

function reprocessRuntimeOrderAllocations(params: {
  orders: OrderRow[]
  orderLines: OrderLineRow[]
  skus: SkuRow[]
  now: string
  targetOrderId?: string
}): {
  nextSkus: SkuRow[]
  nextOrderLines: OrderLineRow[]
  changes: OrderAllocationReprocessChange[]
} {
  const { orders, orderLines, skus, now, targetOrderId } = params
  const nextSkus = skus.map((row) => ({ ...row }))
  const skuById = new Map(nextSkus.map((row) => [row.skuId, row]))
  const nextOrderLines = orderLines.map((line) => ({ ...line }))
  const lineChanges = new Map<string, OrderAllocationReprocessChange>()

  const candidateOrders = [...orders]
    .filter((order) => !isCanceledOrderStatus(order.status))
    .filter((order) => (targetOrderId ? order.orderId === targetOrderId : true))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  candidateOrders.forEach((order) => {
    const lines = nextOrderLines
      .filter((line) => line.orderId === order.orderId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    lines.forEach((line) => {
      const sku = skuById.get(line.skuId)
      if (!sku) {
        return
      }

      const remainingUnallocated = Math.max(0, line.quantity - line.quantityShipped - line.quantityAllocated)
      if (remainingUnallocated <= 0) {
        return
      }

      const additionalAllocated = Math.min(Math.max(0, sku.available), remainingUnallocated)
      if (additionalAllocated <= 0) {
        return
      }

      const additionalBackorderReduction = Math.min(line.quantityBackordered, additionalAllocated)
      sku.available = Math.max(0, sku.available - additionalAllocated)
      sku.allocated += additionalAllocated
      sku.backorder = Math.max(0, sku.backorder - additionalBackorderReduction)
      sku.updatedAt = now

      line.quantityAllocated += additionalAllocated
      line.quantityBackordered = Math.max(0, line.quantityBackordered - additionalBackorderReduction)
      line.allocatedWarehouse = line.allocatedWarehouse || order.warehouse
      line.updatedAt = now

      const existing = lineChanges.get(order.orderId) ?? {
        orderId: order.orderId,
        allocatedAdded: 0,
        backorderReduced: 0,
      }
      existing.allocatedAdded += additionalAllocated
      existing.backorderReduced += additionalBackorderReduction
      lineChanges.set(order.orderId, existing)
    })
  })

  return {
    nextSkus,
    nextOrderLines,
    changes: candidateOrders
      .map((order) => lineChanges.get(order.orderId))
      .filter((entry): entry is OrderAllocationReprocessChange => Boolean(entry)),
  }
}

async function appendOrderReprocessHistoryEntries(params: {
  orders: OrderRow[]
  changes: OrderAllocationReprocessChange[]
  changedBy: string
  createdAt: string
  reason: "manual" | "po_receive"
}): Promise<void> {
  const { orders, changes, changedBy, createdAt, reason } = params
  const orderMap = new Map(orders.map((order) => [order.orderId, order]))

  await Promise.all(
    changes.map(async (change) => {
      const order = orderMap.get(change.orderId)
      if (!order) {
        return
      }

      const prefix = reason === "manual" ? "Manual reprocess executed." : "Auto-reprocessed after PO receipt."
      await appendOrderHistoryRow({
        historyId: randomUUID(),
        orderId: change.orderId,
        eventType: reason === "manual" ? "reprocessed" : "auto_reprocessed",
        eventMessage: `${prefix} Allocated ${change.allocatedAdded} additional unit(s); backorder reduced by ${change.backorderReduced} unit(s).`,
        changedBy,
        createdAt,
      })
    }),
  )
}

async function reconcileOrderAllocationStateIfNeeded(): Promise<void> {
  await ensureDataStore()

  const rawLineRows = await readCsvRows(CSV_FILES.orderLines.path, [...CSV_FILES.orderLines.headers])
  const needsMigration = rawLineRows.some(
    (row) =>
      row.allocated_warehouse === "" &&
      row.pending_fulfillment === "" &&
      row.quantity_allocated === "" &&
      row.quantity_backordered === "",
  )

  if (!needsMigration) {
    return
  }

  const [skuRows, orderRows, orderLineRows] = await Promise.all([readSkuRows(), readOrderRows(), readOrderLineRows()])
  const now = nowIso()
  const nextSkus = resetSkuAvailabilityForOrderReconciliation(skuRows)
  const skuById = new Map(nextSkus.map((row) => [row.skuId, row]))
  const linesByOrderId = new Map<string, OrderLineRow[]>()

  orderLineRows.forEach((line) => {
    const bucket = linesByOrderId.get(line.orderId) ?? []
    bucket.push(line)
    linesByOrderId.set(line.orderId, bucket)
  })

  const nextLines: OrderLineRow[] = []
  const sortedOrders = [...orderRows].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  sortedOrders.forEach((order) => {
    const lines = (linesByOrderId.get(order.orderId) ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    lines.forEach((line) => {
      nextLines.push(
        isCanceledOrderStatus(order.status)
          ? releaseOrderLineAllocation(line, skuById, now)
          : allocateOrderLine(line, skuById, order.warehouse, now),
      )
    })
  })

  await Promise.all([writeSkuRows(nextSkus), writeOrderLineRows(nextLines)])
}

export async function listOrders(): Promise<OrderRecord[]> {
  await reconcileOrderAllocationStateIfNeeded()
  const [orders, lines, history] = await Promise.all([
    readOrderRows(),
    readOrderLineRows(),
    readOrderHistoryRows(),
  ])

  return orders
    .map((order) => {
      const orderLines = lines
        .filter((line) => line.orderId === order.orderId)
        .map(mapOrderLineRow)
      const orderHistory = history
        .filter((entry) => entry.orderId === order.orderId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(mapOrderHistoryRow)

      return {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        externalOrderNumber: order.externalOrderNumber,
        shopName: order.shopName,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        shippingCarrier: order.shippingCarrier,
        shippingMethod: order.shippingMethod,
        shippingAddress1: order.shippingAddress1,
        shippingAddress2: order.shippingAddress2,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState,
        shippingPostalCode: order.shippingPostalCode,
        shippingCountry: order.shippingCountry,
        warehouse: order.warehouse,
        status: order.status,
        paymentStatus: order.paymentStatus,
        flagged: order.flagged,
        priorityOrder: order.priorityOrder,
        fraudHold: order.fraudHold,
        addressHold: order.addressHold,
        operatorHold: order.operatorHold,
        paymentHold: order.paymentHold,
        holdUntilDate: order.holdUntilDate,
        placedAt: order.placedAt,
        requiredShipDate: order.requiredShipDate,
        shippedAt: order.shippedAt,
        notes: order.notes,
        subtotal: order.subtotal,
        shippingAmount: order.shippingAmount,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        lines: orderLines,
        history: orderHistory,
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getOrderById(orderId: string): Promise<OrderRecord | undefined> {
  const orders = await listOrders()
  return orders.find((order) => order.orderId === orderId)
}

export async function createOrder(
  input: CreateOrderInput,
  changedBy: string,
): Promise<{ ok: true; order: OrderRecord } | { ok: false; errors: ValidationErrors }> {
  await reconcileOrderAllocationStateIfNeeded()
  const [skuRows, orders, lines] = await Promise.all([readSkuRows(), readOrderRows(), readOrderLineRows()])

  if (!normalizeText(input.customerName)) {
    return { ok: false, errors: { customerName: "Customer name is required." } }
  }
  if (!normalizeText(input.warehouse)) {
    return { ok: false, errors: { warehouse: "Warehouse is required." } }
  }
  if (!input.lines || input.lines.length === 0) {
    return { ok: false, errors: { lines: "At least one order line is required." } }
  }

  const skuLookupById = new Map(skuRows.map((row) => [row.skuId, row]))
  const lineErrors: ValidationErrors = {}
  input.lines.forEach((line, index) => {
    if (!skuLookupById.has(line.skuId)) {
      lineErrors[`line_${index}`] = "SKU not found."
    }
    if (Number(line.quantity) <= 0) {
      lineErrors[`line_qty_${index}`] = "Quantity must be greater than 0."
    }
  })
  if (Object.keys(lineErrors).length > 0) {
    return { ok: false, errors: lineErrors }
  }

  const now = nowIso()
  const orderId = randomUUID()
  const orderNumber = buildOrderNumber(orders)
  const nextSkus = skuRows.map((row) => ({ ...row }))
  const skuById = new Map(nextSkus.map((row) => [row.skuId, row]))

  const orderLines: OrderLineRow[] = input.lines.map((line) => {
    const sku = skuById.get(line.skuId)
    const unitPrice = Number.isFinite(line.unitPrice ?? NaN) ? Number(line.unitPrice) : sku?.price ?? 0
    const quantity = Number(line.quantity) || 0
    const baseLine: OrderLineRow = {
      lineId: randomUUID(),
      orderId,
      skuId: line.skuId,
      skuCode: sku?.skuCode ?? "",
      productName: sku?.name ?? "",
      allocatedWarehouse: "",
      quantity,
      pendingFulfillment: quantity,
      quantityAllocated: 0,
      quantityBackordered: 0,
      quantityShipped: 0,
      unitPrice,
      lineTotal: quantity * unitPrice,
      createdAt: now,
      updatedAt: now,
    }

    return isCanceledOrderStatus(input.status)
      ? releaseOrderLineAllocation(baseLine, skuById, now)
      : allocateOrderLine(baseLine, skuById, input.warehouse, now)
  })

  const subtotal = orderLines.reduce((sum, line) => sum + line.lineTotal, 0)
  const shippingAmount = Number(input.shippingAmount) || 0
  const taxAmount = Number(input.taxAmount) || 0
  const totalAmount = subtotal + shippingAmount + taxAmount

  const row: OrderRow = {
    orderId,
    orderNumber,
    externalOrderNumber: normalizeText(input.externalOrderNumber ?? ""),
    shopName: normalizeText(input.shopName) || "Direct",
    customerName: normalizeText(input.customerName),
    customerEmail: normalizeText(input.customerEmail),
    shippingCarrier: normalizeText(input.shippingCarrier),
    shippingMethod: normalizeText(input.shippingMethod),
    shippingAddress1: normalizeText(input.shippingAddress1),
    shippingAddress2: normalizeText(input.shippingAddress2 ?? ""),
    shippingCity: normalizeText(input.shippingCity),
    shippingState: normalizeText(input.shippingState),
    shippingPostalCode: normalizeText(input.shippingPostalCode),
    shippingCountry: normalizeText(input.shippingCountry),
    warehouse: normalizeText(input.warehouse),
    status: normalizeOrderStatus(input.status),
    paymentStatus: normalizeText(input.paymentStatus) || "Pending",
    flagged: input.flagged ?? false,
    priorityOrder: input.priorityOrder ?? false,
    fraudHold: input.fraudHold ?? false,
    addressHold: input.addressHold ?? false,
    operatorHold: input.operatorHold ?? false,
    paymentHold: input.paymentHold ?? false,
    holdUntilDate: normalizeText(input.holdUntilDate ?? ""),
    placedAt: input.placedAt || now,
    requiredShipDate: input.requiredShipDate || "",
    shippedAt: "",
    notes: normalizeText(input.notes ?? ""),
    subtotal,
    shippingAmount,
    taxAmount,
    totalAmount,
    createdAt: now,
    updatedAt: now,
  }

  await Promise.all([
    writeOrderRows([row, ...orders]),
    writeOrderLineRows([...lines, ...orderLines]),
    writeSkuRows(nextSkus),
  ])
  const totalAllocated = orderLines.reduce((sum, line) => sum + line.quantityAllocated, 0)
  const totalBackordered = orderLines.reduce((sum, line) => sum + line.quantityBackordered, 0)
  await appendOrderHistoryRow({
    historyId: randomUUID(),
    orderId,
    eventType: "created",
    eventMessage: `Order created with ${orderLines.length} line item(s). Allocated ${totalAllocated} unit(s), backordered ${totalBackordered} unit(s).`,
    changedBy,
    createdAt: now,
  })

  const created = await getOrderById(orderId)
  if (!created) {
    return { ok: false, errors: { order: "Unable to load created order." } }
  }

  return { ok: true, order: created }
}

export async function patchOrder(orderId: string, input: PatchOrderInput): Promise<OrderRecord | undefined> {
  await reconcileOrderAllocationStateIfNeeded()
  const [orders, orderLineRows, skuRows] = await Promise.all([readOrderRows(), readOrderLineRows(), readSkuRows()])
  const target = orders.find((row) => row.orderId === orderId)
  if (!target) {
    return undefined
  }

  const merged: OrderRow = {
    ...target,
    externalOrderNumber: input.externalOrderNumber ?? target.externalOrderNumber,
    customerName: input.customerName ?? target.customerName,
    customerEmail: input.customerEmail ?? target.customerEmail,
    shippingCarrier: input.shippingCarrier ?? target.shippingCarrier,
    shippingMethod: input.shippingMethod ?? target.shippingMethod,
    shippingAddress1: input.shippingAddress1 ?? target.shippingAddress1,
    shippingAddress2: input.shippingAddress2 ?? target.shippingAddress2,
    shippingCity: input.shippingCity ?? target.shippingCity,
    shippingState: input.shippingState ?? target.shippingState,
    shippingPostalCode: input.shippingPostalCode ?? target.shippingPostalCode,
    shippingCountry: input.shippingCountry ?? target.shippingCountry,
    warehouse: input.warehouse ?? target.warehouse,
    status: input.status ? normalizeOrderStatus(input.status, target.status) : target.status,
    paymentStatus: input.paymentStatus ?? target.paymentStatus,
    flagged: typeof input.flagged === "boolean" ? input.flagged : target.flagged,
    priorityOrder: typeof input.priorityOrder === "boolean" ? input.priorityOrder : target.priorityOrder,
    fraudHold: typeof input.fraudHold === "boolean" ? input.fraudHold : target.fraudHold,
    addressHold: typeof input.addressHold === "boolean" ? input.addressHold : target.addressHold,
    operatorHold: typeof input.operatorHold === "boolean" ? input.operatorHold : target.operatorHold,
    paymentHold: typeof input.paymentHold === "boolean" ? input.paymentHold : target.paymentHold,
    holdUntilDate: input.holdUntilDate ?? target.holdUntilDate,
    requiredShipDate: input.requiredShipDate ?? target.requiredShipDate,
    notes: input.notes ?? target.notes,
    shippingAmount: Number.isFinite(input.shippingAmount ?? NaN) ? Number(input.shippingAmount) : target.shippingAmount,
    taxAmount: Number.isFinite(input.taxAmount ?? NaN) ? Number(input.taxAmount) : target.taxAmount,
    updatedAt: nowIso(),
  }
  merged.totalAmount = merged.subtotal + merged.shippingAmount + merged.taxAmount

  const nextOrderRows = orders.map((row) => (row.orderId === orderId ? merged : row))
  const now = nowIso()
  let nextOrderLineRows = orderLineRows
  const nextSkuRows = skuRows

  if (target.status !== merged.status && (isCanceledOrderStatus(target.status) || isCanceledOrderStatus(merged.status))) {
    const skuById = new Map(nextSkuRows.map((row) => [row.skuId, row]))
    nextOrderLineRows = orderLineRows.map((line) => {
      if (line.orderId !== orderId) {
        return line
      }

      return isCanceledOrderStatus(merged.status)
        ? releaseOrderLineAllocation(line, skuById, now)
        : allocateOrderLine(line, skuById, merged.warehouse, now)
    })
  }

  await Promise.all([
    writeOrderRows(nextOrderRows),
    writeOrderLineRows(nextOrderLineRows),
    writeSkuRows(nextSkuRows),
  ])

  const changes: string[] = []
  if (target.status !== merged.status) {
    changes.push(`status: ${target.status} -> ${merged.status}`)
  }
  if (target.paymentStatus !== merged.paymentStatus) {
    changes.push(`payment: ${target.paymentStatus} -> ${merged.paymentStatus}`)
  }
  if (target.flagged !== merged.flagged) {
    changes.push(`flagged: ${target.flagged ? "on" : "off"} -> ${merged.flagged ? "on" : "off"}`)
  }
  if (target.priorityOrder !== merged.priorityOrder) {
    changes.push(`priority: ${target.priorityOrder ? "on" : "off"} -> ${merged.priorityOrder ? "on" : "off"}`)
  }
  if (target.fraudHold !== merged.fraudHold) {
    changes.push(`fraud hold: ${target.fraudHold ? "on" : "off"} -> ${merged.fraudHold ? "on" : "off"}`)
  }
  if (target.addressHold !== merged.addressHold) {
    changes.push(`address hold: ${target.addressHold ? "on" : "off"} -> ${merged.addressHold ? "on" : "off"}`)
  }
  if (target.operatorHold !== merged.operatorHold) {
    changes.push(`operator hold: ${target.operatorHold ? "on" : "off"} -> ${merged.operatorHold ? "on" : "off"}`)
  }
  if (target.paymentHold !== merged.paymentHold) {
    changes.push(`payment hold: ${target.paymentHold ? "on" : "off"} -> ${merged.paymentHold ? "on" : "off"}`)
  }
  if (target.holdUntilDate !== merged.holdUntilDate) {
    changes.push(`hold until: ${target.holdUntilDate || "none"} -> ${merged.holdUntilDate || "none"}`)
  }
  if (target.shippingCarrier !== merged.shippingCarrier || target.shippingMethod !== merged.shippingMethod) {
    changes.push("shipping method updated")
  }
  if (target.status !== merged.status && (isCanceledOrderStatus(target.status) || isCanceledOrderStatus(merged.status))) {
    const lineSnapshot = nextOrderLineRows.filter((line) => line.orderId === orderId)
    const totalAllocated = lineSnapshot.reduce((sum, line) => sum + line.quantityAllocated, 0)
    const totalBackordered = lineSnapshot.reduce((sum, line) => sum + line.quantityBackordered, 0)
    changes.push(`allocated ${totalAllocated} unit(s), backordered ${totalBackordered} unit(s)`)
  }
  if (changes.length > 0) {
    await appendOrderHistoryRow({
      historyId: randomUUID(),
      orderId,
      eventType: "updated",
      eventMessage: changes.join("; "),
      changedBy: "admin",
      createdAt: now,
    })
  }

  return getOrderById(orderId)
}

export async function reprocessOrderAllocations(
  orderId: string,
  changedBy: string,
): Promise<{ ok: true; order: OrderRecord; changed: boolean } | { ok: false; errors: ValidationErrors }> {
  await reconcileOrderAllocationStateIfNeeded()

  const [orders, orderLineRows, skuRows] = await Promise.all([readOrderRows(), readOrderLineRows(), readSkuRows()])
  const order = orders.find((row) => row.orderId === orderId)
  if (!order) {
    return { ok: false, errors: { order: "Order not found." } }
  }

  if (isCanceledOrderStatus(order.status)) {
    return { ok: false, errors: { order: "Canceled orders cannot be reprocessed." } }
  }

  const now = nowIso()
  const result = reprocessRuntimeOrderAllocations({
    orders,
    orderLines: orderLineRows,
    skus: skuRows,
    now,
    targetOrderId: orderId,
  })

  await Promise.all([writeSkuRows(result.nextSkus), writeOrderLineRows(result.nextOrderLines)])

  if (result.changes.length > 0) {
    await appendOrderReprocessHistoryEntries({
      orders,
      changes: result.changes,
      changedBy,
      createdAt: now,
      reason: "manual",
    })
  } else {
    await appendOrderHistoryRow({
      historyId: randomUUID(),
      orderId,
      eventType: "reprocessed",
      eventMessage: "Manual reprocess executed. No allocation changes.",
      changedBy,
      createdAt: now,
    })
  }

  const updated = await getOrderById(orderId)
  if (!updated) {
    return { ok: false, errors: { order: "Failed to load updated order." } }
  }

  return { ok: true, order: updated, changed: result.changes.length > 0 }
}

function validateVendorInput(input: CreateVendorInput, existing: VendorRecord[], editingId?: string): ValidationErrors {
  const errors: ValidationErrors = {}
  if (!normalizeText(input.vendorName)) {
    errors.vendorName = "Vendor name is required."
  }
  const duplicateName = existing.some(
    (vendor) =>
      vendor.vendorId !== editingId &&
      vendor.vendorName.trim().toLowerCase() === normalizeText(input.vendorName).toLowerCase(),
  )
  if (duplicateName) {
    errors.vendorName = "Vendor name already exists."
  }
  return errors
}

export async function listVendors(): Promise<VendorRecord[]> {
  const rows = await readVendorRows()
  return rows.sort((a, b) => a.vendorName.localeCompare(b.vendorName))
}

export async function getVendorById(vendorId: string): Promise<VendorRecord | undefined> {
  const rows = await readVendorRows()
  return rows.find((vendor) => vendor.vendorId === vendorId)
}

export async function createVendor(
  input: CreateVendorInput,
): Promise<{ ok: true; vendor: VendorRecord } | { ok: false; errors: ValidationErrors }> {
  const vendors = await readVendorRows()
  const errors = validateVendorInput(input, vendors)
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  const now = nowIso()
  const vendor: VendorRecord = {
    vendorId: randomUUID(),
    vendorCode: normalizeText(input.vendorCode ?? "") || deriveVendorCode(input.vendorName),
    vendorName: normalizeText(input.vendorName),
    accountNumber: normalizeText(input.accountNumber),
    contactName: normalizeText(input.contactName),
    contactEmail: normalizeText(input.contactEmail),
    contactPhone: normalizeText(input.contactPhone),
    address1: normalizeText(input.address1),
    address2: normalizeText(input.address2),
    city: normalizeText(input.city),
    state: normalizeText(input.state),
    postalCode: normalizeText(input.postalCode),
    country: normalizeText(input.country) || "United States",
    notes: normalizeText(input.notes),
    createdAt: now,
    updatedAt: now,
  }

  await writeVendorRows([vendor, ...vendors])
  return { ok: true, vendor }
}

export async function patchVendor(
  vendorId: string,
  input: PatchVendorInput,
): Promise<{ ok: true; vendor: VendorRecord } | { ok: false; errors: ValidationErrors }> {
  const vendors = await readVendorRows()
  const target = vendors.find((vendor) => vendor.vendorId === vendorId)
  if (!target) {
    return { ok: false, errors: { vendor: "Vendor not found." } }
  }

  const merged: VendorRecord = {
    ...target,
    ...input,
    vendorId,
    vendorCode:
      normalizeText(input.vendorCode ?? target.vendorCode) || deriveVendorCode(input.vendorName ?? target.vendorName),
    vendorName: normalizeText(input.vendorName ?? target.vendorName),
    accountNumber: normalizeText(input.accountNumber ?? target.accountNumber),
    contactName: normalizeText(input.contactName ?? target.contactName),
    contactEmail: normalizeText(input.contactEmail ?? target.contactEmail),
    contactPhone: normalizeText(input.contactPhone ?? target.contactPhone),
    address1: normalizeText(input.address1 ?? target.address1),
    address2: normalizeText(input.address2 ?? target.address2),
    city: normalizeText(input.city ?? target.city),
    state: normalizeText(input.state ?? target.state),
    postalCode: normalizeText(input.postalCode ?? target.postalCode),
    country: normalizeText(input.country ?? target.country),
    notes: normalizeText(input.notes ?? target.notes),
    updatedAt: nowIso(),
  }

  const errors = validateVendorInput(merged, vendors, vendorId)
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  const next = vendors.map((vendor) => (vendor.vendorId === vendorId ? merged : vendor))
  await writeVendorRows(next)
  return { ok: true, vendor: merged }
}

export async function listVendorSkuMappings(vendorId: string): Promise<VendorSkuMapping[]> {
  const mappings = await readVendorMappings()
  return mappings
    .filter((mapping) => mapping.vendorId === vendorId)
    .sort((a, b) => a.skuCode.localeCompare(b.skuCode))
}

export async function assignVendorSku(
  vendorId: string,
  input: CreateVendorSkuInput,
): Promise<{ ok: true; mapping: VendorSkuMapping } | { ok: false; errors: ValidationErrors }> {
  const [vendors, skus, mappings] = await Promise.all([readVendorRows(), readSkuRows(), readVendorMappings()])
  const vendor = vendors.find((entry) => entry.vendorId === vendorId)
  if (!vendor) {
    return { ok: false, errors: { vendor: "Vendor not found." } }
  }

  const sku = skus.find((entry) => entry.skuId === input.skuId)
  if (!sku) {
    return { ok: false, errors: { skuId: "SKU not found." } }
  }

  const exists = mappings.find((mapping) => mapping.vendorId === vendorId && mapping.skuId === input.skuId)
  const now = nowIso()

  if (exists) {
    const updated: VendorSkuMapping = {
      ...exists,
      vendorSku: normalizeText(input.vendorSku) || sku.skuCode,
      unitCost: Number(input.unitCost) || 0,
      leadTimeDays: Number(input.leadTimeDays) || 0,
      active: input.active ?? true,
      updatedAt: now,
    }
    const next = mappings.map((mapping) => (mapping.mappingId === exists.mappingId ? updated : mapping))
    await writeVendorMappings(next)
    return { ok: true, mapping: updated }
  }

  const mapping: VendorSkuMapping = {
    mappingId: randomUUID(),
    vendorId,
    skuId: sku.skuId,
    skuCode: sku.skuCode,
    skuName: sku.name,
    vendorSku: normalizeText(input.vendorSku) || sku.skuCode,
    unitCost: Number(input.unitCost) || 0,
    leadTimeDays: Number(input.leadTimeDays) || 0,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  }

  await writeVendorMappings([...mappings, mapping])
  return { ok: true, mapping }
}

export async function removeVendorSkuMapping(vendorId: string, mappingId: string): Promise<boolean> {
  const mappings = await readVendorMappings()
  const next = mappings.filter(
    (mapping) => !(mapping.vendorId === vendorId && mapping.mappingId === mappingId),
  )
  if (next.length === mappings.length) {
    return false
  }
  await writeVendorMappings(next)
  return true
}

export async function getVendorAllowedSkus(vendorId: string): Promise<VendorSkuMapping[]> {
  const mappings = await listVendorSkuMappings(vendorId)
  return mappings.filter((mapping) => mapping.active)
}

function validateCreatePurchaseOrder(
  input: CreatePurchaseOrderInput,
  vendor: VendorRecord | undefined,
  allowedMappings: VendorSkuMapping[],
): ValidationErrors {
  const errors: ValidationErrors = {}
  if (!vendor) {
    errors.vendorId = "Vendor not found."
  }
  if (input.lines.length === 0) {
    errors.lines = "At least one line item is required."
  }

  const allowedSkuIds = new Set(allowedMappings.map((mapping) => mapping.skuId))
  input.lines.forEach((line, index) => {
    if (!allowedSkuIds.has(line.skuId)) {
      errors[`line_${index}`] = `SKU ${line.skuId} is not assigned to selected vendor.`
    }
    if (Number(line.orderedQty) <= 0) {
      errors[`line_qty_${index}`] = "Ordered quantity must be greater than 0."
    }
  })

  return errors
}

export async function listPurchaseOrders(): Promise<PurchaseOrderEntry[]> {
  const [poRows, poLines, historyRows] = await Promise.all([
    readPurchaseOrderRows(),
    readPurchaseOrderLines(),
    readPurchaseOrderHistoryRows(),
  ])
  return poRows
    .map((po) => ({
      poNumber: po.poNumber,
      poId: po.poId,
      poDisplayId: po.poDisplayId,
      vendorId: po.vendorId,
      vendorName: po.vendorName,
      warehouse: po.warehouse,
      status: po.status,
      orderDate: po.orderDate,
      expectedDate: po.expectedDate,
      receivedDate: po.receivedDate,
      trackingNumber: po.trackingNumber,
      notes: po.notes,
      subtotal: po.subtotal,
      shippingAmount: po.shippingAmount,
      totalAmount: po.totalAmount,
      createdBy: po.createdBy,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
      lines: poLines
        .filter((line) => line.poId === po.poId)
        .sort((a, b) => a.lineNumber - b.lineNumber),
      history: historyRows
        .filter((entry) => entry.poId === po.poId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(mapPurchaseOrderHistoryRow),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getPurchaseOrderById(poId: string): Promise<PurchaseOrderEntry | undefined> {
  const rows = await listPurchaseOrders()
  return rows.find((entry) => entry.poId === poId)
}

export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput,
  createdBy: string,
): Promise<{ ok: true; purchaseOrder: PurchaseOrderEntry } | { ok: false; errors: ValidationErrors }> {
  const [vendors, skus, poRows, poLines, allowedMappings] = await Promise.all([
    readVendorRows(),
    readSkuRows(),
    readPurchaseOrderRows(),
    readPurchaseOrderLines(),
    getVendorAllowedSkus(input.vendorId),
  ])
  const vendor = vendors.find((entry) => entry.vendorId === input.vendorId)
  const errors = validateCreatePurchaseOrder(input, vendor, allowedMappings)
  if (Object.keys(errors).length > 0 || !vendor) {
    return { ok: false, errors: Object.keys(errors).length > 0 ? errors : { vendorId: "Invalid vendor." } }
  }

  const now = nowIso()
  const poId = randomUUID()
  const poNumber = buildPoNumber(poRows)
  const mappingBySku = new Map(allowedMappings.map((mapping) => [mapping.skuId, mapping]))
  const skuById = new Map(skus.map((sku) => [sku.skuId, sku]))

  const lineEntries: PurchaseOrderLine[] = input.lines.map((line, index) => {
    const sku = skuById.get(line.skuId)
    const mapping = mappingBySku.get(line.skuId)
    const unitCost = Number.isFinite(line.unitCost ?? NaN)
      ? Number(line.unitCost)
      : mapping?.unitCost ?? sku?.value ?? 0

    return {
      poLineId: randomUUID(),
      poId,
      lineNumber: index + 1,
      skuId: line.skuId,
      skuCode: sku?.skuCode ?? "",
      productName: sku?.name ?? "",
      vendorSku: mapping?.vendorSku ?? sku?.skuCode ?? "",
      orderedQty: Number(line.orderedQty) || 0,
      receivedQty: 0,
      unitCost,
      lineTotal: (Number(line.orderedQty) || 0) * unitCost,
      expectedDate: line.expectedDate || input.expectedDate,
      lineStatus: PO_STATUS_PENDING,
      notes: line.notes || "",
      createdAt: now,
      updatedAt: now,
    }
  })

  const subtotal = lineEntries.reduce((sum, line) => sum + line.orderedQty * line.unitCost, 0)
  const shippingAmount = Number(input.shippingAmount) || 0
  const totalAmount = subtotal + shippingAmount

  const poRow: PurchaseOrderRow = {
    poId,
    poNumber,
    vendorId: vendor.vendorId,
    vendorName: vendor.vendorName,
    warehouse: input.warehouse,
    status: normalizePoStatus(input.status, PO_STATUS_PENDING),
    orderDate: input.orderDate || now,
    expectedDate: input.expectedDate || now,
    receivedDate: "",
    poDisplayId: normalizeText(input.poDisplayId ?? "") || poNumber,
    trackingNumber: normalizeText(input.trackingNumber ?? ""),
    notes: normalizeText(input.notes ?? ""),
    subtotal,
    shippingAmount,
    totalAmount,
    createdBy,
    createdAt: now,
    updatedAt: now,
  }

  await writePurchaseOrderRows([poRow, ...poRows])
  await writePurchaseOrderLines([...poLines, ...lineEntries])
  await appendPurchaseOrderHistoryRow({
    historyId: randomUUID(),
    poId,
    eventType: "created",
    eventMessage: `PO created with ${lineEntries.length} line item(s).`,
    changedBy: createdBy,
    location: "",
    createdAt: now,
  })

  const purchaseOrder = await getPurchaseOrderById(poId)
  if (!purchaseOrder) {
    return { ok: false, errors: { general: "Failed to load created purchase order." } }
  }

  return { ok: true, purchaseOrder }
}

export async function patchPurchaseOrder(
  poId: string,
  input: PatchPurchaseOrderInput,
): Promise<PurchaseOrderEntry | undefined> {
  const poRows = await readPurchaseOrderRows()
  const target = poRows.find((row) => row.poId === poId)
  if (!target) {
    return undefined
  }

  const merged: PurchaseOrderRow = {
    ...target,
    status: input.status ? normalizePoStatus(input.status, target.status) : target.status,
    warehouse: input.warehouse ?? target.warehouse,
    orderDate: input.orderDate ?? target.orderDate,
    expectedDate: input.expectedDate ?? target.expectedDate,
    receivedDate: input.receivedDate ?? target.receivedDate,
    poDisplayId: input.poDisplayId ?? target.poDisplayId,
    trackingNumber: input.trackingNumber ?? target.trackingNumber,
    notes: input.notes ?? target.notes,
    shippingAmount: Number.isFinite(input.shippingAmount ?? NaN)
      ? Number(input.shippingAmount)
      : target.shippingAmount,
    updatedAt: nowIso(),
  }

  merged.totalAmount = merged.subtotal + merged.shippingAmount

  const next = poRows.map((row) => (row.poId === poId ? merged : row))
  await writePurchaseOrderRows(next)

  const changedFields: string[] = []
  if (target.status !== merged.status) {
    changedFields.push(`status: ${target.status} -> ${merged.status}`)
  }
  if (target.poDisplayId !== merged.poDisplayId) {
    changedFields.push("PO ID updated")
  }
  if (target.trackingNumber !== merged.trackingNumber) {
    changedFields.push("tracking updated")
  }
  if (target.notes !== merged.notes) {
    changedFields.push("notes updated")
  }

  if (changedFields.length > 0) {
    await appendPurchaseOrderHistoryRow({
      historyId: randomUUID(),
      poId,
      eventType: "updated",
      eventMessage: changedFields.join("; "),
      changedBy: "admin",
      location: "",
      createdAt: nowIso(),
    })
  }

  return getPurchaseOrderById(poId)
}

export async function deletePurchaseOrder(poId: string): Promise<boolean> {
  const [poRows, poLines, historyRows] = await Promise.all([
    readPurchaseOrderRows(),
    readPurchaseOrderLines(),
    readPurchaseOrderHistoryRows(),
  ])

  const exists = poRows.some((row) => row.poId === poId)
  if (!exists) {
    return false
  }

  await Promise.all([
    writePurchaseOrderRows(poRows.filter((row) => row.poId !== poId)),
    writePurchaseOrderLines(poLines.filter((line) => line.poId !== poId)),
    writeCsvRows(
      CSV_FILES.purchaseOrderHistory.path,
      [...CSV_FILES.purchaseOrderHistory.headers],
      historyRows
        .filter((entry) => entry.poId !== poId)
        .map((entry) => ({
          history_id: entry.historyId,
          po_id: entry.poId,
          event_type: entry.eventType,
          event_message: entry.eventMessage,
          changed_by: entry.changedBy,
          location: entry.location,
          created_at: entry.createdAt,
        })),
    ),
  ])

  return true
}

function derivePoStatus(lines: PurchaseOrderLine[], currentStatus: string): string {
  if (currentStatus === PO_STATUS_CLOSED) {
    return PO_STATUS_CLOSED
  }
  if (lines.length === 0) {
    return PO_STATUS_PENDING
  }
  const allReceived = lines.every((line) => line.receivedQty >= line.orderedQty)
  if (allReceived) {
    return PO_STATUS_RECEIVED
  }
  const someReceived = lines.some((line) => line.receivedQty > 0)
  return someReceived ? PO_STATUS_IN_TRANSIT : PO_STATUS_PENDING
}

export async function receivePurchaseOrder(
  poId: string,
  input: ReceivePurchaseOrderInput,
): Promise<{ ok: true; purchaseOrder: PurchaseOrderEntry } | { ok: false; errors: ValidationErrors }> {
  await syncSkuInventoryFromLocations()
  const [poRows, lines, skus, logs, orderRows, orderLineRows, skuLocationRows, locationRows] = await Promise.all([
    readPurchaseOrderRows(),
    readPurchaseOrderLines(),
    readSkuRows(),
    readInventoryLogs(),
    readOrderRows(),
    readOrderLineRows(),
    readSkuLocationRows(),
    readLocationRows(),
  ])

  const po = poRows.find((row) => row.poId === poId)
  if (!po) {
    return { ok: false, errors: { po: "Purchase order not found." } }
  }

  const poLines = lines.filter((line) => line.poId === poId)
  const lineById = new Map(poLines.map((line) => [line.poLineId, line]))
  const errors: ValidationErrors = {}

  input.lines.forEach((item, index) => {
    const line = lineById.get(item.poLineId)
    if (!line) {
      errors[`line_${index}`] = "Line item not found."
      return
    }
    if (item.receiveQty <= 0) {
      errors[`line_qty_${index}`] = "Receive quantity must be greater than 0."
      return
    }
    const remaining = line.orderedQty - line.receivedQty
    if (item.receiveQty > remaining) {
      errors[`line_qty_${index}`] = `Receive quantity exceeds remaining (${remaining}).`
    }

    const location = resolveWarehouseLocation(po.warehouse, locationRows, item.location ?? input.location)
    if (!location) {
      errors[`line_location_${index}`] = "Valid receiving location is required for this warehouse."
    }
  })

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  const now = nowIso()
  const nextLines = lines.map((line) => {
    if (line.poId !== poId) {
      return line
    }
    const receive = input.lines.find((entry) => entry.poLineId === line.poLineId)
    if (!receive) {
      return line
    }
    const nextReceived = line.receivedQty + receive.receiveQty
    return {
      ...line,
      receivedQty: nextReceived,
      lineStatus: nextReceived >= line.orderedQty ? PO_STATUS_RECEIVED : PO_STATUS_IN_TRANSIT,
      updatedAt: now,
    }
  })

  const nextSkus = [...skus]
  const nextSkuLocationRows = skuLocationRows.map((row) => ({ ...row }))
  const nextLogs = [...logs]

  input.lines.forEach((item) => {
    const line = lineById.get(item.poLineId)
    if (!line) {
      return
    }
    const location = resolveWarehouseLocation(po.warehouse, locationRows, item.location ?? input.location)
    if (!location) {
      return
    }
    const sku = nextSkus.find((entry) => entry.skuId === line.skuId)
    if (!sku) {
      return
    }

    const oldOnHand = sku.onHand
    const balance = nextSkuLocationRows.find(
      (entry) => entry.skuId === line.skuId && entry.warehouse === po.warehouse && entry.locationId === location.locationId,
    )

    if (balance) {
      balance.quantity += item.receiveQty
      balance.updatedAt = now
    } else {
      nextSkuLocationRows.push({
        assignmentId: randomUUID(),
        skuId: line.skuId,
        warehouse: po.warehouse,
        locationId: location.locationId,
        locationCode: location.locationCode,
        quantity: item.receiveQty,
        createdAt: now,
        updatedAt: now,
      })
    }

    const { nextSkuRows: recalculatedSkus } = applyLocationBalancesToSkuRows(nextSkus, nextSkuLocationRows, locationRows, now)
    recalculatedSkus.forEach((entry, index) => {
      nextSkus[index] = entry
    })
    const refreshedSku = nextSkus.find((entry) => entry.skuId === line.skuId)
    const newOnHand = refreshedSku?.onHand ?? oldOnHand

    nextLogs.push({
      logId: randomUUID(),
      skuId: sku.skuId,
      date: now,
      warehouse: po.warehouse,
      location: location.locationCode,
      changedBy: input.changedBy,
      oldOnHand,
      newOnHand,
      referenceType: "purchase_order",
      referenceId: po.poNumber,
      note: `Received ${item.receiveQty} units from ${po.poNumber} at ${location.locationCode}`,
    })
  })

  const refreshedPoLines = nextLines.filter((line) => line.poId === poId)
  const nextStatus = derivePoStatus(refreshedPoLines, po.status)

  const nextPoRows = poRows.map((row) => {
    if (row.poId !== poId) {
      return row
    }
    return {
      ...row,
      status: nextStatus,
      receivedDate: nextStatus === PO_STATUS_RECEIVED || nextStatus === PO_STATUS_CLOSED ? now : row.receivedDate,
      updatedAt: now,
    }
  })

  const reprocessResult = reprocessRuntimeOrderAllocations({
    orders: orderRows,
    orderLines: orderLineRows,
    skus: nextSkus,
    now,
  })

  await Promise.all([
    writePurchaseOrderRows(nextPoRows),
    writePurchaseOrderLines(nextLines),
    writeSkuRows(reprocessResult.nextSkus),
    writeSkuLocationRows(nextSkuLocationRows),
    writeInventoryLogs(nextLogs),
    writeOrderLineRows(reprocessResult.nextOrderLines),
  ])

  const receivedUnits = input.lines.reduce((sum, line) => sum + line.receiveQty, 0)
  const receiveLocations = Array.from(
    new Set(
      input.lines
        .map((line) => resolveWarehouseLocation(po.warehouse, locationRows, line.location ?? input.location)?.locationCode)
        .filter((value): value is string => Boolean(value)),
    ),
  )
  await appendPurchaseOrderHistoryRow({
    historyId: randomUUID(),
    poId,
    eventType: "received",
    eventMessage: `Received ${receivedUnits} unit(s). Status: ${nextStatus}.`,
    changedBy: input.changedBy,
    location: receiveLocations.join(", "),
    createdAt: now,
  })

  if (reprocessResult.changes.length > 0) {
    await appendOrderReprocessHistoryEntries({
      orders: orderRows,
      changes: reprocessResult.changes,
      changedBy: input.changedBy,
      createdAt: now,
      reason: "po_receive",
    })
  }

  const updated = await getPurchaseOrderById(poId)
  if (!updated) {
    return { ok: false, errors: { general: "Failed to load updated purchase order." } }
  }

  return { ok: true, purchaseOrder: updated }
}

export async function getDashboardStats(): Promise<{
  skuCount: number
  activeSkuCount: number
  vendorCount: number
  purchaseOrderPendingCount: number
  purchaseOrderInTransitCount: number
  purchaseOrderReceivedCount: number
  purchaseOrderClosedCount: number
  totalOnHand: number
  unfulfilledOrderCount: number
  fulfilledOrderCount: number
  backorderedOrderCount: number
  shippedTodayCount: number
  monthlySalesAmount: number
  monthlyOrderCount: number
  monthlySalesTrend: { label: string; value: number }[]
  dailyOrderVolume: { label: string; value: number }[]
  orderStatusBreakdown: { label: string; value: number }[]
  purchaseOrderStatusBreakdown: { label: string; value: number }[]
}> {
  await reconcileOrderAllocationStateIfNeeded()
  await syncSkuInventoryFromLocations()
  const [skus, vendors, pos, orders, orderLines] = await Promise.all([
    readSkuRows(),
    readVendorRows(),
    readPurchaseOrderRows(),
    readOrderRows(),
    readOrderLineRows(),
  ])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const lineBuckets = new Map<string, OrderLineRow[]>()
  orderLines.forEach((line) => {
    const bucket = lineBuckets.get(line.orderId) ?? []
    bucket.push(line)
    lineBuckets.set(line.orderId, bucket)
  })

  const fulfilledOrderCount = orders.filter((order) => order.status === "Fulfilled").length
  const unfulfilledOrderCount = orders.filter((order) => order.status !== "Fulfilled" && order.status !== "Canceled").length
  const backorderedOrderCount = orders.filter((order) =>
    (lineBuckets.get(order.orderId) ?? []).some((line) => line.quantityBackordered > 0),
  ).length
  const shippedTodayCount = orders.filter((order) => {
    if (!order.shippedAt) return false
    const shippedDate = new Date(order.shippedAt)
    return shippedDate >= todayStart && shippedDate <= todayEnd
  }).length
  const monthlyOrders = orders.filter((order) => new Date(order.placedAt) >= monthStart && order.status !== "Canceled")
  const monthlySalesAmount = monthlyOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  const monthlyOrderCount = monthlyOrders.length

  const monthlySalesTrend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    const nextDate = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    const value = orders
      .filter((order) => {
        const placed = new Date(order.placedAt)
        return placed >= date && placed < nextDate && order.status !== "Canceled"
      })
      .reduce((sum, order) => sum + order.totalAmount, 0)
    return {
      label: date.toLocaleString("en-US", { month: "short" }),
      value,
    }
  })

  const dailyOrderVolume = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - (6 - index))
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    const value = orders.filter((order) => {
      const placed = new Date(order.placedAt)
      return placed >= start && placed <= end
    }).length
    return {
      label: date.toLocaleString("en-US", { weekday: "short" }),
      value,
    }
  })

  const orderStatusCounts = new Map<string, number>()
  orders.forEach((order) => {
    orderStatusCounts.set(order.status, (orderStatusCounts.get(order.status) ?? 0) + 1)
  })

  const poStatusCounts = new Map<string, number>()
  pos.forEach((po) => {
    poStatusCounts.set(po.status, (poStatusCounts.get(po.status) ?? 0) + 1)
  })

  return {
    skuCount: skus.length,
    activeSkuCount: skus.filter((sku) => sku.active).length,
    vendorCount: vendors.length,
    purchaseOrderPendingCount: pos.filter((po) => po.status === PO_STATUS_PENDING).length,
    purchaseOrderInTransitCount: pos.filter((po) => po.status === PO_STATUS_IN_TRANSIT).length,
    purchaseOrderReceivedCount: pos.filter((po) => po.status === PO_STATUS_RECEIVED).length,
    purchaseOrderClosedCount: pos.filter((po) => po.status === PO_STATUS_CLOSED).length,
    totalOnHand: skus.reduce((sum, sku) => sum + sku.onHand, 0),
    unfulfilledOrderCount,
    fulfilledOrderCount,
    backorderedOrderCount,
    shippedTodayCount,
    monthlySalesAmount,
    monthlyOrderCount,
    monthlySalesTrend,
    dailyOrderVolume,
    orderStatusBreakdown: Array.from(orderStatusCounts.entries()).map(([label, value]) => ({ label, value })),
    purchaseOrderStatusBreakdown: Array.from(poStatusCounts.entries()).map(([label, value]) => ({ label, value })),
  }
}
