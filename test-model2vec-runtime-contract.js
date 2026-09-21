const fs=require('fs');require('./model2vec-local-runtime.js');
const assets={model:fs.readFileSync('./models/zarra_int8/model.safetensors'),tokenizer:fs.readFileSync('./models/zarra_int8/tokenizer.json'),config:fs.readFileSync('./models/zarra_int8/config.json')};
(async()=>{const rt=await global.MarfaModel2VecRuntime.fromBytes(assets); const rows=await rt.encode(['فلتر هواء للمكيف','مرشح هواء لوحدة تكييف','كابل كهربائي للتيار المستمر','𒀀𒀁𒀂']);
function cos(a,b){let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s}
let pass=0,fail=0; function ok(n,c,d=''){console.log((c?'PASS ':'FAIL ')+n+(d?' '+d:''));c?pass++:fail++}
ok('dimension 256',rows.every(x=>x.length===256));
ok('normalized known vectors',rows.slice(0,3).every(v=>Math.abs(Math.hypot(...v)-1)<1e-5));
ok('unknown-only text fails closed to zero vector',Math.hypot(...rows[3])<1e-8);
ok('Arabic paraphrase closer than unrelated electrical text',cos(rows[0],rows[1])>cos(rows[0],rows[2]),`near=${cos(rows[0],rows[1]).toFixed(4)} far=${cos(rows[0],rows[2]).toFixed(4)}`);
console.log(`TOTAL ${pass+fail} PASS ${pass} FAIL ${fail}`);process.exitCode=fail?1:0;})();
