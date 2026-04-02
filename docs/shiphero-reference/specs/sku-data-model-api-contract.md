# SKU Data Model and API Contract (v1)

## Entity: SKU

```ts
type Sku = {
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
  flags: {
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
  notes: {
    product: string
    packer: string
    return: string
  }
  uom: {
    enabled: boolean
    type: string
    componentSku: string
    quantity: number
  }
  selectedVendors: string[]
  createdAt: string
  updatedAt: string
}
```

## API Endpoints (Internal v1)

### `GET /api/skus`

- Returns SKU list for Products grid.

### `POST /api/skus`

- Creates a SKU from the Create Product form.

Request body:

```json
{
  "name": "Wheel With out Lock for Carry-On: All-In-One Mini Cherry Red",
  "sku": "WOLwheelALLMC18R",
  "barcode": "",
  "warehouse": "Las Vegas, USA - Nysonian - All Brands / Primary",
  "value": 0.45,
  "weightLb": 0,
  "customItem": false,
  "uomItem": false,
  "uomType": "Inner pack",
  "componentSku": "",
  "componentQuantity": 0,
  "selectedVendors": []
}
```

Validation response (422):

```json
{
  "message": "Validation failed",
  "errors": {
    "name": "Name is required.",
    "sku": "SKU is required."
  }
}
```

Success response (201):

```json
{
  "sku": {
    "id": "518002659",
    "name": "...",
    "sku": "..."
  }
}
```

### `GET /api/skus/:id`

- Returns one SKU detail payload.

### `PATCH /api/skus/:id`

- Partial updates for notes and lightweight field edits.

Example body:

```json
{
  "notes": {
    "product": "Handle with care"
  }
}
```

## Uniqueness Rules

- `sku` must be unique within the company.
- `barcode` should be unique if provided manually.

## Audit Requirements

- Track `createdAt`, `updatedAt`, and changed-by user id for later Product Log parity.
