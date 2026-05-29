// ═══════════════════════════════════════════════════════════════
// W2 — Sync Meta Ads — kod node'a "Code" w n8n (język: JavaScript)
// Tryb: Run Once for All Items
//
// Wejście: node "Config" (Set) z polami:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY, META_TOKEN, META_API_VERSION, DAYS_BACK
// ═══════════════════════════════════════════════════════════════

const cfg = $input.first().json;

let SB = String(cfg.SUPABASE_URL);
if (SB.endsWith('/')) SB = SB.slice(0, -1);

const KEY   = cfg.SUPABASE_SERVICE_KEY;
const TOKEN = cfg.META_TOKEN;
const VER   = cfg.META_API_VERSION || 'v22.0';
const DAYS  = parseInt(cfg.DAYS_BACK || '7', 10);

const sbHeaders = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

const fmt = (d) => d.toISOString().slice(0, 10);
const until = new Date();
const since = new Date(Date.now() - DAYS * 86400000);

const LEAD_OBJECTIVES = ['LEAD_GENERATION', 'OUTCOME_LEADS'];
const LEAD_ACTIONS    = ['lead', 'onsite_conversion.lead_grouped'];

const sumActions = (arr, types) => {
  let total = 0;
  for (const a of (arr || [])) {
    if (types.includes(a.action_type)) total += parseFloat(a.value || 0);
  }
  return total;
};

// 1. Pobierz klientów z przypisanym kontem Meta
const clients = await this.helpers.httpRequest({
  method: 'GET',
  url: SB + '/rest/v1/clients?select=id,name,meta_ad_account_id&meta_ad_account_id=not.is.null',
  headers: sbHeaders,
  json: true,
});

const summary = [];

for (const c of clients) {
  let acct = String(c.meta_ad_account_id);
  if (!acct.startsWith('act_')) acct = 'act_' + acct;

  let synced = 0;
  let errMsg = null;

  try {
    const timeRange = JSON.stringify({ since: fmt(since), until: fmt(until) });
    let url = 'https://graph.facebook.com/' + VER + '/' + acct + '/insights'
      + '?level=campaign&time_increment=1&limit=500'
      + '&fields=campaign_id,campaign_name,objective,spend,impressions,clicks,ctr,actions,cost_per_action_type'
      + '&time_range=' + encodeURIComponent(timeRange)
      + '&access_token=' + encodeURIComponent(TOKEN);

    const rows = [];
    while (url) {
      const resp = await this.helpers.httpRequest({ method: 'GET', url, json: true });
      for (const r of (resp.data || [])) {
        const leads = sumActions(r.actions, LEAD_ACTIONS);
        let cpl = sumActions(r.cost_per_action_type, LEAD_ACTIONS);
        const spend = parseFloat(r.spend || 0);
        if (!cpl && leads) cpl = spend / leads;
        const isLead = LEAD_OBJECTIVES.includes(r.objective) || leads > 0;

        rows.push({
          external_id: r.campaign_id,
          name: r.campaign_name,
          objective: r.objective || null,
          is_lead_gen: isLead,
          date: r.date_start,
          spend: spend,
          impressions: parseInt(r.impressions || 0, 10),
          clicks: parseInt(r.clicks || 0, 10),
          leads: Math.round(leads),
          ctr: r.ctr ? parseFloat(r.ctr) : null,
          cpl: cpl ? Number(cpl.toFixed(2)) : null,
        });
      }
      url = (resp.paging && resp.paging.next) ? resp.paging.next : null;
    }

    if (rows.length) {
      await this.helpers.httpRequest({
        method: 'POST',
        url: SB + '/rest/v1/rpc/sync_meta_data',
        headers: sbHeaders,
        body: { p_client_id: c.id, p_rows: rows },
        json: true,
      });
      synced = rows.length;
    }
  } catch (e) {
    errMsg = (e.message || String(e)).slice(0, 300);
  }

  // Zapis logu synchronizacji
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: SB + '/rest/v1/sync_jobs',
      headers: Object.assign({}, sbHeaders, { Prefer: 'return=minimal' }),
      body: {
        client_id: c.id,
        source: 'meta',
        status: errMsg ? 'error' : 'success',
        rows_synced: synced,
        error_message: errMsg,
        finished_at: new Date().toISOString(),
      },
      json: true,
    });
  } catch (e) { /* log best-effort */ }

  summary.push({ client: c.name, synced, error: errMsg });
}

return summary.map((s) => ({ json: s }));
