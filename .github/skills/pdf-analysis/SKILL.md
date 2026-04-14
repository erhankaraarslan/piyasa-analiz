---
name: pdf-analysis
description: "Yatırım raporları PDF analizi. Use when: PDF rapor analiz et, rapor özetle, yatırım tezi çıkar, risk analizi yap, FX rapor incele, Danske Bank rapor analiz. Extracts text from PDF investment reports and produces structured analysis tables."
argument-hint: "PDF dosya yolu veya raporlar/ klasör yolu"
---

# PDF Rapor Analizi

İndirilen yatırım araştırma raporlarını (PDF) yapılandırılmış tabloya dönüştüren analiz skill'i.

## Ne Zaman Kullanılır
- İndirilen PDF raporları analiz etmek istendiğinde
- Rapor özeti, yatırım tezi veya risk analizi çıkarmak gerektiğinde
- Birden fazla raporu karşılaştırmalı tablo haline getirmek istendiğinde

## Prosedür

### 1. PDF Metin Çıkarma

Önce hedef PDF'den text çıkar. Terminalde şu komutu çalıştır:

```bash
# Tek dosya:
npx tsx src/analyzer/extract-text.ts raporlar/danske-bank/fx-forecast-update/<dosya>.pdf

# Klasördeki tüm PDF'ler:
npx tsx src/analyzer/extract-text.ts raporlar/danske-bank/fx-forecast-update/
```

### 2. Analiz Yap

Çıkarılan metni aşağıdaki analiz şablonuna göre incele. **Her alan için rapordaki orijinal cümleyi/referansı belirt.** Raporda bulunmayan bilgi için "Raporda belirtilmemiştir" yaz — kesinlikle uydurma.

### Analiz Sütunları

| Sütun | Açıklama | Kaynak |
|-------|----------|--------|
| **Belge Tarihi** | Raporun yayın tarihi | PDF kapak/başlık veya dosya adından |
| **Kurum** | Yayınlayan kurum | Zaten biliniyor (Danske Bank vb.) |
| **Analistler** | Raporun yazar(lar)ı | PDF kapak sayfası veya son sayfa |
| **Format** | Belge formatı | Her zaman "PDF" |
| **Belge Adı** | Raporun tam adı | PDF başlığı |
| **Özet Metin** | 3-5 cümlelik özet | Ana bulgulardan sentezle |
| **Yatırım Tezi** | Raporun temel önerisi/tahmini | "Beklentimiz/Tahminimiz" gibi ifadelerden çıkar |
| **Varsayımlar** | Tezin dayandığı varsayımlar listesi | "Assuming/If/Given that" gibi ifadelerden çıkar |
| **Risk Analizi** | Raporda belirtilen riskler | "Risk/Downside/Upside risk" bölümlerinden çıkar |
| **Varsayım Gerçekleşme** | Her varsayımın doğrulanma durumu | Sonraki rapordan cross-reference (Faz 2) |
| **Tahmin Sapması** | +1M forecast vs gerçekleşen, pip cinsinden | forecast-check.ts script çıktısı (Faz 2) |

### Önemli Kurallar

1. **Halüsinasyon yasak**: Raporda olmayan bilgiyi UYDURMA. Bulunamazsa "Raporda belirtilmemiştir" yaz.
2. **Kaynak göster**: Her sütun için PDF'deki orijinal ifadeyi parantez içinde referans ver.
3. **Dil**: Tüm analiz çıktıları **Türkçe** yazılmalıdır. Özet Metin, Yatırım Tezi, Varsayımlar ve Risk Analizi alanları Türkçeye çevrilerek yazılır. Orijinal İngilizce ifadeler parantez içinde `(Ref: "...")` olarak korunur.
4. **Çoklu rapor**: Birden fazla rapor analiz edilirken her rapor tabloda ayrı satır olur.
5. **Sütun kısıtlaması**: Tabloya tanımlanan sütunlar dışında başka sütun EKLEME. Ek bilgi (forecast tabloları, tema özeti vb.) gerekiyorsa tablonun altında ayrı bölüm olarak yaz, sütun olarak değil.

### 3. Çıktı Formatı

