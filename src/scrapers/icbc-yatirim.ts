import type { Browser, BrowserContext, Page } from "playwright";
import { BaseScraper } from "./base-scraper.js";
import type { Report, ScraperCategory, ScraperSource } from "../types.js";
import { CONFIG } from "../config.js";

/** Türkçe ay adlarını sayıya çevir */
const AY_MAP: Record<string, string> = {
  ocak: "01", şubat: "02", mart: "03", nisan: "04",
  mayıs: "05", haziran: "06", temmuz: "07", ağustos: "08",
  eylül: "09", ekim: "10", kasım: "11", aralık: "12",
};

/**
 * Türkçe tarih string'ini YYYY-MM-DD'ye çevirir.
 * "12 Mart 2026" → "2026-03-12"
 */
function parseTurkishDate(text: string): string | null {
  const m = text.trim().match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const month = AY_MAP[m[2].toLowerCase()];
  const year = m[3];
  if (!month) return null;
  return `${year}-${month}-${day}`;
}

export class IcbcYatirimScraper extends BaseScraper {
  constructor(source: ScraperSource) {
    super(source);
  }

  async createContext(browser: Browser): Promise<BrowserContext> {
    return browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });
  }

  /**
   * Cookie consent bar'ını geç — "Tüm Çerezleri Kabul Et" veya "Opsiyonel Çerezleri Reddet"
   */
  private async handleConsent(page: Page): Promise<void> {
    try {
      const acceptBtn = page
        .locator("button, a")
        .filter({ hasText: /Tüm Çerezleri Kabul Et|Opsiyonel Çerezleri Reddet/ });
      await acceptBtn.first().waitFor({ timeout: 5_000 });
      await acceptBtn.first().click();
      console.log("  ✓ Cookie consent geçildi");
      await page.waitForTimeout(1000);
    } catch {
      // Zaten geçilmiş veya yok
    }
  }

  async scrape(
    browser: Browser,
    category: ScraperCategory
  ): Promise<Report[]> {
    const context = await this.createContext(browser);
    const page = await context.newPage();
    const reports: Report[] = [];

    try {
      console.log(`\n📄 ${this.getName()} — ${category.name}`);
      console.log(`  🌐 ${category.url}`);

      await page.goto(category.url, {
        waitUntil: "domcontentloaded",
        timeout: CONFIG.browser.timeout,
      });
      await page.waitForTimeout(2000);
      await this.handleConsent(page);

      // Sayfadaki tüm PDF linklerini ve tarihlerini çıkar
      const items = await page.evaluate(() => {
        const results: { title: string; pdfUrl: string; dateText: string }[] = [];
        const links = document.querySelectorAll('a[href$=".pdf"]');

        for (const link of links) {
          const el = link as HTMLAnchorElement;
          const href = el.href;
          const title = el.textContent?.trim() ?? "";
          if (!href || !title) continue;

          // Tarih, link'in öncesindeki text node'da — parent container'dan çıkar
          let dateText = "";
          const parent = el.parentElement;
          if (parent) {
            // Parent'ın text content'inden tarih pattern'ını yakala
            const fullText = parent.textContent ?? "";
            const dateMatch = fullText.match(/(\d{1,2}\s+\S+\s+\d{4})/);
            if (dateMatch) {
              dateText = dateMatch[1];
            }
          }

          results.push({ title, pdfUrl: href, dateText });
        }

        return results;
      });

      console.log(`  📦 ${items.length} PDF link bulundu`);

      for (const item of items) {
        // Tarihi parse et — Türkçe tarih veya PDF URL'den
        let date = parseTurkishDate(item.dateText);

        // Fallback: PDF URL'den tarih çıkar (ModelPortfoy-YYYYMMDD-...)
        if (!date) {
          const urlMatch = item.pdfUrl.match(/(\d{8})/);
          if (urlMatch) {
            const d = urlMatch[1];
            date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
          }
        }

        if (!date) {
          console.log(`  ⚠ Tarih bulunamadı: ${item.title}`);
          date = new Date().toISOString().slice(0, 10);
        }

        reports.push({
          title: item.title,
          url: category.url,
          date,
          pdfUrl: item.pdfUrl,
          source: this.getSlug(),
          category: category.slug,
        });
        console.log(`  ✓ ${item.title} (${date})`);
      }
    } catch (err) {
      console.error(
        `  ❌ Hata: ${err instanceof Error ? err.message : err}`
      );
    } finally {
      await context.close();
    }

    return reports;
  }
}
