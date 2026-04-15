import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('analizler/forecasts-results.json', 'utf8'));

// Analyst mapping for Danske Bank pairs
const danskeAnalysts = {
  'EUR/USD': 'Mohamad Al-Saraf',
  'USD/JPY': 'Mohamad Al-Saraf',
  'EUR/SEK': 'Stefan Mellin, Jesper Fjärstedt',
  'EUR/NOK': 'Kristoffer Kjær Lomholt',
  'EUR/DKK': 'Jens Nærvig Pedersen',
  'EUR/GBP': 'Kirstine Kundby-Nielsen',
  'EUR/CHF': 'Kirstine Kundby-Nielsen',
  'EUR/PLN': 'Jesper Fjärstedt',
  'AUD/USD': 'Antti Ilvonen',
  'USD/CAD': 'Antti Ilvonen',
  'USD/CNY': 'Allan von Mehren',
  'EUR/HUF': 'Danske Bank Ekip',
  'EUR/CZK': 'Danske Bank Ekip',
  'EUR/TRY': 'Danske Bank Ekip',
  'EUR/CNY': 'Danske Bank Ekip',
  'EUR/JPY': 'Danske Bank Ekip'
};

// Report-level context for Danske Bank
const danskeContext = {
  '2025-06-23': { theme: 'yapısal USD zayıflığı devam', pairs: {
    'EUR/USD': 'Yapısal USD zayıflığı ile EUR/USD yükselişi sürecek; ABD varlıklarından çıkış trendi destekliyor',
    'EUR/SEK': 'Riksbank faiz indirimi SEK\'i baskılayacak; İsveç büyümesi zayıf',
    'EUR/NOK': 'NOK\'a petrol desteği geçici; yapısal kırılganlık devam ediyor',
    'EUR/DKK': 'Hedge oranları artışıyla EUR/DKK aşağı baskı; dar bant bekleniyor',
    'EUR/GBP': 'İngiltere zayıf büyüme ile GBP baskıda; EUR/GBP yükseliyor',
    'USD/JPY': 'Fed indirimi beklentisiyle USD/JPY aşağı yönlü; BoJ sıkılaşması olası',
    'EUR/CHF': 'CHF güvenli liman talebiyle güçleniyor; EUR/CHF aşağı baskı',
    'EUR/PLN': 'PLN göreceli güçlü; NBP politikası destekleyici',
    'AUD/USD': 'AUD commodity desteğiyle toparlanma potansiyeli; Çin talebi belirleyici',
    'USD/CAD': 'CAD petrol fiyatlarıyla destekli; USD/CAD aşağı yönlü',
    'USD/CNY': 'CNY kademeli güçlenme beklentisi; Çin politika desteği'
  }},
  '2025-07-22': { theme: 'USD geçici toparlanma', pairs: {
    'EUR/USD': 'USD toparlanması geçici; EUR/USD trendinin henüz başında olduğu değerlendiriliyor',
    'EUR/SEK': 'Enflasyon sürprizi Riksbank\'ı zor durumda bıraktı; SEK\'e etkisi belirsiz',
    'EUR/NOK': 'NOK zayıf; uzun vadeli EUR/NOK yükseliş trendi sürecek diyor',
    'EUR/DKK': 'EUR/DKK dar bant içinde; hedge etkileri devam ediyor',
    'EUR/GBP': 'GBP İngiltere verilerine duyarlı; zayıflık beklentisi devam',
    'USD/JPY': 'Fed-BoJ faiz farkı daralıyor; USD/JPY düşüş trendi',
    'EUR/CHF': 'CHF güvenli liman talebi artıyor; EUR/CHF aşağı baskı sürecek',
    'EUR/PLN': 'PLN makro temelleri güçlü; EUR/PLN stabil',
    'AUD/USD': 'AUD RBA tutumu ve commodity desteğiyle olumlu',
    'USD/CAD': 'CAD petrol bağlantısı; USD/CAD dar bantta',
    'USD/CNY': 'CNY politika desteğiyle kademeli değerlenme'
  }},
  '2025-08-19': { theme: 'SEK ve NOK\'a negatif', pairs: {
    'EUR/USD': 'EUR/USD yükseliş trendi bozulmamış; reel faiz geçici USD desteği',
    'EUR/SEK': 'SEK\'te döngüsel ve yapısal ters rüzgarlar sürüyor; EUR/SEK yükselecek',
    'EUR/NOK': 'NOK\'ta 12.00 üzeri hedefleniyor; enerji desteği yetersiz kalacak',
    'EUR/DKK': 'EUR/DKK\'da carry etkisi geri döndü; dar bant korunuyor',
    'EUR/GBP': 'BoE 25bp indirdi ama GBP zayıf kalmaya devam ediyor',
    'USD/JPY': 'Daralan faiz farkı USD/JPY\'yi aşağı çekecek',
    'EUR/CHF': 'CHF güçlenme trendi devam; EUR/CHF 0.91 hedefli',
    'EUR/PLN': 'PLN dirençli; EUR/PLN aşağı yönlü hafif baskı',
    'AUD/USD': 'AUD RBA politikası ile destekli; yükseliş potansiyeli var',
    'USD/CAD': 'USD/CAD hafif düşüş bekleniyor; CAD stabil',
    'USD/CNY': 'CNY\'de hızlanan değerlenme; Çin teşvikleri destekleyici'
  }},
  '2025-09-19': { theme: 'reel faiz USD destekliyor', pairs: {
    'EUR/USD': 'Reel faiz toparlanması kısa vadede USD destekliyor; stratejik yükseliş bozulmadı',
    'EUR/SEK': 'İsveç ekonomisi yavaşladı; EUR/SEK taktiksel ve stratejik yükseliş potansiyeli',
    'EUR/NOK': 'NOK küresel yatırım ortamına hassas; EUR/NOK trend yukarı',
    'EUR/DKK': 'Fransa belirsizliği EUR/DKK\'ya sıçramadı; stabil görünüm',
    'EUR/GBP': 'İngiltere zayıf; EUR/GBP yükseliş potansiyeli mevcut',
    'USD/JPY': 'Fed indirimi döngüsünde USD/JPY düşüş bekleniyor',
    'EUR/CHF': 'CHF güvenli liman; EUR/CHF düşüş trendi sürecek',
    'EUR/PLN': 'PLN dahili dinamiklerle destekli',
    'AUD/USD': 'AUD Çin ekonomisine duyarlı; kısa vade stabil',
    'USD/CAD': 'CAD ticaret savaşına duyarlı; USD/CAD yükseliş riski',
    'USD/CNY': 'CNY kademeli değerlenme sürecek'
  }},
  '2025-10-21': { theme: 'EUR/DKK yukarı baskı', pairs: {
    'EUR/USD': 'EUR/USD taktiksel düşüş ama stratejik yükseliş; 2026 hedefler korunuyor',
    'EUR/SEK': 'Sermaye akışı dengesi SEK aleyhine; EUR/SEK yükselecek',
    'EUR/NOK': 'Uzun vadeli EUR/NOK trendi yukarı; yıl sonu hareket potansiyeli',
    'EUR/DKK': 'EUR/DKK yukarı baskı; Almanya mali genişlemesi ve hedge oranları etkili',
    'EUR/GBP': 'GBP İngiltere ekonomik verilerine duyarlı; zayıf seyir',
    'USD/JPY': 'USD/JPY yüksek kalmaya devam; Japonya politika belirsizliği',
    'EUR/CHF': 'CHF güçleniyor; EUR/CHF düşüş trendi devam',
    'EUR/PLN': 'PLN stabil; EUR/PLN dar bantta',
    'AUD/USD': 'AUD commodity fiyatlarıyla destekli',
    'USD/CAD': 'USD/CAD tarife riskiyle yukarı yönlü',
    'USD/CNY': 'CNY düşüş trendi hızlanıyor'
  }},
  '2025-11-18': { theme: 'USD AI sorunlarını atlatacak', pairs: {
    'EUR/USD': 'USD AI değerleme sorunlarını kısa vadede atlatacak; orta vadede zayıflık sürecek',
    'EUR/SEK': 'SEK\'te karışık sinyaller; Riksbank ve enflasyon çelişkisi',
    'EUR/NOK': 'EUR/NOK yıl sonu yukarı hareket potansiyeli; trend sürecek',
    'EUR/DKK': 'EUR/DKK zirveden hafif gerileme ama yüksek kalacak',
    'EUR/GBP': 'GBP zayıf ekonomi ile baskılanıyor; EUR/GBP yükselecek',
    'USD/JPY': 'USD/JPY faiz farkı daralmasıyla aşağı yönlü',
    'EUR/CHF': 'CHF güvenli liman talebiyle güçlü; EUR/CHF düşüş',
    'EUR/PLN': 'PLN stabil makro ortam; EUR/PLN dar bant',
    'AUD/USD': 'AUD Çin talebi ve commodity desteğiyle olumlu',
    'USD/CAD': 'CAD düşük volatilite; negatif seyir bekleniyor',
    'USD/CNY': 'CNY güçlenme trendi hızlanıyor; Çin desteği sürecek'
  }},
  '2025-12-19': { theme: '2026 USD GBP NOK zayıf', pairs: {
    'EUR/USD': '2026\'da USD zayıflayacak; EUR/USD yükseliş yörüngesi korunuyor',
    'EUR/SEK': '2026\'da EUR/SEK daha nötr görünüm; İsveç ekonomisi iyileşme sinyalleri',
    'EUR/NOK': '2026\'da da yüksek EUR/NOK; NOK yapısal zayıflık devam',
    'EUR/DKK': 'EUR/DKK dar bantta ama yukarı yönlü riskler mevcut',
    'EUR/GBP': 'GBP 2026\'ya zayıf giriyor; EUR/GBP yükselecek',
    'USD/JPY': 'USD/JPY stratejik düşüş trendi; 2026 hedef düşük',
    'EUR/CHF': 'CHF güvenli liman; EUR/CHF düşmeye devam',
    'EUR/PLN': 'PLN\'e ılımlı yükseliş öneriliyor',
    'AUD/USD': 'AUD commodity desteğiyle olumlu; yükseliş potansiyeli',
    'USD/CAD': 'CAD resesyon riskiyle karışık; USD/CAD stabil',
    'USD/CNY': 'CNY düşüş trendi sürecek; yuan güçleniyor'
  }},
  '2026-01-19': { theme: 'jeopolitik ön planda', pairs: {
    'EUR/USD': 'Jeopolitik riskler artıyor; EUR/USD yükseliş yörüngesi sürüyor',
    'EUR/SEK': 'SEK kısa vadede aşırı satıldı; toparlanma potansiyeli var',
    'EUR/NOK': 'EUR/NOK Ocak düşüşü geçici; uzun vadeli trend yukarı',
    'EUR/DKK': 'EUR/DKK müdahale seviyesine yaklaştı; DN riski mevcut',
    'EUR/GBP': 'GBP İngiltere politika belirsizliğiyle baskıda',
    'USD/JPY': 'USD/JPY siyasi gelişmelere bağlı; aşağı yönlü',
    'EUR/CHF': 'CHF güvenli liman; jeopolitik artışla güçleniyor',
    'EUR/PLN': 'PLN stabil; bölgesel riskler sınırlı',
    'AUD/USD': 'AUD risk iştahına duyarlı; kısa vade yükseliş',
    'USD/CAD': 'CAD enerji fiyatlarıyla destekli; USD/CAD düşüyor',
    'USD/CNY': 'CNY hızlanan değerlenme; Çin büyüme desteği'
  }},
  '2026-02-17': { theme: 'dolar skeptisizmi', pairs: {
    'EUR/USD': 'Dolar şüpheciliği devam; EUR/USD 1.25 hedefini koruyor',
    'EUR/SEK': 'SEK güçlenmesi Riksbank\'ı zorluyor; kısa vade stabil',
    'EUR/NOK': 'NOK enerji fiyatlarıyla güçlendi; geçici olabilir',
    'EUR/DKK': 'EUR/DKK temettü sezonu öncesi yukarı baskı devam',
    'EUR/GBP': 'GBP zayıf; EUR/GBP yükselecek',
    'USD/JPY': 'USD/JPY düşüş trendi güçlü; BoJ normalleşme',
    'EUR/CHF': 'CHF güçlenme ivme kazandı; EUR/CHF düşüyor',
    'EUR/PLN': 'PLN stabil; EUR/PLN dar bantta',
    'AUD/USD': 'AUD olumlu; düşüşten toparlanma bekleniyor',
    'USD/CAD': 'CAD tarife riskiyle karışık; USD/CAD stabil',
    'USD/CNY': 'CNY trend aşağı yönde devam; yuan güçlü'
  }},
  '2026-03-20': { theme: 'enerji şoku', pairs: {
    'EUR/USD': 'Enerji şoku kısa vadede USD destekliyor; 12M\'de 1.22 hedef',
    'EUR/SEK': 'Jeopolitik gelişmeler ve temettü dönemi EUR/SEK\'i etkiliyor',
    'EUR/NOK': 'NOK tamamen enerji fiyatlarının elinde; petrol belirleyici',
    'EUR/DKK': 'EUR/DKK rekor seviyelerde; DN müdahale riski yüksek',
    'EUR/GBP': 'GBP enerji şokuyla baskıda; EUR/GBP yükseliyor',
    'USD/JPY': 'Enerji şoku USD/JPY\'yi yüksekte tutuyor; Japonya ithalatı artıyor',
    'EUR/CHF': 'CHF enerji şokuna rağmen güçlü; güvenli liman',
    'EUR/PLN': 'PLN bölgesel enerji riskiyle baskıda',
    'AUD/USD': 'AUD enerji ve commodity ihracatçısı; güçlü',
    'USD/CAD': 'CAD enerji ihracatçısı avantajı; USD/CAD düşüyor',
    'USD/CNY': 'CNY enerji şoku etkisiyle hafif zayıf; trend düşüyor'
  }}
};

