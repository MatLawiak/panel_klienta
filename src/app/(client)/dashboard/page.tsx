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
}

type Month = { key: string; label: string; since: string; until: string }

// Ciemny motyw — spójny z audyt.twistedpixel.pl
const TP = {
  orange: "#eb5d1c",
  peach: "#f6b090",
  green: "#209b84",
  yellow: "#f9e064",
  bg: "#16151a",
  topbar: "#100f13",
  card: "#242220",
  border: "#38352f",
  text: "#f0ece6",
  textSec: "#9a948d",
  white: "#ffffff",
  fontBody: "var(--font-body, 'IBM Plex Sans', sans-serif)",
  fontHeading: "var(--font-heading, 'Alata', sans-serif)",
}

const MONTH_NAMES = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"]
const pad = (n: number) => String(n).padStart(2, "0")

// Ostatnie 3 miesiące (bieżący + 2 wstecz), liczone po stronie przeglądarki.
function lastThreeMonths(now: Date): Month[] {
  const out: Month[] = []
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear(), m = d.getMonth()
    const lastDay = new Date(y, m + 1, 0).getDate()
    out.push({
      key: `${y}-${pad(m + 1)}`,
      label: MONTH_NAMES[m],
      since: `${y}-${pad(m + 1)}-01`,
      until: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
    })
  }
  return out
}

