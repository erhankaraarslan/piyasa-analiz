import fs from "node:fs";
import path from "node:path";
import { PDFParse } from "pdf-parse";

interface ExtractedText {
  file: string;
  title: string;
  pages: number;
  text: string;
}

/**
 * Tek bir PDF dosyasından metin çıkarır.
 */
export async function extractTextFromPdf(pdfPath: string): Promise<ExtractedText> {
  const buffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();

  return {
    file: pdfPath,
    title: path.basename(pdfPath, ".pdf"),
    pages: result.pages?.length ?? 0,
    text: result.text,
  };
}

/**
 * Bir klasördeki tüm PDF dosyalarından metin çıkarır.
 */
export async function extractTextsFromDir(dirPath: string): Promise<ExtractedText[]> {
  const files = fs.readdirSync(dirPath)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((f) => path.join(dirPath, f));

  const results: ExtractedText[] = [];
  for (const file of files) {
    results.push(await extractTextFromPdf(file));
  }
  return results;
}

// CLI: tsx src/analyzer/extract-text.ts <pdf-path-or-dir>
async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Kullanım: tsx src/analyzer/extract-text.ts <pdf-dosyası-veya-klasör>");
    process.exit(1);
  }

  const resolved = path.resolve(target);
  const stat = fs.statSync(resolved);

  let results: ExtractedText[];
  if (stat.isDirectory()) {
    results = await extractTextsFromDir(resolved);
  } else {
    results = [await extractTextFromPdf(resolved)];
  }

  for (const r of results) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📄 ${r.file}`);
    console.log(`   Sayfa: ${r.pages}`);
    console.log(`${"=".repeat(80)}`);
    console.log(r.text);
  }
}

main().catch((err) => {
  console.error("Hata:", err instanceof Error ? err.message : err);
  process.exit(1);
});