// ICBC stock theses (brief per stock)
const icbcStockTheses = {
  'AEFES.IS': 'Bira ve içecek sektöründe büyüme; Rusya ve Türkiye operasyonları',
  'AKBNK.IS': 'Özel bankacılıkta lider; marj iyileşmesi ve varlık kalitesi güçlü',
  'BIMAS.IS': 'Enflasyon ortamında ucuz perakende talebi; defansif büyüme',
  'CCOLA.IS': 'Güçlü fiyatlama gücü, düşük borçluluk; Türkiye ve bölge büyümesi',
  'FROTO.IS': 'Ertelenmiş talep ve elektrikli araca geçiş; kapasite yatırımı devam',
  'GARAN.IS': 'Garanti BBVA bankacılıkta güçlü; yabancı yatırımcı favorisi',
  'ISCTR.IS': 'İş Bankası holdingin katkısı; bankacılıkta değerleme fırsatı',
  'MAVI.IS': 'Perakende giyim; 3Q en güçlü sezon, uluslararası genişleme',
  'MGROS.IS': 'Gıda perakende; enflasyon ortamında güçlü büyüme',
  'PGSUS.IS': 'Pegasus havacılık; güçlü yurt dışı trafik büyümesi',
  'SAHOL.IS': 'Holding iskontosu; çeşitli portföy ve yabancı yatırımcı ilgisi',
  'TAVHL.IS': 'Havalimanı işletmecisi; yolcu trafiği büyümesi ve TAV Airports',
  'TCELL.IS': 'Telekom; TÜFE\'ye endeksli gelir büyümesi ve dijital hizmetler',
  'THYAO.IS': 'Türk Hava Yolları; küresel genişleme ve güçlü trafik',
  'TOASO.IS': 'Tofaş otomotiv; içe pazar ve ihracat dengesi',
  'TSKB.IS': 'Kalkınma bankacılığı; güçlü marj yapısı ve düşük NPL',
  'VAKBN.IS': 'Kamu bankacılığı; kredi büyümesi potansiyeli',
  'YKBNK.IS': 'Yapı Kredi bankacılık; marj iyileşmesi ve dijital dönüşüm',
  'ULKER.IS': 'Gıda; güçlü marka portföyü ve ihracat büyümesi',
  'TUPRS.IS': 'Rafineri; enerji fiyatları ve kapasite kullanımı',
  'SISE.IS': 'Şişecam cam ve kimya; dünya genelinde üretim kapasitesi',
  'KCHOL.IS': 'Koç Holding; çeşitli portföy, enerji ve otomotiv ağırlıklı',
  'ASELS.IS': 'ASELSAN savunma; devlet sipariş garantisi ve ihracat potansiyeli',
  'DOHOL.IS': 'Doğan Holding; medya ve enerji yatırımları, holding iskontosu azalacak',
  'KOZAL.IS': 'Altın madenciliği; altın fiyatlarından doğrudan fayda',
  'ENKAI.IS': 'İnşaat ve enerji; yurt dışı projeler ve güçlü bilanço',
  'HEKTS.IS': 'Tarım kimyasalları; tarım sektörü büyümesi',
  'SASA.IS': 'Petrokimya; kapasite artışı ve ihracat potansiyeli',
  'TTKOM.IS': 'Türk Telekom; sabit hat ve fiber altyapı yatırımları',
  'VESTL.IS': 'Beyaz eşya; ihracat odaklı büyüme'
};

