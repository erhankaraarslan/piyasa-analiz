const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "analizler", "dashboard.html");

/* ── CSV Parser ────────────────────────────────────────────────────────── */
function parseCSV(text) {
  const rows = [];
  let current = "";
  let inQuotes = false;
  for (const line of text.split("\n")) {
    current = inQuotes ? current + "\\n" + line : line;
    let q = 0;
    for (let i = 0; i < current.length; i++) {
      if (current[i] === '"') {
        if (i + 1 < current.length && current[i + 1] === '"') i++;
        else q++;
      }
    }
    inQuotes = q % 2 !== 0;
    if (!inQuotes) {
      if (current.trim()) rows.push(current);
      current = "";
    }
  }
  return rows.map((row) => {
    const fields = [];
    let field = "",
      inQ = false;
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (inQ) {
        if (c === '"') {
          if (i + 1 < row.length && row[i + 1] === '"') {
            field += '"';
            i++;
          } else inQ = false;
        } else field += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ",") {
          fields.push(field);
          field = "";
        } else field += c;
      }
    }
    fields.push(field);
    return fields;
  });
}

function csvToObjects(text) {
  const rows = parseCSV(text);
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, i) => (obj[h] = (r[i] || "").trim()));
    return obj;
  });
}

/* ── Read Data ─────────────────────────────────────────────────────────── */
const dokSkor = csvToObjects(
  fs.readFileSync(path.join(ROOT, "analizler/dokuman_skorlari.csv"), "utf8")
);
const tahSkor = csvToObjects(
  fs.readFileSync(path.join(ROOT, "analizler/tahmin_skorlari.csv"), "utf8")
);

/* ── Compute KPIs ──────────────────────────────────────────────────────── */
const docScores = dokSkor
  .map((d) => parseFloat(d["Belge Başarı Skoru"]))
  .filter((n) => !isNaN(n));
const avgDocScore = docScores.length
  ? (docScores.reduce((a, b) => a + b, 0) / docScores.length).toFixed(1)
  : "—";
const bestDoc = dokSkor.reduce(
  (best, d) => {
    const s = parseFloat(d["Belge Başarı Skoru"]);
    return s > (best.s || 0)
      ? { s, name: d["Belge Adı"], date: d["Belge Tarihi"] }
      : best;
  },
  { s: 0 }
);

const fScores = tahSkor
  .map((d) => parseFloat(d["Başarı Skoru"]))
  .filter((n) => !isNaN(n));
const avgForecastScore = fScores.length
  ? (fScores.reduce((a, b) => a + b, 0) / fScores.length).toFixed(1)
  : "—";

const hitRateNums = tahSkor.filter((r) => r["Yön İsabeti"] === "1");
const hitRateDen = tahSkor.filter(
  (r) => r["Yön İsabeti"] === "1" || r["Yön İsabeti"] === "0"
);
const hitRate = hitRateDen.length
  ? ((hitRateNums.length / hitRateDen.length) * 100).toFixed(1)
  : "—";

const totalDocs = dokSkor.length;
const totalForecasts = tahSkor.length;
const pendingForecasts = tahSkor.filter((r) =>
  r["Başarı Skoru"].includes("\u23f3")
).length;
const evaluatedForecasts = totalForecasts - pendingForecasts;
const pdfCount = dokSkor.filter((d) => d.Format === "PDF").length;
const videoCount = dokSkor.filter((d) => d.Format === "Video").length;

function gradeDistribution(items, key) {
  const g = { A: 0, B: 0, C: 0, D: 0, F: 0, pending: 0 };
  items.forEach((d) => {
    const s = d[key];
    if (s.includes("\u23f3")) g.pending++;
    else if (s.includes("(A)")) g.A++;
    else if (s.includes("(B)")) g.B++;
    else if (s.includes("(C)")) g.C++;
    else if (s.includes("(D)")) g.D++;
    else if (s.includes("(F)")) g.F++;
  });
  return g;
}
const docGrades = gradeDistribution(dokSkor, "Belge Başarı Skoru");
const fGrades = gradeDistribution(tahSkor, "Başarı Skoru");

const recDist = {};
tahSkor.forEach((r) => {
  const rec = r["Öneri"] || "\u2014";
  recDist[rec] = (recDist[rec] || 0) + 1;
});

const pairStats = {};
tahSkor.forEach((r) => {
  const p = r["Varlık"];
  if (!pairStats[p])
    pairStats[p] = { total: 0, evaluated: 0, hits: 0, scores: [], mape: [] };
  pairStats[p].total++;
  const hit = r["Yön İsabeti"];
  if (hit === "1" || hit === "0") {
    pairStats[p].evaluated++;
    if (hit === "1") pairStats[p].hits++;
  }
  const s = parseFloat(r["Başarı Skoru"]);
  if (!isNaN(s)) pairStats[p].scores.push(s);
  const m = parseFloat(r["Error (MAPE)"]);
  if (!isNaN(m)) pairStats[p].mape.push(m);
});

