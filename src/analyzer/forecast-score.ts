import fs from "node:fs";
import path from "node:path";

// ── Types ──

interface TahminlerRow {
  "Tahmin Tarihi": string;
  "Kurum": string;
  "Analist": string;
  "Format": string;
  "Varlık": string;
  "Vade": string;
  "Hedef Tarihi": string;
  "Spot Fiyat": string;
  "Hedef Fiyat": string;
  "Analiz Tezi": string;
  "Gerçekleşen Fiyat": string;
  "Sapma (pip)": string;
  "Yön İsabeti": string;
}

interface ScoreRow {
  tahminTarihi: string;
  kurum: string;
  analist: string;
  format: string;
  varlik: string;
  vade: string;
  hedefTarihi: string;
  hedefFiyat: string;
  analizTezi: string;
  benchmark: string;
  spotFiyat: string;
  beklenenGetiri: string;
  gerceklesenFiyat: string;
  gerceklesenGetiri: string;
  hedefYon: string;
  oneri: string;
  yonIsabeti: string;
  hedefYakinligi: string;
  tahminDogrulugu: string;
  errorMape: string;
  basariSkoru: string;
  refBeklenenGetiri: string;
  refGerceklesenGetiri: string;
  alpha: string;
  refAlpha: string;
}

// ── Frankfurter API (EUR-bazlı cross rates) ──

const FRANKFURTER_CURRENCIES = new Set([
  "USD", "GBP", "JPY", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF",
  "CAD", "AUD", "NZD", "CNY", "TRY",
]);

/** ECB Data API ile desteklenen metal kodları */
const METALS = new Set(["XAU", "XAG"]);

/**
 * ECB Statistical Data Warehouse'dan metal fiyatı çeker (EUR bazlı, troy ons).
 */
async function fetchMetalRateECB(metal: string, date?: string): Promise<number | null> {
  const d = date ?? new Date().toISOString().slice(0, 10);
  const startDate = new Date(d + "T00:00:00Z");
  startDate.setDate(startDate.getDate() - 7);
  const startStr = startDate.toISOString().slice(0, 10);

  const url = `https://data-api.ecb.europa.eu/service/data/EXR/D.${metal}.EUR.SP00.A?format=csvdata&startPeriod=${startStr}&endPeriod=${d}&detail=dataonly`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const csv = await res.text();
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return null;

    let bestValue: number | null = null;
    let bestDist = Infinity;
    const targetTime = new Date(d + "T00:00:00Z").getTime();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      const timePeriod = cols[cols.length - 2]?.trim();
      const obsValue = parseFloat(cols[cols.length - 1]);
      if (!timePeriod || isNaN(obsValue)) continue;
      const dist = Math.abs(new Date(timePeriod + "T00:00:00Z").getTime() - targetTime);
      if (dist < bestDist) { bestDist = dist; bestValue = obsValue; }
    }
    return bestValue;
  } catch { return null; }
}

function parseApiPair(pair: string): { from: string; to: string } | null {
  const [base, quote] = pair.split("/");
  if (base === "EUR" && FRANKFURTER_CURRENCIES.has(quote)) return { from: "EUR", to: quote };
  if (quote === "EUR" && FRANKFURTER_CURRENCIES.has(base)) return { from: "EUR", to: base };
  if (FRANKFURTER_CURRENCIES.has(base) && FRANKFURTER_CURRENCIES.has(quote)) return { from: base, to: quote };
  return null;
}