// Report-specific context for ICBC (the specific thesis per report)
const icbcReportContext = {
  '2023-08-28': 'Ağustos 2023 portföyü; enflasyon ortamında seçici hisseler',
  '2023-09-18': 'Eylül 2023; ISCTR çıkarıldı, bankacılık hedefleri belirlendi',
  '2023-10-02': 'Ekim 2023; portföy 10 hisseye daraltıldı, CCOLA ve FROTO hedef yükseltme',
  '2023-10-16': 'Ekim 2023 güncelleme; AEFES geri eklendi, 3Q23 katalizör',
  '2024-06-25': 'Haziran 2024 kapsamlı güncelleme; BIST100 hedef 14.000',
  '2024-10-22': 'Ekim 2024; BIST100 hedef 12.500, düzeltme sonrası fırsat',
  '2024-12-30': 'Aralık 2024; AEFES Rusya riski nedeniyle çıkarıldı',
  '2025-01-22': '2025 Strateji; gevşeme döngüsü teması, BIST100 hedef 12.500',
  '2025-07-25': 'Temmuz 2025; BIST100 hedef 13.500\'e yükseltildi, ISCTR ve SAHOL eklendi',
  '2025-10-02': 'Ekim 2025; 9 hisseye daraltıldı, savunmacı portföy',
  '2026-01-22': '2026 Strateji; BIST100 hedef 15.000, makro iyileşme beklentisi',
  '2026-03-11': 'Mart 2026; TSKB ve DOHOL eklendi, PGSUS çıkarıldı, BIMAS hedef artışı'
};

