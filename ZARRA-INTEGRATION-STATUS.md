# Mandatory List Matcher — Zarra pretrained semantic integration status

## Implemented in v0.5

- Added an asynchronous pretrained-embedding path to `semantic-engine.js`.
- Added a stable backend contract: `registerEmbeddingBackend({ id, dimension, encode(), ready(), info() })`.
- Added lazy indexing of the 1,749 official records. Official Arabic name is weighted as the primary identity text, with English name, description, requirements and sector as supporting context.
- Pretrained semantic retrieval is fused with the existing conservative matcher and domain-conflict rules instead of replacing them.
- Exact official-list matches bypass model startup and preserve the established deterministic result.
- If the pretrained backend is absent or throws, `matchAsync()` falls back to the v0.4 semantic-hybrid matcher. The dashboard remains usable.
- Updated the dashboard single-item and batch paths to use `matchAsync()` and show whether Zarra is actually loaded.
- Added `zarra-local-backend.js`, which accepts model bytes only from the local application/runtime; it contains no downloader and no remote URL.
- Pinned Zarra INT8 model/tokenizer SHA-256 values in `ZARRA-ASSET-MANIFEST.json` and verifies them before activation when Web Crypto is available.

## Zarra assets required for real inference

Model: `NAMAA-Space/zarra_int8`

- `model.safetensors` — 64 MB — SHA-256 `e7ddf3a47443d21c3faa70ceea5c03d07b3d935f04643d24a4fd6867ba7eede5`
- `tokenizer.json` — 17.1 MB — SHA-256 `e50d57f2617dfe4425aa46562197e4953b6f10875ed63c32f1859a91fa544170`
- `config.json` — Model2Vec, hidden dimension 256, normalize=true

## Runtime contract

`zarra-local-backend.js` expects a local `MarfaModel2VecRuntime` exposing:

```js
const model = await MarfaModel2VecRuntime.fromBytes({ tokenizer, model, config, normalize: true });
const vectors = await model.encode(["نص عربي", "نص آخر"]);
```

The intended production runtime is a local Model2Vec implementation (for example a browser/WASM build using in-memory `from_bytes`). No external inference API is part of the application contract.

## Tests run

- Legacy matcher: 7,031 PASS / 0 FAIL.
- Existing holdout: 45/45 top-1, 0/5 bad auto-matches.
- Imagination set: 63/65 top-1; 65/65 top-3; 0 bad auto-matches.
- Final holdout: 23/23 top-1; 0/5 bad auto-matches.
- Unseen final: 22/22 top-1; 0/5 bad auto-matches.
- v0.4 semantic tests: 11 PASS / 0 FAIL, including all 1,749 official Arabic names remaining retrievable.
- Pretrained integration contract: 10 PASS / 0 FAIL, covering async retrieval, ranking metrics, exact-match bypass, backend failure fallback, adapter unavailable state, and adapter registration through a deterministic local test backend.

## Verification boundary

The real Zarra model inference has **not** been executed in this build because the 81.1 MB Zarra model assets and a compiled Model2Vec browser runtime are not present in the uploaded project, and this execution environment could not retrieve the Xet-hosted binary assets. The integration code therefore does not claim a Zarra accuracy result yet. Its runtime/fusion/fallback contract is tested; model-quality acceptance must be measured once the pinned local model assets are supplied.

## v0.16 domain-aware reranker
- Conservative second-stage reranking for explicit HVAC discriminators.
- Core 7031/7031; pretrained contract 10/10; labelled holdouts 90/90 with zero regressions; domain discriminator suite 7/7.
- Zarra remains retrieval-only for final Top-1; ambiguous adversarial labels are not used to force unsafe overrides.

## v0.18 hard-negative gate
See `ZARRA-V0.18-HARD-NEGATIVE.txt` and `test-zarra-hard-negatives.js`. Narrow explicit-domain overrides are enabled only for strongly discriminative attributes; generic Zarra similarity remains retrieval-only.
