# Report Collector — Yatırım Rapor Toplama Sistemi

Finans kurumlarının araştırma departmanlarından yayınlanan raporları (PDF) ve YouTube kanallarından video transkriptlerini otomatik tespit edip toplayan, genişletilebilir bir CLI aracı.

## Hızlı Başlangıç

```bash
# Bağımlılıkları kur
npm install
pip install -r requirements.txt

# Playwright tarayıcısını kur (ilk seferde)
npx playwright install chromium

# Raporları topla
npm start

# YouTube transkriptleri çek
npm run transcript

# Belgeler/tahminler/forecast çıktıları üret
npm run analyze

# PDF'den text çıkar (analiz için)
npm run extract -- raporlar/danske-bank/fx-forecast-update/dosya.pdf

# Tahmin sapması hesapla (Faz 2)
npm run forecast-check -- analizler/forecasts.json

# Belge skorlama hesapla
npm run doc-score -- analizler/belgeler.csv analizler/tahminler.csv analizler/forecasts-results.json

# Tahmin skorlama hesapla
npm run forecast-score -- analizler/tahminler.csv
```

## Nasıl Çalışır

1. **Playwright** ile hedef sitenin SPA sayfasına gider
2. Disclaimer ve cookie consent otomatik geçilir
3. SPA'nın arka planda çağırdığı **API response intercept** edilir (yapılandırılmış JSON → başlık, tarih, PDF URL)
4. Yeni raporlar `raporlar/` klasörüne PDF olarak indirilir
5. **scrapetube** ile YouTube kanallarının videoları listelenir, **yt-dlp** ile Türkçe transkriptler çekilir
6. Transkriptler `raporlar/{kanal}/youtube-transcripts/` altına `.txt` olarak kaydedilir
7. `state/downloaded.json` ile daha önce indirilen raporlar ve transkriptler takip edilir — aynı içerik tekrar indirilmez

## Proje Yapısı

```
├── package.json              # Bağımlılıklar ve npm scriptleri
├── requirements.txt          # Python bağımlılıkları (scrapetube, yt-dlp)
├── tsconfig.json             # TypeScript yapılandırması
├── src/
│   ├── index.ts              # CLI giriş noktası, orkestrasyon
│   ├── config.ts             # Kaynak URL'leri, dizin ve tarayıcı ayarları
│   ├── types.ts              # Ortak tipler (Report, ScraperSource, vb.)
│   ├── tracker.ts            # İndirme geçmişi / duplicate engelleme
│   ├── downloader.ts         # PDF indirme yardımcı fonksiyonları
│   ├── analyzer/
│   │   ├── generate-analysis.ts # Analiz çıktıları üretimi (belgeler + tahminler + forecasts)
│   │   ├── extract-text.ts   # PDF → text çıkarma (pdf-parse)
│   │   ├── forecast-check.ts # Tahmin sapması + alpha hesaplama (cross-report + API)
│   │   ├── doc-score.ts      # Belge skorlama hesaplama
│   │   └── forecast-score.ts # Tahmin skorlama hesaplama
│   ├── scrapers/
│   │   ├── base-scraper.ts   # Abstract class — tüm scraper'ların temel arayüzü
│   │   ├── danske-bank.ts    # Danske Bank scraper implementasyonu
│   │   ├── icbc-yatirim.ts   # ICBC Yatırım scraper implementasyonu
│   │   └── deniz-yatirim.ts  # Deniz Yatırım scraper implementasyonu
│   └── transcript/
│       └── fetch-transcripts.py  # YouTube transkript toplama (Python)
├── .github/
│   ├── copilot-instructions.md  # Copilot workspace kuralları
│   ├── agents/
│   │   ├── orchestrator.agent.md         # Pipeline orkestratör agent'ı
│   │   ├── report-collector.agent.md     # Rapor toplama agent'ı
│   │   ├── transcript-collector.agent.md # YouTube transkript toplama agent'ı
│   │   ├── report-analyzer.agent.md      # PDF + Transkript analiz agent'ı
│   │   ├── doc-scorer.agent.md           # Belge skorlama agent'ı
│   │   └── forecast-scorer.agent.md      # Tahmin skorlama agent'ı
│   └── skills/
│       ├── report-collection/
│       │   └── SKILL.md      # Scraper geliştirme prosedürü ve mimari
│       ├── transcript-collection/
│       │   └── SKILL.md      # YouTube transkript toplama prosedürü
│       ├── pdf-analysis/
│       │   └── SKILL.md      # Analiz prosedürü ve prompt şablonu (PDF + Transkript)
│       ├── doc-scoring/
│       │   └── SKILL.md      # Skorlama prosedürü ve formüller
│       └── forecast-scoring/
│           └── SKILL.md      # Tahmin skorlama prosedürü ve öneri kuralları
├── analizler/                # AI analiz çıktıları (.md + .csv)
├── raporlar/                 # İndirilen PDF'ler ve transkriptler
│   ├── danske-bank/
│   │   └── fx-forecast-update/
│   ├── icbc-yatirim/
│   │   └── model-portfoy/
│   ├── deniz-yatirim/
│   │   └── gunluk-bulten/
│   └── devrim-akyil/
│       └── youtube-transcripts/
└── state/
    └── downloaded.json       # İndirme geçmişi (PDF + transkript, duplicate kontrolü)
```

