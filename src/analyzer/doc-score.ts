import fs from "node:fs";
import path from "node:path";

// ── Types ──

interface ScoreRow {
  belgeTarihi: string;
  kurum: string;
  analistler: string;
  format: string;
  ozetMetin: string;
  belgeAdi: string;
  yatirimTezi: string;
  varsayimlarGerceklesme: string;
  varsayimEtkisi: string;            // Yüksek / Orta / Düşük
  riskAnalizi: string;
  kaynak: string;                    // Video URL veya PDF path
  varlikSayisi: number;
  tahminSayisi: number;
  isabetOrani: string;               // %
  ortalamaAlphaConsensus: string;    // pip
  ortalamaAlphaForward: string;      // pip
  belgeBasariSkoru: string;          // 0-100
}

interface BelgelerRow {
  "Belge Tarihi": string;
  "Kurum": string;
  "Analistler": string;
  "Format": string;
  "Belge Adı": string;
  "Özet Metin": string;
  "Yatırım Tezi": string;
  "Varsayımlar": string;
  "Risk Analizi": string;
  "Varsayım Gerçekleşme": string;
  "Tahmin Sapması": string;
  "Kaynak"?: string;
}

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

interface ForecastResult {
  date: string;
  pair: string;
  spot: number;
  deviation1m_pips: number | null;
  actual1m: number | null;
  alpha_vs_consensus_pips: number | null;
  alpha_vs_forward_pips: number | null;
  alpha_vs_consensus_pct: number | null;
  alpha_vs_forward_pct: number | null;
  source: string | null;
  institution?: string;
}

// ── CSV Parsing (sade, dış bağımlılık yok) ──

function parseCSV(content: string): Record<string, string>[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];

    if (ch === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if (ch === "\n" && !inQuotes) {
      row.push(current);
      current = "";
      if (row.some((field) => field.length > 0)) rows.push(row);
      row = [];
      continue;
    }

    current += ch;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((field) => field.length > 0)) rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header, index) => index === 0 ? header.replace(/^\uFEFF/, "") : header);
  return rows.slice(1).map((vals) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
}

