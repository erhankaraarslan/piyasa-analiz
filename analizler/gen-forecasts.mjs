import { writeFileSync } from 'fs';

const result = [];

// ===================== DANSKE BANK =====================
const danskeReports = [
  { date: "2025-06-23", name: "FX Forecast Update - NOK Remains Vulnerable" },
  { date: "2025-07-22", name: "FX Forecast Update - USD Rebound is Temporary" },
  { date: "2025-08-19", name: "FX Forecast Update - Still Negative on SEK and NOK" },
  { date: "2025-09-19", name: "FX Forecast Update - Rebound in Real Rates to Support USD Weigh on Scandies" },
  { date: "2025-10-21", name: "FX Forecast Update - Upward Pressure on EUR/DKK" },
  { date: "2025-11-18", name: "FX Forecast Update - USD to Weather AI Valuation Woes" },
  { date: "2025-12-19", name: "FX Forecast Update - Weaker USD GBP and NOK in 2026" },
  { date: "2026-01-19", name: "FX Forecast Update - Geopolitics Takes Centre Stage as 2026 Kicks Off" },
  { date: "2026-02-17", name: "FX Forecast Update - Lingering Scepticism Sustains Bearish Dollar Outlook" },
  { date: "2026-03-20", name: "FX Forecast Update - Energy Shock Steers Global Repricing" }
];

