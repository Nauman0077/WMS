import Link from "next/link"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"
import { listVendors, listVendorSkuMappings } from "@/lib/wms-repository"

export default async function VendorsPage() {
  await requireSessionOrRedirect()
  const vendors = await listVendors()

  const mappingCounts = await Promise.all(
    vendors.map(async (vendor) => {
      const mappings = await listVendorSkuMappings(vendor.vendorId)
      return [vendor.vendorId, mappings.length] as const
    }),
  )
  const mappingCountByVendor = new Map(mappingCounts)

  return (
    <WmsShell
      title="Vendors"
      actions={
        <Link className="primary-link" href="/vendors/create">
          Add Vendor
        </Link>
      }
    >
      <section className="panel table-panel">
        <div className="table-meta">Showing {vendors.length} vendors</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vendor Name</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Account Number</th>
                <th>Address</th>
                <th>SKU Assignments</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.vendorId}>
                  <td>
                    <Link className="table-link" href={`/vendors/${vendor.vendorId}`}>
                      {vendor.vendorName}
                    </Link>
                  </td>
                  <td>{vendor.contactName}</td>
                  <td>{vendor.contactEmail}</td>
                  <td>{vendor.contactPhone || "-"}</td>
                  <td>{vendor.accountNumber || "-"}</td>
                  <td>{[vendor.city, vendor.state].filter(Boolean).join(", ") || "-"}</td>
                  <td>{mappingCountByVendor.get(vendor.vendorId) ?? 0}</td>
                  <td>{new Date(vendor.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </WmsShell>
  )
}
