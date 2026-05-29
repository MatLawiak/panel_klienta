-- ═══════════════════════════════════════════════════════════════
-- W2 — Sync Meta Ads: tabela logów + funkcja RPC
-- Uruchom w Supabase → SQL Editor (jednorazowo)
-- ═══════════════════════════════════════════════════════════════

-- 1. Tabela logów synchronizacji (podgląd statusu w panelu admina)
CREATE TABLE IF NOT EXISTS sync_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  source        TEXT NOT NULL,                 -- 'meta' / 'google_ads' / 'ga4'
  status        TEXT NOT NULL,                 -- 'success' / 'error'
  rows_synced   INT DEFAULT 0,
  error_message TEXT,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  finished_at   TIMESTAMPTZ
);

ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_sync_jobs" ON sync_jobs;
CREATE POLICY "admin_full_sync_jobs" ON sync_jobs
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 2. Funkcja RPC — upsert kampanii Meta + metryk dziennych w jednej operacji
--    Wywoływana przez n8n z service_role (omija RLS).
--    p_rows: tablica obiektów { external_id, name, objective, is_lead_gen,
--                               date, spend, impressions, clicks, leads, ctr, cpl }
CREATE OR REPLACE FUNCTION sync_meta_data(p_client_id UUID, p_rows JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r            JSONB;
  v_campaign_id UUID;
  n            INT := 0;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    -- upsert kampanii (konflikt po source+external_id)
    INSERT INTO campaigns (client_id, source, external_id, name, objective, is_lead_gen, status)
    VALUES (
      p_client_id,
      'meta',
      r->>'external_id',
      COALESCE(r->>'name', '(bez nazwy)'),
      r->>'objective',
      COALESCE((r->>'is_lead_gen')::boolean, false),
      'ACTIVE'
    )
    ON CONFLICT (source, external_id)
    DO UPDATE SET
      name        = EXCLUDED.name,
      objective   = EXCLUDED.objective,
      is_lead_gen = EXCLUDED.is_lead_gen
    RETURNING id INTO v_campaign_id;

    -- upsert metryk dziennych (konflikt po campaign_id+date)
    INSERT INTO campaign_metrics_daily
      (campaign_id, date, spend, impressions, clicks, leads, ctr_pct, cpl)
    VALUES (
      v_campaign_id,
      (r->>'date')::date,
      COALESCE((r->>'spend')::numeric, 0),
      COALESCE((r->>'impressions')::int, 0),
      COALESCE((r->>'clicks')::int, 0),
      COALESCE((r->>'leads')::int, 0),
      NULLIF(r->>'ctr', '')::numeric,
      NULLIF(r->>'cpl', '')::numeric
    )
    ON CONFLICT (campaign_id, date)
    DO UPDATE SET
      spend       = EXCLUDED.spend,
      impressions = EXCLUDED.impressions,
      clicks      = EXCLUDED.clicks,
      leads       = EXCLUDED.leads,
      ctr_pct     = EXCLUDED.ctr_pct,
      cpl         = EXCLUDED.cpl,
      synced_at   = NOW();

    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;
