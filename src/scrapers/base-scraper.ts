import type { Browser, BrowserContext } from "playwright";
import type { Report, ScraperCategory, ScraperSource } from "../types.js";

export abstract class BaseScraper {
  protected source: ScraperSource;

  constructor(source: ScraperSource) {
    this.source = source;
  }

  getName(): string {
    return this.source.name;
  }

  getSlug(): string {
    return this.source.slug;
  }

  abstract scrape(
    browser: Browser,
    category: ScraperCategory
  ): Promise<Report[]>;

  abstract createContext(browser: Browser): Promise<BrowserContext>;
}