export default function DashboardPage() {
  const { profile } = useUser()
  const [clientName, setClientName] = useState<string | null>(null)
  const [rows, setRows] = useState<CampaignKpi[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [months, setMonths] = useState<Month[]>([])
  const [selected, setSelected] = useState<string>("")

  // Miesiące liczymy po mount (uniknięcie hydration mismatch ze statycznego eksportu)
  useEffect(() => {
    const m = lastThreeMonths(new Date())
    setMonths(m)
    setSelected(m[0].key)
  }, [])

  useEffect(() => {
    if (!profile || !selected || !months.length) return
    const month = months.find(m => m.key === selected)
    if (!month) return
    setLoading(true)
    ;(async () => {
      const { data: clients } = await supabase
        .from("clients").select("id, name").limit(1)
      if (!clients?.[0]) { setLoading(false); return }
      setClientName(clients[0].name)

      const { data: camps } = await supabase
        .from("campaigns")
        .select("id, name, source, is_lead_gen")
        .eq("visible", true)

      const list = camps ?? []
      if (!list.length) { setRows([]); setLoading(false); return }

      const { data: metrics } = await supabase
        .from("campaign_metrics_daily")
        .select("campaign_id, spend, clicks, conversions")
        .gte("date", month.since)
        .lte("date", month.until)
        .in("campaign_id", list.map(c => c.id))

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
            id: c.id, name: c.name,
            source: (c as any).source ?? "meta",
            is_lead_gen: (c as any).is_lead_gen ?? false,
            conversions: a.conversions, spend: a.spend, clicks: a.clicks,
          }
        })
        .sort((x, y) => y.spend - x.spend)

      setRows(result)
      setLoading(false)
    })()
  }, [profile, selected, months])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.assign("/login")
  }

  const fmt = (n: number) => new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n)
  const costPerConv = (c: CampaignKpi) => (c.conversions > 0 ? fmt(c.spend / c.conversions) : "—")
  const selectedLabel = months.find(m => m.key === selected)?.label ?? ""

  return (
    <div style={{ minHeight: "100vh", background: TP.bg, fontFamily: TP.fontBody, position: "relative" }}>
      <BrandBackground />

      {/* Topbar */}
      <header style={{
        background: TP.topbar,
        borderBottom: `1px solid ${TP.border}`,
        padding: "0 32px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}>
        <img src="/logo-twistedpixel.png" alt="Twisted Pixel" style={{ height: "40px", width: "auto" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "13px", color: TP.textSec }}>{profile?.email}</span>
          <button
            onClick={handleLogout}
            style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              background: "transparent", border: `1px solid ${TP.border}`,
              borderRadius: "8px", color: TP.textSec, padding: "6px 14px",
              fontSize: "13px", cursor: "pointer", fontFamily: TP.fontBody, transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = TP.orange; e.currentTarget.style.color = TP.orange }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = TP.border; e.currentTarget.style.color = TP.textSec }}
          >
            <LogOut size={15} /> Wyloguj
          </button>
        </div>
      </header>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px", position: "relative", zIndex: 1 }}>

        {/* Nagłówek + wybór miesiąca */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "32px" }}>
          <div>
            {loading && !clientName ? (
              <div style={{ height: "36px", width: "280px", background: TP.card, borderRadius: "8px", animation: "pulse 1.5s ease infinite" }} />
            ) : (
              <h1 style={{ fontFamily: TP.fontHeading, fontSize: "32px", color: TP.text, margin: 0, fontWeight: 400 }}>
                {clientName ?? "Panel klienta"}
              </h1>
            )}
            <p style={{ fontSize: "14px", color: TP.textSec, marginTop: "6px", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>
              Wyniki kampanii · {selectedLabel}
            </p>
          </div>

          {/* Pigułki miesięcy */}
          <div style={{ display: "flex", gap: "6px", background: TP.card, border: `1px solid ${TP.border}`, borderRadius: "12px", padding: "5px" }}>
            {months.map(m => {
              const active = m.key === selected
              return (
                <button key={m.key} onClick={() => setSelected(m.key)} style={{
                  background: active ? TP.orange : "transparent",
                  color: active ? TP.white : TP.textSec,
                  border: "none", borderRadius: "8px", padding: "8px 18px",
                  fontSize: "13px", fontWeight: active ? 600 : 500, cursor: "pointer",
                  fontFamily: TP.fontBody, transition: "all 0.15s",
                }}>
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Wyniki — OSOBNO dla każdej kampanii */}
        <div style={{ display: "grid", gap: "20px", marginBottom: "40px" }}>
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} style={{ height: "160px", background: TP.card, borderRadius: "14px", animation: "pulse 1.5s ease infinite" }} />
            ))
          ) : rows && rows.length ? (
            rows.map((c, idx) => (
              <section key={c.id} className="tp-fade-up" style={{
                background: TP.card,
                borderRadius: "14px",
                border: `1px solid ${TP.border}`,
                boxShadow: "0 4px 16px rgba(0,0,0,0.30)",
                overflow: "hidden",
                animationDelay: `${idx * 60}ms`,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "18px 24px", borderBottom: `1px solid ${TP.border}`,
                  background: "rgba(235,93,28,0.05)",
                }}>
                  <CircleDot size={15} color={TP.green} style={{ flexShrink: 0 }} />
                  <h2 style={{ margin: 0, fontFamily: TP.fontHeading, fontSize: "19px", fontWeight: 400, color: TP.text }}>
                    {c.name}
                  </h2>
                  {c.is_lead_gen && (
                    <span style={{
                      fontSize: "11px", fontWeight: 600, color: TP.orange,
                      background: "rgba(235,93,28,0.12)", borderRadius: "6px", padding: "3px 9px",
                      textTransform: "uppercase", letterSpacing: "0.04em",
                    }}>
                      Lead Ads
                    </span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1px", background: TP.border }}>
                  <Metric icon={<Target size={14} />}            label="Konwersje"          value={String(c.conversions)} accent={TP.orange} />
                  <Metric icon={<Coins size={14} />}             label="Koszt za konwersję" value={costPerConv(c)}        accent={TP.green} />
                  <Metric icon={<MousePointerClick size={14} />} label="Kliknięcia"         value={c.clicks.toLocaleString("pl-PL")} accent={TP.peach} />
                  <Metric icon={<Wallet size={14} />}            label="Wydatki"            value={fmt(c.spend)}          accent={TP.yellow} />
                </div>
              </section>
            ))
          ) : (
            <div style={{
              background: TP.card, borderRadius: "14px", border: `1px dashed ${TP.border}`,
              textAlign: "center", padding: "48px", color: TP.textSec, fontSize: "15px",
            }}>
              Brak danych za {selectedLabel.toLowerCase()}. Wybierz inny miesiąc lub skontaktuj się z agencją.
            </div>
          )}
        </div>

        {/* Info bar */}
        <div style={{
          background: TP.card, borderRadius: "12px", border: `1px solid ${TP.border}`,
          padding: "18px 22px", display: "flex", alignItems: "center", gap: "12px",
          fontSize: "14px", color: TP.textSec,
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
    <div style={{ background: TP.card, padding: "20px 24px", borderTop: `3px solid ${accent}` }}>
      <p style={{
        display: "flex", alignItems: "center", gap: "7px",
        margin: "0 0 8px 0", fontSize: "11px", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.08em",
        color: TP.textSec, fontFamily: TP.fontBody,
      }}>
        <span style={{ color: accent, display: "inline-flex" }}>{icon}</span>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: "26px", fontWeight: 600, color: TP.text, fontFamily: TP.fontBody, lineHeight: 1.1 }}>
        {value}
      </p>
    </div>
  )
}
