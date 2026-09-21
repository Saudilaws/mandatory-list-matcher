global.window=globalThis;
const fs=require('fs');require('./mandatory-data.js');require('./mandatory-matcher.js');
const S=require('./semantic-engine.js');require('./model2vec-local-runtime.js');const Z=require('./zarra-local-backend.js');
const assets={model:fs.readFileSync('./models/zarra_int8/model.safetensors'),tokenizer:fs.readFileSync('./models/zarra_int8/tokenizer.json'),config:fs.readFileSync('./models/zarra_int8/config.json')};
const cases=[
 ['كيبل DC للتيار المستمر','2272'],['high voltage power cable 132kv','2105'],['كابل جهد متوسط 11kv','2083'],['low voltage electrical power cable 415v','2094'],['كيبل كنترول للمعدات','2093'],
 ['ACB air circuit breaker','2265'],['MCCB molded case breaker','2264'],['gas circuit breaker','2157'],
 ['مضخة مياه للمبنى','2125'],['sewage pump','2126'],['مضخة غاطسة للبئر','2153'],['fire pump set','2127'],['oil pump','2239'],
 ['gate valve','2118'],['صمام كروي','2119'],['butterfly valve','2122'],['صمام عدم رجوع','2120'],['globe valve','2121'],
 ['HDPE pipe elbow','2360'],['PVC pipe elbow','2204'],['stainless steel pipe elbow','2372'],['industrial seamless carbon steel pipe','2165'],['commercial ABS pipe','2203'],
 ['fuel filter for vehicle','3134'],['cabin air filter','2252'],['sand filter','2253'],['gas pipeline filter','2341'],
 ['smoke detector','2280'],['heat detector','2281'],['fire extinguisher','2283'],['safety helmet','2502']
];
(async()=>{const init=await Z.init({semantic:S,assets,verify:true});if(init.status!=='ready')throw Error(JSON.stringify(init));let pass=0;const fails=[];for(const [q,e] of cases){const z=await S.matchAsync(q,MANDATORY_LIST,{topN:10});const reranked=[...z.candidates].sort((a,b)=>b.score-a.score);const got=String(reranked[0]?.code||'');const ok=got===e;if(ok)pass++;else fails.push({q,e,got,top:reranked.slice(0,5).map(x=>[x.code,x.score.toFixed(3)])});console.log(ok?'PASS':'FAIL',q,'=>',got,'expected',e);}console.log(`MULTIDOMAIN_RERANK ${pass}/${cases.length}`);if(fails.length)console.log(JSON.stringify(fails,null,2));if(pass!==cases.length)process.exit(2);})();
