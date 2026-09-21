global.window=globalThis;const fs=require('fs');require('./mandatory-data.js');require('./mandatory-matcher.js');const S=require('./semantic-engine.js');require('./model2vec-local-runtime.js');const Z=require('./zarra-local-backend.js');
const assets={model:fs.readFileSync('./models/zarra_int8/model.safetensors'),tokenizer:fs.readFileSync('./models/zarra_int8/tokenizer.json'),config:fs.readFileSync('./models/zarra_int8/config.json')};
const groups={
'2115':['محول كهربائي جهد عالي 132 ك.ف','high voltage power transformer 132kv','محول 220kv للشبكة'],
'2080':['محول كهربائي جهد متوسط 11 ك.ف','medium voltage transformer 13.8kv','محول توزيع 33kv متوسط'],
'2086':['محول جهد منخفض 415 فولت','low voltage transformer 400v','محول كهربائي LV'],
'2129':['بطارية رصاص حمضية','lead acid battery','بطاريات lead-acid صناعية'],
'2154':['بطارية سيارة','vehicle battery','بطارية مركبة للمحرك'],
'2171':['بطارية نيكل كادميوم','nickel cadmium battery','NiCd battery'],
'2227':['بطارية أكسيد الزئبق','mercury oxide battery','mercury battery'],
'2273':['ملحقات كابلات جهد منخفض','low voltage cable lug accessories','LV cable accessories'],
'2274':['ملحقات كابلات جهد متوسط','medium voltage cable accessories','MV cable accessories'],
'2350':['ملحقات كابلات عامة','general cable accessories','اكسسوارات كيابل'],
'2370':['صمام إبري','needle valve','needle control valve'],
'2371':['صمام إغلاق وتصريف','block and bleed valve','double block bleed valve'],
'2238':['صمام فحص تأرجحي','swing check valve','swing non return valve'],
'2380':['قطع غيار مضخة غاطسة','submersible pump spare parts','spares for submersible pump'],
'2381':['قطع غيار مضخة طاردة مركزية','centrifugal pump spare parts','spares centrifugal pump'],
'2379':['جسم مضخة','pump barrel','pump body barrel'],
'2382':['مروحة المضخة','pump impeller','impeller for water pump'],
'2383':['عمود المضخة','pump shaft','shaft for centrifugal pump'],
'2250':['مرشح تفريغ','vacuum filter','vacuum filtration filter'],
'2242':['مرشح هواء صناعي','industrial air filter','فلتر لتنقية الهواء'],
'2280':['حساس دخان للحريق','smoke sensor detector','كاشف إنذار دخان'],
'2281':['حساس حرارة للحريق','heat sensor detector','كاشف إنذار حراري']};
(async()=>{await Z.init({semantic:S,assets,verify:true});let p=0,n=0;let fail=[];for(const [e,qs] of Object.entries(groups))for(const q of qs){n++;let z=await S.matchAsync(q,MANDATORY_LIST,{topN:10});let got=String(z.candidates[0]?.code||'');if(got===e)p++;else fail.push({q,e,got,top:z.candidates.slice(0,3).map(x=>[x.code,x.score])});}console.log('PASS',p,'/',n);console.log(JSON.stringify(fail,null,2));})();
