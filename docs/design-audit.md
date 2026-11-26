# Tasarım Denetimi (Faz 8A)

Tarih: 2026-11-26. Görev 4.1. Bu rapor yalnızca mevcut durumu tespit eder; sitede kod
değişikliği yapılmadı. Uygulama (8B), raporun ve tasarım yönünün onayından sonra başlar.

## Yöntem

- **Kapsam:** 54 sayfa × 3 genişlik (1440, 768, 375 px) = 162 tam sayfa ekran görüntüsü.
  - 25 public sayfa production'dan (gerçek içerik, yalnızca GET; headless tarayıcı bot sayıldığı
    için analitiğe yazılmadı).
  - 8 giriş/kayıt, 3 profil ve 18 admin sayfası yerel E2E build'inden (seed verisi).
- **Otomatik kontroller** (`playwright.audit.config.ts`, `audit/`):
  - axe-core, WCAG 2.0/2.1/2.2 A–AA + best-practice (1440 ve 375 px).
  - Konsol hata/uyarıları, hydration hataları, yatay taşma, kırık görseller ve `alt`.
  - Başlık yapısı, 375 px'te 24 px altı dokunma hedefleri.
  - 1440 px'te 18 adımlık klavye (Tab) gezintisi ve focus göstergesi.
  - EN sayfalarda Türkçe metin taraması.
- **Galeri:** `audit-screenshots/index.html` (gitignore'da; sayfa grubuna ve genişliğe göre,
  otomatik bulgularla). Yeniden üretmek için:
  `npx playwright test -c playwright.audit.config.ts` (önce `npm run e2e:build`), ardından
  `npx tsx scripts/design-audit-gallery.ts`.
- Site şu an yalnızca koyu temada (`<html class="dark">` sabit); light tema denetlenemedi.

## Öne çıkan 12 bulgu

