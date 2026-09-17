global.window=global;
require('./mandatory-data.js');
const M=require('./mandatory-matcher.js');
const data=global.MANDATORY_LIST;
function norm(s){return M.normalizeText(s);}
let pass=0, fail=0; const failures=[];
function ok(cond,msg){if(cond){pass++;}else{fail++;failures.push(msg);}}

// Exhaustive self-consistency: every official Arabic and English name must retrieve the same official-name group.
for(const r of data){
  let x=M.match(r.ar,data,{topN:5});
  ok(x.status==='match',`AR status ${r.code} ${r.ar}: ${x.status}`);
  ok(x.candidates.length && norm(x.candidates[0].ar)===norm(r.ar),`AR top group ${r.code} ${r.ar} -> ${x.candidates[0]&&x.candidates[0].ar}`);
  x=M.match(r.en,data,{topN:5});
  ok(x.status==='match',`EN status ${r.code} ${r.en}: ${x.status}`);
  ok(x.candidates.length && norm(x.candidates[0].en)===norm(r.en),`EN top group ${r.code} ${r.en} -> ${x.candidates[0]&&x.candidates[0].en}`);
}

function expect(q,status,codes=[],forbid=[]){
  const r=M.match(q,data,{topN:5}), top=r.candidates[0];
  ok(status.includes(r.status),`${q}: status ${r.status}, expected ${status}`);
  if(codes.length) ok(top&&codes.includes(top.code),`${q}: top ${top&&top.code}, expected ${codes.join('/')}`);
  if(forbid.length) ok(!top||!forbid.includes(top.code),`${q}: forbidden top ${top&&top.code}`);
  console.log(q,'=>',r.status,top&&top.code,top&&top.ar,Math.round((r.confidence||0)*100)+'%');
}
expect('فلتر رملي',['match'],['2253']);
expect('فلتر قهوة',['match'],['2611']);
expect('فلتر وقود سيارة',['match','review'],['3134']);
expect('مرشح وقود',['match','review'],['3134']);
expect('Fuel filter',['match'],['3134']);
expect('فلتر هواء',['match'],['2242','2270']);
expect('فلاتر تكييف',['match','review'],['2242','2270']);
expect('Air conditioning filter',['match','review'],['2242','2270']);
expect('فلتر',['review']);
expect('فلتر زيت للمولد',['none','review'],[],['2242','2270']);
expect('كابل تيار مستمر',['match'],['2272']);
expect('DC cable',['match'],['2272']);
expect('اكسسوارات كيبل جهد منخفض',['match','review'],['2273']);
expect('غطاء ماسورة HDPE',['match','review'],['2300']);
expect('مضخة وقود',['none','review'],[],['3134']);
expect('فلتر غاز',['match','review'],['2341']);
expect('فلتر تفريغ',['match','review'],['2250']);
expect('لمبة',['review']);
expect('ونش',['review']);

console.log(`\nPASS=${pass} FAIL=${fail} TOTAL=${pass+fail}`);
if(fail){console.error(failures.slice(0,60).join('\n'));process.exit(1);} else console.log('ALL TESTS PASSED');
