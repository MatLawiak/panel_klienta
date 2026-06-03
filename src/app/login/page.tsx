"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase/client"

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

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f9f5f0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      {/* Logo + karta */}
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Logo obszar */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            fontFamily: "var(--font-heading, 'Alata', sans-serif)",
            fontSize: "28px",
            fontWeight: "400",
            color: "#1d1d1b",
            letterSpacing: "-0.01em",
            marginBottom: "4px",
          }}>
            Twisted<span style={{ color: "#eb5d1c" }}>Pixel</span>
          </div>
          <div style={{
            fontFamily: "var(--font-body, 'IBM Plex Sans', sans-serif)",
            fontSize: "13px",
            color: "#5d6970",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: "500",
          }}>
            Panel wyników kampanii
          </div>
        </div>

        {/* Karta logowania */}
        <div style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1.5px solid #c1c8cd",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          padding: "40px 36px",
        }}>
          <h1 style={{
            fontFamily: "var(--font-heading, 'Alata', sans-serif)",
            fontSize: "22px",
            fontWeight: "400",
            color: "#1d1d1b",
            margin: "0 0 28px 0",
          }}>
            Zaloguj się
          </h1>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{
                display: "block",
                fontFamily: "var(--font-body, 'IBM Plex Sans', sans-serif)",
                fontSize: "13px",
                fontWeight: "600",
                color: "#1d1d1b",
                marginBottom: "8px",
                letterSpacing: "0.02em",
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="twoj@email.pl"
                required
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: "10px",
                  border: "1.5px solid #c1c8cd",
                  fontFamily: "var(--font-body, 'IBM Plex Sans', sans-serif)",
                  fontSize: "15px",
                  color: "#1d1d1b",
                  background: "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "#eb5d1c"}
                onBlur={e => e.target.style.borderColor = "#c1c8cd"}
              />
            </div>

            {/* Hasło */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontFamily: "var(--font-body, 'IBM Plex Sans', sans-serif)",
                fontSize: "13px",
                fontWeight: "600",
                color: "#1d1d1b",
                marginBottom: "8px",
                letterSpacing: "0.02em",
              }}>
                Hasło
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: "10px",
                  border: "1.5px solid #c1c8cd",
                  fontFamily: "var(--font-body, 'IBM Plex Sans', sans-serif)",
                  fontSize: "15px",
                  color: "#1d1d1b",
                  background: "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "#eb5d1c"}
                onBlur={e => e.target.style.borderColor = "#c1c8cd"}
              />
            </div>

            {/* Błąd */}
            {error && (
              <div style={{
                background: "rgba(235,93,28,0.08)",
                border: "1px solid rgba(235,93,28,0.3)",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "20px",
                fontFamily: "var(--font-body, 'IBM Plex Sans', sans-serif)",
                fontSize: "14px",
                color: "#c94d14",
              }}>
                {error}
              </div>
            )}

            {/* Przycisk */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 24px",
                borderRadius: "10px",
                border: "none",
                background: loading ? "#c1c8cd" : "#1d1d1b",
                color: "#ffffff",
                fontFamily: "var(--font-body, 'IBM Plex Sans', sans-serif)",
                fontSize: "15px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s, transform 0.15s",
                letterSpacing: "0.01em",
              }}
              onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = "#eb5d1c" }}
              onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = "#1d1d1b" }}
            >
              {loading ? "Logowanie…" : "Zaloguj się →"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: "center",
          marginTop: "24px",
          fontFamily: "var(--font-body, 'IBM Plex Sans', sans-serif)",
          fontSize: "12px",
          color: "#5d6970",
        }}>
          Twisted Pixel © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
