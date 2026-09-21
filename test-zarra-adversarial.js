global.window=globalThis;
const fs=require('fs');
require('./mandatory-data.js');require('./mandatory-matcher.js');
const S=require('./semantic-engine.js');require('./model2vec-local-runtime.js');const Z=require('./zarra-local-backend.js');
const assets={model:fs.readFileSync('./models/zarra_int8/model.safetensors'),tokenizer:fs.readFileSync('./models/zarra_int8/tokenizer.json'),config:fs.readFileSync('./models/zarra_int8/config.json')};
const cases=JSON.parse(fs.readFileSync('./IMAGINATION-TEST-v0.3.json','utf8'));
const exp=c=>String(c.expected||c.exp||'').split('/').filter(Boolean);
(async()=>{const init=await Z.init({semantic:S,assets,verify:true});if(init.status!=='ready')throw new Error(JSON.stringify(init));
let st={total:0,baseTop1:0,zarraRawTop1:0,zarraRawTop3:0,zarraRawTop5:0,zarraRawTop10:0,baseMisses:0,rescuedTop3:0,rescuedTop10:0,regressions:0};const misses=[];
for(const c of cases){const e=exp(c);if(!c.query||!e.length)continue;const b=S.match(c.query,MANDATORY_LIST,{topN:10});const z=await S.matchAsync(c.query,MANDATORY_LIST,{topN:10});const bc=String(b.candidates?.[0]?.code||''),zc=String(z.candidates?.[0]?.code||'');const raw=[...z.candidates].sort((a,b)=>(b.metrics?.pretrainedCosine??-2)-(a.metrics?.pretrainedCosine??-2)).map(x=>String(x.code));st.total++;if(e.includes(bc))st.baseTop1++;else st.baseMisses++;if(e.includes(raw[0]))st.zarraRawTop1++;if(raw.slice(0,3).some(x=>e.includes(x)))st.zarraRawTop3++;if(raw.slice(0,5).some(x=>e.includes(x)))st.zarraRawTop5++;if(raw.slice(0,10).some(x=>e.includes(x)))st.zarraRawTop10++;if(!e.includes(bc)&&raw.slice(0,3).some(x=>e.includes(x)))st.rescuedTop3++;if(!e.includes(bc)&&raw.slice(0,10).some(x=>e.includes(x)))st.rescuedTop10++;if(e.includes(bc)&&!e.includes(zc))st.regressions++;if(!e.includes(bc))misses.push({query:c.query,expected:e.join('/'),base:bc,zarraRawTop10:raw.slice(0,10).join('/')});}
console.log(JSON.stringify(st,null,2));for(const m of misses)console.log('BASE_MISS',JSON.stringify(m));if(st.regressions)process.exit(2);})();
