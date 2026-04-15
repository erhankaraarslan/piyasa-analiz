---
name: dashboard-generation
description: "Dashboard oluşturma. Use when: dashboard üret, dashboard oluştur, HTML rapor, görsel rapor, interaktif dashboard, analiz özeti göster. Generates a self-contained interactive HTML dashboard from scoring CSVs."
argument-hint: "dokuman_skorlari.csv ve tahmin_skorlari.csv dosya yolları"
---

# Dashboard Oluşturma

Doküman ve Tahmin skorlama raporlarından (CSV) interaktif, tek dosyalık HTML dashboard üreten skill.

## Ne Zaman Kullanılır
- doc-scorer ve forecast-scorer tamamlandıktan sonra görsel analiz dashboard'u üretilecekse
- Kullanıcı "dashboard üret", "dashboard oluştur" veya "görsel rapor" dediğinde
- Orchestrator pipeline'ının son adımı olarak

## Prosedür

### 1. Girdi Doğrulama

Aşağıdaki dosyaların mevcut olduğunu kontrol et:
- `analizler/dokuman_skorlari.csv`
- `analizler/tahmin_skorlari.csv`

Bu dosyalar yoksa kullanıcıyı bilgilendir ve önce `doc-scorer` + `forecast-scorer` agent'larının çalıştırılması gerektiğini belirt.

### 2. Generator Script'ini Çalıştır

```bash
node .copilot-temp/gen-dashboard.cjs
```

Script argüman almaz. Proje kökünden çalıştırılmalıdır.

### 3. Çıktı Doğrulama

1. `analizler/dashboard.html` dosyasının oluşturulduğunu doğrula
2. Dosya boyutunun > 100 KB olduğunu kontrol et (CSS + JS + veri gömülü olduğu için beklenen boyut)
3. Dosyanın `<!DOCTYPE html>` ile başladığını kontrol et

## Mimari

Dashboard generator üç dosyadan oluşur (hepsi `.copilot-temp/` altında):

| Dosya | Açıklama |
|-------|----------|
| `gen-dashboard.cjs` | Ana generator — CSV okur, KPI hesaplar, HTML şablon üretir |
| `dashboard-styles.css` | Dark-theme CSS — modal, sticky column, responsive grid |
| `dashboard-browser.js` | Client-side JS — tab, chart (Chart.js CDN), filtre, pagination, modal, linkify |

Generator, CSS ve JS dosyalarını okuyup HTML içine inline gömer → tek dosyalık self-contained çıktı üretir.

## Girdi Dosyaları

| Dosya | Kaynak | İçerik |
|-------|--------|--------|
| `analizler/dokuman_skorlari.csv` | doc-scorer | 16 sütun — belge skoru, isabet oranı, alpha, varsayım etkisi |
| `analizler/tahmin_skorlari.csv` | forecast-scorer | 25 sütun — tahmin skoru, MAPE, alpha, öneri, analist |

## Dashboard İçeriği

### 4 Tab
| Tab | İçerik |
|-----|--------|
| **Genel Bakış** | KPI kartları (belge/tahmin sayısı, ort. skor, isabet oranı) + 4 grafik (skor dağılımı, harf notu, kurum karşılaştırma, zaman serisi) |
| **Belgeler** | Sıralanabilir tablo — tıklanabilir satırlar, tıklanınca modal overlay ile detay (özet, tez, varsayım, risk, alpha, tahmin listesi). YouTube videoları için "YouTube'da Ara" referans linki |
| **Tahminler** | Filtrelenebilir tablo — 16 sütun + genişletilebilir analiz tezi satırı. Öneri filtresi hem hisse (Buy/Sell/Hold) hem FX (Bullish/Bearish/Neutral) terminolojisini destekler |
| **Parite Analizi** | Varlık bazlı kartlar — ortalama skor, isabet oranı, tahmin sayısı |

### KPI Metrikleri
- Toplam belge / tahmin sayısı
- Ortalama Belge Başarı Skoru
- Ortalama Tahmin Başarı Skoru
- Genel İsabet Oranı %

## Kısıtlamalar
- Script **deterministiktir** — çıktıyı manuel değiştirme
- Generator `.cjs` uzantılı (CommonJS) — ESM modül sistemiyle uyumlu çalışır
- Chart.js CDN'den yüklenir — çevrimdışı çalışmada grafikler görünmez
- Dashboard şablonu değiştirilecekse `.copilot-temp/` altındaki üç dosyanın birlikte güncellenmesi gerekir
- **Tüm UI metinleri TÜRKÇE** olmalıdır
