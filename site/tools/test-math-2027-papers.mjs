import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const parse=path=>JSON.parse(readFileSync(new URL(path,root),'utf8'));
const old=parse('data/math-papers/catalog.json');
const book=parse('data/math-papers/zhangyu-2027-math2.json');
assert.equal(book.subject,'数学二');
assert.equal(book.edition,2027);
assert.equal(book.category,'27模拟卷');
assert.equal(book.papers.length,8);
assert.equal(book.verificationSummary.total,176);
const all=book.papers.flatMap(p=>p.questions);
assert.equal(all.length,176);
assert.equal(book.verificationSummary.proofread,176);
assert.equal(book.verificationSummary.pending,0);
assert.equal(new Set(all.map(q=>q.id)).size,176);
for(const [index,paper] of book.papers.entries()){
 assert.equal(paper.year,2027);
 assert.equal(paper.id,`2027-math2-zhangyu8-${index+1}`);
 assert.equal(paper.questions.length,22);
 assert.equal(paper.questions.filter(q=>q.type==='choice').length,10);
 assert.equal(paper.questions.filter(q=>q.type==='fill').length,6);
 assert.equal(paper.questions.filter(q=>q.type==='solution').length,6);
 for(const q of paper.questions){
  assert.equal(q.id,`2027-math2-zhangyu8-${index+1}-q${q.number}`);
  assert.equal(q.verification,'proofread',`paper ${index+1} question ${q.number}`);
  assert.equal(typeof q.stem,'string');assert.ok(q.stem.length>8);
  assert.equal((q.stem.match(/\$/g)||[]).length%2,0,'balanced math delimiters');
  let braces=0;
  for(let i=0;i<q.stem.length;i++){
   if(q.stem[i]==='\\'){i++;continue}
   if(q.stem[i]==='{')braces++;
   if(q.stem[i]==='}')braces--;
   assert.ok(braces>=0,'unclosed LaTeX brace');
  }
  assert.equal(braces,0,'balanced LaTeX braces');
  assert.ok(!q.stem.includes('<img')&&!q.stem.includes('data:image'),'no screenshot question stems');
  if(q.type==='choice'){
   assert.deepEqual(Object.keys(q.options),['A','B','C','D']);
   assert.ok(Object.values(q.options).every(v=>String(v).length>0));
  }
  assert.ok(!q.ocrDraft&&!q.flags,'OCR drafts must not be published as transcriptions');
  assert.ok(q.sourcePages.length>0&&q.sourcePages.every(n=>n>=3&&n<=66));
 }
}
// Existing 107-paper library must remain untouched.
assert.equal(old.stats.papers,107);
assert.equal(old.stats.questions,2354);
assert.ok(old.paper_rows.every(row=>row[0]<=2026));
const html=readFileSync(new URL('math/27/index.html',root),'utf8');
const reader=readFileSync(new URL('assets/js/math-2027-reader.js',root),'utf8');
const legacy=readFileSync(new URL('assets/js/math-papers-ui.js',root),'utf8');
assert.match(html,/math-2027-reader\.js/);
const registry=parse('data/math-papers/active-collections.json');
assert.equal(registry.subject,'math2');
assert.equal(registry.collections.filter(c=>c.enabled).length,2);
assert.deepEqual(new Set(registry.collections.filter(c=>c.enabled).map(c=>c.id)),new Set(['zhangyu-2027-math2','math2-past-2009-2025']));
assert.equal(registry.collections.find(c=>c.id==='zhangyu-2027-math2').dataUrl,'/data/math-papers/zhangyu-2027-math2.json');
assert.match(reader,/active-collections\.json/);
assert.match(reader,/selectCollection\(id/);
assert.match(legacy,/math-27-feature/);
assert.doesNotMatch(reader,/everflow-math-papers-progress-v1/);
console.log('2027 mathematics II: 8 sets / 176 digitally transcribed questions, existing 107 sets preserved.');