async function fetchRate(pair: string, date?: string): Promise<number | null> {
  // ── Metal pariteleri ──
  const [base, quote] = pair.split("/");
  if (base && quote && METALS.has(base)) {
    const metalEur = await fetchMetalRateECB(base, date);
    if (metalEur === null) return null;
    if (quote === "EUR") return metalEur;
    const eurToQuote = await fetchRate(`EUR/${quote}`, date);
    if (eurToQuote === null) return null;
    return metalEur * eurToQuote;
  }

  // ── Gram pariteleri ──
  if (pair === "GRAM-ALTIN" || pair === "GRAM-GUMUS") {
    const metal = pair === "GRAM-ALTIN" ? "XAU" : "XAG";
    const metalEur = await fetchMetalRateECB(metal, date);
    const eurTry = await fetchRate("EUR/TRY", date);
    if (metalEur !== null && eurTry !== null) return (metalEur * eurTry) / 31.1035;
    return null;
  }

  // ── BIST100: API desteklenmiyor ──
  if (pair === "BIST100") return null;

  // ── Frankfurter API ──
  const parsed = parseApiPair(pair);
  if (!parsed) return null;

  const [pairBase, pairQuote] = pair.split("/");

  if (pairBase === "EUR") {
    const endpoint = date
      ? `https://api.frankfurter.app/${date}?from=EUR&to=${pairQuote}`
      : `https://api.frankfurter.app/latest?from=EUR&to=${pairQuote}`;
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const data = (await res.json()) as { rates: Record<string, number> };
    return data.rates[pairQuote] ?? null;
  }

  const endpoint = date
    ? `https://api.frankfurter.app/${date}?from=EUR&to=${pairBase},${pairQuote}`
    : `https://api.frankfurter.app/latest?from=EUR&to=${pairBase},${pairQuote}`;
  const res = await fetch(endpoint);
  if (!res.ok) return null;
  const data = (await res.json()) as { rates: Record<string, number> };
  if (!data.rates[pairBase] || !data.rates[pairQuote]) return null;
  return data.rates[pairQuote] / data.rates[pairBase];
}

// ── Helpers ──

function subtractMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

function parseVadeMonths(vade: string): number {
  const m = vade.match(/\+?(\d+)M/i);
  return m ? parseInt(m[1], 10) : 1;
}

// ── CSV Parsing ──

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === "," && !inQuotes) {
        fields.push(current); current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current);
    return fields;
  };

  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
}

// ── Scoring Functions ──

/** MAPE: |Gerçekleşen − Hedef| / |Hedef| × 100 */
function calcMape(gerceklesen: number, hedef: number): number {
  if (hedef === 0) return 100;
  return Math.abs(gerceklesen - hedef) / Math.abs(hedef) * 100;
}

/** Hedef Yakınlığı: max(0, 100 − MAPE × 10) */
function hedefYakinligi(mape: number): number {
  return Math.max(0, 100 - mape * 10);
}

/**
 * Tahmin Doğruluğu: yön yanlışsa 0; yön doğruysa MAPE bazlı kırılım
 * MAPE < 1% → 100, 1–3% → 75, 3–5% → 50, ≥5% → 25
 */
function tahminDogrulugu(yonDogru: boolean, mape: number): number {
  if (!yonDogru) return 0;
  if (mape < 1) return 100;
  if (mape < 3) return 75;
  if (mape < 5) return 50;
  return 25;
}

/**
 * Alpha → 0-100 skor (Başarı Skoru bileşeni için normalize)
 * ≥ +10% → 100
 *  0% ~ +10% → 50 → 100
 * -10% ~ 0% → 0 → 50
 * ≤ -10% → 0
 */
function alphaToSkor(alpha: number): number {
  return Math.max(0, Math.min(100, (alpha + 10) * 5));
}

function harfNotu(skor: number): string {
  if (skor >= 85) return "A";
  if (skor >= 70) return "B";
  if (skor >= 55) return "C";
  if (skor >= 40) return "D";
  return "F";
}

/** Hedef Yön: |Beklenen Getiri| < 0.1% → Sabit */
function hedefYon(beklenenGetiri: number): string {
  if (Math.abs(beklenenGetiri) < 0.1) return "Sabit";
  return beklenenGetiri > 0 ? "Yukarı" : "Aşağı";
}

/** Yön isabeti: spot→hedef yönü ile spot→gerçekleşen yönü aynı mı? */
function yonIsabetiCheck(spot: number, hedef: number, gerceklesen: number): boolean {
  const beklenenYon = hedef - spot;
  const gercekYon = gerceklesen - spot;
  if (Math.abs(beklenenYon) < 1e-10) return true; // Sabit → her zaman doğru
  return (beklenenYon > 0 && gercekYon > 0) || (beklenenYon < 0 && gercekYon < 0);
}

