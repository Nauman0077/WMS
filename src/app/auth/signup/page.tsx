import Link from "next/link"

export default function SignupPage() {
  return (
    <main className="auth-screen">
      <section className="auth-card">
        <p className="auth-kicker">SIGNUP DISABLED</p>
        <h1>Account Creation Is Restricted</h1>
        <p className="auth-help">
          This environment currently uses a single admin account. User self-signup can be enabled later.
        </p>
        <Link className="primary-link" href="/auth/login">
          Back to Login
        </Link>
      </section>
    </main>
  )
}
