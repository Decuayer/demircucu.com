# İlerleme Notları (devir notu)

Son güncelleme: 2026-11-25 (Faz 5 kapandı; Faz 6 onay bekliyor). Görev dokümanı: `docs/claude-code-task.md`
(gitignored). Bu dosya oturumlar arası devir içindir. Secret değeri **içermez**; sadece hangi
dosyada veya ortamda olduklarını belirtir.

## 1. Durum özeti

| Faz / iş                         | Durum                                                               | Branch / PR                                           |
| -------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| Faz 0: Keşif                     | Tamamlandı, onaylandı                                               | (PR #1 açıklamasında)                                 |
| Faz 1: Test altyapısı ve araçlar | Tamamlandı, **merge edildi**                                        | `chore/phase-1-test-infra`, PR #1                     |
| Hotfix: DB bağlantı havuzu       | Tamamlandı, **merge edildi**, production'da doğrulandı              | `fix/db-connection-pool`, PR #2                       |
| Faz 2: Güvenlik ve auth          | Tamamlandı, **merge edildi** (PR #3), production'da doğrulandı      | `feat/phase-2-security-auth`                          |
| Frankfurt taşıması               | **İptal** (kullanıcı kararı): Seul + Vercel `icn1` kalıyor          | —                                                     |
| Faz 3: Veri modeli               | **Kapandı**: PR #5 (genişletme) ve PR #6 (daraltma) merge, prod     | `feat/phase-3-*`                                      |
| Faz 4: Etiket / skill sistemi    | **Kapandı**: PR #8 merge, `migrate-tags --apply` prod'da            | `feat/phase-4-tags`, PR #8                            |
| Faz 5: GitHub entegrasyonu       | **Kapandı**: PR #10 merge, prod'da senkron çalışıyor; düzeltme PR'ı | `feat/phase-5-github`, `fix/phase-5-pdf-legacy-dates` |
| Faz 6–10                         | Başlamadı                                                           | —                                                     |

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

### Faz 3 (PR #5 genişletme, PR #6 daraltma)

Kararlar (kullanıcı, 2026-11-24): medya kolonları `MediaFile.path`'e FK (Restrict); Vestel logosu
daraltmada boşalır, kullanıcı storage'a yükleyip seçer; analitik yaklaşım (a), ham veri 90 gün,
`DailyStat` kalıcı; sapmalar kabul (`TagAlias` tablosu, `BigInt` repo id, engagement `PageView`
içinde, `SkillCategory` yerine `parentId`, `images` / `url` / `usedIn` kaldırılıyor).

- **Migration'lar:** `20261124120000_phase3_expand` (ekleme + backfill + trigger + RLS) ve
  `20261125090000_phase3_contract` (eski kolonlar `logo`, `images`, `coverImage`, `aboutPhoto`,
  `faviconUrl`, `MediaFile.url`, `usedIn` ve `_XToTag` tabloları silindi; ek dosyalarda path varsa
  eski `url` anahtarı temizlendi). Sıra: genişletme migration'ı → kod deploy → daraltma kodu deploy → daraltma migration'ı.
- **Medya:** içerik storage path tutar; URL `lib/media/url.ts` ile üretilir. Ek dosyalar
  `{name, path}` veya dış link `{name, url}`. Liste/HTML referansları `MediaUsage`'da, aynı
  transaction'da yazılır. Kullanımdaki dosya silinemez (`mediaInUse`), storage hatasında satır geri
  alınır. Elle URL ile görsel ekleme kaldırıldı (CSP ve FK ile uyumsuz).
- **Etiket:** açık join tabloları (`source`, `hidden`), sync dışı kaynaklı satırlar korunur. Ağaç
  döngüsü ve alias/slug çakışması trigger'la engelli (`app_private` şemasında).
- **Okuma:** `lib/data/present.ts` public satırları şekillendirir (görünür etiketler, `logoUrl`,
  override fallback'leri, büyük/iç alanlar hariç).
- **Testler:** unit 212, integration 131 (genişletme + daraltma replay testi dahil), supabase 16,
  E2E 33 (yeni: yükleme → path → public görsel → silme engeli). CI'daki yerel Supabase'te Storage
  açık; E2E sunucusu yerel secret key'i alıyor.
- **Production sayımı (salt okunur, 2026-11-24, `scripts/audit-media-refs.ts`, daraltmada silindi):**
  8 medya; tüm
  bucket referanslarının `MediaFile` kaydı var; 1 dış logo (Vestel); 1 ek dosya; HTML'de görsel
  yok; 12 etiket, 12 etiket bağlantısı (0 proje, 11 deneyim, 1 blog).
- **Staging:** iki migration uygulandı, `verify-db-lockdown` hepsi ok, drift yok.

### Faz 4 (PR #8, kapanış PR'ı)

Kararlar (kullanıcı, 2026-11-24): eşleşmeyen topic otomatik etiket olur ve hemen görünür (manuel
kuyruk yok), hatalar admin "Etiketler" sayfasında düzeltilir; önerilen ağaç başlangıç taksonomisi
(`lib/tags/taxonomy.ts`); GitHub dilleri `source: LANGUAGE`, %10 eşiği; bilinen yazım hataları alias;
`SiteSettings.skills` silinmez, içeriği etikete taşınır; GitHub topic düzeltmesi yapılmayacak.

- **Çekirdek:** `lib/tags/normalize.ts` (canonicalize, resolveTag; %100 test), `taxonomy.ts` (yalnızca
  etiket oluşturulurken uygulanır, admin düzenlemelerinin üzerine yazmaz), `languages.ts`,
  `service.ts` (`TagResolver`: çözümle/oluştur + ataları; `mergeTags`; `deleteUnusedTag`), `tree.ts`.
- **Admin:** `/admin/tags` (ağaç, arama, yeniden adlandırma, slug değişince eski slug alias olur, alias
  ekle/kaldır, birleştir, gizle, skill değil, üst etiket ve sıra). Sürükle-bırak yerine üst etiket
  seçimi + yukarı/aşağı. Formlarda yeni `TagSelector` (alias ile arama, oluşturma diyaloğu,
  GitHub/dil etiketleri kilitli, yalnızca o içerikte gizlenir). Ayarlar'daki yüzdelik skill editörü
  kaldırıldı (kolon duruyor).
- **Public:** `/skills`, `/skills/[slug]` (alt dal içeriği, ilk/son kullanım, ilgili skill'ler, alias →
  301), tüm chip'ler tıklanabilir (kartlarda stretched link), `?skill=` / `?tag=` filtreleri,
  Hakkımda'da etiket ağacı, `sitemap.xml` (yalnızca yayımlanmış içerik). Popover yapılmadı.
- **Cache:** yeni `tags` etiketi; içerik değişimi `tags`'i, etiket değişimi tüm içerik etiketlerini
  geçersizleştirir.
- **Taşıma:** `scripts/migrate-tags.ts` (varsayılan dry-run, transaction + rollback; `--apply`).
  Mantık `lib/tags/migrate.ts`, idempotent (testli).
- **Kullanılmayan:** `UnmappedTopic` tablosu (otomatik oluşturma kararıyla gereksiz). Silme kararı
  Faz 5'te verilecek (kullanıcı kararı).
- **Production taşıması (2026-11-24, kullanıcı çalıştırdı):** dry-run sonra `--apply`. Birleştirme 0;
  slug düzeltme 2 (`c-` → `cpp`, `linux-kernel-` → `linux-kernel`); taksonomi 7; kopya çeviri temizliği
  5; `SiteSettings.skills`'ten 13 etiket; 8 üst düğüm; toplam 33 etiket. Script önce ortak
  `createPrismaClient`'ın transaction-pooler kontrolüne takıldı (`DIRECT_URL` session pooler);
  kendi tek bağlantılı havuzuyla düzeltildi (`cecabc7`).
- **Kapanış düzeltmesi:** deneyim liste ve detay sayfaları `logoUrl`'i hiç göstermiyordu (detayda sabit
  ikon). İkisi de logoyu gösteriyor; E2E testi eklendi (admin yükler → liste ve detayda görsel).
- **Testler:** unit 283, integration 180, supabase 16, E2E 41. `admin-media` E2E bir kez zaman aşımına
  düştü (paralel yük), tekrarlarda geçti.

### Faz 5 (PR #10 ve kapanış PR'ı `fix/phase-5-pdf-legacy-dates`)

Kararlar (kullanıcı, 2026-11-24): tetikleyici GitHub App webhook + admin butonu + günlük cron
(Vercel Hobby); kapsam: fork/arşiv hariç (admin'den açılabilir), ilk içe aktarma taslak, sonradan
açılan repo açıklama + README varsa otomatik yayında; Mermaid tarayıcıda lazy; limit görsel 10 MB,
PDF 25 MB (aşan mirror edilmez, GitHub linki); README orijinal dilde, TR sayfada TR override özet
yoksa GitHub açıklaması; `UnmappedTopic` silindi; eşlemeyi kullanıcı çalıştırdı.

- **Migration:** `20261126090000_phase5_github` (`UnmappedTopic` silinir, boş değilse durur;
  `ProjectDocument.mediaFileId` nullable + `htmlUrl`; `Project.readmeVersion`;
  `GithubSyncSettings` tek satır, `autoPublishAfter` = migration anı; RLS açık).
- **Senkron:** `lib/github/*` (auth: App / PAT / anonim; ETag, sayfalama, backoff; `sync.ts`
  idempotent; 240 sn bütçe, PARTIAL ile devam). Ayrıntı ve kurulum: `docs/github-sync.md`.
- **README / mirror / PDF:** sanitize sonrası güvenli dönüşümler; görseller ve PDF'ler
  `media/github/{repo}/{sha256}.{ext}`; SVG PNG'ye çevrilir. pdf.js dosyaları `public/pdfjs`
  (build öncesi kopyalanır, gitignore). CSP'ye yalnızca badge host'ları eklendi.
- **UI:** proje detay (README sekmesi, TOC, dokümanlar, galeri, dil çubuğu), doküman sayfası,
  liste filtreleri (`?skill`, `?lang`, `?q`, `?sort`), admin senkron paneli, medya kaynak/repo
  filtresi ve kullanılmayan GitHub medyası temizliği. GitHub projeleri silinemez (yayından kaldırılır).
- **Testler:** unit 403, integration 187 (senkron: idempotans, override/manuel etiket koruma,
  rename + 301, kaybolan repo, otomatik yayın, hata kaydı), E2E 43 (README + Mermaid + PDF CSP
  altında, admin paneli).
- **Bucket:** limit 25 MB'a çıkıyor (`ensure-storage-bucket.ts --apply`, staging ve prod).
- **Staging:** Phase 5 migration'ı merge'den önce uygulandı (Preview build staging'i okuyor;
  yeni kolonlar olmadan `ColumnNotFound` veriyordu). Lockdown ok.
- **CI düzeltmeleri:** README testlerinde Shiki ilk kurulumu `beforeAll`'da (5 sn sınırı aşılıyordu);
  `lib/projects` testleri eklendi (kapsama ratchet'in 0,01 altına düşmüştü); Supabase job'ında
  geçici port aralığı 60000-65000 (543xx portlarıyla çakışma).
- **Devreye alma (2026-11-24, kullanıcı):** `link-existing-projects --apply` 14 proje (çakışma yok;
  Game Catalog ve NetMonitor isimle, `githubUrl` repo adresiyle düzeldi), GitHub App kuruldu (All
  repositories), PR #10 merge, ilk senkron, projeler yayımlandı, webhook testi çalıştı.
  `feng497-smart-corridor` `autoPublishAfter`'dan 23 sn önce açıldığı için taslak geldi, kullanıcı
  yayımladı; `personal-portfolio` yayından kaldırıldı. 27 projenin 18'i yayında.
- **Kapanış düzeltmeleri:**
  - Doküman sayfası ve proje sayfasında Dokümanlar sekmesi bazı tarayıcılarda "This page
    couldn't load": pdf.js 6'nın modern derlemesi `Map#getOrInsertComputed` gibi çok yeni
    built-in'leri polyfill'siz çağırıyor. Turbopack `resolveAlias` ile `pdfjs-dist` → legacy
    derleme, worker da legacy (`copy-pdfjs-assets.mjs`).
  - Hydration hatası (#418): sunucu (UTC) ve tarayıcı (yerel saat dilimi / varsayılan dil) farklı
    tarih basıyordu (Tatum: 22:34 UTC push). `lib/format-date.ts` (sayfa dili, `Europe/Istanbul`);
    proje, deneyim ve blog tarihleri.
  - Aynı hata Safari'de devam etti (PR #11 sonrası, 2026-11-25): legacy derleme de
    `ReadableStream` async iterasyonunu (metin katmanı `getTextContent`, Safari'de yok) ve
    `Promise.withResolvers`'ı (Safari < 17.4) polyfill etmiyor; react-pdf 10 hatayı en yakın error
    boundary'ye fırlattığı için tüm sayfa düşüyordu. `lib/pdf/polyfills.js` viewer'da pdf.js'ten
    önce yükleniyor ve worker'ın başına ekleniyor; `ViewerBoundary` artık bir PDF hatasında
    sadece viewer'ı "Doküman yüklenemedi + indir" ile değiştiriyor. Prod'da tek tek built-in
    silerek doğrulandı (yalnızca bu ikisi çökertiyor).
  - E2E: yeni built-in'leri silinmiş tarayıcıda PDF (metin katmanı ve README linkinden geçiş dahil), İstanbul saat dilimi + UTC sunucu (`TZ=UTC`),
    seed'lerde UUID ve projeyi en son yayımlama (paralel prefetch yarışı). İki regresyon testi
    düzeltme olmadan başarısız oldu, düzeltmeyle geçti.
- **Testler (kapanış):** unit 422, integration 187, E2E 45; 3x tekrarlı yük çalıştırmalarında 270
  testten yalnızca `admin-media` deneyim logosu testi bir kez 15 sn sınırını aştı (Faz 4'ten beri
  bilinen yük kaynaklı zaman aşımı).

## 3. Dokümandan sapmalar (onaylandı veya bu fazda raporlandı)

| Sapma                                                                   | Gerekçe                                                                            |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| React 19.3 yerine 19.2.9                                                | 19.2.x en güncel kararlı patch                                                     |
| `prisma format --check` yerine `prisma format` + `git diff --exit-code` | Prisma 7'de `--check` bayrağı yok                                                  |
| Coverage hedefleri yerine ratchet                                       | Hedefler Faz 9'da zorunlu olacak                                                   |
| Hardcoded UI metinleri dokunulan fazda i18n'e taşınıyor                 | Faz 8'de lint kuralı veya script                                                   |
| `npm audit` bulguları kabul edildi                                      | Sadece dev/build zamanı; `docs/security-review.md`                                 |
| Vercel bölgesi `icn1` (kalıcı)                                          | Production DB Seul'de kalıyor; Frankfurt taşıması iptal                            |
| CSP nonce'suz (`'unsafe-inline'` script), SRI kısmi                     | PPR ile nonce mümkün değil; Next 16.4.6 SRI bazı chunk'larda `integrity` eklemiyor |
| Upload limiti 5 MB yerine 4 MB                                          | Vercel fonksiyon gövde limiti 4,5 MB                                               |
| Bilinmeyen slug'da ilk istek soft 404 (200 + noindex)                   | Partial Prefetching'in fallback shell'i; kullanıcı kabul etti, testli              |
| `aliases String[]` yerine `TagAlias` tablosu                            | Alias benzersizliği DB'de garanti                                                  |
| `githubRepoId` `BigInt`                                                 | GitHub repo id'leri int32 sınırına yaklaşıyor                                      |
| Engagement ayrı tablo değil, `PageView` alanları                        | Tek satır, daha basit sorgu                                                        |
| `SkillCategory` yok; kategoriler `parentId` kök düğümleri               | Tek ağaç; etiket sayısı az                                                         |
| `UnmappedTopic` kuyruğu yerine otomatik etiket                          | Kullanıcı kararı (Faz 4); düzeltme admin araçlarıyla                               |
| Admin ağaçta sürükle-bırak yok                                          | Üst etiket seçimi + yukarı/aşağı; yeni bağımlılık gerekmez                         |
| PAT yerine GitHub App (PAT yedek)                                       | Yeni repo anında gelir; kullanıcı kararı                                           |
| `revalidateTag("skills")` yerine `tags`                                 | Faz 4'te etiket cache tag'i `tags` olarak adlandırıldı                             |
| SVG mirror'da PNG'ye çevriliyor                                         | Public bucket'tan SVG servis etmek script riski taşır                              |
| README'deki tek başına `user-attachments` URL'i link olarak kalıyor     | GitHub bunu video gömmesi olarak gösterir; video oynatıcı yok                      |

## 4. Ortamlar

Secret değerleri bu dosyada **yok**. Sadece konumları:

| Ortam      | DB / Supabase                                                                                                             | Env dosyası / yeri                                  | Not                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Yerel      | Docker Postgres `localhost:54329`; yerel Supabase API 54321, DB 54322, Studio 54323, Mailpit 54324                        | `.env.local` (mode 600)                             | Supabase'te e-posta doğrulaması açık, parola min 10, şablonlar `supabase/templates/`  |
| Staging    | Supabase `eu-west-1`; DATABASE_URL transaction pooler 6543, DIRECT_URL 5432                                               | `.env.staging.local` (mode 600); Vercel Preview env | 6 migration uygulandı, kilit doğrulandı, `media` bucket oluşturuldu, `sb_secret_` key |
| Production | Supabase `ap-northeast-2` (Seul); DATABASE_URL transaction pooler 6543, DIRECT_URL session pooler 5432 (sadece migration) | `.env.prod.local`; Vercel Production env            | 6 migration uygulandı, kilit doğrulandı; Data API kapalı; legacy JWT anahtarları      |

Kurallar:

- `.env.prod.local` / `.env.staging.local` Next.js ve Prisma tarafından otomatik okunmaz; içerikleri
  hiçbir çıktıya yazılmaz. Kullanım: subshell içinde `set -a; . ./.env.prod.local; set +a`.
- Staging'e migration: `DB_TARGET=staging npm run db:migrate:staging` (yerel) veya
  `staging-migrate.yml` (CI).
- Staging'e merge'de `staging-migrate.yml` otomatik çalışır (PR #3 merge'ünde yeşil, bekleyen yok).

## 5. Koruma script'leri

- `scripts/assert-local-db.ts`: `db:migrate`, `db:seed`, `db:reset` sadece yerel DB'de.
- `scripts/migrate-staging.ts` + `scripts/lib/staging-target.ts`: `DB_TARGET=staging` şart, tüm DB
  değişkenleri staging ref'ine ait olmalı (ref `.env.staging.local`'dan veya `STAGING_SUPABASE_REF`
  secret'ından), production her durumda reddedilir.
- `lib/env/preview-guard.ts`: Preview'da production ref'i (yalnızca SHA-256 özeti repoda) build'i
  ve sunucuyu durdurur. Production projesi değişirse yeni ref'in özeti eklenmeli.
- `scripts/verify-db-lockdown.ts`: her ortamda salt-okunur RLS / grant / trigger raporu.
- `scripts/e2e-build.ts`, `scripts/e2e-prepare.ts`: sadece yerel Supabase.

## 6. Production migration'ları ve yedek

| Migration                                          | Uygulama                                                          | Tarih      |
| -------------------------------------------------- | ----------------------------------------------------------------- | ---------- |
| `0_init`                                           | `migrate resolve --applied` (baseline, şema değişmedi)            | 2026-11-24 |
| `20261124004754_comment_moderation_and_rate_limit` | `migrate deploy` (onaylı), `verify-db-lockdown` hepsi ok          | 2026-11-24 |
| `20261124004800_rls_lockdown`                      | `migrate deploy` (onaylı), `verify-db-lockdown` hepsi ok          | 2026-11-24 |
| `20261124004900_auth_profile_sync`                 | `migrate deploy` (onaylı), `verify-db-lockdown` hepsi ok          | 2026-11-24 |
| `20261124120000_phase3_expand`                     | `migrate deploy` (onaylı), lockdown ok, drift yok                 | 2026-11-24 |
| `20261125090000_phase3_contract`                   | `migrate deploy` (onaylı, kod deploy'dan sonra), ok               | 2026-11-24 |
| `20261126090000_phase5_github`                     | `migrate deploy` (onaylı, merge'den önce), lockdown ok, drift yok | 2026-11-24 |

- **Faz 5 yedeği:** `~/backups/demircucu/backup-2026-11-24-pre-phase5.dump` (migration'dan hemen önce,
  476 KB, mode 600; public 26, auth 27, storage 10 tablo verisi). Sonuç: `UnmappedTopic` yok,
  `GithubSyncSettings` 1 satır (RLS açık), canlı sayfalar 200. `media` bucket limiti staging ve
  prod'da 25 MB (prod'da 9 nesne, hepsi politikaya uygun).
- **Faz 4 etiket taşıması yedeği:** `~/backups/demircucu/backup-2026-11-24-pre-phase4-tags.dump`
  (474 KB, mode 600; public 26, auth 27, storage 10 tablo verisi). `migrate-tags --apply` sonrası
  33 etiket (ayrıntı Faz 4 bölümünde).
- **Daraltma yedeği:** `~/backups/demircucu/backup-2026-11-24-pre-contract.dump` (daraltmadan hemen
  önce, 483 KB, mode 600; public 29, auth 27, storage 10 tablo verisi). Sonuç: eski kolon ve
  `_XToTag` tablosu kalmadı; join tabloları 0/11/1, `MediaUsage` 1, hem `url` hem `path` taşıyan ek
  dosya 0; canlı sayfalar 200. Vestel logosunun dış URL'i planlandığı gibi silindi.
- **Yedek alma:** yerelde `pg_dump` yok; `docker exec -e PGURL="$DIRECT_URL" supabase_db_cucu sh -c
'pg_dump "$PGURL" -Fc --no-owner' > dosya` (pg_dump 17, sunucu 17.6).
- **Faz 3 genişletme yedeği:** `~/backups/demircucu/backup-2026-11-24-pre-phase3.dump` (genişletmeden hemen
  önce, 436 KB, mode 600, pg_dump 17 yerel Supabase konteynerinden; public 15, auth 27, storage 10
  tablo verisi). Backfill sonucu: join tabloları 0/11/1, `aboutPhotoPath` ve `faviconPath` dolu,
  Vestel logosu dönüştürülmedi (beklenen), 1 ek dosyaya path ve 1 `MediaUsage`, trigger'lar 3.
- **Önceki yedek:** `~/backups/demircucu/backup-2026-11-24-pre-migrate.dump` (migration'dan hemen önce,
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
loglarıyla doğrulanmalı (Vercel bölgesi `icn1`, Seul'e yakın).

## 8. Açık konular, bekleyen manuel adımlar, bilinen riskler

### Kullanıcının bekleyen manuel adımları

- Admin "Etiketler"de taşıma sonrası düzeltmeler (isteğe bağlı): `swfit` → "Swift"; `git-github`
  → `git`'e birleştir; Numpy / Tensorflow'u AI altına taşı ve yazımını düzelt; gerrit, linux
  (kernel), matter, ocpp, qt creator adları küçük harfli ve kategorisiz.

### Kararlar (2026-11-24)

- Soft 404: Partial Prefetching açık kalıyor; ilk istekte noindex ve sitemap koruması testli.
- CSP değişmiyor. Vestel logosu kendi storage'ımıza yüklendi (Faz 4 sonrası, kullanıcı).
- Frankfurt taşıması yapılmayacak: production Supabase Seul, Vercel `icn1`.
- Leaked password protection yok (ücretsiz plan).
- Faz 3: medya referansları storage path + `MediaFile.path` FK; analitik kendi Postgres'imiz, ham
  veri 90 gün, `DailyStat` kalıcı (saklama ve DNT/GPC davranışı Faz 7'de uygulanacak).

### Açık konular

- **Custom SMTP (Resend önerildi):** ertelendi; kayıt sisteminin geleceğiyle birlikte karar
  verilecek. O zamana kadar production'da doğrulama ve şifre sıfırlama e-postaları yalnızca
  Supabase takım üyelerine gider (dahili servis, saatte 2 e-posta).
- **Yeni API anahtar formatı** (`sb_publishable_` / `sb_secret_`) production'da: ileride ayrı küçük
  bir iş; şimdi değil.

### Sonraki planlar

- **Faz 6:** imzalı doğrudan storage upload (4 MB sınırını kaldırmak için); README görselleri
  için `next/image` / blur placeholder kullanımı (`MediaFile.blurDataUrl` hazır).
- **Faz 8:** hardcoded metin kuralı; footer'daki uydurma e-posta fallback'i; **Faz 9:** coverage.

### Bilinen riskler

- `next start` altında `updateTag` sonrası ilk istek build-time prerender'ı dönebiliyor (yalnızca
  yerel). Vercel'de tag yayılımı ~2–3 sn; `"use cache: remote"` + 5 sn sonra ikinci geçersizleştirme
  ile Preview'da 7/7 ilk istek güncel; test 15 sn sınırını ve kalıcılığı kontrol ediyor.
- Staging'deki otomasyon admini (`preview-e2e-admin@example.com`) yalnızca staging'de; parolası
  `.env.staging.local`'da.
- `use cache` kayıtları deploy'lar arasında taşınmıyor; build DB okuyor (env ve pooler doğru olmalı;
  session pooler artık hata veriyor).
- `admin-media` deneyim logosu E2E'si ağır paralel yükte 15 sn beklemeyi aşabiliyor (CI'da 2 worker +
  2 retry ile sorun yok).
- Webhook ve cron yalnızca Production'da; Preview/staging'de senkron admin butonuyla.
- Büyük harfli slug'lar (`Spotify-Stream`, `NetMonitor`, `Task-Management-System`) olduğu gibi
  kaldı; istenirse admin'den değiştirilir (eski slug için yönlendirme yalnızca repo yeniden
  adlandırmada otomatik).