İki ayrı rapor üret: **Belgeler** (belge düzeyinde genel analiz) ve **Tahminler** (tahmin düzeyinde granüler izleme).

---

#### Rapor 1: Belgeler (`analizler/belgeler.md` / `.csv`)

Belge bazında genel analiz. Her rapor bir satırdır.

**Markdown — Tek rapor (dikey tablo):**

```markdown
# Belgeler — <Kurum> (<Tarih>)

| Alan | Değer |
|------|-------|
| Belge Tarihi | ... |
| Kurum | ... |
| Analistler | ... |
| Format | PDF |
| Belge Adı | ... |
| Özet Metin | ... |
| Yatırım Tezi | ... |
| Varsayımlar | 1. ... 2. ... 3. ... |
| Risk Analizi | 1. ... 2. ... |
| Varsayım Gerçekleşme | 1. ✅ ... 2. ❌ ... |
| Tahmin Sapması | EUR/USD +1M: +50 pip (%0.43); EUR/SEK +1M: -20 pip (%0.18) |
```

**Markdown — Çoklu rapor (yatay tablo):**

```markdown
| Alan | Rapor 1 | Rapor 2 | ... |
|------|---------|---------|-----|
| Belge Tarihi | ... | ... | ... |
| ...  | ... | ... | ... |
```

**CSV:**

```csv
"Belge Tarihi","Kurum","Analistler","Format","Belge Adı","Özet Metin","Yatırım Tezi","Varsayımlar","Risk Analizi","Varsayım Gerçekleşme","Tahmin Sapması"
"2026-03-20","Danske Bank","...","PDF","...","...","...","...","...","...","..."
```

---

#### Rapor 2: Tahminler (`analizler/tahminler.md` / `.csv`)

Tahmin bazında granüler izleme. Her satır = bir rapordaki bir varlık × bir vade tahmini.

**Tahminler Sütunları (13 sütun):**

| # | Sütun | Açıklama | Kaynak |
|---|-------|----------|--------|
| 1 | **Tahmin Tarihi** | Raporun yayın tarihi | PDF kapak/başlık veya dosya adından |
| 2 | **Kurum** | Yayınlayan kurum | Zaten biliniyor (Danske Bank vb.) |
| 3 | **Analist** | Pariteyi analiz eden kişi (ad soyad) | Her parite sayfasının **alt kısmındaki** imza satırından (örn. "Mohamad Al-Saraf, Associate, moals@danskebank.dk" → "Mohamad Al-Saraf"). Sadece isim yazılır, unvan/email yazılmaz. Bulunamazsa "Ekip" yaz. |
| 4 | **Format** | Belge formatı | Her zaman "PDF" (ileride farklı formatlar eklenebilir) |
| 5 | **Varlık** | Parite adı | Forecast tablosundan (örn. EUR/USD) |
| 6 | **Vade** | Tahmin vadesi | +1M, +3M, +6M, +12M |
| 7 | **Hedef Tarihi** | Tahmin Tarihi + Vade süresi | Hesaplama: date + vade |
| 8 | **Spot Fiyat** | Raporun yayın tarihindeki cari kur | Raporun forecast tablosundaki "Spot" sütunundan |
| 9 | **Hedef Fiyat** | Tahmin edilen kur | Raporun forecast tablosundaki ilgili vade sütunundan |
| 10 | **Analiz Tezi** | Varlığa özel yorum/beklenti | Rapordaki parite bazlı yorumdan (yoksa genel tez) |
| 11 | **Gerçekleşen Fiyat** | Hedef tarihindeki gerçek kur | forecasts-results.json veya cross-report |
| 12 | **Sapma (pip)** | Hedef − Gerçekleşen, pip cinsinden | forecasts-results.json |
| 13 | **Yön İsabeti** | Spot→Hedef yönü ile Spot→Gerçekleşen yönü aynı mı? | ✅ aynı yön / ❌ ters yön / ⏳ henüz veri yok |

