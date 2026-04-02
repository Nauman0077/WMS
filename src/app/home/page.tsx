import Link from "next/link"
import { WmsShell } from "@/components/wms-shell"
import { MODULE_TABS } from "@/lib/modules"
import { requireSessionOrRedirect } from "@/lib/auth-session"
import { getDashboardStats } from "@/lib/wms-repository"

export default async function HomePage() {
  await requireSessionOrRedirect()
  const stats = await getDashboardStats()

  return (
    <WmsShell title="Home">
      <section className="home-hero panel panel-elevated">
        <div className="panel-title">Mission Control</div>
        <div className="home-grid">
          <article className="stat-card">
            <span>Total SKUs</span>
            <strong>{stats.skuCount}</strong>
          </article>
          <article className="stat-card">
            <span>Total Vendors</span>
            <strong>{stats.vendorCount}</strong>
          </article>
          <article className="stat-card">
            <span>Pending PO</span>
            <strong>{stats.purchaseOrderPendingCount}</strong>
          </article>
          <article className="stat-card">
            <span>In Transit PO</span>
            <strong>{stats.purchaseOrderInTransitCount}</strong>
          </article>
          <article className="stat-card">
            <span>Received PO</span>
            <strong>{stats.purchaseOrderReceivedCount}</strong>
          </article>
          <article className="stat-card">
            <span>Closed PO</span>
            <strong>{stats.purchaseOrderClosedCount}</strong>
          </article>
          <article className="stat-card">
            <span>Total On Hand</span>
            <strong>{stats.totalOnHand}</strong>
          </article>
        </div>
      </section>

      <section className="module-launch-grid">
        {MODULE_TABS.filter((tab) => tab.href !== "/home").map((tab) => (
          <Link key={tab.key} href={tab.href} className="module-card panel">
            <h2>{tab.label}</h2>
            <p>{tab.description}</p>
            <span>Open Module</span>
          </Link>
        ))}
      </section>
    </WmsShell>
  )
}
