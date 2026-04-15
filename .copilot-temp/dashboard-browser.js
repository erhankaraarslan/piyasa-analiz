/* ── Helpers ────────────────────────────────────────────────────────────── */
function esc(s){if(!s)return"";return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function linkify(s){if(!s)return"";var t=esc(s);return t.replace(/(https?:\/\/[^\s<"&]+)/gi,function(u){return'<a href="'+u+'" target="_blank" rel="noopener">'+u+'</a>'})}
function truncate(s,n){if(!s)return"";return s.length<=n?s:s.substring(0,n)+"…"}
function getGrade(s){
  if(!s)return"pending";
  if(s.includes("⏳"))return"pending";
  if(s.includes("(A)"))return"A";
  if(s.includes("(B)"))return"B";
  if(s.includes("(C)"))return"C";
  if(s.includes("(D)"))return"D";
  if(s.includes("(F)"))return"F";
  return"pending"
}
function parseScore(s){var n=parseFloat(s);return isNaN(n)?-1:n}
function fmtNum(s){if(!s||s==="—"||s==="⏳")return s||"—";var n=parseFloat(s);return isNaN(n)?s:n.toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:4})}

/* ── Tab Navigation ────────────────────────────────────────────────────── */
var tabBtns=document.querySelectorAll("#nav button");
var tabPanels=document.querySelectorAll(".tab-content");
tabBtns.forEach(function(btn){
  btn.addEventListener("click",function(){
    tabBtns.forEach(function(b){b.classList.remove("active")});
    tabPanels.forEach(function(p){p.classList.remove("active")});
    btn.classList.add("active");
    document.getElementById("tab-"+btn.dataset.tab).classList.add("active");
  });
});

/* ── Chart Colors ──────────────────────────────────────────────────────── */
var gradeColors=["#34d399","#2dd4bf","#fbbf24","#fb923c","#f87171","#636b8a"];
var gradeLabels=["A","B","C","D","F","Bekliyor"];

/* ── Chart: Doc Grades (Doughnut) ──────────────────────────────────────── */
new Chart(document.getElementById("chartDocGrades"),{
  type:"doughnut",
  data:{labels:gradeLabels,datasets:[{data:[DOC_GRADES.A,DOC_GRADES.B,DOC_GRADES.C,DOC_GRADES.D,DOC_GRADES.F,DOC_GRADES.pending],backgroundColor:gradeColors,borderWidth:0}]},
  options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{position:"right",labels:{color:"#9ca3c0",padding:12,font:{size:12}}}}}
});

/* ── Chart: Forecast Grades (Doughnut) ─────────────────────────────────── */
new Chart(document.getElementById("chartForecastGrades"),{
  type:"doughnut",
  data:{labels:gradeLabels,datasets:[{data:[F_GRADES.A,F_GRADES.B,F_GRADES.C,F_GRADES.D,F_GRADES.F,F_GRADES.pending],backgroundColor:gradeColors,borderWidth:0}]},
  options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{position:"right",labels:{color:"#9ca3c0",padding:12,font:{size:12}}}}}
});

