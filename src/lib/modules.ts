export interface ModuleTab {
  key: string
  label: string
  href: string
  description: string
}

export const MODULE_TABS: ModuleTab[] = [
  {
    key: "home",
    label: "Home",
    href: "/home",
    description: "Operations dashboard and module launcher",
  },
  {
    key: "orders",
    label: "Orders",
    href: "/orders",
    description: "Order intake, fulfillment status, and customer shipments",
  },
  {
    key: "products",
    label: "Inventory",
    href: "/products",
    description: "SKU creation and product master",
  },
  {
    key: "vendors",
    label: "Vendors",
    href: "/vendors",
    description: "Vendor profiles and vendor SKU assignments",
  },
  {
    key: "purchase-orders",
    label: "Purchase Orders",
    href: "/purchase-orders",
    description: "PO creation, receiving, and status tracking",
  },
]
