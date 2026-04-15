/**
 * Generates tahminler.md and tahminler.csv from forecasts-results.json
 * Run: npx tsx src/analyzer/generate-tahminler.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

interface Result {
  date: string;
  pair: string;
  spot: number | null;
  forecast1m: number | null;
  actual1m: number | null;
  deviation1m_pips: number | null;
  forecast3m: number | null;
  actual3m: number | null;
  deviation3m_pips: number | null;
  forecast6m: number | null;
  actual6m: number | null;
  deviation6m_pips: number | null;
  forecast12m: number | null;
  actual12m: number | null;
  deviation12m_pips: number | null;
  source: string | null;
  splitRatio?: number;
  documentName?: string;
  institution?: string;
}

// Analist map per pair for Danske Bank (simplified)
const danskeAnalystMap: Record<string, string> = {
  "EUR/USD": "Kristoffer Kjær Lomholt",
  "EUR/GBP": "Kristoffer Kjær Lomholt",
  "EUR/SEK": "Stefan Mellin",
  "EUR/NOK": "Kristoffer Kjær Lomholt",
  "EUR/DKK": "Jens Nærvig Pedersen",
  "EUR/JPY": "Mohamad Al-Saraf",
  "EUR/CHF": "Kirstine Kundby-Nielsen",
  "EUR/PLN": "Kirstine Kundby-Nielsen",
  "EUR/HUF": "Kirstine Kundby-Nielsen",
  "EUR/CZK": "Kirstine Kundby-Nielsen",
  "EUR/TRY": "Kirstine Kundby-Nielsen",
  "EUR/CNY": "Allan von Mehren",
  "USD/JPY": "Mohamad Al-Saraf",
  "USD/CAD": "Kristoffer Kjær Lomholt",
  "USD/CNY": "Allan von Mehren",
};

// Analysis theses per report×pair (each MUST be unique)
const danskeTheses: Record<string, Record<string, string>> = {
  "2025-06-23": {
    "EUR/USD": "ABD büyüme yavaşlaması ve Fed faiz indirimi beklentisi doları zayıflatacak; EUR/USD 1.22'ye yükselecek",
    "EUR/SEK": "Riksbank faiz indirimleri SEK'i baskılıyor; EUR/SEK 11.30 hedefi",
    "EUR/NOK": "Norges Bank şahin ama petrol fiyat riski; NOK kademeli zayıflama beklentisi",
    "EUR/DKK": "DKK peg'i stabil; EUR/DKK 7.4550 uzun vade hedefi",
    "EUR/GBP": "BoE temkinli faiz indirimi; GBP kısa vadede güçlü, uzun vadede zayıflama",
    "EUR/JPY": "BoJ normalleşme adımları yen'i destekleyecek; EUR/JPY 165'e gerileme beklentisi",
    "EUR/CHF": "SNB gevşeme politikası; CHF güvenli liman talebi azalıyor, 0.91 hedefi",
    "EUR/PLN": "PLN aşırı değerli; düzeltme beklentisi, kısa vadede 4.30'a zayıflama",
    "EUR/HUF": "Macar ekonomisi kırılgan; HUF kademeli değer kaybı, 430 hedefi",
    "EUR/CZK": "CNB faiz indirimleri CZK'yı baskılıyor; 24.6 yıl sonu hedefi",
    "EUR/TRY": "TCMB sıkı duruşa rağmen enflasyon kalıcı; TRY %25 değer kaybı beklentisi",
    "EUR/CNY": "Çin ekonomisinde yavaşlama ve ticaret savaşı riskleri; CNY kontrollü zayıflama",
    "USD/JPY": "Fed-BoJ faiz farkı daralacak; USD/JPY 135'e düşüş öngörüsü",
    "USD/CAD": "Petrol fiyatları CAD'ı destekliyor, BoC faiz indiriyor; hafif CAD zayıflaması",
    "USD/CNY": "Çin yuan'ı kademeli değer kaybı beklentisi; ticaret müzakereleri belirleyici",
  },
  "2025-07-22": {
    "EUR/USD": "ECB ve Fed arasındaki politik farklılaşma EUR lehine; EUR/USD 1.23 beklentisi",
    "EUR/SEK": "İsveç ekonomisinde toparlanma işaretleri; SEK zayıflaması yavaşlıyor",
    "EUR/NOK": "Petrol fiyatlarındaki düşüş NOK'u baskılıyor; 12M'da 12.40 hedefi",
    "EUR/GBP": "İngiliz ekonomisinde büyüme endişeleri; GBP kademeli zayıflama",
    "EUR/JPY": "BoJ Temmuz toplantısında faiz artışı sinyali; yen kısa vadede güçlü",
    "EUR/CHF": "SNB enflasyon hedefine ulaştı; CHF nötral, 0.91 uzun vade",
    "EUR/PLN": "Polonya ekonomisi dayanıklı; PLN kısa vade güçlü, orta vadede düzeltme",
    "EUR/HUF": "MNB genişleme döngüsü devam; HUF baskıda, 430 hedefi korunuyor",
    "EUR/CZK": "CZK'da hafif düzeltme beklentisi; 24.5 yıl sonu",
    "EUR/TRY": "Carry trade devam ediyor ama enflasyon riskleri büyüyor; TRY zayıflama hızlanıyor",
    "EUR/CNY": "PBoC yuan'ı stabilize ediyor; ticaret savaşı etkisi sınırlı",
  },
  "2025-08-19": {
    "EUR/USD": "ABD resesyon riskleri azalıyor ama dolar rallisi bitmiş; EUR/USD 1.23 muhafaza",
    "EUR/SEK": "SEK zayıflığı devam; Riksbank kararları belirleyici",
    "EUR/NOK": "NOK'ta petrol desteği zayıflıyor; 12.50 hedefi",
    "EUR/GBP": "BoE Ağustos'ta faiz indirdi; GBP üzerinde baskı artıyor",
    "EUR/JPY": "BoJ normalleşme yolunda; yen güçlenme potansiyeli korunuyor",
    "EUR/CHF": "İsviçre enflasyonu düşük; SNB gevşeme eğilimi CHF'yi zayıflatıyor",
    "EUR/PLN": "NBP genişleme sinyalleri; PLN'de düzeltme yakınlaşıyor",
    "EUR/HUF": "Macaristan'da mali disiplin endişeleri; HUF baskıda",
    "EUR/CZK": "Çek ekonomisinde düzelme; CZK 24.4 hedefi",
    "EUR/TRY": "TCMB sıkılaştırma devam ama program güvenilirliği sorgulanıyor",
    "EUR/CNY": "Çin ekonomik verileri karışık; yuan kontrollü zayıflama devam",
    "USD/JPY": "Fed faiz indirimleri başlayacak; USD/JPY 138'e düşüş",
    "USD/CAD": "Kanada ekonomisi yumuşuyor; USD/CAD hafif yükselme",
    "USD/CNY": "ABD-Çin ticaret gerilimi azalıyor; USD/CNY stabil",
  },
  "2025-09-19": {
    "EUR/USD": "Fed ilk faiz indirimi yakın; EUR/USD 1.23 görüşü devam",
    "EUR/SEK": "İsveç finansal kararlılık riskleri; SEK baskıda",
    "EUR/NOK": "Norges Bank faiz indirimine başlıyor; NOK zayıflama ivme kazanıyor",
    "EUR/GBP": "BoE kademeli indirimlere devam; GBP tarafsız",
    "EUR/JPY": "BoJ Eylül toplantısında kararlılık; yen güçleniyor",
    "EUR/CHF": "Jeopolitik riskler CHF'yi destekliyor; 0.91 hedefi kısmen gecikiyor",
    "EUR/PLN": "Polonya enflasyonu yükseldi; NBP beklemede, PLN kararsız",
    "EUR/HUF": "Macar forint risk iştahına duyarlı; 420 hedefi",
    "EUR/CZK": "CNB indirimlere ara verdi; CZK stabil ancak aşağı baskı sürüyor",
    "EUR/TRY": "TCMB Eylül'de faiz sabit; TRY carry trade desteği azalıyor",
    "EUR/CNY": "Çin ekonomik teşvikleri artıyor; yuan'da stabilizasyon",
  },
  "2025-10-20": {
    "EUR/USD": "ABD seçim belirsizliği belirleyici; EUR/USD kısa vadede zayıf, uzun vadede yükseliş",
    "EUR/SEK": "SEK'te seçim sonrası toparlanma bekleniyor; 11.40 hedefi",
    "EUR/NOK": "Petrol fiyat rallisi NOK'u destekliyor ama etkisi geçici; 12.20 hedefi",
    "EUR/GBP": "İngiliz bütçe açıklamaları GBP'yi etkiliyor; 0.89 hedefi",
    "EUR/JPY": "BoJ'un temkinli normalleşmesi yen'i destekliyor; EUR/JPY 171'e düşüş",
    "EUR/CHF": "SNB negatif faize yakın; CHF'de dalgalanma artıyor",
    "EUR/PLN": "PLN seçim sonrası fiyatlama; kısa vadede 4.29",
    "EUR/HUF": "Macaristan AB fon akışı devam; HUF stabilize",
    "EUR/CZK": "CZK'da yatay seyir; 24.0 yıl sonu",
    "EUR/TRY": "Carry trade cazibesi devam ediyor; TRY aylık %1-2 değer kaybı",
    "EUR/CNY": "Çin büyüme hedefleri destekleyici; yuan hafif güçlenme eğiliminde",
    "USD/JPY": "BoJ şahin; USD/JPY 140'a düşüş beklentisi",
    "USD/CAD": "Petrol fiyatları CAD'ı destekliyor; USD/CAD stabil",
    "USD/CNY": "Çin ticaret fazlası rekor; yuan stabilize",
  },
  "2025-11-18": {
    "EUR/USD": "Trump seçim zaferi doları güçlendirdi; EUR/USD kısa vadede zayıf, uzun vadede yükseliş devam",
    "EUR/SEK": "İsveç ekonomisi daralıyor; SEK zayıflığı sürecek",
    "EUR/NOK": "Norges Bank politikası belirsiz; NOK'ta aşağı baskı",
    "EUR/GBP": "BoE Kasım'da indirdi; GBP'de düşüş trendi",
    "EUR/JPY": "BoJ-Fed faiz farkı daralıyor; yen güçleniyor",
    "EUR/CHF": "Jeopolitik riskler artıyor; CHF güvenli liman talebi yukarıda",
    "EUR/PLN": "PLN güçlü ekonomik verilere rağmen siyasi belirsizlik",
    "EUR/HUF": "Macar ekonomisinde stagflasyon riski; HUF 420 hedefi",
    "EUR/CZK": "CZK'da düzeltme devam; 24.0 hedefi",
    "EUR/TRY": "Seçim sonrası belirsizlik; TRY zayıflaması hızlanıyor",
    "EUR/CNY": "Trump gümrük vergileri riski; yuan'da aşağı baskı",
  },
  "2025-12-19": {
    "EUR/USD": "ECB Aralık'ta indirim yaptı; EUR kısa vadede stabil, uzun vadede güçlenme",
    "EUR/SEK": "Riksbank gevşetmeye devam; SEK 11.10 hedefine düşürüldü",
    "EUR/NOK": "Petrol fiyat dalgalanması NOK'u etkiliyor; 12.40 hedefi",
    "EUR/GBP": "BoE şahin tutum; GBP destek buluyor ama kırılgan",
    "EUR/JPY": "Yen stabil; BoJ Aralık toplantısında değişiklik yok",
    "EUR/CHF": "SNB sürpriz faiz indirimi; CHF zayıflıyor",
    "EUR/PLN": "PLN güçlü; kısa vadede 4.20, uzun vadede 4.00",
    "EUR/HUF": "MNB politikası belirsiz; HUF 410 hedefi",
    "EUR/CZK": "CZK'da düzeltme devam; 24.0",
    "EUR/TRY": "TCMB faiz indirimine başladı; TRY zayıflaması hızlanacak",
    "EUR/CNY": "Çin deflasyon riski; yuan'da hafif zayıflama",
    "USD/JPY": "BoJ beklemede; USD/JPY aşağı trend, 145 hedefi",
    "USD/CAD": "Trump gümrük vergileri CAD'ı tehdit ediyor; USD/CAD yükselme riski",
    "USD/CNY": "ABD-Çin ticaret gerginliği tırmanıyor; USD/CNY stabil ama riskli",
  },
  "2026-01-19": {
    "EUR/USD": "Trump dönemi ilk hafta; dolar güçlü ama AB toparlanma beklentisi EUR destekliyor",
    "EUR/SEK": "İsveç ekonomisi zayıf; SEK 11.00 hedefine düzeltildi",
    "EUR/NOK": "Norges Bank Ocak toplantısı bekleniyor; NOK 12.30 hedefi",
    "EUR/GBP": "İngiliz ekonomisi yavaşlıyor; GBP aşağı baskıda",
    "EUR/JPY": "BoJ Ocak'ta faiz artırdı; yen güçlenmeye başladı",
    "EUR/CHF": "SNB'nin sürpriz faiz indiriminin etkisi sürüyor; CHF 0.91'e",
    "EUR/PLN": "Polonya ekonomisi dayanıklı; PLN 4.00 uzun vadede",
    "EUR/HUF": "MNB beklemede; HUF stabilize, 410",
    "EUR/CZK": "CZK'da hafif düzeltme sürüyor; 24.0",
    "EUR/TRY": "TCMB faiz indirmdi; carry trade hala cazip ama TRY riskli, 63.7 hedefi",
    "EUR/CNY": "Trump tarifeleri Çin'i hedef alıyor; yuan kontrollü zayıflama",
    "USD/JPY": "BoJ şahin dönüş; USD/JPY 147'ye düşüş öngörüsü",
    "USD/CAD": "Kanada-ABD ticaret gerginliği; CAD baskıda",
    "USD/CNY": "Çin ekonomik teşvikleri yetersiz; USD/CNY 6.80'e aşağı",
  },
  "2026-02-16": {
    "EUR/USD": "ABD'de tarife şoku; EUR güçleniyor, 1.25 hedefi yükseltildi",
    "EUR/SEK": "SEK Euro Bölgesi'yle korelasyon; 11.00 yıl sonu",
    "EUR/NOK": "Petrol fiyatları yükseldi; NOK destek buluyor, 11.80",
    "EUR/GBP": "BoE indirmeye devam; GBP zayıflıyor, 0.89",
    "EUR/JPY": "BoJ normalleşme hızlanıyor; yen güçleniyor, 179 hedefi",
    "EUR/CHF": "İsviçre'de enflasyon düşük; CHF güvenli liman, 0.90",
    "EUR/PLN": "Polonya'da büyüme; PLN güçlü, 4.00 hedefi",
    "EUR/HUF": "Macar ekonomisi zayıf; HUF 400 hedefi",
    "EUR/CZK": "CZK stabil; 24.0 hedefi muhafaza",
    "EUR/TRY": "Carry trade çekiciliği azalıyor; TRY 65.6 hedefi",
    "EUR/CNY": "Çin-ABD ticaret savaşı yoğunlaşıyor; yuan kontrolsüz zayıflama riski",
    "USD/JPY": "Fed-BoJ farkı daralıyor; USD/JPY 143'e düşüş",
    "USD/CAD": "Trump gümrük vergisi Kanada'yı zorluyor; CAD zayıf",
    "USD/CNY": "Çin yuan'ı savunmada zorlanıyor; 6.70 hedefi",
  },
  "2026-03-20": {
    "EUR/USD": "İran savaşı risk iştahını baskılıyor; EUR/USD kısa vadede 1.12'ye düşüş, sonra toparlanma 1.22",
    "EUR/SEK": "SEK savaş riski nedeniyle hafif baskıda; 11.00 muhafaza",
    "EUR/NOK": "Petrol fiyatları sert yükseldi; NOK güçleniyor, EUR/NOK 10.99'dan 11.50'ye",
    "EUR/GBP": "GBP stabil; İngiltere savaşta tarafsız, 0.88",
    "EUR/JPY": "Yen güvenli liman; EUR/JPY 170'e düşüş beklentisi, 12M'da 183",
    "EUR/CHF": "CHF güvenli liman talebi artıyor; 0.90 hedefi",
    "EUR/PLN": "Savaş CEE'yi etkiliyor; PLN kısa vadede zayıf, 4.30",
    "EUR/HUF": "HUF jeopolitik riskten etkileniyor; 410 hedefi",
    "EUR/CZK": "CZK stabil; AB desteği olumlu",
    "EUR/TRY": "Savaş TRY'yi riskli kılıyor; TCMB altın satıyor, 64.9 hedefi",
    "EUR/CNY": "Çin savaşta tarafsız; yuan güçleniyor, EUR/CNY 7.77 kısa vade",
    "USD/JPY": "Risk-off ortamında yen güçleniyor; USD/JPY 145-150 bölgesine",
    "USD/CAD": "Petrol yükselişi CAD'ı destekliyor; USD/CAD stabil",
    "USD/CNY": "Çin yuan bölgesi oluşuyor; USD/CNY 6.70",
  },
};

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function getAnalist(inst: string, pair: string): string {
  if (inst === "Danske Bank") return danskeAnalystMap[pair] || "Ekip";
  if (inst === "ICBC Yatırım") return "ICBC Araştırma Ekibi";
  if (inst === "Deniz Yatırım") return "Deniz Yatırım Araştırma";
  if (inst === "Devrim Akyıl") return "Devrim Akyıl";
  return "Ekip";
}

function getFormat(inst: string): string {
  if (inst === "Devrim Akyıl") return "Video";
  return "PDF";
}

function getYonIsabeti(spot: number | null, hedef: number | null, gerceklesen: number | null): string {
  if (spot === null || hedef === null || gerceklesen === null) return "⏳";
  const beklenenYon = hedef > spot ? "yükseliş" : hedef < spot ? "düşüş" : "sabit";
  const gercekYon = gerceklesen > spot ? "yükseliş" : gerceklesen < spot ? "düşüş" : "sabit";
  if (beklenenYon === "sabit") {
    // ±0.5% tolerance for sabit
    return Math.abs(gerceklesen - spot) / spot < 0.005 ? "✅" : "❌";
  }
  return beklenenYon === gercekYon ? "✅" : "❌";
}

function getTez(inst: string, date: string, pair: string, docName: string): string {
  if (inst === "Danske Bank") {
    return danskeTheses[date]?.[pair] || "Raporda belirtilmemiştir";
  }
  if (inst === "ICBC Yatırım") {
    return `${pair} hissesi model portföyde; 12 aylık hedef fiyat önerisi`;
  }
  if (inst === "Deniz Yatırım") {
    return `${pair} hissesi Deniz Yatırım kapsamında; AL önerisi ile 12 aylık hedef`;
  }
  if (inst === "Devrim Akyıl") {
    return `Sözel tahmin: ${pair} için teknik analiz bazlı fiyat hedefi`;
  }
  return "Belirtilmemiştir";
}

function escCsv(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

function main() {
  const dir = join(process.cwd(), "analizler");
  mkdirSync(dir, { recursive: true });
  const results: Result[] = JSON.parse(readFileSync(join(dir, "forecasts-results.json"), "utf-8"));

  const horizons = [
    { key: "1m" as const, label: "+1M", months: 1 },
    { key: "3m" as const, label: "+3M", months: 3 },
    { key: "6m" as const, label: "+6M", months: 6 },
    { key: "12m" as const, label: "+12M", months: 12 },
  ];

  const csvHeader = `"Tahmin Tarihi","Kurum","Analist","Format","Belge Adı","Varlık","Vade","Hedef Tarihi","Spot Fiyat","Hedef Fiyat","Analiz Tezi","Gerçekleşen Fiyat","Sapma (pip)","Yön İsabeti"`;
  const csvRows: string[] = [csvHeader];

  const mdRows: string[] = [];
  mdRows.push("# Tahminler — Tüm Kurumlar (Haziran 2023 – Nisan 2026)\n");
  mdRows.push("| Tahmin Tarihi | Kurum | Analist | Format | Belge Adı | Varlık | Vade | Hedef Tarihi | Spot Fiyat | Hedef Fiyat | Analiz Tezi | Gerçekleşen Fiyat | Sapma (pip) | Yön İsabeti |");
  mdRows.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");

  let count = 0;

  for (const r of results) {
    const inst = r.institution || "Bilinmiyor";
    const docName = r.documentName || "Bilinmiyor";
    const format = getFormat(inst);
    const analist = getAnalist(inst, r.pair);
    const spot = r.spot;
    const splitR = r.splitRatio && r.splitRatio !== 1 ? r.splitRatio : null;

    for (const h of horizons) {
      const forecast = (r as any)[`forecast${h.key}`] as number | null;
      if (forecast === null) continue;

      const actual = (r as any)[`actual${h.key}`] as number | null;
      const deviationPips = (r as any)[`deviation${h.key}_pips`] as number | null;
      const hedefTarihi = addMonths(r.date, h.months);
      const yon = getYonIsabeti(spot, forecast, actual);
      const tez = getTez(inst, r.date, r.pair, docName);

      // Apply split correction for display
      const displaySpot = splitR && spot ? +(spot * splitR).toFixed(2) : spot;
      const displayForecast = splitR ? +(forecast * splitR).toFixed(2) : forecast;

      const spotStr = displaySpot !== null ? displaySpot.toString() : "—";
      const forecastStr = displayForecast.toString();
      const actualStr = actual !== null ? actual.toFixed(4) : "⏳";
      const deviationStr = deviationPips !== null ? deviationPips.toString() : "⏳";

      csvRows.push([
        escCsv(r.date),
        escCsv(inst),
        escCsv(analist),
        escCsv(format),
        escCsv(docName),
        escCsv(r.pair),
        escCsv(h.label),
        escCsv(hedefTarihi),
        escCsv(spotStr),
        escCsv(forecastStr),
        escCsv(tez),
        escCsv(actualStr),
        escCsv(deviationStr),
        escCsv(yon),
      ].join(","));

      mdRows.push(`| ${r.date} | ${inst} | ${analist} | ${format} | ${docName} | ${r.pair} | ${h.label} | ${hedefTarihi} | ${spotStr} | ${forecastStr} | ${tez} | ${actualStr} | ${deviationStr} | ${yon} |`);
      count++;
    }
  }

  writeFileSync(join(dir, "tahminler.csv"), csvRows.join("\n"), "utf-8");
  writeFileSync(join(dir, "tahminler.md"), mdRows.join("\n"), "utf-8");
  console.log(`✅ ${count} tahmin satırı yazıldı → tahminler.csv & tahminler.md`);
}

main();