/* ── Chart: Recommendation Distribution (Bar) ──────────────────────────── */
var recLabels=Object.keys(REC_DIST).sort();
var recColors={"Strong Buy":"#34d399","Buy":"#6c8cff","Hold":"#fbbf24","Reduce":"#fb923c","Sell":"#f87171","Strong Sell":"#ef4444","⏳":"#636b8a","—":"#636b8a"};
new Chart(document.getElementById("chartRec"),{
  type:"bar",
  data:{labels:recLabels,datasets:[{data:recLabels.map(function(k){return REC_DIST[k]}),backgroundColor:recLabels.map(function(k){return recColors[k]||"#6c8cff"}),borderRadius:6,maxBarThickness:48}]},
  options:{responsive:true,maintainAspectRatio:true,indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#636b8a"},grid:{color:"#2e3347"}},y:{ticks:{color:"#9ca3c0"},grid:{display:false}}}}
});

/* ── Chart: Institution Timeline (Line) ────────────────────────────────── */
var tlColors=["#6c8cff","#4ecdc4","#fbbf24","#f87171","#a78bfa","#fb923c"];
var tlDatasets=[];var ci=0;
Object.keys(INST_TIMELINE).sort().forEach(function(inst){
  var pts=INST_TIMELINE[inst];
  tlDatasets.push({label:inst,data:pts.map(function(p){return{x:p.date,y:p.score}}),borderColor:tlColors[ci%tlColors.length],backgroundColor:tlColors[ci%tlColors.length]+"33",tension:.3,pointRadius:4,pointHoverRadius:7,fill:false});
  ci++;
});
new Chart(document.getElementById("chartTimeline"),{
  type:"line",
  data:{datasets:tlDatasets},
  options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{labels:{color:"#9ca3c0",font:{size:12}}}},scales:{x:{type:"category",ticks:{color:"#636b8a",maxRotation:45},grid:{color:"#2e3347"}},y:{min:0,max:100,ticks:{color:"#636b8a"},grid:{color:"#2e3347"}}}}
});

/* ══════════════════════════════════════════════════════════════════════════
   DOCUMENTS TAB
   ══════════════════════════════════════════════════════════════════════════ */
function renderDocTable(){
  var inst=document.getElementById("docFilterInst").value;
  var fmt=document.getElementById("docFilterFormat").value;
  var sort=document.getElementById("docSort").value;
  var q=(document.getElementById("docSearch").value||"").toLowerCase();

  var items=DOK_SKOR.filter(function(d){
    if(inst&&d["Kurum"]!==inst)return false;
    if(fmt&&d["Format"]!==fmt)return false;
    if(q){
      var blob=(d["Belge Adı"]+d["Yatırım Tezi"]+d["Risk Analizi"]+d["Kurum"]+d["Analistler"]).toLowerCase();
      if(blob.indexOf(q)===-1)return false;
    }
    return true;
  });

  items.sort(function(a,b){
    if(sort==="date-desc")return b["Belge Tarihi"].localeCompare(a["Belge Tarihi"]);
    if(sort==="date-asc")return a["Belge Tarihi"].localeCompare(b["Belge Tarihi"]);
    if(sort==="score-desc")return parseScore(b["Belge Başarı Skoru"])-parseScore(a["Belge Başarı Skoru"]);
    if(sort==="score-asc")return parseScore(a["Belge Başarı Skoru"])-parseScore(b["Belge Başarı Skoru"]);
    return 0;
  });

  /* store for modal reference */
  window._docItems=items;

  var html="";
  items.forEach(function(d,idx){
    var grade=getGrade(d["Belge Başarı Skoru"]);
    var scoreNum=d["Belge Başarı Skoru"]||"—";
    var isabetVal=d["İsabet Oranı %"]||"—";
    var fmtIcon=d["Format"]==="Video"?"🎬":"📄";
    html+='<tr class="doc-row" onclick="openDocModal('+idx+')" style="cursor:pointer">';
    html+='<td>'+esc(d["Belge Tarihi"])+'</td>';
    html+='<td>'+esc(d["Kurum"])+'</td>';
    html+='<td class="doc-name-cell"><span class="fmt-icon">'+fmtIcon+'</span> '+esc(truncate(d["Belge Adı"],50))+'</td>';
    html+='<td>'+esc(d["Format"])+'</td>';
    html+='<td>'+esc(isabetVal)+(isabetVal&&!isNaN(parseFloat(isabetVal))?'%':'')+'</td>';
    html+='<td>'+esc(d["Varlık Sayısı"])+'</td>';
    html+='<td>'+esc(d["Tahmin Sayısı"])+'</td>';
    html+='<td>'+esc(d["Ort. Alpha (Consensus)"])+'</td>';
    html+='<td>'+esc(d["Ort. Alpha (Forward)"])+'</td>';
    html+='<td><span class="score-badge '+grade+'" style="height:28px;min-width:44px;font-size:.75rem">'+esc(scoreNum)+'</span></td>';
    html+='</tr>';
  });
  if(items.length===0)html='<tr><td colspan="10" style="text-align:center;color:#636b8a;padding:24px">Sonuç bulunamadı</td></tr>';
  document.getElementById("docBody").innerHTML=html;
  document.getElementById("docCount").innerHTML='<strong>'+items.length+'</strong> / '+DOK_SKOR.length+' belge gösteriliyor';
}