**Yön İsabeti Hesaplama:**
- Hedef > Spot ise yükseliş beklentisi; Gerçekleşen > Spot ise gerçekleşen yükseliş → ✅
- Hedef < Spot ise düşüş beklentisi; Gerçekleşen < Spot ise gerçekleşen düşüş → ✅
- Yön uyumsuzluğu → ❌
- Gerçekleşen Fiyat henüz yoksa → ⏳

**Markdown:**

```markdown
# Tahminler — <Kurum> (<Tarih Aralığı>)

| Tahmin Tarihi | Kurum | Analist | Format | Varlık | Vade | Hedef Tarihi | Spot Fiyat | Hedef Fiyat | Analiz Tezi | Gerçekleşen Fiyat | Sapma (pip) | Yön İsabeti |
|---------------|-------|---------|--------|--------|------|--------------|------------|-------------|-------------|-------------------|-------------|-------------|
| 2025-06-23 | Danske Bank | Mohamad Al-Saraf | PDF | EUR/USD | +1M | 2025-07-23 | 1.1500 | 1.1600 | ABD doları zayıflama beklentisi | 1.1550 | -50 | ✅ |
| 2025-06-23 | Danske Bank | Mohamad Al-Saraf | PDF | EUR/USD | +3M | 2025-09-23 | 1.1500 | 1.1800 | ... | 1.1750 | -50 | ✅ |
| 2025-06-23 | Danske Bank | Stefan Mellin | PDF | EUR/SEK | +1M | 2025-07-23 | 11.05 | 11.10 | ... | 11.08 | -20 | ✅ |
```

**CSV:**

```csv
"Tahmin Tarihi","Kurum","Analist","Format","Varlık","Vade","Hedef Tarihi","Spot Fiyat","Hedef Fiyat","Analiz Tezi","Gerçekleşen Fiyat","Sapma (pip)","Yön İsabeti"
"2025-06-23","Danske Bank","Mohamad Al-Saraf","PDF","EUR/USD","+1M","2025-07-23","1.1500","1.1600","ABD doları zayıflama beklentisi","1.1550","-50","✅"
```

---

### 4. Kaydet

Çıktıları `analizler/` klasörüne kaydet (otomatik oluştur).
- Belgeler: `analizler/belgeler.md` ve `.csv`
- Tahminler: `analizler/tahminler.md` ve `.csv`

---

## Faz 2: Varsayım Gerçekleşme & Tahmin Sapması

Faz 1 tamamlandıktan sonra, ardışık raporları cross-reference ederek Faz 2 sütunlarını doldur.

### Faz 2 Prosedürü

#### Adım 1: Forecast verisi çıkar

Her rapordan **tüm paritelerin** ve **tüm vadelerin** forecast tablosunu çıkar ve `analizler/forecasts.json` dosyasına kaydet. Rapordaki her parite için ayrı satır oluştur:

```json
[
  { "date": "2025-06-23", "pair": "EUR/USD", "spot": 1.15, "forecast1m": 1.16, "forecast3m": 1.18, "forecast6m": 1.20, "forecast12m": 1.22, "consensus1m": 1.14, "consensus3m": 1.15, "consensus6m": 1.15, "consensus12m": 1.10, "forward1m": 1.15, "forward3m": 1.16, "forward6m": 1.17, "forward12m": 1.18 },
  { "date": "2025-06-23", "pair": "EUR/SEK", "spot": 11.05, "forecast1m": 11.10, "forecast3m": 11.20, "forecast6m": 11.30, "forecast12m": 11.40, "consensus1m": 11.10, "consensus3m": 11.20, "consensus6m": 11.30, "consensus12m": 11.40, "forward1m": 11.05, "forward3m": 11.10, "forward6m": 11.15, "forward12m": 11.20 }
]
```

- `date`: Raporun yayın tarihi (YYYY-MM-DD)
- `pair`: Parite adı (EUR/USD, EUR/SEK, EUR/NOK, EUR/DKK, EUR/GBP, EUR/JPY, EUR/CHF, EUR/PLN, EUR/CZK, EUR/HUF, USD/JPY, USD/CAD, USD/CNY, USD/TRY)
- `spot`: Rapordaki spot kur
- `forecast1m` / `forecast3m` / `forecast6m` / `forecast12m`: Kurum tahmin değerleri (+1M, +3M, +6M, +12M)
- `consensus1m` / `consensus3m` / `consensus6m` / `consensus12m`: Consensus (piyasa uzlaşısı) değerleri — rapordaki "Consensus" satırından
- `forward1m` / `forward3m` / `forward6m` / `forward12m`: Forward kur değerleri — rapordaki "Forward" satırından
- Raporda ilgili vade veya satır yoksa `null` gir
- Raporda forecast tablosunda bulunmayan pariteler dahil edilmez

