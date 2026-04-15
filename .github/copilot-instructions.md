Bu proje, finans kurumlarından yatırım raporlarını (PDF) ve YouTube kanallarından transkriptleri otomatik toplayan bir CLI aracıdır. Node.js + TypeScript + Playwright (PDF) ve Python + scrapetube + yt-dlp (transkript) kullanılmıştır.

## README Güncel Tutma

Kod değişikliklerinde aşağıdaki durumlarda `README.md` dosyasını güncelle:

- Yeni bir kurum veya kategori scraper'ı eklendiğinde → "Desteklenen Kaynaklar" tablosunu güncelle
- Yeni bir YouTube kanalı eklendiğinde → "Desteklenen Kaynaklar" tablosunu güncelle
- Proje yapısında yeni dosya/klasör eklendiğinde → "Proje Yapısı" ağacını güncelle
- `src/config.ts` içindeki `CONFIG` değiştiğinde → "Yapılandırma" tablosunu güncelle
- Scraper akışında önemli bir değişiklik olduğunda → "Teknik Detaylar" bölümünü güncelle
- Yeni bir npm script eklendiğinde → "Hızlı Başlangıç" bölümünü güncelle

## Proje Kuralları

- Dil: TypeScript (strict mode, ESM modules)
- Çalıştırma: `tsx` ile doğrudan TS çalıştırılır, build adımı yok
- Scraper'lar `src/scrapers/` altında `BaseScraper` abstract class'ını extend eder
- Her scraper `scrape()` ve `createContext()` metodlarını implement etmelidir
- PDF indirme için mümkünse native `fetch()` tercih edilir, Playwright navigasyonu sadece auth gerektiğinde kullanılır
- Duplicate kontrolü `state/downloaded.json` üzerinden URL bazlı yapılır (PDF + transkript aynı state dosyasını paylaşır)
- İndirilen dosyalar `raporlar/{kurum-slug}/{kategori-slug}/` altına kaydedilir
- YouTube transkriptleri `raporlar/{kanal-slug}/youtube-transcripts/` altına `.txt` olarak kaydedilir
- Analiz çıktıları `analizler/` klasörüne kaydedilir: `belgeler.md/csv` (belge bazlı), `tahminler.md/csv` (tahmin bazlı), `dokuman_skorlari.md/csv` (belge skorlama), `tahmin_skorlari.md/csv` (tahmin skorlama), `dashboard.html` (interaktif dashboard)
- `report-collector` agent'ı `report-collection` skill'ini kullanır — scraper mimarisi veya config değişirse skill'i de güncelle
- `transcript-collector` agent'ı `transcript-collection` skill'ini kullanır — Python script veya kanal listesi değişirse skill'i de güncelle
- `report-analyzer` agent'ı `pdf-analysis` skill'ini kullanır — skill güncellemesi yapılırsa agent tanımını da kontrol et (hem PDF hem transkript analizi kapsar)
- `doc-scorer` agent'ı `doc-scoring` skill'ini kullanır — skorlama formülü değişirse skill ve script'i birlikte güncelle
- `forecast-scorer` agent'ı `forecast-scoring` skill'ini kullanır — tahmin skorlama formülü veya öneri kuralları değişirse skill ve script'i birlikte güncelle
- `dashboard-generator` agent'ı `dashboard-generation` skill'ini kullanır — dashboard şablonu veya veri yapısı değişirse skill'i de güncelle
- `orchestrator` agent'ı `report-collector`, `transcript-collector`, `report-analyzer`, `doc-scorer`, `forecast-scorer` ve `dashboard-generator` agent'larını sırayla çağırır
- Analiz sütunları değiştiğinde `.github/skills/pdf-analysis/SKILL.md` ve `README.md` "Analiz Sütunları" tablosunu güncelle
- Skorlama sütunları değiştiğinde `.github/skills/doc-scoring/SKILL.md`, `src/analyzer/doc-score.ts` ve `README.md` "Belge Skorlama" tablosunu güncelle
- Tahmin skorlama sütunları değiştiğinde `.github/skills/forecast-scoring/SKILL.md`, `src/analyzer/forecast-score.ts` ve `README.md` "Tahmin Skorlama" tablosunu güncelle
- `forecast-check.ts` script çıktısı `forecasts-results.json` olarak kaydedilir — Belgeler'in Tahmin Sapması, Tahminler'in Gerçekleşen Fiyat/Sapma/Yön İsabeti ve Skorlama'nın Alpha sütunları bu dosyadan beslenir
- `doc-score.ts` script çıktısı `dokuman_skorlari.md/csv` olarak kaydedilir — belgeler ve tahminler CSV + forecasts-results.json'dan hesaplanır
- `forecast-score.ts` script çıktısı `tahmin_skorlari.md/csv` olarak kaydedilir — tahminler CSV + Frankfurter API (FX) ve Yahoo Finance API (BIST hisseleri) trailing verisinden hesaplanır
- `forecasts.json` formatında consensus ve forward değerleri de yer alır — rapordaki ilgili satırlardan çıkarılır; hisse senetlerinde sadece forecast12m doldurulur
- FX pariteleri Frankfurter API, BIST hisse senetleri Yahoo Finance v8 chart API (ticker.IS formatı) üzerinden fiyatlanır
- Hisse senedi tahminlerinde benchmark = BIST100 (XU100.IS); FX'te benchmark = aynı parite
- FX pariteleri için öneri terminolojisi: Bullish/Bearish/Neutral (Buy/Sell kullanılmaz). Hisse senetleri için: Buy/Sell/Hold
- Transkript tarihleri yt-dlp'nin `upload_date` metadata alanından alınır (göreceli tarih sadece cutoff filtresi için kullanılır)
- Belge skorlama minimum 5 değerlendirilen tahmin gerektirir; altında ⚠ uyarısı verilir ancak gerçek skor hesaplanır (0'a düşürülmez)
- Belge skorlamada tahmin eşleşmesi kurum+tarih bazlıdır; Tahminler CSV'de `Belge Adı` sütunu mevcutsa kurum+tarih+belge_adı bazlı eşleştirme yapılır
- Alpha verisi yoksa (consensus/forward null) alpha ağırlığı yön ve hedefe dağıtılır (0.50/0.35/0.15)
- "Sabit" tahminler (|Beklenen Getiri| < 0.1%) değerlendirilir, atlanmaz — ±%0.5 toleransla yön isabeti kontrol edilir. Sabit tahminlere "Neutral" (FX) veya "Hold" (hisse) önerisi otomatik atanır
- `forecasts.json` kayıtlarında `institution` ve `documentName` alanları zorunludur — doc-score.ts bu alanlarla eşleştirme yapar
- Tahminler CSV'de `Belge Adı` sütunu zorunludur (14. sütun) — belgeler tablosundaki Belge Adı ile birebir aynı olmalı
- Her transkript benzersiz analiz edilmelidir — şablon/genel metin yasaktır
- Transkriptlerden sözel tahminler (fiyat hedefleri, destek/direnç seviyeleri) çıkarılmalıdır
- TÜM PDF raporlardan tahmin çıkarılmalıdır — sadece son raporlar değil, eski raporlar dahil
- Varsayım Gerçekleşme sadece ardışık raporların cross-reference'ı ile belirlenir — dış kaynak kullanılmaz
