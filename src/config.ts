import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ScraperSource } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

export const CONFIG = {
  outputDir: path.join(ROOT_DIR, "raporlar"),
  stateDir: path.join(ROOT_DIR, "state"),
  stateFile: path.join(ROOT_DIR, "state", "downloaded.json"),

  /** İstekler arası bekleme süresi (ms) */
  requestDelay: 2000,

  /** Playwright tarayıcı ayarları */
  browser: {
    headless: true,
    timeout: 60_000,
  },
} as const;

export const SOURCES: ScraperSource[] = [
  {
    name: "Danske Bank",
    slug: "danske-bank",
    categories: [
      {
        name: "FX Forecast Update",
        slug: "fx-forecast-update",
        url: "https://research.danskebank.com/research/#/articlelist/FX-Forecast-Update",
      },
    ],
  },
];
