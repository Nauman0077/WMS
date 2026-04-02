# Create SKU Parity Spec (ShipHero Reference)

## Page Context

- Navigation path: `Inventory > Products > Add a product`
- Layout split:
  - Left/main: Product form
  - Right sidebar: Vendors checklist
  - Footer action bar: `Save Product`

## Create SKU Form Sections

### Details

- `This is a custom item.` (checkbox)
- `Name` (required)
- `Value` (decimal, helper text: cost for account purposes)
- `Weight (lb)` (decimal)
- `Sku` (required)
- `Barcode` (optional, auto-generated if omitted)
- `Warehouse` (single select)
- `Product Image` (file input + plus button)

### UOM

- `This is a UOM item` (checkbox)
- `UOM Type` (select; shown as disabled when not active)
- `Component` (required when UOM is enabled)
- `Quantity` (required when UOM is enabled)

### Vendors Sidebar

- Long checkbox list of vendors
- Supports multi-select

### Footer Actions

- Primary button: `Save Product`

## Validation Rules (Parity Behavior)

- Name is required.
- SKU is required.
- SKU must be unique.
- If UOM item is enabled:
  - Component is required.
  - Quantity must be greater than 0.
- If barcode is empty, generate one automatically at save time.

## Data Defaults

- Active: `Yes`
- Numeric inputs default to `0` or `0.00`
- Warehouse defaults to current selected warehouse context