#### Adım 2: Tahmin sapmasını hesapla (script)

```bash
npx tsx src/analyzer/forecast-check.ts analizler/forecasts.json
```

Script:
- **Cross-report**: Rapor N'in +1M tahmini → Rapor N+1'in spotu ile karşılaştırılır
- **Hibrit API**: Son raporun tahmini → frankfurter.app API'den güncel kur ile karşılaştırılır
- Çıktı: `analizler/forecasts-results.json` + konsol tablosu

#### Adım 3: Varsayım gerçekleşme değerlendir (AI)

Her rapor çifti (N → N+1) için:
1. Rapor N'in varsayımlarını listele
2. Rapor N+1'in metninde bu varsayımın gerçekleşip gerçekleşmediğine dair kanıt ara
3. Her varsayım için durum belirle:
   - ✅ **Gerçekleşti** — sonraki rapor doğruluyor + kanıt cümlesi
   - ❌ **Gerçekleşmedi** — sonraki rapor aksini gösteriyor + kanıt cümlesi
   - ⚠️ **Kısmen** — kısmen doğru, kısmen değişmiş + kanıt cümlesi
   - ⏳ **Değerlendirilemez** — son rapor için henüz karşılaştırma verisi yok

Format:
```
1. "ABD resesyon risklerinin azalması devam ediyor" → ✅ Gerçekleşti (Ref: Temmuz raporu "risk appetite stabilised further", s.2)
2. "NOK'a petrol desteği geçici" → ✅ Gerçekleşti (Ref: "NOK pressured by falling oil prices", s.2)
```

#### Adım 4: Sonuçları raporlara yaz

**Belgeler raporu:** `forecasts-results.json` dosyasından her rapor için **tüm paritelerin** sapma verisini al ve Tahmin Sapması sütununa yaz:
```
EUR/USD +1M: +100 pip (%0.85); EUR/SEK +1M: -200 pip (%1.80); EUR/NOK +1M: +50 pip (%0.43), kaynak: cross-report
```

**Tahminler raporu:** `forecasts-results.json` dosyasından her rapor × parite × vade kombinasyonu için ayrı satır oluştur. Gerçekleşen Fiyat, Sapma (pip) ve Yön İsabeti sütunlarını script çıktısından doldur. Rapordaki parite bazlı yorumu Analiz Tezi sütununa yaz.

### Faz 2 Kuralları

1. **Varsayım gerçekleşme yalnızca sonraki rapordan çıkarılır** — dış haber, piyasa verisi kullanma.
2. **Tahmin sapması script çıktısından alınır** — elle hesaplama yapma.
3. **Son rapor için**: Varsayım Gerçekleşme = ⏳ Değerlendirilemez, Tahmin Sapması = API'den (frankfurter.app).
4. **Kanıt göster**: Her gerçekleşme değerlendirmesinde sonraki rapordan referans cümlesi ver.

---

## YouTube Transkript Analizi

YouTube transkriptleri PDF raporlarla aynı analiz şablonuna tabi tutulur, ancak metin çıkarma adımı farklıdır ve sözel tahminler AI tarafından yapılandırılır.

### Transkript Metin Okuma

PDF'lerde `extract-text.ts` kullanılırken, transkriptler doğrudan `.txt` dosyası olarak `raporlar/{kanal}/youtube-transcripts/` altında mevcuttur. Metin çıkarma adımı gerekmez — dosyayı doğrudan oku.

Dosya başlığından metadata çıkar:
```
# Video Başlığı         → Belge Adı
# Kaynak: URL            → Kaynak referansı
# Tarih: YYYY-MM-DD      → Belge Tarihi
# Kanal: Kanal Adı       → Kurum
```

