#!/usr/bin/env python3
"""
Tahminler raporu oluşturucu.
forecasts-results.json → analizler/tahminler.md + tahminler.csv
"""

import json
import csv
import os
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

# ─── Yardımcı fonksiyonlar ───────────────────────────────────────────────────

def add_months(date_str: str, months: int) -> str:
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
        d2 = d + relativedelta(months=months)
        return d2.strftime("%Y-%m-%d")
    except Exception:
        return "—"

def yon_isabeti(spot, hedef, gerceklesen) -> str:
    if gerceklesen is None:
        return "⏳"
    # Sabit: |beklenen değişim| < 0.1%
    if abs(hedef - spot) < 0.001 * spot:
        # Neutral — ±%0.5 tolerans
        if abs(gerceklesen - spot) < 0.005 * spot:
            return "✅"
        else:
            return "❌"
    hedef_dir = hedef > spot  # True = yükseliş beklentisi
    gercek_dir = gerceklesen > spot
    return "✅" if hedef_dir == gercek_dir else "❌"

def fmt_number(v) -> str:
    if v is None:
        return "—"
    if isinstance(v, float):
        if abs(v) >= 1000:
            return f"{v:,.2f}"
        elif abs(v) >= 100:
            return f"{v:.2f}"
        elif abs(v) >= 10:
            return f"{v:.4f}"
        else:
            return f"{v:.4f}"
    return str(v)

def fmt_pips(v) -> str:
    if v is None:
        return "—"
    return f"{v:+d}" if isinstance(v, int) else f"{int(v):+d}"

# ─── Danske Bank per-pair per-doc Analiz Tezi ────────────────────────────────

DANSKE_DOC_THEME = {
    "FX Forecast Update — NOK Remains Vulnerable":
        "NOK petrol desteğini kaybediyor, savunmasız; USD yapısal zayıflama devam",
    "FX Forecast Update — USD Rebound Is Temporary":
        "USD rallisi geçici, teknik; EUR'nun orta vadeli yükseliş trendi bozulmadı",
    "FX Forecast Update — Still Negative on SEK and NOK":
        "SEK ve NOK'ta negatif görüş korunuyor; CHF güvenli liman olarak güçlenme",
    "FX Forecast Update — Rebound in Real Rates to Support USD, Weigh on Scandies":
        "Reel faiz yeniden yükselmesi USD'yi kısa vadede destekliyor, İskandinavlar baskı altında",
    "FX Forecast Update — Upward Pressure on EUR/DKK":
        "EUR/DKK tarihsel aralık üst sınırına yakın, müdahale riski yüksek; taktik USD pozitif",
    "FX Forecast Update — USD to Weather AI Valuation Woes":
        "AI değerleme kaygıları volatilite yaratıyor; USD kısa vadede bu çalkantıyı yönetiyor",
    "FX Forecast Update — Weaker USD, GBP and NOK in 2026":
        "2026: USD, GBP ve NOK yapısal zayıflama; EUR güçlenme trendi",
    "FX Forecast Update — Geopolitics Takes Centre Stage as 2026 Kicks Off":
        "Jeopolitik risk 2026 başında FX'i yönlendiriyor; EUR/USD uzun vadeli yükseliş korunuyor",
    "FX Forecast Update — Lingering Scepticism Sustains Bearish Dollar Outlook":
        "USD'ye süregelen yapısal şüphecilik bearish görüşü destekliyor; EUR/USD 1.25 hedef",
    "FX Forecast Update — Energy Shock Steers Global Repricing":
        "İran savaşı kaynaklı enerji şoku küresel yeniden fiyatlamayı tetikledi; USD kısa vadede güçlü",
}

