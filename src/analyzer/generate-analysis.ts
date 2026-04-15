import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type SourceFormat = "PDF" | "Video";

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
  institution: string;
  documentName: string;
  format: SourceFormat;
  analyst?: string;
  thesis?: string;
  reference?: string;
  sourcePath?: string;
}

interface ForecastResult {
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
  source: "cross-report" | "api" | null;
  documentName?: string;
  institution?: string;
  analyst?: string;
  thesis?: string;
  reference?: string;
}

type CsvRow = Record<string, string>;

const BELGELER_HEADERS = [
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
  "Kaynak",
];

const TAHMINLER_HEADERS = [
  "Tahmin Tarihi",
  "Kurum",
  "Analist",
  "Format",
  "Belge Adı",
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

const HORIZONS = ["1m", "3m", "6m", "12m"] as const;
type Horizon = (typeof HORIZONS)[number];

const HORIZON_LABEL: Record<Horizon, string> = {
  "1m": "+1M",
  "3m": "+3M",
  "6m": "+6M",
  "12m": "+12M",
};

const HORIZON_MONTHS: Record<Horizon, number> = {
  "1m": 1,
  "3m": 3,
  "6m": 6,
  "12m": 12,
};

const LATEST_DENIZ_DOCUMENT = {
  date: "2026-04-15",
  institution: "Deniz Yatırım",
  analysts: "Deniz Yatırım Strateji & Araştırma",
  format: "PDF",
  documentName: "Günlük Bülten 15.04.2026",
  summary:
    "15 Nisan 2026 bülteni, ABD-İran müzakere sürecinin anlaşmaya dönüşebileceği beklentisi ve beklenti altı kalan ABD ÜFE verisiyle küresel risk iştahının güçlendiğini vurguluyor. BIST100'ün %1,02 artışla 14.202 puana yükseldiği, 14.000 üzerinde kalıcılığın teknik açıdan olumlu olduğu belirtiliyor. Sabah açılışında 14.000-14.450 bandında işlem beklenirken seçilmiş indikatörlerde AGHOL, AKSA, AKSEN, ARCLK ve BALSU öne çıkarılıyor. (Ref: 'müzakere sürecinin bir anlaşmayla sonuçlanabileceğine yönelik artan beklentiler', 'BIST 100 endeksinin 14.000 puan üzerinde kalıcılık sağlaması teknik açıdan olumlu değerlendirilebilir', '14000 – 14450 arasında işlem aktivitesi bekliyoruz')",
  thesis:
    "ABD-İran hattında anlaşma ihtimalinin artması ve zayıf ABD ÜFE verisiyle risk iştahı desteklenirken, BIST100'de 14.000 üzeri kalıcılık korunursa 14.450 üst bandı test edilebilir. (Ref: 'müzakere sürecinin bir anlaşmayla sonuçlanabileceğine yönelik artan beklentiler', '14000 – 14450 arasında işlem aktivitesi bekliyoruz')",
  assumptions:
    "1. ABD-İran müzakere süreci anlaşmaya yaklaşacak 2. Zayıf ABD ÜFE verisi risk iştahını desteklemeyi sürdürecek 3. BIST100 14.000 üzerinde kalıcılık sağlayacak",
  risks:
    "1. Müzakerelerin bozulması risk iştahını tersine çevirebilir 2. ABD enflasyonunda yeniden hızlanma dolar talebini artırabilir 3. BIST100'ün 14.000 altına sarkması teknik görünümü bozabilir",
  assumptionsCheck: "⏳ Son rapor — henüz karşılaştırma verisi yok",
  source: "",
} as const;

const LATEST_DENIZ_FORECAST: ForecastRecord = {
  date: "2026-04-15",
  pair: "BIST100",
  spot: 14202,
  forecast1m: 14450,
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
  institution: "Deniz Yatırım",
  documentName: "Günlük Bülten 15.04.2026",
  format: "PDF",
  analyst: "Ekip",
  thesis:
    "14.000-14.450 teknik bandı içinde yukarı eğilim korunuyor; 14.000 üzerindeki kalıcılık sürerse üst bant 14.450 test edilebilir.",
  reference:
    "Ref: '14000 – 14450 arasında işlem aktivitesi bekliyoruz', 'BIST 100 endeksinin 14.000 puan üzerinde kalıcılık sağlaması teknik açıdan olumlu değerlendirilebilir'",
  sourcePath: "raporlar/deniz-yatirim/gunluk-bulten/2026-04-15_gunluk-bulten-15-04-2026.pdf",
};

function walkFiles(dirPath: string, predicate: (filePath: string) => boolean): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, predicate));
      continue;
    }

    if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readArtifact(rootDir: string, relativePath: string): string {
  const absolutePath = path.join(rootDir, relativePath);
  if (fs.existsSync(absolutePath)) {
    return fs.readFileSync(absolutePath, "utf8");
  }

  return execFileSync("git", ["show", `HEAD:${relativePath}`], {
    cwd: rootDir,
    encoding: "utf8",
  });
}

