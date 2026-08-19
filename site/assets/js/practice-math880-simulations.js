(()=>{
'use strict';

const RECORD_KEY='everflow-ll880-24sets-record-v1';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data={sets:[]};
let records={};
let activePhase='all';

function parseEmbeddedData(){
  const el=document.getElementById('ll880-static-data');
  if(!el)return {sets:[]};
  try{return JSON.parse(el.textContent||'{"sets":[]}')}catch(e){console.warn('LL880 embedded data parse failed; static HTML remains usable.',e);return {sets:[]}}
}
function loadRecords(){try{records=JSON.parse(localStorage.getItem(RECORD_KEY)||'{}')||{}}catch{records={}}}
function saveRecords(){try{localStorage.setItem(RECORD_KEY,JSON.stringify(records))}catch{}}
function recordFor(n){return records[String(n)]||{}}
function paperFor(n){return (data.sets||[]).find(x=>Number(x.number)===Number(n))}
function evalScore(paper,score){
  if(!paper||score===''||score===null||score===undefined||!Number.isFinite(Number(score)))return '未记录';
  const n=Number(score);
  if(n<paper.pass)return '低于合格线';
  if(n<paper.target)return '合格线～目标分';
  if(n<paper.excellent)return '达到目标分';
  return '达到优秀线';
}
function evalTime(time){
  if(time===''||time===null||time===undefined||!Number.isFinite(Number(time)))return '未记录';
  const n=Number(time);
  if(n<=170)return '速度优秀';
  if(n<=180)return '时间合格';
  return '建议压时';
}
function hydrateRecords(){
  $$('.sim880-card').forEach(card=>{
    const n=card.dataset.paper;
    const r=recordFor(n);
    const score=card.querySelector(`[data-score="${n}"]`);
    const time=card.querySelector(`[data-time="${n}"]`);
    if(score&&r.score!==undefined)score.value=r.score;
    if(time&&r.time!==undefined)time.value=r.time;
    refreshEval(n);
  });
}
function refreshEval(n){
  const p=paperFor(n),r=recordFor(n),el=$(`[data-eval="${n}"]`);
  if(el)el.innerHTML=`<strong>${esc(evalScore(p,r.score??''))}</strong><span>${esc(evalTime(r.time??''))}</span>`;
}
function updateRecord(n,field,value){
  const key=String(n);
  records[key]=records[key]||{};
  if(value==='')delete records[key][field];else records[key][field]=Number(value);
  if(!Object.keys(records[key]).length)delete records[key];
  saveRecords();refreshEval(n);
}
function applyFilters(){
  const q=String($('[data-search]')?.value||'').trim().toLowerCase();
  let shown=0;
  $$('.sim880-card').forEach(card=>{
    const text=(card.dataset.search||'').toLowerCase();
    const okQ=!q||text.includes(q);
    const okPhase=activePhase==='all'||card.dataset.position===activePhase;
    card.hidden=!(okQ&&okPhase);
    if(!card.hidden)shown++;
  });
  let empty=$('.sim880-empty-filter');
  if(!shown){
    if(!empty){empty=document.createElement('div');empty.className='sim880-empty sim880-empty-filter';empty.textContent='没有匹配的仿真卷。';$('[data-papers]')?.appendChild(empty)}
  }else empty?.remove();
}
function detailHtml(p){
  if(!p)return '';
  return `<div class="sim880-detail-summary">
    <div><span>定位</span><strong>${esc(p.position)}</strong></div>
    <div><span>难度</span><strong>${esc(p.difficulty)}</strong></div>
    <div><span>合理得分</span><strong>${esc(p.scoreRange)}</strong></div>
    <div><span>合格 / 目标 / 优秀</span><strong>${esc(p.pass)} / ${esc(p.target)} / ${esc(p.excellent)}</strong></div>
    <div><span>真题映射 A/B/C</span><strong>${esc(p.abc?.A??0)} / ${esc(p.abc?.B??0)} / ${esc(p.abc?.C??0)}</strong></div>
  </div>
  <div class="sim880-table-wrap"><table class="sim880-table">
    <thead><tr><th>#</th><th>880定位</th><th>书内页</th><th>B站</th><th>具体小节</th><th>真题对应</th><th>真题题型</th><th>具体考法</th><th>级别</th><th>QID</th></tr></thead>
    <tbody>${(p.questions||[]).map(q=>`<tr><td>${esc(q.no)}</td><td>${esc(q.source)}</td><td>${esc(q.page)}</td><td>${esc(q.bPart)}</td><td>${esc(q.bSection)}</td><td>${esc(q.realExam)}</td><td>${esc(q.realType)}</td><td>${esc(q.method)}</td><td><span class="sim880-level">${esc(q.level)}</span></td><td><code>${esc(q.qid)}</code></td></tr>`).join('')}</tbody>
  </table></div>`;
}
function openPaper(n){
  const p=paperFor(n),dialog=$('[data-paper-dialog]');
  if(!p||!dialog)return;
  const kicker=$('[data-dialog-kicker]'),title=$('[data-dialog-title]'),meta=$('[data-dialog-meta]'),body=$('[data-dialog-body]');
  if(kicker)kicker.textContent=`PAPER ${String(p.number).padStart(2,'0')} · ${p.difficulty}`;
  if(title)title.textContent=`第 ${String(p.number).padStart(2,'0')} 套 · 22题逐题对照`;
  if(meta)meta.textContent=`${p.position} · ${p.relative} · 合理得分 ${p.scoreRange}`;
  if(body){body.innerHTML=detailHtml(p);body.scrollTop=0}
  document.documentElement.classList.add('sim880-dialog-open');
  if(typeof dialog.showModal==='function'){
    if(!dialog.open)dialog.showModal();
  }else{
    dialog.setAttribute('open','');dialog.classList.add('is-fallback-open');
  }
  requestAnimationFrame(()=>dialog.querySelector('[data-dialog-close]')?.focus({preventScroll:true}));
}
function closeDialog(){
  const dialog=$('[data-paper-dialog]');
  if(!dialog)return;
  if(typeof dialog.close==='function'&&dialog.open)dialog.close();
  else{dialog.removeAttribute('open');dialog.classList.remove('is-fallback-open')}
  document.documentElement.classList.remove('sim880-dialog-open');
}
function bind(){
  $('[data-search]')?.addEventListener('input',applyFilters);
  $$('[data-phase-chip]').forEach(btn=>btn.addEventListener('click',()=>{
    activePhase=btn.dataset.phaseChip||'all';
    $$('[data-phase-chip]').forEach(x=>x.classList.toggle('is-active',x===btn));
    applyFilters();
  }));
  document.addEventListener('input',e=>{
    if(e.target.matches('[data-score]'))updateRecord(e.target.dataset.score,'score',e.target.value);
    if(e.target.matches('[data-time]'))updateRecord(e.target.dataset.time,'time',e.target.value);
  });
  document.addEventListener('click',e=>{
    const open=e.target.closest('[data-open]');
    if(open){e.preventDefault();openPaper(open.dataset.open);return}
    if(e.target.closest('[data-dialog-close]')){e.preventDefault();closeDialog()}
  });
  const dialog=$('[data-paper-dialog]');
  dialog?.addEventListener('click',e=>{if(e.target===dialog)closeDialog()});
  dialog?.addEventListener('close',()=>document.documentElement.classList.remove('sim880-dialog-open'));
  $('[data-clear-record]')?.addEventListener('click',()=>{
    if(!confirm('清空 24 套仿真卷的本机分数和用时记录？'))return;
    records={};saveRecords();
    $$('[data-score],[data-time]').forEach(x=>x.value='');
    $$('.sim880-card').forEach(c=>refreshEval(c.dataset.paper));
  });
  $$('[data-phase-filter]').forEach(card=>card.addEventListener('click',()=>{
    const phase=card.dataset.phaseFilter||'all';
    const btn=$(`[data-phase-chip="${phase}"]`);
    btn?.click();
    $('[data-papers]')?.scrollIntoView({behavior:'smooth',block:'start'});
  }));
}
function init(){
  data=parseEmbeddedData();
  loadRecords();
  bind();
  hydrateRecords();
  applyFilters();
  document.documentElement.dataset.ll880Static='ready';
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