// ── Öneri Sistemi ──

const ONERI_LEVELS = ["Strong Sell", "Sell", "Reduce", "Hold", "Buy", "Strong Buy"] as const;
type OneriLevel = (typeof ONERI_LEVELS)[number];

function calcOneri(beklenenGetiri: number, alpha: number, refAlpha: number): OneriLevel {
  // Base recommendation from Alpha
  let level: OneriLevel;
  if (beklenenGetiri > 20 && alpha > 10) level = "Strong Buy";
  else if (beklenenGetiri > 10 && alpha > 5) level = "Buy";
  else if (alpha > 5) level = "Buy";
  else if (beklenenGetiri < -20 && alpha < -10) level = "Strong Sell";
  else if (alpha < -10) level = "Sell";
  else if (alpha < -5) level = "Reduce";
  else level = "Hold";

  // Conviction adjustment from RefAlpha
  const idx = ONERI_LEVELS.indexOf(level);
  if (refAlpha > 0.5 && idx < ONERI_LEVELS.length - 1) {
    level = ONERI_LEVELS[idx + 1];
  } else if (refAlpha < -0.5 && idx > 0) {
    level = ONERI_LEVELS[idx - 1];
  }

  return level;
}

// ── Rate Cache ──

const rateCache = new Map<string, number | null>();

async function fetchRateCached(pair: string, date: string): Promise<number | null> {
  const key = `${pair}:${date}`;
  if (rateCache.has(key)) return rateCache.get(key)!;
  const rate = await fetchRate(pair, date);
  rateCache.set(key, rate);
  return rate;
}

// ── Main ──