PAIR_CONTEXT = {
    "EUR/USD": {
        "up": "EUR/USD yükseliş: Fed easing döngüsü ve USD yapısal zayıflaması EUR'yu destekliyor.",
        "down": "EUR/USD düşüş: Kısa vadeli USD güçlenmesi veya Avrupa büyüme endişeleri EUR'ya baskı uyguluyor.",
        "flat": "EUR/USD yatay: Fed-ECB politika divergansı sınırlı; parite dar bantta seyrediyor.",
    },
    "EUR/SEK": {
        "up": "EUR/SEK yükseliş: Riksbank dovish politikası ve İsveç risk primi EUR/SEK'i yukarı tutuyor.",
        "down": "EUR/SEK düşüş: SEK'teki aşırı satım düzelyor; İsveç ekonomisi toparlanıyor.",
        "flat": "EUR/SEK yatay: Riksbank ve ECB arasındaki politika farkı sınırlı; parite stabil.",
    },
    "EUR/NOK": {
        "up": "EUR/NOK yükseliş: Norges Bank dovish eğilim ve petrol fiyatı baskısıyla NOK savunmasız; EUR/NOK yukarı baskı devam ediyor.",
        "down": "EUR/NOK düşüş: Petrol fiyatı yükselişi NOK'u destekliyor; EUR/NOK baskı altında.",
        "flat": "EUR/NOK yatay: Petrol geliri ve Norges Bank dengede; kısa vadeli yön belirsiz.",
    },
    "EUR/DKK": {
        "up": "EUR/DKK yükseliş: Tarihsel aralık üst sınırına yaklaşma baskısı; Nationalbank müdahale gözetimi altında yavaş hareket.",
        "down": "EUR/DKK düşüş: Danmarks Nationalbank EUR/DKK'yı sabit bant içinde tutuyor; hafif aşağı.",
        "flat": "EUR/DKK yatay: Kur bandı çerçevesinde sabit — Nationalbank'ın peg politikası aktif.",
    },
    "EUR/GBP": {
        "up": "EUR/GBP yükseliş: İngiltere büyümesindeki zayıflama ve BoE dovish beklentisi GBP'yi baskılıyor.",
        "down": "EUR/GBP düşüş: İngiltere büyüme görünümü güçlü; GBP EUR'ya göre değerleniyor.",
        "flat": "EUR/GBP yatay: BoE ve ECB politika patikası yakınsıyor; EUR/GBP yönü sınırlı.",
    },
    "EUR/CHF": {
        "up": "EUR/CHF yükseliş: SNB CHF'in aşırı değerlenmesini önlüyor; EUR/CHF toparlanıyor.",
        "down": "EUR/CHF düşüş: Küresel risk-off ortamında CHF güvenli liman talebi güçleniyor; EUR/CHF baskı altında.",
        "flat": "EUR/CHF yatay: SNB müdahale sınırı altında CHF güçlü; EUR/CHF dar bantta.",
    },
    "EUR/PLN": {
        "up": "EUR/PLN yükseliş: PLN üzerinde dış kaynaklı baskı; Polonya risk priminin genişlemesi.",
        "down": "EUR/PLN düşüş: Polonya ekonomisinin güçlü seyri ve NBP faiz tutumu PLN'yi destekliyor.",
        "flat": "EUR/PLN yatay: Polonya-AB büyüme korelasyonu; PLN EUR ile paralel seyrediyor.",
    },
    "USD/JPY": {
        "up": "USD/JPY yükseliş: Fed-BoJ politika farkının açılması carry trade avantajını koruyor.",
        "down": "USD/JPY düşüş: BoJ normalleşmesi ve carry trade çözülmesi JPY'yi güçlendiriyor; USD/JPY baskı altında.",
        "flat": "USD/JPY yatay: Fed-BoJ divergansı daralmakta; USD/JPY yön arayışında.",
    },
    "USD/TRY": {
        "up": "USD/TRY yükseliş: TRY yapısal değer kaybı beklentisi; TCMB politikası ve enflasyon baskısıyla kademeli depreciation devam ediyor.",
        "down": "USD/TRY düşüş: TRY'nin beklenmedik güçlenmesi veya TCMB müdahalesiyle değer kaybı yavaşlıyor.",
        "flat": "USD/TRY yatay: Kontrollü TRY değer kaybı politikası; kısa vadede sınırlı hareket.",
    },
    "USD/CNY": {
        "up": "USD/CNY yükseliş: CNY üzerinde baskı; ABD-Çin ticaret gerilimiyle yuan zayıflıyor.",
        "down": "USD/CNY düşüş: PBOC'nin yuan güçlendirme politikası ve dış denge faktörleri CNY'yi destekliyor.",
        "flat": "USD/CNY yatay: PBOC sabit kur politikası; USD/CNY kontrollü bantta seyrediyor.",
    },
}

def get_danske_thesis(doc_name: str, pair: str, spot, f12m) -> str:
    theme = DANSKE_DOC_THEME.get(doc_name, "Danske Bank FX analizi")
    ctx = PAIR_CONTEXT.get(pair, {})
    if f12m is None or spot is None:
        direction = "flat"
    else:
        pct = (f12m - spot) / spot
        if pct > 0.003:
            direction = "up"
        elif pct < -0.003:
            direction = "down"
        else:
            direction = "flat"
    pair_text = ctx.get(direction, f"{pair} için {direction} beklentisi.")
    return f"{pair_text} ({theme}.)"

# ─── Ana işlem ───────────────────────────────────────────────────────────────

