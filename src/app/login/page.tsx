"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { BrandBackground } from "@/components/brand-background"
import { ArrowRight } from "lucide-react"

const TP = {
  orange: "#eb5d1c",
  bg: "#16151a",
  card: "#242220",
  border: "#38352f",
  text: "#f0ece6",
  textSec: "#9a948d",
  fontBody: "var(--font-body, 'IBM Plex Sans', sans-serif)",
  fontHeading: "var(--font-heading, 'Alata', sans-serif)",
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session) {
      setError("Nieprawidłowy email lub hasło.")
      setLoading(false)
      return
    }

    // Odczyt roli JAWNYM tokenem ze świeżej sesji. createBrowserClient (@supabase/ssr)
    // tuż po signIn potrafi nie dołączyć jeszcze tokena do zapytania (wyścig) —
    // wtedy rola wraca null i admin ląduje na /dashboard. Jawny Bearer to eliminuje.
    let role: string | null = null
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=role&id=eq.${data.user.id}`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${data.session.access_token}`,
          },
        },
      )
      const rows = await res.json()
      role = Array.isArray(rows) && rows[0] ? rows[0].role : null
    } catch { /* przy błędzie sieci wpadnie do panelu klienta — bezpieczny domyślny */ }

    window.location.assign(role === "admin" ? "/admin/clients" : "/dashboard")
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 16px",
    borderRadius: "10px",
    border: `1.5px solid ${TP.border}`,
    fontFamily: TP.fontBody,
    fontSize: "15px",
    color: TP.text,
    background: "#1c1b1f",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  }
  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: TP.fontBody, fontSize: "13px",
    fontWeight: 600, color: TP.text, marginBottom: "8px", letterSpacing: "0.02em",
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: TP.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative",
    }}>
      <BrandBackground />

      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img src="/logo-twistedpixel.png" alt="Twisted Pixel" style={{ height: "64px", width: "auto" }} />
          <div style={{
            fontFamily: TP.fontBody, fontSize: "13px", color: TP.textSec,
            letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500, marginTop: "10px",
          }}>
            Panel wyników kampanii
          </div>
        </div>

        {/* Karta logowania */}
        <div style={{
          background: TP.card,
          borderRadius: "16px",
          border: `1px solid ${TP.border}`,
          boxShadow: "0 10px 32px rgba(0,0,0,0.45)",
          padding: "40px 36px",
        }}>
          <h1 style={{ fontFamily: TP.fontHeading, fontSize: "22px", fontWeight: 400, color: TP.text, margin: "0 0 28px 0" }}>
            Zaloguj się
          </h1>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "18px" }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="twoj@email.pl" required style={inputStyle}
                onFocus={e => e.target.style.borderColor = TP.orange}
                onBlur={e => e.target.style.borderColor = TP.border}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Hasło</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required style={inputStyle}
                onFocus={e => e.target.style.borderColor = TP.orange}
                onBlur={e => e.target.style.borderColor = TP.border}
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(235,93,28,0.10)", border: "1px solid rgba(235,93,28,0.35)",
                borderRadius: "8px", padding: "10px 14px", marginBottom: "20px",
                fontFamily: TP.fontBody, fontSize: "14px", color: "#f6b090",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: "100%", padding: "14px 24px", borderRadius: "10px", border: "none",
                background: loading ? TP.border : "#0e0d11",
                color: TP.text, fontFamily: TP.fontBody, fontSize: "15px", fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s, transform 0.15s", letterSpacing: "0.01em",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = TP.orange }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#0e0d11" }}
            >
              {loading ? "Logowanie…" : <>Zaloguj się <ArrowRight size={17} /></>}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: "24px", fontFamily: TP.fontBody, fontSize: "12px", color: TP.textSec }}>
          Twisted Pixel © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
