import type { Browser, BrowserContext } from "playwright";
import { BaseScraper } from "./base-scraper.js";
import type { Report, ScraperCategory, ScraperSource } from "../types.js";
import { CONFIG } from "../config.js";

const BASE_URL = "https://www.denizyatirim.com";

export class DenizYatirimScraper extends BaseScraper {
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

  async scrape(
    browser: Browser,
    category: ScraperCategory,
  ): Promise<Report[]> {
    const context = await this.createContext(browser);
    const reports: Report[] = [];

    try {
      console.log(`\n📄 ${this.getName()} — ${category.name}`);
      console.log(`  🌐 ${category.url}`);

      // Sayfa 1'i Playwright ile aç (DOM'dan box-list öğelerini çıkarmak için)
      const page = await context.newPage();
      await page.goto(category.url, {
        waitUntil: "networkidle",
        timeout: CONFIG.browser.timeout,
      });
      await page.waitForTimeout(2_000);

      // Listing sayfasından bülten öğelerini çıkar
      const items = await page.evaluate(() => {
        const boxes = document.querySelectorAll(".box-list .box");
        return Array.from(boxes).map((b) => ({
          title: b.querySelector("h3")?.textContent?.trim() ?? "",
          detailHref:
            b
              .querySelector("button[data-ajax-href]")
              ?.getAttribute("data-ajax-href") ?? "",
        }));
      });

      // Sayfa 2 varsa onu da çek (pagination: /DailyNewsletter?page=2)
      const paginationHrefs = await page.evaluate(() => {
        const links = document.querySelectorAll(
          '.pagination a[href*="page="]',
        );
        const hrefs = new Set<string>();
        for (const a of links) {
          const href = a.getAttribute("href");
          if (href) hrefs.add(href);
        }
        return [...hrefs];
      });

      await page.close();

      // Ek sayfaları context.request ile çek
      for (const href of paginationHrefs) {
        const pageUrl = `${BASE_URL}${href}`;
        const res = await context.request.get(pageUrl);
        const html = await res.text();
        const matches = [
          ...html.matchAll(
            /<h3[^>]*class="title"[^>]*>(.*?)<\/h3>[\s\S]*?data-ajax-href="([^"]*)"/g,
          ),
        ];
        for (const m of matches) {
          items.push({ title: m[1].trim(), detailHref: m[2] });
        }
      }

      console.log(`  📋 Toplam ${items.length} bülten bulundu`);

      // Her bülten için Detail sayfasından PDF URL'sini çek
      for (const item of items) {
        if (!item.detailHref) continue;

        // data-ajax-href: "../Detail?id=13520" → /Detail?id=13520
        const detailPath = item.detailHref.replace(/^\.\./, "");
        const detailUrl = `${BASE_URL}${detailPath}`;

        try {
          const res = await context.request.get(detailUrl);
          const html = await res.text();

          // PDF linkini çıkar: href="/Uploads/Gunluk_Bulten_-_14.04.2026_13520.pdf"
          const pdfMatch = html.match(/href="([^"]*\.pdf)"/);
          if (!pdfMatch) {
            console.log(`  ⚠  PDF bulunamadı: ${item.title}`);
            continue;
          }

          const pdfPath = pdfMatch[1];
          const pdfUrl = pdfPath.startsWith("http")
            ? pdfPath
            : `${BASE_URL}${pdfPath}`;

          // Tarih: title'dan çıkar — "Günlük Bülten 14.04.2026"
          const dateMatch = item.title.match(/(\d{2})\.(\d{2})\.(\d{4})/);
          const date = dateMatch
            ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
            : new Date().toISOString().slice(0, 10);

          reports.push({
            title: item.title,
            url: detailUrl,
            date,
            pdfUrl,
            source: this.getName(),
            category: category.name,
          });
        } catch (err) {
          console.log(
            `  ⚠  Detail alınamadı: ${item.title} — ${err instanceof Error ? err.message : err}`,
          );
        }

        // Rate limiting
        await new Promise((r) => setTimeout(r, CONFIG.requestDelay));
      }
    } finally {
      await context.close();
    }

    return reports;
  }
}