const instTimeline = {};
dokSkor.forEach((d) => {
  const inst = d["Kurum"];
  if (!instTimeline[inst]) instTimeline[inst] = [];
  const s = parseFloat(d["Belge Başarı Skoru"]);
  if (!isNaN(s))
    instTimeline[inst].push({ date: d["Belge Tarihi"], score: s });
});
Object.values(instTimeline).forEach((arr) =>
  arr.sort((a, b) => a.date.localeCompare(b.date))
);

const instOptions = [...new Set(dokSkor.map((d) => d.Kurum))].sort();
const fmtOptions = [...new Set(dokSkor.map((d) => d.Format))].sort();
const pairOptions = [...new Set(tahSkor.map((r) => r["Varlık"]))].sort();
const instFOptions = [...new Set(tahSkor.map((r) => r.Kurum))].sort();

function esc(s) {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function kpiColorClass(v, high, mid) {
  const n = parseFloat(v);
  if (isNaN(n)) return "";
  if (n >= high) return "green";
  if (n >= mid) return "amber";
  return "red";
}

function optionsHtml(arr) {
  return arr
    .map((v) => '<option value="' + esc(v) + '">' + esc(v) + "</option>")
    .join("");
}

/* ── Build HTML ────────────────────────────────────────────────────────── */
const P = []; // parts array

P.push("<!DOCTYPE html>");
P.push('<html lang="tr">');
P.push("<head>");
P.push('<meta charset="UTF-8">');
P.push(
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
);
P.push("<title>Analiz Panorama</title>");
P.push(
  '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></' +
    "script>"
);

// CSS
P.push("<style>");
P.push(
  fs.readFileSync(path.join(__dirname, "dashboard-styles.css"), "utf8")
);
P.push("</style>");
P.push("</head>");
P.push("<body>");

// Header
const dateStr = new Date().toLocaleDateString("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
P.push('<div class="header">');
P.push(
  "  <div><h1>Analiz Panorama</h1><div class='subtitle'>Yatırım Raporları &amp; Tahmin Performansı</div></div>"
);
P.push(
  "  <div class='date-badge'>Güncelleme: " + dateStr + "</div>"
);
P.push("</div>");

// Nav
P.push('<div class="nav" id="nav">');
P.push(
  '  <button class="active" data-tab="overview">Genel Bakış</button>'
);
P.push('  <button data-tab="documents">Belgeler</button>');
P.push('  <button data-tab="forecasts">Tahminler</button>');
P.push('  <button data-tab="pairs">Parite Analizi</button>');
P.push("</div>");

// TAB: Overview
P.push('<div class="tab-content active" id="tab-overview">');
P.push('<div class="kpi-grid">');
P.push(
  '  <div class="kpi accent"><div class="label">Toplam Belge</div><div class="value">' +
    totalDocs +
    '</div><div class="sub">' +
    pdfCount +
    " PDF \u00b7 " +
    videoCount +
    " Video</div></div>"
);
P.push(
  '  <div class="kpi teal"><div class="label">Toplam Tahmin</div><div class="value">' +
    totalForecasts +
    '</div><div class="sub">' +
    evaluatedForecasts +
    " de\u011ferlendirildi \u00b7 " +
    pendingForecasts +
    " bekliyor</div></div>"
);
P.push(
  '  <div class="kpi ' +
    kpiColorClass(avgDocScore, 70, 50) +
    '"><div class="label">Ort. Belge Skoru</div><div class="value">' +
    avgDocScore +
    '</div><div class="sub">0\u2013100 aral\u0131\u011f\u0131nda</div></div>'
);
P.push(
  '  <div class="kpi ' +
    kpiColorClass(avgForecastScore, 70, 50) +
    '"><div class="label">Ort. Tahmin Skoru</div><div class="value">' +
    avgForecastScore +
    '</div><div class="sub">' +
    fScores.length +
    " de\u011ferlendirme</div></div>"
);
P.push(
  '  <div class="kpi ' +
    kpiColorClass(hitRate, 60, 45) +
    '"><div class="label">Y\u00f6n \u0130sabeti</div><div class="value">%' +
    hitRate +
    '</div><div class="sub">' +
    hitRateNums.length +
    "/" +
    hitRateDen.length +
    " do\u011fru</div></div>"
);
P.push(
  '  <div class="kpi green"><div class="label">En \u0130yi Belge</div><div class="value" style="font-size:1.1rem">' +
    bestDoc.s.toFixed(1) +
    '</div><div class="sub" style="font-size:.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px">' +
    esc(bestDoc.name) +
    "</div></div>"
);
P.push("</div>");
P.push('<div class="charts-row">');
P.push(
  '  <div class="chart-card"><h3>Belge Skor Da\u011f\u0131l\u0131m\u0131</h3><canvas id="chartDocGrades"></canvas></div>'
);
P.push(
  '  <div class="chart-card"><h3>Tahmin Skor Da\u011f\u0131l\u0131m\u0131</h3><canvas id="chartForecastGrades"></canvas></div>'
);
P.push(
  '  <div class="chart-card"><h3>\u00d6neri Da\u011f\u0131l\u0131m\u0131</h3><canvas id="chartRec"></canvas></div>'
);
P.push(
  '  <div class="chart-card"><h3>Kurum Skor Trendi</h3><canvas id="chartTimeline"></canvas></div>'
);
P.push("</div>");
P.push("</div>");

// TAB: Documents
P.push('<div class="tab-content" id="tab-documents">');
P.push('<div class="filters">');
P.push(
  '  <div class="filter-group"><label>Kurum</label><select id="docFilterInst"><option value="">T\u00fcm\u00fc</option>' +
    optionsHtml(instOptions) +
    "</select></div>"
);
P.push(
  '  <div class="filter-group"><label>Format</label><select id="docFilterFormat"><option value="">T\u00fcm\u00fc</option>' +
    optionsHtml(fmtOptions) +
    "</select></div>"
);
P.push(
  '  <div class="filter-group"><label>S\u0131ralama</label><select id="docSort"><option value="date-desc">Tarih (Yeni \u2192 Eski)</option><option value="date-asc">Tarih (Eski \u2192 Yeni)</option><option value="score-desc">Skor (Y\u00fcksek \u2192 D\u00fc\u015f\u00fck)</option><option value="score-asc">Skor (D\u00fc\u015f\u00fck \u2192 Y\u00fcksek)</option></select></div>'
);
P.push(
  '  <div class="filter-group"><label>Ara</label><input type="search" id="docSearch" placeholder="Belge ad\u0131, tez, risk..."></div>'
);
P.push("</div>");
P.push('<div class="result-count" id="docCount"></div>');
P.push('<div class="table-wrap"><table id="docTable"><thead><tr>');
const docThCols = [
  ["Belge Tarihi", "Tarih"],
  ["Kurum", "Kurum"],
  ["Belge Ad\u0131", "Belge Ad\u0131"],
  ["Format", "Format"],
  ["\u0130sabet Oran\u0131 %", "\u0130sabet"],
  ["Varl\u0131k Say\u0131s\u0131", "Varl\u0131k"],
  ["Tahmin Say\u0131s\u0131", "Tahmin"],
  ["Ort. Alpha (Consensus)", "\u03b1 Cons."],
  ["Ort. Alpha (Forward)", "\u03b1 Fwd."],
  ["Belge Ba\u015far\u0131 Skoru", "Skor"],
];
docThCols.forEach(([col, label]) => {
  P.push(
    "<th data-col=\"" + esc(col) + "\">" + label + "</th>"
  );
});
P.push('</tr></thead><tbody id="docBody"></tbody></table></div>');
P.push('<div class="modal-overlay" id="docModal"></div>');
P.push("</div>");

// TAB: Forecasts
P.push('<div class="tab-content" id="tab-forecasts">');
P.push('<div class="filters">');
P.push(
  '  <div class="filter-group"><label>Varl\u0131k</label><select id="fPair"><option value="">T\u00fcm\u00fc</option>' +
    optionsHtml(pairOptions) +
    "</select></div>"
);
P.push(
  '  <div class="filter-group"><label>Vade</label><select id="fMaturity"><option value="">T\u00fcm\u00fc</option><option value="+1M">+1M</option><option value="+3M">+3M</option><option value="+6M">+6M</option><option value="+12M">+12M</option></select></div>'
);
P.push(
  '  <div class="filter-group"><label>\u00d6neri</label><select id="fRec"><option value="">T\u00fcm\u00fc</option><option value="Strong Buy">Strong Buy</option><option value="Buy">Buy</option><option value="Hold">Hold</option><option value="Reduce">Reduce</option><option value="Sell">Sell</option><option value="Strong Sell">Strong Sell</option><option value="Strong Bullish">Strong Bullish</option><option value="Bullish">Bullish</option><option value="Slightly Bullish">Slightly Bullish</option><option value="Neutral">Neutral</option><option value="Slightly Bearish">Slightly Bearish</option><option value="Bearish">Bearish</option><option value="Strong Bearish">Strong Bearish</option></select></div>'
);
P.push(
  '  <div class="filter-group"><label>Kurum</label><select id="fInst"><option value="">T\u00fcm\u00fc</option>' +
    optionsHtml(instFOptions) +
    "</select></div>"
);
P.push(
  '  <div class="filter-group"><label>Ara</label><input type="search" id="fSearch" placeholder="Varl\u0131k, analist, tez..."></div>'
);
P.push("</div>");
P.push('<div class="table-info"><div class="result-count" id="fCount"></div></div>');
P.push(
  '<div class="table-wrap"><table id="forecastTable"><thead><tr>'
);
const thCols = [
  ["Varl\u0131k", "Varl\u0131k", "sticky-col"],
  ["Ba\u015far\u0131 Skoru", "Skor", ""],
  ["\u00d6neri", "\u00d6neri", ""],
  ["Y\u00f6n \u0130sabeti", "\u0130sabet", ""],
  ["Tahmin Tarihi", "Tarih", ""],
  ["Kurum", "Kurum", ""],
  ["Analist", "Analist", ""],
  ["Vade", "Vade", ""],
  ["Hedef Fiyat", "Hedef", ""],
  ["Tahmin tarihindeki Fiyat", "Spot", ""],
  ["Ger\u00e7ekle\u015fen Fiyat", "Ger\u00e7ekle\u015fen", ""],
  ["Beklenen Getiri %", "Beklenen", ""],
  ["Ger\u00e7ekle\u015fen Getiri %", "Ger\u00e7. %", ""],
  ["Error (MAPE)", "MAPE", ""],
  ["Alpha", "Alpha", ""],
  ["Hedef Y\u00f6n", "Y\u00f6n", ""],
];
thCols.forEach(([col, label, extra]) => {
  const cls = [
    "Hedef Fiyat",
    "Tahmin tarihindeki Fiyat",
    "Ger\u00e7ekle\u015fen Fiyat",
  ].includes(col)
    ? "text-right"
    : "";
  const allCls = [cls, extra].filter(Boolean).join(" ");
  P.push(
    "<th data-col=\"" +
      esc(col) +
      '"' +
      (allCls ? ' class="' + allCls + '"' : "") +
      ">" +
      label +
      ' <span class="sort-arrow">\u25bc</span></th>'
  );
});
P.push(
  '</tr></thead><tbody id="forecastBody"></tbody></table></div>'
);
P.push('<div class="pagination" id="forecastPagination"></div>');
P.push("</div>");

// TAB: Pairs
P.push('<div class="tab-content" id="tab-pairs">');
P.push(
  '<div class="section-title"><span class="icon">\ud83d\udcb1</span> Parite Performans Kartlar\u0131</div>'
);
P.push('<div class="pair-grid" id="pairGrid"></div>');
P.push(
  '<div class="section-title" style="margin-top:32px"><span class="icon">\ud83d\udcca</span> Parite Detay Grafi\u011fi</div>'
);
P.push(
  '<div class="filters" style="margin-bottom:16px"><div class="filter-group"><label>Parite Se\u00e7</label><select id="pairSelect">' +
    optionsHtml(Object.keys(pairStats).sort()) +
    "</select></div></div>"
);
P.push(
  '<div class="chart-card" style="max-width:900px"><canvas id="chartPairDetail"></canvas></div>'
);
P.push("</div>");

// ── JavaScript ──
P.push("<script>");
P.push("var DOK_SKOR = " + JSON.stringify(dokSkor) + ";");
P.push("var TAH_SKOR = " + JSON.stringify(tahSkor) + ";");
P.push("var PAIR_STATS = " + JSON.stringify(pairStats) + ";");
P.push("var INST_TIMELINE = " + JSON.stringify(instTimeline) + ";");
P.push("var DOC_GRADES = " + JSON.stringify(docGrades) + ";");
P.push("var F_GRADES = " + JSON.stringify(fGrades) + ";");
P.push("var REC_DIST = " + JSON.stringify(recDist) + ";");

// Read browser JS from external file
P.push(
  fs.readFileSync(path.join(__dirname, "dashboard-browser.js"), "utf8")
);

P.push("</" + "script>");
P.push("</body>");
P.push("</html>");

const finalHtml = P.join("\n");
fs.writeFileSync(OUT, finalHtml, "utf8");
console.log("Dashboard written to", OUT);
console.log(
  "Size:",
  (fs.statSync(OUT).size / 1024).toFixed(0),
  "KB"
);
