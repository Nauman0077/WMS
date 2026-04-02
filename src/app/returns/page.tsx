import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"

export default async function ReturnsPage() {
  await requireSessionOrRedirect()
  return (
    <WmsShell title="Returns">
      <section className="panel panel-elevated">
        <div className="panel-title">Returns</div>
        <p className="status-note">Returns module scaffold is ready for next phase.</p>
      </section>
    </WmsShell>
  )
}
