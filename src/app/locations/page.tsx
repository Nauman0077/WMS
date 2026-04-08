import Link from "next/link"
import { LocationsListClient } from "@/components/locations-list-client"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"
import { listLocations } from "@/lib/wms-repository"

export default async function LocationsPage() {
  await requireSessionOrRedirect()
  const locations = await listLocations()

  return (
    <WmsShell
      title="Locations"
      actions={
        <Link className="primary-link" href="/locations/create">
          Create Location
        </Link>
      }
    >
      <LocationsListClient locations={locations} />
    </WmsShell>
  )
}
