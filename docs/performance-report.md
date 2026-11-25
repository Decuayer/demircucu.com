# Performans raporu (Faz 6)

Lighthouse 13.6.0, mobil profil (simüle 4G, 4x CPU yavaşlatma), headless Chrome. Değerler tek
çalıştırmadır; ±%10 oynar.

## 1. Önce: production (2026-11-25, `main` @ f264197)

| Sayfa                         | Perf | A11y | BP  | SEO | FCP    | LCP     | TBT   | CLS   | SI      | Toplam |
| ----------------------------- | ---- | ---- | --- | --- | ------ | ------- | ----- | ----- | ------- | ------ |
| `/tr`                         | 87   | 90   | 100 | 100 | 1,2 sn | 3,9 sn  | 0 ms  | 0,001 | 2,8 sn  | 498 KB |
| `/tr/about`                   | 66   | 91   | 100 | 100 | 1,6 sn | 24,1 sn | 0 ms  | 0,001 | 8,2 sn  | 4,4 MB |
| `/tr/projects`                | 90   | 90   | 100 | 100 | 1,5 sn | 3,5 sn  | 0 ms  | 0,001 | 2,4 sn  | 498 KB |
| `/tr/experience`              | 62   | 89   | 100 | 100 | 2,4 sn | 9,1 sn  | 27 ms | 0,001 | 22,6 sn | 552 KB |
| `/tr/blog`                    | 85   | 90   | 100 | 100 | 1,7 sn | 4,2 sn  | 0 ms  | 0,000 | 3,1 sn  | 498 KB |
| `/tr/projects/aegis-dispatch` | 55   | 87   | 100 | 100 | 7,0 sn | 10,9 sn | 0 ms  | 0,001 | 22,0 sn | 939 KB |

Nedenler:

- `/tr/about`: profil fotoğrafı ham Supabase URL'i, 3,9 MB (LCP kaynağının yüklenmesi 8,3 sn).
- `/tr/experience`, proje detay: LCP öğesinin "render gecikmesi" 16–18 sn. Sayfa içeriği
  framer-motion ile `opacity: 0` başlıyor ve ancak hydration + `whileInView` sonrası görünüyor.
- Proje detay: README görselleri 0,6–1,5 MB PNG (2400 px), boyutlandırılmadan servis ediliyor.
- Her sayfada ~77 KB kullanılmayan JS (framer-motion dahil).

## 2. Kırık görsel taraması (önce, production)

Sitemap'teki 107 sayfa (TR + EN) Playwright ile sonuna kadar kaydırılarak tarandı; 28 `<img>`.

