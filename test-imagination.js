global.window=globalThis;
require('./mandatory-data.js');
require('./mandatory-matcher.js');
const fs=require('fs');
const csv=fs.readFileSync('/mnt/data/mandatory-list-imagination-test-results.csv','utf8');
function parseCsv(s){const rows=[];let row=[],cur='',q=false;for(let i=0;i<s.length;i++){const ch=s[i];if(ch==='"'){if(q&&s[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(ch===','&&!q){row.push(cur);cur='';}else if((ch==='\n'||ch==='\r')&&!q){if(ch==='\r'&&s[i+1]==='\n')i++;row.push(cur);rows.push(row);row=[];cur='';}else cur+=ch;}if(cur||row.length){row.push(cur);rows.push(row);}const h=rows.shift();return rows.filter(r=>r.length).map(r=>Object.fromEntries(h.map((x,i)=>[x,r[i]??''])));}
const rows=parseCsv(csv);let top=0,top3=0,wrongAuto=0,positives=0,negatives=0;const out=[];
for(const r of rows){const m=MandatoryMatcher.match(r.query,MANDATORY_LIST,{topN:3}); const codes=m.candidates.map(x=>String(x.code)); const expected=String(r.expected||'').trim(); const neg=!expected||expected==='nan'||expected==='NaN'; let outcome;
 if(neg){negatives++; if(m.status==='match') {outcome='BAD_AUTO';wrongAuto++;} else outcome='CONSERVATIVE';}
 else {positives++; const es=expected.split('/'); if(es.includes(codes[0])){outcome='TOP_OK';top++;top3++;} else if(codes.some(c=>es.includes(c))){outcome='TOP3_ONLY';top3++;} else outcome='MISS';}
 out.push({outcome,query:r.query,status:m.status,confidence:Math.round((m.confidence||0)*100),top_code:codes[0]||'',top_name:m.candidates[0]?.ar||'',top3:codes.join('/'),expected});
}
console.log(JSON.stringify({positives,negatives,top,topRate:(top/positives*100).toFixed(1),top3,top3Rate:(top3/positives*100).toFixed(1),wrongAuto},null,2));
for(const r of out.filter(x=>x.outcome==='MISS'||x.outcome==='TOP3_ONLY'||x.outcome==='BAD_AUTO'))console.log(`${r.outcome}\t${r.query}\texp=${r.expected}\ttop=${r.top_code} ${r.top_name}\t${r.top3}\t${r.status} ${r.confidence}%`);
fs.writeFileSync('IMAGINATION-TEST-v0.3.json',JSON.stringify(out,null,2));
