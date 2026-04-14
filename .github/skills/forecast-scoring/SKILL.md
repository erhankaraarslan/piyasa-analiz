---
name: forecast-scoring
description: "Tahmin skorlama analizi. Use when: tahmin skorla, tahmin puanla, forecast skoru hesapla, MAPE hesapla, alpha hesapla, öneri üret, tahmin başarı skoru, hedef yakınlığı. Calculates prediction-level scoring metrics with trailing benchmark alpha and recommendation."
argument-hint: "tahminler.csv dosya yolu"
---

# Tahmin Skorlama

Tahminler raporundaki her bir tahmin satırı için performans skorlaması, alpha hesaplaması ve öneri üretimi yapan skill.

## Ne Zaman Kullanılır
- Tahminler raporu üretildikten sonra tahmin bazında performans değerlendirmesi yapılacağında
- MAPE, hedef yakınlığı, trailing alpha ve öneri hesaplanması gerektiğinde

## Prosedür

### 1. Girdi Doğrulama

Aşağıdaki dosyanın mevcut olduğunu kontrol et:
- `analizler/tahminler.csv`

### 2. Skorlama Script'ini Çalıştır

```bash
npx tsx src/analyzer/forecast-score.ts analizler/tahminler.csv
```

Script otomatik olarak:
- Frankfurter API'den trailing benchmark fiyatları çeker
- Tüm hesaplama sütunlarını üretir
- `analizler/tahmin_skorlari.md` ve `analizler/tahmin_skorlari.csv` dosyalarını oluşturur

### 3. Sütunlar (25 sütun)

| # | Sütun | Tür | Açıklama | Formül |
|---|-------|-----|----------|--------|
| 1 | **Tahmin Tarihi** | Çıkarım | Raporun yayın tarihi | tahminler.csv |
| 2 | **Kurum** | Çıkarım | Raporu yayımlayan kuruluş | tahminler.csv |
| 3 | **Analist** | Çıkarım | Sorumlu analist adı | tahminler.csv |
| 4 | **Format** | Çıkarım | Rapor, Video, Web, Twitter | tahminler.csv |
| 5 | **Varlık** | Çıkarım | Parite veya hisse kodu | tahminler.csv |
| 6 | **Vade** | Çıkarım | Tahmin ufku (+1M, +3M, +6M, +12M) | tahminler.csv |
| 7 | **Hedef Tarihi** | Çıkarım | Spot tarih + vade | tahminler.csv |
| 8 | **Hedef Fiyat** | Çıkarım | Analistin fiyat tahmini | tahminler.csv |
| 9 | **Analiz Tezi** | Çıkarım | Bu tahmin için analistin argümanı | tahminler.csv |
| 10 | **Benchmark** | Hesaplama | FX: aynı parite; hisseler: BIST100 | Otomatik |
| 11 | **Tahmin tarihindeki Fiyat** | Hesaplama | Spot fiyat | tahminler.csv "Spot Fiyat" |
| 12 | **Beklenen Getiri %** | Hesaplama | Ex-ante beklenti | `(Hedef − Spot) / Spot × 100` |
| 13 | **Gerçekleşen Fiyat** | Hesaplama | Hedef tarihindeki piyasa fiyatı | tahminler.csv / script |
| 14 | **Gerçekleşen Getiri %** | Hesaplama | Yalın piyasa getirisi | `(Gerçekleşen − Spot) / Spot × 100` |
| 15 | **Hedef Yön** | Hesaplama | Yukarı / Aşağı / Sabit | `\|Beklenen\| < 0.1% → Sabit` |
| 16 | **Öneri** | Hesaplama | Alpha + RefAlpha tabanlı | Kural sistemi (aşağıda) |
| 17 | **Yön İsabeti** | Hesaplama | 1 veya 0 | Yön doğru mu? |
| 18 | **Hedef Yakınlığı** | Hesaplama | 0-100 skala | `max(0, 100 − MAPE × 10)` |
| 19 | **Tahmin Doğruluğu** | Hesaplama | MAPE bazlı kırılımlı skor | Yön yanlış→0; MAPE<1%→100, 1-3%→75, 3-5%→50, ≥5%→25 |
| 20 | **Error (MAPE)** | Hesaplama | Mutlak yüzde hata | `\|Gerçekleşen − Hedef\| / \|Hedef\| × 100` |
| 21 | **Başarı Skoru** | Hesaplama | Bileşik 0-100 skor + harf notu | Formül aşağıda |
| 22 | **Ref. Beklenen Getiri %** | Hesaplama | Trailing benchmark getirisi | `(Spot_bugün − Spot_(bugün−N_ay)) / Spot_(bugün−N_ay) × 100` |
| 23 | **Ref. Gerçekleşen Getiri %** | Hesaplama | Yalın benchmark piyasa getirisi | FX: `= Gerçekleşen Getiri` (aynı parite) |
| 24 | **Alpha** | Hesaplama | Benchmark'a göre fazla getiri | `Beklenen Getiri − Ref. Beklenen Getiri` |
| 25 | **RefAlpha** | Hesaplama | Normalize edilmiş conviction | `Alpha / max(\|Beklenen Getiri\|, 0.05)` |

