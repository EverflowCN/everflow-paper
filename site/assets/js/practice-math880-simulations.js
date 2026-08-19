(()=>{
'use strict';

const RECORD_KEY='everflow-ll880-24sets-record-v1';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
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
  if(el)el.innerHTML=`<strong>${evalScore(p,r.score??'')}</strong><span>${evalTime(r.time??'')}</span>`;
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
