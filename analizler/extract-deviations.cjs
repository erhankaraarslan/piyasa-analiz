const d=JSON.parse(require('fs').readFileSync('analizler/forecasts-results.json','utf-8'));
const byDoc={};
for(const r of d){
  const k=r.institution+'|'+r.documentName;
  if(!byDoc[k]) byDoc[k]={pairs:[]};
  if(r.deviation1m_pips!==null)
    byDoc[k].pairs.push(r.pair+' +1M: '+(r.deviation1m_pips>0?'+':'')+r.deviation1m_pips+' pip ('+r.deviation1m_pct+')');
}
for(const[k,v] of Object.entries(byDoc)){
  if(v.pairs.length>0) console.log(k+': '+v.pairs.slice(0,4).join('; ')+(v.pairs.length>4?' ...+'+(v.pairs.length-4)+' more':''));
  else console.log(k+': (henüz veri yok)');
}
