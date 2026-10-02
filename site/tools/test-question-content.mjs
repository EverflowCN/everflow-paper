import assert from 'node:assert/strict';

globalThis.window={};
const {structuredText,richText}=await import('../assets/js/question-content-v1.js');

assert.equal(structuredText('下列说法（1）甲（2）乙'),'下列说法\n（1）甲\n（2）乙');
assert.equal(structuredText('条件(1)甲；(2)乙'),'条件\n(1)甲；\n(2)乙');
assert.equal(structuredText('f(1)=0 且 f(2)=1'),'f(1)=0 且 f(2)=1');
assert.match(richText('（1）<甲>（2）乙'),/&lt;甲&gt;/);
console.log('question content rendering OK');
