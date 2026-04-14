import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { extractTextFromPdf } from "../src/analyzer/extract-text.ts";

type HorizonKey = "1m" | "3m" | "6m" | "12m";

interface AssumptionItem {
  text: string;
  ref: string;
  pair?: string;
}

interface PairContext {
  analyst: string;
  reference: string;
  riskReference?: string;
}

interface ForecastRecord {
  date: string;
  pair: string;
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
  documentId: string;
  documentName: string;
  format: string;
  institution: string;
  analyst: string;
  thesis: string;
  reference: string;
  sourcePath: string;
}

interface DeviationResult extends ForecastRecord {
  actual1m: number | null;
  deviation1m_pips: number | null;
  deviation1m_pct: string | null;
  actual3m: number | null;
  deviation3m_pips: number | null;
  deviation3m_pct: string | null;
  actual6m: number | null;
  deviation6m_pips: number | null;
  deviation6m_pct: string | null;
  actual12m: number | null;
  deviation12m_pips: number | null;
  deviation12m_pct: string | null;
  alpha_vs_consensus_pips: number | null;
  alpha_vs_forward_pips: number | null;
  alpha_vs_consensus_pct: number | null;
  alpha_vs_forward_pct: number | null;
  source: "cross-report" | "api" | null;
}

interface DocumentAnalysis {
  id: string;
  date: string;
  institution: string;
  analysts: string;
  format: "PDF" | "Video";
  name: string;
  summary: string;
  thesis: string;
  assumptions: AssumptionItem[];
  risks: string[];
  forecasts: ForecastRecord[];
  sourcePath: string;
  sortKey: string;
  primaryRef: string;
  varsayimGerceklesme?: string;
  tahminSapmasi?: string;
}

const ROOT = path.resolve(process.argv[2] ?? process.cwd());
const RAPORLAR_DIR = path.join(ROOT, "raporlar");
const ANALIZLER_DIR = path.join(ROOT, "analizler");
const HORIZONS: HorizonKey[] = ["1m", "3m", "6m", "12m"];
const PDF_SECTION_PAIRS = [
  "EUR/USD",
  "EUR/SEK",
  "EUR/NOK",
  "EUR/DKK",
  "EUR/GBP",
  "USD/JPY",
  "EUR/CHF",
  "EUR/PLN",
  "AUD/USD",
  "USD/CAD",
  "USD/CNY",
];

const ALLOWED_PDF_PAIRS = new Set([
  "EUR/USD",
  "EUR/JPY",
  "EUR/GBP",
  "EUR/CHF",
  "EUR/SEK",
  "EUR/NOK",
  "EUR/DKK",
  "EUR/AUD",
  "EUR/NZD",
  "EUR/CAD",
  "EUR/PLN",
  "EUR/HUF",
  "EUR/CZK",
  "EUR/TRY",
  "EUR/ZAR",
  "EUR/CNY",
  "EUR/INR",
  "USD/JPY",
  "AUD/USD",
  "USD/CAD",
  "USD/CNY",
]);

const PAIR_LABELS: Record<string, string> = {
  "USD/TRY": "dolar/TL",
  "EUR/USD": "EUR/USD",
  "EUR/SEK": "EUR/SEK",
  "EUR/NOK": "EUR/NOK",
  "EUR/DKK": "EUR/DKK",
  "EUR/GBP": "EUR/GBP",
  "USD/JPY": "dolar/yen",
  "EUR/CHF": "EUR/CHF",
  "EUR/PLN": "EUR/PLN",
  "AUD/USD": "AUD/USD",
  "USD/CAD": "USD/CAD",
  "USD/CNY": "USD/CNY",
  "XAU/USD": "ons altın",
  "XAG/USD": "ons gümüş",
  "GRAM-ALTIN": "gram altın",
  "GRAM-GUMUS": "gram gümüş",
  BIST100: "BIST 100",
};

const TRANSCRIPT_ASSETS: Array<{ pair: string; regex: RegExp }> = [
  { pair: "GRAM-ALTIN", regex: /gram alt[ıi]n/ },
  { pair: "GRAM-GUMUS", regex: /gram g[üu]m[üu]ş|gram gumus/ },
  { pair: "USD/TRY", regex: /dolar\s*tl|usd\/?try/ },
  { pair: "USD/JPY", regex: /dolar\s*yen|usd\/?jpy|yen\b/ },
  { pair: "BIST100", regex: /bist\s*100|borsa istanbul|\bbist\b/ },
  { pair: "XAU/USD", regex: /ons alt[ıi]n|(?<!gram )alt[ıi]n/ },
  { pair: "XAG/USD", regex: /ons g[üu]m[üu]ş|(?<!gram )g[üu]m[üu]ş|gümüş|gumus/ },
];

function listFiles(dir: string, extension: string): string[] {
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(fullPath, extension));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) {
      out.push(fullPath);
    }
  }
  return out.sort();
}

