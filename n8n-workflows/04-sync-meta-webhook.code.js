// W2b — Sync Meta NA ŻĄDANIE (webhook) — node "Code" w n8n
// Wywoływany z panelu przyciskiem "Synchronizuj z Meta teraz".
// Wejście: webhook POST z body { client_id } i nagłówkiem x-webhook-secret.
// PO WGRANIU: uzupełnij SUPABASE_SERVICE_KEY i META_TOKEN.

const cfg = {
  SUPABASE_URL: 'https://vruvzezatzkyvmhbtriq.supabase.co',
  SUPABASE_SERVICE_KEY: 'WKLEJ_SERVICE_ROLE_KEY',
  META_TOKEN: 'WKLEJ_META_TOKEN',
  META_API_VERSION: 'v22.0',
  DAYS_BACK: '30',
  WEBHOOK_SECRET: 'twisted2026secret',
};

const input = $input.first().json || {};
const headers = input.headers || {};
const body = input.body || {};

// Weryfikacja sekretu
const got = headers['x-webhook-secret'] || headers['X-Webhook-Secret'];
if (got !== cfg.WEBHOOK_SECRET) {
  return [{ json: { ok: false, error: 'unauthorized' } }];
}

const onlyClientId = body.client_id || null;

let SB = String(cfg.SUPABASE_URL);
if (SB.endsWith('/')) SB = SB.slice(0, -1);
const KEY   = cfg.SUPABASE_SERVICE_KEY;
const TOKEN = cfg.META_TOKEN;
const VER   = cfg.META_API_VERSION || 'v22.0';
const DAYS  = parseInt(cfg.DAYS_BACK || '30', 10);

const sbHeaders = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const fmt = (d) => d.toISOString().slice(0, 10);
const until = new Date();
const since = new Date(Date.now() - DAYS * 86400000);
const LEAD_OBJECTIVES = ['LEAD_GENERATION', 'OUTCOME_LEADS'];
const LEAD_ACTIONS    = ['lead', 'onsite_conversion.lead_grouped'];
const sumActions = (arr, types) => {
  let t = 0; for (const a of (arr || [])) if (types.includes(a.action_type)) t += parseFloat(a.value || 0); return t;
};

// "Konwersja" = WYNIK kampanii wg jej celu (jak kolumna "Wyniki" w Meta Ads Manager).
// Dzieki temu kampania ruchowa nie pokazuje absurdalnego kosztu za 1 przypadkowy lead —
// jej wynikiem sa np. wyswietlenia strony docelowej, a nie leady.
const resultActionTypes = (objective) => {
  const o = String(objective || '').toUpperCase();
  if (o.includes('LEAD'))
    return ['onsite_conversion.lead_grouped', 'lead', 'offsite_conversion.fb_pixel_lead'];
  if (o.includes('SALE') || o.includes('CONVERSION') || o.includes('PURCHASE'))
    return ['offsite_conversion.fb_pixel_purchase', 'onsite_conversion.purchase', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped', 'lead'];
  if (o.includes('TRAFFIC') || o.includes('LINK_CLICK'))
    return ['landing_page_view', 'link_click'];
  if (o.includes('ENGAGEMENT') || o.includes('MESSAG'))
    return ['onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.total_messaging_connection', 'post_engagement', 'link_click'];
  if (o.includes('AWARENESS') || o.includes('REACH') || o.includes('VIDEO') || o.includes('IMPRESSION'))
    return []; // brak sensownej konwersji -> 0
  return ['onsite_conversion.lead_grouped', 'lead', 'offsite_conversion.fb_pixel_lead'];
};
// Pierwsza obecna akcja z listy priorytetow — bez podwojnego liczenia tego samego zdarzenia.
const firstActionValue = (arr, types) => {
  for (const t of types) {
    const a = (arr || []).find(x => x.action_type === t);
    if (a) return parseFloat(a.value || 0);
  }
  return 0;
};

let url = SB + '/rest/v1/clients?select=id,name,meta_ad_account_id&meta_ad_account_id=not.is.null';
if (onlyClientId) url += '&id=eq.' + encodeURIComponent(onlyClientId);

const clients = await this.helpers.httpRequest({ method: 'GET', url, headers: sbHeaders, json: true });
const summary = [];

for (const c of clients) {
  let acct = String(c.meta_ad_account_id || '').trim();
  let synced = 0, errMsg = null;
  if (!acct || acct === 'act_') { summary.push({ client: c.name, synced: 0, error: 'Brak meta_ad_account_id' }); continue; }
  if (!acct.startsWith('act_')) acct = 'act_' + acct;

  try {
    const timeRange = JSON.stringify({ since: fmt(since), until: fmt(until) });
    let u = 'https://graph.facebook.com/' + VER + '/' + acct + '/insights'
      + '?level=campaign&time_increment=1&limit=500'
      + '&fields=campaign_id,campaign_name,objective,spend,impressions,clicks,ctr,actions,cost_per_action_type'
      + '&time_range=' + encodeURIComponent(timeRange)
      + '&access_token=' + encodeURIComponent(TOKEN);

    const rows = [];
    while (u) {
      const resp = await this.helpers.httpRequest({ method: 'GET', url: u, json: true });
      for (const r of (resp.data || [])) {
        const leads = sumActions(r.actions, LEAD_ACTIONS);
        let cpl = sumActions(r.cost_per_action_type, LEAD_ACTIONS);
        const spend = parseFloat(r.spend || 0);
        if (!cpl && leads) cpl = spend / leads;
        const conversions = Math.round(firstActionValue(r.actions, resultActionTypes(r.objective)));
        rows.push({
          external_id: r.campaign_id, name: r.campaign_name, objective: r.objective || null,
          is_lead_gen: LEAD_OBJECTIVES.includes(r.objective) || leads > 0,
          date: r.date_start, spend: spend,
          impressions: parseInt(r.impressions || 0, 10), clicks: parseInt(r.clicks || 0, 10),
          leads: Math.round(leads), conversions: conversions,
          ctr: r.ctr ? parseFloat(r.ctr) : null,
          cpl: cpl ? Number(cpl.toFixed(2)) : null,
        });
      }
      u = (resp.paging && resp.paging.next) ? resp.paging.next : null;
    }

    if (rows.length) {
      await this.helpers.httpRequest({
        method: 'POST', url: SB + '/rest/v1/rpc/sync_meta_data',
        headers: sbHeaders, body: { p_client_id: c.id, p_rows: rows }, json: true,
      });
      synced = rows.length;
    }
  } catch (e) {
    let detail = e.message || String(e);
    try {
      const b = (e.cause && e.cause.error && e.cause.error.message) ? e.cause.error.message
        : (e.response && e.response.body) ? e.response.body : null;
      if (b) detail += ' | META: ' + (typeof b === 'string' ? b : JSON.stringify(b));
    } catch (_) {}
    errMsg = String(detail).slice(0, 400);
  }

  try {
    await this.helpers.httpRequest({
      method: 'POST', url: SB + '/rest/v1/sync_jobs',
      headers: Object.assign({}, sbHeaders, { Prefer: 'return=minimal' }),
      body: { client_id: c.id, source: 'meta', status: errMsg ? 'error' : 'success', rows_synced: synced, error_message: errMsg, finished_at: new Date().toISOString() },
      json: true,
    });
  } catch (e) {}

  summary.push({ client: c.name, synced, error: errMsg });
}

return [{ json: { ok: true, results: summary } }];