| Bulgu                                                                                                  | Durum                                              |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `feng497-smart-corridor` README'sindeki workflow badge'i (`github.com/.../badge.svg`) CSP'ye takılıyor | Düzeltildi: `img-src` `https://github.com`         |
| `aegis-dispatch` README görselleri kırık değil, yavaş (1,5 MB PNG, lazy)                               | Düzeltildi: optimizer + `srcset`                   |
| Sitemap, canonical ve e-posta linkleri `http://` (Vercel'de `NEXT_PUBLIC_APP_URL`)                     | Kodda `https`'e yükseltiliyor; env de düzeltilmeli |
| 4xx/5xx görsel yanıtı                                                                                  | Yok                                                |

DB tarafı (`scripts/check-media.ts`, salt okunur, 2026-11-25): 21 medya dosyası, 4 referans,
HTML'de 28 görsel (21 dış badge); kırık yok. 8 eski yüklemede boyut/blur yoktu,
`backfill-media-meta.ts --apply` ile dolduruldu (dry-run sonrası, kullanıcı çalıştırdı). İki büyük
orijinal (3,9 MB profil fotoğrafı, 1,4 MB README görseli) yerinde; optimizer küçültülmüş kopya
servis ediyor.

Sonra (prod, merge sonrası): 107 sayfa, 28 görsel; kırık görsel, 4xx yanıt ve konsol hatası yok.

## 3. Önce / sonra: aynı yerel veri, production build

Prod'a deploy edilmeden karşılaştırma için `main` ve bu branch aynı makinede, aynı yerel Supabase
verisiyle (`next build` + `next start`) ölçüldü. Prod'daki gibi büyük bir profil fotoğrafı
(3000×3000 JPEG, 7,1 MB) eklendi. Seed'de README görseli olmadığı için proje detayında görsel yok.

| Sayfa                         | Perf önce → sonra | LCP önce → sonra | JS önce → sonra | Görsel önce → sonra |
| ----------------------------- | ----------------- | ---------------- | --------------- | ------------------- |
| `/tr`                         | 88 → 100          | 4,0 → 1,2 sn     | 337 → 309 KB    | 0 → 0               |
| `/tr/about`                   | 75 → 91           | 40,3 → 3,5 sn    | 333 → 277 KB    | 7,1 MB → 19 KB      |
| `/tr/projects`                | 86 → 100          | 4,2 → 1,1 sn     | 351 → 301 KB    | 0 → 0               |
| `/tr/experience`              | 100 → 100         | 1,1 → 1,1 sn     | 376 → 320 KB    | 0 → 0               |
| `/tr/blog`                    | 100 → 100         | 1,1 → 1,1 sn     | 372 → 316 KB    | 0 → 0               |
| `/tr/projects/sample-project` | 86 → 100          | 4,2 → 1,1 sn     | 387 → 328 KB    | 0 → 0               |

CLS her iki durumda ~0, TBT < 25 ms. Yerel ölçümde ağ gecikmesi olmadığı için TTFB ve FCP
prod'dan iyidir; asıl karşılaştırma prod "sonra" ölçümüdür.

Bundle: Lighthouse'un ölçtüğü script aktarımı sayfa başına 28–59 KB azaldı (framer-motion kalktı,
dört sayfa server component). Turbopack'te `@next/bundle-analyzer` yerine `npx next analyze
--output` kullanılır (Next 16.1+); ayrıntılı modül grafiği gerekirse oradan alınır.

## 4. Sonra: production (2026-11-25, `main` @ 04854ed, backfill sonrası)

| Sayfa                         | Perf     | LCP           | SI            | JS     | Görsel         | Toplam          |
| ----------------------------- | -------- | ------------- | ------------- | ------ | -------------- | --------------- |
| `/tr`                         | 87 → 99  | 3,9 → 1,3 sn  | 2,8 → 3,0 sn  | 298 KB | 0              | 498 → 454 KB    |
| `/tr/about`                   | 66 → 100 | 24,1 → 1,7 sn | 8,2 → 1,6 sn  | 268 KB | 3,9 MB → 30 KB | 4,4 MB → 420 KB |
| `/tr/projects`                | 90 → 100 | 3,5 → 1,2 sn  | 2,4 → 1,4 sn  | 291 KB | 0              | 498 → 448 KB    |
| `/tr/experience`              | 62 → 99  | 9,1 → 1,7 sn  | 22,6 → 2,2 sn | 278 KB | 2 KB           | 552 → 425 KB    |
| `/tr/blog`                    | 85 → 100 | 4,2 → 1,3 sn  | 3,1 → 1,3 sn  | 280 KB | 0              | 498 → 404 KB    |
| `/tr/projects/aegis-dispatch` | 55 → 99  | 10,9 → 1,6 sn | 22,0 → 1,9 sn | 290 KB | 371 KB → 16 KB | 939 → 517 KB    |

TBT 0 ms, CLS ~0,001 (önce de iyiydi). A11y 87–91 ve SEO 100 değişmedi; a11y Faz 8/9 kapsamında.

## 5. Yapılanlar (özet)

- `next/image`: logolar, profil fotoğrafı (`preload` + blur), galeri, admin medya ve önizlemeler.
  Optimizer yalnızca projenin `media` bucket path'ini ve GitHub avatarlarını kabul eder; AVIF +
  WebP; 31 gün önbellek.
- HTML içindeki görseller (README, blog, bio, açıklamalar): kendi görsellerimize `width/height`,
  optimizer `srcset`, `loading="lazy"`, `decoding="async"`.
- Upload: imzalı doğrudan yükleme, sharp (EXIF/GPS silinir, en uzun kenar 2400 px), boyut ve blur
  kaydı, içerik hash'li ad, 1 yıllık immutable cache.
- framer-motion kaldırıldı: CSS giriş animasyonları (`.enter`, kaydırmaya bağlı `.reveal`),
  `prefers-reduced-motion`'da kapalı. Ana sayfa, Hakkımda, deneyim ve proje detay server component.
- Font: Geist `latin` + `latin-ext`, `display: swap`; mono önceden yüklenmiyor.
