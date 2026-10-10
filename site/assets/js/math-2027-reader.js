import {typeset} from './math-2027-mathjax.js?v=20261010-heatmap4';
import * as mathCloud from './math-paper-cloud.js?v=20261011-overview1';
const REGISTRY_URL='/data/math-papers/active-collections.json?v=20261011-math2-past1';
let storageKey='everflow-math2-2027-simulation-v1';
let registry=null,currentCollection=null;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=$('#math-app');
let doc=null,paper=null,at=0,started=0,timer=null;
function record(){return mathCloud.read(currentCollection||{storageKey})}
function currentRecord(){return record()[paper.id]||{answers:{},judgements:{},elapsed:0,visited:[]}}
function save(patch){if(paper&&currentCollection)mathCloud.update(currentCollection,paper.id,patch)}
function countAnswers(id,items){const answers=record()[id]?.answers||{};return items.filter(q=>qualified(q)&&String(answers[q.id]||'').trim()).length}
function qualified(q){return ['proofread','source-transcription'].includes(q?.verification)&&Boolean(q.stem)}
function readableCount(p){return p.questions.filter(qualified).length}
const HEAT_CLASSES=['unseen','visited','answered','correct','wrong','locked'];
const HEAT_LABELS={unseen:'未做',visited:'已浏览',answered:'已作答，待自评',correct:'自评正确',wrong:'自评错误',locked:'暂未开放'};
const HEAT_SYMBOLS={unseen:'',visited:'·',answered:'?',correct:'✓',wrong:'×',locked:'—'};
function heatStatus(q,rec={}){
 if(!qualified(q))return'locked';
 const mark=rec.judgements?.[q.id];
 if(mark==='wrong'||mark==='correct')return mark;
 if(String(rec.answers?.[q.id]??'').trim())return'answered';
 if((rec.visited||[]).includes(q.id))return'visited';
 return'unseen';
}
function heatCounts(p,rec={}){
 const counts={total:p.questions.length,unseen:0,visited:0,answered:0,correct:0,wrong:0,locked:0};
 p.questions.forEach(q=>{counts[heatStatus(q,rec)]++});
 counts.done=counts.answered+counts.correct+counts.wrong;
 counts.reviewed=counts.correct+counts.wrong;
 return counts;
}
function heatmapHtml(p,{inReader=false}={}){
 const rec=record()[p.id]||{},paperIndex=doc.papers.indexOf(p),counts=heatCounts(p,rec);
 const cells=p.questions.map((q,index)=>{
  const status=heatStatus(q,rec),pressed=inReader&&at===index;
  return `<button class="heat-cell heat-${status}${pressed?' heat-current':''}" type="button"
   data-heatmap-${inReader?'jump':'paper'}="${inReader?index:paperIndex}"
   ${inReader?'':'data-heatmap-q="'+(index+1)+'"'} ${status==='locked'?'disabled':''}
   title="第 ${index+1} 题 · ${q.type==='choice'?'选择题':q.type==='fill'?'填空题':'解答题'} · ${HEAT_LABELS[status]}"
   aria-label="第 ${index+1} 题：${HEAT_LABELS[status]}" ${pressed?'aria-current="step"':''}
   ><span aria-hidden="true">${HEAT_SYMBOLS[status]}</span></button>`;
 }).join('');
 return `<div class="heatmap-wrap ${inReader?'is-reader':'is-card'}" aria-label="第 ${paperIndex+1} 套 ${p.questions.length} 题学习热力图">
  <div class="heatmap-heading"><span>题目热力图</span><strong>${counts.done}/${counts.total}</strong></div>
  <div class="heatmap-grid" role="group" aria-label="按照题号 1—${p.questions.length} 排列的热力方格">${cells}</div>
 </div>`;
}
function heatLegend(){return `<div class="heat-legend" aria-label="三色标记图例">
 <span><i class="heat-swatch heat-correct" aria-hidden="true">✓</i>蓝色 · 正确</span>
 <span><i class="heat-swatch heat-wrong" aria-hidden="true">×</i>橙色 · 错误</span>
 <span><i class="heat-swatch heat-unseen" aria-hidden="true">?</i>灰色 · 待判断/未做</span>
 </div>`;}
