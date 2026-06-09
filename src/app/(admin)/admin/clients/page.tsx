"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { AdminShell } from "@/components/admin-shell"
import { Plus, Trash2 } from "lucide-react"
import type { Client } from "@/lib/supabase/types"

const TP = {
  orange: "#eb5d1c",
  orangeDark: "#c94d14",
  card: "#242220",
  inputBg: "#1c1b1f",
  border: "#38352f",
  text: "#f0ece6",
  textSec: "#9a948d",
  green: "#209b84",
  white: "#ffffff",
  fontBody: "var(--font-body,'IBM Plex Sans',sans-serif)",
  fontHeading: "var(--font-heading,'Alata',sans-serif)",
}

type NewClient = {
  name: string
  slug: string
  business_profile: string
  google_ads_customer_id: string
  meta_ad_account_id: string
  ga4_property_id: string
}

const EMPTY: NewClient = { name: "", slug: "", business_profile: "", google_ads_customer_id: "", meta_ad_account_id: "", ga4_property_id: "" }

export default function AdminClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"add" | "edit" | null>(null)
  const [selected, setSelected] = useState<Client | null>(null)
  const [form, setForm] = useState<NewClient>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchClients() {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false })
    setClients((data as Client[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchClients() }, [])

  function openAdd() {
    setForm(EMPTY)
    setError(null)
    setModal("add")
  }

  function openEdit(client: Client) {
    setSelected(client)
    setForm({
      name: client.name,
      slug: client.slug,
      business_profile: client.business_profile ?? "",
      google_ads_customer_id: client.google_ads_customer_id ?? "",
      meta_ad_account_id: client.meta_ad_account_id ?? "",
      ga4_property_id: client.ga4_property_id ?? "",
    })
    setError(null)
    setModal("edit")
  }

  function genSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Nazwa klienta jest wymagana."); return }
    setSaving(true)
    setError(null)

    const payload = {
      ...form,
      slug: form.slug || genSlug(form.name),
      name: form.name.trim(),
    }

    let err
    if (modal === "add") {
      ({ error: err } = await supabase.from("clients").insert(payload))
    } else if (modal === "edit" && selected) {
      ({ error: err } = await supabase.from("clients").update(payload).eq("id", selected.id))
    }

    if (err) { setError(err.message); setSaving(false); return }
    await fetchClients()
    setModal(null)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Usunąć tego klienta? Operacja jest nieodwracalna.")) return
    await supabase.from("clients").delete().eq("id", id)
    fetchClients()
  }

  return (
    <AdminShell>
      {/* Nagłówek sekcji */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <h2 style={{ fontFamily: TP.fontHeading, fontSize: "26px", fontWeight: 400, color: TP.text, margin: 0 }}>
            Klienci
          </h2>
          <p style={{ fontSize: "13px", color: TP.textSec, margin: "4px 0 0" }}>
            {clients.length} {clients.length === 1 ? "klient" : "klientów"} w systemie
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{
            background: TP.orange, color: TP.white, border: "none", borderRadius: "10px",
            padding: "11px 22px", fontSize: "14px", fontWeight: 600, cursor: "pointer",
            fontFamily: TP.fontBody, display: "flex", alignItems: "center", gap: "8px", transition: "background 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = TP.orangeDark)}
          onMouseLeave={e => (e.currentTarget.style.background = TP.orange)}
        >
          <Plus size={17} /> Dodaj klienta
        </button>
      </div>

      {/* Lista klientów */}
      {loading ? (
        <div style={{ display: "grid", gap: "12px" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: "80px", background: TP.card, borderRadius: "12px", animation: "pulse 1.5s ease infinite" }} />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div style={{
          background: TP.card, border: `1px dashed ${TP.border}`, borderRadius: "12px",
          padding: "60px 24px", textAlign: "center",
        }}>
          <p style={{ fontSize: "15px", color: TP.textSec, margin: "0 0 16px" }}>
            Nie ma jeszcze żadnych klientów.
          </p>
          <button onClick={openAdd} style={{
            background: TP.orange, color: TP.white, border: "none", borderRadius: "8px",
            padding: "10px 20px", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: TP.fontBody,
          }}>
            Dodaj pierwszego klienta
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {clients.map(client => (
            <div key={client.id} style={{
              background: TP.card, border: `1px solid ${TP.border}`, borderRadius: "12px",
              padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between",
              transition: "border-color 0.15s, box-shadow 0.15s", cursor: "pointer",
            }}
              onClick={() => router.push(`/admin/clients/detail?id=${client.id}`)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(235,93,28,0.4)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.30)" }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = TP.border; e.currentTarget.style.boxShadow = "none" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "10px",
                  background: "rgba(235,93,28,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: TP.fontHeading, fontSize: "18px", color: TP.orange, fontWeight: 400, flexShrink: 0,
                }}>
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: TP.text }}>{client.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: TP.textSec }}>
                    {[
                      client.google_ads_customer_id && "Google Ads",
                      client.meta_ad_account_id && "Meta",
                      client.ga4_property_id && "GA4",
                    ].filter(Boolean).join(" · ") || "Brak integracji"}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }} onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => openEdit(client)}
                  style={{
                    background: "transparent", border: `1px solid ${TP.border}`, borderRadius: "8px",
                    padding: "7px 16px", fontSize: "13px", fontWeight: 500, color: TP.text,
                    cursor: "pointer", fontFamily: TP.fontBody, transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = TP.orange; e.currentTarget.style.color = TP.orange }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = TP.border; e.currentTarget.style.color = TP.text }}
                >
                  Edytuj
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
                  aria-label="Usuń klienta"
                  style={{
                    background: "transparent", border: "1px solid transparent", borderRadius: "8px",
                    padding: "7px 10px", fontSize: "13px", color: TP.textSec, cursor: "pointer",
                    fontFamily: TP.fontBody, transition: "all 0.15s", display: "inline-flex", alignItems: "center",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#e8734a"; e.currentTarget.style.borderColor = "rgba(235,93,28,0.35)" }}
                  onMouseLeave={e => { e.currentTarget.style.color = TP.textSec; e.currentTarget.style.borderColor = "transparent" }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal dodaj/edytuj */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, padding: "24px",
        }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{
            background: TP.card, borderRadius: "16px", border: `1px solid ${TP.border}`,
            width: "100%", maxWidth: "520px", padding: "36px", boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          }}>
            <h2 style={{ fontFamily: TP.fontHeading, fontSize: "22px", fontWeight: 400, color: TP.text, margin: "0 0 24px" }}>
              {modal === "add" ? "Nowy klient" : "Edytuj klienta"}
            </h2>

            <div style={{ display: "grid", gap: "16px" }}>
              <Field label="Nazwa klienta *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="np. AT Inwest" />
              <Field label="Slug (URL)" value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} placeholder={form.name ? genSlug(form.name) : "at-inwest"} />
              <Field label="Google Ads Customer ID" value={form.google_ads_customer_id} onChange={v => setForm(f => ({ ...f, google_ads_customer_id: v }))} placeholder="1234567890" />
              <Field label="Meta Ad Account ID" value={form.meta_ad_account_id} onChange={v => setForm(f => ({ ...f, meta_ad_account_id: v }))} placeholder="act_123456789" />
              <Field label="GA4 Property ID" value={form.ga4_property_id} onChange={v => setForm(f => ({ ...f, ga4_property_id: v }))} placeholder="123456789" />
              <div>
                <label style={labelStyle}>Profil działalności</label>
                <textarea
                  value={form.business_profile}
                  onChange={e => setForm(f => ({ ...f, business_profile: e.target.value }))}
                  placeholder="Krótki opis branży i celów klienta..."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                  onFocus={e => (e.target.style.borderColor = TP.orange)}
                  onBlur={e => (e.target.style.borderColor = TP.border)}
                />
              </div>
            </div>

            {error && (
              <div style={{ background: "rgba(235,93,28,0.10)", border: "1px solid rgba(235,93,28,0.35)", borderRadius: "8px", padding: "10px 14px", marginTop: "16px", fontSize: "13px", color: "#f6b090" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
              <button onClick={() => setModal(null)} style={{ background: "transparent", border: `1px solid ${TP.border}`, borderRadius: "8px", padding: "10px 20px", fontSize: "14px", color: TP.textSec, cursor: "pointer", fontFamily: TP.fontBody }}>
                Anuluj
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ background: saving ? TP.border : TP.orange, color: TP.white, border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "14px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: TP.fontBody }}
              >
                {saving ? "Zapisywanie…" : modal === "add" ? "Dodaj klienta" : "Zapisz zmiany"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "12px", fontWeight: 600, color: "#f0ece6",
  marginBottom: "6px", letterSpacing: "0.04em", textTransform: "uppercase",
  fontFamily: "var(--font-body,'IBM Plex Sans',sans-serif)",
}
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: "10px",
  border: "1px solid #38352f", background: "#1c1b1f",
  fontFamily: "var(--font-body,'IBM Plex Sans',sans-serif)",
  fontSize: "14px", color: "#f0ece6", outline: "none", boxSizing: "border-box",
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
        onFocus={e => (e.target.style.borderColor = "#eb5d1c")}
        onBlur={e => (e.target.style.borderColor = "#38352f")}
      />
    </div>
  )
}
