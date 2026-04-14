---
name: transcript-collection
description: "YouTube transkript toplama. Use when: transkript çek, video metni indir, yeni YouTube kanalı ekle, kanal taranıyor. Downloads Turkish transcripts from YouTube channels using scrapetube + yt-dlp."
argument-hint: "Kanal URL veya video ID"
---

# YouTube Transkript Toplama

YouTube kanallarından video transkriptlerini çekip `raporlar/` altına kaydeden skill.

## Ne Zaman Kullanılır
- YouTube kanallarından transkript toplanacağında
- Yeni bir YouTube kanalı kaynak olarak eklenecekse
- Transkript toplama scripti debug edilecekse

## Prosedür

### 1. Bağımlılık Kontrolü

```bash
pip install -r requirements.txt
```

### 2. Transkriptleri Topla

```bash
python3 src/transcript/fetch-transcripts.py
```

Script otomatik olarak:
- `CHANNELS` listesindeki kanalları tarar
- Son 30 günün videolarını listeler (scrapetube)
- Her videonun Türkçe altyazısını çeker (yt-dlp + tarayıcı cookie'leri)
- `state/downloaded.json` ile duplicate kontrolü yapar
- Transkriptleri `raporlar/{kanal-slug}/youtube-transcripts/{tarih}_{slug}.txt` olarak kaydeder

`--browser` parametresi ile tarayıcı seçilebilir (varsayılan: chrome):

```bash
python3 src/transcript/fetch-transcripts.py --browser firefox
```

### 3. Çıktı Formatı

Her transkript dosyası şu yapıdadır:

```
# Video Başlığı
# Kaynak: https://www.youtube.com/watch?v=VIDEO_ID
# Tarih: YYYY-MM-DD
# Kanal: Kanal Adı

transkript metni buraya...
```

### 4. Tarih Ayrıştırma

YouTube göreceli tarih verir ("2 weeks ago", "3 gün önce"). Script bunu tahmini bir tarihe çevirir. Aylık hassasiyetle doğrudur (±birkaç gün).

### 5. Yeni Kanal Ekleme

`src/transcript/fetch-transcripts.py` → `CHANNELS` listesine:

```python
CHANNELS = [
    {
        "name": "Kanal Adı",
        "slug": "kanal-slug",
        "url": "https://www.youtube.com/@KanalHandle",
        "category_slug": "youtube-transcripts",
    },
]
```

### Önemli Kurallar

1. **Duplicate kontrolü**: `state/downloaded.json` paylaşımlıdır (PDF'ler + transkriptler aynı dosyada). URL bazlı kontrol yapılır.
2. **yt-dlp**: Tarayıcı cookie'lerini otomatik okur (`--cookies-from-browser`). Manuel cookie export gerekmez.
3. **Tarayıcı seçimi**: macOS'ta Safari erişimi engellidir — Chrome veya Firefox kullanın.
4. **Rate limit**: Videolar arası 5–10 saniye rastgele bekleme. 429'da üstel geri çekilme (20s → 60s → 180s). 3 ardışık 429'da script durur.
5. **Transkripti olmayan videolar** atlanır, hata vermez.
6. **Analiz bu skill'in işi DEĞİL** — transkript analizi `report-analyzer` agent'ı + `pdf-analysis` skill'i tarafından yapılır.