function refreshReaderHeatmap(){
 if(!paper)return;
 const target=root.querySelector('[data-reader-heatmap]');
 if(target){target.innerHTML=heatmapHtml(paper,{inReader:true});bindHeatmap(target)}
 const counts=heatCounts(paper,currentRecord());
 const stats=root.querySelector('[data-heat-stats]');
 if(stats)stats.textContent=`已答 ${counts.done}/${counts.total} · 自评对 ${counts.correct} · 自评错 ${counts.wrong}`;
 const bar=root.querySelector('[data-heat-progress]');
 if(bar)bar.style.width=Math.round(counts.done/counts.total*100)+'%';
}
function bindHeatmap(container=root){
 container.querySelectorAll('[data-heatmap-paper]').forEach(b=>b.addEventListener('click',()=>{
  openPaper(Number(b.dataset.heatmapPaper),Number(b.dataset.heatmapQ));
 }));
 container.querySelectorAll('[data-heatmap-jump]').forEach(b=>b.addEventListener('click',()=>changeQ(Number(b.dataset.heatmapJump))));
}
function categoryLabel(id){return registry?.categories?.find(c=>c.id===id)?.title||'卷库'}
function collectionTabHtml(){
 const enabled=registry.collections;
 const categories=[...new Set(enabled.map(c=>c.category))];
 return `<nav class="library-collections" aria-label="选择数学二试卷系列">${categories.map(category=>{
  const collections=enabled.filter(x=>x.category===category);
  return `<div class="library-series-group"><span class="library-series-label">${esc(categoryLabel(category))}</span>
   <div class="library-series-list">${collections.map(c=>`<button type="button" data-collection-id="${esc(c.id)}" class="library-series-btn ${c.id===currentCollection.id?'active':''}" aria-pressed="${c.id===currentCollection.id}">${esc(c.year)} · ${esc(c.shortTitle||c.title)} <span>${c.id===currentCollection.id?'当前':''}</span></button>`).join('')}</div></div>`;
 }).join('')}</nav>`;
}
function drawIndex(){
 closeTimer();
 const papers=doc.papers||[];
 const records=record();
 const html=papers.map((p,i)=>{
  const counts=heatCounts(p,records[p.id]||{});
  const digits=currentCollection.category==='past'?String(p.year):String(i+1).padStart(2,'0');
  const unit=currentCollection.category==='past'?'年':' / 套';
  return `<article class="card" aria-label="第 ${i+1} 套，${counts.done}/${counts.total} 题已答">
   <header class="card-compact-head">
    <button class="card-name" type="button" data-open="${i}" aria-label="打开${esc(p.name)}">${digits}<small>${unit}</small></button>
    <span class="card-fraction" title="已答题数 / 总题数">${counts.done}<em>/${counts.total}</em></span>
   </header>
   ${heatmapHtml(p)}
   <div class="card-compact-foot">
    <div class="card-results"><span><b>✓</b> ${counts.correct}</span><span><b>×</b> ${counts.wrong}</span><span><b>?</b> ${counts.answered}</span></div>
    <button type="button" class="heat-open-btn" data-open="${i}">${counts.done?'继续':'开始'} ↗</button>
   </div>
  </article>`;
 }).join('');
 const title=currentCollection?.title||doc.title||'模拟卷';
 const total=papers.reduce((n,p)=>n+p.questions.length,0);
 root.innerHTML=`<section class="library-heading" aria-labelledby="library-title">
    <div><div class="library-breadcrumb">数学二 <span>/</span> ${esc(categoryLabel(currentCollection.category))}</div><h1 id="library-title">${esc(title)}</h1></div>
    <div class="library-heading-actions"><a class="library-overview-link" href="/math/27/map/" title="查看已实际做过的全部套卷、正误和题目">▦ 已做套卷图谱 <span>↗</span></a><div class="library-summary">${papers.length} 套 · ${total} 题</div></div>
  </section>
  ${collectionTabHtml()}
  <section class="library-tools" aria-label="热力图标记说明">
    ${heatLegend()}
    <details class="library-help"><summary>使用说明</summary><p>点击色块可直接进入对应题目；✓ 蓝色表示自评正确、× 橙色表示自评错误、? 灰色表示待判断。登录后沿用主站账号云同步，未登录时保存在本机。历年真题来自公开仓库文本，未逐题核对；仅收录数学二，不包含数学一、数学三或截图解析。未核对的题目暂不开放作答。</p></details>
  </section>
  <section class="cards" aria-label="${esc(title)} 的试卷热力图">${html}</section>`;
 root.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openPaper(Number(b.dataset.open))));
 root.querySelectorAll('[data-collection-id]').forEach(b=>b.addEventListener('click',()=>selectCollection(b.dataset.collectionId)));
 bindHeatmap(root);
}
function diagram(name){
 if(name==='tangent1')return `<figure class="diagram"><svg viewBox="0 0 500 275" role="img" aria-label="曲线 y=f(x) 在 x=ln2 处的切线 L 及第一象限内围成区域的示意重绘图">
  <defs><pattern id="dGrid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0 H0 V30" fill="none" stroke="#edf2ec" stroke-width="1"/></pattern></defs>
  <rect width="500" height="275" fill="url(#dGrid)"/><path d="M40 235 H460 M75 250 V20" fill="none" stroke="#6e8173" stroke-width="2"/>
  <path d="M75 115 Q130 111 170 141 T308 235" fill="none" stroke="#257d57" stroke-width="4"/>
  <path d="M74 72 L355 235" stroke="#d68c3c" stroke-width="3" stroke-dasharray="7 5"/>
  <circle cx="169" cy="141" r="4" fill="#d68c3c"/><path d="M169 141 V235" stroke="#8c9c90" stroke-dasharray="5 4"/>
  <g font-size="15" fill="#415d4c"><text x="465" y="241">x</text><text x="55" y="22">y</text><text x="65" y="254">O</text><text x="142" y="252">ln2</text><text x="352" y="217">L</text><text x="225" y="159">y=f(x)</text></g></svg><figcaption>根据题意重新绘制的曲线与切线示意图；不代表精确比例。</figcaption></figure>`;
 if(name==='traffic5')return `<figure class="diagram"><svg viewBox="0 0 600 400" role="img" aria-label="道路交通流量示意：A B C D 四路口及 x1 至 x5 车流方向">
  <defs><marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="#38835c"/></marker></defs>
  <rect width="600" height="400" fill="#fff"/>
  <g fill="none" stroke="#38835c" stroke-width="3" marker-end="url(#arw)">
  <path d="M305 20 V72"/><path d="M276 103 L145 162"/><path d="M325 103 L470 163"/>
  <path d="M151 183 H455"/><path d="M132 207 L276 313"/><path d="M297 315 L458 211"/>
  <path d="M92 184 H22"/><path d="M510 184 H574"/><path d="M294 348 V391"/></g>
  <g fill="#fff" stroke="#59856b" stroke-width="2"><circle cx="302" cy="97" r="20"/><circle cx="125" cy="185" r="20"/><circle cx="484" cy="185" r="20"/><circle cx="297" cy="337" r="20"/></g>
  <g fill="#244c35" font-size="17" font-weight="bold" text-anchor="middle"><text x="302" y="103">A</text><text x="125" y="191">B</text><text x="484" y="191">D</text><text x="297" y="343">C</text></g>
  <g font-size="17" fill="#326d4a"><text x="318" y="37">a</text><text x="196" y="123">x₁</text><text x="399" y="124">x₂</text><text x="298" y="170">x₃</text><text x="193" y="284">x₄</text><text x="396" y="286">x₅</text><text x="40" y="174">40</text><text x="536" y="174">100</text><text x="310" y="387">b</text></g>
 </svg><figcaption>根据题意重绘的道路流量方向示意图，请以题干守恒条件为准。</figcaption></figure>`;
 return'';
}
function count(p){return countAnswers(p.id,p.questions)}
function answer(q){return String(currentRecord()?.answers?.[q.id]||'')}
function title(q){return q.type==='choice'?'选择题 · 5 分':q.type==='fill'?'填空题 · 5 分':'解答题 · '+q.points+' 分'}
function renderReader({keepFocus=false}={}){
 const q=paper.questions[at];
 const visited=currentRecord().visited||[];
 if(qualified(q)&&!visited.includes(q.id))save({visited:[...visited,q.id]});
 const rec=currentRecord(),mine=answer(q),allCorrect=paper.questions.length;
 const buttons=paper.questions.map((x,i)=>{
 const status=heatStatus(x,rec);
 return `<button data-jump="${i}" class="${at===i?'current ':''}heat-${status}" type="button" title="第 ${x.number} 题 · ${HEAT_LABELS[status]}" aria-label="第 ${x.number} 题 · ${HEAT_LABELS[status]}">${x.number}<span aria-hidden="true">${HEAT_SYMBOLS[status]}</span></button>`;
 }).join('');
 root.innerHTML=`<div class="paper-shell">
 <aside class="sidebar"><h3>${esc(currentCollection.title)}</h3><p>选取试卷，题目保留原卷顺序。</p><nav class="paper-index">${doc.papers.map((p,i)=>`<button data-select-paper="${i}" class="${i===doc.papers.indexOf(paper)?'active':''}" type="button"><span>${currentCollection.category==='past'?p.year+' 年真题':'第 '+(i+1)+' 套'}</span><small>${readableCount(p)}/${p.questions.length}</small></button>`).join('')}</nav></aside>
 <main class="viewer">
  <header class="viewer-head"><div><div class="eyebrow">${esc(currentCollection.year)} · MATH II · PAPER ${doc.papers.indexOf(paper)+1}</div><h2>${esc(paper.name)}</h2><p>第 ${q.number} / ${allCorrect} 题 · ${title(q)}</p></div><button class="btn" data-exit>← 返回目录</button></header>
  <div class="type-label">${title(q)} ${q.verification==='proofread'?'· 已录入':q.verification==='source-transcription'?'· 来源文字（待复核）':'· 题干待核对'}</div>
  ${qualified(q)?`<div class="stem" data-math-display>${esc(q.stem).replace(/\n/g,'<br>')}</div>${diagram(q.diagram)}${q.type==='choice'?`<div class="choices" data-math-display>${Object.entries(q.options).map(([letter,value])=>`<button type="button" class="choice ${mine===letter?'selected':''}" data-answer-choice="${letter}"><b>${letter}</b><span>${esc(value).replace(/\n/g,'<br>')}</span></button>`).join('')}</div>`:`<label class="inputlabel" for="math-draft">${q.type==='fill'?'填写答案（可输入 LaTeX）':'作答草稿与演算思路（本机保存）'}</label><textarea id="math-draft" class="draft" data-draft placeholder="${q.type==='fill'?'填写你的答案':'写下推导过程、最终结论或留作复盘…'}">${esc(mine)}</textarea>`}`:
 `<div class="status-warning"><strong>第 ${q.number} 题暂未完成可靠的文字转录</strong><p>原仓库没有可用的完整文字，暂不以截图冒充数字题干。</p>${q.provenanceUrl?`<a href="${esc(q.provenanceUrl)}" target="_blank" rel="noopener noreferrer">查看来源仓库中的原题 ↗</a>`:''}</div>`}
  ${qualified(q)?`<section class="judge"><strong>手动判定与复盘</strong><p>${q.referenceAnswer?'原仓库提供选择题参考答案，可按需查看；本站仍由你手动标记正误。':'本题未提供可核对的文本答案，完成后请自行核对并标记。'}${q.verification==='source-transcription'?' 来源文字尚未逐题核对。':''}</p>${q.referenceAnswer?`<button type="button" class="btn math-reference-answer" data-show-reference data-ref="${esc(q.referenceAnswer)}">查看本题参考答案</button> <span class="math-reference-value" data-ref-value hidden>参考答案：${esc(q.referenceAnswer)}</span>`:''}${q.knowledgePoint?`<p class="math-knowledge-point">考点：${esc(q.knowledgePoint)}</p>`:''}${q.provenanceUrl?`<a class="math-origin-link" href="${esc(q.provenanceUrl)}" target="_blank" rel="noopener noreferrer">来源核对 ↗</a>`:''}<div class="judge-buttons"><button class="btn" data-judge="correct" aria-pressed="${rec.judgements?.[q.id]==='correct'}">✓ 标记正确（蓝）</button><button class="btn" data-judge="wrong" aria-pressed="${rec.judgements?.[q.id]==='wrong'}">× 标记错误（橙）</button><button class="btn" data-judge="" aria-pressed="${!rec.judgements?.[q.id]}">清除判定</button></div></section>`:''}
  <div class="viewer-nav"><button class="btn" data-prev ${at===0?'disabled':''}>← 上一题</button><span class="spacer"></span><button class="btn primary" data-next ${at===paper.questions.length-1?'disabled':''}>下一题 →</button></div>
 </main>
 <aside class="answer-sheet">
 <div data-reader-heatmap>${heatmapHtml(paper,{inReader:true})}</div>
 ${heatLegend()}
 <div class="heat-sheet-divider"></div>
 <details class="sheet-details"><summary>展开数字答题卡</summary><div class="sheet">${buttons}</div></details>
 <div class="mini-stats"><span data-heat-stats>已答 ${heatCounts(paper,rec).done}/${paper.questions.length} · 自评对 ${heatCounts(paper,rec).correct} · 自评错 ${heatCounts(paper,rec).wrong}</span></div>
 <div class="progress-strip"><i data-heat-progress style="width:${Math.round(heatCounts(paper,rec).done/paper.questions.length*100)}%"></i></div>
 <p class="heat-local-note">✓ 蓝色代表自评对，× 橙色代表自评错；灰色问号表示待自评。颜色与符号双重标记，已登录可同步云端，未登录记录保存在本机。</p>
 </aside></div>`;
 window.scrollTo({top:0,behavior:'instant'});
 setTimeout(()=>{root.querySelectorAll('[data-math-display]').forEach(node=>typeset(node).catch(()=>{}))},0);
 if(!keepFocus)root.querySelector('[data-math-display]')?.setAttribute('tabindex','-1');
 bindReader();
}
function openPaper(index,q=null){
 closeTimer();paper=doc.papers[index];if(!paper)return;
 const last=Number(currentRecord().lastQuestion||1);
 at=Math.max(0,Math.min(paper.questions.length-1,Number(q||last)-1));
 started=Date.now();history.replaceState(null,'',`?collection=${encodeURIComponent(currentCollection.id)}&paper=${index+1}&q=${at+1}`);renderReader();timer=setInterval(tick,1000);
}
function persistTime(){
 if(!paper||!started)return;
 const elapsed=Math.max(0,Math.floor((Date.now()-started)/1000));
 save({elapsed:(Number(currentRecord().elapsed)||0)+elapsed,lastQuestion:at+1});
 started=Date.now();
}
function tick(){if(paper&&Date.now()-started>30000)persistTime()}
function closeTimer(){if(timer)clearInterval(timer);timer=null;if(paper)persistTime();started=0}
function changeQ(index){if(index<0||index>=paper.questions.length)return;persistTime();at=index;save({lastQuestion:at+1});history.replaceState(null,'',`?collection=${encodeURIComponent(currentCollection.id)}&paper=${doc.papers.indexOf(paper)+1}&q=${at+1}`);renderReader()}
function saveAnswer(value){
 const q=paper?.questions[at];if(!qualified(q))return;
 const rec=currentRecord();save({answers:{...rec.answers,[q.id]:value},lastQuestion:at+1});
}
function bindReader(){
 root.querySelector('[data-exit]')?.addEventListener('click',()=>{closeTimer();paper=null;history.replaceState(null,'',`?collection=${encodeURIComponent(currentCollection.id)}`);drawIndex()});
 root.querySelectorAll('[data-select-paper]').forEach(b=>b.addEventListener('click',()=>openPaper(Number(b.dataset.selectPaper))));
 root.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>changeQ(Number(b.dataset.jump))));
 bindHeatmap(root);
 root.querySelector('[data-prev]')?.addEventListener('click',()=>changeQ(at-1));
 root.querySelector('[data-next]')?.addEventListener('click',()=>changeQ(at+1));
 root.querySelectorAll('[data-answer-choice]').forEach(b=>b.addEventListener('click',()=>{saveAnswer(b.dataset.answerChoice);renderReader()}));
 const draft=root.querySelector('[data-draft]');if(draft){let debounce=0;draft.addEventListener('input',()=>{const text=draft.value;clearTimeout(debounce);debounce=setTimeout(()=>{saveAnswer(text);refreshReaderHeatmap()},180)});draft.addEventListener('blur',()=>{saveAnswer(draft.value);refreshReaderHeatmap()})}
 root.querySelector('[data-show-reference]')?.addEventListener('click',()=>{
  const node=root.querySelector('[data-ref-value]');if(!node)return;
  node.hidden=!node.hidden;
  root.querySelector('[data-show-reference]').textContent=node.hidden?'查看本题参考答案':'收起参考答案';
 });
 root.querySelectorAll('[data-judge]').forEach(b=>b.addEventListener('click',()=>{const q=paper.questions[at],r=currentRecord();const j={...r.judgements};if(b.dataset.judge)j[q.id]=b.dataset.judge;else delete j[q.id];save({judgements:j});renderReader()}));
}
document.addEventListener('keydown',event=>{
 if(!paper||event.target.closest('input,textarea,select,[contenteditable]')||event.ctrlKey||event.metaKey)return;
 if(event.key==='ArrowLeft')changeQ(at-1);
 if(event.key==='ArrowRight')changeQ(at+1);
 if(/^[A-Da-d]$/.test(event.key)&&paper.questions[at]?.type==='choice'&&qualified(paper.questions[at])){saveAnswer(event.key.toUpperCase());renderReader()}
 if(event.key==='Escape'){closeTimer();paper=null;history.replaceState(null,'',`?collection=${encodeURIComponent(currentCollection.id)}`);drawIndex()}
});
window.addEventListener('pagehide',()=>{if(paper)closeTimer()});
async function selectCollection(id,{paperNumber=0,questionNumber=0}={}){
 const entry=registry?.collections.find(c=>c.id===id&&c.enabled);
 if(!entry)throw Error('系列不存在或未启用');
 const prefix='/data/math-papers/';
 const file=String(entry.dataUrl||'');
 const filename=file.slice(prefix.length);
 if(!file.startsWith(prefix)||!filename.endsWith('.json')||!filename||!/^[a-z0-9.-]+$/.test(filename)||filename.includes('..')||
   !String(entry.storageKey||'').startsWith('everflow-math2-')||!/^[a-z0-9-]+$/.test(entry.storageKey))throw Error('卷库登记表的数据源不合法');
 closeTimer();paper=null;
 currentCollection=entry;storageKey=entry.storageKey;
 root.innerHTML='<div class="loading">正在读取题目与热力图…</div>';
 const response=await fetch(file,{cache:'default'});
 if(!response.ok)throw Error('HTTP '+response.status+' / '+entry.title);
 const result=await response.json();
 if(!Array.isArray(result.papers)||!result.papers.length||result.papers.some(p=>!Array.isArray(p.questions)||!p.questions.length))throw Error('试卷目录结构不完整');
 doc=result;
 const n=Number(paperNumber),q=Number(questionNumber);
 if(Number.isInteger(n)&&n>=1&&n<=doc.papers.length){
  const count=doc.papers[n-1].questions.length;
  openPaper(n-1,Number.isInteger(q)&&q>=1&&q<=count?q:null);
 }else{
  history.replaceState(null,'',`?collection=${encodeURIComponent(entry.id)}`);
  drawIndex();
 }
}
async function main(){
 try{
  const response=await fetch(REGISTRY_URL,{cache:'default'});
  if(!response.ok)throw Error('卷库目录读取失败 HTTP '+response.status);
  const manifest=await response.json();
  const active=manifest.collections?.filter(c=>c.enabled===true)||[];
  if(manifest.subject!=='math2'||!active.length)throw Error('暂无开放的数学二试卷');
  registry={...manifest,collections:active};
  await mathCloud.initialize(registry);
  const params=new URLSearchParams(location.search);
  const choice=active.find(c=>c.id===params.get('collection'))||active[0];
  await selectCollection(choice.id,{paperNumber:Number(params.get('paper')||0),questionNumber:Number(params.get('q')||0)});
 }catch(error){root.innerHTML=`<div class="error">数学二试卷目录加载失败：${esc(error?.message||error)}。请刷新页面重试。</div>`;}
}

mathCloud.onStatus(({kind,text})=>{
 const label=document.querySelector('[data-math-sync-status]');
 if(label){label.textContent=text;label.dataset.status=kind}
 const button=document.querySelector('[data-math-sync]');
 if(button){button.disabled=kind==='busy';button.textContent=kind==='guest'?'登录同步':'↻ 云同步'}
});
document.querySelector('[data-math-sync]')?.addEventListener('click',async()=>{
 const result=await mathCloud.syncNow('manual');
 if(result?.reason==='guest')location.href='/account/';
});
document.addEventListener('everflow:math-records-change',event=>{
 if(!doc||event.detail?.collectionId!==currentCollection?.id||!event.detail?.remote)return;
 if(paper){if(!document.activeElement?.matches('textarea,input'))renderReader()}
 else drawIndex();
});
document.addEventListener('everflow:math-account-change',()=>{
 if(!doc)return;
 if(paper){closeTimer();paper=null;history.replaceState(null,'',location.pathname)}
 drawIndex();
});
main();