/** YouTube video linki — doğrudan Kaynak URL veya arama fallback */
function youtubeVideoLink(d){
  var kaynak=d["Kaynak"];
  if(kaynak&&kaynak.indexOf("http")===0)return{url:kaynak,label:"▶ Videoyu İzle"};
  var belgeAdi=d["Belge Adı"],kurum=d["Kurum"];
  if(!belgeAdi||!kurum)return null;
  var q=encodeURIComponent(kurum+" "+belgeAdi);
  return{url:"https://www.youtube.com/results?search_query="+q,label:"▶ YouTube'da Ara"};
}

/* ── Document Detail Modal ─────────────────────────────────────────────── */
function openDocModal(idx){
  var d=window._docItems[idx];if(!d)return;
  var grade=getGrade(d["Belge Başarı Skoru"]);
  var scoreNum=d["Belge Başarı Skoru"]||"—";
  var isabetVal=d["İsabet Oranı %"];
  var isVideo=d["Format"]==="Video";
  var h='<div class="modal-panel">';
  h+='<button class="modal-close" onclick="closeDocModal()">✕</button>';
  h+='<div class="modal-header">';
  h+='<div class="modal-title">'+esc(d["Belge Adı"])+'</div>';
  h+='<div class="modal-meta"><span>📅 '+esc(d["Belge Tarihi"])+'</span><span>🏢 '+esc(d["Kurum"])+'</span><span>👤 '+esc(d["Analistler"])+'</span><span>'+(isVideo?'🎬':'📄')+' '+esc(d["Format"])+'</span>';
  h+='<span class="score-badge '+grade+'" style="margin-left:auto">'+esc(scoreNum)+'</span></span></div>';
  /* YouTube referans link */
  if(isVideo){
    var yt=youtubeVideoLink(d);
    if(yt){
      h+='<div class="modal-ref-links"><a href="'+esc(yt.url)+'" target="_blank" rel="noopener" class="yt-ref-link">'+esc(yt.label)+'</a></div>';
    }
  }
  h+='</div>';
  h+='<div class="modal-stats">';
  h+='<div class="stat"><div class="stat-val">'+esc(isabetVal)+(isabetVal&&!isNaN(parseFloat(isabetVal))?'%':'')+'</div><div class="stat-label">İsabet Oranı</div></div>';
  h+='<div class="stat"><div class="stat-val">'+esc(d["Varlık Sayısı"])+'</div><div class="stat-label">Varlık</div></div>';
  h+='<div class="stat"><div class="stat-val">'+esc(d["Tahmin Sayısı"])+'</div><div class="stat-label">Tahmin</div></div>';
  h+='<div class="stat"><div class="stat-val">'+esc(d["Ort. Alpha (Consensus)"])+'</div><div class="stat-label">α Consensus</div></div>';
  h+='<div class="stat"><div class="stat-val">'+esc(d["Ort. Alpha (Forward)"])+'</div><div class="stat-label">α Forward</div></div>';
  h+='</div>';
  h+='<div class="modal-body">';
  if(d["Özet Metin"])h+='<div class="field"><div class="field-label">Özet</div><div class="field-value">'+linkify(d["Özet Metin"])+'</div></div>';
  if(d["Yatırım Tezi"])h+='<div class="field"><div class="field-label">Yatırım Tezi</div><div class="field-value">'+linkify(d["Yatırım Tezi"])+'</div></div>';
  if(d["Varsayımlar & Gerçekleşme"])h+='<div class="field"><div class="field-label">Varsayımlar & Gerçekleşme</div><div class="field-value">'+linkify(d["Varsayımlar & Gerçekleşme"])+'</div></div>';
  if(d["Varsayım Etkisi"])h+='<div class="field"><div class="field-label">Varsayım Etkisi</div><div class="field-value">'+linkify(d["Varsayım Etkisi"])+'</div></div>';
  if(d["Risk Analizi"])h+='<div class="field"><div class="field-label">Risk Analizi</div><div class="field-value">'+linkify(d["Risk Analizi"])+'</div></div>';

  /* Bu belgeye ait tahminler tablosu */
  var belgeDate=d["Belge Tarihi"];
  var belgeKurum=d["Kurum"];
  var belgeName=d["Belge Adı"];
  var tahminler=TAH_SKOR.filter(function(t){return t["Tahmin Tarihi"]===belgeDate&&t["Kurum"]===belgeKurum});
  if(tahminler.length>0){
    h+='<div class="field"><div class="field-label">Tahminler ('+tahminler.length+')</div>';
    h+='<div class="modal-forecast-table"><table><thead><tr><th>Varlık</th><th>Vade</th><th>Spot</th><th>Hedef</th><th>Gerçekleşen</th><th>MAPE</th><th>İsabet</th><th>Skor</th></tr></thead><tbody>';
    tahminler.forEach(function(t){
      var hit=t["Yön İsabeti"];
      var hitHtml=hit==="1"?'<span class="dir-ok">✓</span>':hit==="0"?'<span class="dir-fail">✗</span>':'<span class="dir-pending">⏳</span>';
      var tGrade=getGrade(t["Başarı Skoru"]);
      h+='<tr>';
      h+='<td><strong>'+esc(t["Varlık"])+'</strong></td>';
      h+='<td>'+esc(t["Vade"])+'</td>';
      h+='<td class="text-right">'+fmtNum(t["Tahmin tarihindeki Fiyat"])+'</td>';
      h+='<td class="text-right">'+fmtNum(t["Hedef Fiyat"])+'</td>';
      h+='<td class="text-right">'+fmtNum(t["Gerçekleşen Fiyat"])+'</td>';
      h+='<td>'+esc(t["Error (MAPE)"])+'</td>';
      h+='<td>'+hitHtml+'</td>';
      h+='<td><span class="score-badge '+tGrade+'" style="height:24px;min-width:36px;font-size:.7rem">'+esc(t["Başarı Skoru"])+'</span></td>';
      h+='</tr>';
    });
    h+='</tbody></table></div></div>';
  }
  h+='</div></div>';
  var overlay=document.getElementById("docModal");
  overlay.innerHTML=h;
  overlay.classList.add("open");
  document.body.style.overflow="hidden";
}
function closeDocModal(){
  var overlay=document.getElementById("docModal");
  overlay.classList.remove("open");
  overlay.innerHTML="";
  document.body.style.overflow="";
}
/* close on overlay click or Escape */
document.getElementById("docModal").addEventListener("click",function(e){if(e.target===this)closeDocModal()});
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeDocModal()});
["docFilterInst","docFilterFormat","docSort"].forEach(function(id){
  document.getElementById(id).addEventListener("change",renderDocTable);
});
document.getElementById("docSearch").addEventListener("input",renderDocTable);
renderDocTable();

