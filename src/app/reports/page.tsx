import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"

export default async function ReportsPage() {
  await requireSessionOrRedirect()
  return (
    <WmsShell title="Reports">
      <section className="panel panel-elevated">
        <div className="panel-title">Reports</div>
        <p className="status-note">Reports module scaffold is ready for next phase.</p>
      </section>
    </WmsShell>
  )
}