### 4. Başarı Skoru Formülü

```
Başarı Skoru = (Yön İsabeti × 100 × 0.40) + (Hedef Yakınlığı × 0.30) + (Alpha Skoru × 0.20) + (Tahmin Doğruluğu × 0.10)
```

**Alpha → 0-100 skalaya normalize:**
- ≥ +10% → 100
- 0% ~ +10% → 50 → 100 (doğrusal)
- -10% ~ 0% → 0 → 50 (doğrusal)
- ≤ -10% → 0

**Harf Notu:**
| Not | Aralık |
|-----|--------|
| A | ≥ 85 |
| B | 70–84 |
| C | 55–69 |
| D | 40–54 |
| F | < 40 |

### 5. Öneri Kural Sistemi

**Adım 1 — Alpha bazlı temel öneri:**

| Koşul | Öneri |
|-------|-------|
| Beklenen > 20% **VE** Alpha > 10% | Strong Buy |
| Beklenen > 10% **VE** Alpha > 5% | Buy |
| Alpha > 5% | Buy |
| Beklenen < -20% **VE** Alpha < -10% | Strong Sell |
| Alpha < -10% | Sell |
| Alpha < -5% | Reduce |
| -5% ≤ Alpha ≤ 5% | Hold |

**Adım 2 — RefAlpha conviction düzeltmesi:**

| RefAlpha | Etki |
|----------|------|
| > +0.5 | Bir kademe yukarı (Hold → Buy, Buy → Strong Buy, vb.) |
| < -0.5 | Bir kademe aşağı (Hold → Reduce, Buy → Hold, vb.) |

**Kademe sırası:** Strong Sell → Sell → Reduce → Hold → Buy → Strong Buy

### 6. Trailing Benchmark (Ref. Beklenen Getiri)

Tahmin tarihinden N ay **önceki** spot fiyat çekilir:
- **FX pariteleri**: Frankfurter API (EUR-bazlı cross rates)
- **BIST hisse senetleri**: Yahoo Finance v8 chart API (ticker.IS formatı)
- **BIST100 endeksi**: Yahoo Finance (XU100.IS)

Hesaplama:
- N = vade süresi (+1M → 1 ay, +3M → 3 ay, vb.)
- FX: `Ref. Beklenen = (Spot_tahminTarihi − Spot_geçmiş) / Spot_geçmiş × 100` (aynı parite trailing)
- Hisseler: `Ref. Beklenen = (BIST100_tahminTarihi − BIST100_geçmiş) / BIST100_geçmiş × 100` (BIST100 trailing)
- Hisseler için Ref. Gerçekleşen Getiri = BIST100'ün hedef tarihindeki getirisi (spot→hedef dönemi)

**Benchmark kuralı:**
- FX pariteleri → benchmark = aynı parite (self-benchmark)
- Hisse senetleri → benchmark = BIST100 (endeks benchmark)

### 7. Çıktı Dosyaları

Script otomatik olarak aşağıdaki dosyaları üretir:
- `analizler/tahmin_skorlari.md`
- `analizler/tahmin_skorlari.csv`

### Önemli Kurallar

1. **Sütun kısıtlaması**: Tabloya yukarıdaki 25 sütun dışında başka sütun EKLEME.
2. **Deterministik**: Skorlama tamamen script bazlı — AI yargısı kullanma, script çıktısını olduğu gibi kullan.
3. **Vadesi dolmamış tahminler**: Hesaplama sütunları "⏳" olarak yazılır.
4. **Trailing veri eksik**: API'den fiyat çekilemezse Ref. Beklenen, Alpha, RefAlpha ve Öneri "—" olur.
5. **Sabit eşiği**: |Beklenen Getiri| < 0.1% → "Sabit" yön.
6. **MAPE denominator**: |Hedef| kullanılır (|Gerçekleşen| değil).
