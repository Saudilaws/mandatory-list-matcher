(function(global){
'use strict';

const VERSION='0.6.0-semantic-rescue';
const CACHE=new WeakMap();
const PRETRAINED_CACHE=new WeakMap();
let EMBEDDING_BACKEND=null;
let BACKEND_GENERATION=0;

const AR_DIACRITICS=/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
function norm(s){
  return String(s||'').normalize('NFKC').replace(AR_DIACRITICS,'').replace(/ـ/g,'')
    .replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
    .toLowerCase().replace(/[^\p{L}\p{N}%./+\-]+/gu,' ').replace(/\s+/g,' ').trim();
}
function aliasKey(s){return norm(s).replace(/[\/]+/g,' ').replace(/\s+/g,' ').trim();}
function stem(w){
  let x=norm(w);
  if(/^لل[\u0600-\u06ff]{3,}$/.test(x)) x=x.slice(2);
  else if(/^ل[\u0600-\u06ff]{4,}$/.test(x)) x=x.slice(1);
  if(/^ال[\u0600-\u06ff]{3,}$/.test(x)) x=x.slice(2);
  if(/^و[\u0600-\u06ff]{4,}$/.test(x)) x=x.slice(1);
  if(x.length>5 && /(ات|ون|ين|يه|ية|يات)$/.test(x)) x=x.replace(/(ات|ون|ين|يه|ية|يات)$/,'');
  if(x.length>4 && /[هة]$/.test(x)) x=x.slice(0,-1);
  return x;
}
const STOP=new Set('من في على الى عن مع او و ثم هذا هذه ذلك تلك هو هي يتم تم يتمثل تشمل يشمل تكون يكون نوع انواع جهاز اجهزة توريد تامين توفير شراء استبدال تركيب استخدام للاستخدام حسب وفقا وفق بند البند مادة مواد عدد قطعة حبة the a an of for and or with from to in on item items supply provide used use'.split(/\s+/).map(norm));
function words(s){
  const out=[];
  for(const raw of norm(s).split(' ')){
    if(!raw||STOP.has(raw)||raw.length<2) continue;
    out.push(stem(raw));
  }
  return out;
}

// Small ontology: broad meanings, not product-specific aliases. It exists to bridge ordinary Arabic wording
// to concepts; the official-list descriptions still decide which product is nearest.
const CONCEPTS={
  garment:['ملابس','لباس','لبس','زي','ازياء','بدله','بدلات','ستره','سترات','معطف','معاطف','رداء','كسوه','ثوب','ثياب','جاكيت','جاكيتات','apparel','clothing','garment','uniform','vest','coat','coverall','gown','jacket'],
  protection:['حمايه','حماية','وقايه','وقاية','واقي','واقيه','واقية','وقائي','وقائية','سلامه','سلامة','امان','أمان','protect','protective','protection','safety','safe','ppe'],
  hazardous:['خطر','خطره','خطرة','خطير','خطيره','خطيرة','مواد خطرة','كيميائي','كيميائيه','كيميائية','كيماوي','كيماويه','كيماوية','كيماويات','chemical','hazard','hazardous','hazmat'],
  fire:['حريق','حرائق','نار','لهب','اشتعال','اطفاء','إطفاء','fire','flame','retardant','firefighter'],
  ballistic:['رصاص','طلق','طلقات','شظايا','طعن','bullet','ballistic','bulletproof','bullet-proof','shrapnel','stab'],
  visibility:['عاكس','عاكسه','عاكسة','انعكاس','مروري','طرق','فسفوري','فلورسنت','road','reflective','visibility','hi-vis','high-visibility'],
  head:['راس','رأس','خوذه','خوذة','خوذات','كاسك','helmet','head'],
  eye:['عين','عيون','نظاره','نظارة','نظارات','نضاره','نضارة','نضارات','glasses','goggles','eye'],
  foot:['قدم','اقدام','أقدام','حذاء','احذيه','أحذية','جزمه','جزمة','جزم','بوت','shoe','shoes','foot','feet','boot','boots'],
  injury:['اصابه','إصابة','اصابات','إصابات','صدمه','صدمات','جرح','injury','impact'],
  lab:['مختبر','مختبرات','معمل','معامل','lab','laboratory'],
  medical:['طبي','طبيه','طبية','جراحي','جراحية','ممرض','ممرضين','medical','surgical','nurse'],
  electrical:['كهرباء','كهربائي','كهربائيه','كهربائية','تيار','جهد','electric','electrical','voltage','current'],
  vehicle:['سياره','سيارة','مركبه','مركبة','مركبات','vehicle','automotive','car'],
  water:['ماء','مياه','مويه','موية','water'],
  air:['هواء','هوا','air'],
  filter:['فلتر','فلاتر','مرشح','مرشحات','ترشيح','filter','filters','filtration'],
  pipe:['انبوب','أنبوب','انابيب','أنابيب','ماسوره','ماسورة','مواسير','pipe','pipes','piping'],
  cable:['كابل','كيبل','كابلات','كيابل','cable','cables'],
  pump:['مضخه','مضخة','مضخات','pump','pumps'],
  valve:['صمام','صمامات','محبس','محابس','فالف','valve','valves'],
  paint:['دهان','دهانات','بويه','بوية','paint','coating'],
  glass:['زجاج','قزاز','glass'],
  cleaning:['تنظيف','منظف','منظفات','cleaner','cleaning'],
  storage:['تخزين','خزان','خزانات','دولاب','خزانه','خزانة','storage','tank','cabinet']
};
const RESCUE_CONCEPTS=new Set(['garment','protection','hazardous','fire','ballistic','visibility','head','eye','foot','injury','lab','medical']);

const TERM_TO_CONCEPT=new Map();
for(const [c,terms] of Object.entries(CONCEPTS)) for(const t of terms){
  for(const w of words(t)) TERM_TO_CONCEPT.set(w,c);
}
const NEGATORS=new Set(['غير','بدون','دون','ليس','ليست','لا','مو']);
function isNegatorToken(raw){const x=norm(raw);return NEGATORS.has(x)||((x.startsWith('و')||x.startsWith('ف'))&&NEGATORS.has(x.slice(1)));}
function conceptForToken(raw){
  const w=stem(raw); const out=new Set();
  const c=TERM_TO_CONCEPT.get(w); if(c)out.add(c);
  // Arabic derivational bridges: intentionally generic linguistic families.
  if(/^حم[اي]/.test(w)||/^حما/.test(w)||/^يحمي/.test(w)||/^وق[اي]/.test(w)||/^سلام/.test(w))out.add('protection');
  if(/^ملابس/.test(w)||/^لباس/.test(w)||/^لبس/.test(w)||/^ستر/.test(w)||/^بدل/.test(w)||/^معطف/.test(w)||/^ثياب/.test(w)||/^جاكيت/.test(w))out.add('garment');
  if(/^خوذ/.test(w)||/^كاسك/.test(w))out.add('head');
  if(/^ن[ظض]ار/.test(w))out.add('eye');
  if(/^احذ/.test(w)||/^حذاء/.test(w)||/^جزم/.test(w)||/^بوت/.test(w))out.add('foot');
  if(/^اصاب/.test(w)||/^صدم/.test(w))out.add('injury');
  return out;
}
function conceptAnalysis(text){
  const raw=norm(text).split(' ').filter(Boolean), positive=new Set(), negated=new Set();
  for(let i=0;i<raw.length;i++){
    const cs=conceptForToken(raw[i]); if(!cs.size)continue;
    let neg=false;
    for(let j=Math.max(0,i-3);j<i;j++)if(isNegatorToken(raw[j])){neg=true;break;}
    for(const c of cs)(neg?negated:positive).add(c);
  }
  // A concept explicitly negated should not also act as positive evidence unless it occurs positively elsewhere.
  const rawText=norm(text);
  if(/(?:^|\s)(?:رجل|رجال)\s+ال?اطفاء(?:\s|$)/.test(rawText)||/fire\s*-?fighter/.test(rawText))positive.add('firefighter');
  for(const c of negated){
    let hasPositiveOccurrence=false;
    for(let i=0;i<raw.length&&!hasPositiveOccurrence;i++){
      if(!conceptForToken(raw[i]).has(c))continue;
      let neg=false;for(let j=Math.max(0,i-3);j<i;j++)if(isNegatorToken(raw[j])){neg=true;break;}
      if(!neg)hasPositiveOccurrence=true;
    }
    if(!hasPositiveOccurrence)positive.delete(c);
  }
  return {positive,negated};
}
function concepts(text){return conceptAnalysis(text).positive;}
function negatedConcepts(text){return conceptAnalysis(text).negated;}
function jaccard(a,b){ if(!a.size&&!b.size)return 0; let hit=0; for(const x of a)if(b.has(x))hit++; return hit/(a.size+b.size-hit||1); }
function cosineSparse(a,b){
  let dot=0,aa=0,bb=0; for(const v of a.values())aa+=v*v; for(const v of b.values())bb+=v*v;
  const small=a.size<b.size?a:b,large=a.size<b.size?b:a; for(const [k,v] of small){const z=large.get(k);if(z)dot+=v*z;}
  return aa&&bb?dot/Math.sqrt(aa*bb):0;
}
function add(m,k,v){m.set(k,(m.get(k)||0)+v);}
function build(list){
  const docs=[]; const df=new Map(),aliasAr=new Map(),aliasEn=new Map();
  function addAlias(map,key,r){if(!key)return;let a=map.get(key);if(!a)map.set(key,a=[]);a.push(r);}
  for(const r of list){
    addAlias(aliasAr,aliasKey(r.ar),r);addAlias(aliasEn,aliasKey(r.en),r);
    const fieldText=[r.ar,r.en,r.description,r.requirements,r.sector].filter(Boolean).join(' ');
    const ws=words(fieldText), unique=new Set(ws); for(const w of unique)add(df,w,1);
    const coreText=[r.ar,r.en,r.description,r.requirements].filter(Boolean).join(' ');
    const nameConcepts=concepts([r.ar,r.en].join(' ')),sectorConcepts=concepts(r.sector||'');
    docs.push({r,ws,concepts:concepts(coreText),sectorConcepts,nameConcepts,domainConcepts:new Set([...nameConcepts,...sectorConcepts])});
  }
  const N=Math.max(1,docs.length); const idf=new Map(); for(const [w,n] of df) idf.set(w,Math.log((N+1)/(n+1))+1);
  // Distributional token neighbourhood: tokens that repeatedly occur in the same official product record.
  const neigh=new Map();
  for(const d of docs){
    const uniq=[...new Set(d.ws)].filter(w=>(idf.get(w)||0)>=1.4).slice(0,90);
    for(const a of uniq){let m=neigh.get(a);if(!m)neigh.set(a,m=new Map()); for(const b of uniq)if(a!==b)add(m,b,(idf.get(b)||1));}
  }
  function vectorForWords(ws){
    const v=new Map();
    for(const w of ws){
      add(v,'w:'+w,(idf.get(w)||1.5)*1.4);
      const n=neigh.get(w); if(n){const top=[...n.entries()].sort((a,b)=>b[1]-a[1]).slice(0,24); const max=top[0]?.[1]||1; for(const [k,z] of top)add(v,'n:'+k,0.42*(z/max));}
    }
    return v;
  }
  for(const d of docs){
    const name=words([d.r.ar,d.r.en].join(' ')); const desc=words(d.r.description||'');
    d.vector=vectorForWords(name.concat(desc.slice(0,80)));
  }
  return {docs,idf,neigh,vectorForWords,aliasAr,aliasEn};
}
function getIndex(list){let x=CACHE.get(list);if(!x){x=build(list);CACHE.set(list,x);}return x;}

function conflictPenalty(qc,rc,r,qneg,domainConcepts){
  let p=0; const why=[];
  const identity=domainConcepts&&domainConcepts.size?domainConcepts:rc;
  const specific=['ballistic','fire','hazardous','medical','lab','visibility','head','eye','foot','firefighter'];
  for(const c of specific){ if(identity.has(c)&&!qc.has(c) && qc.size){
    if(c==='ballistic'){p+=0.24;why.push('المرشح خاص بالحماية الباليستية ولم يذكرها البند');}
    if(c==='hazardous'){p+=0.14;why.push('المرشح خاص بالمواد الخطرة ولم يحددها البند');}
    if(c==='fire'){p+=0.14;why.push('المرشح خاص بالحريق/اللهب ولم يحدده البند');}
    if(c==='medical'){p+=0.20;why.push('المرشح ذو سياق طبي غير مذكور في البند');}
    if(c==='lab'){p+=0.18;why.push('المرشح خاص بالمختبر ولم يذكره البند');}
    if(c==='firefighter'){p+=0.14;why.push('المرشح خاص بزي رجال الإطفاء ولم يذكر البند رجال الإطفاء');}
  }}
  if(qc.has('foot')&&!rc.has('foot')){p+=0.28;why.push('البند يتعلق بحماية القدم');}
  if(qc.has('head')&&!rc.has('head')){p+=0.28;why.push('البند يتعلق بحماية الرأس');}
  if(qc.has('eye')&&!rc.has('eye')){p+=0.28;why.push('البند يتعلق بحماية العين');}
  if(qc.has('garment')&&!rc.has('garment')){p+=0.30;why.push('البند يطلب لباسًا/ملابس بينما المرشح ليس من فئة اللباس');}
  const negHits=[];
  if(qneg)for(const c of qneg)if(identity.has(c)){negHits.push(c);p+=RESCUE_CONCEPTS.has(c)?0.48:0.30;}
  if(negHits.length)why.push('البند ينفي سمة موجودة في المرشح: '+negHits.join('، '));
  return {p,why,negHits};
}
function scoreRecord(query,d,index,legacyByCode,prepared){
  const q=prepared||{qw:words(query),qc:concepts(query),qneg:negatedConcepts(query)}; if(!q.qv)q.qv=index.vectorForWords(q.qw);
  const qw=q.qw, qc=q.qc, qneg=q.qneg||new Set(), qv=q.qv;
  const direct=new Set(qw), rw=new Set(d.ws); let lexical=0,den=0;
  for(const w of direct){const wt=index.idf.get(w)||1.6;den+=wt;if(rw.has(w))lexical+=wt;} lexical=den?lexical/den:0;
  const semantic=cosineSparse(qv,d.vector);
  const concept=jaccard(qc,d.concepts);
  let conceptRecall=0;if(qc.size){let hit=0;for(const c of qc)if(d.concepts.has(c))hit++;conceptRecall=hit/qc.size;}
  const nameConcept=jaccard(qc,d.nameConcepts);
  const legacy=legacyByCode.get(String(d.r.code))||0;
  let score=0.29*semantic+0.19*lexical+0.27*conceptRecall+0.12*nameConcept+0.13*legacy;
  if(qc.has('protection')&&d.concepts.has('protection'))score+=0.08;
  if(qc.has('garment')&&d.concepts.has('garment'))score+=0.09;
  if(qc.has('protection')&&qc.has('garment')&&d.concepts.has('protection')&&d.concepts.has('garment'))score+=0.10;
  for(const c of ['hazardous','fire','ballistic','head','eye','foot','lab','medical','visibility']) if(qc.has(c)&&d.concepts.has(c)) score+=0.08;
  const cf=conflictPenalty(qc,d.concepts,d.r,qneg,d.domainConcepts); score=Math.max(0,Math.min(1,score-cf.p));
  const reasons=[];
  const shared=[...qc].filter(c=>d.concepts.has(c));
  if(shared.length)reasons.push('تقارب دلالي في المفاهيم: '+shared.map(c=>({garment:'لباس/ملابس',protection:'حماية/وقاية',hazardous:'مواد خطرة',fire:'حريق/لهب',ballistic:'حماية باليستية',visibility:'سلامة مرورية/انعكاس',head:'حماية الرأس',eye:'حماية العين',foot:'حماية القدم',injury:'إصابات/صدمات',lab:'مختبر',medical:'طبي',electrical:'كهربائي',vehicle:'مركبات',water:'مياه',air:'هواء',filter:'ترشيح',pipe:'أنابيب',cable:'كابلات',pump:'مضخات',valve:'صمامات',paint:'دهانات',glass:'زجاج',cleaning:'تنظيف',storage:'تخزين',firefighter:'رجال الإطفاء'}[c]||c)).join('، '));
  if(semantic>=0.42)reasons.push('تشابه سياقي متعلم من أوصاف القائمة الإلزامية');
  if(lexical>=0.25)reasons.push('يوجد دعم مباشر من ألفاظ الاسم/الوصف الرسمي');
  if(legacy>=0.53)reasons.push('المحرك المحافظ الحالي يدعم هذا المرشح');
  reasons.push(...cf.why);
  return {r:d.r,score,semantic,lexical,conceptRecall,legacy,reasons,conflicts:cf.why,negatedHits:cf.negHits||[],qc};
}
function aliasExact(query,index,topN){
  const k=aliasKey(query);if(!k)return null;
  const rows=index.aliasAr.get(k)||index.aliasEn.get(k);if(!rows||!rows.length)return null;
  const out=rows.slice(0,Math.max(1,topN||5));
  return {status:'match',confidence:1,margin:1,ambiguous:rows.length>1,codeAmbiguous:rows.length>1,query,engine:'semantic-hybrid',semanticUsed:false,semanticGuard:'alias-exact',candidates:out.map(r=>({code:r.code,ar:r.ar,en:r.en,sector:r.sector||'',description:r.description||'',requirements:r.requirements||'',applicationDate:r.applicationDate||'',notes:r.notes||'',score:1,reasons:['مطابقة مباشرة بعد توحيد الفواصل في الاسم الرسمي'],conflicts:[],metrics:{exact:true,aliasExact:true}}))};
}
function legacyGuardReason(legacy,qc,qneg){
  if(legacy.confidence===1&&legacy.candidates?.length)return 'exact-legacy-match';
  // Strong lexical/domain evidence remains authoritative even when the wording contains a negator
  // (for example official surgical/non-surgical product distinctions).
  if(legacy.status==='match'&&legacy.confidence>=0.80)return 'strong-legacy-match';
  if(legacy.candidates?.length&&legacy.confidence>=0.68)return 'strong-legacy-candidate';
  if(qneg&&qneg.size)return null;
  if(!qc.size)return 'no-semantic-concepts';
  let rescue=0; for(const c of qc)if(RESCUE_CONCEPTS.has(c))rescue++;
  if(rescue<2)return 'outside-local-rescue-domain';
  return null;
}
function guardedLegacy(legacy,reason,topN){
  const candidates=(legacy.candidates||[]).slice(0,Math.max(1,topN||5));
  return {...legacy,candidates,engine:'semantic-hybrid',semanticUsed:false,semanticGuard:reason||'legacy-preserved'};
}
function match(query,list,opts={}){
  const topN=opts.topN||5, index=getIndex(list||[]);
  const alias=aliasExact(query,index,topN);if(alias)return alias;
  const legacy=global.MandatoryMatcher?global.MandatoryMatcher.match(query,list,{topN:Math.max(12,topN)}):{status:'none',confidence:0,candidates:[]};
  const analysis=conceptAnalysis(query),qc=analysis.positive,qneg=analysis.negated;
  const guard=legacyGuardReason(legacy,qc,qneg);
  if(guard)return guardedLegacy(legacy,guard,topN);
  const legacyByCode=new Map((legacy.candidates||[]).map(c=>[String(c.code),c.score]));
  const prepared={qw:words(query),qc,qneg}; prepared.qv=index.vectorForWords(prepared.qw);
  const ranked=index.docs.map(d=>scoreRecord(query,d,index,legacyByCode,prepared)).sort((a,b)=>b.score-a.score||String(a.r.code).localeCompare(String(b.r.code)));
  const first=ranked[0],second=ranked[1]; if(!first)return {status:'none',confidence:0,margin:0,query,candidates:[],engine:'semantic-hybrid'};
  const margin=first.score-(second?.score||0);
  let status='none';
  // Local semantics is a rescue layer, not an authority. Auto-match requires strong concept coverage and separation.
  if(first.score>=0.74 && first.conceptRecall>=0.66 && !first.conflicts.length && margin>=0.045)status='match';
  else if(first.score>=0.38 || (first.conceptRecall>=0.5&&first.score>=0.31))status='review';
  if(qc.size===1&&qc.has('garment')&&first.r && first.score<0.72) status='none';
  const hasGarmentSubtype=['hazardous','fire','ballistic','visibility','medical','lab','firefighter'].some(c=>qc.has(c));
  if(status==='match'&&qc.has('garment')&&qc.has('protection')&&!hasGarmentSubtype)status='review';
  if(first.negatedHits&&first.negatedHits.length)status='none';
  if(qneg.size&&legacy.status==='none')status='none';
  const ambiguous=!!(second&&margin<0.05);
  return {status,confidence:first.score,margin,ambiguous,codeAmbiguous:false,query,engine:'semantic-hybrid',semanticUsed:true,semanticGuard:null,
    candidates:ranked.slice(0,topN).map(x=>({code:x.r.code,ar:x.r.ar,en:x.r.en,sector:x.r.sector||'',description:x.r.description||'',requirements:x.r.requirements||'',applicationDate:x.r.applicationDate||'',notes:x.r.notes||'',score:x.score,reasons:x.reasons,conflicts:x.conflicts,metrics:{semantic:x.semantic,lexical:x.lexical,conceptRecall:x.conceptRecall,legacy:x.legacy}}))};
}


function l2normalize(v){
  const a=(v instanceof Float32Array)?v:Float32Array.from(v||[]); let n=0;
  for(let i=0;i<a.length;i++)n+=a[i]*a[i]; n=Math.sqrt(n)||1;
  const out=new Float32Array(a.length); for(let i=0;i<a.length;i++)out[i]=a[i]/n; return out;
}
function dotDense(a,b){const n=Math.min(a?.length||0,b?.length||0);let z=0;for(let i=0;i<n;i++)z+=a[i]*b[i];return z;}
function documentText(r){
  // Repeat the official Arabic name so the semantic model treats product identity as primary,
  // while still learning from English name, description, requirements and sector.
  return [r.ar,r.ar,r.en,r.description,r.requirements,r.sector].filter(Boolean).join(' | ');
}
function registerEmbeddingBackend(backend){
  if(!backend){EMBEDDING_BACKEND=null;BACKEND_GENERATION++;return;}
  if(typeof backend.encode!=='function')throw new TypeError('Embedding backend must provide encode(texts).');
  EMBEDDING_BACKEND={
    id:String(backend.id||'local-pretrained'),
    dimension:Number(backend.dimension||0)||null,
    encode:backend.encode.bind(backend),
    ready:typeof backend.ready==='function'?backend.ready.bind(backend):async()=>true,
    info:typeof backend.info==='function'?backend.info.bind(backend):()=>({})
  };
  BACKEND_GENERATION++;
}
function embeddingBackendInfo(){if(!EMBEDDING_BACKEND)return {registered:false,id:null,dimension:null};let extra={};try{extra=EMBEDDING_BACKEND.info()||{};}catch(err){extra={infoError:String(err&&err.message||err)};}return {registered:true,id:EMBEDDING_BACKEND.id,dimension:EMBEDDING_BACKEND.dimension,...extra};}
function validateDenseVector(v,expectedDimension=0){
  if(!v||typeof v.length!=='number'||v.length===0)throw new Error('Embedding backend returned an empty vector.');
  if(expectedDimension&&v.length!==expectedDimension)throw new Error('Embedding vector dimension does not match the registered backend dimension.');
  let norm2=0;
  for(let i=0;i<v.length;i++){const x=Number(v[i]);if(!Number.isFinite(x))throw new Error('Embedding backend returned a non-finite value.');norm2+=x*x;}
  if(norm2<=1e-18)throw new Error('Embedding backend returned a zero vector.');
  return true;
}
async function ensurePretrainedIndex(list,backend,generation){
  if(!backend)return null;
  const existing=PRETRAINED_CACHE.get(list);
  if(existing&&existing.generation===generation&&existing.backendId===backend.id)return existing.promise;
  const promise=(async()=>{
    await backend.ready();
    const texts=list.map(documentText);
    const batchSize=96, vectors=new Array(texts.length);
    for(let i=0;i<texts.length;i+=batchSize){
      const batch=await backend.encode(texts.slice(i,i+batchSize));
      if(!batch||batch.length!==Math.min(batchSize,texts.length-i))throw new Error('Embedding backend returned an invalid batch size.');
      for(let j=0;j<batch.length;j++){validateDenseVector(batch[j],backend.dimension||0);vectors[i+j]=l2normalize(batch[j]);}
      if(generation!==BACKEND_GENERATION||backend!==EMBEDDING_BACKEND)throw new Error('Embedding backend changed while the list index was being built.');
    }
    const dim=vectors[0]?.length||0;
    if(!dim)throw new Error('Embedding backend returned empty vectors.');
    for(const v of vectors)if(v.length!==dim)throw new Error('Embedding backend returned inconsistent dimensions.');
    if(backend.dimension&&dim!==backend.dimension)throw new Error('Indexed embedding dimension does not match the registered backend dimension.');
    return {vectors,dimension:dim,generation,backendId:backend.id};
  })();
  PRETRAINED_CACHE.set(list,{generation,backendId:backend.id,promise});
  try{return await promise;}catch(e){if(PRETRAINED_CACHE.get(list)?.promise===promise)PRETRAINED_CACHE.delete(list);throw e;}
}
function pretrainedDecision(query,base,semanticScores,list,opts={}){
  const topN=opts.topN||5;
  const byCode=new Map((base.candidates||[]).map(c=>[String(c.code),c]));
  const index=getIndex(list);
  const analysis=conceptAnalysis(query),qc=analysis.positive,qneg=analysis.negated;
  const legacyScores=new Map((base.candidates||[]).map(c=>[String(c.code),c.score]));
  const prepared={qw:words(query),qc,qneg}; prepared.qv=index.vectorForWords(prepared.qw);
  const rows=index.docs.map((d,i)=>{
    const neural=Math.max(-1,Math.min(1,semanticScores[i]??-1));
    const old=scoreRecord(query,d,index,legacyScores,prepared);
    // Map cosine to a 0..1 retrieval support score. This is deliberately not treated as confidence.
    const semanticSupport=Math.max(0,Math.min(1,(neural+1)/2));
    const legacyCandidate=byCode.get(String(d.r.code));
    // Pretrained semantics drives retrieval; domain/concept + conservative legacy engine guard it.
    let score=0.60*semanticSupport+0.20*old.conceptRecall+0.10*old.lexical+0.10*(legacyCandidate?.score||0);
    if(qc.has('garment')&&d.concepts.has('garment'))score+=0.035;
    if(qc.has('protection')&&d.concepts.has('protection'))score+=0.035;
    const cf=conflictPenalty(qc,d.concepts,d.r,qneg,d.domainConcepts); score=Math.max(0,Math.min(1,score-cf.p));
    const reasons=[];
    reasons.push('تشابه دلالي من النموذج العربي المحلي');
    if(old.conceptRecall>=0.5)reasons.push(...old.reasons.filter(x=>x.startsWith('تقارب دلالي')).slice(0,1));
    if(old.lexical>=0.25)reasons.push('يوجد دعم مباشر من ألفاظ الاسم/الوصف الرسمي');
    if(legacyCandidate?.score>=0.53)reasons.push('محرك التحقق المحافظ يدعم المرشح');
    reasons.push(...cf.why);
    return {r:d.r,score,neural,semanticSupport,conceptRecall:old.conceptRecall,lexical:old.lexical,legacy:legacyCandidate?.score||0,conflicts:cf.why,negatedHits:cf.negHits||[],reasons};
  }).sort((a,b)=>b.score-a.score||b.neural-a.neural||String(a.r.code).localeCompare(String(b.r.code)));
  const first=rows[0],second=rows[1]; if(!first)return {...base,engine:'pretrained-hybrid',pretrainedUsed:true};
  const margin=first.score-(second?.score||0);
  let status='none';
  // Exact official / exact conservative matches keep their established behavior.
  if(base.confidence===1&&base.status==='match')status='match';
  else if(first.score>=0.78&&first.semanticSupport>=0.80&&first.conceptRecall>=0.5&&!first.conflicts.length&&margin>=0.045)status='match';
  else if(first.score>=0.56&&first.semanticSupport>=0.62)status='review';
  if(first.negatedHits&&first.negatedHits.length)status='none';
  const candidates=rows.slice(0,topN).map(x=>({
    code:x.r.code,ar:x.r.ar,en:x.r.en,sector:x.r.sector||'',description:x.r.description||'',requirements:x.r.requirements||'',applicationDate:x.r.applicationDate||'',notes:x.r.notes||'',score:x.score,reasons:x.reasons,conflicts:x.conflicts,
    metrics:{pretrainedCosine:x.neural,pretrainedSupport:x.semanticSupport,conceptRecall:x.conceptRecall,lexical:x.lexical,legacy:x.legacy}
  }));
  // Exact match may not be neural top-1; preserve the exact official candidate at the front.
  if(base.confidence===1&&base.status==='match'&&base.candidates?.length){
    const exact=base.candidates[0],pos=candidates.findIndex(c=>String(c.code)===String(exact.code));
    if(pos>0)candidates.unshift(...candidates.splice(pos,1));
    else if(pos<0)candidates.unshift(exact);
    candidates.length=Math.min(candidates.length,topN);
  }
  return {status,confidence:first.score,margin,ambiguous:!!(second&&margin<0.05),codeAmbiguous:base.codeAmbiguous||false,query,engine:'pretrained-hybrid',pretrainedUsed:true,backend:EMBEDDING_BACKEND?.id||null,candidates};
}
async function matchAsync(query,list,opts={}){
  const base=match(query,list,opts);
  const backend=EMBEDDING_BACKEND, generation=BACKEND_GENERATION;
  if(!backend)return {...base,pretrainedUsed:false,backend:null,fallbackReason:'no-backend'};
  // Preserve exact official-list identity without paying model startup cost.
  if(base.confidence===1&&base.status==='match')return {...base,engine:'pretrained-hybrid',pretrainedUsed:false,backend:backend.id,exactBypass:true};
  try{
    const pi=await ensurePretrainedIndex(list||[],backend,generation);
    if(generation!==BACKEND_GENERATION||backend!==EMBEDDING_BACKEND)throw new Error('Embedding backend changed before query inference.');
    const qBatch=await backend.encode([String(query||'')]);
    if(!qBatch||qBatch.length!==1)throw new Error('Embedding backend did not return one query vector.');
    validateDenseVector(qBatch[0],pi.dimension);
    const q=l2normalize(qBatch[0]);
    if(q.length!==pi.dimension)throw new Error('Query embedding dimension does not match the list index.');
    if(generation!==BACKEND_GENERATION||backend!==EMBEDDING_BACKEND)throw new Error('Embedding backend changed during query inference.');
    const scores=pi.vectors.map(v=>dotDense(q,v));
    const result=pretrainedDecision(query,base,scores,list||[],opts);
    // A strong deterministic legacy result remains the anchor unless the real semantic model is later calibrated
    // on a labeled acceptance set. The model may still contribute alternatives in review/weak cases.
    const legacy=global.MandatoryMatcher?global.MandatoryMatcher.match(query,list,{topN:Math.max(12,opts.topN||5)}):null;
    if(legacy&&legacy.candidates?.length&&legacy.confidence>=0.80){
      const anchor=String(legacy.candidates[0].code),pos=result.candidates.findIndex(c=>String(c.code)===anchor);
      if(pos>0)result.candidates.unshift(...result.candidates.splice(pos,1));
      else if(pos<0)result.candidates.unshift(legacy.candidates[0]);
      result.candidates.length=Math.min(result.candidates.length,opts.topN||5);
      result.status=legacy.status;result.confidence=Math.max(result.confidence||0,legacy.confidence);result.legacyAnchor=true;
    }
    return result;
  }catch(err){
    return {...base,pretrainedUsed:false,backend:backend?.id||null,fallbackReason:'backend-error',backendError:String(err&&err.message||err)};
  }
}
function clearPretrainedCache(){BACKEND_GENERATION++;}

global.MandatorySemanticMatcher={match,matchAsync,registerEmbeddingBackend,embeddingBackendInfo,clearPretrainedCache,version:VERSION,concepts,negatedConcepts,conceptAnalysis,words,buildIndex:build,_test:{l2normalize,dotDense,documentText,pretrainedDecision,validateDenseVector,legacyGuardReason,aliasKey}};
if(typeof module!=='undefined'&&module.exports)module.exports=global.MandatorySemanticMatcher;
})(typeof window!=='undefined'?window:globalThis);