// [spot, f1m, f3m, f6m, f12m] for each pair per report
const danskeData = {
  "EUR/USD": [
    [1.15, 1.16, 1.18, 1.20, 1.22],
    [1.17, 1.17, 1.19, 1.21, 1.23],
    [1.17, 1.17, 1.19, 1.21, 1.23],
    [1.18, 1.17, 1.19, 1.21, 1.23],
    [1.16, 1.15, 1.18, 1.20, 1.22],
    [1.16, 1.15, 1.18, 1.20, 1.22],
    [1.17, 1.17, 1.19, 1.21, 1.23],
    [1.16, 1.17, 1.19, 1.21, 1.23],
    [1.19, 1.19, 1.21, 1.23, 1.25],
    [1.16, 1.13, 1.12, 1.17, 1.22]
  ],
  "EUR/JPY": [
    [169, 167, 168, 167, 165],
    [172, 173, 174, 173, 171],
    [172, 171, 170, 169, 170],
    [174, 171, 170, 169, 170],
    [null, null, null, null, null], // Not in summary; derive if needed
    [180, 178, 179, 179, 177],
    [184, 181, 181, 180, 178],
    [184, 184, 183, 183, 181],
    [182, 182, 182, 181, 179],
    [183, 180, 178, 170, 183]
  ],
  "EUR/GBP": [
    [0.86, 0.85, 0.86, 0.87, 0.87],
    [0.87, 0.87, 0.88, 0.89, 0.89],
    [0.86, 0.87, 0.88, 0.89, 0.89],
    [0.87, 0.87, 0.88, 0.89, 0.89],
    [0.87, 0.87, 0.88, 0.89, 0.89],
    [0.88, 0.88, 0.89, 0.90, 0.90],
    [0.88, 0.88, 0.89, 0.90, 0.90],
    [0.87, 0.87, 0.88, 0.89, 0.89],
    [0.87, 0.87, 0.88, 0.89, 0.89],
    [0.86, 0.86, 0.87, 0.88, 0.88]
  ],
  "EUR/CHF": [
    [0.94, 0.93, 0.92, 0.91, 0.91],
    [0.93, 0.93, 0.92, 0.91, 0.91],
    [0.94, 0.93, 0.92, 0.91, 0.91],
    [0.93, 0.93, 0.93, 0.91, 0.91],
    [null, 0.92, 0.92, 0.91, 0.91], // spot not in summary; from Forecast line context
    [0.92, 0.92, 0.92, 0.91, 0.91],
    [0.93, 0.92, 0.92, 0.91, 0.91],
    [0.93, 0.92, 0.92, 0.91, 0.91],
    [0.91, 0.91, 0.91, 0.90, 0.90],
    [0.91, 0.91, 0.91, 0.90, 0.90]
  ],
  "EUR/SEK": [
    [11.14, 11.10, 11.10, 11.20, 11.30],
    [11.21, 11.10, 11.20, 11.30, 11.40],
    [11.13, 11.10, 11.20, 11.30, 11.40],
    [11.03, 11.00, 11.20, 11.30, 11.40],
    [10.97, 11.00, 11.20, 11.30, 11.40],
    [11.00, 11.00, 11.20, 11.30, 11.40],
    [10.90, 10.90, 11.00, 11.10, 11.10],
    [10.73, 10.80, 10.90, 11.00, 11.00],
    [10.60, 10.70, 10.80, 11.00, 11.00],
    [10.75, 10.80, 10.80, 11.00, 11.00]
  ],
  "EUR/NOK": [
    [11.64, 11.70, 11.80, 12.00, 12.20],
    [11.88, 11.90, 12.00, 12.20, 12.40],
    [11.90, 12.00, 12.10, 12.30, 12.50],
    [11.66, 11.60, 11.70, 11.90, 12.10],
    [11.71, 11.70, 11.80, 12.00, 12.20],
    [11.75, 11.80, 11.90, 12.10, 12.30],
    [11.93, 11.90, 12.00, 12.20, 12.40],
    [11.73, 11.80, 11.90, 12.10, 12.30],
    [11.26, 11.30, 11.30, 11.60, 11.80],
    [10.99, 11.00, 11.00, 11.30, 11.50]
  ],
  "EUR/DKK": [
    [7.4594, 7.4600, 7.4575, 7.4550, 7.4550],
    [7.4650, 7.4600, 7.4575, 7.4550, 7.4550],
    [7.4643, 7.4600, 7.4575, 7.4550, 7.4550],
    [7.4641, 7.4600, 7.4575, 7.4550, 7.4550],
    [7.4685, 7.4675, 7.4625, 7.4575, 7.4550],
    [7.4685, 7.4625, 7.4600, 7.4575, 7.4550],
    [7.4712, 7.4650, 7.4600, 7.4575, 7.4550],
    [7.4719, 7.4700, 7.4650, 7.4600, 7.4550],
    [7.4708, 7.4700, 7.4650, 7.4600, 7.4550],
    [7.4713, 7.4725, 7.4675, 7.4625, 7.4600]
  ],
  "EUR/PLN": [
    [4.27, 4.30, 4.20, 4.10, 4.10],
    [4.26, 4.30, 4.20, 4.10, 4.10],
    [4.24, 4.30, 4.20, 4.10, 4.10],
    [4.26, 4.30, 4.20, 4.10, 4.10],
    [null, 4.30, 4.20, 4.10, 4.10], // spot not in EUR block for R5
    [4.24, 4.30, 4.20, 4.10, 4.10],
    [4.21, 4.20, 4.20, 4.10, 4.00],
    [4.23, 4.20, 4.20, 4.10, 4.00],
    [4.21, 4.20, 4.20, 4.10, 4.00],
    [4.27, 4.30, 4.20, 4.10, 4.00]
  ],
  "EUR/HUF": [
    [404, 400, 410, 420, 430],
    [399, 400, 410, 420, 430],
    [394, 400, 410, 420, 430],
    [389, 390, 400, 420, 420],
    [null, null, null, null, null], // Not in extracted summary
    [385, 390, 400, 410, 420],
    [387, 390, 400, 410, 410],
    [386, 390, 400, 410, 410],
    [377, 380, 380, 400, 400],
    [391, 390, 390, 400, 410]
  ],
  "EUR/CZK": [
    [24.8, 24.8, 24.8, 24.7, 24.6],
    [24.6, 24.7, 24.7, 24.5, 24.5],
    [24.5, 24.5, 24.5, 24.4, 24.4],
    [24.3, 24.3, 24.3, 24.2, 24.2],
    [null, null, null, null, null], // Not in extracted summary
    [24.2, 24.2, 24.2, 24.0, 24.0],
    [24.4, 24.4, 24.2, 24.1, 24.0],
    [24.3, 24.3, 24.2, 24.1, 24.0],
    [24.3, 24.3, 24.2, 24.1, 24.0],
    [24.5, 24.5, 24.4, 24.2, 24.0]
  ],
  "EUR/TRY": [
    [45.8, 46.7, 49.0, 52.0, 57.1],
    [47.3, 48.0, 50.2, 53.4, 58.7],
    [47.8, 48.6, 50.8, 54.0, 59.3],
    [48.8, 49.0, 51.4, 54.5, 59.9],
    [null, null, null, null, null], // Not in extracted summary
    [49.1, 49.5, 52.4, 55.9, 62.0],
    [50.2, 50.8, 53.4, 56.9, 63.1],
    [50.3, 51.4, 54.0, 57.5, 63.7],
    [51.8, 52.8, 55.5, 59.2, 65.6],
    [51.3, 51.0, 52.1, 57.1, 64.9]
  ],
  "EUR/CNY": [
    [8.27, 8.33, 8.45, 8.57, 8.69],
    [8.38, 8.40, 8.52, 8.64, 8.76],
    [8.38, 8.40, 8.52, 8.64, 8.76],
    [8.37, 8.33, 8.43, 8.53, 8.61],
    [null, null, null, null, null], // Not in extracted summary
    [8.25, 8.17, 8.35, 8.46, 8.54],
    [8.25, 8.24, 8.35, 8.47, 8.55],
    [8.09, 8.15, 8.27, 8.35, 8.36],
    [8.20, 8.19, 8.29, 8.36, 8.38],
    [7.97, 7.77, 7.67, 7.96, 8.17]
  ],
  "USD/JPY": [
    [147, 144, 142, 139, 135],
    [null, 148, 146, 143, 139], // spot from EUR/JPY/EUR/USD ≈ 172/1.17 ≈ 147
    [148, 146, 143, 140, 138],
    [null, 146, 143, 140, 138], // spot ≈ 174/1.18 ≈ 147.5
    [151, 148, 145, 142, 140],
    [null, 155, 152, 149, 145], // spot ≈ 180/1.16 ≈ 155.2
    [157, 155, 152, 149, 145],
    [158, 157, 154, 151, 147],
    [154, 153, 150, 147, 143],
    [158, 159, 159, 145, 150]
  ],
  "AUD/USD": [
    [0.64, 0.66, 0.67, 0.68, 0.69],
    [null, 0.66, 0.67, 0.68, 0.69], // spot ≈ 1.17/1.79 ≈ 0.654
    [0.65, 0.66, 0.67, 0.68, 0.69],
    [null, 0.66, 0.67, 0.68, 0.69], // spot from EUR data
    [0.65, 0.66, 0.67, 0.68, 0.69],
    [null, 0.66, 0.67, 0.68, 0.69], // spot ≈ 0.65
    [0.66, 0.66, 0.67, 0.68, 0.69],
    [0.67, 0.67, 0.68, 0.69, 0.70],
    [0.71, 0.71, 0.71, 0.72, 0.73],
    [0.71, 0.69, 0.69, 0.71, 0.73]
  ],
  "USD/CAD": [
    [1.38, 1.38, 1.39, 1.39, 1.40],
    [null, 1.37, 1.37, 1.38, 1.38], // spot ≈ 1.60/1.17 ≈ 1.368
    [1.38, 1.38, 1.38, 1.39, 1.39],
    [null, 1.38, 1.38, 1.39, 1.39],
    [1.40, 1.40, 1.41, 1.42, 1.42],
    [null, 1.41, 1.42, 1.43, 1.43],
    [1.38, 1.38, 1.38, 1.39, 1.39],
    [1.39, 1.39, 1.39, 1.40, 1.41],
    [1.36, 1.36, 1.36, 1.37, 1.38],
    [1.37, 1.38, 1.38, 1.39, 1.40]
  ],
  "USD/CNY": [
    [7.19, 7.18, 7.16, 7.14, 7.12],
    [null, 7.18, 7.16, 7.14, 7.12], // spot ≈ 8.38/1.17 ≈ 7.162
    [7.18, 7.18, 7.16, 7.14, 7.12],
    [null, 7.12, 7.08, 7.05, 7.0], // spot ≈ 8.37/1.18 ≈ 7.093
    [7.12, 7.12, 7.08, 7.05, 7.00],
    [null, 7.10, 7.08, 7.05, 7.00],
    [7.04, 7.04, 7.02, 7.00, 6.95],
    [6.97, 6.97, 6.95, 6.90, 6.80],
    [6.90, 6.88, 6.85, 6.80, 6.70],
    [6.88, 6.88, 6.85, 6.80, 6.70]
  ]
};