// Transcript theses
const transcriptTheses = {
  'XAG/USD_2026-02-15': 'Gümüş $32.5 spot\'tan uzun vadede $98/oz hedefli; fiziki birikim stratejisi 2028\'e kadar',
  'XAU/USD_2026-03-22': 'Altın düzeltme sonrası $4000 destek; $4500-5000 aralığında yeni zirveler bekleniyor',
  'XAG/USD_2026-03-22': 'Gümüş $65 güçlü destek, $73\'e kısa vade toparlanma hedefli; fiziki alım fırsatı',
  'XAU/USD_2026-03-29': 'Altın $4100 desteğinden $4500 hedefli toparlanma; fırsat penceresi açık',
  'XAG/USD_2026-04-11': 'Gümüş $73\'ten $90 hedefli yükseliş bekleniyor; güçlü momentum devam',
  'XAU/USD_2026-04-12': 'Altın $4600\'den $5000 hedefli yeni dalga; düzeltme sonrası güçlü çıkış',
  'XU100.IS_2026-03-14': 'BIST100 8700 seviyesinden seçici alım fırsatları; pozisyon yönetimi kritik'
};

function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function getDirection(spot, target) {
  if (target > spot) return 'UP';
  if (target < spot) return 'DOWN';
  return 'FLAT';
}

