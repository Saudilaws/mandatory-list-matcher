global.window=global;
require('./mandatory-data.js');
require('./mandatory-matcher.js');
const S=require('./semantic-engine.js');
const data=global.MANDATORY_LIST;
let pass=0,fail=0;
function check(name,cond,info=''){if(cond){pass++;console.log('PASS',name,info);}else{fail++;console.error('FAIL',name,info);}}
const cases=[
 ['سترة واقية',['2510','2516','2514'],'review'],
 ['لباس وقاية',['2510','2514'],'review'],
 ['ملابس سلامة',['2514','2510'],'review'],
 ['سترة واقية من الرصاص',['2516'],'match'],
 ['بدلة عازلة للمواد الكيميائية',['2514'],'review'],
 ['حذاء يحمي القدم من الصدمات',['2511'],'review'],
 ['غطاء للرأس للحماية من السقوط',['2502'],'match'],
 ['زي مقاوم للحريق',['2515'],'match'],
 ['سترة عاكسة لعمال الطرق',['2510'],'match']
];
for(const [q,allowed,status] of cases){const r=S.match(q,data,{topN:5});const top=r.candidates[0]?.code;check(q,allowed.includes(top)&&r.status===status,`=> ${r.status} ${top} ${Math.round(r.confidence*100)}%`);}
const winter=S.match('سترة شتوية عادية',data,{topN:5});check('negative ordinary winter vest',winter.status==='none',`=> ${winter.status} ${winter.candidates[0]?.code||'-'}`);
let officialFail=0;
for(const r of data){const x=S.match(r.ar,data,{topN:3});if(x.status!=='match'||!x.candidates.some(c=>String(c.code)===String(r.code)))officialFail++;}
check('all official Arabic names remain retrievable',officialFail===0,`failures=${officialFail}/${data.length}`);
console.log(`\nSEMANTIC PASS=${pass} FAIL=${fail}`);if(fail)process.exit(1);
