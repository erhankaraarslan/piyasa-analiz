#!/usr/bin/env python3
"""
YouTube Transcript Fetcher
Belirtilen YouTube kanallarından son N günün videolarının
Türkçe transkriptlerini çeker ve raporlar/ altına kaydeder.

Kullanım:
  python3 src/transcript/fetch-transcripts.py [--browser chrome|firefox|edge|brave]
"""

import json
import os
import random
import re
import sys
import time
import tempfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

try:
    import scrapetube
except ImportError:
    print("Hata: scrapetube kurulu değil → pip install scrapetube")
    sys.exit(1)

try:
    import yt_dlp
except ImportError:
    print("Hata: yt-dlp kurulu değil → pip install yt-dlp")
    sys.exit(1)

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
OUTPUT_BASE = ROOT_DIR / "raporlar"
STATE_FILE = ROOT_DIR / "state" / "downloaded.json"
DAYS_BACK = 30
BASE_DELAY = (5, 10)    # min/max saniye — her video arası rastgele bekleme
BACKOFF_STEPS = [20, 60, 180]  # 429'da üstel geri çekilme (saniye)

# Tarayıcı seçimi: komut satırı argümanı veya varsayılan
BROWSER = "chrome"
for i, arg in enumerate(sys.argv):
    if arg == "--browser" and i + 1 < len(sys.argv):
        BROWSER = sys.argv[i + 1]

CHANNELS = [
    {
        "name": "Devrim Akyıl",
        "slug": "devrim-akyil",
        "url": "https://www.youtube.com/@DevrimAkyıl",
        "category_slug": "youtube-transcripts",
    },
]


def slugify(text: str) -> str:
    """Türkçe karakterleri normalize edip URL-safe slug üret."""
    text = text.lower()
    tr_map = str.maketrans("ıİğĞüÜşŞöÖçÇ", "iigguussoocc")
    text = text.translate(tr_map)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")[:80]


def parse_relative_date(text: str) -> Optional[datetime]:
    """YouTube'un göreceli tarih metnini ayrıştır ('2 weeks ago', '3 gün önce' vb.).
    Bu sadece cutoff filtresi için kullanılır — kesin tarih yt-dlp'den alınır."""
    now = datetime.now()

    # English long: "X days/weeks/months ago" veya "Streamed X ago"
    m = re.search(
        r"(?:Streamed\s+)?(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago",
        text,
        re.I,
    )
    if m:
        num, unit = int(m.group(1)), m.group(2).lower()
        if unit in ("second", "minute", "hour"):
            return now
        if unit == "day":
            return now - timedelta(days=num)
        if unit == "week":
            return now - timedelta(weeks=num)
        if unit == "month":
            return now - timedelta(days=num * 30)
        if unit == "year":
            return now - timedelta(days=num * 365)

    # English short: "1d ago", "2w ago", "3mo ago", "1y ago"
    m = re.search(r"(\d+)\s*(s|m|h|d|w|mo|y)\s+ago", text, re.I)
    if m:
        num, unit = int(m.group(1)), m.group(2).lower()
        if unit in ("s", "m", "h"):
            return now
        if unit == "d":
            return now - timedelta(days=num)
        if unit == "w":
            return now - timedelta(weeks=num)
        if unit == "mo":
            return now - timedelta(days=num * 30)
        if unit == "y":
            return now - timedelta(days=num * 365)

    # Turkish: "X gün/hafta/ay önce"
    m = re.search(
        r"(\d+)\s+(saniye|dakika|saat|gün|hafta|ay|yıl)\s+önce", text, re.I
    )
    if m:
        num, unit = int(m.group(1)), m.group(2).lower()
        if unit in ("saniye", "dakika", "saat"):
            return now
        if unit == "gün":
            return now - timedelta(days=num)
        if unit == "hafta":
            return now - timedelta(weeks=num)
        if unit == "ay":
            return now - timedelta(days=num * 30)
        if unit == "yıl":
            return now - timedelta(days=num * 365)

    return None