function normalizeLine(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeParagraph(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ç]/g, "c")
    .replace(/[ğ]/g, "g")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ş]/g, "s")
    .replace(/[ü]/g, "u")
    .replace(/[^a-z0-9/+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function quoteRef(value: string, maxLength = 220): string {
  const clean = normalizeParagraph(value).replace(/"/g, "'");
  return clean.length <= maxLength ? clean : clean.slice(0, maxLength - 1).trim() + "…";
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  const fixed = Math.abs(value) >= 100 ? value.toFixed(2) : value.toFixed(4);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function formatSignedPips(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${value}`;
}

function addMonths(dateStr: string, months: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function toMarkdownTable(headers: string[], rows: string[][]): string {
  const header = `| ${headers.map(markdownCell).join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map(markdownCell).join(" | ")} |`).join("\n");
  return [header, separator, body].filter(Boolean).join("\n");
}

function splitSentences(text: string): string[] {
  return normalizeParagraph(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 25);
}

function extractNamesFromLines(lines: string[]): string[] {
  const names: string[] = [];
  for (let index = 0; index < lines.length - 1; index++) {
    const current = normalizeLine(lines[index]);
    const next = normalizeLine(lines[index + 1]);
    if (/^[A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+(?: [A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+)+$/.test(current) && /(Director|Analyst|Associate|Chief Analyst|Senior Analyst|Assistant Analyst)/.test(next)) {
      names.push(current);
    }
  }
  return unique(names);
}

function extractNamesFromText(text: string): string[] {
  const matches = [...text.matchAll(/([A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+(?: [A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+)+), (?:Director|Analyst|Associate|Chief Analyst|Senior Analyst|Assistant Analyst)/g)];
  return unique(matches.map((match) => match[1].trim()));
}

function between(text: string, start: string, endMarkers: string[]): string {
  const startIndex = text.indexOf(start);
  if (startIndex === -1) return "";
  const sliceStart = startIndex + start.length;
  let sliceEnd = text.length;
  for (const marker of endMarkers) {
    const markerIndex = text.indexOf(marker, sliceStart);
    if (markerIndex !== -1 && markerIndex < sliceEnd) {
      sliceEnd = markerIndex;
    }
  }
  return text.slice(sliceStart, sliceEnd).trim();
}

function pickFocusPair(subtitle: string, forecastMap: Map<string, ForecastRecord>): string | null {
  const key = normalizeKey(subtitle);
  if (key.includes("nok") && forecastMap.has("EUR/NOK")) return "EUR/NOK";
  if (key.includes("sek") && forecastMap.has("EUR/SEK")) return "EUR/SEK";
  if (key.includes("dkk") && forecastMap.has("EUR/DKK")) return "EUR/DKK";
  if (key.includes("usd") && forecastMap.has("EUR/USD")) return "EUR/USD";
  if (key.includes("energy") && forecastMap.has("EUR/NOK")) return "EUR/NOK";
  if (key.includes("geopolit") && forecastMap.has("USD/JPY")) return "USD/JPY";
  if (forecastMap.has("EUR/USD")) return "EUR/USD";
  return forecastMap.keys().next().value ?? null;
}

function subtitleToTurkish(subtitle: string): string {
  const key = normalizeKey(subtitle);
  const mappings: Array<[RegExp, string]> = [
    [/nok remains vulnerable/, "NOK tarafındaki kırılganlığın sürdüğü"],
    [/usd rebound is temporary/, "dolar toparlanmasının geçici olduğu"],
    [/still negative on sek and nok/, "SEK ve NOK için negatif görünümün korunduğu"],
    [/rebound in real rates to support usd weigh on scandies/, "reel faizlerdeki toparlanmanın doları destekleyip İskandinav para birimlerini baskıladığı"],
    [/upward pressure on eur\/dkk/, "EUR/DKK üzerinde yukarı baskının arttığı"],
    [/usd to weather ai valuation woes/, "doların AI değerleme baskılarını atlatabildiği"],
    [/weaker usd gbp and nok in 2026/, "2026'da USD, GBP ve NOK'un zayıfladığı"],
    [/geopolitics takes centre stage as 2026 kicks off/, "2026 başlarken jeopolitiğin ana belirleyici olduğu"],
    [/lingering scepticism sustains bearish dollar outlook/, "kalıcı şüpheciliğin ayı dolar görünümünü beslediği"],
    [/energy shock steers global repricing/, "enerji şokunun küresel fiyatlamayı yeniden şekillendirdiği"],
  ];
  for (const [regex, value] of mappings) {
    if (regex.test(key)) return value;
  }
  return `"${subtitle}" temasının öne çıktığı`;
}

function pairLabel(pair: string): string {
  return PAIR_LABELS[pair] ?? pair;
}

function inferDirection(record: { spot: number | null; forecast1m: number | null; forecast3m: number | null; forecast6m: number | null; forecast12m: number | null }, fallbackText?: string): "up" | "down" | "flat" | null {
  if (record.spot !== null) {
    const target = record.forecast1m ?? record.forecast3m ?? record.forecast6m ?? record.forecast12m;
    if (target !== null) {
      if (target > record.spot) return "up";
      if (target < record.spot) return "down";
      return "flat";
    }
  }
  const key = normalizeKey(fallbackText ?? "");
  if (/(yukari|vurul|gidecegini|cikma|firsat|devam)/.test(key)) return "up";
  if (/(asagi|dusecek|dusmesini|geri cekilme|asagisi)/.test(key)) return "down";
  return null;
}

function directionText(direction: "up" | "down" | "flat" | null): string {
  if (direction === "up") return "yukarı yönlü";
  if (direction === "down") return "aşağı yönlü";
  if (direction === "flat") return "yatay";
  return "belirsiz";
}

function buildPdfPairThesis(record: ForecastRecord, pairContext: PairContext | undefined, docThesis: string): string {
  const direction = inferDirection(record, pairContext?.reference);
  const target = record.forecast12m ?? record.forecast6m ?? record.forecast3m ?? record.forecast1m;
  const ref = pairContext?.reference ?? record.reference;
  if (target === null) return docThesis;
  return `${pairLabel(record.pair)} için rapor ${directionText(direction)} bir patika öngörüyor ve hedefi ${formatNumber(target)} seviyesinde topluyor (Ref: "${quoteRef(ref)}")`;
}

function pickRiskLines(sentences: string[], limit: number): string[] {
  const riskSentences = sentences.filter((sentence) => /(risk|dikkat|ama |geri çekil|geri cekil|aşağısı|asagisi|stop|savaş|savas|likidite|panik)/i.test(normalizeKey(sentence)));
  return unique(riskSentences).slice(0, limit);
}

function parsePdfPairContexts(pages: string[]): Map<string, PairContext> {
  const contexts = new Map<string, PairContext>();
  const titleRegex = /(^|\n)([A-Z]{3}\/[A-Z]{3,4})\s+[–-]\s+([^\n]+)/g;

  for (const page of pages) {
    const matches = [...page.matchAll(titleRegex)];
    if (!matches.length) continue;
    for (let index = 0; index < matches.length; index++) {
      const match = matches[index];
      const pair = match[2];
      const start = match.index ?? 0;
      const end = matches[index + 1]?.index ?? page.length;
      const segment = page.slice(start, end);
      const conclusion = segment.match(/• Conclusion\.\s*([\s\S]*?)(?=\n[A-ZÀ-Ý][^\n]+(?:@danskebank|, (?:Director|Analyst|Associate|Chief Analyst|Senior Analyst|Assistant Analyst))|\n-- |$)/)?.[1]?.trim();
      const risk = segment.match(/• Risks?\.\s*([\s\S]*?)(?=\n• Conclusion\.|\n[A-ZÀ-Ý][^\n]+(?:@danskebank|, (?:Director|Analyst|Associate|Chief Analyst|Senior Analyst|Assistant Analyst))|\n-- |$)/)?.[1]?.trim();
      const forecast = segment.match(/Forecast:\s*([^\n]+)/)?.[1]?.trim();
      const analysts = extractNamesFromText(segment);
      contexts.set(pair, {
        analyst: analysts.length ? analysts.join(" / ") : "Ekip",
        reference: quoteRef(conclusion ?? forecast ?? segment),
        riskReference: risk ? quoteRef(risk) : undefined,
      });
    }
  }

  return contexts;
}

function parsePdfForecasts(lines: string[], doc: { id: string; date: string; name: string; institution: string; sourcePath: string; format: "PDF"; thesis: string }, pairContexts: Map<string, PairContext>): ForecastRecord[] {
  const records = new Map<string, ForecastRecord>();
  const rowRegex = /^([A-Z/ ]+?)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)$/;

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    const match = line.match(rowRegex);
    if (!match) continue;
    const pair = match[1].replace(/\s+/g, "");
    if (!/^[A-Z]{3}\/[A-Z]{3,4}$/.test(pair)) continue;
    if (!ALLOWED_PDF_PAIRS.has(pair)) continue;
    if (records.has(pair)) continue;

    const pairContext = pairContexts.get(pair);
    const baseRecord: ForecastRecord = {
      date: doc.date,
      pair,
      spot: Number(match[2]),
      forecast1m: Number(match[3]),
      forecast3m: Number(match[4]),
      forecast6m: Number(match[5]),
      forecast12m: Number(match[6]),
      consensus1m: null,
      consensus3m: null,
      consensus6m: null,
      consensus12m: null,
      forward1m: null,
      forward3m: null,
      forward6m: null,
      forward12m: null,
      documentId: doc.id,
      documentName: doc.name,
      format: doc.format,
      institution: doc.institution,
      analyst: pairContext?.analyst ?? "Ekip",
      thesis: doc.thesis,
      reference: pairContext?.reference ?? `Forecast: ${pair} ${match.slice(2).join(" ")}`,
      sourcePath: doc.sourcePath,
    };
    baseRecord.thesis = buildPdfPairThesis(baseRecord, pairContext, doc.thesis);
    records.set(pair, baseRecord);
  }

  return [...records.values()].sort((left, right) => left.pair.localeCompare(right.pair));
}

function buildPdfDocument(filePath: string, text: string): DocumentAnalysis {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\u00a0/g, ""));
  const cleanLines = lines.map(normalizeLine).filter(Boolean);
  const relativePath = path.relative(ROOT, filePath);
  const id = `pdf:${relativePath}`;
  const date = path.basename(filePath).slice(0, 10);
  const titleIndex = cleanLines.findIndex((line) => line === "FX Forecast Update");
  const subtitle = titleIndex >= 0 && cleanLines[titleIndex + 1] ? cleanLines[titleIndex + 1] : path.basename(filePath, ".pdf").replace(/^\d{4}-\d{2}-\d{2}_fx-forecast-update-/, "").replace(/-/g, " ");
  const coverLines = cleanLines.slice(0, 80);
  const analysts = extractNamesFromLines(coverLines);
  const pages = text.split(/\n-- \d+ of \d+ --\n/).map((page) => page.replace(/\r/g, "")).filter((page) => normalizeParagraph(page));
  const overviewPage = pages.find((page) => page.includes("FX market overview")) ?? text;
  const overview = normalizeParagraph(overviewPage);
  const recent = between(overview, "Recent developments:", ["FX implications:", "Outlook:", "Key risk to our forecasts:"]);
  const implications = between(overview, "FX implications:", ["Outlook:", "Key risk to our forecasts:"]);
  const outlook = between(overview, "Outlook:", ["Key risk to our forecasts:"]);
  const keyRisk = between(overview, "Key risk to our forecasts:", []);
  const pairContexts = parsePdfPairContexts(pages);
  const placeholderDoc: DocumentAnalysis = {
    id,
    date,
    institution: "Danske Bank",
    analysts: analysts.join("; "),
    format: "PDF",
    name: `FX Forecast Update: ${subtitle}`,
    summary: "",
    thesis: "",
    assumptions: [],
    risks: [],
    forecasts: [],
    sourcePath: relativePath,
    sortKey: `${date}|PDF|${relativePath}`,
    primaryRef: quoteRef(outlook || recent || subtitle),
  };

  const forecastMap = new Map<string, ForecastRecord>();
  const temporaryForecasts = parsePdfForecasts(cleanLines, {
    id,
    date,
    name: placeholderDoc.name,
    institution: placeholderDoc.institution,
    sourcePath: relativePath,
    format: "PDF",
    thesis: "",
  }, pairContexts);
  for (const record of temporaryForecasts) {
    forecastMap.set(record.pair, record);
  }

  const focusPair = pickFocusPair(subtitle, forecastMap);
  const focusRecord = focusPair ? forecastMap.get(focusPair) ?? null : null;
  const eurUsd = forecastMap.get("EUR/USD") ?? null;
  const eurSek = forecastMap.get("EUR/SEK") ?? null;
  const eurNok = forecastMap.get("EUR/NOK") ?? null;
  const summaryBits = [
    eurUsd ? `EUR/USD için 12 ay ufkunda ${formatNumber(eurUsd.forecast12m)} hedefi korunuyor` : null,
    eurSek ? `EUR/SEK patikası ${formatNumber(eurSek.forecast12m)} seviyesine doğru eğimli` : null,
    eurNok ? `EUR/NOK tarafında ${formatNumber(eurNok.forecast12m)} hedefi korunuyor` : null,
  ].filter(Boolean);
  const summary = `Rapor, ${subtitleToTurkish(subtitle)} bir FX görünümü çiziyor. ${summaryBits.slice(0, 2).join("; ") || "Kurum çoklu döviz çiftlerinde yönlü tahminlerini koruyor"}. Makro arka planda risk iştahı, büyüme ve jeopolitik gelişmelerin fiyatlamayı belirlediği vurgulanıyor (Ref: "${quoteRef(recent || outlook || subtitle)}"; Ref: "${quoteRef(outlook || implications || subtitle)}").`;
  const thesis = focusRecord
    ? `Ana tez, ${subtitleToTurkish(subtitle)} ve ${pairLabel(focusRecord.pair)} için ${directionText(inferDirection(focusRecord, outlook))} patikanın korunması. (Ref: "${quoteRef(pairContexts.get(focusRecord.pair)?.reference || outlook || subtitle)}")`
    : `Ana tez, ${subtitleToTurkish(subtitle)} ve kurumun yönlü FX görünümünü koruması. (Ref: "${quoteRef(outlook || subtitle)}")`;

  const assumptions: AssumptionItem[] = [];
  const addPdfAssumption = (pair: string, reference: string) => {
    const record = forecastMap.get(pair);
    if (!record) return;
    assumptions.push({
      text: `${pairLabel(pair)} için ${directionText(inferDirection(record, reference))} senaryonun korunacağı varsayılıyor`,
      ref: reference,
      pair,
    });
  };
  if (focusPair) addPdfAssumption(focusPair, pairContexts.get(focusPair)?.reference || outlook || subtitle);
  addPdfAssumption("EUR/USD", pairContexts.get("EUR/USD")?.reference || outlook || subtitle);
  if (focusPair !== "EUR/NOK") addPdfAssumption("EUR/NOK", pairContexts.get("EUR/NOK")?.reference || outlook || subtitle);
  if (focusPair !== "EUR/SEK") addPdfAssumption("EUR/SEK", pairContexts.get("EUR/SEK")?.reference || implications || subtitle);
  const risks = unique([
    keyRisk ? `Ana risk, ABD görünümü ile jeopolitik başlıkların tahmin patikasını bozabilmesi olarak anlatılıyor (Ref: "${quoteRef(keyRisk)}")` : "",
    focusPair && pairContexts.get(focusPair)?.riskReference ? `${pairLabel(focusPair)} tarafında pariteye özgü riskler ayrıca vurgulanıyor (Ref: "${pairContexts.get(focusPair)!.riskReference}")` : "",
  ].filter(Boolean));

  const finalized = parsePdfForecasts(cleanLines, {
    id,
    date,
    name: placeholderDoc.name,
    institution: placeholderDoc.institution,
    sourcePath: relativePath,
    format: "PDF",
    thesis,
  }, pairContexts);

  return {
    ...placeholderDoc,
    summary,
    thesis,
    assumptions: assumptions.slice(0, 3),
    risks: risks.length ? risks : [`Belgede açık bir risk başlığı bulunamadı; genel makro oynaklık öne çıkıyor (Ref: "${quoteRef(outlook || subtitle)}")`],
    forecasts: finalized,
  };
}

function detectTranscriptFocus(sentences: string[]): string[] {
  const counts = new Map<string, number>();
  for (const sentence of sentences) {
    const key = normalizeKey(sentence);
    for (const asset of TRANSCRIPT_ASSETS) {
      if (asset.regex.test(key)) {
        counts.set(asset.pair, (counts.get(asset.pair) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([pair]) => pair);
}

function normalizeNumberToken(token: string): number {
  let value = token.replace(/\s/g, "").replace(/,/g, ".");
  const parts = value.split(".");
  if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 2) {
    value = parts.join("");
  }
  return Number(value);
}

function extractCandidateNumbers(text: string, pair: string): number[] {
  const tokens = [...text.matchAll(/\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?/g)].map((match) => normalizeNumberToken(match[0]));
  return unique(tokens).filter((value) => {
    if (value >= 1900 && value <= 2100) return false;
    if (pair === "USD/TRY") return value >= 5 && value <= 500;
    if (pair === "USD/JPY") return value >= 50 && value <= 300;
    if (pair === "BIST100") return value >= 500 && value <= 200000;
    if (pair === "GRAM-ALTIN") return value >= 500 && value <= 100000;
    if (pair === "GRAM-GUMUS") return value >= 10 && value <= 10000;
    if (pair === "XAU/USD") return value >= 500 && value <= 50000;
    if (pair === "XAG/USD") return value >= 5 && value <= 1000;
    return value >= 0.1 && value <= 100000;
  });
}

function inferHorizon(text: string): HorizonKey {
  const key = normalizeKey(text);
  if (/(bu hafta|onumuzdeki hafta|yakın vad|kisa vade)/.test(key)) return "1m";
  if (/(birkac ay|2 3 ay|2-3 ay|onumuzdeki aylar)/.test(key)) return "3m";
  if (/(orta vade|6 ay|yaz sonuna kadar)/.test(key)) return "6m";
  if (/(yil sonu|bu yil|uzun vade|seneye|2027|2028|2029)/.test(key)) return "12m";
  return "3m";
}

function scoreForecastWindow(text: string): number {
  const key = normalizeKey(text);
  let score = 0;
  if (key.includes("hedef")) score += 3;
  if (key.includes("potansiyel")) score += 2;
  if (/(bekliyorum|dusunuyorum|degerlendiriyoruz|vurulabilecegini)/.test(key)) score += 2;
  if (/(yukari|asagi|devam|cikma ihtimali|atak)/.test(key)) score += 1;
  return score;
}

function mergeForecastValues(target: ForecastRecord, candidate: Partial<Record<HorizonKey, number | null>>, replaceExisting: boolean): void {
  const mapping: Record<HorizonKey, keyof ForecastRecord> = {
    "1m": "forecast1m",
    "3m": "forecast3m",
    "6m": "forecast6m",
    "12m": "forecast12m",
  };
  for (const horizon of HORIZONS) {
    const field = mapping[horizon];
    const value = candidate[horizon];
    if (value === null || value === undefined) continue;
    if (replaceExisting || target[field] === null) {
      target[field] = value;
    }
  }
}

function extractTranscriptForecasts(doc: { id: string; date: string; name: string; institution: string; analysts: string; sourcePath: string }, sentences: string[], fallbackThesis: string): ForecastRecord[] {
  const candidates = new Map<string, { score: number; record: ForecastRecord }>();

  for (let index = 0; index < sentences.length; index++) {
    const window = [sentences[index], sentences[index + 1]].filter(Boolean).join(" ");
    const windowKey = normalizeKey(window);
    if (!/(hedef|potansiyel|bekliyorum|dusunuyorum|vurul|atak|cikma ihtimali|yukari|asagi)/.test(windowKey)) {
      continue;
    }

    for (const asset of TRANSCRIPT_ASSETS) {
      if (!asset.regex.test(windowKey)) continue;

      const keywordIndex = windowKey.search(/hedef|potansiyel|bekliyorum|dusunuyorum|vurul|atak|cikma ihtimali|yukari|asagi/);
      const scopedText = keywordIndex >= 0 ? window.slice(Math.max(0, keywordIndex)) : window;
      const values = extractCandidateNumbers(scopedText, asset.pair);
      if (!values.length) continue;

      const inferred = inferHorizon(window);
      const horizonValues: Partial<Record<HorizonKey, number | null>> = { "1m": null, "3m": null, "6m": null, "12m": null };
      if (values.length === 1) {
        horizonValues[inferred] = values[0];
      } else {
        const slots: HorizonKey[] = ["1m", "3m", "6m", "12m"];
        values.slice(0, 4).forEach((value, valueIndex) => {
          horizonValues[slots[valueIndex]] = value;
        });
      }

      const baseRecord: ForecastRecord = {
        date: doc.date,
        pair: asset.pair,
        spot: null,
        forecast1m: null,
        forecast3m: null,
        forecast6m: null,
        forecast12m: null,
        consensus1m: null,
        consensus3m: null,
        consensus6m: null,
        consensus12m: null,
        forward1m: null,
        forward3m: null,
        forward6m: null,
        forward12m: null,
        documentId: doc.id,
        documentName: doc.name,
        format: "Video",
        institution: doc.institution,
        analyst: doc.analysts,
        thesis: `${pairLabel(asset.pair)} için videoda sayısal hedef veriliyor (Ref: "${quoteRef(window)}")`,
        reference: quoteRef(window),
        sourcePath: doc.sourcePath,
      };
      mergeForecastValues(baseRecord, horizonValues, true);

      const score = scoreForecastWindow(window);
      const existing = candidates.get(asset.pair);
      if (!existing) {
        candidates.set(asset.pair, { score, record: baseRecord });
        continue;
      }
      const replaceExisting = score >= existing.score;
      mergeForecastValues(existing.record, horizonValues, replaceExisting);
      if (replaceExisting) {
        existing.score = score;
        existing.record.reference = quoteRef(window);
        existing.record.thesis = `${pairLabel(asset.pair)} için videoda ${directionText(inferDirection(existing.record, window))} hedefler korunuyor (Ref: "${quoteRef(window)}")`;
      }
    }
  }

  for (const candidate of candidates.values()) {
    if (!candidate.record.thesis) {
      candidate.record.thesis = fallbackThesis;
    }
  }

  return [...candidates.values()].map((candidate) => candidate.record).sort((left, right) => left.pair.localeCompare(right.pair));
}

function buildTranscriptDocument(filePath: string, content: string): DocumentAnalysis {
  const relativePath = path.relative(ROOT, filePath);
  const id = `video:${relativePath}`;
  const lines = content.split(/\r?\n/);
  const title = normalizeLine(lines[0].replace(/^#\s*/, ""));
  const source = normalizeLine((lines.find((line) => line.startsWith("# Kaynak:")) ?? "").replace(/^# Kaynak:\s*/, ""));
  const date = normalizeLine((lines.find((line) => line.startsWith("# Tarih:")) ?? "").replace(/^# Tarih:\s*/, ""));
  const channel = normalizeLine((lines.find((line) => line.startsWith("# Kanal:")) ?? "").replace(/^# Kanal:\s*/, "")) || "Bilinmeyen Kanal";
  const body = lines.filter((line) => !line.startsWith("# ")).join(" ");
  const sentences = splitSentences(body);
  const focusPairs = detectTranscriptFocus(sentences);
  const firstRef = sentences[0] ?? title;
  const thesisSentence = sentences.find((sentence) => /(hedef|bekliyorum|düşünüyorum|dusunuyorum|yön yukarı|yon yukari|yukarı|asagi|aşağı)/i.test(normalizeKey(sentence))) ?? firstRef;
  const focusLabel = focusPairs.length ? focusPairs.map(pairLabel).join(", ") : "makro-finansal temalar";
  const summary = `Video, ${focusLabel} ekseninde ana senaryoyu tartışıyor. Anlatıcı başlıkta işlenen temayı makro kırılganlıklar, portföy tercihi ve kademeli hedeflerle ilişkilendiriyor (Ref: "${quoteRef(firstRef)}"). Ayrıca öne çıkan yönlü beklentiler tekrar ediliyor (Ref: "${quoteRef(thesisSentence)}").`;
  const thesis = `Ana tez, ${focusLabel} tarafında ${directionText(inferDirection({ spot: null, forecast1m: null, forecast3m: null, forecast6m: null, forecast12m: null }, thesisSentence))} senaryonun korunduğu ve hedeflerin kademeli düşünüldüğü yönünde (Ref: "${quoteRef(thesisSentence)}").`;
  const forecasts = extractTranscriptForecasts({
    id,
    date,
    name: title,
    institution: channel,
    analysts: channel,
    sourcePath: relativePath,
  }, sentences, thesis);
  const assumptions = forecasts.length
    ? forecasts.slice(0, 3).map((forecast) => ({
        text: `${pairLabel(forecast.pair)} için verilen sayısal hedeflerin çalışacağı varsayılıyor`,
        ref: forecast.reference,
        pair: forecast.pair,
      }))
    : unique(sentences.filter((sentence) => /(eğer|olursa|üzerinde kaldığı sürece|cünkü|çünkü|nedeniyle)/i.test(normalizeKey(sentence)))).slice(0, 2).map((sentence) => ({
        text: quoteRef(sentence),
        ref: sentence,
      }));
  const risks = pickRiskLines(sentences, 2).map((sentence) => `Videoda aşağı yönlü oynaklık ve geri çekilme riskleri ayrıca hatırlatılıyor (Ref: "${quoteRef(sentence)}")`);

  return {
    id,
    date,
    institution: channel,
    analysts: channel,
    format: "Video",
    name: title,
    summary,
    thesis,
    assumptions,
    risks: risks.length ? risks : [`Videoda belirgin bir risk başlığı açıkça ayrışmıyor; anlatı daha çok ana senaryoya odaklanıyor (Ref: "${quoteRef(thesisSentence)}")`],
    forecasts,
    sourcePath: relativePath,
    sortKey: `${date}|Video|${relativePath}`,
    primaryRef: source ? `${quoteRef(source)}` : quoteRef(thesisSentence),
  };
}

function buildAssumptionStatus(doc: DocumentAnalysis, nextDoc: DocumentAnalysis | undefined, resultsByDoc: Map<string, DeviationResult[]>): string {
  if (!doc.assumptions.length) {
    return "Raporda belirtilmemiştir";
  }

  return doc.assumptions.slice(0, 3).map((assumption, index) => {
    if (!nextDoc) {
      return `${index + 1}. "${assumption.text}" → ⏳ Değerlendirilemez (Ref: "Sonraki belge yok")`;
    }

    const docResults = resultsByDoc.get(doc.id) ?? [];
    const result = assumption.pair ? docResults.find((item) => item.pair === assumption.pair) : undefined;
    let status = "⚠️ Kısmen";
    if (result && result.spot !== null) {
      const earliest = HORIZONS.find((horizon) => {
        const forecastValue = result[`forecast${horizon}` as keyof DeviationResult];
        const actualValue = result[`actual${horizon}` as keyof DeviationResult];
        return typeof forecastValue === "number" && typeof actualValue === "number";
      });
      if (earliest) {
        const forecastValue = result[`forecast${earliest}` as keyof DeviationResult] as number;
        const actualValue = result[`actual${earliest}` as keyof DeviationResult] as number;
        const expectedUp = forecastValue > result.spot;
        const actualUp = actualValue > result.spot;
        status = expectedUp === actualUp ? "✅ Gerçekleşti" : "❌ Gerçekleşmedi";
      }
    }
    return `${index + 1}. "${assumption.text}" → ${status} (Ref: "${quoteRef(nextDoc.primaryRef || nextDoc.name)}")`;
  }).join("\n");
}

function buildTahminSapmasi(results: DeviationResult[]): string {
  const fragments = results
    .filter((result) => result.forecast1m !== null)
    .sort((left, right) => left.pair.localeCompare(right.pair))
    .map((result) => {
      if (result.deviation1m_pips === null) {
        return `${result.pair} +1M: — (kaynak: ${result.source ?? "—"})`;
      }
      return `${result.pair} +1M: ${formatSignedPips(result.deviation1m_pips)} pip (${result.deviation1m_pct ?? "—"}), kaynak: ${result.source ?? "—"}`;
    });
  return fragments.length ? fragments.join("; ") : "Raporda belirtilmemiştir";
}

function buildBelgelerRows(documents: DocumentAnalysis[]): { headers: string[]; rows: string[][] } {
  const headers = [
    "Belge Tarihi",
    "Kurum",
    "Analistler",
    "Format",
    "Belge Adı",
    "Özet Metin",
    "Yatırım Tezi",
    "Varsayımlar",
    "Risk Analizi",
    "Varsayım Gerçekleşme",
    "Tahmin Sapması",
  ];
  const rows = documents.map((doc) => [
    doc.date,
    doc.institution,
    doc.analysts || "Ekip",
    doc.format,
    doc.name,
    doc.summary,
    doc.thesis,
    doc.assumptions.length ? doc.assumptions.map((item, index) => `${index + 1}. ${item.text} (Ref: "${quoteRef(item.ref)}")`).join("\n") : "Raporda belirtilmemiştir",
    doc.risks.length ? doc.risks.join("\n") : "Raporda belirtilmemiştir",
    doc.varsayimGerceklesme ?? "Raporda belirtilmemiştir",
    doc.tahminSapmasi ?? "Raporda belirtilmemiştir",
  ]);
  return { headers, rows };
}

function calcDirectionAccuracy(result: DeviationResult, horizon: HorizonKey): string {
  const forecast = result[`forecast${horizon}` as keyof DeviationResult] as number | null;
  const actual = result[`actual${horizon}` as keyof DeviationResult] as number | null;
  if (forecast === null || actual === null || result.spot === null) return "⏳";
  const expectedUp = forecast > result.spot;
  const actualUp = actual > result.spot;
  return expectedUp === actualUp ? "✅" : "❌";
}

function buildTahminlerRows(results: DeviationResult[]): { headers: string[]; rows: string[][] } {
  const headers = [
    "Tahmin Tarihi",
    "Kurum",
    "Analist",
    "Format",
    "Varlık",
    "Vade",
    "Hedef Tarihi",
    "Spot Fiyat",
    "Hedef Fiyat",
    "Analiz Tezi",
    "Gerçekleşen Fiyat",
    "Sapma (pip)",
    "Yön İsabeti",
  ];

  const rows: string[][] = [];
  const horizonToMonths: Record<HorizonKey, number> = { "1m": 1, "3m": 3, "6m": 6, "12m": 12 };
  const horizonLabel: Record<HorizonKey, string> = { "1m": "+1M", "3m": "+3M", "6m": "+6M", "12m": "+12M" };

  const sorted = [...results].sort((left, right) => {
    const byDate = left.date.localeCompare(right.date);
    if (byDate !== 0) return byDate;
    const byFormat = left.format.localeCompare(right.format);
    if (byFormat !== 0) return byFormat;
    return left.pair.localeCompare(right.pair);
  });

  for (const result of sorted) {
    for (const horizon of HORIZONS) {
      const forecast = result[`forecast${horizon}` as keyof DeviationResult] as number | null;
      if (forecast === null) continue;
      const actual = result[`actual${horizon}` as keyof DeviationResult] as number | null;
      const deviation = result[`deviation${horizon}_pips` as keyof DeviationResult] as number | null;
      rows.push([
        result.date,
        result.institution,
        result.analyst || "Ekip",
        result.format,
        result.pair,
        horizonLabel[horizon],
        addMonths(result.date, horizonToMonths[horizon]),
        formatNumber(result.spot),
        formatNumber(forecast),
        result.thesis,
        formatNumber(actual),
        deviation === null ? "—" : `${deviation}`,
        calcDirectionAccuracy(result, horizon),
      ]);
    }
  }

  return { headers, rows };
}

function writeCsv(filePath: string, headers: string[], rows: string[][]): void {
  const lines = [headers.map(csvEscape).join(","), ...rows.map((row) => row.map((value) => csvEscape(value)).join(","))];
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

async function main(): Promise<void> {
  fs.mkdirSync(ANALIZLER_DIR, { recursive: true });

  const pdfFiles = listFiles(RAPORLAR_DIR, ".pdf");
  const transcriptFiles = listFiles(RAPORLAR_DIR, ".txt");

  const documents: DocumentAnalysis[] = [];
  for (const pdfFile of pdfFiles) {
    const extracted = await extractTextFromPdf(pdfFile);
    documents.push(buildPdfDocument(pdfFile, extracted.text));
  }
  for (const transcriptFile of transcriptFiles) {
    const content = fs.readFileSync(transcriptFile, "utf8");
    documents.push(buildTranscriptDocument(transcriptFile, content));
  }

  documents.sort((left, right) => left.sortKey.localeCompare(right.sortKey));

  const forecastInputs = documents.flatMap((doc) => doc.forecasts);
  const forecastsPath = path.join(ANALIZLER_DIR, "forecasts.json");
  fs.writeFileSync(forecastsPath, JSON.stringify(forecastInputs, null, 2), "utf8");

  execFileSync("npx", ["tsx", "src/analyzer/forecast-check.ts", forecastsPath], {
    cwd: ROOT,
    stdio: "inherit",
  });

  const forecastResultsPath = path.join(ANALIZLER_DIR, "forecasts-results.json");
  const results = JSON.parse(fs.readFileSync(forecastResultsPath, "utf8")) as DeviationResult[];
  const resultsByDoc = new Map<string, DeviationResult[]>();
  for (const result of results) {
    const bucket = resultsByDoc.get(result.documentId) ?? [];
    bucket.push(result);
    resultsByDoc.set(result.documentId, bucket);
  }

  const docsByGroup = new Map<string, DocumentAnalysis[]>();
  for (const document of documents) {
    const key = `${document.institution}|${document.format}`;
    const bucket = docsByGroup.get(key) ?? [];
    bucket.push(document);
    docsByGroup.set(key, bucket);
  }

  for (const group of docsByGroup.values()) {
    group.sort((left, right) => left.sortKey.localeCompare(right.sortKey));
    for (let index = 0; index < group.length; index++) {
      const document = group[index];
      const nextDocument = group[index + 1];
      document.varsayimGerceklesme = buildAssumptionStatus(document, nextDocument, resultsByDoc);
      document.tahminSapmasi = buildTahminSapmasi(resultsByDoc.get(document.id) ?? []);
    }
  }

  const belgeler = buildBelgelerRows(documents);
  const tahminler = buildTahminlerRows(results);

  fs.writeFileSync(path.join(ANALIZLER_DIR, "belgeler.md"), `# Belgeler\n\n${toMarkdownTable(belgeler.headers, belgeler.rows)}\n`, "utf8");
  fs.writeFileSync(path.join(ANALIZLER_DIR, "tahminler.md"), `# Tahminler\n\n${toMarkdownTable(tahminler.headers, tahminler.rows)}\n`, "utf8");
  writeCsv(path.join(ANALIZLER_DIR, "belgeler.csv"), belgeler.headers, belgeler.rows);
  writeCsv(path.join(ANALIZLER_DIR, "tahminler.csv"), tahminler.headers, tahminler.rows);

  console.log(`BELGELER_ROWS=${belgeler.rows.length}`);
  console.log(`TAHMINLER_ROWS=${tahminler.rows.length}`);
  console.log(`FORECASTS_ROWS=${forecastInputs.length}`);
  console.log(`RESULTS_ROWS=${results.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});