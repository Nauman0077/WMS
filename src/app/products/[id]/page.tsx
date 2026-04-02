import { notFound } from "next/navigation"
import { SkuNotesEditor } from "@/components/sku-notes-editor"
import { SkuDeleteButton } from "@/components/sku-delete-button"
import { WmsShell } from "@/components/wms-shell"
import { getSkuById } from "@/lib/sku-store"
import { requireSessionOrRedirect } from "@/lib/auth-session"

interface ProductDetailsPageProps {
  params: Promise<{ id: string }>
}

function boolToYesNo(value: boolean): string {
  return value ? "Yes" : "No"
}

export default async function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  await requireSessionOrRedirect()
  const { id } = await params
  const sku = await getSkuById(id)

  if (!sku) {
    notFound()
  }

  const detailRows = [
    ["Customer", "SF - nobltravel"],
    ["Active", boolToYesNo(sku.active)],
    ["Name", sku.name],
    ["SKU", sku.sku],
    ["Weight (lb)", sku.weightLb.toFixed(2)],
    ["Height (in)", sku.dimensionsIn.height.toFixed(7)],
    ["Width (in)", sku.dimensionsIn.width.toFixed(7)],
    ["Length (in)", sku.dimensionsIn.length.toFixed(7)],
    ["Value", sku.value.toFixed(4)],
    ["Price", `$${sku.price.toFixed(4)}`],
    ["Customs Value", `$${sku.customsValue.toFixed(4)}`],
    ["Customs Description", sku.customsDescription || ""],
    ["On Hand", `${sku.inventory.onHand}`],
    ["Allocated", `${sku.inventory.allocated}`],
    ["Reserve", `${sku.inventory.reserved}`],
    ["Non Sellable Total", `${sku.inventory.nonSellableTotal}`],
    ["In Tote", "0"],
    ["Reorder Level", "0"],
    ["Reorder Amount", "1"],
    ["Replenishment Level", "0"],
    ["Available", `${sku.inventory.available}`],
    ["Backorder", `${sku.inventory.backorder}`],
    ["Barcode", sku.barcode],
    ["Warehouse", sku.warehouse],
    ["Country Of Manufacture", sku.countryOfManufacture],
    ["Value Currency", sku.valueCurrency],
    ["Tariff Code", sku.tariffCode],
    ["Tags", sku.tags.length > 0 ? sku.tags.join(", ") : ""],
    ["Custom", boolToYesNo(sku.customItem)],
    ["Is Final Sale", boolToYesNo(sku.flags.isFinalSale)],
    ["Dropship Only", boolToYesNo(sku.flags.dropshipOnly)],
    ["Build Kit", boolToYesNo(sku.flags.builtKit)],
    ["Is Assembly", boolToYesNo(sku.flags.isAssembly)],
    ["Ignore On Invoice", boolToYesNo(sku.flags.ignoreOnInvoice)],
    ["Ignore On Customs", boolToYesNo(sku.flags.ignoreOnCustoms)],
    ["Is Virtual", boolToYesNo(sku.flags.isVirtual)],
    ["Needs Serial Number", boolToYesNo(sku.flags.needsSerialNumber)],
    ["Lithium-Ion", boolToYesNo(sku.flags.lithiumIon)],
    ["Dangerous Goods Code", ""],
    ["Auto Fulfill", boolToYesNo(sku.flags.autoFulfill)],
    ["Auto Pack", boolToYesNo(sku.flags.autoPack)],
    ["Ships Alone", boolToYesNo(sku.flags.shipsAlone)],
  ]

  return (
    <WmsShell title={`Product Details: ${sku.sku}`}>
      <div className="details-layout">
        <aside className="details-sidebar">
          <section className="panel">
            <div className="panel-title">Details</div>
            <dl className="detail-list">
              {detailRows.map(([label, value]) => (
                <div className="detail-row" key={label}>
                  <dt>{label}:</dt>
                  <dd>{value || " "}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="panel spaced-panel">
            <div className="panel-title">Actions</div>
            <div className="action-stack">
              <button className="secondary-button" type="button">
                Change SKU
              </button>
              <button className="secondary-button" type="button">
                Process Inventory
              </button>
              <button className="secondary-button" type="button">
                View Barcode Label
              </button>
              <button className="secondary-button" type="button">
                Print Barcode Label
              </button>
              <SkuDeleteButton skuId={sku.id} />
            </div>
          </section>
        </aside>

        <section className="details-main">
          <section className="panel">
            <div className="panel-title">Images</div>
            <div className="image-panel-row">
              <div className="product-thumb">
                <div className="product-thumb-image">IMG</div>
                <button className="delete-x" type="button">
                  x
                </button>
              </div>
              <button className="secondary-button" type="button">
                Upload Image
              </button>
            </div>
          </section>

          <SkuNotesEditor skuId={sku.id} initialNotes={sku.notes} />

          <section className="panel spaced-panel">
            <div className="panel-title">Product UOM Components</div>
            <div className="split-input-row">
              <select className="input small-select">
                <option>Select UOM</option>
                <option>Inner pack</option>
                <option>Master case</option>
              </select>
              <input className="input" placeholder="Search for a product to add" />
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Quantity</th>
                    <th>SKU</th>
                    <th>Barcode</th>
                    <th>Total on Hand (ea)</th>
                    <th>Total in UOM (ea)</th>
                    <th>Total in other UOMs (ea)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={8}>No matching records found</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel spaced-panel">
            <div className="panel-title">Kit Components</div>
            <input className="input" placeholder="Search for a product to add" />
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Quantity</th>
                    <th>On Hand</th>
                    <th>Allocated</th>
                    <th>Backorder</th>
                    <th>SKU</th>
                    <th>Warehouse</th>
                    <th>Barcode</th>
                    <th>Bin</th>
                    <th>OS Bin</th>
                    <th>Price</th>
                    <th>Value</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={13}>No data available in table</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel spaced-panel">
            <div className="panel-title">Kits</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Quantity</th>
                    <th>On Hand</th>
                    <th>Allocated</th>
                    <th>Backorder</th>
                    <th>SKU</th>
                    <th>Barcode</th>
                    <th>Bin</th>
                    <th>OS Bin</th>
                    <th>Warehouse</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={11}>No data available in table</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel spaced-panel">
            <div className="panel-title with-action">
              <span>Bins</span>
              <button className="ghost-button" type="button">
                + Add Bin
              </button>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Warehouse</th>
                    <th>Location</th>
                    <th>Quantity</th>
                    <th>Pickable</th>
                    <th>Sellable</th>
                    <th>UOM SKU</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={8}>No data available in table</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel spaced-panel">
            <div className="panel-title with-action">
              <span>Product Case Barcodes</span>
              <button className="ghost-button" type="button">
                + Add a product case
              </button>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case Barcode</th>
                    <th>Case Quantity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3}>No data available in table</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel spaced-panel">
            <div className="panel-title">Orders</div>
            <div className="split-input-row">
              <select className="input small-select">
                <option>Orders that have this allocated</option>
              </select>
              <select className="input small-select">
                <option>All Orders</option>
              </select>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Order Number</th>
                    <th>Shop Name</th>
                    <th>Quantity</th>
                    <th>Quantity Shipped</th>
                    <th>Allocated</th>
                    <th>Backordered</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={7}>No data available in table</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel spaced-panel">
            <div className="panel-title">Sales History</div>
            <button className="ghost-button" type="button">
              Load Sales History
            </button>
          </section>

          <section className="panel spaced-panel">
            <div className="panel-title">Purchase Orders</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PO Date</th>
                    <th>PO ID</th>
                    <th>PO Number</th>
                    <th>Vendor Name</th>
                    <th>Quantity</th>
                    <th>Quantity Received</th>
                    <th>Sell Ahead</th>
                    <th>Fulfillment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sku.purchaseOrders.map((entry) => (
                    <tr key={entry.poId}>
                      <td>{entry.poDate}</td>
                      <td>{entry.poId}</td>
                      <td className="table-link">{entry.poNumber}</td>
                      <td>{entry.vendorName}</td>
                      <td>{entry.quantity}</td>
                      <td>{entry.quantityReceived}</td>
                      <td>{entry.sellAhead}</td>
                      <td>{entry.fulfillmentStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel spaced-panel">
            <div className="panel-title">Vendors</div>
            <input className="input" placeholder="Search for a vendor to add" />
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vendor Name</th>
                    <th>Vendor SKU</th>
                    <th>Vendor Cost</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sku.vendorAssignments.map((vendor) => (
                    <tr key={vendor.name}>
                      <td>{vendor.name}</td>
                      <td>{vendor.vendorSku}</td>
                      <td>{vendor.vendorCost.toFixed(2)}</td>
                      <td>
                        <button className="danger-button" type="button">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel spaced-panel">
            <div className="panel-title">Stores</div>
            <div className="stores-row">
              <div>
                <strong>Store</strong>
                <p>The stores this item exists in.</p>
              </div>
              <div>
                <strong>Push Available Inventory</strong>
                <p>Force an inventory push to the store. Usually happens within 5 mins.</p>
              </div>
              <div>
                <strong>Do Not Manage Inventory</strong>
                <p>We will not push inventory changes to the store for this item.</p>
              </div>
            </div>
          </section>

          <section className="panel spaced-panel">
            <div className="panel-title">Inventory Log</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Warehouse</th>
                    <th>Location</th>
                    <th>Changed By</th>
                    <th>Old On Hand</th>
                    <th>New On Hand</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {sku.inventoryLog.map((entry, index) => (
                    <tr key={`${entry.date}-${index}`}>
                      <td>{entry.date}</td>
                      <td>{entry.warehouse}</td>
                      <td>{entry.location}</td>
                      <td>{entry.changedBy}</td>
                      <td>{entry.oldOnHand}</td>
                      <td>{entry.newOnHand}</td>
                      <td>{entry.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel spaced-panel">
            <div className="panel-title">Product Log</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Change</th>
                    <th>Changed By</th>
                    <th>Warehouse</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={4}>No data available in table</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </WmsShell>
  )
}
