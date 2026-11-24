import test from 'node:test';
import assert from 'node:assert/strict';
import { formatContent, extractReferencesAndFollowUps } from './format';

test('extracts follow-ups correctly and cleans text', () => {
  const input = `هذا بيان الحكم الشرعي.

[[متابعة]]
- ما حكم الصلاة على الراحلة؟
- هل يجوز الجمع في السفر؟`;

  const res = extractReferencesAndFollowUps(input);
  assert.equal(res.cleanedText, 'هذا بيان الحكم الشرعي.');
  assert.equal(res.followUps.length, 2);
  assert.equal(res.followUps[0], 'ما حكم الصلاة على الراحلة؟');
  assert.equal(res.followUps[1], 'هل يجوز الجمع في السفر؟');
});

test('extracts scholarly references from [[مراجع]] correctly', () => {
  const input = `هذا بيان شروط الصلاة.

[[مراجع]]
- المتن: زاد المستقنع | النص: «وشروط الصلاة تسعة: الإسلام، والعقل، والتمييز» | الموضع: كتاب الصلاة - باب شروط الصلاة
- الكتاب: صحيح البخاري | النص: «إنما الأعمال بالنيات» | الموضع: كتاب بدء الوحي رقم 1

[[متابعة]]
- ما حكم من نسي شرطاً؟`;

  const res = extractReferencesAndFollowUps(input);
  assert.equal(res.cleanedText, 'هذا بيان شروط الصلاة.');
  assert.equal(res.references.length, 2);
  assert.equal(res.references[0].title, 'زاد المستقنع');
  assert.equal(res.references[0].excerpt, 'وشروط الصلاة تسعة: الإسلام، والعقل، والتمييز');
  assert.equal(res.references[0].location, 'كتاب الصلاة - باب شروط الصلاة');

  assert.equal(res.references[1].title, 'صحيح البخاري');
  assert.equal(res.references[1].excerpt, 'إنما الأعمال بالنيات');
  assert.equal(res.references[1].location, 'كتاب بدء الوحي رقم 1');

  assert.equal(res.followUps.length, 1);
  assert.equal(res.followUps[0], 'ما حكم من نسي شرطاً؟');
});

test('formats Quranic ayah brackets with span.ayah and matn quote with span.matn-quote', () => {
  const input = 'قال تعالى: ﴿إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا﴾ وقال في المتن: «لا تصح الصلاة إلا بطهور»';
  const res = formatContent(input);
  assert.ok(res.html.includes('<span class="ayah">﴿إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا﴾</span>'));
  assert.ok(res.html.includes('<span class="matn-quote">«لا تصح الصلاة إلا بطهور»</span>'));
});