// Fill in derived spots where null
// R2 (idx 1): USD/JPY≈147, AUD≈0.654, CAD≈1.368, CNY≈7.162
danskeData["USD/JPY"][1][0] = 147;
danskeData["AUD/USD"][1][0] = 0.65;
danskeData["USD/CAD"][1][0] = 1.37;
danskeData["USD/CNY"][1][0] = 7.16;
// R4 (idx 3): USD/JPY≈147.5, AUD, CAD, CNY
danskeData["USD/JPY"][3][0] = 148;
danskeData["AUD/USD"][3][0] = 0.65;
danskeData["USD/CAD"][3][0] = 1.38;
danskeData["USD/CNY"][3][0] = 7.09;
// R6 (idx 5): USD/JPY≈155, AUD≈0.65, CAD, CNY
danskeData["USD/JPY"][5][0] = 155;
danskeData["AUD/USD"][5][0] = 0.65;
danskeData["USD/CAD"][5][0] = 1.40;
danskeData["USD/CNY"][5][0] = 7.11;
// R5 (idx 4): fix EUR/CHF, EUR/PLN spots from summary table
danskeData["EUR/CHF"][4][0] = 0.92;
danskeData["EUR/PLN"][4][0] = 4.25;

for (const [pair, reportData] of Object.entries(danskeData)) {
  for (let i = 0; i < danskeReports.length; i++) {
    const d = reportData[i];
    if (!d || d.every(v => v === null)) continue;
    result.push({
      date: danskeReports[i].date,
      pair,
      spot: d[0],
      forecast1m: d[1],
      forecast3m: d[2],
      forecast6m: d[3],
      forecast12m: d[4],
      consensus1m: null, consensus3m: null, consensus6m: null, consensus12m: null,
      forward1m: null, forward3m: null, forward6m: null, forward12m: null,
      institution: "Danske Bank",
      documentName: danskeReports[i].name
    });
  }
}

