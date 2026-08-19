(()=>{
'use strict';

const DATA_B64_GZIP='/data/practice/math2-lilin880-24sets.json.gz.b64';
const XLSX_PARTS=Array.from({length:8},(_,i)=>`downloads/ll880-24/part-${String(i+1).padStart(2,'0')}.b64`);
const RECORD_KEY='everflow-ll880-24sets-record-v1';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let data=null;
let records={};

function loadRecords(){
  try{records=JSON.parse(localStorage.getItem(RECORD_KEY)||'{}')||{}}catch{records={}}
}
function saveRecords(){try{localStorage.setItem(RECORD_KEY,JSON.stringify(records))}catch{}}
function recordFor(n){return records[String(n)]||{}}
function evalScore(paper,score){
  if(score===''||score===null||score===undefined||!Number.isFinite(Number(score)))return '未记录';
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
function searchText(p){
  return [
    `第${p.number}套`,p.position,p.difficulty,p.relative,p.scoreRange,p.note,
    ...p.questions.flatMap(q=>[q.source,q.bPart,q.bSection,q.realExam,q.realType,q.method,q.level,q.qid])
  ].join(' ').toLowerCase();
}
function cardHtml(p){
  const r=recordFor(p.number),score=r.score??'',time=r.time??'';
  const evalText=evalScore(p,score),timeText=evalTime(time);
  const abc=`A/B/C ${p.abc.A}/${p.abc.B}/${p.abc.C}`;
  const tops=p.topChapters.slice(0,3).map(x=>`<span>${esc(x.name.replace(/^第[一二三四五六七八九十]+章\s*/,''))} ×${x.count}</span>`).join('');
  return `<article class="sim880-card" data-paper="${p.number}" data-position="${esc(p.position)}" data-search="${esc(searchText(p))}">
    <header class="sim880-card-head">
      <div class="sim880-card-no"><span>PAPER ${String(p.number).padStart(2,'0')}</span><strong>第 ${String(p.number).padStart(2,'0')} 套</strong></div>
      <span class="sim880-difficulty">${esc(p.difficulty)}</span>
    </header>
    <div class="sim880-card-main"><h3>${esc(p.position)}</h3><p>${esc(p.relative)} · 合理得分 ${esc(p.scoreRange)}</p></div>
    <div class="sim880-score-band">
      <div><span>合格</span><strong>${p.pass}</strong></div>
      <div><span>目标</span><strong>${p.target}</strong></div>
      <div><span>优秀</span><strong>${p.excellent}</strong></div>
      <div><span>真题映射</span><strong>${abc}</strong></div>
    </div>
    <div class="sim880-card-tags"><span>B站 ${esc(p.bilibiliLocated)}</span><span>22题逐题回链</span>${tops}</div>
    <div class="sim880-record">
      <label class="sim880-field"><span>实得分</span><input inputmode="decimal" type="number" min="0" max="150" step="1" placeholder="—" data-score="${p.number}" value="${esc(score)}"></label>
      <label class="sim880-field"><span>用时/min</span><input inputmode="decimal" type="number" min="1" max="360" step="1" placeholder="—" data-time="${p.number}" value="${esc(time)}"></label>
    </div>
    <div class="sim880-eval" data-eval="${p.number}"><strong>${esc(evalText)}</strong><span>${esc(timeText)}</span></div>
    <div class="sim880-card-actions"><button type="button" data-open="${p.number}">查看 22 题逐题表</button></div>
  </article>`;
}
function render(){
  const host=$('[data-papers]');
  host.innerHTML=data.sets.map(cardHtml).join('');
  applyFilters();
}
function applyFilters(){
  const q=String($('[data-search]')?.value||'').trim().toLowerCase();
  const pos=$('[data-position]')?.value||'all';
  let shown=0;
  $$('.sim880-card').forEach(card=>{
    const ok=(!q||card.dataset.search.includes(q))&&(pos==='all'||card.dataset.position===pos);
    card.hidden=!ok;if(ok)shown++;
  });
  if(!shown){
    const host=$('[data-papers]');
    if(!host.querySelector('.sim880-empty-filter')){
      const e=document.createElement('div');e.className='sim880-empty sim880-empty-filter';e.textContent='没有匹配的仿真卷。';host.appendChild(e);
    }
  }else host.querySelector('.sim880-empty-filter')?.remove();
}
function updateRecord(number,field,value){
  const key=String(number);
  records[key]=records[key]||{};
  if(value==='')delete records[key][field];else records[key][field]=Number(value);
  if(!Object.keys(records[key]).length)delete records[key];
  saveRecords();
  const paper=data.sets.find(x=>x.number===Number(number)),r=recordFor(number),el=$(`[data-eval="${number}"]`);
  if(el)el.innerHTML=`<strong>${esc(evalScore(paper,r.score??''))}</strong><span>${esc(evalTime(r.time??''))}</span>`;
}
function detailHtml(p){
  return `<div class="sim880-detail-summary">
    <div><span>定位</span><strong>${esc(p.position)}</strong></div>
    <div><span>难度</span><strong>${esc(p.difficulty)}</strong></div>
    <div><span>合理得分</span><strong>${esc(p.scoreRange)}</strong></div>
    <div><span>合格 / 目标 / 优秀</span><strong>${p.pass} / ${p.target} / ${p.excellent}</strong></div>
    <div><span>真题映射 A/B/C</span><strong>${p.abc.A} / ${p.abc.B} / ${p.abc.C}</strong></div>
  </div>
  <div class="sim880-table-wrap"><table class="sim880-table">
    <thead><tr><th>#</th><th>880定位</th><th>书内页</th><th>B站</th><th>具体小节</th><th>真题对应</th><th>真题题型</th><th>具体考法</th><th>级别</th><th>QID</th></tr></thead>
    <tbody>${p.questions.map(q=>`<tr>
      <td>${q.no}</td><td>${esc(q.source)}</td><td>${esc(q.page)}</td><td>${esc(q.bPart)}</td><td>${esc(q.bSection)}</td>
      <td>${esc(q.realExam)}</td><td>${esc(q.realType)}</td><td>${esc(q.method)}</td><td><span class="sim880-level">${esc(q.level)}</span></td><td><code>${esc(q.qid)}</code></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}
function openPaper(n){
  const p=data.sets.find(x=>x.number===Number(n)),dialog=$('[data-paper-dialog]');if(!p||!dialog)return;
  $('[data-dialog-kicker]').textContent=`PAPER ${String(p.number).padStart(2,'0')} · ${p.difficulty}`;
  $('[data-dialog-title]').textContent=`第 ${String(p.number).padStart(2,'0')} 套 · 22题逐题对照`;
  $('[data-dialog-meta]').textContent=`${p.position} · ${p.relative} · 合理得分 ${p.scoreRange}`;
  $('[data-dialog-body]').innerHTML=detailHtml(p);
  dialog.showModal();
}
async function downloadWorkbook(){
  const btn=$('[data-download-xlsx]'),old=btn?.textContent;
  try{
    if(btn){btn.disabled=true;btn.textContent='正在生成 Excel…'}
    const parts=await Promise.all(XLSX_PARTS.map(async url=>{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${url}: HTTP ${r.status}`);return r.text()}));
    const b64=parts.join('').replace(/\s+/g,'');
    const raw=atob(b64),bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    if(bytes[0]!==0x50||bytes[1]!==0x4b)throw new Error('XLSX signature mismatch');
    const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='2027数学二_李林880_24套仿真卷_三部分逐题对照_含难度分数.xlsx';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }catch(e){
    console.error(e);alert('Excel 下载生成失败，请稍后刷新页面重试。');
  }finally{if(btn){btn.disabled=false;btn.textContent=old}}
}
function bind(){
  $('[data-search]')?.addEventListener('input',applyFilters);
  $('[data-position]')?.addEventListener('change',applyFilters);
  $$('[data-phase-filter]').forEach(x=>x.addEventListener('click',()=>{const s=$('[data-position]');if(s){s.value=x.dataset.phaseFilter;s.dispatchEvent(new Event('change'))}}));
  document.addEventListener('click',e=>{
    const open=e.target.closest('[data-open]');if(open)openPaper(open.dataset.open);
    if(e.target.closest('[data-dialog-close]'))$('[data-paper-dialog]')?.close();
  });
  document.addEventListener('input',e=>{
    if(e.target.matches('[data-score]'))updateRecord(e.target.dataset.score,'score',e.target.value);
    if(e.target.matches('[data-time]'))updateRecord(e.target.dataset.time,'time',e.target.value);
  });
  $('[data-clear-record]')?.addEventListener('click',()=>{if(confirm('清空 24 套仿真卷的本地分数与用时记录？')){records={};saveRecords();render()}});
  $('[data-download-xlsx]')?.addEventListener('click',downloadWorkbook);
  $('[data-paper-dialog]')?.addEventListener('click',e=>{if(e.target===e.currentTarget)e.currentTarget.close()});
}
async function init(){
  loadRecords();bind();
  try{
    const r=await fetch(DATA_B64_GZIP,{cache:'no-store'});if(!r.ok)throw new Error(`${DATA_B64_GZIP}: HTTP ${r.status}`);
    const b64=(await r.text()).replace(/\s+/g,'');
    const raw=atob(b64),bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    if(typeof DecompressionStream!=='function')throw new Error('DecompressionStream unavailable');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const text=await new Response(stream).text();
    data=JSON.parse(text);
    data.sets=(data.sets||[]).sort((a,b)=>a.number-b.number);
    if(data.sets.length!==24)throw new Error(`expected 24 papers, got ${data.sets.length}`);
    render();
  }
  catch(e){console.error(e);$('[data-papers]').innerHTML='<div class="sim880-empty">24套数据读取失败，请刷新页面重试。</div>'}
}
init();
})();