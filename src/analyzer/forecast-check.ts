import fs from "node:fs";
import path from "node:path";

// ── Types ──

interface ForecastEntry {
  date: string;       // YYYY-MM-DD
  pair: string;       // e.g. "EUR/USD"
  spot: number | null;
  forecast1m: number | null;
  forecast3m: number | null;
  forecast6m: number | null;
  forecast12m: number | null;
  consensus1m: number | null;
  consensus3m: number | null;
  consensus6m: number | null;
  consensus12m: number | null;
  forward1m: number | null;
  forward3m: number | null;
  forward6m: number | null;
  forward12m: number | null;
  documentId?: string;
  documentName?: string;
  format?: string;
  institution?: string;
  analyst?: string;
  thesis?: string;
  reference?: string;
  sourcePath?: string;
}

interface DeviationResult {
  date: string;
  pair: string;
  spot: number | null;
  forecast1m: number | null;
  actual1m: number | null;
  deviation1m_pips: number | null;
  deviation1m_pct: string | null;
  forecast3m: number | null;
  actual3m: number | null;
  deviation3m_pips: number | null;
  deviation3m_pct: string | null;
  forecast6m: number | null;
  actual6m: number | null;
  deviation6m_pips: number | null;
  deviation6m_pct: string | null;
  forecast12m: number | null;
  actual12m: number | null;
  deviation12m_pips: number | null;
  deviation12m_pct: string | null;
  // Consensus & Forward values (pass-through for doc-score)
  consensus1m: number | null;
  consensus3m: number | null;
  consensus6m: number | null;
  consensus12m: number | null;
  forward1m: number | null;
  forward3m: number | null;
  forward6m: number | null;
  forward12m: number | null;
  // Alpha: positive = kurum daha isabetli
  alpha_vs_consensus_pips: number | null;  // |consensus - actual| - |forecast - actual| (1M)
  alpha_vs_forward_pips: number | null;    // |forward - actual| - |forecast - actual| (1M)
  alpha_vs_consensus_pct: number | null;   // alpha as % of spot
  alpha_vs_forward_pct: number | null;     // alpha as % of spot
  source: "cross-report" | "api" | null;
  splitRatio?: number; // 1.0 = no split; 0.1 = 10:1 split applied
  documentId?: string;
  documentName?: string;
  format?: string;
  institution?: string;
  analyst?: string;
  thesis?: string;
  reference?: string;
  sourcePath?: string;
}

// ── API ──

/** Frankfurter API desteklenen pariteler (base EUR) */
const FRANKFURTER_CURRENCIES = new Set([
  "USD", "GBP", "JPY", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "CAD", "AUD", "NZD", "CNY", "TRY",
]);

/**
 * Hisse senedi mi (BIST ticker) yoksa FX paritesi mi kontrol et.
 * "/" içermeyen ve GRAM-ALTIN/GRAM-GUMUS/BIST100 olmayan varlıklar hisse olarak kabul edilir.
 */
function isStock(pair: string): boolean {
  return !pair.includes("/") && pair !== "GRAM-ALTIN" && pair !== "GRAM-GUMUS" && pair !== "BIST100";
}

/**
 * Yahoo Finance v8 chart API üzerinden hisse/endeks fiyatı çeker.
 * Ticker formatı: AKBNK.IS (BIST), XU100.IS (BIST100 endeksi).
 * Hafta sonu/tatil günlerinde veri olmayabileceği için ±7 gün aralık kullanır.
 */