// ===================== ICBC YATIRIM =====================
const icbcReports = [
  { date: "2023-08-28", name: "Model Portföy Ağustos 2023", stocks: {
    "AEFES.IS":[102.60,130.00],"CCOLA.IS":[375.20,420.00],"FROTO.IS":[860.20,1200.00],
    "ISCTR.IS":[18.68,24.00],"MGROS.IS":[339.30,400.00],"PGSUS.IS":[851.60,1150.00],
    "TAVHL.IS":[121.00,170.00],"THYAO.IS":[238.00,300.00],"TOASO.IS":[266.80,330.00]
  }},
  { date: "2023-09-18", name: "Model Portföy Eylül 2023", stocks: {
    "AKBNK.IS":[28.50,43.00],"YKBNK.IS":[15.90,24.00],"AEFES.IS":[99.70,130.00],
    "BIMAS.IS":[268.00,350.00],"CCOLA.IS":[373.50,470.00],"FROTO.IS":[847.00,1200.00],
    "MGROS.IS":[366.20,450.00],"PGSUS.IS":[758.40,1150.00],"TAVHL.IS":[107.40,170.00],
    "THYAO.IS":[218.10,300.00],"TOASO.IS":[282.00,360.00]
  }},
  { date: "2023-10-02", name: "Model Portföy Ekim 2023", stocks: {
    "AKBNK.IS":[34.50,43.00],"YKBNK.IS":[18.70,24.00],"BIMAS.IS":[291.50,380.00],
    "CCOLA.IS":[399.20,550.00],"FROTO.IS":[848.20,1250.00],"MAVI.IS":[115.00,160.00],
    "MGROS.IS":[381.00,500.00],"PGSUS.IS":[843.00,1200.00],"TCELL.IS":[54.20,75.00],
    "THYAO.IS":[253.40,330.00]
  }},
  { date: "2023-10-16", name: "Model Portföy Ekim 2023-2", stocks: {
    "AKBNK.IS":[31.60,43.00],"YKBNK.IS":[18.70,24.00],"AEFES.IS":[102.40,140.00],
    "BIMAS.IS":[319.70,380.00],"CCOLA.IS":[353.80,550.00],"FROTO.IS":[878.10,1250.00],
    "MAVI.IS":[101.30,160.00],"MGROS.IS":[365.60,500.00],"PGSUS.IS":[726.00,1200.00],
    "TCELL.IS":[51.50,75.00],"THYAO.IS":[223.00,330.00]
  }},
  { date: "2024-06-25", name: "Model Portföy Güncelleme Haziran 2024", stocks: {
    "AKBNK.IS":[65.20,85.00],"ISCTR.IS":[16.30,22.00],"VAKBN.IS":[23.80,32.00],
    "AEFES.IS":[234.40,300.00],"BIMAS.IS":[570.50,720.00],"CCOLA.IS":[796.50,1100.00],
    "FROTO.IS":[1119.00,1450.00],"KCHOL.IS":[218.60,300.00],"MAVI.IS":[118.70,160.00],
    "MGROS.IS":[542.50,680.00],"TCELL.IS":[100.20,165.00],"THYAO.IS":[305.80,420.00],
    "GARAN.IS":[113.10,140.00],"HALKB.IS":[18.94,22.00],"TSKB.IS":[12.24,15.00],
    "YKBNK.IS":[33.58,42.00],"ARCLK.IS":[173.70,200.00],"PGSUS.IS":[235.40,280.00],
    "TAVHL.IS":[255.00,300.00],"TOASO.IS":[343.00,400.00],"SOKM.IS":[63.90,75.00],
    "TTKOM.IS":[49.50,65.00],"ULKER.IS":[169.00,200.00]
  }},
  { date: "2024-10-22", name: "Model Portföy Güncelleme Ekim 2024", stocks: {
    "AKBNK.IS":[49.90,80.00],"TSKB.IS":[11.57,17.00],"VAKBN.IS":[21.40,34.00],
    "AEFES.IS":[183.00,270.00],"BIMAS.IS":[460.50,665.00],"CCOLA.IS":[50.40,85.00],
    "FROTO.IS":[996.00,1250.00],"KCHOL.IS":[174.80,250.00],"MAVI.IS":[78.80,140.00],
    "MGROS.IS":[405.50,700.00],"TAVHL.IS":[229.70,330.00],"TCELL.IS":[87.70,145.00],
    "THYAO.IS":[274.75,430.00],"ULKER.IS":[124.10,190.00],
    "GARAN.IS":[111.70,165.00],"HALKB.IS":[15.64,21.00],"ISCTR.IS":[11.61,17.00],
    "YKBNK.IS":[24.54,35.00],"ARCLK.IS":[140.20,180.00],"PGSUS.IS":[243.70,300.00],
    "TOASO.IS":[195.20,250.00],"SOKM.IS":[40.16,50.00],"TTKOM.IS":[46.64,70.00]
  }},
  { date: "2024-12-30", name: "Model Portföy Güncelleme Aralık 2024", stocks: {
    "AKBNK.IS":[65.70,80.00],"TSKB.IS":[12.30,17.00],"VAKBN.IS":[23.50,34.00],
    "BIMAS.IS":[524.00,665.00],"CCOLA.IS":[60.80,85.00],"FROTO.IS":[939.50,1250.00],
    "KCHOL.IS":[180.40,250.00],"MAVI.IS":[85.70,140.00],"MGROS.IS":[539.00,735.00],
    "TAVHL.IS":[273.80,330.00],"TCELL.IS":[93.20,145.00],"THYAO.IS":[282.30,430.00],
    "ULKER.IS":[119.40,190.00]
  }},
  { date: "2025-01-22", name: "2025 Strateji Raporu Ocak 2025", stocks: {
    "AKBNK.IS":[69.60,95.00],"GARAN.IS":[137.80,190.00],"TSKB.IS":[13.70,21.00],
    "BIMAS.IS":[521.50,700.00],"CCOLA.IS":[60.30,85.00],"FROTO.IS":[927.50,1250.00],
    "KCHOL.IS":[177.20,250.00],"MAVI.IS":[73.10,120.00],"MGROS.IS":[567.50,750.00],
    "PGSUS.IS":[228.00,320.00],"TAVHL.IS":[285.30,370.00],"TCELL.IS":[105.00,150.00],
    "THYAO.IS":[305.30,400.00],"ULKER.IS":[115.20,170.00],
    "HALKB.IS":[null,24.00],"ISCTR.IS":[null,20.00],"VAKBN.IS":[null,35.00],
    "YKBNK.IS":[null,43.00],"ARCLK.IS":[null,160.00],"TOASO.IS":[null,270.00],
    "SOKM.IS":[null,50.00],"TTKOM.IS":[null,67.00]
  }},
  { date: "2025-07-25", name: "Model Portföy Güncelleme Temmuz 2025", stocks: {
    "AKBNK.IS":[68.00,100.00],"GARAN.IS":[140.00,200.00],"ISCTR.IS":[14.60,22.00],
    "BIMAS.IS":[511.00,730.00],"CCOLA.IS":[51.40,85.00],"KCHOL.IS":[174.10,270.00],
    "MGROS.IS":[531.00,780.00],"PGSUS.IS":[254.80,390.00],"SAHOL.IS":[93.10,150.00],
    "TCELL.IS":[92.50,150.00],"THYAO.IS":[293.00,430.00]
  }},
  { date: "2025-10-02", name: "Model Portföy Güncelleme Ekim 2025", stocks: {
    "AKBNK.IS":[62.50,100.00],"GARAN.IS":[140.50,200.00],"BIMAS.IS":[567.00,730.00],
    "CCOLA.IS":[47.60,85.00],"KCHOL.IS":[173.80,270.00],"MGROS.IS":[466.80,750.00],
    "PGSUS.IS":[224.00,375.00],"SAHOL.IS":[86.50,150.00],"THYAO.IS":[315.00,430.00]
  }},
  { date: "2026-01-22", name: "2026 Strateji Raporu Ocak 2026", stocks: {
    "AKBNK.IS":[77.80,108.00],"GARAN.IS":[148.50,207.00],"BIMAS.IS":[626.00,840.00],
    "KCHOL.IS":[195.30,280.00],"MGROS.IS":[625.00,830.00],"PGSUS.IS":[202.80,285.00],
    "SAHOL.IS":[95.50,150.00],"THYAO.IS":[299.00,400.00],
    "HALKB.IS":[null,50.00],"ISCTR.IS":[null,20.00],"TSKB.IS":[null,19.00],
    "VAKBN.IS":[null,45.00],"YKBNK.IS":[null,48.00],"FROTO.IS":[null,130.00],
    "TOASO.IS":[null,350.00],"TAVHL.IS":[null,400.00],"ARCLK.IS":[null,140.00],
    "DOHOL.IS":[null,24.00],"AEFES.IS":[null,21.00],"CCOLA.IS":[null,85.00],
    "ULKER.IS":[null,160.00],"MAVI.IS":[null,55.00],"SOKM.IS":[null,70.00],
    "TCELL.IS":[null,150.00],"TTKOM.IS":[null,85.00]
  }},
  { date: "2026-03-11", name: "Model Portföy Güncelleme Mart 2026", stocks: {
    "AKBNK.IS":[77.60,108.00],"GARAN.IS":[139.30,207.00],"TSKB.IS":[12.20,19.00],
    "BIMAS.IS":[694.50,950.00],"MGROS.IS":[603.00,850.00],"DOHOL.IS":[21.50,28.00],
    "KCHOL.IS":[192.30,285.00],"SAHOL.IS":[96.00,150.00],"THYAO.IS":[294.80,400.00]
  }}
];

