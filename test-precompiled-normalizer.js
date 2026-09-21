const fs=require('fs');require('./model2vec-local-runtime.js');
const tok=JSON.parse(fs.readFileSync('./models/zarra_int8/tokenizer.json','utf8'));
// Access normalizer indirectly through a tiny mirrored loader contract is not exported; verify via embeddings
(async()=>{
 const R=globalThis.MarfaModel2VecRuntime;
 const args={tokenizer:fs.readFileSync('./models/zarra_int8/tokenizer.json'),model:fs.readFileSync('./models/zarra_int8/model.safetensors'),config:fs.readFileSync('./models/zarra_int8/config.json')};
 const m=await R.fromBytes(args);
 const [a,b,c,d]=await m.encode(['① فلتر','1 فلتر','ﻻ','لا']);
 const cos=(x,y)=>x.reduce((s,v,i)=>s+v*y[i],0);
 const tests=[['circled digit normalizes',cos(a,b)>.99999,cos(a,b)],['Arabic presentation form normalizes',cos(c,d)>.99999,cos(c,d)]];
 let fail=0;for(const [n,ok,v] of tests){console.log(ok?'PASS':'FAIL',n,v);if(!ok)fail++;} console.log('TOTAL',tests.length,'PASS',tests.length-fail,'FAIL',fail);process.exitCode=fail?1:0;
})();
