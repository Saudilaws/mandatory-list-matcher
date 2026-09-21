global.window=globalThis;
const fs=require('fs');require('./mandatory-data.js');require('./mandatory-matcher.js');
const S=require('./semantic-engine.js');require('./model2vec-local-runtime.js');const Z=require('./zarra-local-backend.js');
const assets={model:fs.readFileSync('./models/zarra_int8/model.safetensors'),tokenizer:fs.readFileSync('./models/zarra_int8/tokenizer.json'),config:fs.readFileSync('./models/zarra_int8/config.json')};
const cases=[
 ['وحدة مناولة هواء خارجية على السطح','2068'],['outdoor central station air handling unit','2068'],
 ['وحدة AHU داخلية modular','2069'],['indoor modular air handling unit','2069'],['وحدة تكييف قابلة لزيادة القدرة بوحدات إضافية','2069'],
 ['وحدة تكييف شباك بكمبروسر ومكثف','2071'],['packaged compressor condenser unit','2071']
];
(async()=>{const init=await Z.init({semantic:S,assets,verify:true});if(init.status!=='ready')throw Error(JSON.stringify(init));let pass=0;for(const [q,e] of cases){const z=await S.matchAsync(q,MANDATORY_LIST,{topN:10});const raw=[...z.candidates].sort((a,b)=>b.score-a.score);const ok=String(raw[0]?.code)===e;console.log(ok?'PASS':'FAIL',q,'=>',raw[0]?.code,'expected',e);if(ok)pass++;}console.log(`DOMAIN_RERANK ${pass}/${cases.length}`);if(pass!==cases.length)process.exit(2);})();