/* ══════════════════════════════════════════════════════════════════════════
   FORECASTS TAB
   ══════════════════════════════════════════════════════════════════════════ */
var PAGE_SIZE=50;
var fPage=1;
var fSortCol="Tahmin Tarihi";
var fSortDir=-1;
var fFiltered=[];

function filterForecasts(){
  var pair=document.getElementById("fPair").value;
  var mat=document.getElementById("fMaturity").value;
  var rec=document.getElementById("fRec").value;
  var inst=document.getElementById("fInst").value;
  var q=(document.getElementById("fSearch").value||"").toLowerCase();
  fFiltered=TAH_SKOR.filter(function(r){
    if(pair&&r["Varlık"]!==pair)return false;
    if(mat&&r["Vade"]!==mat)return false;
    if(rec&&r["Öneri"]!==rec)return false;
    if(inst&&r["Kurum"]!==inst)return false;
    if(q){
      var blob=(r["Varlık"]+r["Kurum"]+r["Analist"]+r["Analiz Tezi"]+r["Öneri"]).toLowerCase();
      if(blob.indexOf(q)===-1)return false;
    }
    return true;
  });
  fFiltered.sort(function(a,b){
    var va=a[fSortCol]||"",vb=b[fSortCol]||"";
    var na=parseFloat(va),nb=parseFloat(vb);
    if(!isNaN(na)&&!isNaN(nb))return(na-nb)*fSortDir;
    return va.localeCompare(vb)*fSortDir;
  });
  fPage=1;
  renderForecastTable();
}

