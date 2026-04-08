"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ReactNode, useEffect, useRef, useState } from "react"

interface WmsShellProps {
  title: string
  children: ReactNode
  actions?: ReactNode
}

const TOP_LINKS = [
  { key: "home", label: "Home", href: "/home" },
  { key: "orders", label: "Orders", href: "/orders" },
  { key: "returns", label: "Returns", href: "/returns" },
  { key: "inventory", label: "Inventory", href: "/products" },
  { key: "locations", label: "Locations", href: "/locations" },
  { key: "purchase-orders", label: "Purchase Orders", href: "/purchase-orders" },
  { key: "reports", label: "Reports", href: "/reports" },
  { key: "shipping", label: "Shipping", href: "/shipping" },
]

export function WmsShell({ title, children, actions }: WmsShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current) {
        return
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    function handleScroll() {
      setMenuOpen(false)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <div className="wms-root">
      <header className="wms-topbar">
        <div className="brand-cluster">
          <p className="brand-kicker">SHIPHERO STYLE OPS</p>
          <div className="brand">Nobltravel WMS</div>
        </div>

        <nav className="top-nav">
          <div className="top-nav-row">
            <ul className="top-nav-list">
              {TOP_LINKS.map((link) => (
                <li key={link.key}>
                  <Link className={pathname?.startsWith(link.href) ? "nav-item active" : "nav-item"} href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div ref={menuRef} className="account-menu-wrap account-nav-item">
              <button className={menuOpen ? "nav-item active" : "nav-item"} type="button" onClick={() => setMenuOpen((v) => !v)}>
                My Account
              </button>
              {menuOpen ? (
                <div className="account-menu panel">
                  <Link href="/settings" className="account-menu-item" onClick={() => setMenuOpen(false)}>
                    Settings
                  </Link>
                  <button
                    className="account-menu-item"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      void handleLogout()
                    }}
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </nav>

        <div className="topbar-meta">
          <div className="sync-pill">
            <span className="sync-dot" />
            LIVE
          </div>
          <div className="warehouse-chip">SF - nobltravel</div>
        </div>
      </header>

      <div className="wms-toolbar">
        <div className="toolbar-title-wrap">
          <p className="toolbar-eyebrow">Warehouse Control Surface</p>
          <h1>{title}</h1>
        </div>
        <div className="toolbar-actions">{actions}</div>
      </div>

      <main className="wms-content">{children}</main>
    </div>
  )
}
