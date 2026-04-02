# SKU Module Parity QA Checklist

## Completed Checks

- `Products` grid screen scaffolded with left filters and data table.
- `Add Product` screen scaffolded with details form, UOM controls, vendors panel, and save bar.
- Required validation behavior implemented for Name, SKU, and UOM component rules.
- SKU details screen scaffolded with:
  - Details sidebar and actions
  - Images section
  - Product, Packer, Return notes with update actions
  - UOM Components, Kit Components, Kits, Bins, Case Barcodes, Orders
  - Sales History, Purchase Orders, Vendors, Stores, Inventory Log, Product Log
- API contracts implemented for `GET/POST /api/skus` and `GET/PATCH /api/skus/:id`.
- Build and lint pass.

## Known Gaps To Close For Tighter 1:1 Parity

- Top navigation interactions are static (no dropdown behavior yet).
- DataTables-style pagination and server-side filters are visual only.
- Image upload is scaffolded but not connected to storage.
- Vendor delete and most table action buttons are placeholder-only.
- Screenshot auto-rename is blocked until image files exist in `incoming-screenshots/`.
