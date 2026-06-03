"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

const TP = {
  orange: "#eb5d1c",
  dark: "#1d1d1b",
  dark2: "#2e2e2c",
  cream: "#f9f5f0",
  white: "#ffffff",
  gray: "#5d6970",
  border: "#c1c8cd",
  fontBody: "var(--font-body,'IBM Plex Sans',sans-serif)",
  fontHeading: "var(--font-heading,'Alata',sans-serif)",
}

const NAV = [
  // Kampanie i metryki zarządza się per klient — w karcie klienta (zakładki).
  { href: "/admin/clients", label: "Klienci", icon: "◈" },
  { href: "/admin/sync", label: "Synchronizacja", icon: "⟳" },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.assign("/login")
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: TP.cream, fontFamily: TP.fontBody }}>

      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? "220px" : "60px",
        background: TP.dark,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        transition: "width 0.2s ease",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{
          padding: "20px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: "60px",
        }}>
          {sidebarOpen && (
            <span style={{ fontFamily: TP.fontHeading, fontSize: "18px", color: TP.white, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
              Twisted<span style={{ color: TP.orange }}>Pixel</span>
            </span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "16px", padding: "4px", lineHeight: 1, flexShrink: 0 }}
          >
            {sidebarOpen ? "‹" : "›"}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 0" }}>
          {NAV.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 18px",
                  margin: "2px 8px",
                  borderRadius: "8px",
                  background: active ? "rgba(235,93,28,0.15)" : "transparent",
                  color: active ? TP.orange : "rgba(255,255,255,0.6)",
                  fontSize: "14px",
                  fontWeight: active ? 600 : 400,
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}>
                  <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
                  {sidebarOpen && item.label}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Wyloguj */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 18px",
              borderRadius: "8px",
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              fontSize: "14px",
              cursor: "pointer",
              fontFamily: TP.fontBody,
              whiteSpace: "nowrap",
              textAlign: "left",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            <span style={{ fontSize: "16px", flexShrink: 0 }}>→</span>
            {sidebarOpen && "Wyloguj"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          background: TP.white,
          borderBottom: `1px solid ${TP.border}`,
          padding: "0 32px",
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
          <h1 style={{
            fontFamily: TP.fontHeading,
            fontSize: "18px",
            fontWeight: 400,
            color: TP.dark,
            margin: 0,
          }}>
            {NAV.find(n => pathname.startsWith(n.href))?.label ?? "Panel admina"}
          </h1>
          <span style={{ fontSize: "12px", color: TP.gray }}>
            Admin
          </span>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: "32px" }}>
          {children}
        </main>
      </div>
    </div>
  )
}
