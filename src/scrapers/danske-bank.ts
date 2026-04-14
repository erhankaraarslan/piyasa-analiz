import type { Browser, BrowserContext, Page } from "playwright";
import { BaseScraper } from "./base-scraper.js";
import type { Report, ScraperCategory, ScraperSource } from "../types.js";
import { CONFIG } from "../config.js";

interface DanskeArticle {
  articleid: string;
  title: string;
  published_date: string;
  published_url: string;
  categoryInfo: { category: string; subcategory: string }[];
  keywords: string;
  summary: string;
}

interface DanskeApiResponse {
  count: number;
  articles: DanskeArticle[];
}

export class DanskeBankScraper extends BaseScraper {
  constructor(source: ScraperSource) {
    super(source);
  }

  async createContext(browser: Browser): Promise<BrowserContext> {
    return browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });
  }

  /**
   * Disclaimer modal (ReactModal overlay) ve cookie consent bar'ı handle et.
   * Sıralama: disclaimer modal -> cookie consent (modal üstte olduğu için)
   */
  private async handleConsents(page: Page): Promise<void> {
    // 1) Professional Investor disclaimer modal
    try {
      const yesOptions = page.locator("text=/^YES/");
      await yesOptions.first().waitFor({ timeout: 8_000 });
      const count = await yesOptions.count();
      for (let i = 0; i < count; i++) {
        await yesOptions.nth(i).click();
      }
      await page
        .locator("a, button")
        .filter({ hasText: /^Agree$/ })
        .first()
        .click();
      console.log("  ✓ Disclaimer geçildi");
      await page.waitForTimeout(2000);
    } catch {
      // Zaten geçilmiş
    }

    // 2) Cookie consent bar
    try {
      const cookieBtn = page
        .locator("button")
        .filter({ hasText: /Ok to necessary/ });
      await cookieBtn.waitFor({ timeout: 5_000 });
      await cookieBtn.click();
      console.log("  ✓ Cookie consent geçildi");
      await page.waitForTimeout(1000);
    } catch {
      // Zaten geçilmiş
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

      // Sayfaya git ve consent'leri handle et
      await page.goto(category.url, {
        waitUntil: "domcontentloaded",
        timeout: CONFIG.browser.timeout,
      });
      await page.waitForTimeout(3000);
      await this.handleConsents(page);

      // API response'unu yakalamak için listener kur
      let apiData: DanskeApiResponse | null = null;
      page.on("response", async (response) => {
        const url = response.url();
        if (url.includes("api5.danskebank.com") && url.includes("subcategory")) {
          try {
            apiData = (await response.json()) as DanskeApiResponse;
          } catch {}
        }
      });

      // Kategori sayfasındaki "FX Forecast Update" linkine tıkla
      // (Hash routing consent sonrası çalışmadığı için SPA navigasyonunu tetikliyoruz)
      const categoryLink = page
        .locator("a")
        .filter({ hasText: category.name });
      if ((await categoryLink.count()) > 0) {
        await categoryLink.first().click();
        console.log(`  🔄 "${category.name}" linkine tıklandı`);
        await page.waitForTimeout(6000);
      }

      // API response'u yakalandıysa kullan
      if (apiData) {
        const data = apiData as DanskeApiResponse;
        console.log(`  📊 API'den ${data.articles.length} makale alındı (toplam: ${data.count})`);

        for (const article of data.articles) {
          const pdfUrl = article.published_url?.trim();
          if (!pdfUrl) {
            console.log(`  ⚠ PDF URL yok: ${article.title}`);
            continue;
          }

          reports.push({
            title: article.title,
            url: `https://research.danskebank.com/research/article/${article.articleid}/EN`,
            date: article.published_date.split("T")[0],
            pdfUrl,
            source: this.getSlug(),
            category: category.slug,
          });
          console.log(`  ✓ ${article.title}`);
        }
      } else {
        console.log("  ⚠ API response yakalanmadı, HTML scraping'e geçiliyor...");
        // Fallback: HTML'den article linklerini çıkar
        const fallbackReports = await this.scrapeFromHtml(page, category);
        reports.push(...fallbackReports);
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

  /**
   * Fallback: HTML sayfasından makale bilgilerini çıkar.
   * API yakalanmazsa kullanılır.
   */
  private async scrapeFromHtml(
    page: Page,
    category: ScraperCategory
  ): Promise<Report[]> {
    const reports: Report[] = [];
    const articles = await page.evaluate(() => {
      const items: { title: string; url: string; date: string }[] = [];
      const seen = new Set<string>();

      document
        .querySelectorAll('a[href*="/article/"]')
        .forEach((a) => {
          const el = a as HTMLAnchorElement;
          const href = el.href;
          if (seen.has(href)) return;
          seen.add(href);

          // Parent container'dan başlık çıkar
          let title = "";
          let date = "";
          let parent = el.parentElement;
          for (let i = 0; i < 8 && parent; i++) {
            const text = parent.innerText?.trim() ?? "";
            if (!title && text.length > 20 && text.length < 500) {
              const lines = text.split("\n").filter((l) => l.trim().length > 0);
              for (const line of lines) {
                const trimmed = line.trim();
                if (
                  trimmed.length > 15 &&
                  trimmed !== "Read more" &&
                  !trimmed.match(/^\d/)
                ) {
                  title = trimmed;
                  break;
                }
              }
            }
            if (!date) {
              const dateMatch = text.match(
                /(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})/
              );
              if (dateMatch) date = dateMatch[1];
            }
            if (title && date) break;
            parent = parent.parentElement;
          }

          if (title) {
            items.push({
              title,
              url: href,
              date: date || new Date().toISOString().slice(0, 10),
            });
          }
        });

      return items;
    });

    // Her makale detay sayfasından PDF linkini bul
    for (const article of articles) {
      try {
        await page.goto(article.url, {
          waitUntil: "domcontentloaded",
          timeout: 20_000,
        });
        await page.waitForTimeout(CONFIG.requestDelay);

        const pdfUrl = await page.evaluate(() => {
          for (const sel of ['a[href$=".pdf"]', 'a[href*="/link/"]']) {
            const el = document.querySelector(sel) as HTMLAnchorElement;
            if (el?.href && !el.href.includes("privacy")) return el.href;
          }
          return "";
        });

        reports.push({
          title: article.title,
          url: article.url,
          date: article.date,
          pdfUrl: pdfUrl || article.url,
          source: this.getSlug(),
          category: category.slug,
        });

        if (pdfUrl) {
          console.log(`  ✓ ${article.title.slice(0, 60)} — PDF bulundu`);
        } else {
          console.log(
            `  ⚠ ${article.title.slice(0, 60)} — PDF yok, sayfa olarak kaydedilecek`
          );
        }
      } catch {
        console.log(`  ❌ Sayfa yüklenemedi: ${article.url}`);
      }
    }

    return reports;
  }
}
