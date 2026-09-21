global.window=global;
require('./mandatory-data.js');
require('./mandatory-matcher.js');
const S=require('./semantic-engine.js');
const Z=require('./zarra-local-backend.js');
const data=global.MANDATORY_LIST;
let pass=0,fail=0;
function check(name,cond,info=''){if(cond){pass++;console.log('PASS',name,info);}else{fail++;console.error('FAIL',name,info);}}

// Deterministic test backend: it validates the async neural retrieval/fusion contract without pretending
// to be Zarra. Real Zarra parity requires the pinned model assets.
function fakeVector(text){
  const s=String(text||'');
  const v=new Float32Array(8);
  if(/ملابس|لباس|بدل|سترات|سترة|apparel|vest/i.test(s))v[0]+=1;
  if(/حما|وقا|سلام|protect|safety/i.test(s))v[1]+=1;
  if(/مواد خطرة|كيميائ|hazard/i.test(s))v[2]+=1.4;
  if(/حريق|نيران|لهب|fire|flame/i.test(s))v[3]+=1.4;
  if(/رصاص|شظايا|bullet|ballistic/i.test(s))v[4]+=1.4;
  if(/حذاء|قدم|shoe|foot/i.test(s))v[5]+=1.4;
  if(/خوذ|رأس|راس|helmet|head/i.test(s))v[6]+=1.4;
  if(/عاكس|طرق|reflect|road/i.test(s))v[7]+=1.4;
  // Deterministic low-information floor so vectors never become empty in this test backend.
  if(!v.some(Boolean))v[1]=0.05;
  return v;
}
const fakeBackend={id:'contract-test-backend',dimension:8,async encode(texts){return texts.map(fakeVector)},info(){return {testOnly:true}}};

(async()=>{
  S.registerEmbeddingBackend(null);
  const fallback=await S.matchAsync('بدلة عازلة للمواد الكيميائية',data,{topN:5});
  check('no backend falls back safely',fallback.pretrainedUsed===false&&fallback.fallbackReason==='no-backend',`engine=${fallback.engine}`);

  S.registerEmbeddingBackend(fakeBackend);
  const a=await S.matchAsync('بدلة عازلة للمواد الكيميائية',data,{topN:5});
  check('async pretrained path is used',a.pretrainedUsed===true&&a.backend==='contract-test-backend',`top=${a.candidates[0]?.code}`);
  check('hazardous protective apparel is surfaced',a.candidates.slice(0,3).some(c=>String(c.code)==='2514'),a.candidates.slice(0,3).map(c=>c.code).join(','));
  check('Zarra retrieval-only mode preserves deterministic Top-1',a.zarraMode==='retrieval-only'&&a.legacyAnchor===true,`mode=${a.zarraMode}`);

  const b=await S.matchAsync('سترة واقية من الرصاص',data,{topN:5});
  check('exact conservative match bypass remains stable',b.status==='match'&&String(b.candidates[0]?.code)==='2516',`status=${b.status} top=${b.candidates[0]?.code}`);

  const c=await S.matchAsync('غطاء للرأس للحماية من السقوط',data,{topN:5});
  check('head protection semantic retrieval',c.candidates.slice(0,3).some(x=>String(x.code)==='2502'),c.candidates.slice(0,3).map(x=>x.code).join(','));

  S.registerEmbeddingBackend({id:'broken',async encode(){throw new Error('synthetic backend failure')}});
  const broken=await S.matchAsync('ملابس سلامة',data,{topN:5});
  check('backend failure falls back, never blocks matcher',broken.pretrainedUsed===false&&broken.fallbackReason==='backend-error'&&broken.candidates.length>0,broken.backendError||'');

  const unavailable=await Z.init({semantic:S,runtime:null,assets:null});
  check('Zarra adapter fails closed when local runtime/assets absent',unavailable.status==='unavailable',unavailable.reason);

  const enc=new TextEncoder();
  const fakeAssets={model:new Uint8Array([1,2,3]),tokenizer:new Uint8Array([4,5,6]),config:enc.encode(JSON.stringify({model_type:'model2vec',hidden_dim:256,normalize:true}))};
  const fakeRuntime={id:'contract-runtime',async fromBytes(){return {async encode(texts){return texts.map(fakeVector)}}}};
  const ready=await Z.init({semantic:S,runtime:fakeRuntime,assets:fakeAssets,verify:false});
  check('Zarra adapter registers a conforming local runtime',ready.status==='ready'&&S.embeddingBackendInfo().id==='zarra-int8-local',`status=${ready.status}`);
  const throughAdapter=await S.matchAsync('بدلة عازلة للمواد الكيميائية',data,{topN:5});
  check('registered Zarra adapter drives retrieval-only semantic path',S.embeddingBackendInfo().id==='zarra-int8-local'&&String(throughAdapter.candidates[0]?.code)==='2514',`top=${throughAdapter.candidates[0]?.code}`);

  S.registerEmbeddingBackend(null);
  console.log(`\nPRETRAINED CONTRACT PASS=${pass} FAIL=${fail}`);
  if(fail)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
