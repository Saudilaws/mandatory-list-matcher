(function(global){'use strict';
async function load(){const base='models/zarra_int8/';const [m,t,c]=await Promise.all([fetch(base+'model.safetensors'),fetch(base+'tokenizer.json'),fetch(base+'config.json')]);if(!m.ok||!t.ok||!c.ok)throw new Error('Zarra local asset fetch failed.');global.MARFA_ZARRA_ASSETS={model:await m.arrayBuffer(),tokenizer:await t.arrayBuffer(),config:await c.arrayBuffer()};return global.MARFA_ZARRA_ASSETS;}
global.MarfaZarraAssets={load};
})(typeof window!=='undefined'?window:globalThis);
