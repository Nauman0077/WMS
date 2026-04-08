import { LocationForm } from "@/components/location-form"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"
import { getWarehouseOptions } from "@/lib/wms-repository"

export default async function CreateLocationPage() {
  await requireSessionOrRedirect()
  const warehouses = await getWarehouseOptions()

  return (
    <WmsShell title="Create Location">
      <LocationForm mode="create" warehouses={warehouses} />
    </WmsShell>
  )
}