def parse_upload_date(date_str: str) -> Optional[datetime]:
    """yt-dlp'nin upload_date alanını (YYYYMMDD) datetime'a çevir."""
    if not date_str or len(date_str) != 8:
        return None
    try:
        return datetime.strptime(date_str, "%Y%m%d")
    except ValueError:
        return None


# ── State yönetimi ──────────────────────────────────────────────


def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {"reports": []}


def save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(
        json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def is_downloaded(state: dict, video_url: str) -> bool:
    return any(r["url"] == video_url for r in state["reports"])


# ── yt-dlp ile transkript çekme ─────────────────────────────────


def _parse_vtt(vtt_text: str) -> str:
    """WebVTT formatını düz metne çevir."""
    lines = []
    for line in vtt_text.splitlines():
        line = line.strip()
        # Timestamp satırlarını, boş satırları ve WEBVTT header'ını atla
        if not line or line.startswith("WEBVTT") or line.startswith("Kind:") or line.startswith("Language:"):
            continue
        if re.match(r"^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->", line):
            continue
        if re.match(r"^\d+$", line):
            continue
        # HTML tag'lerini temizle
        line = re.sub(r"<[^>]+>", "", line)
        if line:
            lines.append(line)
    # Ardışık tekrarları kaldır
    deduped = []
    for line in lines:
        if not deduped or line != deduped[-1]:
            deduped.append(line)
    return "\n".join(deduped)


def _parse_srv1(xml_text: str) -> str:
    """srv1 (XML) altyazı formatını düz metne çevir."""
    root = ET.fromstring(xml_text)
    texts = []
    for elem in root.findall(".//text"):
        if elem.text and elem.text.strip():
            texts.append(elem.text.strip())
    return "\n".join(texts)


def fetch_transcript(video_id: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """yt-dlp ile Türkçe altyazı çek + Türkçe başlık + upload_date al.
    (transcript, localized_title, upload_date_YYYYMMDD) döner."""
    with tempfile.TemporaryDirectory() as tmpdir:
        out_tpl = os.path.join(tmpdir, "%(id)s")
        opts = {
            "cookiesfrombrowser": (BROWSER,),
            "writeautomaticsub": True,
            "writesubtitles": True,
            "subtitleslangs": ["tr"],
            "subtitlesformat": "vtt/srv1/best",
            "skip_download": True,
            "outtmpl": out_tpl,
            "quiet": True,
            "no_warnings": True,
            "socket_timeout": 15,
            "extractor_args": {"youtube": {"lang": ["tr"]}},
        }

        localized_title = None
        upload_date = None
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(
                    f"https://www.youtube.com/watch?v={video_id}",
                    download=True,
                )
                if info:
                    localized_title = info.get("title")
                    upload_date = info.get("upload_date")  # YYYYMMDD format
        except Exception as e:
            err_str = str(e)
            if "429" in err_str:
                return ("__RATE_LIMITED__", None, None)
            print(f"  ⚠ yt-dlp hatası: {type(e).__name__}")
            return (None, None, None)

        # Üretilen altyazı dosyasını bul
        sub_files = list(Path(tmpdir).glob(f"{video_id}*tr*"))
        if not sub_files:
            sub_files = list(Path(tmpdir).glob("*tr*"))
        if not sub_files:
            return (None, localized_title, upload_date)

        sub_file = sub_files[0]
        content = sub_file.read_text(encoding="utf-8")

        if sub_file.suffix == ".vtt":
            return (_parse_vtt(content), localized_title, upload_date)
        elif sub_file.suffix in (".srv1", ".xml"):
            return (_parse_srv1(content), localized_title, upload_date)
        else:
            return (content, localized_title, upload_date)


# ── Ana akış ────────────────────────────────────────────────────


def main() -> None:
    state = load_state()
    cutoff = datetime.now() - timedelta(days=DAYS_BACK)
    total_new = 0
    total_skipped = 0
    consecutive_429 = 0

    print(f"🔧 Tarayıcı: {BROWSER} (değiştirmek için: --browser firefox)")

    for channel in CHANNELS:
        print(f"\n📺 {channel['name']} kanalı taranıyor...")
        out_dir = OUTPUT_BASE / channel["slug"] / channel["category_slug"]
        out_dir.mkdir(parents=True, exist_ok=True)

        try:
            videos = list(
                scrapetube.get_channel(
                    channel_url=channel["url"], limit=50, sort_by="newest"
                )
            )
        except Exception as e:
            print(f"  ❌ Kanal videoları alınamadı: {e}")
            continue

        print(f"  {len(videos)} video bulundu")

        for video in videos:
            video_id = video["videoId"]
            title_runs = video.get("title", {}).get("runs", [])
            title = (
                title_runs[0].get("text", "")
                if title_runs
                else video.get("title", {}).get("simpleText", f"video-{video_id}")
            )

            published_text = video.get("publishedTimeText", {}).get("simpleText", "")
            approx_date = parse_relative_date(published_text)

            if approx_date is None:
                print(f"  ⚠ Tarih ayrıştırılamadı: '{published_text}' — atlanıyor: {title}")
                continue

            # Sıralama newest-first olduğundan, cutoff'u geçince dur
            if approx_date < cutoff:
                print("  ⏭ 30 günden eski — tarama durduruluyor")
                break

            video_url = f"https://www.youtube.com/watch?v={video_id}"

            if is_downloaded(state, video_url):
                print(f"  ⏭ Zaten indirilmiş: {title}")
                total_skipped += 1
                continue

            print(f"  📝 Transkript çekiliyor: {title}")
            result = fetch_transcript(video_id)
            transcript, localized_title, upload_date_str = result

            # Türkçe başlık varsa tercih et
            if localized_title:
                title = localized_title

            if transcript == "__RATE_LIMITED__":
                if consecutive_429 < len(BACKOFF_STEPS):
                    wait = BACKOFF_STEPS[consecutive_429]
                    consecutive_429 += 1
                    print(f"  ⏳ Rate limit — {wait}s bekleniyor (deneme {consecutive_429}/{len(BACKOFF_STEPS)})...")
                    time.sleep(wait)
                    continue
                else:
                    print(f"\n  ❌ {len(BACKOFF_STEPS)} kez rate limit (429) hatası.")
                    print("     IP bloklanmış olabilir. Daha sonra tekrar deneyin.")
                    break

            consecutive_429 = 0

            if transcript is None:
                print("  ⚠ Transkript yok, atlanıyor")
                continue

            # Kesin tarih: yt-dlp upload_date > göreceli tarih
            exact_date = parse_upload_date(upload_date_str)
            video_date = exact_date if exact_date is not None else approx_date
            if exact_date is not None and exact_date != approx_date:
                print(f"  📅 Gerçek yükleme tarihi: {exact_date.strftime('%Y-%m-%d')} (göreceli tahmin: {approx_date.strftime('%Y-%m-%d')})")

            date_str = video_date.strftime("%Y-%m-%d")
            slug = slugify(title)
            filename = f"{date_str}_{slug}.txt"
            filepath = out_dir / filename

            # Metadata başlığı + transkript metni
            header = (
                f"# {title}\n"
                f"# Kaynak: {video_url}\n"
                f"# Tarih: {date_str}\n"
                f"# Kanal: {channel['name']}\n\n"
            )
            filepath.write_text(header + transcript, encoding="utf-8")

            # State güncelle
            state["reports"].append(
                {
                    "url": video_url,
                    "title": title,
                    "downloadedAt": datetime.now().isoformat() + "Z",
                    "filePath": str(filepath.resolve()),
                }
            )
            save_state(state)

            total_new += 1
            print(f"  ✅ Kaydedildi: {filename}")

            # Rate limit koruması — rastgele bekleme
            delay = random.uniform(*BASE_DELAY)
            print(f"  ⏱ {delay:.0f}s bekleniyor...")
            time.sleep(delay)

    print(f"\n{'=' * 50}")
    print(f"Toplam: {total_new} yeni transkript, {total_skipped} atlandı")


if __name__ == "__main__":
    main()
