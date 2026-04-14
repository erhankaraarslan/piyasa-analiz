import path from "node:path";
import { chromium } from "playwright";
import { CONFIG, SOURCES } from "./config.js";
import { Tracker } from "./tracker.js";
import { DanskeBankScraper } from "./scrapers/danske-bank.js";
import type { BaseScraper } from "./scrapers/base-scraper.js";
import type { Report, ScraperSource } from "./types.js";

function createScraper(source: ScraperSource): BaseScraper {
  switch (source.slug) {
    case "danske-bank":
      return new DanskeBankScraper(source);
    default:
      throw new Error(`Bilinmeyen kaynak: ${source.slug}`);
  }
}

async function main() {
  const isDebug = process.argv.includes("--debug");

  console.log("╔══════════════════════════════════════════╗");
  console.log("║   📊 Rapor Toplama Sistemi (Report Collector)  ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log();

  const tracker = new Tracker();
  let totalNew = 0;
  let totalSkipped = 0;
  let totalError = 0;

  // Playwright browser'ı başlat
  console.log("🚀 Tarayıcı başlatılıyor...");
  const browser = await chromium.launch({
    headless: CONFIG.browser.headless,
  });

  try {
    for (const source of SOURCES) {
      const scraper = createScraper(source);

      for (const category of source.categories) {
        // Scrape et
        const reports = await scraper.scrape(browser, category);
        console.log(`\n  📦 Toplam ${reports.length} rapor bulundu`);

        // Yeni raporları filtrele
        const newReports = reports.filter(
          (r) => !tracker.isDownloaded(r.pdfUrl)
        );
        const skipped = reports.length - newReports.length;
        totalSkipped += skipped;

        if (skipped > 0) {
          console.log(`  ⏭  ${skipped} rapor zaten indirilmiş, atlanıyor`);
        }

        if (newReports.length === 0) {
          console.log("  ✓ Yeni rapor yok");
          continue;
        }

        console.log(`  ⬇  ${newReports.length} yeni rapor indiriliyor...`);

        // İndirme klasörünü hazırla
        const outputDir = path.join(
          CONFIG.outputDir,
          source.slug,
          category.slug
        );

        for (const report of newReports) {
          try {
            console.log(`\n  ⬇  "${report.title}"`);

            // PDF veya sayfa olarak indir
            const filePath = await downloadWithPlaywright(
              browser,
              report,
              outputDir
            );

            tracker.add({
              url: report.pdfUrl,
              title: report.title,
              downloadedAt: new Date().toISOString(),
              filePath,
            });

            totalNew++;
            console.log(`    ✅ Kaydedildi: ${filePath}`);
          } catch (err) {
            totalError++;
            console.error(
              `    ❌ İndirme hatası: ${err instanceof Error ? err.message : err}`
            );
          }
        }
      }
    }
  } finally {
    await browser.close();
    console.log("\n🔒 Tarayıcı kapatıldı");
  }

  // Özet
  console.log("\n══════════════════════════════════════════");
  console.log(`📊 Sonuç:`);
  console.log(`   ✅ ${totalNew} yeni rapor indirildi`);
  console.log(`   ⏭  ${totalSkipped} rapor zaten mevcut (atlandı)`);
  if (totalError > 0) {
    console.log(`   ❌ ${totalError} rapor indirilemedi`);
  }
  console.log("══════════════════════════════════════════\n");
}

async function downloadWithPlaywright(
  browser: ReturnType<typeof chromium.launch> extends Promise<infer T>
    ? T
    : never,
  report: Report,
  outputDir: string
): Promise<string> {
  const fs = await import("node:fs");
  fs.mkdirSync(outputDir, { recursive: true });

  const datePrefix = report.date.replace(/[\s/]/g, "-");
  const slug = report.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  const fileName = `${datePrefix}_${slug}.pdf`;
  const filePath = path.join(outputDir, fileName);

  if (fs.existsSync(filePath)) {
    return filePath;
  }

  // PDF URL'leri genellikle direkt download tetikler
  // Node.js fetch ile indiriyoruz (daha güvenilir)
  const response = await fetch(report.pdfUrl);
  if (!response.ok) {
    throw new Error(`PDF indirilemedi: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

main().catch((err) => {
  console.error("\n💥 Kritik hata:", err);
  process.exit(1);
});
