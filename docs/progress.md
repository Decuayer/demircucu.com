# İlerleme Notları (devir notu)

Son güncelleme: 2026-11-24 (Faz 2 production migration uygulandı, merge bekleniyor). Görev dokümanı: `docs/claude-code-task.md`
(gitignored). Bu dosya oturumlar arası devir içindir. Secret değeri **içermez**; sadece hangi
dosyada veya ortamda olduklarını belirtir.

## 1. Durum özeti

| Faz / iş                         | Durum                                                                 | Branch / PR                       |
| -------------------------------- | --------------------------------------------------------------------- | --------------------------------- |
| Faz 0: Keşif                     | Tamamlandı, onaylandı                                                 | (PR #1 açıklamasında)             |
| Faz 1: Test altyapısı ve araçlar | Tamamlandı, **merge edildi**                                          | `chore/phase-1-test-infra`, PR #1 |
| Hotfix: DB bağlantı havuzu       | Tamamlandı, **merge edildi**, production'da doğrulandı                | `fix/db-connection-pool`, PR #2   |
| Faz 2: Güvenlik ve auth          | Kod tamam, PR #3 açık; production migration uygulandı, merge bekliyor | `feat/phase-2-security-auth`      |
| Frankfurt mini fazı              | Plan henüz sunulmadı (Faz 2 merge'ünden sonra)                        | —                                 |
| Faz 3–10                         | Başlamadı                                                             | —                                 |

## 2. Tamamlanan işler

### PR #1 (Faz 0 ve 1) ve PR #2 (EMAXCONNSESSION hotfix)

Ayrıntılar PR açıklamalarında ve git geçmişinde. Kalıcı sonuçlar: Next 16, Prisma 7 baseline
migration `0_init`, Vitest/Playwright/CI, `lib/db/pool-config.ts` (max 3), `attachDatabasePool`,
`vercel.json` `icn1`.

### Faz 2 (bu PR)

Kararlar (kullanıcı, 2026-11-24): A = cacheComponents + partialPrefetching; B = RLS yöntem 1+2 tek
migration'da, Data API'yi kullanıcı kapatır; C = staging Supabase (`eu-west-1`); CSP = allowlist +
SRI, enforce; rate limit = Postgres, Turnstile yok; kayıt = açık, e-posta + parola; profil =
`auth.users` trigger'ı.

- **Auth:** `proxy.ts` (next-intl + Supabase oturum yenileme, `/admin` ve `/profile` yönlendirmesi),
  `lib/auth/session.ts` (istek başına tek `getUser`, `connection()` sonrası), `lib/auth/guards.ts`
  (`requireAdmin`, `requireUser`, sayfa varyantları), callback / şifremi unuttum / sıfırla / e-posta
  bekleniyor / doğrulandı sayfaları.
- **Action'lar:** hepsinde zod (`lib/validation/*`), hata kodu döner (`lib/actions/result.ts`), çeviri
  istemcide (`errors.*`, `validation.*`). Okumalar `lib/data/*` (`server-only`).
- **Cache:** `"use cache"` + `cacheTag`, `lib/cache/tags.ts` tek invalidation haritası, `updateTag`.
  Footer yılı cache'li değer. Header oturum parçası Suspense içinde. Tüm sayfalar PPR.
- **DB migration'ları:** `20261124004754_comment_moderation_and_rate_limit` (`Comment.hidden`,
  `RateLimitBucket`), `20261124004800_rls_lockdown`, `20261124004900_auth_profile_sync`.
- **Güvenlik:** sanitizer (S4), upload sertleştirme (S6), rate limit + honeypot (S7), CSP ve header'lar
  (S10), preview guard, build sırasında yazma engeli, session pooler reddi. Ayrıntı:
  `docs/security-review.md`.
- **Hata düzeltmeleri:** etiketli içerik düzenleme unique hatası (etiket isimle eşleniyor),
  deneyim bitiş tarihi temizlenemiyordu, medya silmede storage hatasında satır siliniyordu.
- **Testler:** unit 179, integration 108 (düz Postgres), supabase 16 (yerel Supabase: RLS, grant,
  Data API, trigger), E2E 31 (yerel Supabase'e karşı build).
- **CI:** build job'ı seed'li Postgres'ten SELECT-only rolle build alıyor; `supabase` job'ı (Supabase CLI,
  supabase testleri, E2E); `staging-migrate.yml`; `preview-e2e.yml`.

## 3. Dokümandan sapmalar (onaylandı veya bu fazda raporlandı)

| Sapma                                                                   | Gerekçe                                                                            |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| React 19.3 yerine 19.2.9                                                | 19.2.x en güncel kararlı patch                                                     |
| `prisma format --check` yerine `prisma format` + `git diff --exit-code` | Prisma 7'de `--check` bayrağı yok                                                  |
| Coverage hedefleri yerine ratchet                                       | Hedefler Faz 9'da zorunlu olacak                                                   |
| Hardcoded UI metinleri dokunulan fazda i18n'e taşınıyor                 | Faz 8'de lint kuralı veya script                                                   |
| `npm audit` bulguları kabul edildi                                      | Sadece dev/build zamanı; `docs/security-review.md`                                 |
| Vercel bölgesi `icn1` (geçici)                                          | Frankfurt mini fazında `fra1`                                                      |
| CSP nonce'suz (`'unsafe-inline'` script), SRI kısmi                     | PPR ile nonce mümkün değil; Next 16.4.6 SRI bazı chunk'larda `integrity` eklemiyor |
| Upload limiti 5 MB yerine 4 MB                                          | Vercel fonksiyon gövde limiti 4,5 MB                                               |
| Bilinmeyen slug'da ilk istek soft 404 (200 + noindex)                   | Partial Prefetching'in fallback shell'i; karar kullanıcıda (bkz. §8)               |

## 4. Ortamlar

Secret değerleri bu dosyada **yok**. Sadece konumları:

| Ortam      | DB / Supabase                                                                                                             | Env dosyası / yeri                                  | Not                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Yerel      | Docker Postgres `localhost:54329`; yerel Supabase API 54321, DB 54322, Studio 54323, Mailpit 54324                        | `.env.local` (mode 600)                             | Supabase'te e-posta doğrulaması açık, parola min 10, şablonlar `supabase/templates/`  |
| Staging    | Supabase `eu-west-1`; DATABASE_URL transaction pooler 6543, DIRECT_URL 5432                                               | `.env.staging.local` (mode 600); Vercel Preview env | 4 migration uygulandı, kilit doğrulandı, `media` bucket oluşturuldu, `sb_secret_` key |
| Production | Supabase `ap-northeast-2` (Seul); DATABASE_URL transaction pooler 6543, DIRECT_URL session pooler 5432 (sadece migration) | `.env.prod.local`; Vercel Production env            | 3 migration **bekliyor** (onay); legacy JWT anahtarları                               |

Kurallar:

- `.env.prod.local` / `.env.staging.local` Next.js ve Prisma tarafından otomatik okunmaz; içerikleri
  hiçbir çıktıya yazılmaz. Kullanım: subshell içinde `set -a; . ./.env.prod.local; set +a`.
- Staging'e migration: `DB_TARGET=staging npm run db:migrate:staging` (yerel) veya
  `staging-migrate.yml` (CI).
- `.env.prod.local` mode **644**; `chmod 600` önerilir.
- `.env.staging.local` içinde Vercel bypass secret'ı **yok** (kullanıcı eklemeli, bkz. §8).

## 5. Koruma script'leri

- `scripts/assert-local-db.ts`: `db:migrate`, `db:seed`, `db:reset` sadece yerel DB'de.
- `scripts/migrate-staging.ts` + `scripts/lib/staging-target.ts`: `DB_TARGET=staging` şart, tüm DB
  değişkenleri staging ref'ine ait olmalı (ref `.env.staging.local`'dan veya `STAGING_SUPABASE_REF`
  secret'ından), production her durumda reddedilir.
- `lib/env/preview-guard.ts`: Preview'da production ref'i (yalnızca SHA-256 özeti repoda) build'i
  ve sunucuyu durdurur. Frankfurt geçişinde yeni production ref'inin özeti eklenmeli.
- `scripts/verify-db-lockdown.ts`: her ortamda salt-okunur RLS / grant / trigger raporu.
- `scripts/e2e-build.ts`, `scripts/e2e-prepare.ts`: sadece yerel Supabase.

## 6. Production migration'ları ve yedek

| Migration                                          | Uygulama                                                 | Tarih      |
| -------------------------------------------------- | -------------------------------------------------------- | ---------- |
| `0_init`                                           | `migrate resolve --applied` (baseline, şema değişmedi)   | 2026-11-24 |
| `20261124004754_comment_moderation_and_rate_limit` | `migrate deploy` (onaylı), `verify-db-lockdown` hepsi ok | 2026-11-24 |
| `20261124004800_rls_lockdown`                      | `migrate deploy` (onaylı), `verify-db-lockdown` hepsi ok | 2026-11-24 |
| `20261124004900_auth_profile_sync`                 | `migrate deploy` (onaylı), `verify-db-lockdown` hepsi ok | 2026-11-24 |

- **Son yedek:** `~/backups/demircucu/backup-2026-11-24-pre-migrate.dump` (migration'dan hemen önce,
  426 KB, mode 600; `pg_restore --list`: public 14, auth 27, storage 10 tablo verisi). Önceki
  `backup-2026-11-24-pre-phase2.dump` güncel değildi (sonradan 1 blog yazısı eklenmiş). Storage
  dosyaları yedekte yok.
- **Uygulama (2026-11-24):** `prisma migrate deploy` 3 migration; `migrate status` güncel;
  `migrate diff` fark yok; `verify-db-lockdown`: RLS'siz tablo yok, `anon`/`authenticated` erişimi
  yok, 3 `auth.users` trigger'ı var, profilsiz kullanıcı 0. Data API production'da kapalı
  (`/rest/v1` 503 PGRST002, önceki 42501 yerine). Canlı sitedeki (eski kod) sayfalar 200.
- **Merge'e kadar eski kod ile yeni şema:** uygulama `postgres` rolüyle bağlanıyor (tablo sahibi,
  `BYPASSRLS`, `FORCE RLS` yok), RLS eski kodu etkilemez. Eski `signUp` önce Supabase'de kullanıcı
  açıp sonra `Profile` oluşturuyor; trigger profili önce oluşturduğu için eski kod unique hatası
  alıp "Profil oluşturulurken hata" gösterir (hesap ve profil yine oluşur, isim boş kalır).
  Dahili SMTP yalnızca takım adreslerine gönderdiği için pratikte kayıt yok; risk düşük.
- **Production `media` bucket:** 4 MB ve izinli türler uygulandı (`ensure-storage-bucket.ts
--apply`); mevcut 8 nesnenin hepsi sınırlar içinde.
- Komutlar: `(set -a; . ./.env.prod.local; set +a; DATABASE_URL=$DIRECT_URL npx prisma migrate deploy && npx tsx scripts/verify-db-lockdown.ts)`

## 7. Ölçümler

**Build süresi (Faz 2, karar A, madde 8).** Türkiye'den yerel makinede, 13 worker:

| Durum                                       | Toplam           | Sayfa üretimi | DB RTT (TCP) |
| ------------------------------------------- | ---------------- | ------------- | ------------ |
| Önce: `main`, DB okumuyor, 3 statik sayfa   | 6,6–9,1 sn       | 0,1 sn        | —            |
| Sonra: yerel Postgres, 102 sayfa, ~43 sorgu | 9,0–9,3 sn       | 0,9 sn        | ~0           |
| Sonra: staging (İrlanda), 102 sayfa         | 11,0–11,1 sn     | 2,2 sn        | 72 ms        |
| Sonra: production (Seul), ölçülmedi         | tahmin ~15–16 sn | ~6–7 sn       | 316 ms       |

Seul tahmini: staging'deki ek süre (1,3 sn) RTT oranıyla (316/72) ölçeklendi. Vercel build'leri ABD
doğusunda çalışıyor (Seul'e RTT ~180–200 ms), yani gerçek ek süre muhtemelen +3–4 sn. Vercel build
loglarıyla doğrulanmalı; Frankfurt geçişinden sonra yeniden ölçülecek.

## 8. Açık konular, bekleyen manuel adımlar, bilinen riskler

### Kullanıcının bekleyen manuel adımları

PR açıklamasında adım adım: production migration onayı, Supabase panel ayarları (staging ve
production), GitHub secret'ları, Vercel env kontrolü, production anahtar geçişi planı, production
`media` bucket limitleri, `chmod 600 .env.prod.local`, `.env.staging.local`'a bypass secret.

### Kararlar (2026-11-24)

- Soft 404: Partial Prefetching açık kalıyor; ilk istekte noindex ve sitemap koruması testli.
- CSP değişmiyor; tek harici görsel (Vestel deneyim logosu) gösterilmiyor, deneyim tasarımı
  fazında kendi storage'ımıza taşınacak.
- Yeni anahtar formatı Frankfurt taşımasıyla birlikte.
- E-posta: dahili SMTP yalnızca takım üyelerine ve saatte 2 e-posta; production için custom SMTP
  (Resend önerildi) kullanıcı kararında.

### Sonraki planlar

- **Frankfurt mini fazı** (Faz 2 merge'ünden sonra, Faz 3'ten önce).
- **Faz 3:** medya referansları storage path olarak; **Faz 4:** etiket sistemi (geçici `connectTags`
  eşlemesi kalkacak); **Faz 6:** imzalı doğrudan storage upload (4 MB sınırını kaldırmak için).
- **Faz 8:** hardcoded metin kuralı; footer'daki uydurma e-posta fallback'i; **Faz 9:** coverage.

### Bilinen riskler

- `next start` altında `updateTag` sonrası ilk istek build-time prerender'ı dönebiliyor (yalnızca
  yerel). Vercel'de tag yayılımı ~2–3 sn; `"use cache: remote"` + 5 sn sonra ikinci geçersizleştirme
  ile Preview'da 7/7 ilk istek güncel; test 15 sn sınırını ve kalıcılığı kontrol ediyor.
- Staging'deki otomasyon admini (`preview-e2e-admin@example.com`) yalnızca staging'de; parolası
  `.env.staging.local`'da.
- `use cache` kayıtları deploy'lar arasında taşınmıyor; build DB okuyor (env ve pooler doğru olmalı;
  session pooler artık hata veriyor).
- `game-catalog` projesinin `githubUrl` alanında prompt metni var; proje kaydedilirken URL
  doğrulamasına takılır (içerik kararı kullanıcıda).
