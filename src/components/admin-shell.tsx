"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Users, RefreshCw, LogOut, PanelLeftClose, PanelLeft, type LucideIcon } from "lucide-react"

// Ciemny motyw — spójny z audyt.twistedpixel.pl
const TP = {
  orange: "#eb5d1c",
  sidebar: "#100f13",
  bg: "#16151a",
  card: "#242220",
  border: "#38352f",
  text: "#f0ece6",
  textSec: "#9a948d",
  white: "#ffffff",
  fontBody: "var(--font-body,'IBM Plex Sans',sans-serif)",
  fontHeading: "var(--font-heading,'Alata',sans-serif)",
}

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  // Kampanie i metryki zarządza się per klient — w karcie klienta (zakładki).
  { href: "/admin/clients", label: "Klienci", icon: Users },
  { href: "/admin/sync", label: "Synchronizacja", icon: RefreshCw },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.assign("/login")
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: TP.bg, fontFamily: TP.fontBody }}>

      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? "220px" : "60px",
        background: TP.sidebar,
        borderRight: `1px solid ${TP.border}`,
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
          padding: "16px 18px",
          borderBottom: `1px solid ${TP.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: "64px",
        }}>
          {sidebarOpen && (
            <img src="/logo-twistedpixel.png" alt="Twisted Pixel" style={{ height: "34px", width: "auto" }} />
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Zwiń menu" : "Rozwiń menu"}
            style={{ background: "none", border: "none", color: TP.textSec, cursor: "pointer", padding: "4px", lineHeight: 1, flexShrink: 0, display: "inline-flex" }}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 0" }}>
          {NAV.map(item => {
            const active = pathname.startsWith(item.href)
            const Icon = item.icon
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
                  color: active ? TP.orange : TP.textSec,
                  fontSize: "14px",
                  fontWeight: active ? 600 : 400,
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}>
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  {sidebarOpen && item.label}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Wyloguj */}
        <div style={{ padding: "12px 8px", borderTop: `1px solid ${TP.border}` }}>
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
              color: TP.textSec,
              fontSize: "14px",
              cursor: "pointer",
              fontFamily: TP.fontBody,
              whiteSpace: "nowrap",
              textAlign: "left",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = TP.text)}
            onMouseLeave={e => (e.currentTarget.style.color = TP.textSec)}
          >
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && "Wyloguj"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          background: TP.card,
          borderBottom: `1px solid ${TP.border}`,
          padding: "0 32px",
          height: "64px",
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
            color: TP.text,
            margin: 0,
          }}>
            {NAV.find(n => pathname.startsWith(n.href))?.label ?? "Panel admina"}
          </h1>
          <span style={{ fontSize: "12px", color: TP.textSec }}>
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
