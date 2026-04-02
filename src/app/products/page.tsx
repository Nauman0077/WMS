import Link from "next/link"
import { ProductsTableClient } from "@/components/products-table-client"
import { WmsShell } from "@/components/wms-shell"
import { listSkus } from "@/lib/sku-store"
import { requireSessionOrRedirect } from "@/lib/auth-session"

const filterLabels = [
  "Allocated",
  "In Stock",
  "Vendor",
  "Kit",
  "Warehouse",
  "Build Kit",
  "Final Sale",
  "On Order",
  "Active Products",
  "Sell Ahead",
  "In Store",
  "Not In Store",
  "Location Assigned",
  "Needs Serial Number",
]

export default async function ProductsPage() {
  await requireSessionOrRedirect()
  const skus = await listSkus()

  return (
    <WmsShell
      title="Products"
      actions={
        <>
          <button className="ghost-button" type="button">
            Print Custom Tag
          </button>
          <Link className="primary-link" href="/products/create">
            Add a product
          </Link>
        </>
      }
    >
      <div className="products-layout">
        <aside className="panel filters-panel">
          <div className="panel-title">Filters</div>
          <div className="filters-grid">
            {filterLabels.map((label) => (
              <div className="field-stack compact" key={label}>
                <label>{label}</label>
                <select className="input">
                  <option>All</option>
                </select>
              </div>
            ))}
          </div>
        </aside>

        <ProductsTableClient initialSkus={skus} />
      </div>
    </WmsShell>
  )
}
