"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useUser } from "@/hooks/use-user"
import { BrandBackground } from "@/components/brand-background"
import { Target, Coins, MousePointerClick, Wallet, LogOut, Info, CircleDot } from "lucide-react"

type CampaignKpi = {
  id: string
  name: string
  source: string
  is_lead_gen: boolean
  conversions: number
  spend: number
  clicks: number
  cpc: number
}

const TP = {
  orange: "#eb5d1c",
  dark: "#1d1d1b",
  cream: "#f9f5f0",
  white: "#ffffff",
  gray: "#5d6970",
  border: "#c1c8cd",
  borderWarm: "#e8e2da",
  green: "#209b84",
  fontBody: "var(--font-body, 'IBM Plex Sans', sans-serif)",
  fontHeading: "var(--font-heading, 'Alata', sans-serif)",
}

export default function DashboardPage() {
  const { profile } = useUser()
  const [clientName, setClientName] = useState<string | null>(null)
  const [rows, setRows] = useState<CampaignKpi[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const { data: clients } = await supabase
        .from("clients").select("id, name").limit(1)

      if (!clients?.[0]) { setLoading(false); return }
      setClientName(clients[0].name)

      // Tylko kampanie widoczne dla klienta (RLS ogranicza do jego klienta)
      const { data: camps } = await supabase
        .from("campaigns")
        .select("id, name, source, is_lead_gen")
        .eq("visible", true)

      const list = camps ?? []
      if (!list.length) { setRows([]); setLoading(false); return }

      const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
      const { data: metrics } = await supabase
        .from("campaign_metrics_daily")
        .select("campaign_id, spend, clicks, conversions")
        .gte("date", since)
        .in("campaign_id", list.map(c => c.id))

      // Sumowanie OSOBNO dla każdej kampanii
      const agg = new Map<string, { conversions: number; spend: number; clicks: number }>()
      for (const m of (metrics ?? []) as any[]) {
        const a = agg.get(m.campaign_id) ?? { conversions: 0, spend: 0, clicks: 0 }
        a.spend       += Number(m.spend)
        a.clicks      += m.clicks
        a.conversions += Number(m.conversions ?? 0)
        agg.set(m.campaign_id, a)
      }

      const result: CampaignKpi[] = list
        .map(c => {
          const a = agg.get(c.id) ?? { conversions: 0, spend: 0, clicks: 0 }
          return {
            id: c.id,
            name: c.name,
            source: (c as any).source ?? "meta",
            is_lead_gen: (c as any).is_lead_gen ?? false,
            conversions: a.conversions,
            spend: a.spend,
            clicks: a.clicks,
            cpc: a.clicks ? a.spend / a.clicks : 0,
          }
        })
        .sort((x, y) => y.spend - x.spend)

      setRows(result)
      setLoading(false)
    })()
  }, [profile])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.assign("/login")
  }

  const fmt = (n: number) => new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n)
  // Koszt za konwersję — pokazujemy tylko gdy są realne konwersje (unikamy absurdalnych liczb).
  const costPerConv = (c: CampaignKpi) => (c.conversions > 0 ? fmt(c.spend / c.conversions) : "—")

  return (
    <div style={{ minHeight: "100vh", background: TP.cream, fontFamily: TP.fontBody, position: "relative" }}>
      <BrandBackground />

      {/* Topbar */}
      <header style={{
        background: TP.dark,
        padding: "0 32px",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}>
        <div style={{ fontFamily: TP.fontHeading, fontSize: "20px", color: TP.white, letterSpacing: "-0.01em" }}>
          Twisted<span style={{ color: TP.orange }}>Pixel</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
            {profile?.email}
          </span>
          <button
            onClick={handleLogout}
            style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              color: "rgba(255,255,255,0.7)",
              padding: "6px 14px",
              fontSize: "13px",
              cursor: "pointer",
              fontFamily: TP.fontBody,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = TP.orange; e.currentTarget.style.color = TP.orange }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)" }}
          >
            <LogOut size={15} /> Wyloguj
          </button>
        </div>
      </header>

      {/* Główna treść */}
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px", position: "relative", zIndex: 1 }}>

        {/* Nagłówek */}
        <div style={{ marginBottom: "36px" }}>
          {loading ? (
            <div style={{ height: "36px", width: "280px", background: "#e0dbd4", borderRadius: "8px", animation: "pulse 1.5s ease infinite" }} />
          ) : (
            <h1 style={{ fontFamily: TP.fontHeading, fontSize: "32px", color: TP.dark, margin: 0, fontWeight: 400 }}>
              {clientName ?? "Panel klienta"}
            </h1>
          )}
          <p style={{ fontSize: "14px", color: TP.gray, marginTop: "6px", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>
            Wyniki kampanii · ostatnie 30 dni
          </p>
        </div>

        {/* Wyniki — OSOBNO dla każdej kampanii */}
        <div style={{ display: "grid", gap: "20px", marginBottom: "40px" }}>
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} style={{ height: "160px", background: "#e0dbd4", borderRadius: "14px", animation: "pulse 1.5s ease infinite" }} />
            ))
          ) : rows && rows.length ? (
            rows.map((c, idx) => (
              <section key={c.id} className="tp-fade-up" style={{
                background: TP.white,
                borderRadius: "14px",
                border: `1.5px solid ${TP.borderWarm}`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                overflow: "hidden",
                animationDelay: `${idx * 60}ms`,
              }}>
                {/* Nazwa kampanii */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "18px 24px", borderBottom: `1px solid ${TP.borderWarm}`,
                  background: "rgba(235,93,28,0.03)",
                }}>
                  <CircleDot size={15} color={TP.green} style={{ flexShrink: 0 }} />
                  <h2 style={{ margin: 0, fontFamily: TP.fontHeading, fontSize: "19px", fontWeight: 400, color: TP.dark }}>
                    {c.name}
                  </h2>
                  {c.is_lead_gen && (
                    <span className="tp-badge-orange" style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Lead Ads
                    </span>
                  )}
                </div>

                {/* Metryki tej kampanii */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1px", background: TP.borderWarm }}>
                  <Metric icon={<Target size={14} />}            label="Konwersje"          value={String(c.conversions)} accent={TP.orange} />
                  <Metric icon={<Coins size={14} />}             label="Koszt za konwersję" value={costPerConv(c)}        accent={TP.green} />
                  <Metric icon={<MousePointerClick size={14} />} label="Kliknięcia"         value={c.clicks.toLocaleString("pl-PL")} accent={TP.gray} />
                  <Metric icon={<Wallet size={14} />}            label="Wydatki"            value={fmt(c.spend)}          accent={TP.dark} />
                </div>
              </section>
            ))
          ) : (
            <div style={{
              background: TP.white, borderRadius: "14px", border: `1.5px solid ${TP.borderWarm}`,
              textAlign: "center", padding: "48px", color: TP.gray, fontSize: "15px",
            }}>
              Brak danych. Skontaktuj się z agencją.
            </div>
          )}
        </div>

        {/* Info bar */}
        <div style={{
          background: TP.white,
          borderRadius: "12px",
          border: `1.5px solid ${TP.borderWarm}`,
          padding: "18px 22px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "14px",
          color: TP.gray,
        }}>
          <Info size={18} color={TP.green} style={{ flexShrink: 0 }} />
          <span>
            Dane aktualizowane automatycznie każdej nocy. W razie pytań napisz na{" "}
            <a href="mailto:hello@twistedpixel.pl" style={{ color: TP.orange, fontWeight: 600, textDecoration: "none" }}>
              hello@twistedpixel.pl
            </a>
          </span>
        </div>
      </main>
    </div>
  )
}

function Metric({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div style={{ background: TP.white, padding: "20px 24px", borderTop: `3px solid ${accent}` }}>
      <p style={{
        display: "flex", alignItems: "center", gap: "7px",
        margin: "0 0 8px 0",
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: TP.gray,
        fontFamily: TP.fontBody,
      }}>
        <span style={{ color: accent, display: "inline-flex" }}>{icon}</span>
        {label}
      </p>
      <p style={{
        margin: 0,
        fontSize: "26px",
        fontWeight: 600,
        color: TP.dark,
        fontFamily: TP.fontBody,
        lineHeight: 1.1,
      }}>
        {value}
      </p>
    </div>
  )
}
