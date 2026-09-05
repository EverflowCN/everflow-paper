import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('site/assets/js/zhenti-wall.js','utf8');
const subjects=JSON.parse(fs.readFileSync('site/data/zhenti/subject-index.json','utf8')).years;
const topics=JSON.parse(fs.readFileSync('site/data/zhenti/topic-index.json','utf8')).years;
const topicIndex=new Map(Object.entries(topics).flatMap(([year,qs])=>Object.entries(qs).map(([q,value])=>[`${year}-${q}`,value])));
const ctx={subject:'ds',sideMode:'point',selectedPoint:'全部考点',topicIndexReady:true,topicIndex,questionsForSubject:(year,key)=>subjects[year][key]};
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  function scopedQuestions('),source.indexOf('  let subjectIndexReady=')),ctx);
assert.equal(topicIndex.size,846);
for(const year of Object.keys(subjects))for(const key of Object.keys(subjects[year])){
  ctx.subject=key;
  ctx.selectedPoint='全部考点';
  assert.deepEqual(Array.from(ctx.scopedQuestions(year)),subjects[year][key]);
  const chapters=new Set(subjects[year][key].map(q=>topics[year][q]));
  const found=[];
  for(const chapter of chapters){ctx.selectedPoint=chapter;const qs=Array.from(ctx.scopedQuestions(year));assert(qs.every(q=>topics[year][q]===chapter));found.push(...qs);}
  assert.deepEqual(found.sort((a,b)=>a-b),subjects[year][key]);
}
ctx.subject='ds';ctx.selectedPoint='排序';
assert.deepEqual(Array.from(ctx.scopedQuestions(2025)),[10,11]);
ctx.selectedPoint='查找';assert.deepEqual(Array.from(ctx.scopedQuestions(2025)),[7,8,9]);
ctx.topicIndexReady=false;assert.equal(ctx.scopedQuestions(2025).length,0);
ctx.sideMode='year';assert.deepEqual(Array.from(ctx.scopedQuestions(2025)),subjects[2025].ds);
assert(source.includes("selectedPoint=chapter;renderAll()"));
assert(source.includes('sideMode=btn.dataset.sideMode;renderAll()'));
console.log('Topic filtering OK: 18 years, 4 subjects, 846 questions; loading, reset and year mode verified');