| #   | Öncelik | Bulgu                                                                                                                                                                                 | Görsel                                         |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1   | Yüksek  | 404 sayfası Next'in varsayılan sayfası: beyaz zemin, İngilizce ("This page could not be found."), header/footer yok, `<html lang>` yok. Olmayan proje/yazı da aynı sayfaya düşüyor.   | [404](design-audit/not-found-1440.webp)        |
| 2   | Yüksek  | Mobil menü düğmesinin (hamburger) ve mobil "Giriş Yap" ikon linkinin erişilebilir adı yok (axe `button-name`, `link-name`; 375 px'te tüm public sayfalar).                            |                                                |
| 3   | Yüksek  | Admin paneli mobilde menüsüz: kenar menüsü `md` altında gizli, yalnızca public header'ın menüsü var. KPI kartları mobilde tek sütun, dashboard çok uzun.                              | [admin 375](design-audit/admin-375.webp)       |
| 4   | Yüksek  | Admin Blog ve Yorumlar sayfalarında hydration hatası (React #418): tarihler `toLocaleDateString()` ile sunucu (UTC) ve tarayıcıda farklı basılıyor.                                   |                                                |
| 5   | Yüksek  | Ana sayfa hero'su: "Bilgisayar Mühendisi" hem rozet hem alt başlık; ekranın çoğu boş, kim olduğu / ne yaptığı / odak alanları ilk ekranda yok; GitHub/LinkedIn/CV CTA'sı yok.         | [hero](design-audit/home-hero-1440.webp)       |
| 6   | Orta    | 3 sütunlu ızgarada 2 öne çıkan proje ve 2 blog yazısı: sağda boş sütun. "Test" yazısı ana sayfada ve blogda yayında.                                                                  |                                                |
| 7   | Orta    | Proje detayında iki `h1` (sayfa başlığı + README'nin `#` başlığı). Tek dilli projede dil çubuğu tam genişlikte kırmızı bir çubuk gibi görünüyor; "0 yıldız · 0 fork" gürültü.         | [proje](design-audit/project-header-1440.webp) |
| 8   | Orta    | Proje listesinde her kartta aynı `</>` ikonu, kapak/önizleme yok; 19 projenin 9'unun başlığı repo adı (`aegis-dispatch`, `se302-term-project`...); TR sayfada İngilizce açıklamalar.  | [liste](design-audit/projects-list-1440.webp)  |
| 9   | Orta    | Violet–cyan gradyan her yerde: isim, birincil butonlar, ikon kutuları, logo, header "Giriş Yap", rozetler. Tek vurgu yok; hiyerarşi zayıflıyor.                                       |                                                |
| 10  | Orta    | Okuma süresi HTML karakter sayısı / 1000 (blog listesi, yazı, ana sayfa); "dk" EN sayfada da Türkçe. Tarih biçimleri karışık: "04.05.2026", "24 Kas 2026", "Haz 2025", "16 Haz 2025". |                                                |
| 11  | Orta    | Deneyim: tek kayıt, zaman çizelgesi sağa kaymış tek kart; süre ("1 ay") ve konum yok; logo 20 px.                                                                                     | [deneyim](design-audit/experience-1440.webp)   |
| 12  | Düşük   | Her sayfada iki konsol uyarısı: `Permissions-Policy` başlığındaki `browsing-topics` ve `interest-cohort` artık tanınmıyor (kendi güvenlik başlığımız).                                |                                                |

## Site geneli bulgular

### Görsel hiyerarşi

- Hero ve sayfa başlıkları tutarlı ama her sayfa aynı kalıpla açılıyor: küçük rozet + büyük
  başlık + bol boşluk (Projelerim, Deneyimlerim, Hakkımda). Rozet başlığı tekrar ediyor
  ("Projelerim" rozeti + "Projelerim" başlığı).
- Hakkımda sayfası ana sayfanın hero'sunu tekrarlıyor ("Merhaba, Ben Demir Cücü / Bilgisayar
  Mühendisi").
- Ana sayfada deneyim özeti ve öne çıkan skill'ler yok; "Birlikte Çalışalım" CTA kutusu ile
  footer arasında aynı bilgi tekrar ediyor.
- Proje detayında README sayfanın %90'ını kaplıyor; projenin kendi özeti, görseli ve bağlantıları
  ilk ekranda küçük kalıyor.

### Tipografi

- Geist Sans tek aile, ağırlıklar uygun. Ölçek tanımsız: başlıklar 30/36/48/60 px arasında
  sayfadan sayfaya değişiyor, gövde metni kartlarda 13–14 px ve `text-muted-foreground` ile soluk.
- Hakkımda biyografisi uzun ve gri; kalın vurgu çok sık (her satırda 2–3 kalın ifade).
- Mono yalnızca kod bloklarında (doğru).

### Boşluk ritmi

- Bölümler arası boşluk büyük (ana sayfada 160–200 px), kart içi boşluk küçük; mobilde hero'nun
  altında ~120 px boşluk ve "scroll" ikonu.
- 4/8 px sistemi yok; `py-24`, `py-32`, `mb-12`, `gap-6` gibi değerler sayfaya göre karışık.

### Renk ve kontrast (WCAG 2.2 AA)

- Gövde ve başlık kontrastı yeterli. axe `color-contrast` 14 sayfada:
  - `text-muted-foreground/70` (4,15:1 ve 3,93:1; dashboard listeleri, sayaç ikincil metni).
  - Görsel yükleme alanındaki ipucu metni (`opacity-70`, 4,15:1).
  - README kod bloklarındaki yorum satırları (Shiki `github-dark`, 3,04:1).
- Gradyan ve "violet-400/cyan-400" vurguları her bileşende; birincil buton gradyanı üzerinde
  beyaz metin sınırda.
- Dil çubuğunda GitHub dil renkleri (ör. Swift kırmızı) tam genişlikte tek renk olunca hata
  gibi görünüyor.

### Tutarlılık

- **Kart dili farklı:** Proje kartı (ikon + aksiyon ikonları + "Projeyi Görüntüle"), blog kartı
  (tarih + "Devamını Oku"), deneyim kartı (logo + ok) ve hobi kartı (ikon kutusu) ayrı tasarımlar.
- **Tarih biçimleri dört çeşit:** `formatDate` kısa ay, `dd.MM.yyyy`, admin'de tarayıcı yereli.
- **Başlık seviyeleri:** axe `heading-order` 34 sayfada; kart başlıkları `h3`, üstünde `h2` yok.
- **Etiket chip'leri:** sayaçlı ("Python 9") ve sayaçsız aynı stilde; admin'de etiket adları
  küçük/büyük harf karışık ("Git /Github", "Numpy", "Tensorflow").

### İçerik tekrarları

- "Bilgisayar Mühendisi": ana sayfada iki kez, Hakkımda'da bir kez, sayfa başlığında
  ("Demircucu | Bilgisayar Mühendisi").
- "Merhaba, Ben Demir Cücü": ana sayfa ve Hakkımda.
- İletişim CTA'sı: hero, "Birlikte Çalışalım" kutusu ve footer.
- Header'da hem "Giriş Yap" hem dil düğmesi; giriş yapmış admin public header'ı admin
  sayfalarında da görüyor (admin içinde iki gezinme).

### Boş durumlar

- Blog yorumları, beğeniler, profil beğenileri ve admin listelerinde basit metin var (iyi).
- Deneyim listesinde tek kayıt için zaman çizelgesi çizgisi boşlukta kalıyor.
- Proje listesi arama sonucu boşsa ve skill sayfası içeriksizse ayrı tasarım yok (yalnızca metin).

### Yükleme ve hata durumları

- Hiçbir rotada `loading.tsx`, `error.tsx`, `not-found.tsx` ve `global-error.tsx` yok.
  - Admin geçişlerinde tam sayfa spinner var.
  - Public sayfalar PPR ile hızlı açılıyor ama bir hata tüm sayfayı Next'in varsayılan hata
    ekranına düşürür.
- Olmayan slug'da 404 HTML'i varsayılan (bulgu 1). İlk istekte soft 404 (200 + noindex) kabul
  edilmişti; görünüm yine varsayılan sayfa.

### Mobil davranış

- Yatay taşma hiçbir sayfada yok.
- 375 px'te chip'ler, "Şifremi Unuttum", "Girişe dön", footer linkleri 16–20 px yüksekliğinde
  (WCAG 2.2 2.5.8 için 24 px önerilir; satır içi link istisnası footer'ı kapsamaz).
- README kod blokları mobilde yatay kayıyor ama klavyeyle odaklanamıyor (axe
  `scrollable-region-focusable`).
- Admin: menü yok (bulgu 3), KPI kartları tek sütun, form sayfaları uzun ama kullanılabilir.

### Erişilebilirlik

| axe kuralı                    | Etki   | Sayfa | Kaynak                                                                                       |
| ----------------------------- | ------ | ----- | -------------------------------------------------------------------------------------------- |
| `button-name`                 | kritik | 51    | Mobil menü düğmesi; admin düzenle/sil ikon butonları; editör araç çubuğu                     |
| `landmark-unique`             | orta   | 51    | Header'da masaüstü ve mobil iki `nav`, ikisi de etiketsiz                                    |
| `heading-order`               | orta   | 34    | Kart başlıkları `h3`, üst seviye atlanıyor                                                   |
| `link-name`                   | ciddi  | 32    | Proje kartlarındaki GitHub/canlı site ikon linkleri; mobil "Giriş Yap" ikonu; admin ikonları |
| `color-contrast`              | ciddi  | 14    | Yukarıda                                                                                     |
| `label`                       | kritik | 7     | Admin formlarında `Select` ve bazı `textarea`'lar etiketle bağlı değil                       |
| `aria-input-field-name`       | ciddi  | 6     | Zengin metin editörü (TipTap) alanı adsız                                                    |
| `aria-toggle-field-name`      | ciddi  | 6     | Admin `Switch`'leri adsız                                                                    |
| `aria-valid-attr-value`       | kritik | 6     | Admin formlarında Radix `aria-controls` olmayan id'yi gösteriyor                             |
| `html-has-lang`               | ciddi  | 3     | Varsayılan 404 sayfası                                                                       |
| `landmark-one-main`, `region` | orta   | 3     | Varsayılan 404 sayfası                                                                       |
| `scrollable-region-focusable` | ciddi  | 3     | README kod blokları                                                                          |

- **Klavye:** Tab gezintisinde focus halkası genel olarak görünür. İki yerde focus görünmeyen bir
  `div`'e gidiyor: blog listesinde tıklanabilir kart sarmalayıcısı, profil beğenileri sekme
  paneli.
- **"Ana içeriğe atla" linki** yok.
- **Görseller:** `alt` eksik yok (Hakkımda fotoğrafı "Profil fotoğrafı"). Proje ve blog
  kapakları olmadığı için çoğu sayfada görsel yok.

### Gereksiz / anlamsız öğeler

- Hero'daki fare "scroll" ikonu, hakkımda fotoğrafının üstündeki dekoratif dünya ikonu.
- Her sayfa başlığının üstündeki rozet.
- Proje kartında kartın tamamı link olduğu halde ayrıca "Projeyi Görüntüle" linki.
- Proje detayında "0 yıldız · 0 fork" (sıfır değerler).
- Hakkımda'daki "2+ Yıl Deneyim" ifadesi, deneyim sayfasıyla (1 aylık staj) çelişiyor; içerik
  kararı, aşağıda.

### Konsol

- `Permissions-Policy` uyarıları (bulgu 12).
- Proje dokümanı (PDF) sayfasında pdf.js'in ICC renk profili için WebAssembly derlemesi CSP'ye
  takılıyor (`'wasm-unsafe-eval'` yok): uyarı, PDF yine görünüyor; renkler bazı PDF'lerde
  yaklaşık.
- Admin yazı/proje editöründe TipTap "Duplicate extension names: link" uyarısı.

## Sayfa bazında

| Sayfa                       | Bulgular                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ana sayfa                   | Hero tekrarı ve boşluk (bulgu 5); 2 proje/2 yazı 3 sütunda; blog "En yeni" yerine görüntülenmeye göre sıralı (`getFeaturedPosts`); "Test" yazısı; deneyim ve skill bölümü yok; CTA kutusu tekrarı; EN'de de Türkçe "dk okuma". Mobilde hero 2 satıra kırılıyor, düzgün.                                                      |
| Hakkımda                    | Hero tekrarı; biyografi uzun, bölümlenmiş ama tarama zor (çok kalın vurgu); fotoğraf üstünde anlamsız ikon; skill ağacı kategorilerle iyi ama chip sayaçları ("Python 9") açıklamasız; "Test" ve "Git /Github" skill olarak görünüyor; Hobiler bölümü kariyer sayfasında fazla yer kaplıyor; sosyal butonlarda yine gradyan. |
| Deneyim listesi             | Tek kayıt için dikey çizgi; tarih solda, kart sağda; süre yok; logo küçük; açıklama metni kartta tekrar.                                                                                                                                                                                                                     |
| Deneyim detay               | İçerik zengin; başlık hiyerarşisi `h3` ile başlıyor (axe `heading-order`); "Ekli Dosyalar" EN sayfada Türkçe; EN içerikte emoji ("📝 Project Overview") TR'de yok; tarih biçimi listeden farklı.                                                                                                                             |
| Proje listesi               | Kart tasarımı (bulgu 8); arama/dil/sıralama filtreleri iyi; dil noktası renkleri GitHub'dan; ikon linklerin adı yok; 19 kartlık tek uzun liste.                                                                                                                                                                              |
| Proje detay                 | İki `h1`; dil çubuğu; README başlıklarındaki `#` çapa linkleri görünür ve 13×30 px; içindekiler (sağ) iyi; GitHub dışı projede (demircucu-com) yapı aynı; kapak/galeri yalnızca README'de görsel varsa.                                                                                                                      |
| Proje dokümanı              | Viewer iyi; pdf.js CSP uyarısı; "GitHub'da Gör" küçük hedef.                                                                                                                                                                                                                                                                 |
| Blog listesi                | 2 yazı; "En çok okunanlar" sekmesi gerçek veriyle artık anlamlı ama 2 yazıda gereksiz; kart sarmalayıcısı focus alıyor ama görünmüyor; okuma süresi hesabı.                                                                                                                                                                  |
| Blog yazısı                 | Kapak yok; ilerleme çubuğu, içindekiler, önceki/sonraki ve paylaşım yok; yazar "Demircucu / DC" (kullanıcı adından); yorum alanı iyi; "Test" yazısı yayında.                                                                                                                                                                 |
| Skill ağacı / skill sayfası | Ağaç okunur; mobilde chip'ler küçük hedef; skill sayfasında proje/deneyim/yazı listeleri metin linki, kart değil (bilinçli, sade).                                                                                                                                                                                           |
| İletişim                    | Form iyi (honeypot ekran dışında ve `aria-hidden`, doğru); konum "Bornova, İzmir, Türkiye" EN'de çevrilmemiş (içerik).                                                                                                                                                                                                       |
| Gizlilik                    | Temiz; bulgu yok (yalnızca footer küçük hedefleri).                                                                                                                                                                                                                                                                          |
| 404 / olmayan içerik        | Bulgu 1.                                                                                                                                                                                                                                                                                                                     |
| Giriş / kayıt / şifre       | Kart düzeni tutarlı; "Şifremi Unuttum" ve "Girişe dön" küçük hedef; footer açıklaması EN sayfada Türkçe (site ayarındaki fallback metni); tek sütun mobilde iyi.                                                                                                                                                             |
| Profil / beğeniler          | Sekmeler erişilebilir; boş durum metni iyi; sekme paneli focus alıyor ama halka görünmüyor.                                                                                                                                                                                                                                  |
| Admin (genel)               | Mobil menü yok; public header + admin kenar menüsü birlikte; ikon butonları adsız; "Medya" menü öğesi hardcoded; liste sayfaları farklı düzenlerde (kart listesi, tablo yok); kaydedilmemiş değişiklik uyarısı yok.                                                                                                          |
| Admin dashboard / analitik  | KPI'lar mobilde tek sütun; `muted/70` kontrastı; sayfa başlığı "Dashboard" İngilizce kalıyor (TR menüde de).                                                                                                                                                                                                                 |
| Admin formlar               | `Select`, `Switch` ve editör alanları etiketsiz; Radix `aria-controls` hatası; editör uyarısı; yükleme alanı kontrastı; form uzun ama bölümlü.                                                                                                                                                                               |
| Admin Blog / Yorumlar       | Hydration hatası (bulgu 4).                                                                                                                                                                                                                                                                                                  |

## Bölüm 2.3 maddelerinin durumu

| Madde                                                  | Durum                                                                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Hero'da `heroSub` tekrarı, başlık fallback'i           | **Açık** (bulgu 5)                                                                                 |
| "Son Blog Yazıları" `viewCount`'a göre                 | **Açık** (sıralama); sayaç Faz 7'de gerçek veriye bağlandı                                         |
| `incrementViewCount` çağrılmıyor                       | **Kapandı** (Faz 2'de kaldırıldı, Faz 7'de analitik)                                               |
| Okuma süresi karakter / 1000                           | **Açık**                                                                                           |
| Tarih biçimleri tutarsız                               | **Kısmen**: public `lib/format-date.ts` (Faz 5); admin'de `toLocaleDateString` ve iki farklı biçim |
| Footer: ham URL, eksik "Deneyimlerim", uydurma e-posta | Sosyal linkler ikonlu (kapandı); **"Deneyimlerim" linki ve uydurma e-posta açık**                  |
| Hardcoded Türkçe metinler                              | **Kısmen**: "Ekli Dosyalar", "dk", footer açıklama fallback'i, "Medya", toast'lar hâlâ var         |
| Yüzdelik skill barları, foto emoji fallback'i, `alt`   | **Kapandı**: barlar kaldırıldı (Faz 4), `alt` yerelleştirilmiş                                     |
| Etiket slug sorunları (`c-`, Türkçe karakter)          | **Kapandı** (Faz 4)                                                                                |
| Büyük harfli proje slug'ları                           | **Açık** (içerik; admin'den değiştirilebilir)                                                      |
| `not-found` / `error` / `loading`                      | **Açık** (bulgu 1)                                                                                 |
| `sitemap.ts`                                           | **Kapandı** (Faz 4)                                                                                |
| `robots.ts`, OpenGraph görselleri, JSON-LD             | **Açık**                                                                                           |
| hreflang alternates                                    | **Kısmen**: yalnızca sitemap'te; sayfa `<head>`'inde yok                                           |
| `next-themes` kurulu ama sağlayıcı yok                 | **Açık** (yalnızca `sonner` ve README kullanıyor)                                                  |
| Admin sidebar mobilde gizli                            | **Açık** (bulgu 3)                                                                                 |

## İçerik notları (Görev 4.3; admin panelinden düzeltilebilir, içeriğe dokunulmadı)

| Yer                         | Not                                                                                                                                                                                                                                                                | Admin'de                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| Blog → "Test"               | Yayında, içeriği "Test"; ana sayfada ve blogda görünüyor.                                                                                                                                                                                                          | Blog → yayından kaldır veya sil |
| Hakkımda → konum            | TR "İzmir, Turkiye" → "İzmir, Türkiye".                                                                                                                                                                                                                            | Ayarlar → Hakkımda              |
| Hakkımda → "2+ Yıl Deneyim" | Deneyim sayfasında tek kayıt (1 aylık staj); Tatum/FlowMetrics deneyim olarak girilmemiş. Ya ifade ya deneyim kayıtları güncellenmeli.                                                                                                                             | Ayarlar / Deneyimler            |
| Deneyim → Vestel            | Başlık "Vestel Mobility", TR metinde "Vestel Mobilite'nin"; "CO2" içinde görünmez boşluk karakteri; EN'de "📝" emoji var, TR'de yok.                                                                                                                               | Deneyimler → düzenle            |
| Deneyim                     | Tatum (kurucu ortak) ve FlowMetrics (kurucu ortak) biyografide var, deneyimlerde yok.                                                                                                                                                                              | Deneyimler → ekle               |
| Etiketler                   | "Test" bir skill olarak görünüyor; "Git /Github" boşluk; "Numpy", "Tensorflow" yazımı (NumPy, TensorFlow); Faz 4'ten kalan "swfit", gerrit, linux, matter, ocpp, qt creator notları.                                                                               | Etiketler                       |
| Projeler → başlıklar        | 9 proje başlığı repo adı: aegis-dispatch, feng497-smart-corridor, ce477-data-science-term-project, se302-term-project, eee461-dualkey, CE316-Project, CE475-Machine-Learning-Term-Project, llm-from-scratch, task-manager-api. TR başlık/özet override'ı önerilir. | Projeler → düzenle (override)   |
| Projeler → açıklamalar      | TR sayfada İngilizce özetler (GitHub açıklaması). Faz 5 kararı gereği TR override yoksa GitHub açıklaması görünüyor.                                                                                                                                               | Projeler → TR özet              |
| Projeler → slug             | `Spotify-Stream`, `NetMonitor`, `Task-Management-System` büyük harfli.                                                                                                                                                                                             | Projeler → slug                 |
| Proje → Tatum               | Görev dokümanındaki "prompt kalıntısı ve bozuk link" artık görünmüyor (README'den geliyor). README'deki `git clone <repository-url>` yer tutucusu kalmış (GitHub'da düzeltilir).                                                                                   | GitHub README                   |
| Site başlığı                | Sekme başlığı "Demircucu" (Türkçe karakter ve boşluk yok).                                                                                                                                                                                                         | Ayarlar → SEO & Meta            |
| Blog yazarı                 | "Demircucu / DC" görünüyor (profil adı boş).                                                                                                                                                                                                                       | Profil → ad                     |
| İletişim → konum            | EN sayfada "Bornova, İzmir, Türkiye"; EN alanı yok.                                                                                                                                                                                                                | Ayarlar → İletişim              |
| Footer açıklaması           | Giriş/kayıt/profil (ayar okunmadan önce) fallback "Full-Stack Developer & Software Engineer. Yazılım, projeler..." görünüyor; ayarlardaki metinle farklı.                                                                                                          | Kod (8B) + Ayarlar              |

## Önerilen tasarım yönü

Hedef: içerik odaklı, sade bir mühendis portföyü. Kişilik içerikten (projeler, yazılar) gelir;
süsleme azalır.

### Renk

Tek vurgu + nötr skala, light ve dark için token'lar (`globals.css`, `oklch`):

| Token                         | Dark                | Light              |
| ----------------------------- | ------------------- | ------------------ |
| `--background`                | zinc-950            | white              |
| `--foreground`                | zinc-50             | zinc-950           |
| `--muted-foreground`          | zinc-400 (≥ 4.5:1)  | zinc-600 (≥ 4.5:1) |
| `--card` / `--border`         | zinc-900 / zinc-800 | zinc-50 / zinc-200 |
| `--accent` (link, focus, CTA) | **seçenek**         | aynı tonun koyusu  |

- Gradyan yalnızca isimde (veya hiç).
- İkon kutuları ve rozetler nötr, butonlar düz renk.
- Dil ve durum renkleri yalnızca küçük noktalarda.

Uygulanan token'lar ve kontrast oranları (PR 3, 2026-11-26): metin/zemin 19,9 (light) ve 19,1
(dark); ikincil metin 7,7 / 7,6; link 7,3 / 7,0; buton metni 5,9; focus halkası 5,9 / 7,0. Dark'ta
kenarlık zinc-700, input kenarı zinc-600 (muted zemin zinc-800 üstünde kaybolmasın diye).

### Tipografi

- Geist Sans + Geist Mono kalır (yükleme Faz 6'da optimize edildi).
- Ölçek 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 (rem token'ları); gövde 16 px, satır
  yüksekliği 1,6; okuma genişliği ~68 karakter.
- Başlık seviyeleri semantik ve görsel olarak eşlenir.

### Boşluk ve düzen

- 4/8 px ölçeği, bölümler arası 64–96 px.
- İçerik genişliği 1120 px (metin 720 px).
- Izgaralar içerik sayısına göre (1–2 öğe için 2 sütun veya liste).

### Bileşen dili

- Tek kart bileşeni (başlık, meta satırı, kısa metin, chip'ler, isteğe bağlı görsel);
  kartın tamamı tek link, ayrı "Görüntüle" linki yok.
- Chip'ler 24 px yükseklikte.
- Butonlar: birincil (düz vurgu), ikincil (outline), hayalet.
- Focus: 2 px vurgu halkası.
- Animasyon: yalnızca giriş fade ve hover, `prefers-reduced-motion`'da kapalı (mevcut).

### Sayfa yapısı

- **Ana sayfa**
  - Hero: isim, tek satır unvan, 2–3 cümle "ne yapıyorum", odak alanları.
  - Hero CTA'ları: İletişim, GitHub, LinkedIn, (CV).
  - Öne çıkan projeler (2–4, görselli), deneyim özeti (zaman çizelgesi, son 3), öne çıkan
    skill'ler, en yeni 3 yazı (tarih).
  - "Birlikte Çalışalım" kutusu kaldırılır veya footer'a sade bir satır olarak iner.
- **Hakkımda:** Hero tekrarı kalkar; fotoğraf + kısa özet + biyografi bölümleri + skill ağacı +
  (isteğe bağlı) hobiler daha küçük.
- **Deneyim:** Dikey zaman çizelgesi, sol hizalı. Her kayıtta logo, rol, tarih aralığı + süre,
  (konum), kısa maddeler, chip'ler.
- **Projeler**
  - Kartta 16:9 kapak (README'nin ilk görseli veya admin seçimi; yoksa nötr desen + dil).
  - Başlıkta görünen ad.
  - Detayda üst bölüm: başlık, özet, bağlantılar, meta (yıldız/fork sıfırsa gizli), sonra README.
  - README `h1`'i `h2`'ye indirilir.
- **Blog:** Kapak, tarih, okuma süresi (kelime / 200), etiketler, okuma ilerleme çubuğu,
  içindekiler (h2/h3), önceki/sonraki, paylaşım linkleri (kopyala, X, LinkedIn).
- **Hata sayfaları:** İki dilde, site düzeni içinde 404 / hata / yükleme iskeletleri.
- **Admin**
  - Mobilde Sheet menü; public header admin'de sadeleşir.
  - Listeler tek tablo/liste düzeninde.
  - Formlarda etiketler ve kaydedilmemiş değişiklik uyarısı.

### SEO (8B, karar gerektirmeyen standart iş)

- Sayfa bazlı metadata, canonical, `alternates.languages`.
- OG/Twitter kartları ve `opengraph-image.tsx`.
- `robots.ts`.
- JSON-LD: `Person`, `WebSite`, `BlogPosting`, `SoftwareSourceCode`, `BreadcrumbList`.

## Karar gerektiren sorular

Kararlar (kullanıcı, 2026-11-26): 1 tek violet, 2 sistem teması + düğme, 3 Geist kalır, 4 yeni ana
sayfa yapısı, 5 CV indirme (migration), 6 deneyimde konum (migration, CV ile birlikte), 7 otomatik
kapak + admin seçimi, 8 `/api/track` nötr yola (eski yol bir süre çalışır), 9 tüm içerik
formlarında uyarı, 10 hobiler küçültülmüş kalır. İçerik notlarını kullanıcı admin'den düzeltecek.

1. Vurgu rengi.
2. Varsayılan tema.
3. Tipografi.
4. Ana sayfa yapısı.
5. CV indirme (migration).
6. Deneyimde konum alanı (migration).
7. Proje kapak görseli kaynağı (migration olabilir).
8. `/api/track` yolunun değiştirilmesi.
9. Admin'de kaydedilmemiş değişiklik uyarısının kapsamı.
10. Hobiler bölümü.
