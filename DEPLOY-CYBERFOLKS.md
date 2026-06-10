# Wdrożenie panelu na CyberFolks — panelklienta.twistedpixel.pl

Aplikacja to **statyczny eksport Next.js** (`output: export`). Build tworzy katalog `out/`, którego zawartość wgrywa się na hosting (Apache). Brak Node.js na serwerze — to czysta statyka.

## 0. Build (na Twoim komputerze)

```powershell
npm run build
```
Powstaje `out/` (~2.3 MB) z `.htaccess`, `_next/`, logo i wszystkimi stronami. Klucze Supabase/n8n są wkompilowane z `.env.local` (sprawdź, że `.env.local` ma docelowe wartości produkcyjne).

## 1. Subdomena w panelu CyberFolks

1. Zaloguj się do panelu CyberFolks.
2. **Domeny → Subdomeny** (lub WWW → Subdomeny) → dodaj `panelklienta` dla domeny `twistedpixel.pl`.
3. Zapamiętaj katalog subdomeny, np. `domains/twistedpixel.pl/public_html/panelklienta` lub `public_html/panelklienta.twistedpixel.pl` (zależnie od konfiguracji konta).

## 2. Wgranie plików

Wgrywasz **ZAWARTOŚĆ** katalogu `out/` (nie sam folder `out`):

1. **Menedżer plików** w panelu (lub FTP/FileZilla) → wejdź do katalogu subdomeny.
2. Najprościej: spakuj zawartość `out/` do ZIP, wgraj ZIP i rozpakuj **w katalogu subdomeny**.
3. Po rozpakowaniu w katalogu subdomeny muszą leżeć bezpośrednio: `index.html`, `.htaccess`, folder `_next/`, `admin/`, `dashboard/`, `login/`, `logo-twistedpixel.png`, `404.html` itd.
4. **Ważne:** plik `.htaccess` zaczyna się kropką — w menedżerze plików włącz „pokaż ukryte pliki", żeby się nie zgubił.

## 3. SSL (certyfikat HTTPS)

1. W panelu CyberFolks: **SSL / Certyfikaty** → wybierz subdomenę `panelklienta.twistedpixel.pl` → wydaj **Let's Encrypt** (darmowy).
2. Poczekaj aż certyfikat się aktywuje (kilka minut).
3. `.htaccess` automatycznie wymusi HTTPS po aktywacji certyfikatu.

> Jeśli SSL nie jest jeszcze aktywny, a `.htaccess` wymusza HTTPS — strona pokaże błąd. Najpierw wydaj certyfikat, potem testuj.

## 4. Konfiguracja Supabase (logowanie)

Logowanie i tworzenie kont klientów wymaga dodania domeny do Supabase:

1. Supabase → **Authentication → URL Configuration**.
2. **Site URL**: `https://panelklienta.twistedpixel.pl`
3. **Redirect URLs** → dodaj: `https://panelklienta.twistedpixel.pl/**`
4. (Sprawdź) **Authentication → Sign In / Providers → Email → „Confirm email"** — jeśli klient ma logować się od razu hasłem, które mu podajesz, ta opcja powinna być **wyłączona**.

## 5. Test po wdrożeniu

1. Wejdź na `https://panelklienta.twistedpixel.pl/login/`
2. Zaloguj się jako admin (`hello@twistedpixel.pl`) → powinno przerzucić na `/admin/clients`.
3. Sprawdź panel klienta osobnym kontem klienta (zakładka „Dostęp klienta" w karcie klienta → utwórz konto).
4. Sprawdź wybór miesiąca i wyniki kampanii.

## 6. Kolejne aktualizacje (po zmianach w kodzie)

```powershell
npm run build
```
Wgraj ponownie **całą zawartość `out/`** do katalogu subdomeny (nadpisz). `.htaccess` ustawia HTML jako `no-cache`, więc klienci od razu widzą nową wersję; pliki `_next/` mają hash w nazwie, więc nie ma konfliktów cache.

## 7. Najczęstsze problemy

- **Biała strona / 404 na podstronach** → upewnij się, że wgrałeś folder `_next/` w całości i że pliki są w katalogu subdomeny, nie w podfolderze `out/`.
- **Logowanie nie działa / błąd redirect** → dodaj domenę do Supabase Redirect URLs (krok 4).
- **„Brak kampanii" / brak danych** → to dane z Supabase (działają niezależnie od hostingu); sprawdź czy sync n8n działa i czy klient ma przypisane widoczne kampanie.
- **Stara wersja po aktualizacji** → twardy refresh `Ctrl+Shift+R`; `.htaccess` i tak wymusza no-cache na HTML.
