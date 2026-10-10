import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const registry=JSON.parse(read('data/math-papers/active-collections.json'));
const data=JSON.parse(read('data/math-papers/lx-ruc-math2-2009-2025.json'));
const reader=read('assets/js/math-2027-reader.js'),graph=read('assets/js/math-2027-overview.js');
assert.equal(data.subject,'数学二');
assert.equal(data.category,'历年真题');
assert.deepEqual(data.papers.map(p=>p.year),Array.from({length:17},(_,i)=>2009+i));
assert.deepEqual(registry.collections.filter(c=>c.enabled).map(c=>c.id),['math2-past-2009-2025','zhangyu-2027-math2']);
assert.equal(registry.collections.find(c=>c.id==='math2-past-2009-2025').category,'past');
assert.deepEqual([...new Set(data.papers.map(p=>p.category))],['历年真题']);
assert.ok(!data.papers.some(p=>p.year<2009||p.year>2025));
const questions=data.papers.flatMap(p=>p.questions);
assert.equal(questions.length,386);
assert.equal(new Set(questions.map(q=>q.id)).size,386);
const valid=questions.filter(q=>q.verification==='source-transcription');
const pending=questions.filter(q=>q.verification==='pending');
assert.equal(valid.length,370);
assert.equal(pending.length,16);
for(const p of data.papers){
 assert.equal(p.questions.length,p.year<=2020?23:22);
 for(const [index,q] of p.questions.entries()){
  assert.equal(q.number,index+1);
  assert.equal(q.id,`math2-${p.year}-q${index+1}`);
  assert.ok(['choice','fill','solution'].includes(q.type));
  assert.ok(q.provenanceUrl.startsWith('https://github.com/lx-ruc/kaoyanshuxue/blob/main/kaoyan_math_images/数学二/'));
  assert.ok(!q.provenanceUrl.includes('数学一')&&!q.provenanceUrl.includes('数学三'));
  assert.ok(q.sourceQuestionId>0);
  assert.ok(!/<img|data:image|<canvas|<svg/i.test(q.stem));
  if(q.verification==='source-transcription'){
   assert.ok(q.stem.trim().length>9);
   assert.equal((q.stem.match(/\$/g)||[]).length%2,0);
   if(q.type==='choice'){
    assert.deepEqual(Object.keys(q.options),['A','B','C','D']);
    assert.ok(Object.values(q.options).every(v=>v.length&&((v.match(/\$/g)||[]).length%2===0)));
   }
  }else{
   assert.equal(q.stem,'');
   assert.deepEqual(q.options,{});
  }
 }
}
assert.match(reader,/source-transcription/);
assert.match(graph,/source-transcription/);
assert.match(reader,/referenceAnswer/);
assert.match(reader,/category==='past'/);
assert.match(graph,/row\.paper\.year/);
const legacy=read('assets/js/question-bank-switch.js');
assert.doesNotMatch(legacy,/math-papers\/catalog\.json/);
console.log('Math II past exams: 2009–2025, 17 papers, 386 indexed, 370 source text, 16 flagged pending; Math I/III excluded.');
