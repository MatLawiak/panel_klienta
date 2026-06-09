"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { AdminShell } from "@/components/admin-shell"
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react"

const TP = {
  orange: "#eb5d1c",
  card: "#242220",
  cardAlt: "#1f1d1b",
  border: "#38352f",
  text: "#f0ece6",
  textSec: "#9a948d",
  green: "#209b84",
  fontBody: "var(--font-body,'IBM Plex Sans',sans-serif)",
  fontHeading: "var(--font-heading,'Alata',sans-serif)",
}

type Job = {
  id: string
  source: string
  status: string
  rows_synced: number
  error_message: string | null
  finished_at: string | null
  started_at: string
  clients: { name: string } | null
}

export default function SyncPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase
      .from("sync_jobs")
      .select("*, clients(name)")
      .order("started_at", { ascending: false })
      .limit(50)
    setJobs((data as Job[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" }) : "—"

  return (
    <AdminShell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <h2 style={{ fontFamily: TP.fontHeading, fontSize: "26px", fontWeight: 400, color: TP.text, margin: 0 }}>
            Synchronizacja
          </h2>
          <p style={{ fontSize: "13px", color: TP.textSec, margin: "4px 0 0" }}>
            Historia automatycznych synchronizacji danych z API (n8n)
          </p>
        </div>
        <button onClick={() => { setLoading(true); load() }} style={{
          background: "transparent", border: `1px solid ${TP.border}`, borderRadius: "8px",
          padding: "9px 18px", fontSize: "13px", fontWeight: 500, color: TP.text,
          cursor: "pointer", fontFamily: TP.fontBody,
          display: "inline-flex", alignItems: "center", gap: "7px",
        }}>
          <RefreshCw size={14} /> Odśwież
        </button>
      </div>

      {loading ? (
        <p style={{ color: TP.textSec, fontFamily: TP.fontBody }}>Ładowanie…</p>
      ) : jobs.length === 0 ? (
        <div style={{ background: TP.card, border: `1px dashed ${TP.border}`, borderRadius: "12px", padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontSize: "15px", fontWeight: 600, color: TP.text, margin: "0 0 6px" }}>Brak synchronizacji</p>
          <p style={{ fontSize: "13px", color: TP.textSec, margin: 0 }}>
            Gdy workflow n8n uruchomi się po raz pierwszy, pojawią się tutaj wpisy.
          </p>
        </div>
      ) : (
        <div style={{ background: TP.card, border: `1px solid ${TP.border}`, borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", fontFamily: TP.fontBody }}>
            <thead>
              <tr style={{ background: TP.cardAlt, textAlign: "left" }}>
                {["Klient", "Źródło", "Status", "Wiersze", "Zakończono"].map(h => (
                  <th key={h} style={{ padding: "12px 18px", fontWeight: 600, color: TP.textSec, fontSize: "12px", letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((j, i) => (
                <tr key={j.id} style={{ borderTop: `1px solid ${TP.border}`, background: i % 2 ? TP.card : TP.cardAlt }}>
                  <td style={{ padding: "12px 18px", color: TP.text, fontWeight: 500 }}>{j.clients?.name ?? "—"}</td>
                  <td style={{ padding: "12px 18px", color: TP.textSec, textTransform: "uppercase", fontSize: "12px" }}>{j.source}</td>
                  <td style={{ padding: "12px 18px" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                      background: j.status === "success" ? "rgba(32,155,132,0.12)" : "rgba(235,93,28,0.12)",
                      color: j.status === "success" ? TP.green : "#f6b090",
                    }}>
                      {j.status === "success" ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {j.status === "success" ? "OK" : "Błąd"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 18px", color: TP.text }}>{j.rows_synced}</td>
                  <td style={{ padding: "12px 18px", color: TP.textSec }}>{fmtDate(j.finished_at ?? j.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  )
}