def main():
    with open("analizler/forecasts-results.json", encoding="utf-8") as f:
        results = json.load(f)

    rows = []

    for r in results:
        date = r.get("date", "")
        institution = r.get("institution", "")
        analyst = r.get("analyst", "Ekip")
        fmt = r.get("format", "PDF")
        doc_name = r.get("documentName", "")
        pair = r.get("pair", "")
        spot = r.get("spot")
        thesis_raw = r.get("thesis")

        for vade_code, months in [("1m", 1), ("3m", 3), ("6m", 6), ("12m", 12)]:
            forecast = r.get(f"forecast{vade_code}")
            if forecast is None:
                continue

            actual = r.get(f"actual{vade_code}")
            deviation = r.get(f"deviation{vade_code}_pips")
            hedef_tarihi = add_months(date, months)
            vade_str = f"+{vade_code.upper().replace('M', 'M')}"

            # Analiz Tezi
            if thesis_raw:
                tez = thesis_raw
            elif institution == "Danske Bank":
                tez = get_danske_thesis(doc_name, pair, spot, r.get("forecast12m"))
            else:
                tez = "Raporda belirtilmemiştir"

            # Yön İsabeti
            yi = yon_isabeti(spot, forecast, actual) if spot is not None else "⏳"

            rows.append({
                "Tahmin Tarihi": date,
                "Kurum": institution,
                "Analist": analyst,
                "Format": fmt,
                "Belge Adı": doc_name,
                "Varlık": pair,
                "Vade": vade_str,
                "Hedef Tarihi": hedef_tarihi,
                "Spot Fiyat": fmt_number(spot),
                "Hedef Fiyat": fmt_number(forecast),
                "Analiz Tezi": tez,
                "Gerçekleşen Fiyat": fmt_number(actual),
                "Sapma (pip)": fmt_pips(deviation),
                "Yön İsabeti": yi,
            })

    # Sıralama: Kurum, Belge, Varlık, Vade
    def sort_key(r):
        inst_order = {"Danske Bank": 0, "ICBC Yatırım": 1, "Deniz Yatırım": 2, "Devrim Akyıl": 3}
        vade_order = {"+1M": 0, "+3M": 1, "+6M": 2, "+12M": 3}
        return (
            inst_order.get(r["Kurum"], 99),
            r["Tahmin Tarihi"],
            r["Varlık"],
            vade_order.get(r["Vade"], 99),
        )

    rows.sort(key=sort_key)

    os.makedirs("analizler", exist_ok=True)

    # ── CSV ──────────────────────────────────────────────────────────────────
    cols = ["Tahmin Tarihi", "Kurum", "Analist", "Format", "Belge Adı", "Varlık",
            "Vade", "Hedef Tarihi", "Spot Fiyat", "Hedef Fiyat", "Analiz Tezi",
            "Gerçekleşen Fiyat", "Sapma (pip)", "Yön İsabeti"]

    with open("analizler/tahminler.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, quoting=csv.QUOTE_ALL)
        w.writeheader()
        w.writerows(rows)

    print(f"CSV: {len(rows)} satır yazıldı → analizler/tahminler.csv")

    # ── Markdown ─────────────────────────────────────────────────────────────
    header_line = "| " + " | ".join(cols) + " |"
    sep_line    = "|" + "|".join(["---"] * len(cols)) + "|"

    def md_row(r):
        cells = [r[c].replace("|", "\\|") if isinstance(r[c], str) else str(r[c]) for c in cols]
        return "| " + " | ".join(cells) + " |"

    # Group by institution for sections
    from collections import defaultdict
    inst_rows = defaultdict(list)
    for r in rows:
        inst_rows[r["Kurum"]].append(r)

    inst_order = ["Danske Bank", "ICBC Yatırım", "Deniz Yatırım", "Devrim Akyıl"]
    inst_display = {
        "Danske Bank": "Danske Bank — FX Forecast Update",
        "ICBC Yatırım": "ICBC Yatırım — Model Portföy",
        "Deniz Yatırım": "Deniz Yatırım — Günlük Bülten",
        "Devrim Akyıl": "Devrim Akyıl — YouTube Tahminleri",
    }

    today = datetime.now().strftime("%Y-%m-%d")
    total_rows = len(rows)

    md_parts = [
        "# Tahminler Analiz Raporu\n",
        f"> **Son güncelleme:** {today}  ",
        f"> **Toplam tahmin satırı:** {total_rows}  ",
        f"> **Kaynak:** analizler/forecasts-results.json  ",
        "",
        "**Sütunlar (14):** Tahmin Tarihi | Kurum | Analist | Format | Belge Adı | Varlık | Vade | Hedef Tarihi | Spot Fiyat | Hedef Fiyat | Analiz Tezi | Gerçekleşen Fiyat | Sapma (pip) | Yön İsabeti",
        "",
        "---",
        "",
    ]

    for inst in inst_order:
        if inst not in inst_rows:
            continue
        irows = inst_rows[inst]
        section_title = inst_display.get(inst, inst)
        count = len(irows)
        md_parts.append(f"## {section_title} ({count} satır)\n")
        md_parts.append(header_line)
        md_parts.append(sep_line)
        for r in irows:
            md_parts.append(md_row(r))
        md_parts.append("")
        md_parts.append("---")
        md_parts.append("")

    md_content = "\n".join(md_parts)

    with open("analizler/tahminler.md", "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"MD: {len(rows)} satır yazıldı → analizler/tahminler.md")

    # ── Özet ─────────────────────────────────────────────────────────────────
    yi_counts = {"✅": 0, "❌": 0, "⏳": 0}
    for r in rows:
        yi = r["Yön İsabeti"]
        if yi in yi_counts:
            yi_counts[yi] += 1

    print(f"\nYön İsabeti özet: {yi_counts}")
    total_evaluated = yi_counts["✅"] + yi_counts["❌"]
    if total_evaluated > 0:
        isabet = yi_counts["✅"] / total_evaluated * 100
        print(f"İsabet oranı (değerlenenler): %{isabet:.1f}")


if __name__ == "__main__":
    main()