## Desteklenen Kaynaklar

| Kaynak | Tür | Kategori | Slug |
|--------|-----|----------|------|
| Danske Bank | PDF | FX Forecast Update | `danske-bank` |
| ICBC Yatırım | PDF | Model Portföy | `icbc-yatirim` |
| Deniz Yatırım | PDF | Günlük Bülten | `deniz-yatirim` |
| Devrim Akyıl | YouTube | Transkript | `devrim-akyil` |

## Yeni Kurum/Kategori Ekleme

### Mevcut kuruma yeni kategori eklemek

`src/config.ts` dosyasındaki `SOURCES` array'ine yeni bir `ScraperCategory` ekleyin:

```ts
{
  name: "Danske Bank",
  slug: "danske-bank",
  categories: [
    // mevcut kategori...
    {
      name: "Yeni Kategori",
      slug: "yeni-kategori",
      url: "https://research.danskebank.com/research/#/articlelist/Yeni-Kategori",
    },
  ],
}
```

### Yeni kurum eklemek

1. `src/scrapers/` altında `BaseScraper` sınıfını extend eden yeni bir dosya oluşturun
2. `scrape()` ve `createContext()` metodlarını implement edin
3. `src/config.ts` → `SOURCES` array'ine yeni kurumu ekleyin
4. `src/index.ts` → `createScraper()` fonksiyonuna yeni slug eşleşmesini ekleyin

## Rapor Analizi (AI Agent Sistemi)

İndirilen PDF'ler VS Code Copilot multi-agent sistemi ile analiz edilir.

### Agent Mimarisi

| Agent | Görev | Skill | Çağıran |
|-------|-------|-------|---------|
| **Orchestrator** | Pipeline yönetimi, agent koordinasyonu | — | Kullanıcı |
| **Report Collector** | Rapor indirme, scraper geliştirme | `report-collection` | Orchestrator |
| **Transcript Collector** | YouTube transkript çekme | `transcript-collection` | Orchestrator |
| **Report Analyzer** | PDF + Transkript → Belgeler + Tahminler raporları | `pdf-analysis` | Orchestrator |
| **Doc Scorer** | Belgeler + Tahminler → Skorlama raporu | `doc-scoring` | Orchestrator |
| **Forecast Scorer** | Tahminler → Tahmin skorları + Öneri | `forecast-scoring` | Orchestrator |
| **Dashboard Generator** | Skorlama CSV'leri → İnteraktif HTML dashboard | `dashboard-generation` | Orchestrator |

### Kullanım

1. VS Code Chat'te agent seçiciden **Orchestrator** seç
2. İstediğin işlemi belirt:
   ```
   raporlar/danske-bank/fx-forecast-update/ klasöründeki raporları analiz et ve skorla
   ```