function recPillClass(r){
  if(!r)return"pending";
  var m={"Strong Buy":"strong-buy","Buy":"buy","Hold":"hold","Reduce":"reduce","Sell":"sell","Strong Sell":"strong-sell",
    "Strong Bullish":"strong-bullish","Bullish":"bullish","Slightly Bullish":"slightly-bullish","Neutral":"neutral",
    "Slightly Bearish":"slightly-bearish","Bearish":"bearish","Strong Bearish":"strong-bearish",
    "⏳":"pending","—":"pending"};
  return m[r]||"pending"
}

function renderForecastTable(){
  var start=(fPage-1)*PAGE_SIZE;
  var page=fFiltered.slice(start,start+PAGE_SIZE);
  var html="";
  page.forEach(function(r,i){
    var grade=getGrade(r["Başarı Skoru"]);
    var hit=r["Yön İsabeti"];
    var hitHtml=hit==="1"?'<span class="dir-ok">✓</span>':hit==="0"?'<span class="dir-fail">✗</span>':'<span class="dir-pending">⏳</span>';
    var rowId="fRow_"+start+"_"+i;
    html+='<tr class="forecast-row" onclick="toggleFDetail(\''+rowId+'\')" style="cursor:pointer">';
    html+='<td class="sticky-col"><strong>'+esc(r["Varlık"])+"</strong></td>";
    html+='<td><span class="score-badge '+grade+'" style="height:28px;min-width:44px;font-size:.75rem">'+esc(r["Başarı Skoru"])+"</span></td>";
    html+='<td><span class="rec-pill '+recPillClass(r["Öneri"])+'">'+esc(r["Öneri"])+"</span></td>";
    html+="<td>"+hitHtml+"</td>";
    html+="<td>"+esc(r["Tahmin Tarihi"])+"</td>";
    html+="<td>"+esc(r["Kurum"])+"</td>";
    html+="<td>"+esc(r["Analist"])+"</td>";
    html+="<td>"+esc(r["Vade"])+"</td>";
    html+='<td class="text-right">'+fmtNum(r["Hedef Fiyat"])+"</td>";
    html+='<td class="text-right">'+fmtNum(r["Tahmin tarihindeki Fiyat"])+"</td>";
    html+='<td class="text-right">'+fmtNum(r["Gerçekleşen Fiyat"])+"</td>";
    html+="<td>"+esc(r["Beklenen Getiri %"])+"</td>";
    html+="<td>"+esc(r["Gerçekleşen Getiri %"])+"</td>";
    html+="<td>"+esc(r["Error (MAPE)"])+"</td>";
    html+="<td>"+esc(r["Alpha"])+"</td>";
    html+="<td>"+esc(r["Hedef Yön"])+"</td>";
    html+="</tr>";
    /* detail row: Analiz Tezi */
    if(r["Analiz Tezi"]){
      html+='<tr class="detail-row" id="'+rowId+'" style="display:none"><td colspan="16" class="detail-cell"><div class="detail-label">Analiz Tezi</div><div class="detail-text">'+linkify(r["Analiz Tezi"])+'</div></td></tr>';
    };
  });
  if(page.length===0)html='<tr><td colspan="16" style="text-align:center;color:#636b8a;padding:24px">Sonuç bulunamadı</td></tr>';
  document.getElementById("forecastBody").innerHTML=html;
  var cntEl=document.getElementById("fCount");
  if(cntEl)cntEl.innerHTML='<strong>'+fFiltered.length+'</strong> / '+TAH_SKOR.length+' tahmin gösteriliyor';
  renderForecastPagination();
}

