global.window=globalThis;require('./mandatory-data.js');require('./mandatory-matcher.js');
const tests=[
['بطارية سيارة 12 فولت',['2154']],['بطارية رصاص حمض',['2129']],['مولد غاز للمرفق',['2233']],['مولد ديزل احتياطي',['2152']],
['اير كمبروسر صناعي',['2268']],['كمبروسر هواء صناعي',['2268']],['مروحة شفط كهربائية',['2124']],['شفاط كهربائي',['2124']],
['لوحة DB رئيسية',['2096']],['لوحة توزيع DB',['2096']],['لوحة سويتش بورد',['2084']],['ترانس 33KV',['2080']],['ترانس 132KV',['2115']],
['كيبل ميديم فولت',['2083']],['كيبل هاي فولت 132KV',['2105']],['قاطع غازي',['2157']],['قاطع هوائي',['2265']],['قاطع تيار عام',['2294']],
['بال فالف مياه',['2119']],['فالف بوابة',['2118']],['شيك فالف خط مياه',['2120']],['باترفلاي فالف مياه',['2122']],['نيدل فالف صناعي',['2370']],
['مكيف صحراوي',['2187']],['سبليت AC',['2078']],['دكت HVAC',['2079']],['عزل دكت HVAC',['2075']],['عزل مواسير HVAC',['2076']],
['زجاج تمبرد',['2186']],['قزاز فلوت',['2142']],['زجاج عائم',['2142']],['سيراميك ارضيات',['2353']],['بورسلان ارضيات',['2354']],['white cement',['2123']],
['مذيب بوية',['6020']],['تنر للدهان',['6020']],['منظف شبابيك',['3002']],['window glass cleaner',['3002']],['منظف مرحاض',['3009']],['كلينر عام',['3010']],
['ورق كاشير حراري',['2612']],['ورق برنتر كمبيوتر',['3203']],['تونر فاكس',['3210']],['ثلاجة منزل',['2550']],['غسالة بيت',['2553']],
['لابتوب أعمال',null],['ماوس كمبيوتر',null],['فلتر زيت هيدروليك',null],['كرسي مكتب',null],['جوال ذكي',null]
];
let pos=0,top=0,top3=0,neg=0,badAuto=0;const rows=[];
for(const [q,exp] of tests){const m=MandatoryMatcher.match(q,MANDATORY_LIST,{topN:3}),cs=m.candidates.map(x=>String(x.code));let result;if(exp){pos++;if(exp.includes(cs[0])){top++;top3++;result='TOP_OK'}else if(cs.some(c=>exp.includes(c))){top3++;result='TOP3'}else result='MISS'}else{neg++;if(m.status==='match'){badAuto++;result='BAD_AUTO'}else result='SAFE'};rows.push({q,exp:exp?.join('/')||'',result,status:m.status,confidence:Math.round(m.confidence*100),top:cs[0]||'',name:m.candidates[0]?.ar||'',top3:cs.join('/')});}
console.log(JSON.stringify({total:tests.length,pos,top,topRate:(top/pos*100).toFixed(1),top3,top3Rate:(top3/pos*100).toFixed(1),neg,badAuto},null,2));
for(const r of rows.filter(x=>!['TOP_OK','SAFE'].includes(x.result)))console.log(`${r.result}\t${r.q}\texp=${r.exp}\ttop=${r.top} ${r.name}\t${r.top3}\t${r.status} ${r.confidence}%`);
require('fs').writeFileSync('HOLDOUT-TEST-v0.3.json',JSON.stringify(rows,null,2));