function parseCsv(content: string): { headers: string[]; rows: CsvRow[] } {
  const lines = content.trim().split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function toCsv(headers: string[], rows: CsvRow[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function formatMarkdownTable(headers: string[], rows: CsvRow[]): string {
  const safeHeaders = headers.map(escapeMarkdownCell);
  const lines = [
    `| ${safeHeaders.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
  ];

  for (const row of rows) {
    lines.push(`| ${headers.map((header) => escapeMarkdownCell(row[header] ?? "")).join(" | ")} |`);
  }

  return lines.join("\n");
}

function escapeMarkdownCell(value: string): string {
  return value
    .replaceAll("|", "\\|")
    .replaceAll("\n", "<br>")
    .replaceAll("\r", "");
}

function addMonths(dateValue: string, months: number): string {
  const date = new Date(`${dateValue}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function compareByDateThenName(left: CsvRow, right: CsvRow, dateKey: string, nameKey: string): number {
  if (left[dateKey] !== right[dateKey]) {
    return left[dateKey].localeCompare(right[dateKey]);
  }
  if ((left.Kurum ?? left["Kurum"]) !== (right.Kurum ?? right["Kurum"])) {
    return (left.Kurum ?? left["Kurum"] ?? "").localeCompare(right.Kurum ?? right["Kurum"] ?? "");
  }
  return (left[nameKey] ?? "").localeCompare(right[nameKey] ?? "");
}

function documentKey(date: string, institution: string, documentName: string): string {
  return `${date}__${institution}__${documentName}`;
}

function predictionKey(date: string, institution: string, documentName: string, pair: string, horizonLabel: string): string {
  return `${documentKey(date, institution, documentName)}__${pair}__${horizonLabel}`;
}

function getForecastValue(record: ForecastRecord | ForecastResult, horizon: Horizon): number | null {
  if (horizon === "1m") return record.forecast1m;
  if (horizon === "3m") return record.forecast3m;
  if (horizon === "6m") return record.forecast6m;
  return record.forecast12m;
}

function getActualValue(record: ForecastResult, horizon: Horizon): number | null {
  if (horizon === "1m") return record.actual1m;
  if (horizon === "3m") return record.actual3m;
  if (horizon === "6m") return record.actual6m;
  return record.actual12m;
}

function getDeviationValue(record: ForecastResult, horizon: Horizon): number | null {
  if (horizon === "1m") return record.deviation1m_pips;
  if (horizon === "3m") return record.deviation3m_pips;
  if (horizon === "6m") return record.deviation6m_pips;
  return record.deviation12m_pips;
}

function getDeviationPctValue(record: ForecastResult, horizon: Horizon): string | null {
  if (horizon === "1m") return record.deviation1m_pct;
  if (horizon === "3m") return record.deviation3m_pct;
  if (horizon === "6m") return record.deviation6m_pct;
  return record.deviation12m_pct;
}

function formatNumber(value: number | null): string {
  return value === null ? "—" : value.toFixed(4);
}

function formatPipValue(value: number | null): string {
  return value === null ? "—" : value.toString();
}

function formatSignedPip(value: number): string {
  return value > 0 ? `+${value}` : value.toString();
}

function formatPctSummary(value: string | null): string {
  if (value === null || value === "") {
    return "";
  }
  return value.startsWith("-") || value.startsWith("+") ? value : `+${value}`;
}

function computeDirectionAccuracy(spot: number | null, target: number | null, actual: number | null): string {
  if (spot === null || target === null || actual === null) {
    return "⏳";
  }

  const epsilon = 1e-9;
  const targetDelta = target - spot;
  const actualDelta = actual - spot;

  if (Math.abs(targetDelta) <= epsilon) {
    return Math.abs(actualDelta) <= epsilon ? "✅" : "❌";
  }

  if (targetDelta > 0) {
    return actualDelta > 0 ? "✅" : "❌";
  }

  return actualDelta < 0 ? "✅" : "❌";
}

function summarizeByDocument(results: ForecastResult[]): Map<string, string> {
  const summaries = new Map<string, string>();
  const grouped = new Map<string, ForecastResult[]>();

  for (const result of results) {
    const key = documentKey(result.date, result.institution ?? "", result.documentName ?? "");
    const list = grouped.get(key) ?? [];
    list.push(result);
    grouped.set(key, list);
  }

  for (const [key, records] of grouped) {
    const parts: string[] = [];
    const sources = new Set<string>();

    for (const record of records) {
      for (const horizon of HORIZONS) {
        const deviation = getDeviationValue(record, horizon);
        if (deviation === null) {
          continue;
        }

        const pct = formatPctSummary(getDeviationPctValue(record, horizon));
        parts.push(`${record.pair} ${HORIZON_LABEL[horizon]}: ${formatSignedPip(deviation)} pip${pct ? ` (${pct}%)` : ""}`);
        if (record.source) {
          sources.add(record.source);
        }
      }
    }

    if (parts.length === 0) {
      summaries.set(key, "—");
      continue;
    }

    const sourceSuffix = sources.size > 0 ? `, kaynak: ${Array.from(sources).join("/")}` : "";
    summaries.set(key, `${parts.join("; ")}${sourceSuffix}`);
  }

  return summaries;
}

function sortForecasts(records: ForecastRecord[]): ForecastRecord[] {
  return [...records].sort((left, right) => {
    if (left.date !== right.date) {
      return left.date.localeCompare(right.date);
    }
    if (left.institution !== right.institution) {
      return left.institution.localeCompare(right.institution);
    }
    if (left.documentName !== right.documentName) {
      return left.documentName.localeCompare(right.documentName);
    }
    return left.pair.localeCompare(right.pair);
  });
}

function renderGroupedMarkdown(title: string, rows: CsvRow[], headers: string[], key: string, label: string): string {
  const groups = new Map<string, CsvRow[]>();

  for (const row of rows) {
    const groupKey = row[key] ?? "Bilinmeyen";
    const list = groups.get(groupKey) ?? [];
    list.push(row);
    groups.set(groupKey, list);
  }

  const startDate = rows[0]?.[headers[0]] ?? "";
  const endDate = rows.at(-1)?.[headers[0]] ?? "";
  const sections = [`# ${title} (${startDate} / ${endDate})`, "", `Toplam **${rows.length}** ${label}.`, ""];

  for (const [groupKey, groupRows] of groups) {
    sections.push(`## ${groupKey} (${groupRows.length})`);
    sections.push("");
    sections.push(formatMarkdownTable(headers, groupRows));
    sections.push("");
  }

  return `${sections.join("\n").trim()}\n`;
}

function main() {
  const rootDir = process.cwd();
  const reportsDir = path.join(rootDir, "raporlar");
  const analysisDir = path.join(rootDir, "analizler");

  ensureDir(analysisDir);

  const pdfFiles = walkFiles(reportsDir, (filePath) => filePath.toLowerCase().endsWith(".pdf"));
  const transcriptFiles = walkFiles(
    reportsDir,
    (filePath) => filePath.toLowerCase().endsWith(".txt") && filePath.includes(`${path.sep}youtube-transcripts${path.sep}`),
  );

  const expectedDocumentCount = pdfFiles.length + transcriptFiles.length;
  const belgelerBaseline = parseCsv(readArtifact(rootDir, path.join("analizler", "belgeler.csv")));
  const tahminlerBaseline = parseCsv(readArtifact(rootDir, path.join("analizler", "tahminler.csv")));
  const forecastsBaseline = JSON.parse(readArtifact(rootDir, path.join("analizler", "forecasts.json"))) as ForecastRecord[];

  const latestDenizKey = documentKey(
    LATEST_DENIZ_DOCUMENT.date,
    LATEST_DENIZ_DOCUMENT.institution,
    LATEST_DENIZ_DOCUMENT.documentName,
  );

  const belgeRows = belgelerBaseline.rows.map((row) => ({ ...row }));
  const latestDenizIndex = belgeRows.findIndex((row) =>
    documentKey(row["Belge Tarihi"], row.Kurum, row["Belge Adı"]) === latestDenizKey,
  );

  const latestDenizRow: CsvRow = {
    "Belge Tarihi": LATEST_DENIZ_DOCUMENT.date,
    "Kurum": LATEST_DENIZ_DOCUMENT.institution,
    "Analistler": LATEST_DENIZ_DOCUMENT.analysts,
    "Format": LATEST_DENIZ_DOCUMENT.format,
    "Belge Adı": LATEST_DENIZ_DOCUMENT.documentName,
    "Özet Metin": LATEST_DENIZ_DOCUMENT.summary,
    "Yatırım Tezi": LATEST_DENIZ_DOCUMENT.thesis,
    "Varsayımlar": LATEST_DENIZ_DOCUMENT.assumptions,
    "Risk Analizi": LATEST_DENIZ_DOCUMENT.risks,
    "Varsayım Gerçekleşme": LATEST_DENIZ_DOCUMENT.assumptionsCheck,
    "Tahmin Sapması": "—",
    "Kaynak": LATEST_DENIZ_DOCUMENT.source,
  };

  if (latestDenizIndex === -1) {
    belgeRows.push(latestDenizRow);
  } else {
    belgeRows[latestDenizIndex] = latestDenizRow;
  }

  const deniz1404Index = belgeRows.findIndex((row) =>
    documentKey(row["Belge Tarihi"], row.Kurum, row["Belge Adı"]) === documentKey("2026-04-14", "Deniz Yatırım", "Günlük Bülten 14.04.2026"),
  );

  if (deniz1404Index !== -1) {
    belgeRows[deniz1404Index]["Varsayım Gerçekleşme"] = "1. ⚠️ Ateşkes beklentisi arttı ancak anlaşma henüz sonuçlanmadı (Ref: 15.04 bülteni 'müzakere sürecinin bir anlaşmayla sonuçlanabileceğine yönelik artan beklentiler') 2. ⚠️ BIST100 14.202 ile güçlü kaldı, 15.000 hedefi henüz test edilmedi (Ref: 'BIST 100 endeksinin 14.000 puan üzerinde kalıcılık sağlaması teknik açıdan olumlu değerlendirilebilir') 3. ✅ USD/TL 44.73 ile yataya yakın seyretti (Ref: 'USDTRY 44.73 44.69 0.1%')";
  }

  belgeRows.sort((left, right) => compareByDateThenName(left, right, "Belge Tarihi", "Belge Adı"));

  if (belgeRows.length !== expectedDocumentCount) {
    throw new Error(`Belge sayısı uyuşmuyor. Beklenen ${expectedDocumentCount}, üretilen ${belgeRows.length}.`);
  }

  const forecasts = sortForecasts(
    forecastsBaseline.some((record) =>
      documentKey(record.date, record.institution, record.documentName) === latestDenizKey && record.pair === LATEST_DENIZ_FORECAST.pair,
    )
      ? forecastsBaseline.map((record) =>
          documentKey(record.date, record.institution, record.documentName) === latestDenizKey && record.pair === LATEST_DENIZ_FORECAST.pair
            ? LATEST_DENIZ_FORECAST
            : record,
        )
      : [...forecastsBaseline, LATEST_DENIZ_FORECAST],
  );

  fs.writeFileSync(path.join(analysisDir, "forecasts.json"), `${JSON.stringify(forecasts, null, 2)}\n`);

  execFileSync("npx", ["tsx", "src/analyzer/forecast-check.ts", path.join("analizler", "forecasts.json")], {
    cwd: rootDir,
    stdio: "inherit",
  });

  const resultsPath = path.join(analysisDir, "forecasts-results.json");
  if (!fs.existsSync(resultsPath)) {
    throw new Error("forecasts-results.json üretilemedi.");
  }

  const forecastResults = JSON.parse(fs.readFileSync(resultsPath, "utf8")) as ForecastResult[];
  const resultByBaseKey = new Map<string, ForecastResult>();
  for (const result of forecastResults) {
    const key = documentKey(result.date, result.institution ?? "", result.documentName ?? "") + `__${result.pair}`;
    resultByBaseKey.set(key, result);
  }

  const tahminMeta = new Map<string, CsvRow>();
  for (const row of tahminlerBaseline.rows) {
    tahminMeta.set(
      predictionKey(row["Tahmin Tarihi"], row.Kurum, row["Belge Adı"], row.Varlık, row.Vade),
      row,
    );
  }

  const latestTahminKey = predictionKey(
    LATEST_DENIZ_FORECAST.date,
    LATEST_DENIZ_FORECAST.institution,
    LATEST_DENIZ_FORECAST.documentName,
    LATEST_DENIZ_FORECAST.pair,
    "+1M",
  );
  tahminMeta.set(latestTahminKey, {
    "Tahmin Tarihi": LATEST_DENIZ_FORECAST.date,
    "Kurum": LATEST_DENIZ_FORECAST.institution,
    "Analist": LATEST_DENIZ_FORECAST.analyst ?? "Ekip",
    "Format": LATEST_DENIZ_FORECAST.format,
    "Belge Adı": LATEST_DENIZ_FORECAST.documentName,
    "Varlık": LATEST_DENIZ_FORECAST.pair,
    "Vade": "+1M",
    "Hedef Tarihi": addMonths(LATEST_DENIZ_FORECAST.date, 1),
    "Spot Fiyat": formatNumber(LATEST_DENIZ_FORECAST.spot),
    "Hedef Fiyat": formatNumber(LATEST_DENIZ_FORECAST.forecast1m),
    "Analiz Tezi": `${LATEST_DENIZ_FORECAST.thesis} (${LATEST_DENIZ_FORECAST.reference})`,
    "Gerçekleşen Fiyat": "—",
    "Sapma (pip)": "—",
    "Yön İsabeti": "⏳",
  });

  const tahminRows: CsvRow[] = [];
  for (const record of forecasts) {
    const result = resultByBaseKey.get(documentKey(record.date, record.institution, record.documentName) + `__${record.pair}`);
    for (const horizon of HORIZONS) {
      const forecastValue = getForecastValue(result ?? record, horizon);
      if (forecastValue === null) {
        continue;
      }

      const horizonLabel = HORIZON_LABEL[horizon];
      const meta = tahminMeta.get(predictionKey(record.date, record.institution, record.documentName, record.pair, horizonLabel));
      const spot = result?.spot ?? record.spot;
      const actual = result ? getActualValue(result, horizon) : null;
      const deviation = result ? getDeviationValue(result, horizon) : null;

      tahminRows.push({
        "Tahmin Tarihi": record.date,
        "Kurum": record.institution,
        "Analist": meta?.Analist ?? record.analyst ?? "Ekip",
        "Format": record.format,
        "Belge Adı": record.documentName,
        "Varlık": record.pair,
        "Vade": horizonLabel,
        "Hedef Tarihi": addMonths(record.date, HORIZON_MONTHS[horizon]),
        "Spot Fiyat": formatNumber(spot),
        "Hedef Fiyat": formatNumber(forecastValue),
        "Analiz Tezi": meta?.["Analiz Tezi"] ?? (record.reference ? `${record.thesis ?? "Raporda belirtilmemiştir"} (${record.reference})` : (record.thesis ?? "Raporda belirtilmemiştir")),
        "Gerçekleşen Fiyat": formatNumber(actual),
        "Sapma (pip)": formatPipValue(deviation),
        "Yön İsabeti": computeDirectionAccuracy(spot, forecastValue, actual),
      });
    }
  }

  tahminRows.sort((left, right) => {
    const base = compareByDateThenName(left, right, "Tahmin Tarihi", "Belge Adı");
    if (base !== 0) {
      return base;
    }
    if (left.Varlık !== right.Varlık) {
      return left.Varlık.localeCompare(right.Varlık);
    }
    return left.Vade.localeCompare(right.Vade);
  });

  const tahminSapmasi = summarizeByDocument(forecastResults);
  for (const row of belgeRows) {
    row["Tahmin Sapması"] = tahminSapmasi.get(documentKey(row["Belge Tarihi"], row.Kurum, row["Belge Adı"])) ?? row["Tahmin Sapması"] ?? "—";
  }

  fs.writeFileSync(path.join(analysisDir, "belgeler.csv"), toCsv(BELGELER_HEADERS, belgeRows));
  fs.writeFileSync(path.join(analysisDir, "tahminler.csv"), toCsv(TAHMINLER_HEADERS, tahminRows));
  fs.writeFileSync(
    path.join(analysisDir, "belgeler.md"),
    renderGroupedMarkdown("Belgeler — Tüm Kurumlar", belgeRows, BELGELER_HEADERS, "Kurum", "belge satırı"),
  );
  fs.writeFileSync(
    path.join(analysisDir, "tahminler.md"),
    renderGroupedMarkdown("Tahminler — Tüm Kurumlar", tahminRows, TAHMINLER_HEADERS, "Kurum", "tahmin satırı"),
  );

  fs.writeFileSync(
    path.join(analysisDir, "_analysis-bootstrap.json"),
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      pdfCount: pdfFiles.length,
      transcriptCount: transcriptFiles.length,
      belgeCount: belgeRows.length,
      tahminCount: tahminRows.length,
      forecastCount: forecasts.length,
      forecastResultCount: forecastResults.length,
    }, null, 2)}\n`,
  );

  console.log(`PDF: ${pdfFiles.length}`);
  console.log(`Transkript: ${transcriptFiles.length}`);
  console.log(`Belge satırı: ${belgeRows.length}`);
  console.log(`Tahmin satırı: ${tahminRows.length}`);
  console.log(`Forecast kaydı: ${forecasts.length}`);
  console.log(`Forecast sonuç kaydı: ${forecastResults.length}`);
}

main();