for (const r of icbcReports) {
  for (const [ticker, [spot, target]] of Object.entries(r.stocks)) {
    if (target === null) continue; // skip GG
    result.push({
      date: r.date,
      pair: ticker,
      spot,
      forecast1m: null, forecast3m: null, forecast6m: null,
      forecast12m: target,
      consensus1m: null, consensus3m: null, consensus6m: null, consensus12m: null,
      forward1m: null, forward3m: null, forward6m: null, forward12m: null,
      institution: "ICBC Yatırım",
      documentName: r.name
    });
  }
}

// ===================== YOUTUBE TRANSCRIPTS (VERBAL FORECASTS) =====================
// Only specific numerical forecasts from Devrim Akyıl transcripts

const transcriptForecasts = [
  // Silver forecasts
  { date: "2026-02-15", pair: "XAG/USD", spot: 32.5, f3m: 98, name: "Altın Gümüş'te Yeni Zırvalıklar" },
  // Gold forecasts
  { date: "2026-03-21", pair: "XAU/USD", spot: 4500, f3m: null, f6m: null, f12m: 5000, name: "Altın Gümüş Düşüşüne Ağlamalı Mıyız?" },
  // BIST direction with level
  { date: "2026-03-14", pair: "XU100.IS", spot: null, f3m: null, f6m: null, f12m: null, name: "Ateş Yükseliyor - Dolar Altın BIST'te Ne Yapmalı?" },
  // Silver support level as forecast
  { date: "2026-03-22", pair: "XAG/USD", spot: 65, f1m: null, f3m: 73, name: "Altın Gümüş Dip Neresi?" },
  // Gold 4000 support and rebound forecast
  { date: "2026-03-29", pair: "XAU/USD", spot: 4100, f3m: 4500, name: "Altın Gümüş Fırsat Penceresi Devam" },
  // Silver recovery
  { date: "2026-04-11", pair: "XAG/USD", spot: 73, f3m: 90, name: "Altın Gümüş Bİ-ST'te Kazanmaya Devam" },
  // Gold new highs
  { date: "2026-04-12", pair: "XAU/USD", spot: 4600, f3m: 5000, name: "Altın Gümüş'te Yeni Dalga" },
];

for (const t of transcriptForecasts) {
  result.push({
    date: t.date,
    pair: t.pair,
    spot: t.spot,
    forecast1m: t.f1m || null,
    forecast3m: t.f3m || null,
    forecast6m: t.f6m || null,
    forecast12m: t.f12m || null,
    consensus1m: null, consensus3m: null, consensus6m: null, consensus12m: null,
    forward1m: null, forward3m: null, forward6m: null, forward12m: null,
    institution: "Devrim Akyıl",
    documentName: t.name
  });
}

writeFileSync('analizler/forecasts.json', JSON.stringify(result, null, 2), 'utf-8');
console.log(`Generated ${result.length} forecast entries.`);
console.log(`  Danske Bank: ${result.filter(r => r.institution === "Danske Bank").length}`);
console.log(`  ICBC Yatırım: ${result.filter(r => r.institution === "ICBC Yatırım").length}`);
console.log(`  Devrim Akyıl: ${result.filter(r => r.institution === "Devrim Akyıl").length}`);
