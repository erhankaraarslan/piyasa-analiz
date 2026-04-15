---
name: doc-scoring
description: "Belge skorlama analizi. Use when: belge skorla, rapor puanla, isabet oranı hesapla, alpha hesapla, başarı skoru, performans analizi. Calculates document-level scoring metrics from Belgeler and Tahminler reports."
argument-hint: "Belgeler CSV, Tahminler CSV ve forecasts-results.json dosya yolları"
---

# Belge Skorlama

Belgeler ve Tahminler raporlarındaki verileri kullanarak belge bazında performans skorlaması yapan skill.

## Ne Zaman Kullanılır
- Belgeler ve Tahminler raporları üretildikten sonra belge bazında performans değerlendirmesi yapılacağında
- İsabet oranı, alpha, varsayım doğruluğu gibi metriklerin hesaplanması gerektiğinde

## Prosedür

### 1. Girdi Doğrulama

Aşağıdaki dosyaların mevcut olduğunu kontrol et:
- `analizler/belgeler.csv`
- `analizler/tahminler.csv`
- `analizler/forecasts-results.json`

### 2. Skorlama Script'ini Çalıştır

```bash
npx tsx src/analyzer/doc-score.ts analizler/belgeler.csv analizler/tahminler.csv analizler/forecasts-results.json
```

### 3. Skorlama Sütunları (17 sütun)

| # | Sütun | Tür | Açıklama | Kaynak |
|---|-------|-----|----------|--------|
| 1 | **Belge Tarihi** | Çıkarım | Raporun yayın tarihi | Belgeler CSV |
| 2 | **Kurum** | Çıkarım | Yayınlayan kuruluş | Belgeler CSV |
| 3 | **Analistler** | Çıkarım | Sorumlu analistler | Belgeler CSV |
| 4 | **Format** | Çıkarım | Kaynak türü (PDF/Video) | Belgeler CSV |
| 5 | **Özet Metin** | Çıkarım | Ana mesaj ve bulgular | Belgeler CSV |
| 6 | **Belge Adı** | Çıkarım | Raporun tam başlığı | Belgeler CSV |
| 7 | **Yatırım Tezi** | Çıkarım | Temel argüman ve beklenti | Belgeler CSV |
| 8 | **Varsayımlar & Gerçekleşme** | Çıkarım | Varsayımlar ve gerçekleşme notları (✅/❌/⚠️/⏳) | Belgeler CSV "Varsayım Gerçekleşme" |
| 9 | **Varsayım Etkisi** | Hesaplama | Yüksek (≥%80) / Orta (%50-79) / Düşük (<%50) | `(✅×1 + ⚠️×0.5) / (✅+❌+⚠️)` |
| 10 | **Risk Analizi** | Çıkarım | Başlıca riskler | Belgeler CSV |
| 11 | **Kaynak** | Çıkarım | Video için YouTube URL, PDF için boş | Belgeler CSV |
| 12 | **Varlık Sayısı** | Hesaplama | Belgede tahmin edilen farklı parite sayısı | Tahminler CSV unique Varlık count (kurum+tarih bazlı eşleşme) |
| 13 | **Tahmin Sayısı** | Hesaplama | Varlık × vade toplam tahmin sayısı | Tahminler CSV row count (kurum+tarih bazlı eşleşme) |
| 14 | **İsabet Oranı %** | Hesaplama | Yön isabeti doğru olan tahminlerin oranı | `✅ / (✅ + ❌)` — ⏳ hariç |
| 15 | **Ort. Alpha (Consensus)** | Hesaplama | Consensus'a göre ortalama alpha (%) | `ort(|consensus−actual| − |forecast−actual|) / spot × 100` |
| 16 | **Ort. Alpha (Forward)** | Hesaplama | Forward'a göre ortalama alpha (%) | `ort(|forward−actual| − |forecast−actual|) / spot × 100` |
| 17 | **Belge Başarı Skoru** | Hesaplama | Ağırlıklı 0-100 skor + harf notu | Formül aşağıda |

### 4. Belge Başarı Skoru Formülü

