import { SettingsPanel } from "@/components/settings-panel"
import { WmsShell } from "@/components/wms-shell"
import { requireSessionOrRedirect } from "@/lib/auth-session"

export default async function SettingsPage() {
  await requireSessionOrRedirect()

  return (
    <WmsShell title="Settings">
      <SettingsPanel />
    </WmsShell>
  )
}
