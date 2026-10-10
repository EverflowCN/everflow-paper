import {typeset} from './math-2027-mathjax.js?v=20261010-heatmap4';
import * as cloud from './math-paper-cloud.js?v=20261011-overview1';
const ROOT='/math/27/';
const MANIFEST='/data/math-papers/active-collections.json?v=20261011-compact1';
const $=selector=>document.querySelector(selector);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const surface=$('[data-map-inner]'),view=$('[data-map-scroll]'),layout=$('[data-overview-layout]');
const detail=$('[data-overview-detail]'),detailBody=$('[data-detail-content]');
let manifest=null,groups=[],rows=[],selected=null,size=27,filter='all',pan=false,preventClick=false,renderSerial=0;
const symbols={correct:'✓',wrong:'×',answered:'?',visited:'·',unseen:'',locked:'—'};
const labels={correct:'自评正确',wrong:'自评错误',answered:'已作答，待判断',visited:'已浏览',unseen:'未做',locked:'待校核'};
function qualified(q){return q?.verification==='proofread'&&Boolean(q?.stem)}
function statusFor(q,rec={}){
 if(!qualified(q))return'locked';
 if(rec.judgements?.[q.id]==='correct')return'correct';
 if(rec.judgements?.[q.id]==='wrong')return'wrong';
 if(String(rec.answers?.[q.id]??'').trim())return'answered';
 if((rec.visited||[]).includes(q.id))return'visited';
 return'unseen';
}
function reallyAttempted(rec){
 const answers=rec?.answers&&typeof rec.answers==='object'?Object.values(rec.answers):[];
 const grades=rec?.judgements&&typeof rec.judgements==='object'?Object.values(rec.judgements):[];
 return answers.some(v=>String(v??'').trim())||grades.some(v=>v==='correct'||v==='wrong');
}
function numbers(){
 const totals={papers:rows.length,attempted:0,correct:0,wrong:0,awaiting:0};
 for(const row of rows)for(const q of row.paper.questions){
  const state=statusFor(q,row.state);
  if(state==='correct')totals.correct++;
  else if(state==='wrong')totals.wrong++;
  else if(state==='answered')totals.awaiting++;
 }
 totals.attempted=totals.correct+totals.wrong+totals.awaiting;
 return totals;
}
async function load(){
 const response=await fetch(MANIFEST,{cache:'default'});
 if(!response.ok)throw Error('卷库列表读取失败：'+response.status);
 const data=await response.json();
 manifest={...data,collections:(data.collections||[]).filter(c=>c.enabled===true)};
 if(!manifest.collections.length)throw Error('还没有启用的试卷系列');
 await cloud.initialize(manifest);
 groups=await Promise.all(manifest.collections.map(async c=>{
  const r=await fetch(c.dataUrl,{cache:'default'});
  if(!r.ok)throw Error(c.title+' 加载失败：'+r.status);
  const d=await r.json();
  return{collection:c,papers:Array.isArray(d.papers)?d.papers:[]};
 }));
 render();
}
function gathered(){
 const included=[];
 for(const group of groups){
  const records=cloud.read(group.collection);
  const active=group.papers.map((paper,index)=>({
   group,collection:group.collection,paper,index,state:records[paper.id]||{}
  })).filter(row=>reallyAttempted(row.state));
  if(active.length)included.push({group,active});
 }
 rows=included.flatMap(x=>x.active);
 return included;
}
function totalsHtml(){
 const t=numbers();
 $('[data-overview-stats]').innerHTML=[
  ['已做套卷',t.papers],['已答题目',t.attempted],['✓ 正确',t.correct],['× 错误',t.wrong],['? 待判断',t.awaiting]
 ].map(([title,value])=>`<div class="overview-stat"><strong>${value}</strong><span>${title}</span></div>`).join('');
 $('[data-overview-count]').textContent=t.papers+' 套已做 · '+t.attempted+' 题已答';
}
function matrixFor(group){
 const label=esc(group.group.collection.title);
 const maxCols=Math.max(0,...group.active.map(r=>r.paper.questions.length));
 const headers=Array.from({length:maxCols},(_,i)=>`<span class="overview-column" aria-hidden="true">${i+1}</span>`).join('');
 const cells=group.active.map(row=>{
  const body=row.paper.questions.map((q,i)=>{
   const state=statusFor(q,row.state),match=filter==='all'||(filter==='answered'?state==='answered':filter===state),index=rows.indexOf(row);
   const title=`${label} · 第${row.index+1}套 · 第${i+1}题 · ${labels[state]}`;
   return `<button type="button" class="overview-cell ${state}${match?'':' dim'}${selected?.questionId===q.id?' is-selected':''}"
       data-row="${index}" data-q="${i}" title="${esc(title)}" aria-label="${esc(title)}" ${state==='locked'?'disabled':''}><span aria-hidden="true">${symbols[state]}</span></button>`;
  }).join('')+Array.from({length:maxCols-row.paper.questions.length},()=>'<span class="overview-blank"></span>').join('');
  return `<span class="overview-row-label" title="${label} 第${row.index+1}套"><strong>第${row.index+1}套</strong><small>${row.paper.questions.length}题</small></span>${body}`;
 }).join('');
 return `<div class="overview-collection-heading"><span>${label}</span><small>· ${group.active.length} 套有作答</small></div><div class="overview-matrix" style="--cols:${maxCols}"><span class="overview-column corner">套卷 / 题号</span>${headers}${cells}</div>`;
}
function render(){
 const serial=++renderSerial,prevLeft=view.scrollLeft,prevTop=view.scrollTop;
 const included=gathered();
 totalsHtml();
 if(!included.length){
  surface.innerHTML=`<div class="overview-empty"><div><h2>还没有做过的套卷</h2><p>整体图谱只收录真正作答或自评过的试卷；单纯打开、浏览但没有作答的试卷不会出现在这里。</p><a class="btn primary" href="${ROOT}">开始练习 →</a></div></div>`;
  closeDetail();return;
 }
 surface.style.setProperty('--cell',size+'px');
 surface.innerHTML=included.map(matrixFor).join('');
 $('[data-zoom-label]').textContent=size+'px';
 if(serial===renderSerial)requestAnimationFrame(()=>view.scrollTo({left:prevLeft,top:prevTop}));
 if(selected){
  const newRow=rows.findIndex(r=>r.paper.id===selected.paperId&&r.collection.id===selected.collectionId);
  if(newRow<0)closeDetail();
  else{selected.row=newRow;showDetail(newRow,selected.index)}
 }
}
function showDetail(index,qIndex){
 const row=rows[index],q=row?.paper.questions[qIndex];
 if(!row||!q)return;
 selected={row:index,index:qIndex,paperId:row.paper.id,collectionId:row.collection.id,questionId:q.id};
 surface.querySelectorAll('.overview-cell.is-selected').forEach(el=>el.classList.remove('is-selected'));
 surface.querySelector(`[data-row="${index}"][data-q="${qIndex}"]`)?.classList.add('is-selected');
 layout.classList.add('is-open');detail.hidden=false;
 $('[data-detail-title]').textContent=`${row.collection.shortTitle||row.collection.title} · 第${row.index+1}套 · 第${qIndex+1}题`;
 const state=statusFor(q,row.state);
 const answer=String(row.state.answers?.[q.id]||'');
 const statusLabel=state==='correct'?'✓ 自评正确':state==='wrong'?'× 自评错误':state==='answered'?'? 已答待判断':labels[state];
 const options=q.options&&typeof q.options==='object'?
  Object.entries(q.options).map(([letter,value])=>`<div class="choice ${answer===letter?'selected':''}"><b>${esc(letter)}</b><span>${esc(value)}</span></div>`).join(''):'';
 const answerLabel=answer?(`<p class="overview-judgement ${state==='correct'||state==='wrong'?state:''}">您的答案：${esc(answer)} · ${esc(statusLabel)}</p>`):(`<p class="overview-judgement ${state==='correct'||state==='wrong'?state:''}">${esc(statusLabel)}</p>`);
 detailBody.innerHTML=`<div class="type-label">第 ${qIndex+1} 题 · ${q.type==='choice'?'选择题':q.type==='fill'?'填空题':'解答题'}</div><div class="stem" data-render-math>${esc(q.stem||'当前题目内容尚未核验。').replace(/\n/g,'<br>')}</div>${options?`<div class="choices" data-render-math>${options}</div>`:''}${answerLabel}<p class="overview-local-note" style="font-size:11px;color:var(--muted)">这里仅展示原题与本人的作答标记，进入原题可修改答案与复盘状态。</p>`;
 $('[data-go-question]').href=`${ROOT}?collection=${encodeURIComponent(row.collection.id)}&paper=${row.index+1}&q=${qIndex+1}`;
 detailBody.querySelectorAll('[data-render-math]').forEach(el=>typeset(el).catch(()=>{}));
}
function closeDetail(){selected=null;detail.hidden=true;layout.classList.remove('is-open');surface.querySelector('.overview-cell.is-selected')?.classList.remove('is-selected')}
function adjustZoom(next){
 size=Math.max(19,Math.min(40,next));render();
}
surface.addEventListener('click',event=>{
 const button=event.target.closest('[data-row][data-q]');
 if(!button||preventClick)return;
 showDetail(Number(button.dataset.row),Number(button.dataset.q));
});
$('[data-close-detail]').addEventListener('click',closeDetail);
$('[data-overview-filter]').addEventListener('change',event=>{filter=event.target.value;render()});
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-zoom]');if(!button)return;
 adjustZoom(button.dataset.zoom==='in'?size+4:button.dataset.zoom==='out'?size-4:27);
});
$('[data-overview-sync]').addEventListener('click',async()=>{
 const result=await cloud.syncNow('manual');
 if(result?.reason==='guest')location.href='/account/';
});
cloud.onStatus(({kind,text})=>{
 const node=$('[data-overview-status]');if(node){node.textContent=text;node.dataset.status=kind}
 const button=$('[data-overview-sync]');button.disabled=kind==='busy';
 button.textContent=kind==='guest'?'登录后同步':'↻ 同步云端';
});
document.addEventListener('everflow:math-records-change',()=>{
 if(!manifest)return;render();
});
document.addEventListener('everflow:math-account-change',()=>{
 if(!manifest)return;closeDetail();render();
});
let down=null;
view.addEventListener('pointerdown',event=>{
 if(event.pointerType==='touch'||event.button!==0)return;
 down={x:event.clientX,y:event.clientY,left:view.scrollLeft,top:view.scrollTop,moved:false};
});
view.addEventListener('pointermove',event=>{
 if(!down)return;
 const dx=event.clientX-down.x,dy=event.clientY-down.y;
 if(Math.hypot(dx,dy)>5)down.moved=true;
 if(down.moved){view.scrollLeft=down.left-dx;view.scrollTop=down.top-dy;view.classList.add('is-panning')}
});
function endPan(){
 const wasDragged=Boolean(down?.moved);
 down=null;view.classList.remove('is-panning');
 if(wasDragged){preventClick=true;setTimeout(()=>{preventClick=false},90)}
}
view.addEventListener('pointerup',endPan);view.addEventListener('pointercancel',endPan);
view.addEventListener('wheel',event=>{
 if(event.shiftKey&&Math.abs(event.deltaY)>0){event.preventDefault();view.scrollLeft+=event.deltaY}
},{passive:false});
document.addEventListener('keydown',event=>{
 if(event.target.closest('input,textarea,select')||event.altKey||event.ctrlKey||event.metaKey)return;
 if(event.key==='Escape'){closeDetail();return}
 if(!selected||!/^Arrow(Left|Right|Up|Down)$/.test(event.key))return;
 const row=rows[selected.row];
 if(!row)return;
 const dir=event.key.slice(5);
 let nextRow=selected.row,nextQ=selected.index;
 if(dir==='Left')nextQ=Math.max(0,selected.index-1);
 if(dir==='Right')nextQ=Math.min(row.paper.questions.length-1,selected.index+1);
 if(dir==='Up')nextRow=Math.max(0,nextRow-1);
 if(dir==='Down')nextRow=Math.min(rows.length-1,nextRow+1);
 nextQ=Math.min(nextQ,rows[nextRow].paper.questions.length-1);
 event.preventDefault();showDetail(nextRow,nextQ);
 const cell=surface.querySelector(`[data-row="${nextRow}"][data-q="${nextQ}"]`);
 cell?.scrollIntoView({block:'nearest',inline:'nearest'});
});
load().catch(error=>{console.warn('Math overview failed',error);surface.innerHTML=`<div class="overview-empty"><div><h2>图谱暂时无法加载</h2><p>${esc(error.message||error)}</p><a class="btn" href="/math/27/">返回卷库</a></div></div>`;});
