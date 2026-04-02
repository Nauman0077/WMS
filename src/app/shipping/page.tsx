import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"

export default async function ShippingPage() {
  await requireSessionOrRedirect()
  return (
    <WmsShell title="Shipping">
      <section className="panel panel-elevated">
        <div className="panel-title">Shipping</div>
        <p className="status-note">Shipping operations scaffold is ready for next phase.</p>
      </section>
    </WmsShell>
  )
}