function toggleFDetail(id){
  var row=document.getElementById(id);
  if(!row)return;
  row.style.display=row.style.display==="none"?"table-row":"none";
}

function renderForecastPagination(){
  var total=Math.ceil(fFiltered.length/PAGE_SIZE)||1;
  var html='<span class="page-info">'+fFiltered.length+" kayıt · Sayfa "+fPage+"/"+total+"</span>";
  if(total<=1){document.getElementById("forecastPagination").innerHTML=html;return}
  
  var maxBtns=7;
  var startP=Math.max(1,fPage-Math.floor(maxBtns/2));
  var endP=Math.min(total,startP+maxBtns-1);
  if(endP-startP<maxBtns-1)startP=Math.max(1,endP-maxBtns+1);
  
  if(fPage>1)html+='<button onclick="fPage=1;renderForecastTable()">«</button><button onclick="fPage--;renderForecastTable()">‹</button>';
  for(var p=startP;p<=endP;p++){
    html+='<button class="'+(p===fPage?"active":"")+'" onclick="fPage='+p+';renderForecastTable()">'+p+"</button>";
  }
  if(fPage<total)html+='<button onclick="fPage++;renderForecastTable()">›</button><button onclick="fPage='+total+';renderForecastTable()">»</button>';
  document.getElementById("forecastPagination").innerHTML=html;
}

/* Sorting by clicking headers */
document.querySelectorAll("#forecastTable th").forEach(function(th){
  th.addEventListener("click",function(){
    var col=th.dataset.col;
    if(fSortCol===col)fSortDir*=-1;
    else{fSortCol=col;fSortDir=-1}
    document.querySelectorAll("#forecastTable th").forEach(function(t){t.classList.remove("sorted")});
    th.classList.add("sorted");
    th.querySelector(".sort-arrow").textContent=fSortDir===-1?"▼":"▲";
    filterForecasts();
  });
});

["fPair","fMaturity","fRec","fInst"].forEach(function(id){
  document.getElementById(id).addEventListener("change",filterForecasts);
});
document.getElementById("fSearch").addEventListener("input",filterForecasts);
filterForecasts();

/* ══════════════════════════════════════════════════════════════════════════
   PAIRS TAB
   ══════════════════════════════════════════════════════════════════════════ */
