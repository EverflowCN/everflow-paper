import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const reader=read('assets/js/math-2027-reader.js');
const styles=read('assets/css/math-library-v3.css');
const html=read('math/27/index.html');
const manifest=JSON.parse(read('data/math-papers/active-collections.json'));
const past=JSON.parse(read('data/math-papers/lx-ruc-math2-2009-2025.json'));
const simulations=JSON.parse(read('data/math-papers/zhangyu-2027-math2.json'));
assert.match(html,/math-library-v3\.css\?v=20261011-design3/);
assert.match(html,/body class="math-library-page"/);
assert.match(reader,/class="library-paper-row/);
assert.match(reader,/libraryShowDoneOnly/);
assert.match(reader,/librarySortNewest/);
assert.match(reader,/library-overview-link/);
assert.match(reader,/source-transcription/);
assert.match(styles,/\.library-paper-row\{/);
assert.match(styles,/\.paper-row-map \.heatmap-wrap\.is-gallery \.heatmap-grid/);
assert.match(styles,/repeat\(var\(--question-count\),minmax\(0,1fr\)\)/);
assert.match(styles,/repeat\(12,minmax\(0,1fr\)\)/);
assert.match(styles,/@media\(max-width:820px\)/);
assert.match(styles,/@media\(max-width:560px\)/);
assert.match(styles,/:focus-visible/);
assert.match(styles,/\.math-library-page \.overview-page/);
const begin=reader.indexOf('let librarySortNewest='),end=reader.indexOf('function diagram(name){');
assert.ok(begin>0&&end>begin);
const segment=reader.slice(begin,end);
function makeGallery(collection,document){
 const mount={innerHTML:'',classList:{add(name){this.value=name}},
  querySelectorAll(){return[]},querySelector(){return null}};
 const env={
  registry:manifest,currentCollection:collection,doc:document,root:mount,
  categoryLabel:id=>manifest.categories.find(c=>c.id===id)?.title||'试卷库',
  esc:x=>String(x),record:()=>({}),
  heatCounts:p=>({total:p.questions.length,done:0,correct:0,wrong:0,answered:0}),
  heatmapHtml:p=>'<div class="heatmap-wrap is-gallery">'+p.id+'</div>',
  heatLegend:()=>'<span>✓ × ?</span>',
  closeTimer:()=>{},bindHeatmap:()=>{}
 };
 const fn=new Function('env',`const {registry,currentCollection,doc,root,categoryLabel,esc,record,heatCounts,heatmapHtml,heatLegend,closeTimer,bindHeatmap}=env; ${segment}\n return drawIndex;`);
 fn(env)();
 return mount.innerHTML;
}
const pastCollection=manifest.collections.find(c=>c.category==='past');
const pastHtml=makeGallery(pastCollection,past);
assert.equal((pastHtml.match(/class="library-paper-row /g)||[]).length,17);
assert.ok(pastHtml.indexOf('2025 年')<pastHtml.indexOf('2024 年'));
assert.ok(pastHtml.indexOf('2024 年')<pastHtml.indexOf('2009 年'));
assert.match(pastHtml,/2009—2025/);
assert.match(pastHtml,/2027 · 张宇八套卷/);
assert.match(pastHtml,/17<\/strong>/);
assert.match(pastHtml,/题目作答分布/);
const simCollection=manifest.collections.find(c=>c.category==='simulation');
const simHtml=makeGallery(simCollection,simulations);
assert.equal((simHtml.match(/class="library-paper-row /g)||[]).length,8);
assert.ok(simHtml.indexOf('第 01 套')<simHtml.indexOf('第 08 套'));
assert.match(simHtml,/已做套卷图谱/);
assert.match(simHtml,/开始/);
console.log('Math library v3: 17 past exam rows + 8 simulation rows, editorial responsive matrix and navigation OK');