3. Orchestrator otomatik olarak:
   - **Report Collector**: Yeni raporları indir
   - **Transcript Collector**: YouTube transkriptleri çek
   - **Report Analyzer**: PDF + Transkript text çıkarma → Belgeler + Tahminler
   - **Doc Scorer**: Belge skorlama → Doküman Başarı Skoru
   - **Forecast Scorer**: Tahmin skorlama → Tahmin Başarı Skoru + Öneri
   - **Dashboard Generator**: Skorlama → İnteraktif HTML dashboard

Tek bir agent da doğrudan çağrılabilir:
- **Report Collector**: sadece PDF indirme
- **Transcript Collector**: sadece YouTube transkript çekme
- **Report Analyzer**: sadece analiz (PDF + Transkript)
- **Doc Scorer**: sadece belge skorlama (mevcut CSV'lerle)
- **Forecast Scorer**: sadece tahmin skorlama (mevcut CSV'lerle)
- **Dashboard Generator**: sadece dashboard üretme (mevcut skorlama CSV'leriyle)

### Analiz Sütunları

#### Belgeler Raporu (belge düzeyinde)

| Sütun | Açıklama |
|-------|----------|
| Belge Tarihi | Raporun yayın tarihi |
| Kurum | Yayınlayan kurum |
| Analistler | Rapor yazarları |
| Format | Belge formatı (PDF/Video) |
| Belge Adı | Raporun tam adı |
| Özet Metin | 3-5 cümlelik özet |
| Yatırım Tezi | Raporun temel önerisi/tahmini |
| Varsayımlar | Tezin dayandığı varsayımlar |
| Risk Analizi | Raporda belirtilen riskler |
| Varsayım Gerçekleşme | Her varsayımın doğrulanma durumu (✅/❌/⚠️/⏳) — sonraki rapordan cross-reference |
| Tahmin Sapması | +1M forecast vs gerçekleşen, pip cinsinden — script ile hesaplanır |

#### Tahminler Raporu (tahmin düzeyinde)

| Sütun | Açıklama |
|-------|----------|
| Tahmin Tarihi | Raporun yayın tarihi |
| Kurum | Yayınlayan kurum |
| Analist | Parite bazlı analist (bilinmiyorsa "Ekip") |
| Format | Belge formatı (PDF/Video) |
| Varlık | Parite adı (EUR/USD, EUR/SEK vb.) |
| Vade | Tahmin vadesi (+1M, +3M, +6M, +12M) |
| Hedef Tarihi | Tahmin Tarihi + Vade süresi |
| Spot Fiyat | Raporun yayın tarihindeki cari kur |
| Hedef Fiyat | Tahmin edilen kur |
| Analiz Tezi | Varlığa özel yorum/beklenti |
| Gerçekleşen Fiyat | Hedef tarihindeki gerçek kur |
| Sapma (pip) | Hedef − Gerçekleşen, pip cinsinden |
| Yön İsabeti | Spot→Hedef yönü vs Spot→Gerçekleşen yönü (✅/❌/⏳) |

#### Belge Skorlama Raporu (belge düzeyinde performans)

| Sütun | Tür | Açıklama |
|-------|-----|----------|
| Belge Tarihi | Çıkarım | Raporun yayın tarihi |
| Kurum | Çıkarım | Yayınlayan kuruluş |
| Analistler | Çıkarım | Sorumlu analistler |
| Format | Çıkarım | Kaynak türü (PDF/Video) |
| Özet Metin | Çıkarım | Ana mesaj ve bulgular |
| Belge Adı | Çıkarım | Raporun tam başlığı |
| Yatırım Tezi | Çıkarım | Temel argüman ve beklenti |
| Varsayımlar & Gerçekleşme | Çıkarım | Varsayımlar ve gerçekleşme notları |
| Varsayım Etkisi | Hesaplama | Yüksek (≥%80) / Orta (%50-79) / Düşük (<%50) |
| Risk Analizi | Çıkarım | Başlıca riskler |
| Varlık Sayısı | Hesaplama | Belgede tahmin edilen farklı parite sayısı |
| Tahmin Sayısı | Hesaplama | Varlık × vade toplam tahmin sayısı |
| İsabet Oranı % | Hesaplama | Yön isabeti doğru oranı (⏳ hariç) |
| Ort. Alpha (Consensus) | Hesaplama | Consensus'a göre ort. alpha (%) |
| Ort. Alpha (Forward) | Hesaplama | Forward'a göre ort. alpha (%) |
| Belge Başarı Skoru | Hesaplama | Ağırlıklı 0-100 skor + harf notu (A/B/C/D/F). Min 5 değerlendirme gerekir. Alpha yoksa ağırlıklar yeniden dağıtılır. |

#### Tahmin Skorlama Raporu (tahmin düzeyinde performans)

| Sütun | Tür | Açıklama |
|-------|-----|----------|
| Tahmin Tarihi | Çıkarım | Raporun yayın tarihi |
| Kurum | Çıkarım | Yayınlayan kuruluş |
| Analist | Çıkarım | Sorumlu analist |
| Format | Çıkarım | Kaynak türü |
| Varlık | Çıkarım | Parite veya hisse kodu |
| Vade | Çıkarım | Tahmin ufku |
| Hedef Tarihi | Çıkarım | Spot + vade |
| Hedef Fiyat | Çıkarım | Analistin tahmini |
| Analiz Tezi | Çıkarım | Tahmin argümanı |
| Benchmark | Hesaplama | FX: aynı parite; hisseler: BIST100 |
| Tahmin tarihindeki Fiyat | Hesaplama | Spot fiyat |
| Beklenen Getiri % | Hesaplama | (Hedef − Spot) / Spot × 100 |
| Gerçekleşen Fiyat | Hesaplama | Hedef tarihindeki piyasa fiyatı |
| Gerçekleşen Getiri % | Hesaplama | (Gerçekleşen − Spot) / Spot × 100 |
| Hedef Yön | Hesaplama | Yukarı / Aşağı / Sabit |
| Öneri | Hesaplama | Alpha + RefAlpha tabanlı kural sistemi (hisse: Strong Sell/Sell/Reduce/Hold/Buy/Strong Buy, FX: Strong Bearish/Bearish/Slightly Bearish/Neutral/Slightly Bullish/Bullish/Strong Bullish) |
| Yön İsabeti | Hesaplama | 1 veya 0 |
| Hedef Yakınlığı | Hesaplama | max(0, 100 − MAPE × 10) |
| Tahmin Doğruluğu | Hesaplama | Yön yanlış→0; MAPE<1%→100, 1-3%→75, 3-5%→50, ≥5%→25 |
| Error (MAPE) | Hesaplama | \|Gerçekleşen − Hedef\| / \|Hedef\| × 100 |
| Başarı Skoru | Hesaplama | Yön×100×0.40 + HedefYak.×0.30 + AlphaSkor×0.20 + TahminDoğr.×0.10 |
| Ref. Beklenen Getiri % | Hesaplama | Trailing benchmark getirisi |
| Ref. Gerçekleşen Getiri % | Hesaplama | Yalın benchmark piyasa getirisi |
| Alpha | Hesaplama | Beklenen − Ref. Beklenen Getiri |
| RefAlpha | Hesaplama | Alpha / max(\|Beklenen\|, 0.05) |

### Faz 2: Tahmin Doğrulama

Ardışık raporları cross-reference ederek varsayım gerçekleşme ve tahmin sapması hesaplanır:

1. Agent her rapordan tüm paritelerin forecast verisini (1M/3M/6M/12M) çıkarır → `analizler/forecasts.json`
2. `forecast-check.ts` scripti sapma hesaplar (cross-report + son rapor için frankfurter.app API)
3. Agent varsayım gerçekleşmeyi kalitatif olarak değerlendirir
4. Sonuçlar Belgeler tablosuna eklenir + ayrıca Tahminler raporu oluşturulur

### Çıktı Dosyaları

| Dosya | Açıklama |
|-------|----------|
| `analizler/belgeler.md` | Belge bazlı genel analiz (Markdown) |
| `analizler/belgeler.csv` | Belge bazlı genel analiz (CSV) |
| `analizler/tahminler.md` | Tahmin bazlı granüler izleme (Markdown) |
| `analizler/tahminler.csv` | Tahmin bazlı granüler izleme (CSV) |
| `analizler/dokuman_skorlari.md` | Belge başarı skorlama (Markdown) |
| `analizler/dokuman_skorlari.csv` | Belge başarı skorlama (CSV) |
| `analizler/tahmin_skorlari.md` | Tahmin başarı skorlama (Markdown) |
| `analizler/tahmin_skorlari.csv` | Tahmin başarı skorlama (CSV) |
| `analizler/dashboard.html` | İnteraktif analiz dashboard'u (HTML) |

## Mimari Kararlar

- **Playwright** — Hedef siteler React SPA + consent wall kullandığı için basit HTTP client yetersiz
- **API intercept** — HTML scraping yerine SPA'nın iç API çağrılarını yakalıyoruz; daha güvenilir ve hızlı
- **HTML fallback** — API yakalanamadığında sayfa DOM'undan article linkleri çıkarılır- **TLS fallback** — Node.js native fetch TLS sertifika hatası verdiğinde Playwright context üzerinden indirilir
- **Yahoo Finance API** — BIST hisse senetleri ve BIST100 endeksi için tarihsel fiyat verisi (ticker.IS formatı). Stock split tespiti adjclose/close oranıyla otomatik yapılır- **Manuel tetikleme** — Scheduler yok, kullanıcı istediğinde `npm start` ile çalıştırır
- **JSON state tracking** — `state/downloaded.json` dosyası ile PDF URL ve YouTube video URL'e göre duplicate kontrolü
- **VS Code Agent + Skill** — Her agent kendi skill'ini kullanır: `report-collection` (scraper mimari), `transcript-collection` (YouTube transkript), `pdf-analysis` (analiz prosedürü), `doc-scoring` (belge skorlama), `forecast-scoring` (tahmin skorlama + öneri), `dashboard-generation` (interaktif dashboard)
- **Multi-agent orkestrasyon** — Orchestrator agent alt agent'ları (report-collector, transcript-collector, report-analyzer, doc-scorer, forecast-scorer, dashboard-generator) doğru sırayla çağırır
- **Deterministik skorlama** — Hem belge hem tahmin skorlaması script bazlıdır (`doc-score.ts`, `forecast-score.ts`), AI yargısı içermez

## Yapılandırma

Tüm ayarlar `src/config.ts` içindedir:

| Ayar | Açıklama | Varsayılan |
|------|----------|------------|
| `outputDir` | PDF'lerin indirildiği kök dizin | `raporlar/` |
| `stateFile` | İndirme geçmişi dosyası | `state/downloaded.json` |
| `requestDelay` | İstekler arası bekleme (ms) | `2000` |
| `browser.headless` | Tarayıcıyı görünmez çalıştır | `true` |
| `browser.timeout` | Sayfa yükleme zaman aşımı (ms) | `60000` |

## Teknik Detaylar

### Danske Bank Scraper Akışı

```
Sayfaya git → Disclaimer modal (YES x2 + Agree) → Cookie consent (Ok to necessary)
→ Kategori linkine tıkla → API response intercept (api5.danskebank.com/subcategory/...)
→ JSON'dan article listesi + published_url (PDF) çıkar → PDF'leri indir
```

### ICBC Yatırım Scraper Akışı

```
Sayfaya git (ignoreHTTPSErrors) → Cookie consent (Tüm Çerezleri Kabul Et)
→ HTML'den PDF linkleri çıkar (a[href$=".pdf"]) → Türkçe tarih parse
→ Playwright context üzerinden PDF indir (TLS sertifika sorunu nedeniyle)
```

### State Dosyası Formatı

```json
{
  "reports": [
    {
      "url": "https://...pdf",
      "title": "FX Forecast Update - ...",
      "downloadedAt": "2026-04-12T...",
      "filePath": "raporlar/danske-bank/fx-forecast-update/2026-03-20_fx-forecast-update-....pdf"
    }
  ]
}
```

### PDF Dosya Adlandırma

```
{tarih}_{baslik-slug}.pdf
```
Örnek: `2026-03-20_fx-forecast-update-energy-shock-steers-global-repricing.pdf`
