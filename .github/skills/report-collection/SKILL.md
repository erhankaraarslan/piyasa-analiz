---
name: report-collection
description: "Rapor toplama ve scraper geliştirme. Use when: rapor indir, PDF indir, scraper çalıştır, yeni kaynak ekle, yeni scraper oluştur, kategori ekle, Playwright scraping. Downloads investment reports (PDF) from financial institutions and creates new scrapers."
argument-hint: "Kurum adı, URL veya scraper komutu"
---

# Rapor Toplama (Report Collection)

Finans kurumlarının yatırım araştırma raporlarını (PDF) otomatik olarak toplayan ve yeni kaynaklar eklemeyi sağlayan skill.

## Ne Zaman Kullanılır
- Mevcut kaynakların raporlarını indirmek istendiğinde
- Yeni bir kurum/kaynak için scraper oluşturulacağında
- Mevcut bir kaynağa yeni kategori eklenecekken
- Scraper hata verdiğinde debug yapılacakken

## Mimari

### Temel Bileşenler

```
src/
├── index.ts           # Ana giriş: main(), createScraper() factory, downloadWithPlaywright()
├── config.ts          # CONFIG ayarları + SOURCES dizisi
├── types.ts           # Report, ScraperSource, ScraperCategory, DownloadedReport
├── tracker.ts         # Tracker class — state/downloaded.json ile duplicate kontrolü
└── scrapers/
    ├── base-scraper.ts    # BaseScraper abstract class
    └── danske-bank.ts     # DanskeBankScraper (referans implementasyon)
```

### TypeScript Arayüzleri

```typescript
// types.ts
interface Report {
  title: string;      // Rapor başlığı
  url: string;        // Rapor web sayfası URL'i
  date: string;       // Yayın tarihi (YYYY-MM-DD)
  pdfUrl: string;     // PDF indirme URL'i
  source: string;     // Kurum slug'ı
  category: string;   // Kategori slug'ı
}

interface ScraperSource {
  name: string;               // Kurum adı (örn. "Danske Bank")
  slug: string;               // URL-safe slug (örn. "danske-bank")
  categories: ScraperCategory[];
}

interface ScraperCategory {
  name: string;    // Kategori adı (örn. "FX Forecast Update")
  slug: string;    // URL-safe slug (örn. "fx-forecast-update")
  url: string;     // Kategori sayfası URL'i
}

interface DownloadedReport {
  url: string;           // PDF URL (duplicate key)
  title: string;
  downloadedAt: string;  // ISO timestamp
  filePath: string;      // Yerel dosya yolu
}
```

### BaseScraper Abstract Class

Tüm scraper'lar bu class'ı extend eder:

```typescript
// src/scrapers/base-scraper.ts
abstract class BaseScraper {
  protected source: ScraperSource;

  constructor(source: ScraperSource) {
    this.source = source;
  }

  getName(): string;   // source.name döndürür
  getSlug(): string;   // source.slug döndürür

  // Zorunlu implementasyon:
  abstract scrape(browser: Browser, category: ScraperCategory): Promise<Report[]>;
  abstract createContext(browser: Browser): Promise<BrowserContext>;
}
```

### CONFIG Yapısı

```typescript
// src/config.ts
export const CONFIG = {
  outputDir: "raporlar",           // İndirilen PDF'lerin kök klasörü
  stateDir: "state",
  stateFile: "state/downloaded.json",
  requestDelay: 2000,              // İstekler arası bekleme (ms)
  browser: {
    headless: true,
    timeout: 60_000,
  },
} as const;
```

### SOURCES Dizisi

```typescript
export const SOURCES: ScraperSource[] = [
  {
    name: "Kurum Adı",
    slug: "kurum-slug",
    categories: [
      {
        name: "Kategori Adı",
        slug: "kategori-slug",
        url: "https://...",
      },
    ],
  },
];
```

## Prosedürler

### 1. Mevcut Raporları İndir

```bash
npm start
# veya debug (headless: false):
npm run start:debug
```

Çıktı: Her PDF `raporlar/{kurum-slug}/{kategori-slug}/{tarih}_{baslik-slug}.pdf` olarak kaydedilir.

### 2. Yeni Scraper Oluştur

Yeni bir kurum eklemek için adım adım:

**Adım 1 — Hedef siteyi araştır:**
- URL yapısını incele (statik HTML, SPA, API tabanlı)
- PDF linklerinin nasıl sunulduğunu belirle
- Auth/consent gereksinimleri (cookie, disclaimer modal)

**Adım 2 — Scraper dosyasını oluştur:**

`src/scrapers/{kurum-slug}.ts` dosyasını oluştur:

