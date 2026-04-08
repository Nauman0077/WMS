export interface InventorySummary {
  onHand: number
  available: number
  allocated: number
  reserved: number
  backorder: number
  nonSellableTotal: number
}

export interface LocationRecord {
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

export interface SkuLocationBalance {
  assignmentId: string
  skuId: string
  warehouse: string
  locationId: string
  locationCode: string
  locationName: string
  locationType: string
  isPickable: boolean
  isSellable: boolean
  quantity: number
  createdAt: string
  updatedAt: string
}

export interface UserRecord {
  userId: string
  username: string
  email: string
  passwordHash: string
  passwordSalt: string
  fullName: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string
}

export interface SessionRecord {
  sessionId: string
  userId: string
  username: string
  issuedAt: string
  expiresAt: string
  revokedAt: string
  ip: string
  userAgent: string
}

export interface SkuFlags {
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
}

export interface SkuNotes {
  product: string
  packer: string
  returnNote: string
}

export interface SkuUom {
  enabled: boolean
  type: string
  componentSku: string
  quantity: number
}

export interface VendorAssignment {
  vendorId?: string
  name: string
  vendorSku: string
  vendorCost: number
}

export interface VendorRecord {
  vendorId: string
  vendorCode: string
  vendorName: string
  accountNumber: string
  contactName: string
  contactEmail: string
  contactPhone: string
  address1: string
  address2: string
  city: string
  state: string
  postalCode: string
  country: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface VendorSkuMapping {
  mappingId: string
  vendorId: string
  skuId: string
  skuCode: string
  skuName: string
  vendorSku: string
  unitCost: number
  leadTimeDays: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrderEntry {
  poNumber: string
  poId: string
  poDisplayId: string
  vendorId: string
  vendorName: string
  warehouse: string
  status: string
  orderDate: string
  expectedDate: string
  receivedDate: string
  trackingNumber: string
  notes: string
  subtotal: number
  shippingAmount: number
  totalAmount: number
  createdBy: string
  createdAt: string
  updatedAt: string
  lines: PurchaseOrderLine[]
  history: PurchaseOrderHistoryEntry[]
}

export interface PurchaseOrderHistoryEntry {
  historyId: string
  poId: string
  eventType: string
  eventMessage: string
  changedBy: string
  location: string
  createdAt: string
}

export interface PurchaseOrderLine {
  poLineId: string
  poId: string
  lineNumber: number
  skuId: string
  skuCode: string
  productName: string
  vendorSku: string
  orderedQty: number
  receivedQty: number
  unitCost: number
  lineTotal: number
  expectedDate: string
  lineStatus: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrderSummaryRow {
  poDate: string
  poId: string
  poNumber: string
  vendorName: string
  quantity: number
  quantityReceived: number
  sellAhead: number
  fulfillmentStatus: string
}

export interface InventoryLogEntry {
  logId?: string
  skuId?: string
  referenceType?: string
  referenceId?: string
  date: string
  warehouse: string
  location: string
  changedBy: string
  oldOnHand: number
  newOnHand: number
  note: string
}

export interface SkuRecord {
  id: string
  active: boolean
  customItem: boolean
  name: string
  sku: string
  barcode: string
  warehouse: string
  value: number
  price: number
  weightLb: number
  dimensionsIn: {
    height: number
    width: number
    length: number
  }
  customsValue: number
  customsDescription: string
  countryOfManufacture: string
  valueCurrency: string
  tariffCode: string
  tags: string[]
  flags: SkuFlags
  notes: SkuNotes
  uom: SkuUom
  selectedVendors: string[]
  inventory: InventorySummary
  vendorAssignments: VendorAssignment[]
  purchaseOrders: PurchaseOrderSummaryRow[]
  locationBalances: SkuLocationBalance[]
  inventoryLog: InventoryLogEntry[]
  createdAt: string
  updatedAt: string
}

export interface CreateLocationInput {
  warehouse: string
  locationCode: string
  locationName: string
  locationType: string
  isActive?: boolean
  isPickable?: boolean
  isReceivable?: boolean
  isSellable?: boolean
  sortOrder?: number
  notes?: string
}

export interface CreateSkuInput {
  customItem: boolean
  name: string
  value: number
  weightLb: number
  sku: string
  barcode: string
  warehouse: string
  uomItem: boolean
  uomType: string
  componentSku: string
  componentQuantity: number
  selectedVendors: string[]
}

export interface CreateVendorInput {
  vendorCode?: string
  vendorName: string
  accountNumber: string
  contactName: string
  contactEmail: string
  contactPhone: string
  address1: string
  address2: string
  city: string
  state: string
  postalCode: string
  country: string
  notes: string
}

export interface CreateVendorSkuInput {
  skuId: string
  vendorSku: string
  unitCost: number
  leadTimeDays?: number
  active?: boolean
}

export interface CreatePurchaseOrderLineInput {
  skuId: string
  orderedQty: number
  unitCost?: number
  expectedDate?: string
  notes?: string
}

export interface CreatePurchaseOrderInput {
  vendorId: string
  warehouse: string
  status: string
  orderDate: string
  expectedDate: string
  poDisplayId?: string
  trackingNumber?: string
  notes?: string
  shippingAmount?: number
  lines: CreatePurchaseOrderLineInput[]
}

export interface ReceivePurchaseOrderInput {
  location?: string
  changedBy: string
  lines: {
    poLineId: string
    receiveQty: number
    location?: string
  }[]
}

export interface LoginInput {
  usernameOrEmail: string
  password: string
}

export interface PatchSkuInput {
  active?: boolean
  warehouse?: string
  value?: number
  price?: number
  notes?: Partial<SkuNotes>
}

export type PatchLocationInput = Partial<CreateLocationInput>

export interface BulkPatchSkusInput {
  skuIds: string[]
  patch: {
    active?: boolean
    warehouse?: string
    value?: number
    price?: number
  }
}

export type PatchVendorInput = Partial<CreateVendorInput>

export interface PatchPurchaseOrderInput extends Partial<CreatePurchaseOrderInput> {
  status?: string
  receivedDate?: string
}

export interface OrderLineItem {
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
}

export interface OrderHistoryEntry {
  historyId: string
  orderId: string
  eventType: string
  eventMessage: string
  changedBy: string
  createdAt: string
}

export interface OrderRecord {
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
  lines: OrderLineItem[]
  history: OrderHistoryEntry[]
}

export interface CreateOrderLineInput {
  skuId: string
  quantity: number
  unitPrice?: number
}

export interface CreateOrderInput {
  externalOrderNumber?: string
  shopName: string
  customerName: string
  customerEmail: string
  shippingCarrier: string
  shippingMethod: string
  shippingAddress1: string
  shippingAddress2?: string
  shippingCity: string
  shippingState: string
  shippingPostalCode: string
  shippingCountry: string
  warehouse: string
  status: string
  paymentStatus: string
  flagged?: boolean
  priorityOrder?: boolean
  fraudHold?: boolean
  addressHold?: boolean
  operatorHold?: boolean
  paymentHold?: boolean
  holdUntilDate?: string
  placedAt: string
  requiredShipDate?: string
  notes?: string
  shippingAmount?: number
  taxAmount?: number
  lines: CreateOrderLineInput[]
}

export type PatchOrderInput = Partial<CreateOrderInput>

export type ValidationErrors = Record<string, string>