### Belgeler Raporu İçin Transkript Analizi

Transkriptler Belgeler tablosuna PDF'lerle aynı 11 sütunla eklenir. Farklılıklar:

| Sütun | PDF | Transkript (Video) |
|-------|-----|---------------------|
| **Format** | PDF | **Video** |
| **Kurum** | Danske Bank vb. | Kanal adı (ör. "Devrim Akyıl") |
| **Analistler** | Rapor yazarları | Kanal sahibi (ör. "Devrim Akyıl") |
| **Belge Adı** | PDF başlığı | Video başlığı |
| **Özet Metin** | Rapordan sentez | Transkriptten sentez |
| **Yatırım Tezi** | Yapısal analiz | Sözel öneriler/beklentiler |
| **Varsayımlar** | "Assuming/If" ifadeleri | "Eğer…olursa", "…varsayarsak" gibi ifadeler |
| **Risk Analizi** | "Risk/Downside" bölümleri | Uyarılar, "dikkat edilmesi gereken", "risk" ifadeleri |

### Sözel Tahminlerin Çıkarılması (Tahminler Raporu İçin)

Transkriptte geçen sözel tahminleri tespit et ve yapılandır. Örnekler:
- "Dolar 38'e gider" → Varlık: USD/TRY, Hedef: 38.00
- "Euro/dolar 1.15'e düşer" → Varlık: EUR/USD, Hedef: 1.15
- "Altın 2500'ü görür" → Varlık: XAU/USD, Hedef: 2500
- "BIST 10.000'i test eder" → Varlık: BIST100, Hedef: 10000

**Vade tayini** (sözel ifadelerden):
| İfade | Vade |
|-------|------|
| "bu hafta", "önümüzdeki hafta", "yakın vadede" | +1M |
| "önümüzdeki birkaç ay", "2-3 ay içinde" | +3M |
| "yaz sonuna kadar", "6 ay içinde" | +6M |
| "yıl sonunda", "seneye", "uzun vadede" | +12M |
| Vade belirsizse | +3M (varsayılan) |

**Spot fiyat**: Transkriptte geçiyorsa oradan al ("şu an 37.5'te işlem görüyor"). Geçmiyorsa `forecasts.json`'a `null` olarak gir — `forecast-check.ts` API'den çeker.

**Kurallar**:
1. Sadece **net sayısal tahmin** içeren ifadeleri çıkar — "yükselir", "düşer" gibi yönsüz ifadeler yeterli DEĞİL.
2. Her tahmin için **orijinal Türkçe cümleyi referans göster**: `(Ref: "dolar 38'i görür diye düşünüyorum")`
3. Belirsiz veya ucu açık ifadeler için tahmin oluşturma — "Raporda belirtilmemiştir" yaz.
4. `forecasts.json`'a eklenen transkript tabanlı kayıtlarda `consensus` ve `forward` alanları `null` olacak — transkriptte bu veriler olmaz.

### forecasts.json Transkript Kaydı Formatı

```json
{
  "date": "2026-03-25",
  "pair": "USD/TRY",
  "spot": 37.5,
  "forecast1m": 38.0,
  "forecast3m": null,
  "forecast6m": null,
  "forecast12m": null,
  "consensus1m": null,
  "consensus3m": null,
  "consensus6m": null,
  "consensus12m": null,
  "forward1m": null,
  "forward3m": null,
  "forward6m": null,
  "forward12m": null
}
```

### Birleştirme Kuralları

- Transkript analizleri **aynı** `belgeler.md/csv` ve `tahminler.md/csv` dosyalarına eklenir (ayrı dosya değil)
- PDF ve Video satırları `Format` sütunuyla ayırt edilir
- `forecasts.json` tek dosyadır — hem PDF hem transkript tahminleri içerir
- `forecast-check.ts` parite bazlı çalışır; TRY çiftleri frankfurter.app'te desteklenmiyorsa ilgili satırlar Gerçekleşen/Sapma alanları "—" olur
- Skorlama scriptleri (`doc-score.ts`, `forecast-score.ts`) Format="Video" kaydını otomatik olarak kapsar
