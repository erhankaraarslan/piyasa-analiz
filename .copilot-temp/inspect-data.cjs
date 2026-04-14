const fs = require("fs");

function parseCSV(text) {
  const rows = [];
  let current = "";
  let inQuotes = false;
  const lines = text.split("\n");

  for (const line of lines) {
    if (!inQuotes) {
      current = line;
    } else {
      current += "\n" + line;
    }

    let quoteCount = 0;
    for (let i = 0; i < current.length; i++) {
      if (current[i] === '"') {
        if (i + 1 < current.length && current[i + 1] === '"') {
          i++;
        } else {
          quoteCount++;
        }
      }
    }
    inQuotes = quoteCount % 2 !== 0;

    if (!inQuotes) {
      if (current.trim()) rows.push(current);
      current = "";
    }
  }

  return rows.map((row) => {
    const fields = [];
    let field = "";
    let inQ = false;
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (inQ) {
        if (c === '"') {
          if (i + 1 < row.length && row[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQ = false;
          }
        } else {
          field += c;
        }
      } else {
        if (c === '"') {
          inQ = true;
        } else if (c === ",") {
          fields.push(field);
          field = "";
        } else {
          field += c;
        }
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
    header.forEach((h, i) => (obj[h] = r[i] || ""));
    return obj;
  });
}

const dokSkor = csvToObjects(
  fs.readFileSync("analizler/dokuman_skorlari.csv", "utf8")
);
const tahSkor = csvToObjects(
  fs.readFileSync("analizler/tahmin_skorlari.csv", "utf8")
);
const belgeler = csvToObjects(
  fs.readFileSync("analizler/belgeler.csv", "utf8")
);
const tahminler = csvToObjects(
  fs.readFileSync("analizler/tahminler.csv", "utf8")
);

console.log("dokSkor count:", dokSkor.length);
console.log("dokSkor keys:", Object.keys(dokSkor[0]));
console.log("dokSkor sample:", JSON.stringify(dokSkor[0]).slice(0, 300));
console.log("---");
console.log("tahSkor count:", tahSkor.length);
console.log("tahSkor keys:", Object.keys(tahSkor[0]));
console.log("tahSkor sample:", JSON.stringify(tahSkor[0]).slice(0, 300));
console.log("---");
console.log("belgeler count:", belgeler.length);
console.log("belgeler keys:", Object.keys(belgeler[0]));
console.log("---");
console.log("tahminler count:", tahminler.length);
console.log("tahminler keys:", Object.keys(tahminler[0]));
console.log("---");

// Unique values for filters
const pairs = [...new Set(tahSkor.map((r) => r["Varlık"]))].sort();
const institutions = [...new Set(dokSkor.map((r) => r["Kurum"]))].sort();
const formats = [...new Set(dokSkor.map((r) => r["Format"]))].sort();
const maturities = [...new Set(tahSkor.map((r) => r["Vade"]))].sort();
const recommendations = [
  ...new Set(tahSkor.map((r) => r["Öneri"])),
].sort();
console.log("pairs:", pairs);
console.log("institutions:", institutions);
console.log("formats:", formats);
console.log("maturities:", maturities);
console.log("recommendations:", recommendations);