async function main() {
  const tahminlerPath = process.argv[2];

  if (!tahminlerPath) {
    console.error("Kullanım: npx tsx src/analyzer/forecast-score.ts <tahminler.csv>");
    process.exit(1);
  }

  const fullPath = path.resolve(tahminlerPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Dosya bulunamadı: ${fullPath}`);
    process.exit(1);
  }

  const tahminler = parseCSV(fs.readFileSync(fullPath, "utf-8")) as unknown as TahminlerRow[];
  console.log(`\n📊 Tahmin Skorlama — ${tahminler.length} tahmin\n`);

  // ── Collect unique trailing dates needed ──
  const trailingRequests = new Set<string>(); // "pair:date"
  for (const t of tahminler) {
    if (t["Yön İsabeti"] === "⏳") continue;
    const vadeAy = parseVadeMonths(t["Vade"]);
    const trailingDate = subtractMonths(t["Tahmin Tarihi"], vadeAy);
    trailingRequests.add(`${t["Varlık"]}:${trailingDate}`);
  }

  console.log(`📡 ${trailingRequests.size} trailing fiyat sorgulanacak (Frankfurter API)\n`);

  // Pre-fetch trailing rates
  let fetchCount = 0;
  for (const req of trailingRequests) {
    const [pair, date] = req.split(":");
    await fetchRateCached(pair, date);
    fetchCount++;
    if (fetchCount % 10 === 0) {
      console.log(`   ${fetchCount}/${trailingRequests.size} sorgu tamamlandı...`);
    }
  }
  console.log(`   ✅ ${fetchCount} trailing fiyat sorgulandı\n`);

  // ── Process rows ──
  const scores: ScoreRow[] = [];

  for (const t of tahminler) {
    const spot = parseFloat(t["Spot Fiyat"]);
    const hedef = parseFloat(t["Hedef Fiyat"]);
    const varlik = t["Varlık"];
    const vade = t["Vade"];
    const vadeAy = parseVadeMonths(vade);
    const gerceklesenStr = t["Gerçekleşen Fiyat"];
    const beklesik = t["Yön İsabeti"] === "⏳";

    // Benchmark: FX için aynı parite (hisseler ileride BIST100)
    const benchmark = varlik;

    // Beklenen Getiri
    const beklenenGetiri = spot > 0 ? (hedef - spot) / spot * 100 : 0;

    // Hedef Yön
    const yon = hedefYon(beklenenGetiri);

    if (beklesik || !gerceklesenStr || gerceklesenStr === "⏳" || gerceklesenStr === "—") {
      // Henüz vade dolmamış — sadece çıkarım sütunları doldur
      scores.push({
        tahminTarihi: t["Tahmin Tarihi"],
        kurum: t["Kurum"],
        analist: t["Analist"],
        format: t["Format"],
        varlik,
        vade,
        hedefTarihi: t["Hedef Tarihi"],
        hedefFiyat: t["Hedef Fiyat"],
        analizTezi: t["Analiz Tezi"],
        benchmark,
        spotFiyat: t["Spot Fiyat"],
        beklenenGetiri: `${beklenenGetiri >= 0 ? "+" : ""}${beklenenGetiri.toFixed(2)}%`,
        gerceklesenFiyat: "⏳",
        gerceklesenGetiri: "⏳",
        hedefYon: yon,
        oneri: "⏳",
        yonIsabeti: "⏳",
        hedefYakinligi: "⏳",
        tahminDogrulugu: "⏳",
        errorMape: "⏳",
        basariSkoru: "⏳",
        refBeklenenGetiri: "⏳",
        refGerceklesenGetiri: "⏳",
        alpha: "⏳",
        refAlpha: "⏳",
      });
      continue;
    }

    const gerceklesen = parseFloat(gerceklesenStr);
    if (isNaN(gerceklesen) || isNaN(spot) || isNaN(hedef)) {
      scores.push({
        tahminTarihi: t["Tahmin Tarihi"], kurum: t["Kurum"], analist: t["Analist"],
        format: t["Format"], varlik, vade, hedefTarihi: t["Hedef Tarihi"],
        hedefFiyat: t["Hedef Fiyat"], analizTezi: t["Analiz Tezi"], benchmark,
        spotFiyat: t["Spot Fiyat"], beklenenGetiri: "—", gerceklesenFiyat: gerceklesenStr,
        gerceklesenGetiri: "—", hedefYon: "—", oneri: "—", yonIsabeti: "—",
        hedefYakinligi: "—", tahminDogrulugu: "—", errorMape: "—", basariSkoru: "—",
        refBeklenenGetiri: "—", refGerceklesenGetiri: "—", alpha: "—", refAlpha: "—",
      });
      continue;
    }

    // Gerçekleşen Getiri
    const gerceklesenGetiri = spot > 0 ? (gerceklesen - spot) / spot * 100 : 0;

    // Yön İsabeti (1/0)
    const yonDogru = yonIsabetiCheck(spot, hedef, gerceklesen);

    // Error (MAPE)
    const mape = calcMape(gerceklesen, hedef);

    // Hedef Yakınlığı (0-100)
    const hYakinlik = hedefYakinligi(mape);

    // Tahmin Doğruluğu
    const tDogruluk = tahminDogrulugu(yonDogru, mape);

    // Trailing benchmark: spot N ay öncesindeki fiyat
    const trailingDate = subtractMonths(t["Tahmin Tarihi"], vadeAy);
    const spotTrailing = await fetchRateCached(varlik, trailingDate);

    let refBeklenen: number | null = null;
    if (spotTrailing !== null && spotTrailing > 0) {
      refBeklenen = (spot - spotTrailing) / spotTrailing * 100;
    }

    // Ref. Gerçekleşen Getiri = yalın benchmark piyasa getirisi
    // FX: benchmark = aynı parite → = Gerçekleşen Getiri
    const refGerceklesen = gerceklesenGetiri;

    // Alpha & RefAlpha
    let alpha: number | null = null;
    let refAlpha: number | null = null;
    if (refBeklenen !== null) {
      alpha = beklenenGetiri - refBeklenen;
      refAlpha = alpha / Math.max(Math.abs(beklenenGetiri), 0.05);
    }

    // Öneri
    const oneri = alpha !== null && refAlpha !== null
      ? calcOneri(beklenenGetiri, alpha, refAlpha)
      : "—";

    // Başarı Skoru
    const alphaSkor = alpha !== null ? alphaToSkor(alpha) : 50;
    const basari = (yonDogru ? 100 : 0) * 0.40
      + hYakinlik * 0.30
      + alphaSkor * 0.20
      + tDogruluk * 0.10;

    scores.push({
      tahminTarihi: t["Tahmin Tarihi"],
      kurum: t["Kurum"],
      analist: t["Analist"],
      format: t["Format"],
      varlik,
      vade,
      hedefTarihi: t["Hedef Tarihi"],
      hedefFiyat: t["Hedef Fiyat"],
      analizTezi: t["Analiz Tezi"],
      benchmark,
      spotFiyat: t["Spot Fiyat"],
      beklenenGetiri: `${beklenenGetiri >= 0 ? "+" : ""}${beklenenGetiri.toFixed(2)}%`,
      gerceklesenFiyat: gerceklesen.toFixed(4),
      gerceklesenGetiri: `${gerceklesenGetiri >= 0 ? "+" : ""}${gerceklesenGetiri.toFixed(2)}%`,
      hedefYon: yon,
      oneri,
      yonIsabeti: yonDogru ? "1" : "0",
      hedefYakinligi: hYakinlik.toFixed(1),
      tahminDogrulugu: String(tDogruluk),
      errorMape: `${mape.toFixed(2)}%`,
      basariSkoru: `${basari.toFixed(1)} (${harfNotu(basari)})`,
      refBeklenenGetiri: refBeklenen !== null ? `${refBeklenen >= 0 ? "+" : ""}${refBeklenen.toFixed(2)}%` : "—",
      refGerceklesenGetiri: `${refGerceklesen >= 0 ? "+" : ""}${refGerceklesen.toFixed(2)}%`,
      alpha: alpha !== null ? `${alpha >= 0 ? "+" : ""}${alpha.toFixed(2)}%` : "—",
      refAlpha: refAlpha !== null ? `${refAlpha >= 0 ? "+" : ""}${refAlpha.toFixed(2)}` : "—",
    });
  }

  // ── Konsol tablosu ──
  const evaluated = scores.filter((s) => s.basariSkoru !== "⏳" && s.basariSkoru !== "—");
  const pending = scores.filter((s) => s.basariSkoru === "⏳");
  console.log("─".repeat(130));
  console.log(
    "Tarih".padEnd(12),
    "Varlık".padEnd(9),
    "Vade".padEnd(5),
    "Yön".padEnd(7),
    "Öneri".padEnd(14),
    "MAPE".padEnd(8),
    "Yak.lık".padEnd(8),
    "Doğr.".padEnd(6),
    "Alpha".padEnd(10),
    "RefAlpha".padEnd(10),
    "Skor",
  );
  console.log("─".repeat(130));

  for (const s of scores) {
    if (s.basariSkoru === "⏳") continue;
    console.log(
      s.tahminTarihi.padEnd(12),
      s.varlik.padEnd(9),
      s.vade.padEnd(5),
      s.hedefYon.padEnd(7),
      s.oneri.padEnd(14),
      s.errorMape.padEnd(8),
      s.hedefYakinligi.padEnd(8),
      s.tahminDogrulugu.padEnd(6),
      s.alpha.padEnd(10),
      s.refAlpha.padEnd(10),
      s.basariSkoru,
    );
  }

  if (pending.length > 0) {
    console.log(`\n⏳ ${pending.length} tahmin henüz vadesi dolmadığı için değerlendirilmedi`);
  }

  // ── Summary stats ──
  const numericScores = evaluated
    .map((s) => parseFloat(s.basariSkoru))
    .filter((n) => !isNaN(n));
  if (numericScores.length > 0) {
    const avg = numericScores.reduce((a, b) => a + b, 0) / numericScores.length;
    console.log(`\n📊 Ortalama Başarı Skoru: ${avg.toFixed(1)} (${harfNotu(avg)})`);
    console.log(`   Değerlendirilen: ${numericScores.length} | Bekleyen: ${pending.length}`);
  }

  // ── CSV ──
  const csvHeaders = [
    "Tahmin Tarihi", "Kurum", "Analist", "Format", "Varlık", "Vade",
    "Hedef Tarihi", "Hedef Fiyat", "Analiz Tezi", "Benchmark",
    "Tahmin tarihindeki Fiyat", "Beklenen Getiri %", "Gerçekleşen Fiyat",
    "Gerçekleşen Getiri %", "Hedef Yön", "Öneri", "Yön İsabeti",
    "Hedef Yakınlığı", "Tahmin Doğruluğu", "Error (MAPE)", "Başarı Skoru",
    "Ref. Beklenen Getiri %", "Ref. Gerçekleşen Getiri %", "Alpha", "RefAlpha",
  ];

  const csvRows = scores.map((s) => [
    s.tahminTarihi, s.kurum, s.analist, s.format, s.varlik, s.vade,
    s.hedefTarihi, s.hedefFiyat, s.analizTezi, s.benchmark,
    s.spotFiyat, s.beklenenGetiri, s.gerceklesenFiyat,
    s.gerceklesenGetiri, s.hedefYon, s.oneri, s.yonIsabeti,
    s.hedefYakinligi, s.tahminDogrulugu, s.errorMape, s.basariSkoru,
    s.refBeklenenGetiri, s.refGerceklesenGetiri, s.alpha, s.refAlpha,
  ]);

  const escapeCsv = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csvContent = [
    csvHeaders.map(escapeCsv).join(","),
    ...csvRows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  // ── MD ──
  const mdLines: string[] = [];
  mdLines.push("# Tahmin Skorları");
  mdLines.push("");
  mdLines.push(`| ${csvHeaders.join(" | ")} |`);
  mdLines.push(`| ${csvHeaders.map(() => "---").join(" | ")} |`);
  for (const row of csvRows) {
    mdLines.push(`| ${row.join(" | ")} |`);
  }
  mdLines.push("");
  mdLines.push("## Formüller");
  mdLines.push("");
  mdLines.push("```");
  mdLines.push("MAPE = |Gerçekleşen − Hedef| / |Hedef| × 100");
  mdLines.push("Beklenen Getiri = (Hedef − Spot) / Spot × 100");
  mdLines.push("Gerçekleşen Getiri = (Gerçekleşen − Spot) / Spot × 100");
  mdLines.push("Alpha = Beklenen Getiri − Ref. Beklenen Getiri");
  mdLines.push("RefAlpha = Alpha / max(|Beklenen Getiri|, 0.05)");
  mdLines.push("Hedef Yakınlığı = max(0, 100 − MAPE × 10)");
  mdLines.push("Başarı Skoru = Yön×100 × 0.40 + Hedef Yakınlığı × 0.30 + AlphaSkor × 0.20 + Tahmin Doğruluğu × 0.10");
  mdLines.push("```");
  mdLines.push("");
  mdLines.push("## Öneri Kuralları");
  mdLines.push("");
  mdLines.push("| Koşul | Öneri |");
  mdLines.push("|-------|-------|");
  mdLines.push("| Beklenen > 20% VE Alpha > 10% | Strong Buy |");
  mdLines.push("| Beklenen > 10% VE Alpha > 5% | Buy |");
  mdLines.push("| Alpha > 5% | Buy |");
  mdLines.push("| Beklenen < -20% VE Alpha < -10% | Strong Sell |");
  mdLines.push("| Alpha < -10% | Sell |");
  mdLines.push("| Alpha < -5% | Reduce |");
  mdLines.push("| -5% ≤ Alpha ≤ 5% | Hold |");
  mdLines.push("");
  mdLines.push("**Conviction düzeltmesi:** RefAlpha > +0.5 → bir kademe yukarı, RefAlpha < -0.5 → bir kademe aşağı");

  // ── Kaydet ──
  const outDir = path.dirname(fullPath);
  const mdPath = path.join(outDir, "tahmin_skorlari.md");
  const csvPath = path.join(outDir, "tahmin_skorlari.csv");

  fs.writeFileSync(mdPath, mdLines.join("\n"));
  fs.writeFileSync(csvPath, csvContent);

  console.log(`\n💾 MD:  ${mdPath}`);
  console.log(`💾 CSV: ${csvPath}`);
}

main().catch((err) => {
  console.error("\n💥 Kritik hata:", err);
  process.exit(1);
});