function yonIsabeti(spot, forecast, actual) {
  if (actual == null || forecast == null) return '⏳';
  const forecastDir = getDirection(spot, forecast);
  const actualDir = getDirection(spot, actual);
  if (forecastDir === 'FLAT') {
    // "Sabit" tahmin - ±%0.5 tolerans
    const pct = Math.abs((actual - spot) / spot) * 100;
    return pct <= 0.5 ? '✅' : '❌';
  }
  if (forecastDir === actualDir) return '✅';
  if (actualDir === 'FLAT') return '⚠️';
  return '❌';
}

function getAnalyst(entry) {
  if (entry.institution === 'Danske Bank') {
    return danskeAnalysts[entry.pair] || 'Danske Bank Ekip';
  }
  if (entry.institution === 'ICBC Yatırım') {
    return 'ICBC Yatırım Araştırma Ekibi';
  }
  return 'Devrim Akyıl';
}

function getFormat(entry) {
  if (entry.institution === 'Devrim Akyıl') return 'Video';
  return 'PDF';
}

function getAnalizTezi(entry) {
  if (entry.institution === 'Danske Bank') {
    const ctx = danskeContext[entry.date];
    if (ctx && ctx.pairs[entry.pair]) {
      return ctx.pairs[entry.pair];
    }
    // Fallback: generate from data
    const dir = entry.forecast12m > entry.spot ? 'yükseliş' : entry.forecast12m < entry.spot ? 'düşüş' : 'nötr';
    return `${entry.pair} ${dir} beklentisi; spot ${entry.spot}`;
  }
  if (entry.institution === 'ICBC Yatırım') {
    const stockBase = icbcStockTheses[entry.pair] || entry.pair;
    const reportCtx = icbcReportContext[entry.date] || '';
    const target = entry.forecast12m;
    const pct = ((target - entry.spot) / entry.spot * 100).toFixed(0);
    return `${stockBase}. Hedef ${target.toFixed(2)} TL (%${pct} potansiyel). ${reportCtx}`;
  }
  // Transcript
  const key = `${entry.pair}_${entry.date}`;
  return transcriptTheses[key] || `${entry.pair} sözel tahmin; Devrim Akyıl değerlendirmesi`;
}

