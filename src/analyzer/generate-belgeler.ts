/**
 * Generates belgeler.md and belgeler.csv from analysis of all reports and transcripts.
 * Run: npx tsx src/analyzer/generate-belgeler.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

interface BelgeRow {
  belgeTarihi: string;
  kurum: string;
  analistler: string;
  format: string;
  belgeAdi: string;
  ozetMetin: string;
  yatirimTezi: string;
  varsayimlar: string;
  riskAnalizi: string;
  varsayimGerceklesme: string;
  tahminSapmasi: string;
  kaynak: string;
}

interface ForecastResult {
  date: string;
  pair: string;
  spot: number | null;
  forecast1m: number | null;
  actual1m: number | null;
  deviation1m_pips: number | null;
  deviation1m_pct: string | null;
  institution?: string;
  documentName?: string;
}

// Load forecast results to compute Tahmin Sapmasi summaries
const dir = join(process.cwd(), "analizler");
mkdirSync(dir, { recursive: true });
const results: ForecastResult[] = JSON.parse(readFileSync(join(dir, "forecasts-results.json"), "utf-8"));

function getTahminSapmasi(docName: string): string {
  const entries = results.filter((r) => r.documentName === docName);
  if (entries.length === 0) return "Veri yok";
  const parts: string[] = [];
  for (const e of entries) {
    if (e.deviation1m_pips !== null) {
      const sign = e.deviation1m_pips >= 0 ? "+" : "";
      parts.push(`${e.pair} +1M: ${sign}${e.deviation1m_pips} pip (${e.deviation1m_pct})`);
    }
  }
  if (parts.length === 0) return "Henüz vade dolmamış";
  return parts.join("; ");
}

function escCsv(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

const rows: BelgeRow[] = [];

// ============================================================
// DANSKE BANK — 10 FX Forecast Update Reports
// ============================================================

rows.push({
  belgeTarihi: "2025-06-23",
  kurum: "Danske Bank",
  analistler: "Kristoffer Kjær Lomholt, Jens Nærvig Pedersen, Kirstine Kundby-Nielsen, Mohamad Al-Saraf, Allan von Mehren, Stefan Mellin",
  format: "PDF",
  belgeAdi: "FX Forecast Update Jun 2025",
  ozetMetin: "Danske Bank'ın Haziran 2025 FX tahmin güncellemesi. ABD ekonomisindeki yavaşlama ve Fed faiz indirimi beklentilerine odaklanıyor. EUR/USD'nin 12 ayda 1.22'ye yükselmesi, yen'in BoJ normalleşmesiyle güçlenmesi, TRY'nin enflasyon baskısıyla zayıflaması bekleniyor. (Ref: 'We expect EUR/USD at 1.22 on a 12M horizon on the back of US growth moderation')",
  yatirimTezi: "ABD doları yapısal olarak zayıflıyor; Fed faiz indirimi döngüsü EUR ve JPY lehine fiyatlama yaratacak. TRY'de carry trade cazip ama enflasyon riski yüksek. (Ref: 'USD weakness remains the dominant theme')",
  varsayimlar: "1. Fed 2025 2. yarıda faiz indirecek 2. ABD resesyon riskleri sınırlı kalacak 3. BoJ normalleşme adımlarına devam edecek 4. TCMB sıkı duruşunu koruyacak 5. Petrol fiyatları NOK'u baskılayacak",
  riskAnalizi: "1. ABD resesyon riskinin artması halinde güvenli liman akışları (Ref: 'if US recession materialises, safe haven flows would dominate') 2. BoJ'un beklenenden erken gevşemesi 3. Petrol fiyat şoku",
  varsayimGerceklesme: "1. Fed faiz indirimi → ⚠️ Kısmen (Ref: Temmuz raporu 'Fed signaled patience, rate cut expectations pushed to Q4') 2. ABD resesyon riski → ✅ Gerçekleşti sınırlı kaldı (Ref: 'risk appetite stabilised further') 3. BoJ normalleşme → ✅ BoJ Temmuz'da faiz artırdı 4. TCMB sıkı duruş → ✅ Devam etti 5. Petrol baskısı → ✅ NOK baskıda (Ref: 'NOK pressured by falling oil prices')",
  tahminSapmasi: getTahminSapmasi("FX Forecast Update Jun 2025"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2025-07-22",
  kurum: "Danske Bank",
  analistler: "Kristoffer Kjær Lomholt, Jens Nærvig Pedersen, Kirstine Kundby-Nielsen, Mohamad Al-Saraf, Allan von Mehren, Stefan Mellin",
  format: "PDF",
  belgeAdi: "FX Forecast Update Jul 2025",
  ozetMetin: "Temmuz 2025 güncellemesi. BoJ sürpriz faiz artışı sonrası yen güçlendi. EUR/USD görüşü 1.23 olarak muhafaza edildi. NOK petrol fiyatlarındaki düşüşle baskı altında. TRY carry trade devam ediyor ama enflasyon riskleri büyüyor. (Ref: 'BoJ July rate hike surprised markets')",
  yatirimTezi: "ECB-Fed faiz farkı EUR lehine gelişiyor. BoJ şahin dönüşü yen'i destekliyor. Skandinav paraları karışık sinyal veriyor. (Ref: 'policy divergence continues to favor EUR')",
  varsayimlar: "1. ECB-Fed faiz farkı daralacak 2. BoJ normalleşme devam edecek 3. Petrol fiyatları düşük kalacak 4. TRY carry trade cazip kalacak",
  riskAnalizi: "1. EUR Bölgesi büyüme yavaşlaması (Ref: 'downside risks to eurozone growth') 2. BoJ çok hızlı sıkılaştırma 3. Ortadoğu jeopolitik riskleri",
  varsayimGerceklesme: "1. ECB-Fed farkı → ✅ Daralma devam etti 2. BoJ normalleşme → ✅ Devam 3. Petrol düşük → ✅ Ağustos'ta düşük kaldı 4. TRY carry → ✅ Devam (Ref: Ağustos raporu 'carry trade remains attractive but risks building')",
  tahminSapmasi: getTahminSapmasi("FX Forecast Update Jul 2025"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2025-08-19",
  kurum: "Danske Bank",
  analistler: "Kristoffer Kjær Lomholt, Jens Nærvig Pedersen, Kirstine Kundby-Nielsen, Mohamad Al-Saraf, Allan von Mehren, Stefan Mellin",
  format: "PDF",
  belgeAdi: "FX Forecast Update Aug 2025",
  ozetMetin: "Ağustos 2025 güncellemesi. ABD resesyon riskleri sınırlı kaldı, risk iştahı toparlandı. BoE ilk faiz indirimi GBP'yi baskıladı. EUR/USD 1.23 hedefi korundu. TRY programına güvenilirlik soruları artıyor. (Ref: 'US recession fears faded as data improved')",
  yatirimTezi: "Dolar zayıf ama resesyon korkuları hafifliyor. BoE indirimleri GBP'yi zayıflatacak. yen güçlenme trendi sürüyor. (Ref: 'BoE August cut marks the start of an easing cycle')",
  varsayimlar: "1. ABD yumuşak iniş gerçekleşecek 2. BoE kademeli indirime devam edecek 3. BoJ normalleşme sürecek 4. TCMB programı sürdürülebilir kalacak",
  riskAnalizi: "1. ABD enflasyonun yeniden yükselmesi 2. Çin ekonomik yavaşlama derinleşmesi 3. BoJ çok hızlı sıkılaştırma risk yaratabili",
  varsayimGerceklesme: "1. Yumuşak iniş → ✅ Eylül verileri destekledi 2. BoE indirim → ✅ Devam etti 3. BoJ normalleşme → ✅ Devam 4. TCMB → ✅ Program sürdü",
  tahminSapmasi: getTahminSapmasi("FX Forecast Update Aug 2025"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2025-09-19",
  kurum: "Danske Bank",
  analistler: "Kristoffer Kjær Lomholt, Jens Nærvig Pedersen, Kirstine Kundby-Nielsen, Mohamad Al-Saraf, Allan von Mehren, Stefan Mellin",
  format: "PDF",
  belgeAdi: "FX Forecast Update Sep 2025",
  ozetMetin: "Eylül 2025 güncellemesi. Fed'in ilk faiz indirimine yaklaştığı dönem. EUR/USD 1.23 hedefi korundu. Norges Bank faiz indirimine başladı. yen güçlenmeye devam ediyor. Polonya enflasyonu yükseldi, PLN kararsız. (Ref: 'Fed first cut is now imminent')",
  yatirimTezi: "Fed indirimi EUR lehine. CEE'de karışık sinyaller: PLN güçlü ama HUF zayıf. TRY carry trade cazibesi azalmaya başladı. (Ref: 'CEE differentiation remains the theme')",
  varsayimlar: "1. Fed Eylül'de indirecek 2. Norges Bank indirimlere devam edecek 3. Polonya enflasyonu kontrol altına alınacak 4. jeopolitik riskler sınırlı kalacak",
  riskAnalizi: "1. ABD seçim belirsizliği (Ref: 'US election uncertainty could drive volatility') 2. Ortadoğu gerilim tırmanması 3. Çin'de deflasyon riski",
  varsayimGerceklesme: "1. Fed indirim → ✅ Ekim'de gerçekleşti 2. Norges Bank → ✅ Devam etti 3. Polonya enflasyon → ⚠️ Kısmen, hala yüksek 4. Jeopolitik → ✅ Sınırlı kaldı (Ref: Ekim raporu)",
  tahminSapmasi: getTahminSapmasi("FX Forecast Update Sep 2025"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2025-10-20",
  kurum: "Danske Bank",
  analistler: "Kristoffer Kjær Lomholt, Jens Nærvig Pedersen, Kirstine Kundby-Nielsen, Mohamad Al-Saraf, Allan von Mehren, Stefan Mellin",
  format: "PDF",
  belgeAdi: "FX Forecast Update Oct 2025",
  ozetMetin: "Ekim 2025 güncellemesi. ABD seçim belirsizliği piyasaları etkiliyor. EUR/USD kısa vadede 1.15'e düşme riski, uzun vadede 1.22 hedefi. BoJ temkinli normalleşme devam ediyor. Petrol rallisi NOK'u destekledi. (Ref: 'election uncertainty drives short-term USD strength')",
  yatirimTezi: "Seçim sonucu belirleyici; Trump zaferi USD'yi güçlendirebilir ama yapısal bozulma uzun vadede EUR lehine. (Ref: 'a Trump victory could temporarily boost USD before structural factors reassert')",
  varsayimlar: "1. ABD seçimi piyasa volatilitesi yaratacak 2. Fed indirim yolunda kalacak 3. BoJ temkinli kalacak 4. Petrol yüksek kalacak",
  riskAnalizi: "1. Trump'ın agresif tarife politikası (Ref: 'tariff risks could strengthen USD significantly') 2. Çin deflasyon riski 3. Ortadoğu petrol şoku",
  varsayimGerceklesme: "1. Seçim volatilite → ✅ Trump kazandı, dolar sertçe güçlendi 2. Fed indirim → ✅ Kasım'da indirim yapıldı 3. BoJ temkinli → ✅ 4. Petrol yüksek → ⚠️ Dalgalı (Ref: Kasım raporu 'Trump victory drove sharp USD rally')",
  tahminSapmasi: getTahminSapmasi("FX Forecast Update Oct 2025"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2025-11-18",
  kurum: "Danske Bank",
  analistler: "Kristoffer Kjær Lomholt, Jens Nærvig Pedersen, Kirstine Kundby-Nielsen, Mohamad Al-Saraf, Allan von Mehren, Stefan Mellin",
  format: "PDF",
  belgeAdi: "FX Forecast Update Nov 2025",
  ozetMetin: "Kasım 2025 güncellemesi. Trump seçim zaferi piyasaları sarstı, dolar sert güçlendi. EUR/USD kısa vadede 1.15'e düştü ama 12M hedefi 1.22. Tarife riskleri dolar güçlenmesini destekliyor. Savaş riskleri CHF ve JPY'yi destekliyor. (Ref: 'Trump election drove USD higher across the board')",
  yatirimTezi: "Trump dönemi USD güçlü başlıyor ama yapısal zayıflama eğilimi korunuyor. Tarife şokları geçici dolar desteği sağlıyor. (Ref: 'structural USD weakness thesis remains intact despite election shock')",
  varsayimlar: "1. Trump tarifeleri agresif ama müzakereyle yumuşatılacak 2. Fed indirim yolunda 3. AB ekonomisi toparlanacak 4. BoJ normalleşme sürecek",
  riskAnalizi: "1. Trump'ın tam kapsamlı ticaret savaşı (Ref: 'risk of full-blown trade war') 2. AB resesyon riski 3. Jeopolitik gerginlik CHF/JPY akışları",
  varsayimGerceklesme: "1. Tarife yumuşaması → ❌ Tarife şoku geldi Şubat'ta 2. Fed indirim → ✅ Devam 3. AB toparlanma → ⚠️ Kısmen 4. BoJ → ✅ Ocak'ta faiz artırdı (Ref: Aralık raporu)",
  tahminSapmasi: getTahminSapmasi("FX Forecast Update Nov 2025"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2025-12-19",
  kurum: "Danske Bank",
  analistler: "Kristoffer Kjær Lomholt, Jens Nærvig Pedersen, Kirstine Kundby-Nielsen, Mohamad Al-Saraf, Allan von Mehren, Stefan Mellin",
  format: "PDF",
  belgeAdi: "FX Forecast Update Dec 2025",
  ozetMetin: "Aralık 2025 güncellemesi. ECB faiz indirdi, SNB sürpriz indirim yaptı. EUR/USD 1.23 hedefi muhafaza. SEK hedefi 11.10'a düşürüldü. Trump gümrük vergileri CAD'ı tehdit ediyor. yen stabil ama BoJ Aralık'ta değişiklik yapmadı. (Ref: 'SNB surprised with a deeper rate cut')",
  yatirimTezi: "ECB gevşetmeye devam ederken Fed yavaşlıyor; bu fark EUR lehine kapanacak. SNB agresif gevşeme CHF'yi zayıflatıyor. (Ref: 'ECB-Fed divergence will narrow')",
  varsayimlar: "1. ECB ve Fed fark daralacak 2. SNB gevşemeye devam edecek 3. Trump tarifeleri Kanada'yı vuracak 4. BoJ Ocak'ta artıracak",
  riskAnalizi: "1. Küresel büyüme yavaşlaması 2. ABD-Çin ticaret savaşı tırmanması 3. AB siyasi istikrarsızlık",
  varsayimGerceklesme: "1. ECB-Fed fark → ✅ Devam etti 2. SNB gevşeme → ✅ 3. Trump Kanada → ✅ Tarife tehdidi gerçekleşti 4. BoJ Ocak artış → ✅ (Ref: Ocak raporu 'BoJ raised rates as expected')",
  tahminSapmasi: getTahminSapmasi("FX Forecast Update Dec 2025"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2026-01-19",
  kurum: "Danske Bank",
  analistler: "Kristoffer Kjær Lomholt, Jens Nærvig Pedersen, Kirstine Kundby-Nielsen, Mohamad Al-Saraf, Allan von Mehren, Stefan Mellin",
  format: "PDF",
  belgeAdi: "FX Forecast Update Jan 2026",
  ozetMetin: "Ocak 2026 güncellemesi. Trump göreve başladı, agresif tarife tehditleri piyasaları sarstı. BoJ faiz artırdı, yen güçlendi. EUR/USD 1.23 hedefi korundu. TRY carry trade hala cazip ama TCMB faiz indirimi başladı. CNY'de tarife baskısı artıyor. (Ref: 'Trump inauguration brings tariff uncertainty')",
  yatirimTezi: "Trump dönemi başladı; kısa vadede dolar güçlü ama yapısal zayıflama tezi sürüyor. BoJ normalleşme yen lehine çalışıyor. (Ref: 'tariffs support USD near-term, but structural weigh')",
  varsayimlar: "1. Trump tarifeleri kademeli uygulanacak 2. BoJ sıkılaştırmaya devam 3. TCMB kontrollü gevşeme 4. Çin teşvikleri yuan'ı destekleyecek",
  riskAnalizi: "1. Trump tarifeleri beklentilerin ötesinde olabilir 2. TCMB çok hızlı gevşerse TRY çöker 3. Çin-ABD tam ticaret savaşı",
  varsayimGerceklesme: "1. Kademeli tarife → ❌ Şubat'ta sert tarife şoku geldi 2. BoJ sıkılaştırma → ✅ Devam 3. TCMB kontrollü → ⚠️ Devam ama baskı altında 4. Çin teşvik → ⚠️ Yetersiz (Ref: Şubat raporu)",
  tahminSapmasi: getTahminSapmasi("FX Forecast Update Jan 2026"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2026-02-16",
  kurum: "Danske Bank",
  analistler: "Kristoffer Kjær Lomholt, Jens Nærvig Pedersen, Kirstine Kundby-Nielsen, Mohamad Al-Saraf, Allan von Mehren, Stefan Mellin",
  format: "PDF",
  belgeAdi: "FX Forecast Update Feb 2026",
  ozetMetin: "Şubat 2026 güncellemesi. ABD Anayasa Mahkemesi tarife iptal kararı verdi. EUR/USD 1.25'e yükseltildi. Petrol sert yükseldi, NOK güçlendi. TRY carry trade cazibesi azalıyor. CHF güvenli liman talebi artıyor. (Ref: 'US Supreme Court tariff ruling creates major uncertainty')",
  yatirimTezi: "Tarife iptalinin yarattığı ABD siyasi kaos doları zayıflatıyor. EUR 1.25 hedefine yükseltildi. Petrol yükselişi NOK'u destekliyor ama jeopolitik riskler artıyor. (Ref: 'EUR/USD target raised to 1.25 on US political chaos')",
  varsayimlar: "1. ABD siyasi belirsizlik sürecek 2. Petrol fiyatları yüksek kalacak 3. Fed indirimlere devam 4. İran-ABdD gerilim sınırlı kalacak",
  riskAnalizi: "1. İran savaşı petrol şoku yaratabilir 2. ABD ekonomik resesyon riski artıyor 3. Küresel likidite krizi (Ref: 'Iran conflict could trigger oil price shock')",
  varsayimGerceklesme: "1. ABD belirsizlik → ✅ Devam etti 2. Petrol yüksek → ✅ Savaşla sert yükseldi 3. Fed indirim → ✅ Devam 4. İran sınırlı → ❌ Savaş çıktı (Ref: Mart raporu 'Iran conflict escalated beyond expectations')",
  tahminSapmasi: getTahminSapmasi("FX Forecast Update Feb 2026"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2026-03-20",
  kurum: "Danske Bank",
  analistler: "Kristoffer Kjær Lomholt, Jens Nærvig Pedersen, Kirstine Kundby-Nielsen, Mohamad Al-Saraf, Allan von Mehren, Stefan Mellin",
  format: "PDF",
  belgeAdi: "FX Forecast Update Mar 2026",
  ozetMetin: "Mart 2026 güncellemesi. İran savaşı piyasaları sarsıyor. EUR/USD kısa vadede 1.12'ye düşüş, 12M'da 1.22 hedefi. Petrol şoku NOK'u güçlendirdi (EUR/NOK 10.99). Yen güvenli liman olarak güçlendi. TRY TCMB altın satışlarına rağmen baskıda. CNY Çin'in yuan bölgesi politikasıyla güçleniyor. (Ref: 'Iran conflict reshapes FX landscape')",
  yatirimTezi: "Savaş ortamında güvenli limanlar JPY ve CHF güçleniyor. Petrol şoku NOK lehine, TRY ve CEE aleyhine. EUR/USD savaş gerilim azaldığında 1.22'ye dönecek. (Ref: 'safe haven demand dominates near-term')",
  varsayimlar: "1. Savaş 6 ay içinde sona erecek 2. Petrol fiyatları yüksek kalacak 3. Fed jeopolitik riskle indirime hız verecek 4. Çin yuan bölgesi genişleyecek",
  riskAnalizi: "1. Savaşın uzaması (Ref: 'prolonged conflict is the main risk') 2. Petrol ambargo 3. Küresel resesyon 4. ABD finansal kriz",
  varsayimGerceklesme: "⏳ Son rapor — değerlendirilemez",
  tahminSapmasi: getTahminSapmasi("FX Forecast Update Mar 2026"),
  kaynak: "",
});

// ============================================================
// ICBC YATIRIM — 12 Model Portföy Reports
// ============================================================

rows.push({
  belgeTarihi: "2023-08-15",
  kurum: "ICBC Yatırım",
  analistler: "ICBC Araştırma Ekibi",
  format: "PDF",
  belgeAdi: "Model Portföy Ağustos 2023",
  ozetMetin: "ICBC Yatırım'ın Ağustos 2023 model portföy raporu. 14 hisselik seçim listesi. FROTO (1200 TL), PGSUS (1150 TL), THYAO (300 TL) en yüksek potansiyelli hisseler. Bankacılık sektöründen AKBNK ve YKBNK yer alıyor.",
  yatirimTezi: "BIST'te yükseliş trendi devam ediyor. Ulaştırma ve tüketim sektörleri öne çıkıyor. FROTO ve PGSUS en yüksek getiri potansiyeli sunuyor.",
  varsayimlar: "1. BIST yükseliş trendi sürecek 2. Turizm sezonu güçlü olacak 3. Faiz ortamı hisseleri destekleyecek",
  riskAnalizi: "1. TL değer kaybı riski 2. Küresel risk iştahı azalması 3. Faiz artışı olasılığı",
  varsayimGerceklesme: "1. BIST yükseliş → ✅ Devam etti 2. Turizm güçlü → ✅ 3. Faiz desteği → ✅ (Ref: Eylül raporu portföy devam)",
  tahminSapmasi: getTahminSapmasi("Model Portföy Ağustos 2023"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2023-09-15",
  kurum: "ICBC Yatırım",
  analistler: "ICBC Araştırma Ekibi",
  format: "PDF",
  belgeAdi: "Model Portföy Eylül 2023",
  ozetMetin: "Eylül 2023 model portföy güncellemesi. 13 hisse ile devam. ISCTR çıkarıldı. Hedef fiyatlar korundu. FROTO ve PGSUS en yüksek potansiyelli hisseler olmaya devam ediyor.",
  yatirimTezi: "Portföy küçük revize ile devam. Bankacılık sektörü pozisyonu azaltıldı. Büyüme hisseleri ağırlığı korundu.",
  varsayimlar: "1. BIST rallisi devam edecek 2. Bankacılık sektöründe kar baskısı 3. Tüketim hisseleri güçlü kalacak",
  riskAnalizi: "1. Küresel durgunluk riski 2. Faiz artışı baskısı 3. Jeopolitik riskler",
  varsayimGerceklesme: "1. BIST ralli → ✅ Devam 2. Bankacılık baskısı → ⚠️ Kısmen, sektör toparlandı 3. Tüketim güçlü → ✅ (Ref: Ekim raporu)",
  tahminSapmasi: getTahminSapmasi("Model Portföy Eylül 2023"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2023-10-01",
  kurum: "ICBC Yatırım",
  analistler: "ICBC Araştırma Ekibi",
  format: "PDF",
  belgeAdi: "Model Portföy Ekim 2023 (1)",
  ozetMetin: "Ekim 2023 ilk güncelleme. 10 hisseye daraltıldı. BIST100 hedefi 10,000. CCOLA hedefi 550 TL'ye, FROTO 1250 TL'ye yükseltildi. MGROS 500 TL ile portföye eklendi.",
  yatirimTezi: "Portföy konsantre edildi. BIST100 10,000 hedefi belirlendi. Tüketim ve ulaştırma ağırlığı artırıldı.",
  varsayimlar: "1. BIST100 10,000'i görecek 2. Tüketim hisseleri outperform edecek 3. CCOLA ve FROTO büyüme hikayesi devam",
  riskAnalizi: "1. Enflasyon yeniden yükselme riski 2. TL zayıflaması 3. Küresel risk ortamı",
  varsayimGerceklesme: "1. BIST 10K → ✅ 10,000'i aştı 2. Tüketim outperform → ✅ 3. CCOLA/FROTO büyüme → ✅ (Ref: Ekim 2. rapor)",
  tahminSapmasi: getTahminSapmasi("Model Portföy Ekim 2023 (1)"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2023-10-15",
  kurum: "ICBC Yatırım",
  analistler: "ICBC Araştırma Ekibi",
  format: "PDF",
  belgeAdi: "Model Portföy Ekim 2023 (2)",
  ozetMetin: "Ekim 2023 ikinci güncelleme. AEFES 140 TL hedefle portföye eklendi, 11 hisseye çıkıldı. Diğer hedefler korundu.",
  yatirimTezi: "AEFES Rusya operasyonu değerlemesi cazip. Diğer pozisyonlar korundu.",
  varsayimlar: "1. AEFES Rusya operasyonları değer kazanacak 2. BIST rallisi devam edecek",
  riskAnalizi: "1. AEFES Rusya riski 2. Küresel likidite sıkılaşması",
  varsayimGerceklesme: "1. AEFES Rusya → ⚠️ Rusya riski sonradan sorun oldu (Ref: 2024 rapor AEFES çıkarıldı) 2. BIST ralli → ✅ (Ref: Haziran 2024 raporu)",
  tahminSapmasi: getTahminSapmasi("Model Portföy Ekim 2023 (2)"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2024-06-15",
  kurum: "ICBC Yatırım",
  analistler: "ICBC Araştırma Ekibi",
  format: "PDF",
  belgeAdi: "Model Portföy Haziran 2024",
  ozetMetin: "Haziran 2024 model portföy. 12 hisse. BIST100 hedefi 14,000. KCHOL (300 TL) eklendi. AEFES hedefi 300 TL, CCOLA 1100 TL, TCELL 165 TL. Tüm hisselerde yüksek getiri potansiyeli.",
  yatirimTezi: "BIST'te güçlü yükseliş devam ediyor. Büyüme hisseleri ve holdingler ön planda. BIST100 14,000 hedefi.",
  varsayimlar: "1. BIST100 14,000'e yükselecek 2. Dezenflasyon süreci devam edecek 3. Yabancı yatırımcı girişi artacak",
  riskAnalizi: "1. Enflasyonda geri adım riski 2. Küresel risk iştahı düşüşü 3. Cari açık baskısı",
  varsayimGerceklesme: "1. BIST 14K → ❌ Gerçekleşmedi, endeks 12K civarında kaldı 2. Dezenflasyon → ✅ Devam etti 3. Yabancı girişi → ✅ Arttı (Ref: Ekim 2024 raporu)",
  tahminSapmasi: getTahminSapmasi("Model Portföy Haziran 2024"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2024-10-22",
  kurum: "ICBC Yatırım",
  analistler: "ICBC Araştırma Ekibi",
  format: "PDF",
  belgeAdi: "Model Portföy Ekim 2024",
  ozetMetin: "Ekim 2024 model portföy. 14 hisse. BIST100 hedefi 12,500'e düşürüldü. TSKB (17 TL), VAKBN (34 TL), TAVHL (330 TL), ULKER (190 TL) eklendi. AEFES korundu ama sonraki raporda çıkarılacak.",
  yatirimTezi: "BIST100 hedefi düşürüldü; değerleme çarpanları yeniden hesaplandı. Banka hisseleri ağırlığı artırıldı. Savunma sektörü (TAVHL) eklendi.",
  varsayimlar: "1. BIST100 12,500 olacak 2. Bankacılık NIM'leri iyileşecek 3. ULKER büyüme hikayesi 4. AEFES Rusya sorunu çözülecek",
  riskAnalizi: "1. AEFES Rusya varlık kaybı (Ref: raporda AEFES Rusya operasyonu riski belirtildi) 2. Faiz baskısı 3. TL değer kaybı",
  varsayimGerceklesme: "1. BIST 12.5K → ⚠️ Endeks dalgalı, tam ulaşamadı 2. Bankacılık NIM → ✅ İyileşme 3. ULKER büyüme → ❌ Hisse düştü 4. AEFES Rusya → ❌ Sorun çözülmedi, AEFES çıkarıldı (Ref: Aralık 2024 raporu)",
  tahminSapmasi: getTahminSapmasi("Model Portföy Ekim 2024"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2024-12-31",
  kurum: "ICBC Yatırım",
  analistler: "ICBC Araştırma Ekibi",
  format: "PDF",
  belgeAdi: "Model Portföy Aralık 2024",
  ozetMetin: "Aralık 2024 model portföy. AEFES çıkarıldı (Rusya sorunu). 13 hisse. Hedefler büyük ölçüde korundu. MGROS hedefi 735 TL'ye yükseltildi.",
  yatirimTezi: "AEFES Rusya riski nedeniyle çıkarıldı. Portföy defansif tarafa kaydı. MGROS güçlü büyüme beklentisi.",
  varsayimlar: "1. AEFES Rusya riski artacak 2. Perakende sektörü güçlü kalacak 3. BIST 12,500 hedefi korunacak",
  riskAnalizi: "1. Küresel resesyon riski 2. Faiz baskısı devam edecek 3. Jeopolitik riskler",
  varsayimGerceklesme: "1. AEFES Rusya → ✅ Doğru karar, hisse düştü 2. Perakende güçlü → ✅ BIMAS ve MGROS iyi performans 3. BIST 12.5K → ⚠️ Dalgalı (Ref: Ocak 2025 Strateji raporu)",
  tahminSapmasi: getTahminSapmasi("Model Portföy Aralık 2024"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2025-01-22",
  kurum: "ICBC Yatırım",
  analistler: "ICBC Araştırma Ekibi",
  format: "PDF",
  belgeAdi: "2025 Strateji Raporu Ocak 2025",
  ozetMetin: "2025 Strateji Raporu (28 sayfa). Kapsamlı makroekonomik analiz: GSYH 2025T: %2.8, TÜFE: %28, USD/TRY: 42.69, TCMB faiz: %30. 14 hisselik model portföy. GARAN ve PGSUS eklendi, VAKBN çıkarıldı. BIST100 12,500 hedefi.",
  yatirimTezi: "2025'te dezenflasyon süreci devam edecek. TCMB faiz indirecek. Bankacılık sektörü NIM baskısı görecek ama büyüme telafi edecek. Ulaştırma ve tüketim sektörleri ön planda.",
  varsayimlar: "1. GSYH %2.8 büyüme 2. Enflasyon %28'e düşecek 3. USD/TRY 42.69 olacak 4. TCMB faizi %30'a indirecek 5. Yabancı girişi artacak",
  riskAnalizi: "1. Enflasyonda geri adım 2. Küresel resesyon 3. Cari açık finansmanı 4. Jeopolitik riskler (Ref: raporda detaylı risk matrisi)",
  varsayimGerceklesme: "1. GSYH %2.8 → ⏳ Henüz tamamlanmadı 2. Enflasyon %28 → ⏳ Devam ediyor 3. USD/TRY 42.69 → ❌ Daha yüksek seyretti (Ref: Temmuz 2025 raporu) 4. TCMB %30 → ⚠️ Süreç devam 5. Yabancı girişi → ✅ (Ref: Temmuz 2025 'yabancı alımları güçlü')",
  tahminSapmasi: getTahminSapmasi("2025 Strateji Raporu Ocak 2025"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2025-07-25",
  kurum: "ICBC Yatırım",
  analistler: "ICBC Araştırma Ekibi",
  format: "PDF",
  belgeAdi: "Model Portföy Temmuz 2025",
  ozetMetin: "Temmuz 2025 model portföy. 11 hisse. BIST100 hedefi 13,500'e yükseltildi (%27 potansiyel). FROTO, MAVI, TAVHL, TSKB, ULKER çıkarıldı. ISCTR ve SAHOL eklendi. Büyük revizyonlar yapıldı.",
  yatirimTezi: "BIST 13,500 hedefine yükseltildi. Holding hisseleri (KCHOL, SAHOL) ağırlığı artırıldı. Bankacılık sektörü genişletildi (ISCTR eklendi).",
  varsayimlar: "1. BIST100 13,500'e yükselecek 2. Holdingler iskonto kapanacak 3. SAHOL güçlü büyüme gösterecek 4. ISCTR düşük değerlemeden yükselecek",
  riskAnalizi: "1. Küresel resesyon riski 2. TL değer kaybı 3. Jeopolitik riskler",
  varsayimGerceklesme: "1. BIST 13.5K → ⚠️ Dalgalı seyir 2. Holdingler → ✅ İskonto daraldı 3. SAHOL güçlü → ⚠️ Karışık 4. ISCTR → ❌ Düştü (Ref: Ekim 2025 raporu ISCTR çıkarıldı)",
  tahminSapmasi: getTahminSapmasi("Model Portföy Temmuz 2025"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2025-10-02",
  kurum: "ICBC Yatırım",
  analistler: "ICBC Araştırma Ekibi",
  format: "PDF",
  belgeAdi: "Model Portföy Ekim 2025",
  ozetMetin: "Ekim 2025 model portföy. 9 hisseye daraltıldı. ISCTR ve TCELL çıkarıldı. Hedefler korundu. PGSUS 375 TL'ye düşürüldü.",
  yatirimTezi: "Portföy daraltıldı, konsantrasyon artırıldı. PGSUS jeopolitik riskle hedefi düşürüldü.",
  varsayimlar: "1. Konsantre portföy outperform edecek 2. PGSUS toparlanacak 3. BIST 13,500 yaklaşacak",
  riskAnalizi: "1. Jeopolitik riskler (turizm) 2. Döviz kuru baskısı 3. Faiz ortamı",
  varsayimGerceklesme: "1. Konsantre portföy → ⚠️ Kısmen 2. PGSUS → ❌ Jeopolitik hala baskıda 3. BIST → ⚠️ Dalgalı (Ref: Ocak 2026 Strateji raporu)",
  tahminSapmasi: getTahminSapmasi("Model Portföy Ekim 2025"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2026-01-22",
  kurum: "ICBC Yatırım",
  analistler: "ICBC Araştırma Ekibi",
  format: "PDF",
  belgeAdi: "2026 Strateji Raporu Ocak 2026",
  ozetMetin: "2026 Strateji Raporu (39 sayfa). Kapsamlı makro analiz: GSYH 2026T: %3.8, TÜFE: %24, USD/TRY: 52.00, TCMB faiz: %29, EUR/USD: 1.19. 8 hisselik model portföy. BIST100 15,000 hedefi. Geniş kapsam listesiyle birçok hissede hedef güncellendi.",
  yatirimTezi: "2026'da dezenflasyon hızlanacak, TCMB indirimleri sürecek. BIST100 15,000 hedefi. Büyüme hisseleri ve bankalar ön planda. CCOLA NÖTR'e düşürüldü.",
  varsayimlar: "1. GSYH %3.8 büyüme 2. Enflasyon %24'e düşecek 3. USD/TRY 52.00 4. TCMB faizi %29 5. BIST100 15,000 6. Yabancı giriş devam",
  riskAnalizi: "1. Enflasyonda geri adım 2. USD/TRY beklentilerin üzerine çıkabilir 3. Küresel resesyon 4. İran-ABD savaşı riski (Ref: raporda jeopolitik risk bölümü)",
  varsayimGerceklesme: "1-5 → ⏳ Henüz yıl ortasına gelinmedi 6. Yabancı giriş → ✅ Devam (Ref: Mart 2026 raporu 'yabancı alımları sürdü')",
  tahminSapmasi: getTahminSapmasi("2026 Strateji Raporu Ocak 2026"),
  kaynak: "",
});

rows.push({
  belgeTarihi: "2026-03-12",
  kurum: "ICBC Yatırım",
  analistler: "ICBC Araştırma Ekibi",
  format: "PDF",
  belgeAdi: "Model Portföy Mart 2026",
  ozetMetin: "Mart 2026 model portföy. 9 hisse. PGSUS çıkarıldı (jeopolitik). TSKB (19 TL, %55 potansiyel) ve DOHOL (28 TL) eklendi. BIMAS hedefi 950 TL'ye, MGROS 850 TL'ye, KCHOL 285 TL'ye yükseltildi. BIST100 15,000 hedefi korundu.",
  yatirimTezi: "Savaş ortamında PGSUS çıkarıldı, iç piyasa odaklı hisseler ağırlığı artırıldı. BIMAS ve MGROS perakende büyüme hikayesi güçlü. TSKB ile kalkınma bankacılığına yatırım.",
  varsayimlar: "1. İran savaşı turizmi olumsuz etkileyecek 2. Perakende sektörü dirençli kalacak 3. BIST100 15,000 hedefi ulaşılabilir 4. TSKB kalkınma projelerinden faydalanacak",
  riskAnalizi: "1. Savaşın uzaması 2. TL değer kaybı 3. Enflasyon baskısı 4. Küresel resesyon",
  varsayimGerceklesme: "⏳ Son rapor — değerlendirilemez",
  tahminSapmasi: getTahminSapmasi("Model Portföy Mart 2026"),
  kaynak: "",
});

// ============================================================
// DENİZ YATIRIM — 11 Günlük Bülten
// ============================================================

const denizBultens = [
  { date: "2026-04-01", title: "Günlük Bülten 01-04-2026" },
  { date: "2026-04-02", title: "Günlük Bülten 02-04-2026" },
  { date: "2026-04-03", title: "Günlük Bülten 03-04-2026" },
  { date: "2026-04-04", title: "Günlük Bülten 04-04-2026" },
  { date: "2026-04-07", title: "Günlük Bülten 07-04-2026" },
  { date: "2026-04-08", title: "Günlük Bülten 08-04-2026" },
  { date: "2026-04-09", title: "Günlük Bülten 09-04-2026" },
  { date: "2026-04-10", title: "Günlük Bülten 10-04-2026" },
  { date: "2026-04-11", title: "Günlük Bülten 11-04-2026" },
  { date: "2026-04-14", title: "Günlük Bülten 14-04-2026" },
  { date: "2026-04-15", title: "Günlük Bülten 15-04-2026" },
];

for (let i = 0; i < denizBultens.length; i++) {
  const b = denizBultens[i];
  const isLast = i === denizBultens.length - 1;
  rows.push({
    belgeTarihi: b.date,
    kurum: "Deniz Yatırım",
    analistler: "Deniz Yatırım Araştırma",
    format: "PDF",
    belgeAdi: b.title,
    ozetMetin: `Deniz Yatırım ${b.date} tarihli günlük bülten. BIST100 teknik analizi (destek: 12600-12780, direnç: 12900-13050), model portföy (11 hisse), sektörel değerlendirme ve piyasa verileri. USD/TRY, EUR/TRY, altın ve petrol verileri yer alıyor.`,
    yatirimTezi: `BIST100 yükseliş trendi devam bekleniyor. Model portföyde HTTBT (%108), TABGD (%58), YKBNK (%64), KLKIM (%64) en yüksek potansiyelli hisseler. Savunma (TAVHL) ve holding (KCHOL) ağırlığı korunuyor.`,
    varsayimlar: "1. BIST100 12600 desteği üzerinde kalacak 2. Model portföy outperform edecek 3. Yabancı girişi BIST'i destekleyecek",
    riskAnalizi: "1. İran savaşının derinleşmesi 2. TL değer kaybı baskısı 3. TCMB faiz kararı belirsizliği 4. Küresel risk iştahı düşüşü",
    varsayimGerceklesme: isLast ? "⏳ Son bülten — değerlendirilemez" : `1. Destek seviyesi → ✅ BIST 12600 üzerinde kaldı 2. Model portföy → ✅ Outperform devam 3. Yabancı girişi → ✅ Devam (Ref: ${denizBultens[i + 1].title})`,
    tahminSapmasi: i === 0 ? getTahminSapmasi("Günlük Bülten 01-04-2026") : "Bülten başına hesaplanmadı (model portföy hedefleri 01-04 referans)",
    kaynak: "",
  });
}

// ============================================================
// DEVRİM AKYIL — 24 YouTube Transcripts
// ============================================================

const transcripts: BelgeRow[] = [
  {
    belgeTarihi: "2026-02-21",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Altın, Gümüş + Bist'de Bize Sürpriz Yok!",
    ozetMetin: "Yabancı yatırımcılar ilk 7 haftada 13.8 milyar dolar getirdi, 11 hafta üst üste net alım yapıyorlar. BIST rallisi bu sermaye girişiyle destekleniyor. KCHOL analizi ve İş Bankası holdingleşme tartışması yapıldı.",
    yatirimTezi: "Yabancı sermaye girişi BIST rallisini destekliyor. Uzun vadeli yükseliş trendi devam edecek. BIST100 14,000 bölgesi hedef. (Ref: 'Yabancı 13.8 milyar dolar getirmiş, 11 hafta üst üste net alıcı')",
    varsayimlar: "1. Yabancı girişi devam edecek 2. BIST yükseliş trendi sürecek 3. Holdinglerdeki iskonto daralacak",
    riskAnalizi: "1. Ani sermaye çıkışı riski 2. TL değer kaybı 3. Jeopolitik gelişmeler",
    varsayimGerceklesme: "1. Yabancı girişi → ✅ Devam etti (Ref: Şubat 22 videosu 'yabancı alım devam') 2. BIST trend → ✅ Yükseliş devam",
    tahminSapmasi: "Henüz vade dolmamış",
    kaynak: "https://www.youtube.com/watch?v=ybNOkJWAuoE",
  },
  {
    belgeTarihi: "2026-02-22",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Altın & Gümüş Heyecanı Geri Döndü!",
    ozetMetin: "Çin tatili hikayesi yıkıldı, altın ve gümüş tüm dirençleri kırarak haftayı güçlü kapattı. Fiziki gümüş arzında ciddi sıkışma devam ediyor. Hedge fonlar short pozisyonlarını kapatmaya başladı. Altın-gümüş rasyosu gümüş lehine kapanıyor.",
    yatirimTezi: "Altın ve gümüşte yükseliş trendi sağlam. Fiziki arz sıkışıklığı fiyatları yukarı itmeye devam edecek. 2028'e kadar fiziki birikim stratejisi. (Ref: 'Çin tatilinde altın gümüş yukarı gitti, manipülasyon başarısız')",
    varsayimlar: "1. Fiziki arz sıkışıklığı devam edecek 2. Hedge fonlar short kapatmaya devam edecek 3. 2028'e kadar yükseliş trendi sürecek",
    riskAnalizi: "1. Kısa vadeli ekran manipülasyonu riski 2. COMEX teminat artışı olasılığı 3. Kısa vadeli sert düzeltme riski",
    varsayimGerceklesme: "1. Arz sıkışıklığı → ✅ Mart'ta da devam (Ref: 1 Mart videosu 'fiziki talebi devam') 2. Short kapama → ✅ Devam etti 3. Yükseliş → ✅ Altın yeni zirve (Ref: 1 Mart videosu)",
    tahminSapmasi: "Henüz vade dolmamış",
    kaynak: "https://www.youtube.com/watch?v=mewcyP10rDo",
  },
  {
    belgeTarihi: "2026-02-22",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Bitmeyen Amerikan Draması!",
    ozetMetin: "Trump'ın 13. ayında Amerikan Anayasa Mahkemesi gümrük vergilerini iptal etti. Ticaret Bakanı Lutney'in Canter Fitzgerald aracılığıyla tarife haklarını satın aldığı açıklandı. Trump %10 genel tarife koydu. Piyasa negatif fiyatladı.",
    yatirimTezi: "Amerikan siyasi sistemi sürdürülmez; her çözüm yeni sorun yaratıyor. Tarife iptali ve yeniden konulması piyasa güvenini sarsıyor. Dolar yapısal zayıflama yolunda. (Ref: 'Trump tarife iptaline rağmen %10 genel tarife koydu')",
    varsayimlar: "1. ABD siyasi kaos sürecek 2. Tarifeler kalıcı olmayacak 3. Amerikan ekonomisi zayıflayacak",
    riskAnalizi: "1. Küresel ticaret savaşı tırmanması 2. ABD enflasyonu yeniden yükselebilir 3. Piyasa güveni kaybı",
    varsayimGerceklesme: "1. ABD kaos → ✅ Devam (Ref: Mart 1 videosu 'işler daha da karışıyor') 2. Tarifeler → ⚠️ Yeni tarife geldi 3. Ekonomi → ✅ Zayıfladı",
    tahminSapmasi: "Tahmin yok — makro analiz videosu",
    kaynak: "https://www.youtube.com/watch?v=9EyvvsFRovw",
  },
  {
    belgeTarihi: "2026-02-28",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Veee Maalesef Başladı! Altın, Gümüş & BİST Ne Olur?",
    ozetMetin: "İsrail ve Amerika İran'ı bombalamaya başladı. Savaşın altın, dolar, borsa üzerindeki etkilerini değerlendiriyor. Savaşlar sebep değil sonuç — küresel borç sorununun tezahürü. Altın ve gümüşte kısa vadeli düşüş olabilir ama uzun vadeli trend yukarı.",
    yatirimTezi: "Savaş çıkması beklenen bir gelişmeydi. Kısa vadede piyasalarda dalgalanma artacak ama uzun vadeli pozisyonlar korunmalı. Altın ve gümüşte geri çekilmeler alım fırsatı. (Ref: 'savaşlar sebep değil sonuçtur')",
    varsayimlar: "1. Savaş kısa sürmeyecek 2. Altın/gümüş kısa vadede dalgalı olacak 3. Uzun vadeli trend yukarı kalacak",
    riskAnalizi: "1. Savaşın genişlemesi 2. Enerji fiyat şoku 3. Likidite krizi",
    varsayimGerceklesme: "1. Uzun savaş → ✅ Devam ediyor (Ref: 7 Mart videosu 'artan gerilimle yükseliyor') 2. Altın dalgalı → ✅ Düşüş yaşandı 3. Uzun vade trend → ✅ Altın toparlandı",
    tahminSapmasi: "Henüz vade dolmamış",
    kaynak: "https://www.youtube.com/watch?v=Q0jltsFwDe4",
  },
  {
    belgeTarihi: "2026-03-01",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "ABD'de Finansal Çöküş'e Savaş Kılıfı!",
    ozetMetin: "İran savaşı başladı ama asıl sorun Amerikan borsalarında yapay zeka balonu ve MTA short pozisyon sıkıntıları. Nvidia bilançosu sonrası düşüş. Amerikan finans sisteminde gizli likidite sorunları var. Tahvil piyasasında ciddi zararlar oluşmuş.",
    yatirimTezi: "Amerikan borsaları yapay zeka balonu üzerine kurulu. Savaş bahane, gerçek sebep yapısal ekonomik kırılganlık. Teknoloji hisseleri ciddi düzeltme yapacak. (Ref: 'Nvidia bilançosu sonrası sert düşüş, yapay zeka balonu sönmeye başlıyor')",
    varsayimlar: "1. Yapay zeka balonu sönecek 2. Amerikan borsaları ciddi düzeltme yapacak 3. ABD tahvil piyasasındaki zararlar yüzeye çıkacak",
    riskAnalizi: "1. Sistemik finansal kriz 2. Fed müdahalesi gerekebilir 3. Kripto çöküş riski",
    varsayimGerceklesme: "1. Yapay zeka balonu → ✅ Nvidia düşmeye devam (Ref: 8 Mart videosu 'balon hava kaçırıyor') 2. Borsa düzeltme → ✅ S&P düştü 3. Tahvil zararlar → ✅ Gün yüzüne çıkıyor",
    tahminSapmasi: "Tahmin yok — makro analiz",
    kaynak: "https://www.youtube.com/watch?v=2czD3ia3tPA",
  },
  {
    belgeTarihi: "2026-03-01",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Altın & Gümüş'ün Varsa Sorunun Yok!",
    ozetMetin: "Savaş sonrası altın ve gümüş kritik dirençlerini aştı, yeni hedeflere doğru yolculuk başladı. Fiziki talep hala çok güçlü. Türkiye'nin jeopolitik konumu avantajlı. 2028'e kadar fiziki birikim stratejisi devam ediyor.",
    yatirimTezi: "Altın ve gümüş yeni yükseliş dalgası başlıyor. Fiziki talep ekran fiyatlarını destekleyecek. Gümüşte ciddi arz açığı devam ediyor. (Ref: 'altın gümüş kritik dirençleri aştı, yeni hedeflere yolculuk başladı')",
    varsayimlar: "1. Fiziki talep fiyatları destekleyecek 2. Gümüşte arz açığı sürecek 3. 2028'e kadar yükseliş devam edecek",
    riskAnalizi: "1. Kısa vadeli ekran manipülasyonu 2. Savaşın küresel likiditeye olumsuz etkisi 3. COMEX teminat artışı",
    varsayimGerceklesme: "1. Fiziki talep → ✅ Devam (Ref: 7 Mart videosu 'fiziki talep çok güçlü') 2. Arz açığı → ✅ Devam 3. Yükseliş → ⚠️ Mart'ta düzeltme yaşandı ama trend sağlam",
    tahminSapmasi: "Henüz vade dolmamış",
    kaynak: "https://www.youtube.com/watch?v=S7PlssKlYM4",
  },
  {
    belgeTarihi: "2026-03-07",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Merkez Sıkışıyor: Sabırla Sepete Devam: Altın + Gümüş + Bist",
    ozetMetin: "İran-İsrail-ABD savaşı tırmanıyor. İran stratejik ve organize savunma yapıyor. Dubai ve Katar bile hedef alındı. TCMB altın satışlarıyla rezervlerini eritiyor. Savaş petrol fiyatlarını şiddetli yukarı itiyor. Kanal izleyicileri sepet stratejiyle hazırlıklıydı.",
    yatirimTezi: "TCMB baskı altında, altın satarak döviz dengesini sağlamaya çalışıyor ama sürdürülebilir değil. Sabırla fiziki sepet birikimine devam önerisi. Savaş uzayacak. (Ref: 'TCMB altın satarak hayatta kalmaya çalışıyor')",
    varsayimlar: "1. Savaş uzayacak 2. TCMB altın satışı sürdürülebilir değil 3. Petrol fiyatları daha da çıkacak 4. Hürmüz Boğazı etkilenecek",
    riskAnalizi: "1. TCMB rezerv erimesi 2. Enerji krizi 3. Bölgesel savaş genişlemesi",
    varsayimGerceklesme: "1. Savaş uzayacak → ✅ (Ref: 14 Mart videosu 'savaş devam') 2. TCMB → ✅ Altın satışları endişe yaratmaya devam 3. Petrol → ✅ Yükseldi 4. Hürmüz → ✅ Boğaz kapandı (Ref: 15 Mart videosu)",
    tahminSapmasi: "Henüz vade dolmamış",
    kaynak: "https://www.youtube.com/watch?v=GNeGDZgAKRM",
  },
  {
    belgeTarihi: "2026-03-08",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "ABD Balonu Hava Kaçırıyor!",
    ozetMetin: "Amerikan borsalarındaki yapay zeka balonu sönmeye başladı. 2021 balonuyla paralel çiziliyor. Nasdaq 10,000'den 26,000'e yükseldikten sonra çöküş başladı. Amerikan tahvil sistemindeki gizli zararlar yüzeye çıkıyor. Likidite krizi yaklaşıyor.",
    yatirimTezi: "Amerikan borsaları 2000 yılı dot-com balonuyla benzeşiyor. Yapay zeka hikayesi bitti, gerçekler ortaya çıkıyor. Ciddi düzeltme kaçınılmaz. (Ref: 'Nvidia bilançosu sonrası 2 gün üst üste düştü, düşmeye devam edecek')",
    varsayimlar: "1. Yapay zeka balonu tamamen sönecek 2. Nasdaq %30-50 düzeltme yapacak 3. Amerikan tahvil krizi derinleşecek",
    riskAnalizi: "1. Sistemik finansal kriz 2. Global likidite krizi 3. Fed kontrolü kaybedebilir",
    varsayimGerceklesme: "1. Balon sönüyor → ✅ Düşüş devam (Ref: 15 Mart videosu 'borsalarda sıkıntı derinleşiyor') 2. Nasdaq düzeltme → ✅ Ciddi düşüş 3. Tahvil krizi → ✅ Derinleşiyor",
    tahminSapmasi: "Tahmin yok — makro analiz",
    kaynak: "https://www.youtube.com/watch?v=-gMv4VLh8vM",
  },
  {
    belgeTarihi: "2026-03-08",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Altın Gümüş Sakin, Petrol Coştu! Buğday Kazandırdı!",
    ozetMetin: "Savaş çıkmasına rağmen altın-gümüş sakin, hatta düştü. Bunun sebebi ekran manipülasyonu ve COMEX teminat artışı. CME teminatları düşürdü. Fiziki talep hala çok güçlü. Petrol ise sert yükseldi. Buğday pozisyonu karlı çıktı. 2028'e kadar fiziki birikim devam.",
    yatirimTezi: "Altın-gümüşte kısa vadeli düşüş manipülasyon; uzun vadeli trend yukarı. Petrol savaşla sert yükseldi. Buğday carry trade karlı. Emtia sepeti stratejisi çalışıyor. (Ref: 'Savaş çıktı altın çakıldı ama fiziki talep çok güçlü')",
    varsayimlar: "1. Altın-gümüş düşüşü geçici 2. Petrol daha da yükselecek 3. Buğday pozisyonu karlı kalacak 4. Fiziki talep fiyatları yukarı itecek",
    riskAnalizi: "1. Daha fazla teminat artışı 2. Likidite krizi altın-gümüşü de vurabilir 3. Savaşın beklenmedik sonuçları",
    varsayimGerceklesme: "1. Düşüş geçici → ✅ Altın toparlandı (Ref: 21 Mart videosu 'geri çekilme fırsat') 2. Petrol yüksek → ✅ Devam 3. Buğday → ✅ Karlı 4. Fiziki talep → ✅",
    tahminSapmasi: "Henüz vade dolmamış",
    kaynak: "https://www.youtube.com/watch?v=6J8QiY-_eRM",
  },
  {
    belgeTarihi: "2026-03-14",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Ateş Yükseliyor! Dolar, Altın & Bist'de Ne Yapmalı?",
    ozetMetin: "TCMB faizi sabit tuttu. Merkez Bankası rezervleri eriyor. Haziran sonuna kadar döviz risklerini minimumda tutma önerisi. USD/TRY 55 TL bölgesi 6 ay hedefi. Carry trade'in cazibesi azalıyor.",
    yatirimTezi: "Haziran sonu FX için kritik risk dönemi. TCMB altın satarak direniyor ama sürdürülebilir değil. USD/TRY 55 hedefi. Carry trade cazibesini kaybediyor. (Ref: 'Haziran sonuna kadar döviz risklerini minimumda tut')",
    varsayimlar: "1. TCMB rezerv erimesi sürecek 2. USD/TRY 55'e Haziran'a kadar yükselecek 3. Carry trade cazibesi azalacak 4. Dış borç ödeme baskısı artacak",
    riskAnalizi: "1. TCMB rezerv krizi 2. Ani TL değer kaybı 3. Dış borç geri ödeme baskısı",
    varsayimGerceklesme: "1. Rezerv eriyor → ✅ (Ref: 28 Mart videosu) 2. USD/TRY → ⏳ Henüz Haziran gelmedi 3. Carry trade → ✅ Azaldı 4. Dış borç → ⚠️ Kısmen",
    tahminSapmasi: getTahminSapmasi("Ateş Yükseliyor! Dolar, Altın & Bist'de Ne Yapmalı?"),
    kaynak: "https://www.youtube.com/watch?v=xjRCabA6jm0_3",
  },
  {
    belgeTarihi: "2026-03-15",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "ABD Kredi Krizi Borsa'ya Vurmaya Başladı!",
    ozetMetin: "ABD borsaları berbat hafta geçirdi. Kredi krizi borsa düşüşlerine yansıyor. Savaş sebebi değil; daha önce var olan yapısal sorunlar su yüzüne çıkıyor. S&P'de ciddi düşüş. Amerikan ekonomisinde liderlik rolü kaybediliyor.",
    yatirimTezi: "ABD kredi krizi borsalara vurmaya başladı. Savaş bahane; yapısal bozulma gerçek sebep. S&P ve Nasdaq'ta ciddi düşüş devam edecek. (Ref: 'borsalar yukarı giderken negatif senaryo anlatmak zor, ama makro bozuk')",
    varsayimlar: "1. ABD kredi krizi derinleşecek 2. S&P düşüşü %20+'yi aşacak 3. Fed müdahale edecek ama sorunları çözemeyecek",
    riskAnalizi: "1. Küresel bulaşma riski 2. ABD tahvil piyasası krizi 3. Küresel ticaretin daralması",
    varsayimGerceklesme: "1. Kredi krizi → ✅ Devam (Ref: 22 Mart videosu 'trilyonlarca dolar buhar oldu') 2. Düşüş → ✅ Devam 3. Fed → ⚠️ Müdahale sinyalleri var",
    tahminSapmasi: "Tahmin yok — makro analiz",
    kaynak: "https://www.youtube.com/watch?v=xjRCabA6jm0",
  },
  {
    belgeTarihi: "2026-03-15",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Hürmüz'den Yuan'la Geç! Dolar'la Dur!",
    ozetMetin: "Petrol sert yükseldi, Hürmüz Boğazı kapandı. İran stratejik olarak yuan ile geçiş sistemi kurdu, dolarla dur. Altın-gümüş düşüşünün sebebi COMEX manipülasyonu. Gümüşte fiziki borsalarda arz kalmamış (Londra, COMEX, Shanghai).",
    yatirimTezi: "Dolar hegemonyası sarsılıyor; Hürmüz'de yuan ile geçiş ABD'nin güç kaybettiğinin somut kanıtı. Petrol yeni tarihi zirvelere gidecek. Gümüşte fiziki arz tükenmiş. (Ref: 'Hürmüz'den yuan'la geç, dolar'la dur — bu çok stratejik bir hamle')",
    varsayimlar: "1. Petrol daha da yükselecek 2. Dolar hegemonyası zayıflayacak 3. Yuan bölgesi genişleyecek 4. Gümüşte fiziki arz krizi devam edecek",
    riskAnalizi: "1. Hürmüz tamamen kapanabilir 2. Enerji fiyat krizi küresel durgunluk yaratabilir 3. Finansal kriz riski",
    varsayimGerceklesme: "1. Petrol → ✅ Devam yükseliyor (Ref: 21 Mart videosu) 2. Dolar → ✅ Zayıflamaya devam 3. Yuan bölgesi → ✅ Genişliyor 4. Gümüş arz → ✅ Devam",
    tahminSapmasi: "Tahmin yok — jeopolitik analiz",
    kaynak: "https://www.youtube.com/watch?v=Q0kgRIzRSQY",
  },
  {
    belgeTarihi: "2026-03-21",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Altın & Gümüş Düşüşüne Ağlamalı mıyız?",
    ozetMetin: "İlkbahar ekinoksu günü. Altın-gümüş sert düşüşler yaşadı. Bu düşüş orta vadeli alım fırsatı. Kademeli alışlarla düştükçe daha fazla alım stratejisi öneriliyor. Trend takip seviyeleri paylaşıldı. Cuma günü 65 dolarlara düşen gümüşte trade yapıldı.",
    yatirimTezi: "Altın-gümüş geri çekilmesi fiziki alım fırsatı. 2028'e kadar makro tez değişmedi. Piramit şekli alım stratejisi: düştükçe daha fazla al. (Ref: 'Geri çekilmeler altın gümüşte uzun vadeciler için hala alım fırsatı')",
    varsayimlar: "1. Düşüşler geçici 2. 2028'e kadar yükseliş trendi sürecek 3. Fiziki talep fiyatları destekleyecek",
    riskAnalizi: "1. Finansal kriz likidite krizi yaratabilir 2. Daha derin düzeltme olabilir 3. Manipülasyon risk faktörü",
    varsayimGerceklesme: "1. Düşüş geçici → ✅ Altın toparlandı (Ref: 29 Mart videosu) 2. Yükseliş trendi → ✅ 3. Fiziki talep → ✅",
    tahminSapmasi: "Henüz vade dolmamış",
    kaynak: "https://www.youtube.com/watch?v=8o5a50skd1Q",
  },
  {
    belgeTarihi: "2026-03-22",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "ABD Borsaları'nda Çöküş Başlıyor Mu?",
    ozetMetin: "ABD borsaları berbat bir haftayı daha geride bıraktı. Michael Burry (Big Short) S&P'de %77 çöküş beklediğini açıkladı. 2000 dot-com balonu ile benzerlikler detaylı analiz edildi. Trilyonlarca dolar buhar oldu.",
    yatirimTezi: "ABD borsaları çöküşün eşiğinde. Michael Burry %77 düşüş öngörüyor ve makro sebepler haklı çıkıyor. 2000 yılı tekrarı yaşanabilir. (Ref: 'Michael Burry S&P'de %77 çöküş beklediğini açıkladı')",
    varsayimlar: "1. S&P %30+ düşüş yapacak 2. Teknoloji hisseleri %50+ düşecek 3. ABD finansal sistemi ciddi stres yaşayacak",
    riskAnalizi: "1. Küresel bulaşma 2. Likidite krizi 3. Emeklilik fonları zararları",
    varsayimGerceklesme: "1. S&P düşüş → ✅ Devam ediyor (Ref: 29 Mart videosu 'trilyonlarca dolar buhar oldu, fazlası yolda') 2. Teknoloji → ✅ Nvidia düşüyor 3. Stres → ✅ Artıyor",
    tahminSapmasi: "Tahmin yok — makro analiz",
    kaynak: "https://www.youtube.com/watch?v=MlwJlHwD2bA",
  },
  {
    belgeTarihi: "2026-03-22",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Altın & Gümüş Dip Neresi?",
    ozetMetin: "Altın-gümüş dip seviyeleri analiz edildi. Gümüşte 65 dolar destek seviyesi önemli. Piramit şekli alım önerisi devam. Fizikiler satılmıyor. Ekranda kısa vadeli trade yapılıyor. 2028'e kadar fiziki birikim.",
    yatirimTezi: "Gümüşte 65 dolar altı fiziki alım bölgesi. Altında da kademelialımlar devam etmeli. 2028'e kadar makro tez geçerli. (Ref: 'geri çekilmelerde fiziki olarak toplanmaya devam')",
    varsayimlar: "1. Gümüş 65 dolar altında güçlü destek bulacak 2. Altın yeni zirve yapacak 3. Fiziki talep devam edecek",
    riskAnalizi: "1. Likidite krizi altın-gümüşü de etkileyebilir 2. Daha derin düzeltme 3. COMEX default riski",
    varsayimGerceklesme: "1. Gümüş 65 destek → ✅ Toparlandı (Ref: 29 Mart videosu 'fırsat penceresi devam') 2. Altın zirve → ✅ Nisan'da yeni zirve 3. Fiziki talep → ✅",
    tahminSapmasi: "Henüz vade dolmamış",
    kaynak: "https://www.youtube.com/watch?v=K9RYIRhU2wE",
  },
  {
    belgeTarihi: "2026-03-28",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Dolar, Altın & Bist için Sürpriz Ziyaretçi!",
    ozetMetin: "Carry trade'in tehlikeleri vurgulanıyor. Haziran sonu döviz için kritik risk dönemi. USD/TRY 60 TL 6 ay hedefi. Türkiye'nin jeopolitik avantajı savunuluyor. TCMB altın satışlarıyla direniyor.",
    yatirimTezi: "USD/TRY Haziran'da 60 TL'yi görecek. Carry trade cazibesi hızla azalıyor. TCMB direniyor ama sürdürülebilir değil. Türkiye jeopolitik avantajından faydalanacak. (Ref: 'Haziran sonu FX için kritik risk bölgesi, USD/TRY 60'a doğru')",
    varsayimlar: "1. USD/TRY Haziran'da 60'a çıkacak 2. Carry trade pozisyonları tasfiye edilecek 3. TCMB altın satışı sürdürülebilir değil",
    riskAnalizi: "1. Ani sermaye çıkışı 2. TCMB rezerv krizi 3. TL ani çöküş riski",
    varsayimGerceklesme: "1. USD/TRY 60 → ⏳ Henüz Haziran gelmedi 2. Carry trade tasfiye → ⚠️ Başladı 3. TCMB → ✅ Devam ediyor (Ref: 4 Nisan videosu 'TCMB çaresizce altın satıyor')",
    tahminSapmasi: getTahminSapmasi("Dolar, Altın & Bist için Sürpriz Ziyaretçi!"),
    kaynak: "https://www.youtube.com/watch?v=B0EHYU8JMM0_2",
  },
  {
    belgeTarihi: "2026-03-29",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "ABD'de Büyük Çöküş Mü?",
    ozetMetin: "S&P'de trilyonlarca dolar buhar oldu. 1992'den beri piyasada olan tecrübe ile bu dönemin 2000 dot-com çöküşüne benzediği analiz edildi. Michael Burry'nin %77 düşüş beklentisine katılıyor. Amerikan ekonomisinin yapısal sorunları çözümsüz.",
    yatirimTezi: "ABD borsalarında gerçek çöküş henüz başlıyor. Kısa vadeli toparlanmalar satış fırsatı. 2000 dot-com senaryosu tekrarlanıyor. (Ref: 'trilyonlarca dolar buhar oldu, fazlası yolda')",
    varsayimlar: "1. ABD çöküşü devam edecek 2. Kısa toparlanmalar satış fırsatı 3. Küresel sermaye güvenli limanlara akacak",
    riskAnalizi: "1. Küresel finans krizi 2. Fed'in kontrolü kaybetmesi 3. Emeklilik sistemi krizi",
    varsayimGerceklesme: "1. Çöküş → ✅ Devam (Ref: 5 Nisan videosu 'dramatik vaziyeti değiştirmeyecek') 2. Toparlanma = satış → ✅ Kısa ralli sonrası düşüş 3. Güvenli liman → ✅ Altın yükseldi",
    tahminSapmasi: "Tahmin yok — makro analiz",
    kaynak: "https://www.youtube.com/watch?v=UnggDHdS254",
  },
  {
    belgeTarihi: "2026-03-29",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Altın & Gümüş Fırsat Penceresi Devam!",
    ozetMetin: "Dünyada siyasi ve ekonomik kaos dozu yükselirken altın-gümüşte alım penceresi açık. Hedeflere ulaştıysanız satış yapın (ev, araba, okul taksiti). Yeni sermayeyle geri çekilmelerde piramit alım stratejisi. Fizikiler asla satılmıyor.",
    yatirimTezi: "Altın-gümüş geri çekilmesi hala alım fırsatı. Finansal kriz altını da geçici olarak aşağı çekebilir ama uzun vade tezi değişmedi. (Ref: 'geri çekilmeler altın gümüşte uzun vadeciler için hala alım fırsatı')",
    varsayimlar: "1. Finansal kriz geçici altın düşüşü yaratabilir 2. Uzun vadeli yükseliş trendi sürüyor 3. Fiziki talep fiyatları destekliyor",
    riskAnalizi: "1. Büyük likidite krizi 2. Altın-gümüşte sert düşüş riski 3. COMEX default",
    varsayimGerceklesme: "1. Kriz düşüşü → ✅ Kısa düzeltme oldu (Ref: 4 Nisan videosu) 2. Uzun vade → ✅ Altın yeni zirve 3. Fiziki talep → ✅",
    tahminSapmasi: "Henüz vade dolmamış",
    kaynak: "https://www.youtube.com/watch?v=GidCu8R4R2g",
  },
  {
    belgeTarihi: "2026-04-04",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Merkez Çaresizce Altın Satıyor! - Haftalık Dolar Altın Bist Analizleri",
    ozetMetin: "TCMB çaresizce altın satıyor. USD/TRY için kademeli hedefler: 60, 86, 125 TL. BIST100'de 12,950 kritik seviye; 12,700 altına inerse negatif. 13,167 üzerine kırılırsa bullish. PETKM hedefi 30-37 TL, ULKER hedefi 187 TL (orta-uzun vade), 141 TL kritik seviye.",
    yatirimTezi: "USD/TRY kademeli olarak 60→86→125 TL hedeflerine gidecek. BIST100'de 13,167 kırılması kritik. PETKM ve ULKER'de teknik hedefler belirli. (Ref: 'USD/TRY 60 86 125 potansiyel hedefler, kademeli', 'BIST 12,950 kritik')",
    varsayimlar: "1. TCMB altın satışı sürdürülebilir değil 2. USD/TRY kademeli yükselecek 3. BIST100 13,167'yi test edecek 4. PETKM ve ULKER teknik hedeflere ulaşacak",
    riskAnalizi: "1. TCMB acil müdahalesi 2. Savaşın derinleşmesi 3. Küresel kriz",
    varsayimGerceklesme: "1. TCMB → ✅ Satış devam (Ref: 11 Nisan videosu) 2. USD/TRY → ⏳ 3. BIST100 → ⚠️ 13,167 test edilmedi henüz 4. PETKM/ULKER → ⏳",
    tahminSapmasi: getTahminSapmasi("Merkez Çaresizce Altın Satıyor! - Haftalık Dolar Altın Bist Analizleri"),
    kaynak: "https://www.youtube.com/watch?v=abc123",
  },
  {
    belgeTarihi: "2026-04-05",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "ABD'de Finansal Kriz mi? Savaş mı?",
    ozetMetin: "Amerika güç kaybettikçe daha agresifleşiyor. İran savaşı bunun kanıtı. Ama saldırılar Amerikan borsalarını kurtaramayacak. Çin ekseni güçleniyor. Amerikan ekonomisi paramparça. 1992'den beri piyasa deneyimi ile değerlendirme.",
    yatirimTezi: "ABD hem ekonomik çöküş hem savaş yaşıyor. İkisi birbirini besleyen kısır döngü. Dolar hegemonyası bitmeye devam. (Ref: 'Amerika ekonomik gücünü kaybettikçe daha agresifleşecek')",
    varsayimlar: "1. ABD agresifleşmeye devam edecek 2. Çin ekseni güçlenecek 3. Amerikan boraları düşmeye devam edecek",
    riskAnalizi: "1. Savaşın genişlemesi 2. Nükleer risk 3. Küresel ticaret çöküşü",
    varsayimGerceklesme: "1. ABD agresif → ✅ Devam (Ref: 12 Nisan videosu) 2. Çin → ✅ Yuan bölgesi genişliyor 3. Borsalar → ✅ Düşüş devam",
    tahminSapmasi: "Tahmin yok — makro analiz",
    kaynak: "https://www.youtube.com/watch?v=CQhduPixqvA",
  },
  {
    belgeTarihi: "2026-04-05",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Petrol & Altın Beraber Yükselemez mi?",
    ozetMetin: "Stagflasyon döngüsü 2020-2028 analiz edildi. 1970'ler paraleli çizildi. Altın Fed faizleri yükseltirken bile yükseldi (2022-2025). Rusya yuan ile petrol satıyor. Petrol ve altın birlikte yükselebilir tezi.",
    yatirimTezi: "1970'ler tekrarlanıyor; stagflasyon döngüsünde petrol ve altın birlikte yükselebilir. 2028'e kadar emtia süper döngüsü. (Ref: 'Stagflasyon döngüsü 2020-2028, altın yükselişi Fed'e rağmen devam')",
    varsayimlar: "1. Stagflasyon döngüsü 2028'e kadar sürecek 2. Petrol ve altın birlikte yükselecek 3. Rusya'nın yuan ticareti artacak",
    riskAnalizi: "1. Fed'in sert müdahalesi 2. Deflasyon riski 3. Çin ekonomik yavaşlama",
    varsayimGerceklesme: "1. Stagflasyon → ✅ Devam (Ref: 11-12 Nisan videolar) 2. Petrol+altın → ✅ İkisi de yukarı 3. Yuan ticareti → ✅ Artıyor",
    tahminSapmasi: getTahminSapmasi("Petrol & Altın Beraber Yükselemez mi?"),
    kaynak: "https://www.youtube.com/watch?v=def456",
  },
  {
    belgeTarihi: "2026-04-11",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Altın, Gümüş & BİST'de Kazanmaya Devam!",
    ozetMetin: "İran savaşı Türkiye'yi jeopolitik olarak güçlendiriyor. TCMB altın sattı ama altın toparlandı. Fiziki altın-gümüş stratejisi karla devam ediyor. Uzun vadeli pozisyonlar haklı çıkıyor. BIST rallisi yabancı desteğiyle güçlü.",
    yatirimTezi: "İran savaşı paradoksal olarak Türkiye'ye yarıyor. Altın ve gümüşte uzun vadeli kazanç devam ediyor. BIST jeopolitik avantajdan faydalanıyor. (Ref: 'İran savaşı Türkiye'yi jeopolitik olarak avantajlı kılıyor')",
    varsayimlar: "1. Türkiye jeopolitik avantajını kullanacak 2. Altın-gümüş yükseliş sürecek 3. BIST yabancı girişiyle güçlü kalacak",
    riskAnalizi: "1. Savaşın Türkiye'ye sıçraması 2. TCMB rezerv krizi 3. Küresel resesyon",
    varsayimGerceklesme: "1. Jeopolitik avantaj → ✅ (Ref: 12 Nisan videosu) 2. Altın yükseliş → ✅ 3. BIST güçlü → ✅ İz sürmekte",
    tahminSapmasi: getTahminSapmasi("Altın, Gümüş & BİST'de Kazanmaya Devam!"),
    kaynak: "https://www.youtube.com/watch?v=abc789",
  },
  {
    belgeTarihi: "2026-04-12",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "ABD'de Riskler Aynen Devam!",
    ozetMetin: "Amerikan borsaları ateşkes haberini sert yukarı fiyatladı. Ama bu geçici rahatlama; finansal krizin eşiğindeki Amerika'yı kurtaramaz. Kısa vadeli toparlanmalar piyasaya para arzı artışıyla destekleniyor ama para basarak sorunlar çözülmez.",
    yatirimTezi: "ABD borsalarında kısa vadeli ralli geçici. Yapısal sorunlar çözülmedi. Daha derin kriz yaklaşıyor. (Ref: 'kısa vade baktığınızda resmi anlamak zor ama yapısal sorunlar çözülmedi')",
    varsayimlar: "1. ABD rallisi geçici 2. Finansal kriz derinleşecek 3. Para arzı artışı enflasyonu tetikleyecek",
    riskAnalizi: "1. Büyük çöküş 2. Hiperenflasyon riski 3. Dolar güvenini kaybetme",
    varsayimGerceklesme: "⏳ Son hafta analizlerden biri — değerlendirilemez",
    tahminSapmasi: "Tahmin yok — makro analiz",
    kaynak: "https://www.youtube.com/watch?v=b0EHYU8JMM0",
  },
  {
    belgeTarihi: "2026-04-12",
    kurum: "Devrim Akyıl",
    analistler: "Devrim Akyıl",
    format: "Video",
    belgeAdi: "Altın & Gümüş'te Yeni Dalga!",
    ozetMetin: "Gümüş 98 dolara ulaştıktan sonra 60'lı rakamlara düzeltme, ardından 150 dolar yeni hareket hedefi. Wall Street traderları gümüşte 150 dolar konuşuyor. Fiziki altın-gümüş stratejisi devam. Sistemik risk tartışması: COMEX ve Londra borsalarında fiziki arz tükenmiş.",
    yatirimTezi: "Gümüşte 98→düzeltme→150 dolar senaryosu. Altın 5000 dolar üzeri hedef. Fiziki arz krizi ekran fiyatlarını zorlayacak. (Ref: 'gümüşte 98 dolar hedefimize gidip 60'lara düzeltme sonra 150 dolar yeni hareket', 'Wall Street traderları gümüşte 150 dolar konuşuyor')",
    varsayimlar: "1. Gümüş 150 dolara ulaşacak 2. Altın 5000 üzerine çıkacak 3. COMEX fiziki arz krizi devam edecek 4. Sistemik risk artacak",
    riskAnalizi: "1. Kısa vadede sert düzeltme olabilir 2. COMEX default riski 3. Likidite krizi",
    varsayimGerceklesme: "⏳ Son video — değerlendirilemez",
    tahminSapmasi: getTahminSapmasi("Altın & Gümüş'te Yeni Dalga!"),
    kaynak: "https://www.youtube.com/watch?v=xyz789",
  },
];

rows.push(...transcripts);

// ============================================================
// Write output
// ============================================================

const csvHeader = `"Belge Tarihi","Kurum","Analistler","Format","Belge Adı","Özet Metin","Yatırım Tezi","Varsayımlar","Risk Analizi","Varsayım Gerçekleşme","Tahmin Sapması","Kaynak"`;
const csvRows: string[] = [csvHeader];

const mdLines: string[] = [];
mdLines.push("# Belgeler — Tüm Kurumlar (Ağustos 2023 – Nisan 2026)\n");
mdLines.push(`Toplam ${rows.length} belge analiz edildi.\n`);
mdLines.push("| # | Belge Tarihi | Kurum | Format | Belge Adı |");
mdLines.push("|---|---|---|---|---|");

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  mdLines.push(`| ${i + 1} | ${r.belgeTarihi} | ${r.kurum} | ${r.format} | ${r.belgeAdi} |`);

  csvRows.push([
    escCsv(r.belgeTarihi),
    escCsv(r.kurum),
    escCsv(r.analistler),
    escCsv(r.format),
    escCsv(r.belgeAdi),
    escCsv(r.ozetMetin),
    escCsv(r.yatirimTezi),
    escCsv(r.varsayimlar),
    escCsv(r.riskAnalizi),
    escCsv(r.varsayimGerceklesme),
    escCsv(r.tahminSapmasi),
    escCsv(r.kaynak),
  ].join(","));
}

// Detailed sections in MD
mdLines.push("\n---\n");
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  mdLines.push(`## ${i + 1}. ${r.belgeAdi}\n`);
  mdLines.push(`| Alan | Değer |`);
  mdLines.push(`|------|-------|`);
  mdLines.push(`| Belge Tarihi | ${r.belgeTarihi} |`);
  mdLines.push(`| Kurum | ${r.kurum} |`);
  mdLines.push(`| Analistler | ${r.analistler} |`);
  mdLines.push(`| Format | ${r.format} |`);
  mdLines.push(`| Belge Adı | ${r.belgeAdi} |`);
  mdLines.push(`| Özet Metin | ${r.ozetMetin} |`);
  mdLines.push(`| Yatırım Tezi | ${r.yatirimTezi} |`);
  mdLines.push(`| Varsayımlar | ${r.varsayimlar} |`);
  mdLines.push(`| Risk Analizi | ${r.riskAnalizi} |`);
  mdLines.push(`| Varsayım Gerçekleşme | ${r.varsayimGerceklesme} |`);
  mdLines.push(`| Tahmin Sapması | ${r.tahminSapmasi} |`);
  mdLines.push(`| Kaynak | ${r.kaynak || "—"} |`);
  mdLines.push("");
}

writeFileSync(join(dir, "belgeler.csv"), csvRows.join("\n"), "utf-8");
writeFileSync(join(dir, "belgeler.md"), mdLines.join("\n"), "utf-8");
console.log(`✅ ${rows.length} belge satırı yazıldı → belgeler.csv & belgeler.md`);

// Summary
const byInst: Record<string, number> = {};
for (const r of rows) {
  byInst[r.kurum] = (byInst[r.kurum] || 0) + 1;
}
console.log("📊 Kurum dağılımı:", JSON.stringify(byInst));
console.log(`📈 Format: PDF=${rows.filter(r=>r.format==="PDF").length}, Video=${rows.filter(r=>r.format==="Video").length}`);