```typescript
import type { Browser, BrowserContext } from "playwright";
import { BaseScraper } from "./base-scraper.js";
import type { Report, ScraperCategory, ScraperSource } from "../types.js";

export class YeniKurumScraper extends BaseScraper {
  constructor(source: ScraperSource) {
    super(source);
  }

  async createContext(browser: Browser): Promise<BrowserContext> {
    return browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...",
      viewport: { width: 1280, height: 800 },
    });
  }

  async scrape(browser: Browser, category: ScraperCategory): Promise<Report[]> {
    const context = await this.createContext(browser);
    const page = await context.newPage();
    const reports: Report[] = [];

    try {
      // 1. Sayfaya git
      await page.goto(category.url, { waitUntil: "domcontentloaded" });

      // 2. Consent/auth handling (varsa)

      // 3. Rapor listesini çıkar
      // Tercih sırası: API intercept > HTML scraping

      // 4. Her rapor için Report objesi oluştur
      reports.push({
        title: "...",
        url: "...",
        date: "YYYY-MM-DD",
        pdfUrl: "...",
        source: this.getSlug(),
        category: category.slug,
      });
    } finally {
      await context.close();
    }

    return reports;
  }
}
```

**Adım 3 — Config'e ekle:**

`src/config.ts` içinde `SOURCES` dizisine yeni kaynak ekle.

**Adım 4 — Factory'e ekle:**

`src/index.ts` içinde `createScraper()` fonksiyonuna yeni case ekle:

```typescript
case "yeni-kurum":
  return new YeniKurumScraper(source);
```

Import'u eklemeyi unutma:
```typescript
import { YeniKurumScraper } from "./scrapers/yeni-kurum.js";
```

**Adım 5 — Test et:**

```bash
npm start
```

### 3. Mevcut Kaynağa Kategori Ekle

`src/config.ts` → ilgili source'un `categories` dizisine yeni giriş ekle. Scraper kodu zaten tüm kategorileri iterate eder.

### 4. Debug / Sorun Giderme

Debug modunda tarayıcı görünür açılır:

```bash
npm run start:debug
```

Yaygın sorunlar:
- **Consent modal atlanamıyor**: `handleConsents()` metodunu güncelle, selector'ları kontrol et
- **API yakalanmıyor**: API URL pattern'ini `page.on("response")` listener'ında düzelt
- **PDF URL bulunamıyor**: HTML fallback selector'larını güncelle
- **Rate limiting**: `CONFIG.requestDelay` değerini artır

## Scraping Stratejileri

### 1. API Intercept (Tercih Edilen)

SPA siteler genellikle arka planda JSON API çağırır. `page.on("response")` ile yakalanır:

```typescript
page.on("response", async (response) => {
  if (response.url().includes("api-pattern")) {
    const data = await response.json();
    // data'dan rapor listesini çıkar
  }
});
// Navigasyonu tetikle (SPA routing)
await page.click("kategori-linki");
```

### 2. HTML Scraping (Fallback)

API yakalanamadığında DOM'dan çıkar:

```typescript
const articles = await page.evaluate(() => {
  const items: { title: string; url: string; date: string }[] = [];
  document.querySelectorAll('a[href*="/article/"]').forEach((a) => {
    // title, url, date çıkar
  });
  return items;
});
```

### 3. PDF İndirme

PDF indirme `downloadWithPlaywright()` fonksiyonunda gerçekleşir. Native `fetch()` tercih edilir:

```typescript
const response = await fetch(report.pdfUrl);
const buffer = Buffer.from(await response.arrayBuffer());
fs.writeFileSync(filePath, buffer);
```

Auth gerektiren sitelerde Playwright download event'i kullanılabilir.

## Duplicate Kontrolü

`Tracker` class'ı `state/downloaded.json` dosyasını yönetir:

- **Key**: `pdfUrl` (URL bazlı)
- `tracker.isDownloaded(url)` → `boolean`
- `tracker.add(report)` → state'e ekle ve kaydet
- Duplike kontrol scraper'da değil, `main()` fonksiyonunda yapılır (newReports filtresi)

## Dosya Adlandırma

İndirilen PDF'ler: `{tarih}_{baslik-slug}.pdf`

```
raporlar/
└── danske-bank/
    └── fx-forecast-update/
        ├── 2025-06-23_fx-forecast-update-june-23-2025.pdf
        ├── 2025-07-22_fx-forecast-update-july-22-2025.pdf
        └── ...
```

## Kısıtlamalar

1. **Rate limiting**: `CONFIG.requestDelay` (2s) ayarına uy — hedef sitelere yük bindirme
2. **Mevcut scraper'ları bozma**: Yeni scraper eklerken mevcut scraper mantığını değiştirme
3. **Tracker'ı manuel düzenleme**: `state/downloaded.json`'ı doğrudan düzenleme — Tracker class'ı yönetir
4. **İçerik analizi YAPMA**: PDF içeriklerini analiz etmek report-analyzer agent'ının işi
5. **ESM imports**: Tüm import'larda `.js` uzantısı kullan (TypeScript ESM modül sistemi)
6. **Strict TypeScript**: `as const`, explicit type annotations
