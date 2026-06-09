-- ═══════════════════════════════════════════════════════════════
-- Konwersje (WYNIK kampanii wg celu) — zapis kolumny conversions
-- Uruchom w Supabase → SQL Editor (jednorazowo), PO 03-campaigns-per-client.sql
-- ═══════════════════════════════════════════════════════════════

-- 1. Upewnij sie, ze kolumna istnieje (powinna juz byc w schemacie)
ALTER TABLE campaign_metrics_daily
  ADD COLUMN IF NOT EXISTS conversions NUMERIC DEFAULT 0;

-- 2. RPC sync_meta_data — wersja z zapisem conversions.
--    p_rows: { external_id, name, objective, is_lead_gen, date,
--              spend, impressions, clicks, leads, conversions, ctr, cpl }
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
    ON CONFLICT (client_id, source, external_id)
    DO UPDATE SET
      name        = EXCLUDED.name,
      objective   = EXCLUDED.objective,
      is_lead_gen = EXCLUDED.is_lead_gen
    RETURNING id INTO v_campaign_id;

    INSERT INTO campaign_metrics_daily
      (campaign_id, date, spend, impressions, clicks, leads, conversions, ctr_pct, cpl)
    VALUES (
      v_campaign_id,
      (r->>'date')::date,
      COALESCE((r->>'spend')::numeric, 0),
      COALESCE((r->>'impressions')::int, 0),
      COALESCE((r->>'clicks')::int, 0),
      COALESCE((r->>'leads')::int, 0),
      COALESCE((r->>'conversions')::numeric, 0),
      NULLIF(r->>'ctr', '')::numeric,
      NULLIF(r->>'cpl', '')::numeric
    )
    ON CONFLICT (campaign_id, date)
    DO UPDATE SET
      spend       = EXCLUDED.spend,
      impressions = EXCLUDED.impressions,
      clicks      = EXCLUDED.clicks,
      leads       = EXCLUDED.leads,
      conversions = EXCLUDED.conversions,
      ctr_pct     = EXCLUDED.ctr_pct,
      cpl         = EXCLUDED.cpl,
      synced_at   = NOW();

    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;
