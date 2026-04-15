import { readFileSync, writeFileSync } from 'fs';

const csv = readFileSync('analizler/tahminler.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim());
const header = lines[0];

// Parse CSV properly
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (inQuotes) {
      if (line[i] === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (line[i] === '"') {
        inQuotes = false;
      } else {
        current += line[i];
      }
    } else {
      if (line[i] === '"') {
        inQuotes = true;
      } else if (line[i] === ',') {
        fields.push(current);
        current = '';
      } else {
        current += line[i];
      }
    }
  }
  fields.push(current);
  return fields;
}

const headers = parseCsvLine(header);
const rows = lines.slice(1).map(parseCsvLine);

// Group by institution
const groups = {};
for (const row of rows) {
  const inst = row[1];
  if (!groups[inst]) groups[inst] = [];
  groups[inst].push(row);
}

// Stats
function calcStats(entries) {
  let total = entries.length;
  let yon_ok = entries.filter(r => r[13] === '✅').length;
  let yon_fail = entries.filter(r => r[13] === '❌').length;
  let yon_wait = entries.filter(r => r[13] === '⏳').length;
  let yon_warn = entries.filter(r => r[13] === '⚠️').length;
  let evaluated = yon_ok + yon_fail;
  let accuracy = evaluated > 0 ? (yon_ok / evaluated * 100).toFixed(1) : 'N/A';
  return { total, yon_ok, yon_fail, yon_wait, yon_warn, accuracy };
}

let md = `# Tahminler — Granüler Tahmin İzleme (2023-08 – 2026-04)

> 802 tahmin satırı: 620 Danske Bank FX, 176 ICBC Yatırım hisse, 6 Devrim Akyıl sözel tahmin.
> Her satır = bir belge × bir varlık × bir vade kombinasyonu.

## Özet İstatistikler

| Kurum | Satır | ✅ Doğru | ❌ Yanlış | ⏳ Bekliyor | Yön İsabeti |
|-------|-------|---------|---------|-----------|-------------|
`;

for (const [inst, entries] of Object.entries(groups)) {
  const s = calcStats(entries);
  md += `| ${inst} | ${s.total} | ${s.yon_ok} | ${s.yon_fail} | ${s.yon_wait} | ${s.accuracy}% |\n`;
}
const allStats = calcStats(rows);
md += `| **TOPLAM** | **${allStats.total}** | **${allStats.yon_ok}** | **${allStats.yon_fail}** | **${allStats.yon_wait}** | **${allStats.accuracy}%** |\n\n---\n\n`;

// Generate tables per institution
for (const [inst, entries] of Object.entries(groups)) {
  md += `## ${inst}\n\n`;

  // Sub-group by document
  const docs = {};
  for (const row of entries) {
    const docName = row[4];
    if (!docs[docName]) docs[docName] = [];
    docs[docName].push(row);
  }

  for (const [docName, docRows] of Object.entries(docs)) {
    const date = docRows[0][0];
    md += `### ${docName} (${date})\n\n`;

    // Shorter header for readability
    md += `| Varlık | Vade | Spot | Hedef | Gerçekleşen | Sapma | Yön | Analiz Tezi |\n`;
    md += `|--------|------|------|-------|-------------|-------|-----|-------------|\n`;

    for (const row of docRows) {
      const varlik = row[5];
      const vade = row[6];
      const spot = row[8];
      const hedef = row[9];
      const gerceklesen = row[11] || '—';
      const sapma = row[12] || '—';
      const yon = row[13];
      // Truncate tezi for markdown table
      let tezi = row[10];
      if (tezi.length > 80) tezi = tezi.substring(0, 77) + '...';

      md += `| ${varlik} | ${vade} | ${spot} | ${hedef} | ${gerceklesen} | ${sapma} | ${yon} | ${tezi} |\n`;
    }
    md += '\n';
  }
  md += '---\n\n';
}

// Legend
md += `## Açıklamalar

| Sembol | Anlam |
|--------|-------|
| ✅ | Yön isabetli (forecast yönü ile gerçekleşen yön aynı) |
| ❌ | Yön isabetsiz (forecast yönü ile gerçekleşen yön ters) |
| ⏳ | Henüz veri yok (vade dolmamış veya gerçekleşen fiyat mevcut değil) |
| ⚠️ | Sabit tahmin: spot ≈ hedef, gerçekleşen farklı yöne gitti |

- **Sapma (pip)**: Gerçekleşen fiyat ile hedef fiyat arasındaki fark (pip cinsinden)
- **Hedef Tarihi**: Tahmin tarihi + vade süresi
- **Yön İsabeti**: Spot→Hedef yönü ile Spot→Gerçekleşen yönü karşılaştırılarak hesaplanır
- Veri kaynağı: \`analizler/forecasts-results.json\` (forecast-check.ts çıktısı)
`;

writeFileSync('analizler/tahminler.md', md, 'utf8');
console.log(`tahminler.md oluşturuldu: ${md.split('\n').length} satır`);
