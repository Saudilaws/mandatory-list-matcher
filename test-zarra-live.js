global.window=global;
const fs=require('fs');
require('./mandatory-data.js'); require('./mandatory-matcher.js');
const S=require('./semantic-engine.js'); require('./model2vec-local-runtime.js'); const Z=require('./zarra-local-backend.js');
const assets={model:fs.readFileSync('./models/zarra_int8/model.safetensors'),tokenizer:fs.readFileSync('./models/zarra_int8/tokenizer.json'),config:fs.readFileSync('./models/zarra_int8/config.json')};
const sets=['HOLDOUT-TEST-v0.3.json','FINAL-HOLDOUT-v0.3.json','UNSEEN-FINAL-v0.3.json'];
function casesOf(x){if(Array.isArray(x))return x; for(const k of ['cases','tests','items'])if(Array.isArray(x[k]))return x[k]; return [];}
function queryOf(c){return c.q||c.query||c.input||c.text||c.phrase||''}
function expectedOf(c){return String(c.exp||c.expectedCode||c.expected_code||c.code||c.expected?.code||'')}
(async()=>{
 const init=await Z.init({semantic:S,assets,verify:true}); console.log('INIT',init.status,init.backend||init.reason);
 let all={total:0,base:0,zarra:0,regress:0,fix:0};
 for(const f of sets){let cs=casesOf(JSON.parse(fs.readFileSync(f,'utf8'))).filter(c=>queryOf(c)&&expectedOf(c)); let st={total:0,base:0,zarra:0,regress:0,fix:0};
  for(const c of cs){const q=queryOf(c), exp=expectedOf(c); const b=S.match(q,global.MANDATORY_LIST,{topN:5}); const bc=String(b.candidates?.[0]?.code||''); const z=await S.matchAsync(q,global.MANDATORY_LIST,{topN:5}); const zc=String(z.candidates?.[0]?.code||''); st.total++; if(bc===exp)st.base++; if(zc===exp)st.zarra++; if(bc===exp&&zc!==exp){st.regress++; console.log('REGRESS',f,q,exp,bc,zc)} if(bc!==exp&&zc===exp){st.fix++;console.log('FIX',f,q,exp,bc,zc)} }
  console.log('SET',f,st); for(const k in st)all[k]+=st[k];
 }
 console.log('ALL',all);
})().catch(e=>{console.error(e);process.exit(1)});