function normalizeOutputCell(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s*\n+\s*/g, " / ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// ── Scoring Logic ──

function calcVarsayimEtkisi(varsayimGerceklesme: string): { skor: number; etiket: string } {
  const ok = (varsayimGerceklesme.match(/✅/g) || []).length;
  const fail = (varsayimGerceklesme.match(/❌/g) || []).length;
  const partial = (varsayimGerceklesme.match(/⚠️/g) || []).length;

  const total = ok + fail + partial;
  if (total === 0) return { skor: 0, etiket: "⏳" };

  const oran = (ok + partial * 0.5) / total;
  const skor = Math.round(oran * 100);

  if (oran >= 0.80) return { skor, etiket: "Yüksek" };
  if (oran >= 0.50) return { skor, etiket: "Orta" };
  return { skor, etiket: "Düşük" };
}

/**
 * Sapma (yüzde) → 0-100 Hedef Yakınlığı Skoru
 * 0-1%: 100
 * 1-3%: 100 → 50 (doğrusal)
 * 3-7%: 50 → 20 (doğrusal)
 * 7-15%: 20 → 0 (doğrusal)
 * 15%+: 0
 */
function sapmaPctToSkor(absPct: number): number {
  if (absPct <= 1) return 100;
  if (absPct <= 3) return 100 - ((absPct - 1) / 2) * 50;
  if (absPct <= 7) return 50 - ((absPct - 3) / 4) * 30;
  if (absPct <= 15) return 20 - ((absPct - 7) / 8) * 20;
  return 0;
}

/**
 * Alpha (yüzde) → 0-100 Alpha Skoru
 * ≥ +2%: 100
 * 0 ~ +2%: 50 → 100 (doğrusal)
 * -2% ~ 0: 20 → 50 (doğrusal)
 * ≤ -2%: 0 → 20
 */
function alphaPctToSkor(alphaPct: number): number {
  if (alphaPct >= 2) return 100;
  if (alphaPct >= 0) return 50 + (alphaPct / 2) * 50;
  if (alphaPct >= -2) return 20 + ((alphaPct + 2) / 2) * 30;
  if (alphaPct >= -5) return Math.max(0, 20 + ((alphaPct + 2) / 3) * 20);
  return 0;
}

function harfNotu(skor: number): string {
  if (skor >= 85) return "A";
  if (skor >= 70) return "B";
  if (skor >= 55) return "C";
  if (skor >= 40) return "D";
  return "F";
}

// ── Main ──

function main() {
  const belgelerPath = process.argv[2];
  const tahminlerPath = process.argv[3];
  const resultsPath = process.argv[4];

  if (!belgelerPath || !tahminlerPath || !resultsPath) {
    console.error("Kullanım: npx tsx src/analyzer/doc-score.ts <belgeler.csv> <tahminler.csv> <forecasts-results.json>");
    process.exit(1);
  }

  for (const p of [belgelerPath, tahminlerPath, resultsPath]) {
    if (!fs.existsSync(path.resolve(p))) {
      console.error(`Dosya bulunamadı: ${path.resolve(p)}`);
      process.exit(1);
    }
  }

  const belgeler = parseCSV(fs.readFileSync(path.resolve(belgelerPath), "utf-8")) as unknown as BelgelerRow[];
  const tahminler = parseCSV(fs.readFileSync(path.resolve(tahminlerPath), "utf-8")) as unknown as TahminlerRow[];
  const forecastResults: ForecastResult[] = JSON.parse(fs.readFileSync(path.resolve(resultsPath), "utf-8"));

  console.log(`\n📊 Belge Skorlama — ${belgeler.length} belge, ${tahminler.length} tahmin, ${forecastResults.length} sonuç\n`);

  // Tahminlerde "Belge Adı" sütunu varsa daha spesifik eşleştirme yap (aynı gün+kurum çakışmasını önler)
  const tahminHasBelgeAdi = tahminler.length > 0 && "Belge Adı" in tahminler[0] && tahminler.some(t => (t as any)["Belge Adı"]);

  const scores: ScoreRow[] = [];

  for (const belge of belgeler) {
    const tarih = belge["Belge Tarihi"];
    const kurum = belge["Kurum"];

    // Tahminler: bu belgeye ait satırlar
    // Belge Adı sütunu varsa kurum+tarih+belgeAdı, yoksa kurum+tarih bazlı eşleştirme
    const belgeAdi = belge["Belge Adı"];
    const belgeTahminleri = tahminHasBelgeAdi
      ? tahminler.filter((t) => t["Tahmin Tarihi"] === tarih && t["Kurum"] === kurum && (t as any)["Belge Adı"] === belgeAdi)
      : tahminler.filter((t) => t["Tahmin Tarihi"] === tarih && t["Kurum"] === kurum);

    // Unique varlıklar
    const varliklar = new Set(belgeTahminleri.map((t) => t["Varlık"]));
    const varlikSayisi = varliklar.size;
    const tahminSayisi = belgeTahminleri.length;

    // Yön isabeti
    const isabetli = belgeTahminleri.filter((t) => t["Yön İsabeti"] === "✅").length;
    const yanlis = belgeTahminleri.filter((t) => t["Yön İsabeti"] === "❌").length;
    const toplamDegerl = isabetli + yanlis;
    const isabetOrani = toplamDegerl > 0 ? (isabetli / toplamDegerl) * 100 : 0;

    // Varsayım etkisi
    const { skor: varsayimSkor, etiket: varsayimEtkisi } = calcVarsayimEtkisi(belge["Varsayım Gerçekleşme"]);

    // Alpha hesaplama: forecasts-results.json'dan bu tarih+kurum (yüzdesel — pariteler arası adil)
    const belgeForecastResults = forecastResults.filter((r) => r.date === tarih && r.institution === kurum);

    const alphaConsPctVals = belgeForecastResults
      .filter((r) => r.alpha_vs_consensus_pct !== null && r.alpha_vs_consensus_pct !== undefined)
      .map((r) => r.alpha_vs_consensus_pct!);
    const ortAlphaConsPct = alphaConsPctVals.length > 0
      ? alphaConsPctVals.reduce((s, v) => s + v, 0) / alphaConsPctVals.length
      : null;

    const alphaFwdPctVals = belgeForecastResults
      .filter((r) => r.alpha_vs_forward_pct !== null && r.alpha_vs_forward_pct !== undefined)
      .map((r) => r.alpha_vs_forward_pct!);
    const ortAlphaFwdPct = alphaFwdPctVals.length > 0
      ? alphaFwdPctVals.reduce((s, v) => s + v, 0) / alphaFwdPctVals.length
      : null;

    // Ort. sapma yüzdesel (Hedef Fiyat vs Gerçekleşen Fiyat — tüm pariteler için adil)
    const sapmaPctler = belgeTahminleri
      .filter((t) => {
        const hedef = t["Hedef Fiyat"];
        const gercek = t["Gerçekleşen Fiyat"];
        return hedef && gercek && t["Yön İsabeti"] !== "⏳" && Number(hedef) > 0 && Number(gercek) > 0;
      })
      .map((t) => Math.abs((Number(t["Gerçekleşen Fiyat"]) - Number(t["Hedef Fiyat"])) / Number(t["Hedef Fiyat"]) * 100));
    const ortSapmaPct = sapmaPctler.length > 0
      ? sapmaPctler.reduce((s, v) => s + v, 0) / sapmaPctler.length
      : null;

    // ── Belge Başarı Skoru ──
    // Yön %40 + Hedef yakınlığı %30 + Alpha %20 + Varsayım %10
    // Minimum 5 değerlendirilen tahmin gerekli
    const MIN_EVAL_THRESHOLD = 5;
    const yonSkor = isabetOrani; // already 0-100
    const hedefSkor = ortSapmaPct !== null ? sapmaPctToSkor(ortSapmaPct) : 50;
    // Alpha skoru: yüzdesel ortalama — null ise neutral (50) ama ağırlık düşürülür
    const hasAlpha = ortAlphaConsPct !== null || ortAlphaFwdPct !== null;
    const alphaRawPct = ortAlphaConsPct !== null && ortAlphaFwdPct !== null
      ? (ortAlphaConsPct + ortAlphaFwdPct) / 2
      : ortAlphaConsPct ?? ortAlphaFwdPct ?? 0;
    const alphaSkor = hasAlpha ? alphaPctToSkor(alphaRawPct) : 0;
    const varsayimSkorNorm = varsayimSkor; // already 0-100

    // Alpha verisi yoksa ağırlığı yön ve hedefe dağıt: Yön %50 + Hedef %35 + Varsayım %15
    // toplamDegerl < MIN_EVAL_THRESHOLD olsa bile gerçek skoru hesapla (çıktıda ⚠ uyarısı verilir)
    const belgeBasariSkoru = toplamDegerl > 0
      ? hasAlpha
        ? yonSkor * 0.40 + hedefSkor * 0.30 + alphaSkor * 0.20 + varsayimSkorNorm * 0.10
        : yonSkor * 0.50 + hedefSkor * 0.35 + varsayimSkorNorm * 0.15
      : 0;

    const row: ScoreRow = {
      belgeTarihi: tarih,
      kurum: belge["Kurum"],
      analistler: belge["Analistler"],
      format: belge["Format"],
      ozetMetin: belge["Özet Metin"],
      belgeAdi: belge["Belge Adı"],
      yatirimTezi: belge["Yatırım Tezi"],
      varsayimlarGerceklesme: belge["Varsayım Gerçekleşme"],
      varsayimEtkisi,
      riskAnalizi: belge["Risk Analizi"],
      kaynak: belge["Kaynak"] ?? "",
      varlikSayisi,
      tahminSayisi,
      isabetOrani: toplamDegerl > 0 ? `%${isabetOrani.toFixed(1)}` : "⏳",
      ortalamaAlphaConsensus: ortAlphaConsPct !== null ? `${ortAlphaConsPct >= 0 ? "+" : ""}${ortAlphaConsPct.toFixed(2)}%` : "—",
      ortalamaAlphaForward: ortAlphaFwdPct !== null ? `${ortAlphaFwdPct >= 0 ? "+" : ""}${ortAlphaFwdPct.toFixed(2)}%` : "—",
      belgeBasariSkoru: toplamDegerl >= MIN_EVAL_THRESHOLD
        ? `${belgeBasariSkoru.toFixed(1)} (${harfNotu(belgeBasariSkoru)})`
        : toplamDegerl > 0
          ? `⚠ ${belgeBasariSkoru.toFixed(1)} (${harfNotu(belgeBasariSkoru)}) [${toplamDegerl}<${MIN_EVAL_THRESHOLD} değerlendirme]`
          : "⏳",
    };
    scores.push(row);
  }

  // ── Konsol tablosu ──
  console.log("─".repeat(120));
  console.log(
    "Tarih".padEnd(12),
    "Varlık".padEnd(7),
    "Tahmin".padEnd(7),
    "İsabet %".padEnd(10),
    "Alpha(C)".padEnd(10),
    "Alpha(F)".padEnd(10),
    "Varsayım".padEnd(9),
    "Skor".padEnd(12),
  );
  console.log("─".repeat(120));

  for (const s of scores) {
    console.log(
      s.belgeTarihi.padEnd(12),
      String(s.varlikSayisi).padEnd(7),
      String(s.tahminSayisi).padEnd(7),
      s.isabetOrani.padEnd(10),
      s.ortalamaAlphaConsensus.padEnd(10),
      s.ortalamaAlphaForward.padEnd(10),
      s.varsayimEtkisi.padEnd(9),
      s.belgeBasariSkoru,
    );
  }

  // ── CSV çıktısı ──
  const csvHeaders = [
    "Belge Tarihi", "Kurum", "Analistler", "Format", "Özet Metin", "Belge Adı",
    "Yatırım Tezi", "Varsayımlar & Gerçekleşme", "Varsayım Etkisi", "Risk Analizi",
    "Kaynak",
    "Varlık Sayısı", "Tahmin Sayısı", "İsabet Oranı %",
    "Ort. Alpha (Consensus)", "Ort. Alpha (Forward)", "Belge Başarı Skoru",
  ];

  const csvRows = scores.map((s) => [
    s.belgeTarihi, s.kurum, s.analistler, s.format, s.ozetMetin, s.belgeAdi,
    s.yatirimTezi, s.varsayimlarGerceklesme, s.varsayimEtkisi, s.riskAnalizi,
    s.kaynak,
    String(s.varlikSayisi), String(s.tahminSayisi), s.isabetOrani,
    s.ortalamaAlphaConsensus, s.ortalamaAlphaForward, s.belgeBasariSkoru,
  ]);

  const escapeCsv = (v: string) => `"${normalizeOutputCell(v).replace(/"/g, '""')}"`;
  const csvContent = [
    csvHeaders.map(escapeCsv).join(","),
    ...csvRows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  const escapeMarkdown = (v: string) => normalizeOutputCell(v).replace(/\|/g, "\\|");

  // ── MD çıktısı ──
  const mdLines: string[] = [];

  mdLines.push(`# Doküman Skorları`);
  mdLines.push("");
  mdLines.push(`| ${csvHeaders.join(" | ")} |`);
  mdLines.push(`| ${csvHeaders.map(() => "---").join(" | ")} |`);
  for (const row of csvRows) {
    mdLines.push(`| ${row.map(escapeMarkdown).join(" | ")} |`);
  }
  mdLines.push("");
  mdLines.push("## Skor Formülü");
  mdLines.push("");
  mdLines.push("```");
  mdLines.push("Alpha verisi varken:");
  mdLines.push("  Belge Başarı Skoru = Yön İsabeti × 0.40 + Hedef Yakınlığı × 0.30 + Alpha Skoru × 0.20 + Varsayım Doğruluğu × 0.10");
  mdLines.push("Alpha verisi yokken:");
  mdLines.push("  Belge Başarı Skoru = Yön İsabeti × 0.50 + Hedef Yakınlığı × 0.35 + Varsayım Doğruluğu × 0.15");
  mdLines.push("Minimum 5 değerlendirilen tahmin gereklidir. Altında ⚠ uyarısı verilir.");
  mdLines.push("```");
  mdLines.push("");
  mdLines.push("| Not | Aralık |");
  mdLines.push("|-----|--------|");
  mdLines.push("| A | ≥ 85 |");
  mdLines.push("| B | 70–84 |");
  mdLines.push("| C | 55–69 |");
  mdLines.push("| D | 40–54 |");
  mdLines.push("| F | < 40 |");

  // ── Kaydet ──
  const outDir = path.dirname(path.resolve(belgelerPath));
  const mdPath = path.join(outDir, "dokuman_skorlari.md");
  const csvPath = path.join(outDir, "dokuman_skorlari.csv");

  fs.writeFileSync(mdPath, mdLines.join("\n"));
  fs.writeFileSync(csvPath, csvContent);

  console.log(`\n💾 MD:  ${mdPath}`);
  console.log(`💾 CSV: ${csvPath}`);
}

main();