function escCsv(s) {
  if (s == null) return '';
  const str = String(s);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const header = ['Tahmin Tarihi','Kurum','Analist','Format','Belge Adı','Varlık','Vade','Hedef Tarihi','Spot Fiyat','Hedef Fiyat','Analiz Tezi','Gerçekleşen Fiyat','Sapma (pip)','Yön İsabeti'];
const rows = [header.map(escCsv).join(',')];

const timeframes = [
  { key: '1m', label: '+1M', months: 1 },
  { key: '3m', label: '+3M', months: 3 },
  { key: '6m', label: '+6M', months: 6 },
  { key: '12m', label: '+12M', months: 12 }
];

let totalRows = 0;

for (const entry of data) {
  const analyst = getAnalyst(entry);
  const format = getFormat(entry);
  const tezi = getAnalizTezi(entry);

  for (const tf of timeframes) {
    const forecast = entry[`forecast${tf.key}`];
    if (forecast == null) continue;

    const actual = entry[`actual${tf.key}`];
    const devPips = entry[`deviation${tf.key}_pips`];
    const devPct = entry[`deviation${tf.key}_pct`];
    const hedefTarihi = addMonths(entry.date, tf.months);
    const yon = yonIsabeti(entry.spot, forecast, actual);

    // Format spot and forecast based on pair type
    let spotStr, forecastStr, actualStr;
    if (entry.pair.endsWith('.IS')) {
      spotStr = entry.spot.toFixed(2);
      forecastStr = forecast.toFixed(2);
      actualStr = actual != null ? actual.toFixed(2) : '';
    } else {
      // FX pair - use appropriate decimal places
      const isCross = entry.pair.includes('JPY') || entry.pair.includes('HUF') || entry.pair.includes('CZK') || entry.pair.includes('TRY') || entry.pair.includes('SEK') || entry.pair.includes('NOK') || entry.pair.includes('DKK') || entry.pair.includes('PLN') || entry.pair.includes('CNY');
      const dec = isCross ? 2 : 4;
      spotStr = entry.spot.toFixed(dec);
      forecastStr = forecast.toFixed(dec);
      actualStr = actual != null ? actual.toFixed(dec) : '';
    }

    const sapmaStr = devPips != null ? `${devPips} pip (${devPct})` : '';

    const row = [
      entry.date,
      entry.institution,
      analyst,
      format,
      entry.documentName,
      entry.pair,
      tf.label,
      hedefTarihi,
      spotStr,
      forecastStr,
      tezi,
      actualStr,
      sapmaStr,
      yon
    ];
    rows.push(row.map(escCsv).join(','));
    totalRows++;
  }
}

writeFileSync('analizler/tahminler.csv', rows.join('\n'), 'utf8');
console.log(`tahminler.csv: ${totalRows} satır oluşturuldu (header hariç)`);

// Count by institution
const instCounts = {};
for (const entry of data) {
  for (const tf of timeframes) {
    if (entry[`forecast${tf.key}`] != null) {
      instCounts[entry.institution] = (instCounts[entry.institution] || 0) + 1;
    }
  }
}
console.log('Kurum bazlı:');
for (const [k, v] of Object.entries(instCounts)) {
  console.log(`  ${k}: ${v} satır`);
}