async function fetchStockPrice(ticker: string, date?: string): Promise<number | null> {
  const yahooTicker = ticker.endsWith(".IS") ? ticker : `${ticker}.IS`;
  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  const targetTime = new Date(targetDate + "T00:00:00Z").getTime() / 1000;

  // ±7 gün aralık (hafta sonu/tatil toleransı)
  const period1 = Math.floor(targetTime - 7 * 86400);
  const period2 = Math.floor(targetTime + 7 * 86400);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?period1=${period1}&period2=${period2}&interval=1d`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      chart: {
        result: Array<{
          timestamp: number[];
          indicators: { quote: Array<{ close: (number | null)[] }> };
        }> | null;
      };
    };

    const result = data.chart?.result?.[0];
    if (!result?.timestamp?.length) return null;

    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;
    const targetMs = targetTime * 1000;

    // En yakın tarihi bul
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < timestamps.length; i++) {
      const dist = Math.abs(timestamps[i] * 1000 - targetMs);
      if (dist < bestDist && closes[i] !== null) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    return closes[bestIdx] ?? null;
  } catch {
    return null;
  }
}

/** ECB Data API ile desteklenen metal kodları */
const METALS = new Set(["XAU", "XAG"]);

/**
 * Hisse senedi split tespiti: Raporun spot fiyatını Yahoo Finance'in split-adjusted
 * tarihsel kapanış fiyatıyla karşılaştırır. Yahoo tüm geçmiş fiyatları split-sonrası bazına
 * retroaktif olarak düzeltir, dolayısıyla rapor spot / Yahoo close oranı > 1.8 ise raporun
 * split-öncesi fiyat kullandığı anlaşılır.
 *
 * Döndürülen oran (0 < ratio < 1): raporun spot ve forecast değerlerini çarpmak için kullanılır.
 * Ör: 10:1 split → oran ≈ 0.1 (eski fiyatlar 10'a bölünür)
 */
async function getStockSplitRatio(ticker: string, date: string, reportSpot: number | null): Promise<number> {
  if (reportSpot === null || reportSpot === 0) return 1;

  const yahooClose = await fetchStockPrice(ticker, date);
  if (yahooClose === null || yahooClose === 0) return 1;

  const ratio = reportSpot / yahooClose;
  // If report spot is >1.8× Yahoo's (split-adjusted) close, the report uses pre-split prices
  if (ratio > 1.8) {
    return yahooClose / reportSpot;
  }
  return 1;
}

/**
 * ECB Statistical Data Warehouse'dan metal fiyatı çeker (EUR bazlı).
 * XAU = altın, XAG = gümüş — troy ons başına EUR değeri döner.
 * Hafta sonu/tatil günlerinde veri olmayabileceği için 7 günlük aralık kullanır.
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

    // CSV: KEY,FREQ,...,TIME_PERIOD,OBS_VALUE — son satırdan en yakın tarihi al
    let bestValue: number | null = null;
    let bestDist = Infinity;
    const targetTime = new Date(d + "T00:00:00Z").getTime();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      // TIME_PERIOD ve OBS_VALUE sondaki iki sütun
      const timePeriod = cols[cols.length - 2]?.trim();
      const obsValue = parseFloat(cols[cols.length - 1]);
      if (!timePeriod || isNaN(obsValue)) continue;
      const dist = Math.abs(new Date(timePeriod + "T00:00:00Z").getTime() - targetTime);
      if (dist < bestDist) {
        bestDist = dist;
        bestValue = obsValue;
      }
    }
    return bestValue;
  } catch {
    return null;
  }
}

/**
 * Bir paritenin Frankfurter API ile sorgulanıp sorgulanamayacağını kontrol eder.
 * API yalnızca EUR bazlı çiftleri destekler. USD/JPY gibi çiftler EUR üzerinden hesaplanır.
 */
function parseApiPair(pair: string): { from: string; to: string } | null {
  const [base, quote] = pair.split("/");
  if (base === "EUR" && FRANKFURTER_CURRENCIES.has(quote)) return { from: "EUR", to: quote };
  if (quote === "EUR" && FRANKFURTER_CURRENCIES.has(base)) return { from: "EUR", to: base };
  // USD/JPY gibi çapraz pariteler → EUR üzerinden hesaplanır
  if (FRANKFURTER_CURRENCIES.has(base) && FRANKFURTER_CURRENCIES.has(quote)) return { from: base, to: quote };
  return null;
}

/**
 * Herhangi bir varlık için fiyat çeker.
 * - Frankfurter: FX pariteleri (EUR/USD, USD/TRY, USD/JPY vb.)
 * - ECB + Frankfurter: Metal pariteleri (XAU/USD, XAG/USD)
 * - Hesaplama: Gram pariteleri (GRAM-ALTIN, GRAM-GUMUS)
 * - BIST100: API desteklenmiyor → null
 */
async function fetchRate(pair: string, date?: string): Promise<number | null> {
  // ── Metal pariteleri: XAU/USD, XAG/USD, XAU/EUR, XAG/EUR ──
  const [base, quote] = pair.split("/");
  if (base && quote && METALS.has(base)) {
    const metalEur = await fetchMetalRateECB(base, date);
    if (metalEur === null) return null;
    if (quote === "EUR") return metalEur;
    // XAU/USD = XAU/EUR × (EUR/USD)
    const eurToQuote = await fetchRate(`EUR/${quote}`, date);
    if (eurToQuote === null) return null;
    return metalEur * eurToQuote;
  }

  // ── Gram pariteleri: GRAM-ALTIN, GRAM-GUMUS (TRY/gram) ──
  if (pair === "GRAM-ALTIN" || pair === "GRAM-GUMUS") {
    const metal = pair === "GRAM-ALTIN" ? "XAU" : "XAG";
    const metalEur = await fetchMetalRateECB(metal, date);
    const eurTry = await fetchRate("EUR/TRY", date);
    if (metalEur !== null && eurTry !== null) return (metalEur * eurTry) / 31.1035;
    return null;
  }

  // ── BIST100: Yahoo Finance ──
  if (pair === "BIST100") return fetchStockPrice("XU100", date);

  // ── BIST hisse senetleri: Yahoo Finance ──
  if (isStock(pair)) return fetchStockPrice(pair, date);

  // ── Frankfurter API: standart FX pariteleri ──
  const parsed = parseApiPair(pair);
  if (!parsed) return null;

  const [pairBase, pairQuote] = pair.split("/");

  // EUR bazlı çiftler doğrudan sorgulanır
  if (pairBase === "EUR") {
    const endpoint = date
      ? `https://api.frankfurter.app/${date}?from=EUR&to=${pairQuote}`
      : `https://api.frankfurter.app/latest?from=EUR&to=${pairQuote}`;
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`API ${res.status}: ${endpoint}`);
    const data = (await res.json()) as { rates: Record<string, number> };
    return data.rates[pairQuote];
  }

  // USD/JPY gibi çapraz çiftler → EUR'dan her iki bacağı çekip hesapla
  const endpoint = date
    ? `https://api.frankfurter.app/${date}?from=EUR&to=${pairBase},${pairQuote}`
    : `https://api.frankfurter.app/latest?from=EUR&to=${pairBase},${pairQuote}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`API ${res.status}: ${endpoint}`);
  const data = (await res.json()) as { rates: Record<string, number> };
  // USD/JPY = (EUR/JPY) / (EUR/USD)
  return data.rates[pairQuote] / data.rates[pairBase];
}

async function resolveSpot(entry: ForecastEntry, cache: WeakMap<ForecastEntry, number | null>): Promise<number | null> {
  if (cache.has(entry)) {
    return cache.get(entry) ?? null;
  }

  let spot = entry.spot;
  if (spot === null) {
    try {
      spot = await fetchRate(entry.pair, entry.date);
    } catch {
      spot = null;
    }
  }

  cache.set(entry, spot);
  return spot;
}

/**
 * +1M sonrası tarihi hesaplar (yaklaşık 1 ay sonra).
 */
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * JPY pariteleri 2-haneli (1 pip = 0.01), metaller birim fiyat, hisseler birim fiyat, diğerleri 4-haneli (1 pip = 0.0001)
 */
function pipMultiplier(pair: string): number {
  if (pair === "XAU/USD" || pair === "GRAM-ALTIN" || pair === "BIST100") return 1;
  if (pair === "XAG/USD" || pair === "GRAM-GUMUS") return 100;
  if (isStock(pair)) return 1;
  if (pair.includes("JPY")) return 100;
  return 10000;
}

function calcPips(actual: number, forecast: number, pair: string): number {
  return Math.round((actual - forecast) * pipMultiplier(pair));
}

function calcPct(actual: number, forecast: number): string {
  return (((actual - forecast) / forecast) * 100).toFixed(2) + "%";
}

// ── Main ──

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Kullanım: npx tsx src/analyzer/forecast-check.ts <forecasts.json>");
    console.error("\nforecasts.json formatı:");
    console.error('[{ "date": "2025-06-23", "pair": "EUR/USD", "spot": 1.15, "forecast1m": 1.16, "forecast3m": 1.18, "forecast6m": 1.20, "forecast12m": 1.22, "consensus1m": 1.14, "forward1m": 1.15, ... }]');
    process.exit(1);
  }

  const fullPath = path.resolve(inputPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Dosya bulunamadı: ${fullPath}`);
    process.exit(1);
  }

  const raw: ForecastEntry[] = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  // Normalize: undefined → null for optional fields
  const forecasts: ForecastEntry[] = raw.map((f) => ({
    ...f,
    spot: f.spot ?? null,
    forecast1m: f.forecast1m ?? null,
    forecast3m: f.forecast3m ?? null,
    forecast6m: f.forecast6m ?? null,
    forecast12m: f.forecast12m ?? null,
    consensus1m: f.consensus1m ?? null,
    consensus3m: f.consensus3m ?? null,
    consensus6m: f.consensus6m ?? null,
    consensus12m: f.consensus12m ?? null,
    forward1m: f.forward1m ?? null,
    forward3m: f.forward3m ?? null,
    forward6m: f.forward6m ?? null,
    forward12m: f.forward12m ?? null,
  }));

  // Paritelere göre grupla
  const pairGroups = new Map<string, ForecastEntry[]>();
  for (const f of forecasts) {
    const group = pairGroups.get(f.pair) ?? [];
    group.push(f);
    pairGroups.set(f.pair, group);
  }

  const allPairs = [...pairGroups.keys()].sort();
  console.log(`\n📈 ${forecasts.length} kayıt yüklendi (${allPairs.length} parite: ${allPairs.join(", ")})\n`);

  const allResults: DeviationResult[] = [];
  const spotCache = new WeakMap<ForecastEntry, number | null>();

  for (const [pair, entries] of pairGroups) {
    entries.sort((a, b) => a.date.localeCompare(b.date));

    console.log(`\n━━━ ${pair} (${entries.length} rapor) ━━━`);

    const results: DeviationResult[] = [];
    const today = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < entries.length; i++) {
      const cur = entries[i];
      const isLast = i === entries.length - 1;
      const spot = await resolveSpot(cur, spotCache);

      let actual1m: number | null = null;
      let actual3m: number | null = null;
      let actual6m: number | null = null;
      let actual12m: number | null = null;
      let source: DeviationResult["source"] = null;

      if (!isLast) {
        actual1m = await resolveSpot(entries[i + 1], spotCache);
        source = "cross-report";
        if (i + 3 < entries.length) {
          actual3m = await resolveSpot(entries[i + 3], spotCache);
        }
        if (i + 6 < entries.length) {
          actual6m = await resolveSpot(entries[i + 6], spotCache);
        }
        if (i + 12 < entries.length) {
          actual12m = await resolveSpot(entries[i + 12], spotCache);
        }
        // Cross-report'ta bulunamayan uzun vadeler için API'ye düş
        if (actual3m === null && cur.forecast3m !== null) {
          const target = addMonths(cur.date, 3);
          if (target <= today) { try { actual3m = await fetchRate(pair, target); } catch { /* */ } }
        }
        if (actual6m === null && cur.forecast6m !== null) {
          const target = addMonths(cur.date, 6);
          if (target <= today) { try { actual6m = await fetchRate(pair, target); } catch { /* */ } }
        }
        if (actual12m === null && cur.forecast12m !== null) {
          const target = addMonths(cur.date, 12);
          if (target <= today) { try { actual12m = await fetchRate(pair, target); } catch { /* */ } }
        }
      } else {
        try {
          const target1m = addMonths(cur.date, 1);
          if (cur.forecast1m !== null && target1m <= today) {
            actual1m = await fetchRate(pair);
            if (actual1m !== null) {
              source = "api";
              console.log(`📡 API'den güncel ${pair}: ${actual1m.toFixed(4)}`);
            }
          }
          for (const months of [3, 6, 12] as const) {
            const target = addMonths(cur.date, months);
            if (target <= today) {
              try {
                const rate = await fetchRate(pair, target);
                if (months === 3) actual3m = rate;
                else if (months === 6) actual6m = rate;
                else actual12m = rate;
                if (rate !== null) {
                  source = "api";
                }
              } catch { /* vade henüz dolmamış */ }
            }
          }
        } catch (err) {
          console.error(`⚠️  API hatası (${pair}): ${err instanceof Error ? err.message : err}`);
        }
      }

      // ── Hisse senedi split tespiti ve düzeltmesi ──
      let adjSpot = spot;
      let adjForecast1m = cur.forecast1m;
      let adjForecast3m = cur.forecast3m;
      let adjForecast6m = cur.forecast6m;
      let adjForecast12m = cur.forecast12m;
      let splitRatio = 1;

      if (isStock(pair)) {
        splitRatio = await getStockSplitRatio(pair, cur.date, cur.spot);
        if (splitRatio !== 1) {
          console.log(`  ⚠️  ${pair} split tespit edildi (oran: ${splitRatio.toFixed(4)}, rapor tarihi: ${cur.date}) — spot/forecast değerleri düzeltiliyor`);
          if (adjSpot !== null) adjSpot = adjSpot * splitRatio;
          if (adjForecast1m !== null) adjForecast1m = adjForecast1m * splitRatio;
          if (adjForecast3m !== null) adjForecast3m = adjForecast3m * splitRatio;
          if (adjForecast6m !== null) adjForecast6m = adjForecast6m * splitRatio;
          if (adjForecast12m !== null) adjForecast12m = adjForecast12m * splitRatio;
        }
      }

      const result: DeviationResult = {
        date: cur.date,
        pair: cur.pair,
        spot: adjSpot,
        forecast1m: adjForecast1m,
        actual1m,
        deviation1m_pips: actual1m !== null && adjForecast1m !== null ? calcPips(actual1m, adjForecast1m, cur.pair) : null,
        deviation1m_pct: actual1m !== null && adjForecast1m !== null ? calcPct(actual1m, adjForecast1m) : null,
        forecast3m: adjForecast3m,
        actual3m,
        deviation3m_pips: actual3m !== null && adjForecast3m !== null ? calcPips(actual3m, adjForecast3m, cur.pair) : null,
        deviation3m_pct: actual3m !== null && adjForecast3m !== null ? calcPct(actual3m, adjForecast3m) : null,
        forecast6m: adjForecast6m,
        actual6m,
        deviation6m_pips: actual6m !== null && adjForecast6m !== null ? calcPips(actual6m, adjForecast6m, cur.pair) : null,
        deviation6m_pct: actual6m !== null && adjForecast6m !== null ? calcPct(actual6m, adjForecast6m) : null,
        forecast12m: adjForecast12m,
        actual12m,
        deviation12m_pips: actual12m !== null && adjForecast12m !== null ? calcPips(actual12m, adjForecast12m, cur.pair) : null,
        deviation12m_pct: actual12m !== null && adjForecast12m !== null ? calcPct(actual12m, adjForecast12m) : null,
        consensus1m: cur.consensus1m,
        consensus3m: cur.consensus3m,
        consensus6m: cur.consensus6m,
        consensus12m: cur.consensus12m,
        forward1m: cur.forward1m,
        forward3m: cur.forward3m,
        forward6m: cur.forward6m,
        forward12m: cur.forward12m,
        // Alpha: |benchmark - actual| - |forecast - actual| → pozitif = kurum daha isabetli
        alpha_vs_consensus_pips: actual1m !== null && cur.consensus1m !== null && adjForecast1m !== null
          ? Math.round(Math.abs(cur.consensus1m - actual1m) * pipMultiplier(cur.pair) - Math.abs(adjForecast1m - actual1m) * pipMultiplier(cur.pair))
          : null,
        alpha_vs_forward_pips: actual1m !== null && cur.forward1m !== null && adjForecast1m !== null
          ? Math.round(Math.abs(cur.forward1m - actual1m) * pipMultiplier(cur.pair) - Math.abs(adjForecast1m - actual1m) * pipMultiplier(cur.pair))
          : null,
        // Alpha yüzdesel: spot'a göre normalize (pariteler arası karşılaştırılabilir)
        alpha_vs_consensus_pct: actual1m !== null && cur.consensus1m !== null && adjForecast1m !== null && adjSpot !== null
          ? +((Math.abs(cur.consensus1m - actual1m) - Math.abs(adjForecast1m - actual1m)) / adjSpot * 100).toFixed(4)
          : null,
        alpha_vs_forward_pct: actual1m !== null && cur.forward1m !== null && adjForecast1m !== null && adjSpot !== null
          ? +((Math.abs(cur.forward1m - actual1m) - Math.abs(adjForecast1m - actual1m)) / adjSpot * 100).toFixed(4)
          : null,
        source,
        splitRatio: splitRatio !== 1 ? splitRatio : undefined,
        documentId: cur.documentId,
        documentName: cur.documentName,
        format: cur.format,
        institution: cur.institution,
        analyst: cur.analyst,
        thesis: cur.thesis,
        reference: cur.reference,
        sourcePath: cur.sourcePath,
      };
      results.push(result);
      allResults.push(result);
    }

    // ── Parite tablosu yazdır ──
    console.log("─".repeat(140));
    console.log(
      "Tarih".padEnd(12),
      "Spot".padEnd(7),
      "+1M Tah".padEnd(8),
      "Gerçek.".padEnd(8),
      "Sapma".padEnd(7),
      "+3M Tah".padEnd(8),
      "Gerçek.".padEnd(8),
      "Sapma".padEnd(7),
      "+6M Tah".padEnd(8),
      "Gerçek.".padEnd(8),
      "Sapma".padEnd(7),
      "+12M Tah".padEnd(9),
      "Gerçek.".padEnd(8),
      "Sapma".padEnd(7),
      "Kaynak",
    );
    console.log("─".repeat(140));

    for (const r of results) {
      console.log(
        r.date.padEnd(12),
        (r.spot !== null ? r.spot.toFixed(2) : "—").padEnd(7),
        (r.forecast1m?.toFixed(2) ?? "—").padEnd(8),
        (r.actual1m?.toFixed(4) ?? "—").padEnd(8),
        (r.deviation1m_pips?.toString() ?? "—").padEnd(7),
        (r.forecast3m?.toFixed(2) ?? "—").padEnd(8),
        (r.actual3m?.toFixed(4) ?? "—").padEnd(8),
        (r.deviation3m_pips?.toString() ?? "—").padEnd(7),
        (r.forecast6m?.toFixed(2) ?? "—").padEnd(8),
        (r.actual6m?.toFixed(4) ?? "—").padEnd(8),
        (r.deviation6m_pips?.toString() ?? "—").padEnd(7),
        (r.forecast12m?.toFixed(2) ?? "—").padEnd(9),
        (r.actual12m?.toFixed(4) ?? "—").padEnd(8),
        (r.deviation12m_pips?.toString() ?? "—").padEnd(7),
        r.source ?? "—",
      );
    }

    // ── Parite özet istatistikleri ──
    const valid1m = results.filter((r) => r.deviation1m_pips !== null);
    if (valid1m.length > 0) {
      const avgPips = valid1m.reduce((s, r) => s + Math.abs(r.deviation1m_pips!), 0) / valid1m.length;
      const bestIdx = valid1m.reduce((best, r, i) =>
        Math.abs(r.deviation1m_pips!) < Math.abs(valid1m[best].deviation1m_pips!) ? i : best, 0);
      const worstIdx = valid1m.reduce((worst, r, i) =>
        Math.abs(r.deviation1m_pips!) > Math.abs(valid1m[worst].deviation1m_pips!) ? i : worst, 0);

      console.log(`\n📊 ${pair} +1M Performans:`);
      console.log(`   Ort. sapma: ${avgPips.toFixed(0)} pip | İsabetli: ${valid1m[bestIdx].date} (${valid1m[bestIdx].deviation1m_pips} pip) | Sapan: ${valid1m[worstIdx].date} (${valid1m[worstIdx].deviation1m_pips} pip)`);
    }
  }

  // ── Genel özet ──
  console.log("\n" + "═".repeat(100));
  console.log("📊 GENEL ÖZET");
  console.log("═".repeat(100));
  for (const pair of allPairs) {
    const pairResults = allResults.filter((r) => r.pair === pair && r.deviation1m_pips !== null);
    if (pairResults.length > 0) {
      const avg = pairResults.reduce((s, r) => s + Math.abs(r.deviation1m_pips!), 0) / pairResults.length;
      console.log(`   ${pair.padEnd(10)} Ort. |sapma|: ${avg.toFixed(0)} pip (${pairResults.length} veri noktası)`);
    }
  }

  // ── Sonuçları JSON olarak kaydet ──
  const outputPath = fullPath.replace(".json", "-results.json");
  fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
  console.log(`\n💾 Sonuçlar: ${outputPath}`);
}

main().catch((err) => {
  console.error("Hata:", err instanceof Error ? err.message : err);
  process.exit(1);
});
