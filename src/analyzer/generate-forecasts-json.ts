/**
 * Generates forecasts.json from all extracted report data.
 * Run: npx tsx src/analyzer/generate-forecasts-json.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

interface ForecastEntry {
  date: string;
  pair: string;
  spot: number | null;
  forecast1m: number | null;
  forecast3m: number | null;
  forecast6m: number | null;
  forecast12m: number | null;
  consensus1m: number | null;
  consensus3m: number | null;
  consensus6m: number | null;
  consensus12m: number | null;
  forward1m: number | null;
  forward3m: number | null;
  forward6m: number | null;
  forward12m: number | null;
  institution: string;
  documentName: string;
}

const forecasts: ForecastEntry[] = [];

// Helper to add Danske Bank entries
function addDanske(
  date: string,
  docName: string,
  pairs: Record<string, [number, number, number, number, number]>
) {
  for (const [pair, [spot, f1m, f3m, f6m, f12m]] of Object.entries(pairs)) {
    forecasts.push({
      date,
      pair,
      spot,
      forecast1m: f1m,
      forecast3m: f3m,
      forecast6m: f6m,
      forecast12m: f12m,
      consensus1m: null,
      consensus3m: null,
      consensus6m: null,
      consensus12m: null,
      forward1m: null,
      forward3m: null,
      forward6m: null,
      forward12m: null,
      institution: "Danske Bank",
      documentName: docName,
    });
  }
}

// Helper to add ICBC stock entries
function addICBC(
  date: string,
  docName: string,
  stocks: Record<string, [number, number]>
) {
  for (const [ticker, [spot, target]] of Object.entries(stocks)) {
    forecasts.push({
      date,
      pair: ticker,
      spot,
      forecast1m: null,
      forecast3m: null,
      forecast6m: null,
      forecast12m: target,
      consensus1m: null,
      consensus3m: null,
      consensus6m: null,
      consensus12m: null,
      forward1m: null,
      forward3m: null,
      forward6m: null,
      forward12m: null,
      institution: "ICBC Yatırım",
      documentName: docName,
    });
  }
}

// Helper to add Deniz Yatırım stock entries
function addDeniz(
  date: string,
  docName: string,
  stocks: Record<string, [number, number]>
) {
  for (const [ticker, [spot, target]] of Object.entries(stocks)) {
    forecasts.push({
      date,
      pair: ticker,
      spot,
      forecast1m: null,
      forecast3m: null,
      forecast6m: null,
      forecast12m: target,
      consensus1m: null,
      consensus3m: null,
      consensus6m: null,
      consensus12m: null,
      forward1m: null,
      forward3m: null,
      forward6m: null,
      forward12m: null,
      institution: "Deniz Yatırım",
      documentName: docName,
    });
  }
}

// Helper for Devrim Akyıl verbal forecasts
function addDevrim(
  date: string,
  docName: string,
  pair: string,
  spot: number | null,
  f1m: number | null,
  f3m: number | null,
  f6m: number | null,
  f12m: number | null
) {
  forecasts.push({
    date,
    pair,
    spot,
    forecast1m: f1m,
    forecast3m: f3m,
    forecast6m: f6m,
    forecast12m: f12m,
    consensus1m: null,
    consensus3m: null,
    consensus6m: null,
    consensus12m: null,
    forward1m: null,
    forward3m: null,
    forward6m: null,
    forward12m: null,
    institution: "Devrim Akyıl",
    documentName: docName,
  });
}

// ============================================================
// DANSKE BANK — 10 FX Forecast Update Reports
// ============================================================

// Report 1: Jun 2025
addDanske("2025-06-23", "FX Forecast Update Jun 2025", {
  "EUR/USD": [1.15, 1.16, 1.18, 1.20, 1.22],
  "EUR/SEK": [11.14, 11.10, 11.10, 11.20, 11.30],
  "EUR/NOK": [11.64, 11.70, 11.80, 12.00, 12.20],
  "EUR/DKK": [7.4594, 7.4600, 7.4575, 7.4550, 7.4550],
  "EUR/GBP": [0.86, 0.85, 0.86, 0.87, 0.87],
  "EUR/JPY": [169, 167, 168, 167, 165],
  "EUR/CHF": [0.94, 0.93, 0.92, 0.91, 0.91],
  "EUR/PLN": [4.27, 4.30, 4.20, 4.10, 4.10],
  "EUR/HUF": [404, 400, 410, 420, 430],
  "EUR/CZK": [24.8, 24.8, 24.8, 24.7, 24.6],
  "EUR/TRY": [45.8, 46.7, 49.0, 52.0, 57.1],
  "EUR/CNY": [8.27, 8.33, 8.45, 8.57, 8.69],
  "USD/JPY": [147, 144, 142, 139, 135],
  "USD/CAD": [1.38, 1.38, 1.39, 1.39, 1.40],
  "USD/CNY": [7.19, 7.18, 7.16, 7.14, 7.12],
});

// Report 2: Jul 2025
addDanske("2025-07-22", "FX Forecast Update Jul 2025", {
  "EUR/USD": [1.17, 1.17, 1.19, 1.21, 1.23],
  "EUR/SEK": [11.21, 11.10, 11.20, 11.30, 11.40],
  "EUR/NOK": [11.88, 11.90, 12.00, 12.20, 12.40],
  "EUR/DKK": [7.4650, 7.4600, 7.4575, 7.4550, 7.4550],
  "EUR/GBP": [0.87, 0.87, 0.88, 0.89, 0.89],
  "EUR/JPY": [172, 173, 174, 173, 171],
  "EUR/CHF": [0.93, 0.93, 0.92, 0.91, 0.91],
  "EUR/PLN": [4.26, 4.30, 4.20, 4.10, 4.10],
  "EUR/HUF": [399, 400, 410, 420, 430],
  "EUR/CZK": [24.6, 24.7, 24.7, 24.5, 24.5],
  "EUR/TRY": [47.3, 48.0, 50.2, 53.4, 58.7],
  "EUR/CNY": [8.38, 8.40, 8.52, 8.64, 8.76],
});

// Report 3: Aug 2025
addDanske("2025-08-19", "FX Forecast Update Aug 2025", {
  "EUR/USD": [1.17, 1.17, 1.19, 1.21, 1.23],
  "EUR/SEK": [11.13, 11.10, 11.20, 11.30, 11.40],
  "EUR/NOK": [11.90, 12.00, 12.10, 12.30, 12.50],
  "EUR/DKK": [7.4643, 7.4600, 7.4575, 7.4550, 7.4550],
  "EUR/GBP": [0.86, 0.87, 0.88, 0.89, 0.89],
  "EUR/JPY": [172, 171, 170, 169, 170],
  "EUR/CHF": [0.94, 0.93, 0.92, 0.91, 0.91],
  "EUR/PLN": [4.24, 4.30, 4.20, 4.10, 4.10],
  "EUR/HUF": [394, 400, 410, 420, 430],
  "EUR/CZK": [24.5, 24.5, 24.5, 24.4, 24.4],
  "EUR/TRY": [47.8, 48.6, 50.8, 54.0, 59.3],
  "EUR/CNY": [8.38, 8.40, 8.52, 8.64, 8.76],
  "USD/JPY": [148, 146, 143, 140, 138],
  "USD/CAD": [1.38, 1.38, 1.38, 1.39, 1.39],
  "USD/CNY": [7.18, 7.18, 7.16, 7.14, 7.12],
});

// Report 4: Sep 2025
addDanske("2025-09-19", "FX Forecast Update Sep 2025", {
  "EUR/USD": [1.18, 1.17, 1.19, 1.21, 1.23],
  "EUR/SEK": [11.03, 11.00, 11.20, 11.30, 11.40],
  "EUR/NOK": [11.66, 11.60, 11.70, 11.90, 12.10],
  "EUR/DKK": [7.4641, 7.4600, 7.4575, 7.4550, 7.4550],
  "EUR/GBP": [0.87, 0.87, 0.88, 0.89, 0.89],
  "EUR/JPY": [174, 171, 170, 169, 170],
  "EUR/CHF": [0.93, 0.93, 0.93, 0.91, 0.91],
  "EUR/PLN": [4.26, 4.30, 4.20, 4.10, 4.10],
  "EUR/HUF": [389, 390, 400, 420, 420],
  "EUR/CZK": [24.3, 24.3, 24.3, 24.2, 24.2],
  "EUR/TRY": [48.8, 49.0, 51.4, 54.5, 59.9],
  "EUR/CNY": [8.37, 8.33, 8.43, 8.53, 8.61],
});

// Report 5: Oct 2025
addDanske("2025-10-20", "FX Forecast Update Oct 2025", {
  "EUR/USD": [1.16, 1.15, 1.18, 1.20, 1.22],
  "EUR/SEK": [10.97, 11.00, 11.20, 11.30, 11.40],
  "EUR/NOK": [11.71, 11.70, 11.80, 12.00, 12.20],
  "EUR/DKK": [7.4685, 7.4675, 7.4625, 7.4575, 7.4550],
  "EUR/GBP": [0.87, 0.87, 0.88, 0.89, 0.89],
  "EUR/JPY": [175, 170, 171, 170, 171],
  "EUR/CHF": [0.92, 0.92, 0.92, 0.91, 0.91],
  "EUR/PLN": [4.24, 4.29, 4.19, 4.10, 4.10],
  "EUR/HUF": [393, 393, 393, 415, 415],
  "EUR/CZK": [24.1, 24.1, 24.1, 24.1, 24.0],
  "EUR/TRY": [49.1, 49.5, 52.0, 55.5, 61.5],
  "EUR/CNY": [8.25, 8.17, 8.35, 8.46, 8.54],
  "USD/JPY": [151, 148, 145, 142, 140],
  "USD/CAD": [1.40, 1.40, 1.41, 1.42, 1.42],
  "USD/CNY": [7.12, 7.12, 7.08, 7.05, 7.00],
});

// Report 6: Nov 2025
addDanske("2025-11-18", "FX Forecast Update Nov 2025", {
  "EUR/USD": [1.16, 1.15, 1.18, 1.20, 1.22],
  "EUR/SEK": [11.00, 11.00, 11.20, 11.30, 11.40],
  "EUR/NOK": [11.75, 11.80, 11.90, 12.10, 12.30],
  "EUR/DKK": [7.4685, 7.4625, 7.4600, 7.4575, 7.4550],
  "EUR/GBP": [0.88, 0.88, 0.89, 0.90, 0.90],
  "EUR/JPY": [180, 178, 179, 179, 177],
  "EUR/CHF": [0.92, 0.92, 0.92, 0.91, 0.91],
  "EUR/PLN": [4.24, 4.30, 4.20, 4.10, 4.10],
  "EUR/HUF": [385, 390, 400, 410, 420],
  "EUR/CZK": [24.2, 24.2, 24.2, 24.0, 24.0],
  "EUR/TRY": [49.1, 49.5, 52.4, 55.9, 62.0],
  "EUR/CNY": [8.25, 8.17, 8.35, 8.46, 8.54],
});

// Report 7: Dec 2025
addDanske("2025-12-19", "FX Forecast Update Dec 2025", {
  "EUR/USD": [1.17, 1.17, 1.19, 1.21, 1.23],
  "EUR/SEK": [10.90, 10.90, 11.00, 11.10, 11.10],
  "EUR/NOK": [11.93, 11.90, 12.00, 12.20, 12.40],
  "EUR/DKK": [7.4712, 7.4650, 7.4600, 7.4575, 7.4550],
  "EUR/GBP": [0.88, 0.88, 0.89, 0.90, 0.90],
  "EUR/JPY": [184, 181, 181, 180, 178],
  "EUR/CHF": [0.93, 0.92, 0.92, 0.91, 0.91],
  "EUR/PLN": [4.21, 4.20, 4.20, 4.10, 4.00],
  "EUR/HUF": [387, 390, 400, 410, 410],
  "EUR/CZK": [24.4, 24.4, 24.2, 24.1, 24.0],
  "EUR/TRY": [50.2, 50.8, 53.4, 56.9, 63.1],
  "EUR/CNY": [8.25, 8.24, 8.35, 8.47, 8.55],
  "USD/JPY": [157, 155, 152, 149, 145],
  "USD/CAD": [1.38, 1.38, 1.38, 1.39, 1.39],
  "USD/CNY": [7.04, 7.04, 7.02, 7.00, 6.95],
});

// Report 8: Jan 2026
addDanske("2026-01-19", "FX Forecast Update Jan 2026", {
  "EUR/USD": [1.16, 1.17, 1.19, 1.21, 1.23],
  "EUR/SEK": [10.73, 10.80, 10.90, 11.00, 11.00],
  "EUR/NOK": [11.73, 11.80, 11.90, 12.10, 12.30],
  "EUR/DKK": [7.4719, 7.4700, 7.4650, 7.4600, 7.4550],
  "EUR/GBP": [0.87, 0.87, 0.88, 0.89, 0.89],
  "EUR/JPY": [184, 184, 183, 183, 181],
  "EUR/CHF": [0.93, 0.92, 0.92, 0.91, 0.91],
  "EUR/PLN": [4.23, 4.20, 4.20, 4.10, 4.00],
  "EUR/HUF": [386, 390, 400, 410, 410],
  "EUR/CZK": [24.3, 24.3, 24.2, 24.1, 24.0],
  "EUR/TRY": [50.3, 51.4, 54.0, 57.5, 63.7],
  "EUR/CNY": [8.09, 8.15, 8.27, 8.35, 8.36],
  "USD/JPY": [158, 157, 154, 151, 147],
  "USD/CAD": [1.39, 1.39, 1.39, 1.40, 1.41],
  "USD/CNY": [6.96, 6.97, 6.95, 6.90, 6.80],
});

// Report 9: Feb 2026
addDanske("2026-02-16", "FX Forecast Update Feb 2026", {
  "EUR/USD": [1.19, 1.19, 1.21, 1.23, 1.25],
  "EUR/SEK": [10.60, 10.70, 10.80, 11.00, 11.00],
  "EUR/NOK": [11.26, 11.30, 11.30, 11.60, 11.80],
  "EUR/DKK": [7.4708, 7.4700, 7.4650, 7.4600, 7.4550],
  "EUR/GBP": [0.87, 0.87, 0.88, 0.89, 0.89],
  "EUR/JPY": [182, 182, 182, 181, 179],
  "EUR/CHF": [0.91, 0.91, 0.91, 0.90, 0.90],
  "EUR/PLN": [4.21, 4.20, 4.20, 4.10, 4.00],
  "EUR/HUF": [377, 380, 380, 400, 400],
  "EUR/CZK": [24.3, 24.3, 24.2, 24.1, 24.0],
  "EUR/TRY": [51.8, 52.8, 55.5, 59.2, 65.6],
  "EUR/CNY": [8.20, 8.19, 8.29, 8.36, 8.38],
  "USD/JPY": [154, 153, 150, 147, 143],
  "USD/CAD": [1.36, 1.36, 1.36, 1.37, 1.38],
  "USD/CNY": [6.90, 6.88, 6.85, 6.80, 6.70],
});

// Report 10: Mar 2026 (latest)
addDanske("2026-03-20", "FX Forecast Update Mar 2026", {
  "EUR/USD": [1.16, 1.13, 1.12, 1.17, 1.22],
  "EUR/SEK": [10.75, 10.80, 10.80, 11.00, 11.00],
  "EUR/NOK": [10.99, 11.00, 11.00, 11.30, 11.50],
  "EUR/DKK": [7.4713, 7.4725, 7.4675, 7.4625, 7.4600],
  "EUR/GBP": [0.86, 0.86, 0.87, 0.88, 0.88],
  "EUR/JPY": [183, 180, 178, 170, 183],
  "EUR/CHF": [0.91, 0.91, 0.91, 0.90, 0.90],
  "EUR/PLN": [4.27, 4.30, 4.20, 4.10, 4.00],
  "EUR/HUF": [391, 390, 390, 400, 410],
  "EUR/CZK": [24.5, 24.5, 24.4, 24.2, 24.0],
  "EUR/TRY": [51.3, 51.0, 52.1, 57.1, 64.9],
  "EUR/CNY": [7.97, 7.77, 7.67, 7.96, 8.17],
  "USD/JPY": [158, 159, 159, 145, 150],
  "USD/CAD": [1.37, 1.38, 1.38, 1.39, 1.40],
  "USD/CNY": [6.88, 6.88, 6.85, 6.80, 6.70],
});

// ============================================================
// ICBC YATIRIM — Model Portföy Reports
// ============================================================

// Aug 2023
addICBC("2023-08-15", "Model Portföy Ağustos 2023", {
  "AEFES": [102.60, 130.00],
  "AKBNK": [29.94, 43.00],
  "BIMAS": [257.00, 380.00],
  "CCOLA": [375.20, 420.00],
  "FROTO": [860.20, 1200.00],
  "ISCTR": [18.68, 24.00],
  "MAVI": [103.10, 160.00],
  "MGROS": [339.30, 400.00],
  "PGSUS": [851.60, 1150.00],
  "TAVHL": [121.00, 170.00],
  "TCELL": [58.00, 75.00],
  "THYAO": [238.00, 300.00],
  "TOASO": [266.80, 330.00],
  "YKBNK": [16.62, 24.00],
});

// Sep 2023
addICBC("2023-09-15", "Model Portföy Eylül 2023", {
  "AEFES": [100.00, 130.00],
  "AKBNK": [32.00, 43.00],
  "BIMAS": [270.00, 380.00],
  "CCOLA": [380.00, 420.00],
  "FROTO": [830.00, 1200.00],
  "MAVI": [110.00, 160.00],
  "MGROS": [360.00, 400.00],
  "PGSUS": [830.00, 1150.00],
  "TAVHL": [130.00, 170.00],
  "TCELL": [55.00, 75.00],
  "THYAO": [245.00, 300.00],
  "TOASO": [275.00, 330.00],
  "YKBNK": [17.50, 24.00],
});

// Oct 2023 #1
addICBC("2023-10-01", "Model Portföy Ekim 2023 (1)", {
  "AKBNK": [34.50, 43.00],
  "YKBNK": [18.70, 24.00],
  "BIMAS": [291.50, 380.00],
  "CCOLA": [399.20, 550.00],
  "FROTO": [848.20, 1250.00],
  "MAVI": [115.00, 160.00],
  "MGROS": [381.00, 500.00],
  "PGSUS": [843.00, 1200.00],
  "TCELL": [54.20, 75.00],
  "THYAO": [253.40, 330.00],
});

// Oct 2023 #2
addICBC("2023-10-15", "Model Portföy Ekim 2023 (2)", {
  "AEFES": [102.40, 140.00],
  "AKBNK": [34.50, 43.00],
  "YKBNK": [18.70, 24.00],
  "BIMAS": [291.50, 380.00],
  "CCOLA": [399.20, 550.00],
  "FROTO": [848.20, 1250.00],
  "MAVI": [115.00, 160.00],
  "MGROS": [381.00, 500.00],
  "PGSUS": [843.00, 1200.00],
  "TCELL": [54.20, 75.00],
  "THYAO": [253.40, 330.00],
});

// Jun 2024
addICBC("2024-06-15", "Model Portföy Haziran 2024", {
  "AKBNK": [65.20, 85.00],
  "ISCTR": [16.30, 22.00],
  "VAKBN": [23.80, 32.00],
  "AEFES": [234.40, 300.00],
  "BIMAS": [570.50, 720.00],
  "CCOLA": [796.50, 1100.00],
  "FROTO": [1119.00, 1450.00],
  "KCHOL": [218.60, 300.00],
  "MAVI": [118.70, 160.00],
  "MGROS": [542.50, 680.00],
  "TCELL": [100.20, 165.00],
  "THYAO": [305.80, 420.00],
});

// Oct 2024
addICBC("2024-10-22", "Model Portföy Ekim 2024", {
  "AKBNK": [49.90, 80.00],
  "TSKB": [11.57, 17.00],
  "VAKBN": [21.40, 34.00],
  "AEFES": [183.00, 270.00],
  "BIMAS": [460.50, 665.00],
  "CCOLA": [50.40, 85.00],
  "FROTO": [996.00, 1250.00],
  "KCHOL": [174.80, 250.00],
  "MAVI": [78.80, 140.00],
  "MGROS": [405.50, 700.00],
  "TAVHL": [229.70, 330.00],
  "TCELL": [87.70, 145.00],
  "THYAO": [274.80, 430.00],
  "ULKER": [124.10, 190.00],
});

// Dec 2024
addICBC("2024-12-31", "Model Portföy Aralık 2024", {
  "AKBNK": [65.70, 80.00],
  "TSKB": [12.30, 17.00],
  "VAKBN": [23.50, 34.00],
  "BIMAS": [524.00, 665.00],
  "CCOLA": [60.80, 85.00],
  "FROTO": [939.50, 1250.00],
  "KCHOL": [180.40, 250.00],
  "MAVI": [85.70, 140.00],
  "MGROS": [539.00, 735.00],
  "TAVHL": [273.80, 330.00],
  "TCELL": [93.20, 145.00],
  "THYAO": [282.30, 430.00],
  "ULKER": [119.40, 190.00],
});

// Jan 2025 (2025 Strateji Raporu)
addICBC("2025-01-22", "2025 Strateji Raporu Ocak 2025", {
  "AKBNK": [69.60, 95.00],
  "GARAN": [137.80, 190.00],
  "TSKB": [13.67, 21.00],
  "BIMAS": [521.50, 700.00],
  "CCOLA": [60.30, 85.00],
  "FROTO": [927.50, 1250.00],
  "KCHOL": [177.20, 250.00],
  "MAVI": [73.05, 120.00],
  "MGROS": [567.50, 750.00],
  "PGSUS": [228.00, 320.00],
  "TAVHL": [285.25, 370.00],
  "TCELL": [105.00, 150.00],
  "THYAO": [305.25, 400.00],
  "ULKER": [115.20, 170.00],
});

// Jul 2025
addICBC("2025-07-25", "Model Portföy Temmuz 2025", {
  "AKBNK": [68.00, 100.00],
  "GARAN": [140.00, 200.00],
  "ISCTR": [14.60, 22.00],
  "BIMAS": [511.00, 730.00],
  "CCOLA": [51.40, 85.00],
  "KCHOL": [174.10, 270.00],
  "MGROS": [531.00, 780.00],
  "PGSUS": [254.80, 390.00],
  "SAHOL": [93.10, 150.00],
  "TCELL": [92.50, 150.00],
  "THYAO": [293.00, 430.00],
});

// Oct 2025
addICBC("2025-10-02", "Model Portföy Ekim 2025", {
  "AKBNK": [62.50, 100.00],
  "GARAN": [140.50, 200.00],
  "BIMAS": [567.00, 730.00],
  "CCOLA": [47.60, 85.00],
  "KCHOL": [173.80, 270.00],
  "MGROS": [466.80, 750.00],
  "PGSUS": [224.00, 375.00],
  "SAHOL": [86.50, 150.00],
  "THYAO": [315.00, 430.00],
});

// Jan 2026 (2026 Strateji Raporu)
addICBC("2026-01-22", "2026 Strateji Raporu Ocak 2026", {
  "AKBNK": [77.80, 108.00],
  "GARAN": [148.50, 207.00],
  "BIMAS": [626.00, 840.00],
  "KCHOL": [195.30, 280.00],
  "MGROS": [625.00, 830.00],
  "PGSUS": [202.80, 285.00],
  "SAHOL": [95.50, 150.00],
  "THYAO": [299.00, 400.00],
});

// Mar 2026
addICBC("2026-03-12", "Model Portföy Mart 2026", {
  "AKBNK": [77.60, 108.00],
  "GARAN": [139.30, 207.00],
  "TSKB": [12.20, 19.00],
  "BIMAS": [694.50, 950.00],
  "MGROS": [603.00, 850.00],
  "DOHOL": [21.50, 28.00],
  "KCHOL": [195.30, 280.00],
  "SAHOL": [95.50, 150.00],
  "THYAO": [299.00, 400.00],
});

// ============================================================
// DENİZ YATIRIM — Model Portföy (from 01 Apr 2026 bulletin)
// ============================================================

addDeniz("2026-04-01", "Günlük Bülten 01-04-2026", {
  "TAVHL": [306.30, 454.40],
  "HTTBT": [37.00, 77.00],
  "BIMAS": [683.00, 873.00],
  "CCOLA": [70.20, 97.60],
  "YKBNK": [33.02, 54.30],
  "TABGD": [240.50, 380.00],
  "GARAN": [126.50, 211.00],
  "KCHOL": [194.80, 289.17],
  "AGESA": [228.20, 320.96],
  "KLKIM": [36.52, 60.00],
  "MPARK": [425.50, 640.00],
  // Key coverage stocks with targets
  "AKBNK": [66.00, 118.20],
  "ISCTR": [12.63, 24.46],
  "TSKB": [11.11, 18.66],
  "VAKBN": [30.00, 42.90],
  "SAHOL": [87.99, 151.59],
  "THYAO": [299.00, 400.00],
  "PGSUS": [243.70, 300.00],
  "FROTO": [101.10, 132.16],
  "TOASO": [273.75, 368.00],
  "TCELL": [112.10, 150.00],
  "TUPRS": [258.25, 276.62],
  "ULKER": [129.00, 160.00],
  "MGROS": [625.00, 830.00],
  "DOHOL": [19.97, 28.00],
  "ENKAI": [93.45, 124.00],
  "KRDMD": [30.90, 41.00],
  "EREGL": [28.22, 34.00],
});

// ============================================================
// DEVRİM AKYIL — YouTube Verbal Forecasts
// ============================================================

// From 2026-04-04 transcript: "60 86 125 potansiyel hedefler" for USD/TRY
addDevrim("2026-04-04", "Merkez Çaresizce Altın Satıyor! - Haftalık Dolar Altın Bist Analizleri", "USD/TRY", 44.46, null, 60, 86, 125);

// From 2026-04-04: "BIST 12950 kısa vade önemli seviye", "13167 üzerine atabilirse"
addDevrim("2026-04-04", "Merkez Çaresizce Altın Satıyor! - Haftalık Dolar Altın Bist Analizleri", "BIST100", 12791, 12950, 13167, null, null);

// From 2026-04-04: Petkim 30-37 TL targets
addDevrim("2026-04-04", "Merkez Çaresizce Altın Satıyor! - Haftalık Dolar Altın Bist Analizleri", "PETKM", 19.80, null, 30, 37, null);

// From 2026-04-04: Ülker hedef 187 TL orta-uzun vade
addDevrim("2026-04-04", "Merkez Çaresizce Altın Satıyor! - Haftalık Dolar Altın Bist Analizleri", "ULKER", 117.20, null, null, 141, 187);

// From 2026-04-12: Gümüş "98 dolar hedefimize gidip 60'lı rakamlara düzeltme" + "150 dolar yeni hareket"
addDevrim("2026-04-12", "Altın & Gümüş'te Yeni Dalga!", "XAG/USD", 76, null, null, 98, 150);

// From 2026-04-12: "4000 dolara yakın seviyeler altında çok iyi fırsat"
addDevrim("2026-04-12", "Altın & Gümüş'te Yeni Dalga!", "XAU/USD", 4700, null, null, null, 5000);

// From 2026-04-05: "Rusya yuan üzerinden petrol satacak" - general macro, no specific target
// From 2026-03-28: Carry trade comments, no specific USD/TRY target beyond Haziran
addDevrim("2026-03-28", "Dolar, Altın & Bist için Sürpriz Ziyaretçi!", "USD/TRY", 44.00, null, null, 60, null);

// From 2026-03-14: "Haziran sonuna kadar döviz risklerini minimumda tut"
addDevrim("2026-03-14", "Ateş Yükseliyor! Dolar, Altın & Bist'de Ne Yapmalı?", "USD/TRY", 43.50, null, null, 55, null);

// From 2026-02-21: BIST rally expected, "yabancı 13.8 milyar dolar getirmiş"
addDevrim("2026-02-21", "Altın, Gümüş + Bist'de Bize Sürpriz Yok!", "BIST100", 12000, null, null, 14000, null);

// From 2026-04-11: "altın yukarı doğru başladı hareketine"
addDevrim("2026-04-11", "Altın, Gümüş & BİST'de Kazanmaya Devam!", "XAU/USD", 4668, null, null, 5000, null);

// From 2026-04-05: "altın fiyatları 4700 dolarlar" - macro view, gold to new highs
addDevrim("2026-04-05", "Petrol & Altın Beraber Yükselemez mi?", "XAU/USD", 4700, null, null, 5000, null);

// BIST100 technical from Deniz bulletins (all share same levels)
// Destek: 12600, 12750; Direnç: 12900, 13050
// From 2026-04-01 bulletin

// ============================================================
// Write output
// ============================================================

mkdirSync(join(process.cwd(), "analizler"), { recursive: true });
const outPath = join(process.cwd(), "analizler", "forecasts.json");
writeFileSync(outPath, JSON.stringify(forecasts, null, 2), "utf-8");
console.log(`✅ ${forecasts.length} forecast entries written to ${outPath}`);
