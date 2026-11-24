# İlerleme Notları (devir notu)

Son güncelleme: 2026-11-24. Görev dokümanı: `docs/claude-code-task.md` (gitignored).
Bu dosya oturumlar arası devir içindir. Secret değeri **içermez**; sadece hangi dosyada veya
ortamda olduklarını belirtir.

## 1. Durum özeti

| Faz / iş                         | Durum                                     | Branch / PR                                     |
| -------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| Faz 0: Keşif                     | Tamamlandı, onaylandı                     | (PR #1 açıklamasında)                           |
| Faz 1: Test altyapısı ve araçlar | Tamamlandı, **merge edildi**              | `chore/phase-1-test-infra`, PR #1               |
| Hotfix: DB bağlantı havuzu       | Tamamlandı, **merge edildi** (2026-11-24) | `fix/db-connection-pool`, PR #2                 |
| Faz 2: Güvenlik ve auth          | Kararlar alındı, uygulama başlamadı       | `feat/phase-2-security-auth` (main'e rebase'li) |
| Frankfurt mini fazı              | Plan henüz sunulmadı (Faz 2'den sonra)    | —                                               |
| Faz 3–10                         | Başlamadı                                 | —                                               |

## 2. Tamamlanan işler

### PR #1: Faz 0 ve Faz 1

**Faz 0 bulguları (özet):**

- Vercel fonksiyonları `iad1`'de, DB Seul'de (`ap-northeast-2`) çalışıyordu.
- Header her istekte cookie okuduğu için tüm public rotalar dinamikti; `revalidate = 3600` etkisizdi.
- `revalidatePath("/projects")` gibi çağrılar locale segmentini içermediği için hiçbir sayfayla eşleşmiyor (Faz 2/6'da düzeltilecek).
- S1: RLS kapalı, ancak `anon`/`authenticated` rollerinin `public` şemasında USAGE'ı ve tablo yetkisi yok.
- `next@16.2.4`'te kritik güvenlik açıkları vardı; `shadcn` dependencies içindeydi.
- `game-catalog` projesinin `githubUrl` alanına prompt metni yapıştırılmış. Raporlandı, içeriğe dokunulmadı.

**Faz 1 değişiklikleri:**

- **Bağımlılıklar:** Next 16.4.6, React 19.2.9, eslint-config-next 16.4.6, Prisma 7.10.1, TipTap 3.35. `shadcn` devDependency'ye taşındı. Paket adı `demircucu-web`.
- **Vercel:** `vercel.json` ile `regions: ["icn1"]` (DB'ye yakın olsun diye).
- **Araçlar:**
  - Prettier ve tailwind eklentisi. Toplu format commit'i `.git-blame-ignore-revs`'te.
  - ESLint: `--max-warnings 0`, `no-explicit-any` error, type import kuralı, eslint-config-prettier.
  - Husky, lint-staged, commitlint.
  - `.nvmrc` (24), `engines` (`>=20.9.0`).
- **Veritabanı:**
  - Baseline migration `0_init` (`migrate diff --from-empty` ile üretildi).
  - `prisma.config.ts`: `DIRECT_URL ?? DATABASE_URL`, shadow DB ve seed tanımlı.
  - Docker Compose ile Postgres 17 (port 54329; `demircucu_dev`, `demircucu_test`, `demircucu_shadow`).
  - Idempotent seed (`prisma/seed.ts`).
  - `.env.example`.
- **Testler:**
  - Vitest unit (jsdom) ve integration (gerçek Postgres).
  - Tüm admin server action'ları için yetki matrisi (anonim / USER / ADMIN).
  - Seed idempotency testi.
  - Playwright smoke testleri: tüm public sayfalar × tr/en, dil yönlendirmesi, 404.
- **CI** (`.github/workflows/ci.yml`):
  - quality job: lint, format, typecheck, prisma validate/format, migration drift kontrolü.
  - unit testler ve coverage ratchet.
  - integration, build ve E2E job'ları.
- **Refactor:**
  - Tüm `any`'ler kaldırıldı (`lib/types/content.ts`, `lib/errors.ts`).
  - Ölü kod `lib/supabase/middleware.ts` silindi.
  - Storage admin istemcisi lazy ve `server-only` (`lib/supabase/storage.ts`).

### PR #2: Hotfix, EMAXCONNSESSION

- **Olay:** PR #1 deploy edildikten sonra production'da `EMAXCONNSESSION` hatası (session pooler `pool_size: 15`). Kullanıcı rollback yaptı.
- **Kök neden:** Runtime. Her fonksiyon örneği varsayılan `pg` Pool kullanıyordu (max 10, 10 sn idle). Session mode'da her açık istemci bağlantısı bir backend bağlantısını tutuyor. Build kaynaklı değil: build sırasında 0 bağlantı ölçüldü, bütün rotalar dinamik.
- **Düzeltme:**
  - `lib/db/pool-config.ts`:
    - `max` 3 (`DATABASE_POOL_MAX` ile değiştirilebilir)
    - idle 5 sn, connect timeout 10 sn
    - `allowExitOnIdle`
  - `lib/prisma.ts`:
    - `attachDatabasePool` (`@vercel/functions` 3.11.0)
    - istemci her ortamda `globalThis`'te tutuluyor
  - `lib/data/settings.ts`: `server-only` ve React `cache`. Public server action olarak export edilmiyor; okuma yaparken kayıt oluşturma `upsert` ile.
- **Doğrulama:**
  - `@prisma/adapter-pg` varsayılanda isimsiz prepared statement kullanıyor, transaction pooler ile uyumlu. `?pgbouncer=true` gerekmiyor.
  - Yerel Supavisor 2.10.1'de transaction modu test edildi.
  - Regresyon testi: `tests/integration/db-pool.int.test.ts`.

## 3. Dokümandan sapmalar (onaylandı)

| Sapma                                                                               | Gerekçe                                                                                                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| React 19.3 yerine 19.2.9                                                            | 19.2.x en güncel kararlı patch                                                                               |
| `prisma format --check` yerine `prisma format` + `git diff --exit-code`             | Prisma 7'de `--check` bayrağı yok                                                                            |
| Coverage hedefleri (lib ≥ %85, genel ≥ %70) yerine ratchet                          | Mevcut coverage çok düşük. CI'da düşüş job'ı kırar; hedefler Faz 9'da zorunlu olacak                         |
| Hardcoded UI metinleri dokunulan fazda i18n'e taşınıyor                             | Faz 8'de kalan Türkçe/hardcoded metinleri yakalayan bir lint kuralı veya script eklenecek                    |
| `npm audit` bulguları kabul edildi (`effect` high, iki moderate)                    | Sadece dev/build zamanında. `docs/security-review.md`'de belgeli; her Prisma güncellemesinde yeniden kontrol |
| `.gitignore` satırları `chore(db)` commit'inde                                      | Kullanıcı onayladı                                                                                           |
| Vercel bölgesi `icn1` (geçici)                                                      | DB Seul'de. Frankfurt mini fazında `fra1`'e taşınacak                                                        |
| Yerel geliştirmede Docker Postgres (Faz 1) ve Supabase CLI (Faz 2); CI düz Postgres | Auth'a bağlı şeyler (trigger, RLS) yerel Supabase'te test ediliyor                                           |

## 4. Ortamlar

Secret değerleri bu dosyada **yok**. Sadece konumları:

| Ortam      | DB / Supabase                                                                                                                 | Env dosyası / yeri                                                      | Not                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Yerel      | Docker Postgres `localhost:54329` (dev/test/shadow); yerel Supabase API 54321, DB 54322, Studio 54323, Mailpit 54324          | `.env.local` (mode 600, sadece yerel değerler)                          | `npm run db:up`, `npm run supabase:start` (Faz 2 branch'inde)          |
| Staging    | Supabase `eu-west-1` (İrlanda); DATABASE_URL transaction pooler 6543, DIRECT_URL 5432                                         | `.env.staging.local` (mode 600); Vercel Preview env (kullanıcı ayarlar) | **Henüz migration uygulanmadı** (2026-11-24, `_prisma_migrations` yok) |
| Production | Supabase `ap-northeast-2` (Seul); DATABASE_URL transaction pooler **6543**, DIRECT_URL session pooler 5432 (sadece migration) | `.env.prod.local`; Vercel Production env                                | Vercel fonksiyonları `icn1`                                            |

Kurallar:

- `.env.prod.local` ve `.env.staging.local`'ı Next.js ve Prisma otomatik okumaz. İçerikleri asla terminale, loga, commit'e veya çıktıya yazılmaz.
  - Kullanım: subshell içinde `set -a; . ./.env.prod.local; set +a`.
  - Prisma CLI'da `DIRECT_URL` açıkça verilmeli. `prisma.config.ts`, `.env.local`'ı yükleyip `DIRECT_URL`'i önceliklendiriyor; aksi halde yerel değer kazanabilir.
- `.env` sadece Prisma şablon yorumlarını içeriyor, değişken tanımı yok.
- `.env.prod.local` şu an mode **644**. 600 yapılması önerilir.

## 5. Koruma script'i

`scripts/assert-local-db.ts` (mantığı `scripts/lib/local-db.ts`'te, testleri `scripts/lib/local-db.test.ts`'te):

- `db:migrate`, `db:seed` ve `db:reset`'ten önce çalışır.
- dotenv'i `prisma.config.ts` ile aynı sırada yükler: önce `.env.local`, sonra `.env`.
- `DATABASE_URL`, `DIRECT_URL` ve `SHADOW_DATABASE_URL`'den **tanımlı olan her biri** yerel host'u göstermeli: `localhost`, `127.0.0.1`, `::1`, `postgres`. Hiçbiri tanımlı değilse veya biri yerel değilse exit 1.
- Hata mesajında sadece değişken adları yazılır; URL veya host yazılmaz.
- Geçmişteki açık: yerel `DIRECT_URL`, uzak `DATABASE_URL`'i maskeliyordu. Düzeltildi, regresyon testi var.
- Integration ve E2E testleri de yerel olmayan DB'yi reddeder (`tests/setup/test-db.ts`).
- `db:reset` ayrıca Prisma'nın AI ajanları için kendi onay kapısına takılıyor. Ajan çalıştırmaz; kullanıcı kendisi çalıştırır.

**Staging izin mekanizması: HENÜZ YOK.** Script şu an staging dahil yerel olmayan her DB'yi reddediyor. Faz 2'de önerilecek tasarım:

- Açık bir opt-in, ör. `DB_TARGET=staging`.
- Hedef host'un staging projesine ait olduğu, çalışma anında `.env.staging.local`'dan okunan ref ile doğrulanır. Ref repoya yazılmaz.
- Production ref'i her durumda reddedilir.
- Komut adı açıkça staging belirtir (ör. `db:migrate:staging`).

Uygulamadan önce kullanıcı onayı alınacak.

## 6. Production migration'ları ve yedek

| Migration | Uygulama                                               | Tarih      |
| --------- | ------------------------------------------------------ | ---------- |
| `0_init`  | `migrate resolve --applied` (baseline, şema değişmedi) | 2026-11-24 |

- Sonrasında `prisma migrate status`: "Database schema is up to date!"; drift yok.
- **Son yedek:** `~/backups/demircucu/backup-2026-11-24.dump`
  - `pg_dump -Fc` 17.12, sunucu 17.6.
  - Dosya mode 600, dizin 700.
  - `pg_restore --list` ile doğrulandı: public'teki 13 tablo, `auth` ve `storage` şemaları.
  - Storage **dosyaları** yedekte yok, sadece `storage.objects` kayıtları var.
- PR #2 şema değişikliği içermiyor.

## 7. Faz 2 kararları ve koşulları

**A: cacheComponents** (klasik ISR yerine)

- `cacheComponents` ve `partialPrefetching` açılacak; next-intl `next/root-params` ile, header oturum parçası Suspense içinde.
- 16.4.6 üzerinde spike ile doğrulandı: tüm rotalar PPR, TTFB yaklaşık 19 ms.
- Koşullar:
  - Build DB okuyacağı için Preview'un staging DB'yi kullanması (C).
  - Build sırasında havuz `max: 1` (`NEXT_PHASE` ile) ve gerekirse `staticGenerationMaxConcurrency`.
  - Build için transaction pooler zorunlu.
  - Her mutation `updateTag`/`revalidateTag` çağırmalı.
  - `new Date()` gibi kararsız değerler düzeltilmeli.
  - `"use cache"` içinde locale argüman olarak geçirilmeli; next-intl'in bu kullanımı belgelenmemiş.
  - Nonce'suz CSP.

**B: RLS yöntemi 1+2, artı panelden Data API kapatma**

- Tek bir Prisma migration:
  - `public` şemasındaki tüm tablolarda politikasız `ENABLE ROW LEVEL SECURITY`.
  - Açık `REVOKE` ve `ALTER DEFAULT PRIVILEGES`.
- Koşullar:
  - Migration önce yerel Supabase'te test edilir.
  - Integration testi: `public`'te RLS'i kapalı tablo kalmamalı ve `anon` hiçbir tabloya erişememeli.
  - Production SQL'i, yedek ve dry-run çıktısıyla ayrıca sunulup onaylanır.
  - Data API'yi Supabase panelinden kullanıcı kapatır.
  - `storage.objects` politikaları gözden geçirilir.

**C: Staging**

- Ayrı bir Supabase projesi (`eu-west-1`), `.env.staging.local`. Vercel Preview env'i staging'i gösterecek.
- Koşullar:
  - Staging'e migration ve seed uygulanmalı (bekliyor).
  - `VERCEL_ENV=preview` iken production ref'i algılanırsa uygulama başlamamalı (guard yazılacak).
  - Staging izin mekanizması (bkz. §5).

## 8. Açık konular, bekleyen manuel adımlar, bilinen riskler

### Kullanıcının bekleyen manuel adımları

1. PR #2 sonrası production kontrol listesi:
   - Vercel Production env'de `DATABASE_URL` 6543 olmalı.
   - Fluid compute açık olmalı, bölge `icn1`.
   - Deploy'dan önce ve sonra `pg_stat_activity` ve Supabase "Database connections" grafiği.
   - Runtime loglarında şunlar aranmalı: `EMAXCONN`, `P2039`, `Postgres pool error`, `timeout exceeded when trying to connect`, 5xx.
   - Ana sayfaların 200 döndüğü kontrol edilmeli.
2. Vercel Preview env'inin (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) staging'i gösterdiği ve Production'a ait olmadığı kontrol edilmeli.
3. Supabase panelinde Data API kapatılmalı (B kararı). Migration'dan sonra yapılabilir.
4. `chmod 600 .env.prod.local`.
5. Preview deploy'ları Vercel SSO arkasında; ajan curl ile doğrulayamıyor. Preview kontrolünü kullanıcı yapar veya bir bypass yöntemi sağlar.

### Ajan tarafında açık işler (Faz 2)

- `proxy.ts`: next-intl ile Supabase session refresh'i birleştirmek (`middleware.ts` deprecated).
- `lib/auth/guards.ts` (`requireAdmin`). `getCurrentUser` istek başına birkaç kez çağrılıyor; React `cache` ile tekilleştirilecek.
- `lib/data/*` (`server-only`), zod doğrulama (S5 mass assignment), sanitizer, upload sertleştirme.
- Profil trigger'ı ve yerel Supabase testleri; `supabase/config.toml`'da `minimum_password_length` hâlâ 6.
- Auth callback, şifremi unuttum/sıfırla akışı.
- Güvenlik header'ları ve CSP.
- `revalidatePath` locale hatası.
- `docs/security-review.md`'de S1–S12'nin tamamlanması.
- Staging: migration, seed, preview guard ve koruma script'i izin mekanizması.

### Kullanıcıya sorulacaklar (Danışma Noktaları)

- Rate limit altyapısı: Upstash mi, Postgres mi? Turnstile kullanılacak mı?
- Kullanıcı kaydı açık mı, kapalı mı, OAuth mu?

### Sonraki planlar

- **Frankfurt mini fazı** (Faz 2'den sonra, Faz 3'ten önce): Supabase `eu-central-1` ve Vercel `fra1`. Kapsam: şema ve veri, auth kullanıcıları, storage dosyaları, env değişiklikleri, yedek ve geri dönüş planı. Plan uygulamadan önce sunulacak.
- **Faz 3:** medya referansları tam URL yerine storage path olarak tutulacak; URL render anında üretilecek.
- **Faz 8:** hardcoded/Türkçe metinleri yakalayan lint kuralı veya script.
- **Faz 9:** coverage hedefleri.
- **Faz 10:** lisans.

### Bilinen riskler

- Rollback edilen production deploy'u, deploy anındaki env'le çalışıyor; muhtemelen eski 5432 session pooler URL'i. Hotfix deploy edilene kadar aynı hata tekrarlanabilir.
- Preview şu an hangi DB'yi kullanıyor, doğrulanmadı. Production'ı gösteriyorsa PR preview'ları production'dan okuyor, auth/storage üzerinden yazabilir.
- cacheComponents'a geçince build DB okuyacak. Pooler ve env yanlış ayarlanırsa build kırılır veya bağlantı limiti aşılır.
- `use cache` kayıtları deploy'lar arasında taşınmıyor.
- `game-catalog` projesinin `githubUrl` alanında prompt metni duruyor (içerik kararı kullanıcıda).
- `effect` (high) audit bulgusu dev-only olarak kabul edildi; her Prisma güncellemesinde yeniden kontrol edilecek.