function renderPairGrid(){
  var html="";
  Object.keys(PAIR_STATS).sort().forEach(function(pair){
    var s=PAIR_STATS[pair];
    var avgScore=s.scores.length?(s.scores.reduce(function(a,b){return a+b},0)/s.scores.length).toFixed(1):"—";
    var avgMape=s.mape.length?(s.mape.reduce(function(a,b){return a+b},0)/s.mape.length).toFixed(1)+"%":"—";
    var hitRate=s.evaluated?(s.hits/s.evaluated*100).toFixed(0)+"%":"—";
    var grade=getGradeFromNum(parseFloat(avgScore));
    html+='<div class="pair-card" onclick="selectPair(\''+pair.replace(/'/g,"\\'")+'\')">';
    html+='<div class="pair-name"><span>'+esc(pair)+'</span><span class="score-badge '+grade+'" style="font-size:.8rem;height:30px;min-width:40px">'+avgScore+'</span></div>';
    html+='<div class="pair-stats">';
    html+='<div class="ps"><div class="ps-val">'+s.total+'</div><div class="ps-label">Tahmin</div></div>';
    html+='<div class="ps"><div class="ps-val">'+hitRate+'</div><div class="ps-label">İsabet</div></div>';
    html+='<div class="ps"><div class="ps-val">'+avgMape+'</div><div class="ps-label">Ort. MAPE</div></div>';
    html+='<div class="ps"><div class="ps-val">'+s.evaluated+'/'+s.total+'</div><div class="ps-label">Değerlendi</div></div>';
    html+='</div></div>';
  });
  document.getElementById("pairGrid").innerHTML=html;
}

function getGradeFromNum(n){
  if(isNaN(n)||n<0)return"pending";
  if(n>=80)return"A";
  if(n>=65)return"B";
  if(n>=50)return"C";
  if(n>=35)return"D";
  return"F"
}

var pairChart=null;
function selectPair(pair){
  document.getElementById("pairSelect").value=pair;
  renderPairChart(pair);
  document.getElementById("chartPairDetail").scrollIntoView({behavior:"smooth",block:"center"});
}

function renderPairChart(pair){
  var rows=TAH_SKOR.filter(function(r){return r["Varlık"]===pair});
  if(!rows.length)return;
  rows.sort(function(a,b){return(a["Tahmin Tarihi"]+a["Vade"]).localeCompare(b["Tahmin Tarihi"]+b["Vade"])});

  var labels=[];var hedef=[];var spot=[];var gerceklesen=[];
  rows.forEach(function(r){
    var lbl=r["Tahmin Tarihi"]+" ("+r["Vade"]+")";
    labels.push(lbl);
    hedef.push(parseFloat(r["Hedef Fiyat"])||null);
    spot.push(parseFloat(r["Tahmin tarihindeki Fiyat"])||null);
    var gf=parseFloat(r["Gerçekleşen Fiyat"]);
    gerceklesen.push(isNaN(gf)?null:gf);
  });

  var ctx=document.getElementById("chartPairDetail");
  if(pairChart)pairChart.destroy();
  pairChart=new Chart(ctx,{
    type:"line",
    data:{
      labels:labels,
      datasets:[
        {label:"Hedef Fiyat",data:hedef,borderColor:"#6c8cff",backgroundColor:"#6c8cff33",tension:.3,pointRadius:3},
        {label:"Spot Fiyat",data:spot,borderColor:"#fbbf24",backgroundColor:"#fbbf2433",tension:.3,pointRadius:3},
        {label:"Gerçekleşen Fiyat",data:gerceklesen,borderColor:"#34d399",backgroundColor:"#34d39933",tension:.3,pointRadius:3}
      ]
    },
    options:{
      responsive:true,
      plugins:{legend:{labels:{color:"#9ca3c0",font:{size:12}}},title:{display:true,text:pair+" — Fiyat Karşılaştırması",color:"#e4e6f0",font:{size:14}}},
      scales:{x:{ticks:{color:"#636b8a",maxRotation:60,font:{size:10}},grid:{color:"#2e3347"}},y:{ticks:{color:"#636b8a"},grid:{color:"#2e3347"}}}
    }
  });
}

document.getElementById("pairSelect").addEventListener("change",function(){renderPairChart(this.value)});
renderPairGrid();
/* Render first pair chart */
var firstPair=document.getElementById("pairSelect").value||Object.keys(PAIR_STATS).sort()[0];
if(firstPair)renderPairChart(firstPair);
