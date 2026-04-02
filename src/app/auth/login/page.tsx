"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [usernameOrEmail, setUsernameOrEmail] = useState("admin")
  const [password, setPassword] = useState("admin")
  const [errorText, setErrorText] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorText("")
    setLoading(true)

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ usernameOrEmail, password }),
    })

    const data = await response.json()
    if (!response.ok) {
      setErrorText(data.message ?? "Unable to login.")
      setLoading(false)
      return
    }

    router.push("/home")
    router.refresh()
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <p className="auth-kicker">NOBLTRAVEL WMS</p>
        <h1>Control Center Login</h1>
        <p className="auth-help">Sign in to manage SKUs, vendors, and purchase orders.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Username or Email
            <input
              className="input"
              value={usernameOrEmail}
              onChange={(event) => setUsernameOrEmail(event.target.value)}
              placeholder="admin"
            />
          </label>
          <label>
            Password
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="admin"
            />
          </label>

          {errorText ? <p className="error-text">{errorText}</p> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>

        <p className="auth-footnote">Default account for now: admin / admin</p>
      </section>
    </main>
  )
}
