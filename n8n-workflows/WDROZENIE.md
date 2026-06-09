# Stan wdrożenia — synchronizacja Meta + konwersje

Notatka operacyjna (bez sekretów). Sekrety żyją w n8n i w `.env.local` (gitignored).

## Workflowy n8n (live)

Instancja: `https://n8n.srv1076230.hstgr.cloud`

| Workflow | ID | Rola | Plik źródłowy w repo |
|---|---|---|---|
| W2b - Sync Meta (webhook) | `8lB8JqQvPxVIG1dH` | sync na żądanie (przycisk „Pobierz kampanie z Meta", webhook `sync-meta-now`) | `04-sync-meta-webhook.code.js` |
| W2 - Sync Meta Ads | `KmA2UrHayK8RTTGs` | sync nocny (3:00) | `01-sync-meta.standalone.js` |

> Pliki `.js` w repo mają **placeholdery** kluczy (`WKLEJ_...`). Żywe node'y w n8n mają wpisane prawdziwe `SUPABASE_SERVICE_KEY` i `META_TOKEN`. Przy aktualizacji node'a NIE nadpisuj całego kodu — wstrzykuj zmiany, zachowując klucze (albo edytuj przez API, viz niżej).

## Konwersje

- „Konwersja" = **WYNIK kampanii wg jej celu** (jak kolumna „Wyniki" w Meta Ads): kampania leadowa → leady, ruch/aktywność → wyświetlenia strony / kliknięcia itd. Logika: `resultActionTypes(objective)` + `firstActionValue()`.
- Eliminuje absurdalny koszt/konwersję przy 1 przypadkowym leadzie na kampanii nieleadowej.
- Zapis: RPC `sync_meta_data` (kolumna `conversions`) — patrz `05-conversions.sql` (uruchomione w Supabase).
- Panel klienta liczy „Koszt za konwersję" = `spend / conversions` (pokazuje „—" gdy 0 konwersji).

## Token Meta

- Typ: **System User** — **bezterminowy** (nie wygasa). Scope: `ads_read`.
- App ID: `1516317433356623`. Konto reklamowe testowego klienta: `act_1978998115573538`.
- Jeśli kiedyś trzeba wymienić token: podmień wartość `META_TOKEN` w obu node'ach (W2b + W2).

## Aktualizacja workflowów przez API n8n

Klucz API n8n: `.env.local` → `N8N_API_KEY`, baza → `N8N_API_BASE` (`/api/v1`).

Wzorzec: `GET /workflows/{id}` → edytuj `nodes[].parameters.jsCode` → `PUT /workflows/{id}` z `{name, nodes, connections, settings}`. Po PUT sprawdź `active` (w razie potrzeby `POST /workflows/{id}/activate`).

Re-sync na żądanie:
```
POST https://n8n.srv1076230.hstgr.cloud/webhook/sync-meta-now
  header x-webhook-secret: <NEXT_PUBLIC_N8N_SECRET>
  body {"client_id": null}   # null = wszyscy klienci
```
