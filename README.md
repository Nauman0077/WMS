# WMS Operations Platform (Next.js)

Internal WMS web app for SKU, Vendor, and Purchase Order workflows with CSV-backed persistence.

## Commands

- `npm run dev` - start local development server
- `npm run lint` - run ESLint
- `npm run build` - create production build
- `npm run organize:screenshots` - move and rename screenshot references from `incoming-screenshots/`

## Login

- URL: `/auth/login`
- Default account:
  - Username: `admin`
  - Password: `admin`

Credentials are stored as hashed values in `data/users.csv`.

## Implemented Screens

- `Home` dashboard: `/home`
- `Products` list view: `/products`
- `Add Product / Create SKU` view: `/products/create`
- `Product Details` view: `/products/[id]`
- `Vendors` list view: `/vendors`
- `Create Vendor` view: `/vendors/create`
- `Vendor Details + SKU Assignment` view: `/vendors/[id]`
- `Orders` list view: `/orders`
- `Create Order` view: `/orders/create`
- `Order Details` view: `/orders/[id]`
- `Purchase Orders` list view: `/purchase-orders`
- `Create Purchase Order` view: `/purchase-orders/create`
- `Purchase Order Details + Receiving` view: `/purchase-orders/[id]`
- `Receive Purchase Order` view: `/purchase-orders/[id]/receive`
- `Settings` view: `/settings`

## Data Storage (CSV)

Runtime data is stored in `data/`:

- `users.csv`
- `sessions.csv`
- `skus.csv`
- `sku_notes.csv`
- `sku_locations.csv`
- `vendors.csv`
- `vendor_sku_map.csv`
- `orders.csv`
- `order_lines.csv`
- `order_history.csv`
- `purchase_orders.csv`
- `purchase_order_lines.csv`
- `purchase_order_history.csv`
- `inventory_log.csv`

Purchase Order validation enforces vendor-specific SKU mappings:

- PO vendor must be selected first.
- Only SKUs mapped to that vendor can be added to PO lines (UI + API enforced).

Current PO statuses:

- `Pending`
- `In Transit`
- `Received`
- `Closed`

Receiving flow:

- Use dedicated receive page from PO detail.
- Supports `Receive Selected` (line-by-line partial receipts).
- Supports `Receive Complete PO` (receives all remaining quantities).
- Temporary receive location selector is set to `Dummy Location`.
- Receiving increases SKU `onHand` and `available` quantities.

SKU management updates:

- Products list supports row selection and bulk edits (`active`, `warehouse`, `value`, `price`).
- SKU delete is available and blocked when location assignments exist for that SKU.

Theme and navigation updates:

- Default UI mode is light.
- Dark mode is available from `My Account -> Settings`.
- Top navigation includes ShipHero-style module grouping with `Orders` module.

## Reference Docs

- Screenshot structure and naming: `docs/shiphero-reference/README.md`
- Create SKU parity spec: `docs/shiphero-reference/specs/create-sku-parity-spec.md`
- Data model and API contract: `docs/shiphero-reference/specs/sku-data-model-api-contract.md`
- Parity QA checklist: `docs/shiphero-reference/specs/parity-qa-checklist.md`
