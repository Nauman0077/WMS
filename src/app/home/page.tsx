import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"
import { getDashboardStats } from "@/lib/wms-repository"

function percent(value: number, max: number): number {
  if (max <= 0) {
    return 0
  }
  return Math.max(8, Math.round((value / max) * 100))
}

export default async function HomePage() {
  await requireSessionOrRedirect()
  const stats = await getDashboardStats()

  const monthlyMax = Math.max(...stats.monthlySalesTrend.map((entry) => entry.value), 1)
  const dailyMax = Math.max(...stats.dailyOrderVolume.map((entry) => entry.value), 1)
  const orderStatusMax = Math.max(...stats.orderStatusBreakdown.map((entry) => entry.value), 1)
  const poStatusMax = Math.max(...stats.purchaseOrderStatusBreakdown.map((entry) => entry.value), 1)

  return (
    <WmsShell title="Home">
      <div className="ops-dashboard">
        <section className="panel panel-elevated home-hero-panel">
          <div className="panel-title">Mission Control</div>
          <div className="hero-metrics-grid">
            <article className="hero-metric-card pulse-card">
              <span>Unfulfilled Orders</span>
              <strong>{stats.unfulfilledOrderCount}</strong>
              <small>{stats.monthlyOrderCount} orders created this month</small>
            </article>
            <article className="hero-metric-card">
              <span>PO In Transit</span>
              <strong>{stats.purchaseOrderInTransitCount}</strong>
              <small>{stats.purchaseOrderPendingCount} still pending</small>
            </article>
            <article className="hero-metric-card">
              <span>Active SKUs</span>
              <strong>{stats.activeSkuCount}</strong>
              <small>{stats.skuCount} total in catalog</small>
            </article>
            <article className="hero-metric-card">
              <span>Sales This Month</span>
              <strong>${stats.monthlySalesAmount.toFixed(2)}</strong>
              <small>{stats.fulfilledOrderCount} fulfilled orders overall</small>
            </article>
            <article className="hero-metric-card">
              <span>Orders Shipped Today</span>
              <strong>{stats.shippedTodayCount}</strong>
              <small>Ship flow metrics will rise as shipping is implemented</small>
            </article>
            <article className="hero-metric-card danger-tint">
              <span>Orders With Backorder</span>
              <strong>{stats.backorderedOrderCount}</strong>
              <small>Use this to prioritize replenishment</small>
            </article>
          </div>
        </section>

        <section className="home-analytics-grid">
          <section className="panel panel-elevated insight-card">
            <div className="panel-title">Monthly Sales Trend</div>
            <div className="chart-card-body">
              <div className="chart-card-copy">
                <strong>${stats.monthlySalesAmount.toFixed(2)}</strong>
                <p>Gross order value booked this month across current orders.</p>
              </div>
              <div className="bar-chart monthly-sales-chart">
                {stats.monthlySalesTrend.map((entry, index) => (
                  <div key={entry.label} className="bar-column">
                    <div
                      className="bar-fill accent-fill"
                      style={{ height: `${percent(entry.value, monthlyMax)}%`, animationDelay: `${index * 80}ms` }}
                    />
                    <span>{entry.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel panel-elevated insight-card">
            <div className="panel-title">7-Day Order Volume</div>
            <div className="chart-card-body">
              <div className="chart-card-copy">
                <strong>{stats.dailyOrderVolume.reduce((sum, entry) => sum + entry.value, 0)}</strong>
                <p>Orders created during the last seven days.</p>
              </div>
              <div className="bar-chart compact-chart">
                {stats.dailyOrderVolume.map((entry, index) => (
                  <div key={entry.label} className="bar-column">
                    <div
                      className="bar-fill emerald-fill"
                      style={{ height: `${percent(entry.value, dailyMax)}%`, animationDelay: `${index * 90}ms` }}
                    />
                    <span>{entry.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>

        <section className="home-analytics-grid">
          <section className="panel panel-elevated insight-card">
            <div className="panel-title">Order Status Mix</div>
            <div className="status-stack">
              {stats.orderStatusBreakdown.length === 0 ? (
                <p className="status-note">No orders yet.</p>
              ) : (
                stats.orderStatusBreakdown.map((entry, index) => (
                  <div key={entry.label} className="status-row" style={{ animationDelay: `${index * 70}ms` }}>
                    <div>
                      <strong>{entry.label}</strong>
                      <span>{entry.value} orders</span>
                    </div>
                    <div className="status-meter">
                      <div className="status-meter-fill accent-fill" style={{ width: `${percent(entry.value, orderStatusMax)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel panel-elevated insight-card">
            <div className="panel-title">Purchase Order Pipeline</div>
            <div className="status-stack">
              {stats.purchaseOrderStatusBreakdown.map((entry, index) => (
                <div key={entry.label} className="status-row" style={{ animationDelay: `${index * 70}ms` }}>
                  <div>
                    <strong>{entry.label}</strong>
                    <span>{entry.value} POs</span>
                  </div>
                  <div className="status-meter">
                    <div className="status-meter-fill emerald-fill" style={{ width: `${percent(entry.value, poStatusMax)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="home-analytics-grid">
          <section className="panel panel-elevated spotlight-card">
            <div className="panel-title">Ops Spotlight</div>
            <div className="spotlight-grid">
              <article>
                <span>Total On Hand</span>
                <strong>{stats.totalOnHand}</strong>
              </article>
              <article>
                <span>Vendors Online</span>
                <strong>{stats.vendorCount}</strong>
              </article>
              <article>
                <span>Received PO</span>
                <strong>{stats.purchaseOrderReceivedCount}</strong>
              </article>
              <article>
                <span>Closed PO</span>
                <strong>{stats.purchaseOrderClosedCount}</strong>
              </article>
            </div>
          </section>

          <section className="panel panel-elevated spotlight-card">
            <div className="panel-title">Pulse Summary</div>
            <div className="pulse-summary-list">
              <div>
                <span>Demand pressure</span>
                <strong>{stats.backorderedOrderCount > 0 ? "Elevated" : "Stable"}</strong>
              </div>
              <div>
                <span>Fulfillment readiness</span>
                <strong>{stats.unfulfilledOrderCount > 0 ? "Active queue" : "Clear"}</strong>
              </div>
              <div>
                <span>Sales pace</span>
                <strong>{stats.monthlySalesAmount > 0 ? "Growing" : "Quiet"}</strong>
              </div>
            </div>
          </section>
        </section>
      </div>
    </WmsShell>
  )
}
