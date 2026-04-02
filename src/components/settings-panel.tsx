"use client"

import { useThemeMode } from "@/components/theme-provider"

export function SettingsPanel() {
  const { mode, setMode, toggle } = useThemeMode()

  return (
    <section className="panel panel-elevated">
      <div className="panel-title">My Account Settings</div>
      <div className="vendor-form-grid">
        <div className="field-stack">
          <label>Theme Mode</label>
          <select className="input" value={mode} onChange={(event) => setMode(event.target.value as "light" | "dark")}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="field-stack">
          <label>Quick Toggle</label>
          <button className="secondary-button" type="button" onClick={toggle}>
            Switch to {mode === "light" ? "Dark" : "Light"}
          </button>
        </div>
        <div className="field-stack field-span-2">
          <label>Profile</label>
          <textarea
            className="note-area slim"
            value="Account: admin\nWorkspace: SF - nobltravel\nThese are visual settings only."
            readOnly
          />
        </div>
      </div>
    </section>
  )
}
