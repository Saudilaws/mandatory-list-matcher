# فاحص القائمة الإلزامية — Semantic Hybrid v0.5

هذه النسخة تنقل المطابقة من البحث اللفظي فقط إلى بنية دلالية ذات مستويين:

1. **المحرك المحلي الهجين الحالي**: تطبيع عربي + مفاهيم عامة + سياق مستخرج من أوصاف القائمة + قواعد منع التعارض.
2. **مسار Pretrained اختياري**: يقبل نموذج embeddings عربي محليًا، ويستخدمه للاسترجاع الدلالي ثم يعيد الترتيب بقواعد المجال والمحرك المحافظ.

## التشغيل الحالي

افتح `index.html`. إذا لم تكن ملفات نموذج Zarra/runtime المحلي محمّلة، يعمل النظام تلقائيًا بالمحرك الهجين السابق ولا يتوقف.

الواجهة تعرض حالة المحرك الدلالي. لا يجوز اعتبار عبارة `Zarra INT8 محلي` مفعّلة إلا عندما ينجح `MandatoryZarra.init()` فعليًا.

## الملفات الجديدة في v0.5

- `semantic-engine.js` — أضيفت `matchAsync()` وواجهة backend ودمج pretrained/fallback.
- `zarra-local-backend.js` — محول Zarra المحلي والتحقق من الملفات والبصمات.
- `ZARRA-ASSET-MANIFEST.json` — نموذج وملفات وبصمات النسخة المثبتة.
- `test-pretrained.js` — اختبارات عقد pretrained والفشل الآمن.
- `ZARRA-INTEGRATION-STATUS.md` — حالة التنفيذ والحدود التي تم التحقق منها.

## الخصوصية

ملفات runtime الإنتاجية المعدلة في هذه النسخة لا تحتوي `fetch()` أو `XMLHttpRequest` أو `WebSocket` أو عناوين `http/https`. واجهة Zarra تستقبل بايتات النموذج من التطبيق المحلي فقط. لا يوجد استدعاء inference خارجي.

## ملاحظة تحقق

هذه الحزمة تتضمن ملفات Zarra المحلية (`model.safetensors`, `tokenizer.json`, `config.json`) وruntime JavaScript محلي. يبقى Zarra في وضع retrieval-only إلى أن يثبت اختبار مستقل التطابق مع Precompiled normalizer المرجعي. راجع `ZARRA-V0.13-VALIDATION.txt`.
