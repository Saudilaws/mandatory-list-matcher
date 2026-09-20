(function(global){
'use strict';

const VERSION='0.1.0';
const MANIFEST=Object.freeze({
  id:'NAMAA-Space/zarra_int8',
  family:'Model2Vec',
  language:'ar',
  dimension:256,
  license:'MIT',
  files:Object.freeze({
    model:Object.freeze({name:'model.safetensors',sizeDisplay:'64 MB',sha256:'e7ddf3a47443d21c3faa70ceea5c03d07b3d935f04643d24a4fd6867ba7eede5'}),
    tokenizer:Object.freeze({name:'tokenizer.json',sizeDisplay:'17.1 MB',sha256:'e50d57f2617dfe4425aa46562197e4953b6f10875ed63c32f1859a91fa544170'}),
    config:Object.freeze({name:'config.json'})
  })
});

function bytesOf(v){
  if(v instanceof Uint8Array)return v;
  if(v instanceof ArrayBuffer)return new Uint8Array(v);
  if(ArrayBuffer.isView(v))return new Uint8Array(v.buffer,v.byteOffset,v.byteLength);
  return null;
}
function hex(buf){return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function sha256(bytes){
  if(!(global.crypto&&global.crypto.subtle))throw new Error('Web Crypto SHA-256 is unavailable.');
  return hex(await global.crypto.subtle.digest('SHA-256',bytes));
}
async function validateAssets(assets,{verify=true}={}){
  if(!assets||typeof assets!=='object')throw new Error('Zarra local assets are not loaded.');
  const model=bytesOf(assets.model),tokenizer=bytesOf(assets.tokenizer),config=bytesOf(assets.config);
  if(!model||!tokenizer||!config)throw new Error('Zarra requires model.safetensors, tokenizer.json and config.json as local bytes.');
  let parsed;
  try{parsed=JSON.parse(new TextDecoder().decode(config));}catch(_){throw new Error('Zarra config.json is not valid JSON.');}
  if(parsed.model_type!=='model2vec'||Number(parsed.hidden_dim)!==256||parsed.normalize!==true)throw new Error('Unexpected Zarra Model2Vec configuration.');
  if(verify){
    const [mh,th]=await Promise.all([sha256(model),sha256(tokenizer)]);
    if(mh!==MANIFEST.files.model.sha256)throw new Error('model.safetensors SHA-256 does not match the pinned Zarra INT8 model.');
    if(th!==MANIFEST.files.tokenizer.sha256)throw new Error('tokenizer.json SHA-256 does not match the pinned Zarra tokenizer.');
  }
  return {model,tokenizer,config,parsed};
}
function resolveRuntime(explicit){return explicit||global.MarfaModel2VecRuntime||null;}
function resolveAssets(explicit){return explicit||global.MARFA_ZARRA_ASSETS||null;}
async function init(options={}){
  const semantic=options.semantic||global.MandatorySemanticMatcher;
  if(!semantic||typeof semantic.registerEmbeddingBackend!=='function')return {status:'unavailable',reason:'semantic-engine-missing',version:VERSION};
  const runtime=resolveRuntime(options.runtime),assets=resolveAssets(options.assets);
  if(!runtime)return {status:'unavailable',reason:'model2vec-runtime-missing',version:VERSION,manifest:MANIFEST};
  if(!assets)return {status:'unavailable',reason:'zarra-assets-missing',version:VERSION,manifest:MANIFEST};
  if(typeof runtime.fromBytes!=='function')return {status:'unavailable',reason:'runtime-contract-invalid',version:VERSION,manifest:MANIFEST};
  try{
    const checked=await validateAssets(assets,{verify:options.verify!==false});
    const model=await runtime.fromBytes({tokenizer:checked.tokenizer,model:checked.model,config:checked.config,normalize:true});
    if(!model||typeof model.encode!=='function')throw new Error('Model2Vec runtime returned an invalid model instance.');
    const backend={
      id:'zarra-int8-local',dimension:256,
      async ready(){return true;},
      async encode(texts){
        const rows=await model.encode(texts.map(x=>String(x??'')));
        if(!rows||rows.length!==texts.length)throw new Error('Zarra runtime returned an invalid embedding batch.');
        return rows;
      },
      info(){return {model:MANIFEST.id,offline:true,precision:'int8',runtime:String(runtime.id||'model2vec-wasm')};}
    };
    semantic.registerEmbeddingBackend(backend);
    return {status:'ready',backend:backend.id,dimension:256,manifest:MANIFEST,version:VERSION};
  }catch(err){
    return {status:'error',reason:'initialization-failed',error:String(err&&err.message||err),version:VERSION,manifest:MANIFEST};
  }
}
function disable(){if(global.MandatorySemanticMatcher)global.MandatorySemanticMatcher.registerEmbeddingBackend(null);return {status:'disabled'};}

global.MandatoryZarra={init,disable,validateAssets,manifest:MANIFEST,version:VERSION};
if(typeof module!=='undefined'&&module.exports)module.exports=global.MandatoryZarra;
})(typeof window!=='undefined'?window:globalThis);
