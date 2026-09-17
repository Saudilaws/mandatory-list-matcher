(function(global){
'use strict';

const VERSION='0.3.0';
const AR_DIACRITICS=/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const PUNCT=/[^\p{L}\p{N}%./+\-×x]+/gu;

function simpleNormalize(s){
  return String(s||'').normalize('NFKC').replace(AR_DIACRITICS,'').replace(/ـ/g,'')
    .replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ة/g,'ه')
    .toLowerCase().trim();
}

const PHRASE_REPLACEMENTS=[
  [/\bair\s+conditioning\b/gi,' hvac '], [/\ba\/c\b/gi,' hvac '],
  [/\blow\s+voltage\b/gi,' lowvoltage '], [/\bmedium\s+voltage\b/gi,' mediumvoltage '],
  [/\bhigh\s+voltage\b/gi,' highvoltage '], [/\bdirect\s+current\b/gi,' dc '],
  [/بولي\s*ايثيلين\s*عالي\s*الكثافه/gi,' hdpe '], [/بولي\s*ايثيلين\s*عالى\s*كثافه/gi,' hdpe '],
  [/اتش\s*دي\s*بي\s*اي/gi,' hdpe '], [/بي\s*في\s*سي/gi,' pvc '],
  [/(?:ال)?جهد\s+(?:ال)?منخفض/gi,' lowvoltage '], [/الجهد\s+المنخفض/gi,' lowvoltage '],
  [/(?:ال)?جهد\s+(?:ال)?متوسط/gi,' mediumvoltage '], [/الجهد\s+المتوسط/gi,' mediumvoltage '],
  [/(?:ال)?جهد\s+(?:ال)?عالي/gi,' highvoltage '], [/الجهد\s+العالي/gi,' highvoltage '],
  [/(?:ال)?تيار\s+(?:ال)?مستمر/gi,' dc '],
  [/دي\s*سي/gi,' dc '], [/\bmccb\b/gi,' breaker molded '], [/\bacb\b/gi,' breaker air '], [/\bgcb\b/gi,' breaker gas '], [/\b(?:lv|l\.?v\.?)\b/gi,' lowvoltage '],
  [/\b(?:mv|m\.?v\.?)\b/gi,' mediumvoltage '],
  [/\b(?:hv|h\.?v\.?)\b/gi,' highvoltage '],
  [/ميديم\s*فولت(?:ج|يج)?/gi,' mediumvoltage '],
  [/هاي\s*فولت(?:ج|يج)?/gi,' highvoltage '],
  [/لو\s*فولت(?:ج|يج)?/gi,' lowvoltage '],
  [/\bexhaust\s+fans?\b/gi,' fan '], [/\bair\s*handling\s*units?\b/gi,' ahu '], [/سيركت\s*بريكر/gi,' circuitbreaker '],
  [/سويتش\s*بورد/gi,' switchboard '],
  [/فاير\s*(?:الارم|الارم|ألارم|الإنذار)/gi,' firealarm '],
  [/شيك\s*فالف/gi,' valve checkvalve '],
  [/باترفلاي\s*فالف/gi,' valve butterflyvalve '],
  [/نيدل\s*فالف/gi,' valve needlevalve '],
  [/بال\s*فالف/gi,' valve ballvalve '],
  [/قيت\s*فالف/gi,' valve gatevalve '],
  [/سبل(?:ي|)ت\s*يونت/gi,' splitunit '],
  [/فلوت\s*جلاس/gi,' floatglass '],
  [/زجاج\s*سيكوريت/gi,' temperedglass '],
  [/تنر/gi,' paintthinner ']
];

function normalizeText(s){
  let x=simpleNormalize(s);
  for(const [re,r] of PHRASE_REPLACEMENTS) x=x.replace(re,r);
  return x.replace(/(\d)\s*[×x]\s*(\d)/g,'$1x$2').replace(PUNCT,' ').replace(/\s+/g,' ').trim();
}

const STOPWORDS=new Set([
  'توريد','تأمين','تامين','شراء','توفير','استبدال','تركيب','فك','نقل','اعمال','عمل','حسب','وفقا','وفق','مع','او','و','من','الى','علي','في','عن','ل','بند','البند','ماده','مواد','جهاز','اجهزه','نوع','انواع','مطلوب','يشمل','شامل','خاص','خاصه','استخدام','للاستخدام','المستخدم','المستخدمه','عدد','قطعه','حبه',
  'the','a','an','of','for','and','or','supply','install','installation','replacement','provide','providing','procure','purchase','including','with','item','items','unit','units','type','used','use'
].map(simpleNormalize));

const GROUPS={
  filter:['فلتر','فلاتر','فلترات','مرشح','مرشحات','ترشيح','filter','filters','filtration'],
  air:['هواء','هوا','اير','air'], hvac:['تكييف','مكيف','مكيفات','تهويه','تهوية','hvac'], fuel:['وقود','بنزين','جازولين','fuel','gasoline','petrol'], oil:['زيت','زيوت','oil'],
  gas:['غاز','gas'], water:['ماء','مياه','موية','مويه','water'], sand:['رمل','رملي','رملية','sand'], coffee:['قهوه','قهوة','coffee'],
  cabin:['مقصوره','مقصورة','كبينه','كبينة','cabin'], vacuum:['تفريغ','فراغ','فاكيوم','vacuum'],
  cable:['كابل','كيبل','كابلات','كيابل','cable','cables'], pipe:['انبوب','أنبوب','انابيب','أنابيب','ماسوره','ماسورة','مواسير','pipe','pipes','piping'],
  accessory:['ملحق','ملحقات','اكسسوار','اكسسوارات','إكسسوارات','accessory','accessories'], cap:['غطاء','اغطيه','أغطية','كاب','cap','caps','cover'],
  spare:['غيار','قطع غيار','spare','spares'], assembly:['مجموعه','مجموعة','تجميعه','تجميعة','assembly','assemblies'],
  pump:['مضخه','مضخة','مضخات','بامب','بمب','pump','pumps'], fan:['مروحه','مروحة','مراوح','شفاط','شفاطات','fan','fans','exhaustfan'], compressor:['ضاغط','ضاغطات','كمبروسر','كمبروسرات','compressor','compressors'],
  valve:['صمام','صمامات','محبس','محابس','فالف','valve','valves'], breaker:['قاطع','قواطع','بريكر','breaker','breakers','circuitbreaker'],
  lamp:['لمبه','لمبة','لمبات','مصباح','مصابيح','lamp','lamps','bulb','bulbs'],
  tire:['كفر','كفرات','اطار','اطارات','إطار','إطارات','tire','tires','tyre','tyres'],
  crane:['ونش','اوناش','رافعة','رافعات','crane','cranes'], battery:['بطاريه','بطارية','بطاريات','battery','batteries'],
  vehicle:['سياره','سيارة','سيارات','مركبه','مركبة','مركبات','vehicle','vehicles','automotive'], generator:['مولد','مولدات','generator','generators'],
  lowvoltage:['lowvoltage'], mediumvoltage:['mediumvoltage'], highvoltage:['highvoltage'], dc:['dc'],
  hdpe:['hdpe'], pvc:['pvc'], copper:['نحاس','نحاسي','نحاسيه','copper'], aluminium:['المنيوم','الومنيوم','المنيوم','aluminum','aluminium'],
  steel:['فولاذ','صلب','steel'], stainless:['ستانلس','ستانلس ستيل','stainless'], plastic:['بلاستيك','بلاستيكي','plastic'], rubber:['مطاط','مطاطي','rubber'],
  transformer:['محول','محولات','ترانس','transformer','transformers'],
  control:['تحكم','كنترول','control'], tray:['حامل','حاملات','تراي','tray','trays'],
  switchboard:['switchboard','لوحه المفاتيح','لوحة المفاتيح'], panelboard:['لوحه التوزيع','لوحة التوزيع','panelboard','panelboards','db'],
  firealarm:['firealarm','انذار الحريق','إنذار الحريق','firealarmcontrol','fire'],
  ballvalve:['ballvalve'], gatevalve:['gatevalve'],
  checkvalve:['checkvalve'], butterflyvalve:['butterflyvalve'], needlevalve:['needlevalve'],
  duct:['دكت','دكتات','قناه','قناة','قنوات','duct','ducts'], insulation:['عازل','عزل','insulation','insulated'],
  split:['سبليت','سبلت','splitunit','split'], packaged:['باكدج','باكيج','packaged','package'], ahu:['ahu','airhandlingunit','مناوله الهواء','مناولة الهواء'],
  glass:['زجاج','قزاز','glass'], tempered:['temperedglass','مقوي','مقوى','tempered','سيكوريت','تمبرد','تمبر'], floatglass:['floatglass','عائم','float'],
  paint:['دهان','دهانات','بوية','بويه','paint','painting'], thinner:['paintthinner','مذيب','مخفف','thinner'],
  cleaner:['منظف','منظفات','كلينر','cleaner','cleaners'], toilet:['مرحاض','مراحيض','حمام','حمامات','toilet','bathroom'], window:['نافذه','نافذة','نوافذ','شباك','شبابيك','window','windows'],
  tank:['خزان','خزانات','تانكي','تانك','tank','tanks'], potable:['شرب','صالحة للشرب','potable'],
  electrical:['كهرباء','كهرب','كهربائي','كهربائيه','كهربائية','electrical','electric'], diesel:['ديزل','diesel'], painttool:['بكره','بكرة','بكرات','فرشاه','فرشاة','roller','rollers','brush','brushes'], domestic:['منزلي','منزليه','منزلية','domestic'], general:['عام','عامه','عامة','general'],
  elbow:['كوع','كوعه','كوعة','elbow','elbows'], coupling:['موصل','كوبلن','كبلن','coupling','couplings'],
  cutting:['قص','قطع','cutting'], grease:['شحم','شحوم','grease'], anticorrosion:['تآكل','تاكل','corrosion','anticorrosion'],
  foam:['رغوه','رغوة','فوم','foam'], handle:['مقبض','مقابض','handle','handles','knob','knobs'], door:['باب','ابواب','أبواب','door','doors']
};
const CANON=new Map();
Object.entries(GROUPS).forEach(([k,arr])=>arr.forEach(v=>CANON.set(simpleNormalize(v),'@'+k)));
const DISPLAY={filter:'فلتر/مرشح',air:'هواء',hvac:'تكييف/HVAC',fuel:'وقود',oil:'زيت',gas:'غاز',water:'مياه',sand:'رملي',coffee:'قهوة',cabin:'مقصورة',vacuum:'تفريغ',cable:'كابل',pipe:'أنبوب',accessory:'ملحقات',cap:'غطاء',spare:'قطع غيار',assembly:'مجموعة',pump:'مضخة',fan:'مروحة',compressor:'ضاغط',valve:'صمام',breaker:'قاطع',lamp:'مصباح',tire:'إطار',crane:'رافعة',battery:'بطارية',vehicle:'مركبة',generator:'مولد',lowvoltage:'جهد منخفض',mediumvoltage:'جهد متوسط',highvoltage:'جهد عالٍ',dc:'تيار مستمر',hdpe:'HDPE',pvc:'PVC',copper:'نحاس',aluminium:'ألمنيوم',steel:'فولاذ',stainless:'ستانلس',plastic:'بلاستيك',rubber:'مطاط',transformer:'محول',control:'تحكم',tray:'حامل كابلات',switchboard:'Switchboard',panelboard:'لوحة توزيع',firealarm:'إنذار حريق',ballvalve:'صمام كروي',gatevalve:'صمام بوابي',checkvalve:'صمام عدم رجوع',butterflyvalve:'صمام فراشي',needlevalve:'صمام إبري',duct:'قنوات HVAC',insulation:'عزل',split:'Split',packaged:'Packaged',ahu:'AHU',glass:'زجاج',tempered:'زجاج مقوى',floatglass:'زجاج عائم',paint:'دهان',thinner:'مذيب دهان',cleaner:'منظف',toilet:'مراحيض',window:'نوافذ',tank:'خزان',potable:'مياه شرب',electrical:'كهربائي',diesel:'ديزل',painttool:'أداة دهان',domestic:'منزلي',general:'عام',elbow:'كوع',coupling:'وصلة',cutting:'قص/قطع',grease:'شحم',anticorrosion:'مضاد تآكل',foam:'رغوة',handle:'مقبض',door:'باب'};
const dcanon=t=>t&&t[0]==='@'?(DISPLAY[t.slice(1)]||t):t;

function lightStem(t){
  let x=t;
  if(/^ال[\u0600-\u06FF]{3,}$/.test(x)) x=x.slice(2);
  if(/^و[\u0600-\u06FF]{4,}$/.test(x)) x=x.slice(1);
  if(x.length>6 && /(يات|يون)$/.test(x)) x=x.slice(0,-3);
  else if(x.length>5 && /(ات|ون|ين)$/.test(x)) x=x.slice(0,-2);
  else if(x.length>4 && /ه$/.test(x)) x=x.slice(0,-1);
  if(/^[a-z][a-z0-9-]+$/.test(x)){
    if(x.length>5 && x.endsWith('ies')) x=x.slice(0,-3)+'y';
    else if(x.length>5 && x.endsWith('es')) x=x.slice(0,-2);
    else if(x.length>4 && x.endsWith('s') && !x.endsWith('ss')) x=x.slice(0,-1);
  }
  return x;
}
function canonicalToken(t){
  const n=simpleNormalize(t); if(!n) return '';
  if(CANON.has(n)) return CANON.get(n);
  let b=n;
  if(/^ال[\u0600-\u06FF]{3,}$/.test(b) && CANON.has(b.slice(2))) return CANON.get(b.slice(2));
  if(/^و[\u0600-\u06FF]{4,}$/.test(b) && CANON.has(b.slice(1))) return CANON.get(b.slice(1));
  b=lightStem(b); return CANON.get(b)||b;
}
function tokens(s){
  const n=normalizeText(s); if(!n) return [];
  return [...new Set(n.split(' ').map(canonicalToken).filter(t=>t && t.length>1 && !STOPWORDS.has(t)))];
}
function trigrams(s){const x='  '+normalizeText(s)+'  ';const a=new Set();for(let i=0;i<x.length-2;i++)a.add(x.slice(i,i+3));return a;}
function dice(a,b){if(!a.size||!b.size)return 0;let h=0;a.forEach(x=>{if(b.has(x))h++;});return 2*h/(a.size+b.size);}
function clamp(x){return Math.max(0,Math.min(1,x));}
function uniq(a){return [...new Set(a)];}

const CONTEXT_AXIS=['@air','@hvac','@fuel','@oil','@gas','@water','@sand','@coffee','@cabin','@vacuum'];
const VOLT_AXIS=['@lowvoltage','@mediumvoltage','@highvoltage'];
const MATERIAL_AXIS=['@hdpe','@pvc','@copper','@aluminium','@steel','@stainless','@rubber'];

const VALVE_TYPE_AXIS=['@ballvalve','@gatevalve','@checkvalve','@butterflyvalve','@needlevalve'];
const HVAC_FORM_AXIS=['@duct','@pipe'];
const PIPE_FITTING_AXIS=['@elbow','@coupling','@cap'];
const COMPONENTS=new Set(['@accessory','@cap','@spare','@assembly']);
const PRODUCT_FAMILIES=new Set(['@filter','@cable','@pipe','@pump','@fan','@compressor','@valve','@breaker','@lamp','@tire','@crane','@battery','@transformer','@switchboard','@panelboard','@duct','@glass','@paint','@cleaner','@tank']);

function conceptConflicts(qSet,nameSet){
  const reasons=[];
  function axisConflict(axis,label){
    const q=axis.filter(x=>qSet.has(x)), c=axis.filter(x=>nameSet.has(x));
    if(!q.length||!c.length)return 0;
    // air and hvac are compatible, not contradictory
    const compat=(a,b)=>(a==='@air'&&b==='@hvac')||(a==='@hvac'&&b==='@air');
    if(q.some(x=>c.includes(x)) || q.some(a=>c.some(b=>compat(a,b)))) return 0;
    reasons.push(`تعارض ${label}: ${q.map(dcanon).join('/')} ≠ ${c.map(dcanon).join('/')}`); return 1;
  }
  let n=0;n+=axisConflict(CONTEXT_AXIS,'في نوع/وسط الاستخدام');n+=axisConflict(VOLT_AXIS,'في مستوى الجهد');n+=axisConflict(VALVE_TYPE_AXIS,'في نوع الصمام');n+=axisConflict(HVAC_FORM_AXIS,'في نوع مكوّن التكييف');n+=axisConflict(PIPE_FITTING_AXIS,'في نوع وصلة الأنابيب');
  // Materials are only contradictory when each side names exactly one material.
  const qm=MATERIAL_AXIS.filter(x=>qSet.has(x)), cm=MATERIAL_AXIS.filter(x=>nameSet.has(x));
  if(qm.length===1&&cm.length===1&&qm[0]!==cm[0]){n++;reasons.push(`تعارض في المادة: ${dcanon(qm[0])} ≠ ${dcanon(cm[0])}`);}
  return {count:n,reasons};
}

function normalizeSpecToken(s){
  return normalizeText(s).replace(/\s+/g,'');
}
function specs(s){
  const n=normalizeText(s); const out=[];
  const re=/\b\d+(?:[.,]\d+)?(?:x\d+(?:[.,]\d+)?){0,3}\s*(?:mm|cm|m|km|ml|l|kg|g|kw|mw|w|kv|v|a|hz|bar|psi|inch|in|hp|kwp|kva|mva|micron|ميكرون|مم|سم|متر|فولت|كيلوفولت|واط|كيلوواط)?\b/gi;
  for(const m of n.matchAll(re)) out.push(normalizeSpecToken(m[0]));
  return uniq(out);
}

function enrichRecordTokens(text,baseTokens){
  const n=normalizeText(text); const out=new Set(baseTokens); const add=x=>out.add(x);
  const hasValve=/صمام|صمامات|valve/.test(n);
  if(hasValve){
    if(/كروي|كرويه|كروية|ball/.test(n)) add('@ballvalve');
    if(/بواب|gate/.test(n)) add('@gatevalve');
    if(/عدم رجوع|check/.test(n)) add('@checkvalve');
    if(/فراش|butterfly/.test(n)) add('@butterflyvalve');
    if(/ابري|إبري|needle/.test(n)) add('@needlevalve');
  }
  if(/air handling|مناول.*هواء/.test(n)) add('@ahu');
  if(/circuit breaker|قاطع.*تيار/.test(n)) add('@breaker');
  if(/fire alarm|انذار الحريق|إنذار الحريق/.test(n)) add('@firealarm');
  if(/لوحه التوزيع|لوحة التوزيع|panel boards?/.test(n)) add('@panelboard');
  if(/switchboard|لوحه المفاتيح|لوحة المفاتيح/.test(n)) add('@switchboard');
  return [...out];
}

function prepareRecord(r){
  const ar=String(r.ar||''), en=String(r.en||''), sector=String(r.sector||''), description=String(r.description||''), notes=String(r.notes||'');
  const nameText=[ar,en,(r.aliases||[]).join(' ')].join(' ');
  const nameTokens=enrichRecordTokens(nameText,tokens(nameText));
  const descTokens=enrichRecordTokens(description+' '+notes,tokens(description+' '+notes));
  const sectorTokens=tokens(sector);
  return {...r,
    _arNorm:normalizeText(ar),_enNorm:normalizeText(en),_nameNorm:normalizeText(nameText),
    _nameTokens:nameTokens,_descTokens:descTokens,_sectorTokens:sectorTokens,
    _nameSet:new Set(nameTokens),_descSet:new Set(descTokens),_sectorSet:new Set(sectorTokens),
    _triAr:trigrams(ar),_triEn:trigrams(en),_specs:specs(nameText+' '+description)
  };
}

function buildIndex(list){
  const records=(list||[]).map(r=>r._nameSet?r:prepareRecord(r));
  const df=new Map();
  for(const r of records){
    const doc=new Set([...r._nameTokens,...r._descTokens]);
    doc.forEach(t=>df.set(t,(df.get(t)||0)+1));
  }
  const N=Math.max(1,records.length), idf=new Map();
  df.forEach((v,k)=>idf.set(k,Math.log(1+(N+1)/(v+0.5))));
  const byAr=new Map(),byEn=new Map(),byCode=new Map();
  for(const r of records){
    if(r._arNorm){if(!byAr.has(r._arNorm))byAr.set(r._arNorm,[]);byAr.get(r._arNorm).push(r);}
    if(r._enNorm){if(!byEn.has(r._enNorm))byEn.set(r._enNorm,[]);byEn.get(r._enNorm).push(r);}
    byCode.set(String(r.code||'').trim(),r);
  }
  return {records,idf,N,byAr,byEn,byCode};
}
function weight(t,index){return 1+(index.idf.get(t)||Math.log(index.N+1));}
function weightedCoverage(qTokens,index,fieldSets){
  if(!qTokens.length)return 0;let den=0,num=0;
  for(const t of qTokens){const w=weight(t,index);den+=w;let best=0;for(const [set,f] of fieldSets)if(set.has(t))best=Math.max(best,f);num+=w*best;}
  return den?num/den:0;
}
function nameRecall(qTokens,index,nameSet){return weightedCoverage(qTokens,index,[[nameSet,1]]);}
function candidatePrecision(qSet,index,nameTokens){
  if(!nameTokens.length)return 0;let den=0,num=0;
  for(const t of nameTokens){const w=weight(t,index);den+=w;if(qSet.has(t))num+=w;}
  return den?num/den:0;
}
function maxNameDice(qTri,r){return Math.max(dice(qTri,r._triAr),dice(qTri,r._triEn));}

function enrichQueryTokens(query,qTokens){
  const n=normalizeText(query); const out=new Set(qTokens);
  const add=x=>out.add(x);
  // Electrical field jargon: interpret pressure terminology as voltage only when an electrical product is explicit.
  const electrical=/كيبل|كابل|cable|ترانس|محول|transformer|فولت|volt|kv|كهرب/.test(n);
  if(electrical){
    if(/ضغط منخفض/.test(n)) add('@lowvoltage');
    if(/ضغط متوسط/.test(n)) add('@mediumvoltage');
    if(/ضغط عالي|ضغط عال/.test(n)) add('@highvoltage');
    for(const m of n.matchAll(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*kv\b/g)){
      const v=parseFloat(m[1].replace(',','.'));
      if(v>0&&v<=1) add('@lowvoltage'); else if(v>1&&v<=36) add('@mediumvoltage'); else if(v>36) add('@highvoltage');
    }
  }
  if(/كيبل|كابل|cable/.test(n)){ if(/كنترول|control/.test(n)) add('@control'); if(/تراي|tray/.test(n)) add('@tray'); }
  if(/لوحه|لوحة|panel/.test(n)&&/فاير|حريق|fire/.test(n)&&/الارم|إنذار|انذار|alarm/.test(n)) add('@firealarm');
  const valveCtx=/صمام|محبس|فالف|valve/.test(n);
  if(valveCtx){
    if(/كوره|كورة|كروي|ball/.test(n)) add('@ballvalve');
    if(/بواب|gate/.test(n)) add('@gatevalve');
    if(/عدم رجوع|شيك|check/.test(n)) add('@checkvalve');
    if(/فراش|باترفلاي|butterfly/.test(n)) add('@butterflyvalve');
    if(/ابري|إبري|نيدل|needle/.test(n)) add('@needlevalve');
  }
  if(/ديزل|diesel/.test(n)&&/فلتر|مرشح|filter/.test(n)) add('@fuel');
  if(/مكيف|تكييف|hvac/.test(n)&&/مركزي|central/.test(n)) add('@hvac');
  if(/ahu|air handling/.test(n)){ add('@ahu'); add('@hvac'); }
  if(/باكدج|باكيج|packaged/.test(n)){ add('@packaged'); add('@hvac'); }
  if(/سبليت|سبلت|split/.test(n)){ add('@split'); add('@hvac'); }
  if(/دكت|duct/.test(n)){ add('@duct'); add('@hvac'); }
  if(/عازل|عزل|insulat/.test(n)) add('@insulation');
  if(/سيكوريت|tempered/.test(n)){ add('@glass'); add('@tempered'); }
  if(/فلوت\s*جلاس|float\s*glass/.test(n)){ add('@glass'); add('@floatglass'); }
  if(/بوية|بويه|دهان|paint/.test(n)) add('@paint');
  if(/تنر|thinner/.test(n)){ add('@paint'); add('@thinner'); }
  if(/تانكي|تانك|خزان|tank/.test(n)) add('@tank');
  if(/شرب|potable/.test(n)) add('@potable');
  if(/قزاز|زجاج|glass/.test(n)) add('@glass');
  if(/ثلاج|refrigerator|fridge|غسال|washer/.test(n)&&/(منزل|بيت|home|domestic)/.test(n)) add('@domestic');
  if(/كلينر|منظف|cleaner/.test(n)&&/(عام|عامه|عامة|general)/.test(n)) add('@general');
  if(/يد\s*(?:باب|الباب)|door\s*handle/.test(n)){ add('@handle'); add('@door'); }
  if(/فوم|رغوه|رغوة|foam/.test(n)&&/اطفاء|إطفاء|حريق|fire/.test(n)) add('@foam');
  if(/زيت|oil/.test(n)&&/قطع|قص|cutting/.test(n)) add('@cutting');
  if(/شحم|شحوم|grease/.test(n)) add('@grease');
  if(/تاكل|تآكل|corrosion/.test(n)) add('@anticorrosion');
  return [...out];
}
function prepareQuery(query){
  const qNorm=normalizeText(query), qTokens=enrichQueryTokens(query,tokens(query));
  return {query,qNorm,qTokens,qSet:new Set(qTokens),qTri:trigrams(query),qSpecs:specs(query)};
}
function scoreOne(query,r,index,q){
  const {qNorm,qTokens,qSet,qTri,qSpecs}=q;
  if(String(r.code||'').trim()===qNorm) return makeResult(1,r,['مطابقة مباشرة لرمز اعتماد'],[],{exact:true,coverage:1,nameCoverage:1});
  const exactAr=qNorm===r._arNorm, exactEn=qNorm===r._enNorm;
  if(exactAr||exactEn) return makeResult(0.999,r,[exactAr?'مطابقة مباشرة للاسم العربي الرسمي':'مطابقة مباشرة للاسم الإنجليزي الرسمي'],[],{exact:true,coverage:1,nameCoverage:1});

  const coverage=weightedCoverage(qTokens,index,[[r._nameSet,1],[r._descSet,0.62],[r._sectorSet,0.25]]);
  const nameCoverage=nameRecall(qTokens,index,r._nameSet);
  const precision=candidatePrecision(qSet,index,r._nameTokens);
  const tri=maxNameDice(qTri,r);
  const nameContains=qNorm.length>=4 && (r._arNorm.includes(qNorm)||r._enNorm.includes(qNorm));
  const queryContainsName=(r._arNorm.length>=4&&qNorm.includes(r._arNorm))||(r._enNorm.length>=4&&qNorm.includes(r._enNorm));

  const cf=conceptConflicts(qSet,r._nameSet);
  let componentPenalty=0;const componentReasons=[];
  const qComp=[...COMPONENTS].filter(x=>qSet.has(x)), cComp=[...COMPONENTS].filter(x=>r._nameSet.has(x));
  const qFam=[...PRODUCT_FAMILIES].filter(x=>qSet.has(x)), cFam=[...PRODUCT_FAMILIES].filter(x=>r._nameSet.has(x));
  if(!qComp.length&&cComp.length&&qFam.some(x=>r._nameSet.has(x))){componentPenalty=0.20;componentReasons.push('المرشح ملحق/جزء أضيق من المنتج المطلوب');}
  if(qComp.length&&!cComp.length&&qFam.some(x=>r._nameSet.has(x))){componentPenalty=Math.max(componentPenalty,0.15);componentReasons.push('البند يطلب ملحقًا/جزءًا بينما اسم المرشح للمنتج الأساسي');}
  if(qFam.length&&cFam.length&&!qFam.some(x=>r._nameSet.has(x))){componentPenalty=Math.max(componentPenalty,0.27);componentReasons.push('نوع المنتج الأساسي مختلف');}
  const NARROW_CONTEXT=new Set(['@fuel','@oil','@gas','@water','@sand','@coffee','@cabin','@vacuum']);
  const extraNarrow=[...NARROW_CONTEXT].filter(x=>r._nameSet.has(x)&&!qSet.has(x));
  if(qSet.has('@filter')&&extraNarrow.length){componentPenalty+=0.20;componentReasons.push('المرشح الرسمي أضيق من البند: '+extraNarrow.map(dcanon).join('، '));}
  if(r._nameSet.has('@potable')&&!qSet.has('@potable')){componentPenalty+=0.14;componentReasons.push('المرشح خاص بمياه الشرب بينما البند لم يحدد ذلك');}
  if(r._nameSet.has('@insulation')&&!qSet.has('@insulation')&&qSet.has('@duct')){componentPenalty+=0.24;componentReasons.push('المرشح خاص بالعزل بينما البند يطلب القناة نفسها');}
  if(qSet.has('@insulation')&&!r._nameSet.has('@insulation')&&(qSet.has('@duct')||qSet.has('@pipe'))){componentPenalty+=0.18;componentReasons.push('البند يطلب العزل بينما المرشح للمنتج غير المعزول');}
  if(qSet.has('@breaker')){
    const breakerSpecific=/(غاز|gas|هوائي|air circuit|مقولب|molded|vacuum|فراغ|miniature|مصغر|زيت|oil)/.test(r._nameNorm);
    const querySpecific=/(غاز|gas|هوائي|air circuit|مقولب|molded|vacuum|فراغ|miniature|مصغر|زيت|oil)/.test(qNorm);
    if(breakerSpecific&&!querySpecific){componentPenalty+=0.38;componentReasons.push('المرشح نوع متخصص من القواطع لم يحدده البند');}
  }
  if(qSet.has('@paint')&&!qSet.has('@painttool')&&r._nameSet.has('@painttool')){componentPenalty+=0.34;componentReasons.push('المرشح أداة دهان بينما البند يطلب مادة دهان');}
  if(qSet.has('@paint')&&!qSet.has('@thinner')&&r._nameSet.has('@thinner')){componentPenalty+=0.30;componentReasons.push('المرشح مذيب/مخفف دهان بينما البند يطلب الدهان نفسه');}

  let specSupport=0;
  if(qSpecs.length){const c=new Set(r._specs);const hit=qSpecs.filter(x=>c.has(x)).length;specSupport=hit/qSpecs.length;}

  let relationBonus=0;
  if(qSet.has('@filter')&&qSet.has('@hvac')&&r._nameSet.has('@filter')&&r._nameSet.has('@air')&&(r._descSet.has('@hvac')||r._sectorSet.has('@hvac'))) relationBonus+=0.33;
  else if(qSet.has('@filter')&&qSet.has('@hvac')&&r._nameSet.has('@filter')&&(r._descSet.has('@hvac')||r._sectorSet.has('@hvac'))) relationBonus+=0.10;
  if(qSet.has('@air')&&r._nameSet.has('@hvac')) relationBonus+=0.04;
  if(qSet.has('@fuel')&&qSet.has('@filter')&&r._nameSet.has('@fuel')&&r._nameSet.has('@filter')) relationBonus+=0.24;
  if(qSet.has('@cabin')&&qSet.has('@filter')&&r._nameSet.has('@cabin')&&r._nameSet.has('@filter')) relationBonus+=0.28;
  if(qSet.has('@vacuum')&&qSet.has('@filter')&&r._nameSet.has('@vacuum')&&r._nameSet.has('@filter')) relationBonus+=0.28;
  if(qSet.has('@cable')&&qSet.has('@dc')&&r._nameSet.has('@cable')&&r._nameSet.has('@dc')) relationBonus+=0.28;
  if(qSet.has('@cable')&&qSet.has('@control')&&r._nameSet.has('@cable')&&r._nameSet.has('@control')) relationBonus+=0.28;
  if(qSet.has('@cable')&&qSet.has('@tray')&&r._nameSet.has('@tray')) relationBonus+=0.30;
  if(qSet.has('@transformer')&&r._nameSet.has('@transformer')) relationBonus+=0.12;
  if(qSet.has('@breaker')&&r._nameSet.has('@breaker')) relationBonus+=0.30;
  if(qSet.has('@firealarm')&&r._nameSet.has('@firealarm')) relationBonus+=0.35;
  for(const vt of VALVE_TYPE_AXIS) if(qSet.has(vt)&&r._nameSet.has(vt)) relationBonus+=0.32;
  if(qSet.has('@duct')&&r._nameSet.has('@duct')) relationBonus+=0.26;
  if(qSet.has('@insulation')&&r._nameSet.has('@insulation')) relationBonus+=0.18;
  if(qSet.has('@split')&&r._nameSet.has('@split')) relationBonus+=0.32;
  if(qSet.has('@packaged')&&r._nameSet.has('@packaged')) relationBonus+=0.34;
  if(qSet.has('@ahu')&&r._nameSet.has('@ahu')) relationBonus+=0.36;
  if(qSet.has('@tempered')&&r._nameSet.has('@tempered')) relationBonus+=0.38;
  if(qSet.has('@floatglass')&&r._nameSet.has('@floatglass')) relationBonus+=0.38;
  if(qSet.has('@paint')&&r._nameSet.has('@paint')) relationBonus+=0.18;
  if(qSet.has('@thinner')&&r._nameSet.has('@thinner')) relationBonus+=0.40;
  if(qSet.has('@cleaner')&&r._nameSet.has('@cleaner')) relationBonus+=0.10;
  if(qSet.has('@window')&&r._nameSet.has('@window')) relationBonus+=0.26;
  if(qSet.has('@toilet')&&r._nameSet.has('@toilet')) relationBonus+=0.18;
  if(qSet.has('@tank')&&r._nameSet.has('@tank')) relationBonus+=0.22;
  if(qSet.has('@potable')&&r._nameSet.has('@potable')) relationBonus+=0.28;
  if(qSet.has('@elbow')&&r._nameSet.has('@elbow')) relationBonus+=0.28;
  if(qSet.has('@coupling')&&r._nameSet.has('@coupling')) relationBonus+=0.32;
  if(qSet.has('@cap')&&r._nameSet.has('@cap')) relationBonus+=0.32;
  if(qSet.has('@cutting')&&r._nameSet.has('@cutting')) relationBonus+=0.34;
  if(qSet.has('@grease')&&r._nameSet.has('@grease')) relationBonus+=0.28;
  if(qSet.has('@anticorrosion')&&r._nameSet.has('@anticorrosion')) relationBonus+=0.22;
  if(qSet.has('@foam')&&r._nameSet.has('@foam')) relationBonus+=0.34;
  if(qSet.has('@handle')&&r._nameSet.has('@handle')&&qSet.has('@door')&&r._nameSet.has('@door')) relationBonus+=0.40;
  const nameSubset=r._nameTokens.length>0&&r._nameTokens.every(t=>qSet.has(t));
  const extraQuery=qTokens.filter(t=>!r._nameSet.has(t));
  let subsetBonus=0;
  if(nameSubset){subsetBonus=extraQuery.length===0?0.20:extraQuery.length===1?0.24:0.12;}

  let score=0.48*coverage+0.18*nameCoverage+0.09*precision+0.13*tri+0.06*specSupport+relationBonus+subsetBonus;
  if(nameContains)score+=0.13;if(queryContainsName)score+=0.08;
  score-=0.31*cf.count;score-=componentPenalty;
  // A generic single concept should be reviewed, never auto-approved unless exact.
  if(qTokens.length<=1)score=Math.min(score,0.74);
  // If a specific query has a rare/high-information token absent from all candidate fields, be conservative.
  const unmatched=qTokens.filter(t=>!r._nameSet.has(t)&&!r._descSet.has(t)&&!r._sectorSet.has(t));
  const OPTIONAL_CONTEXT=new Set(['@vehicle','@generator','@hvac']);
  const rareUnmatched=unmatched.filter(t=>weight(t,index)>3.6&&!OPTIONAL_CONTEXT.has(t));
  if(rareUnmatched.length) score-=Math.min(0.20,rareUnmatched.length*0.07);
  score=clamp(score);

  const reasons=[];
  const commonName=qTokens.filter(x=>r._nameSet.has(x));
  const commonDesc=qTokens.filter(x=>!r._nameSet.has(x)&&r._descSet.has(x));
  if(commonName.length) reasons.push('توافق في اسم المنتج: '+commonName.slice(0,7).map(dcanon).join('، '));
  if(commonDesc.length) reasons.push('توافق مدعوم بوصف المنتج: '+commonDesc.slice(0,6).map(dcanon).join('، '));
  if(relationBonus) reasons.push('توافق دلالي متخصص بين صياغة البند والمصطلح الرسمي');
  if(subsetBonus) reasons.push('عناصر الاسم الرسمي موجودة داخل صياغة البند بعد توحيد المرادفات');
  if(specSupport) reasons.push('مواصفات رقمية متوافقة مع الوصف الرسمي');
  if(tri>0.72) reasons.push('تشابه لغوي مرتفع مع الاسم الرسمي');
  if(nameContains||queryContainsName) reasons.push('يوجد احتواء مباشر بين صياغة البند والاسم الرسمي');
  reasons.push(...cf.reasons,...componentReasons);
  if(rareUnmatched.length) reasons.push('مصطلحات مميزة غير مدعومة في المرشح: '+rareUnmatched.slice(0,4).map(dcanon).join('، '));
  return makeResult(score,r,reasons,cf.reasons.concat(componentReasons),{exact:false,coverage,nameCoverage,precision,tri});
}
function makeResult(score,record,reasons,conflicts,metrics){return {score,record,reasons:uniq(reasons),conflicts,metrics};}

const CACHE=new WeakMap();
function getIndex(list){if(CACHE.has(list))return CACHE.get(list);const x=buildIndex(list);CACHE.set(list,x);return x;}
function normalizedNameKey(r){return normalizeText(r.ar)||normalizeText(r.en);}
function match(query,list,opts={}){
  const topN=opts.topN||3, index=getIndex(list||[]);
  const q=prepareQuery(query);
  const exactCode=index.byCode.get(q.qNorm);
  const exactRows=exactCode?[exactCode]:(index.byAr.get(q.qNorm)||index.byEn.get(q.qNorm)||null);
  if(exactRows&&exactRows.length){
    const rows=exactRows.slice(0,topN);
    return {status:'match',confidence:1,margin:1,ambiguous:exactRows.length>1,codeAmbiguous:exactRows.length>1,query,candidates:rows.map(r=>({code:r.code,ar:r.ar,en:r.en,sector:r.sector||'',description:r.description||'',requirements:r.requirements||'',applicationDate:r.applicationDate||'',notes:r.notes||'',score:1,reasons:[exactCode?'مطابقة مباشرة لرمز اعتماد':'مطابقة مباشرة للاسم الرسمي'],conflicts:[],metrics:{exact:true,coverage:1,nameCoverage:1}}))};
  }
  const ranked=index.records.map(r=>scoreOne(query,r,index,q)).sort((a,b)=>b.score-a.score||String(a.record.code).localeCompare(String(b.record.code)));
  const top=ranked.slice(0,Math.max(topN,2)); const first=top[0], second=top[1];
  if(!first)return {status:'none',confidence:0,query,candidates:[]};
  const sameOfficialName=second&&normalizedNameKey(first.record)===normalizedNameKey(second.record)&&normalizedNameKey(first.record)!=='';
  const genericAhuAmbiguity=!!(q.qSet.has('@ahu')&&second&&first.record._nameSet.has('@ahu')&&second.record._nameSet.has('@ahu')&&!/(خارجي|outdoor|داخلي|indoor|modular|اضافي|إضافي|باكدج|باكيج|packaged)/.test(q.qNorm));
  const margin=second?first.score-second.score:first.score;
  const exact=first.metrics&&first.metrics.exact;
  const codeAmbiguous=!!(sameOfficialName&&first.score>=0.94&&second.score>=0.94);
  let status='none';
  if(exact) status='match';
  else if(first.score>=0.84 && first.metrics.coverage>=0.68 && first.metrics.nameCoverage>=0.44 && !first.conflicts.length && (margin>=0.055||sameOfficialName)) status='match';
  else if(first.score>=0.53) status='review';
  if(codeAmbiguous)status='match';
  if(genericAhuAmbiguity&&status==='match')status='review';
  const ambiguous=!!((second&&Math.abs(first.score-second.score)<0.055)||sameOfficialName||genericAhuAmbiguity);
  return {status,confidence:first.score,margin,ambiguous,codeAmbiguous,query,candidates:top.slice(0,topN).map(x=>({
    code:x.record.code,ar:x.record.ar,en:x.record.en,sector:x.record.sector||'',description:x.record.description||'',requirements:x.record.requirements||'',applicationDate:x.record.applicationDate||'',notes:x.record.notes||'',score:x.score,reasons:x.reasons,conflicts:x.conflicts,metrics:x.metrics
  }))};
}

function parseDelimited(text){
  const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());if(!lines.length)return[];
  const delim=(lines[0].match(/\t/g)||[]).length>(lines[0].match(/,/g)||[]).length?'\t':',';
  function split(line){if(delim==='\t')return line.split('\t').map(x=>x.trim());const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(ch===','&&!q){out.push(cur.trim());cur='';}else cur+=ch;}out.push(cur.trim());return out;}
  const rows=lines.map(split),h=rows[0].map(simpleNormalize),idx=names=>h.findIndex(x=>names.some(n=>x.includes(n)));
  const iCode=idx(['رمز','code','id']),iAr=idx(['اسم المنتج','arabic','الاسم العربي']),iEn=idx(['english','الانجليزي','الإنجليزي']),iSector=idx(['قطاع','sector','category']),iDesc=idx(['وصف','description']),iReq=idx(['محتوي محلي','المحتوى المحلي','اشتراط','requirement']),iDate=idx(['تاريخ التطبيق','date']),iNotes=idx(['ملاحظ','notes']);
  if(iCode<0||iAr<0)throw new Error('تعذر التعرف على الأعمدة. يلزم على الأقل: الرمز + اسم المنتج العربي.');
  return rows.slice(1).filter(r=>r[iCode]||r[iAr]).map(r=>({code:String(r[iCode]||'').trim(),ar:String(r[iAr]||'').trim(),en:iEn>=0?String(r[iEn]||'').trim():'',sector:iSector>=0?String(r[iSector]||'').trim():'',description:iDesc>=0?String(r[iDesc]||'').trim():'',requirements:iReq>=0?String(r[iReq]||'').trim():'',applicationDate:iDate>=0?String(r[iDate]||'').trim():'',notes:iNotes>=0?String(r[iNotes]||'').trim():''}));
}
function parseImported(text,filename=''){
  const t=String(text||'').trim();if(!t)return[];
  if(filename.toLowerCase().endsWith('.json')||/^[\[{]/.test(t)){const x=JSON.parse(t),arr=Array.isArray(x)?x:(x.products||x.items||[]);return arr.map(r=>({code:String(r.code??r.id??''),ar:r.ar??r.arabic_name??r.name_ar??r.name??'',en:r.en??r.english_name??r.name_en??'',sector:r.sector??r.category??'',description:r.description??r.desc??'',requirements:r.requirements??r.local_content??'',applicationDate:r.applicationDate??r.date??'',notes:r.notes??''}));}
  return parseDelimited(t);
}

global.MandatoryMatcher={match,buildIndex,prepareRecord,parseImported,normalizeText,tokens,specs,version:VERSION};
if(typeof module!=='undefined'&&module.exports)module.exports=global.MandatoryMatcher;
})(typeof window!=='undefined'?window:globalThis);
