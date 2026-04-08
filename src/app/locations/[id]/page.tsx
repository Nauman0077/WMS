import { notFound } from "next/navigation"
import { LocationForm } from "@/components/location-form"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"
import { getLocationById, getWarehouseOptions, listLocationBalancesForLocation } from "@/lib/wms-repository"

interface LocationDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function LocationDetailPage({ params }: LocationDetailPageProps) {
  await requireSessionOrRedirect()
  const { id } = await params
  const [location, warehouses, balances] = await Promise.all([
    getLocationById(id),
    getWarehouseOptions(),
    listLocationBalancesForLocation(id),
  ])

  if (!location) {
    notFound()
  }

  return (
    <WmsShell title={`Location: ${location.locationCode}`}>
      <LocationForm mode="edit" initialLocation={location} locationId={location.locationId} warehouses={warehouses} />
      <section className="panel spaced-panel panel-elevated">
        <div className="panel-title">SKU Balances In Location</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Quantity</th>
                <th>Sellable</th>
                <th>Pickable</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {balances.length === 0 ? (
                <tr>
                  <td colSpan={6}>No SKU balances in this location.</td>
                </tr>
              ) : (
                balances.map((balance) => (
                  <tr key={balance.assignmentId}>
                    <td>{balance.skuCode}</td>
                    <td>{balance.skuName}</td>
                    <td>{balance.quantity}</td>
                    <td>{balance.isSellable ? "Yes" : "No"}</td>
                    <td>{balance.isPickable ? "Yes" : "No"}</td>
                    <td>{balance.locationType}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </WmsShell>
  )
}