**Alpha verisi varken:**
```
Belge Başarı Skoru = Yön İsabeti × 0.40 + Hedef Yakınlığı × 0.30 + Alpha Skoru × 0.20 + Varsayım Doğruluğu × 0.10
```

**Alpha verisi yokken (consensus/forward null):**
```
Belge Başarı Skoru = Yön İsabeti × 0.50 + Hedef Yakınlığı × 0.35 + Varsayım Doğruluğu × 0.15
```

**Minimum örneklem eşiği:** Belge skorlaması için en az **5 değerlendirilen tahmin** gereklidir. 5'in altında değerlendirilen tahmin varsa **gerçek skor hesaplanır** ancak ⚠ uyarısı ile işaretlenir (skor 0'a düşürülmez).

**Belge-Tahmin eşleştirmesi:** Tahminler CSV'de `Belge Adı` sütunu mevcutsa kurum+tarih+belge_adı bazlı eşleştirme yapılır. Yoksa kurum+tarih bazlı fallback uygulanır. Bu özellikle aynı gün+kurum altında birden fazla belge olduğunda (ör. Devrim Akyıl YouTube videoları) çakışmayı önler.

**Bileşen dönüşümleri:**

| Bileşen | Ağırlık | 0-100 Dönüşüm |
|---------|---------|----------------|
| **Yön İsabeti** | %40 | `✅/(✅+❌) × 100` |
| **Hedef Yakınlığı** | %30 | Yüzdesel sapma → ters orantı (0-1%=100, 1-3%=100→50, 3-7%=50→20, 7-15%=20→0, 15%+=0) |
| **Alpha Skoru** | %20 | Yüzdesel alpha → (≥+2%=100, 0~+2%=50→100, -2%~0=20→50, ≤-2%=0→20) |
| **Varsayım Doğruluğu** | %10 | Varsayım Etkisi'nin sayısal karşılığı (0-100) |

**Harf Notu:**
| Not | Aralık |
|-----|--------|
| A | ≥ 85 |
| B | 70–84 |
| C | 55–69 |
| D | 40–54 |
| F | < 40 |

### 5. Alpha Hesaplama

Her iki alpha türü de hesaplanır:

**Alpha vs Consensus** = `|Consensus − Gerçekleşen| − |Kurum Tahmini − Gerçekleşen|`
- Pozitif → Kurum consensus'dan daha isabetli (rakipleri yenmiş)
- Negatif → Kurum consensus'dan daha başarısız

**Alpha vs Forward** = `|Forward − Gerçekleşen| − |Kurum Tahmini − Gerçekleşen|`
- Pozitif → Kurum forward'dan daha isabetli (piyasayı yenmiş)
- Negatif → Kurum forward'dan daha başarısız

Alpha hesaplaması `forecasts-results.json` içindeki `alpha_vs_consensus_pct` ve `alpha_vs_forward_pct` alanlarından okunur. Yüzdesel alpha spot fiyata normalize edildiği için tüm pariteler arası karşılaştırılabilir.

> **Önemli**: JPY pariteleri için 1 pip = 0.01 (×100), diğer pariteler için 1 pip = 0.0001 (×10000). Pip alanları da mevcuttur (`alpha_vs_consensus_pips`, `alpha_vs_forward_pips`) ama skorlama yüzdesel alanları kullanır.

### 6. Çıktı Formatı

Script otomatik olarak aşağıdaki dosyaları üretir:
- `analizler/skorlama.md`
- `analizler/skorlama.csv`

### Önemli Kurallar

1. **Sütun kısıtlaması**: Tabloya yukarıdaki 17 sütun dışında başka sütun EKLEME.
2. **Deterministik**: Skorlama tamamen script bazlı — AI yargısı kullanma, script çıktısını olduğu gibi kullan.
3. **Son rapor**: Eğer belgenin tahminleri henüz değerlendirilmemişse (tüm ⏳), Belge Başarı Skoru = "⏳".
4. **Consensus/Forward eksik**: Alpha verisi yoksa ilgili sütun "—" olur, Başarı Skoru'nda alpha ağırlığı diğerlerine dağıtılır.
