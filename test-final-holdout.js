global.window=globalThis;require('./mandatory-data.js');require('./mandatory-matcher.js');
const tests=[
['بطارية للمركبة',['2154']],['مروحة رديتر السيارة',['3131']],['ونش علوي للمصنع',['2237']],['عداد موية',['2163']],['عداد كهرب ذكي',['2191']],
['كيابل بحرية',['2364']],['زيت ترانس عازل',['6023']],['مناديل للوجه',['2610']],['اكياس ورقية',['2602']],['صواني ورق',['2605']],
['يد باب',['2366']],['شباك مبنى',['2036']],['سخان موية مركزي',['2181']],['طقم بامب حريق',['2127']],['فوم اطفاء',['2282']],['سيستم اخماد حريق',['2296']],
['كوع ماسورة PVC',['2204']],['كوع HDPE',['2360']],['كوبلن HDPE',['2359']],['كاب ماسورة HDPE',['2300']],['مزيل رست',['3083']],['زيت قطع مكائن',['6053']],['شحم ضد التآكل',['6057']],
['سماعة بلوتوث',null],['كاميرا جوال',null],['فلتر زيت قير',null],['طاولة مكتب',null],['حذاء سلامة',null]
];
let pos=0,top=0,top3=0,neg=0,badAuto=0;const rows=[];
for(const [q,exp] of tests){const m=MandatoryMatcher.match(q,MANDATORY_LIST,{topN:3}),cs=m.candidates.map(x=>String(x.code));let result;if(exp){pos++;if(exp.includes(cs[0])){top++;top3++;result='TOP_OK'}else if(cs.some(c=>exp.includes(c))){top3++;result='TOP3'}else result='MISS'}else{neg++;if(m.status==='match'){badAuto++;result='BAD_AUTO'}else result='SAFE'};rows.push({q,exp:exp?.join('/')||'',result,status:m.status,confidence:Math.round(m.confidence*100),top:cs[0]||'',name:m.candidates[0]?.ar||'',top3:cs.join('/')});}
console.log(JSON.stringify({total:tests.length,pos,top,topRate:(top/pos*100).toFixed(1),top3,top3Rate:(top3/pos*100).toFixed(1),neg,badAuto},null,2));
for(const r of rows.filter(x=>!['TOP_OK','SAFE'].includes(x.result)))console.log(`${r.result}\t${r.q}\texp=${r.exp}\ttop=${r.top} ${r.name}\t${r.top3}\t${r.status} ${r.confidence}%`);
require('fs').writeFileSync('FINAL-HOLDOUT-v0.3.json',JSON.stringify(rows,null,2));
