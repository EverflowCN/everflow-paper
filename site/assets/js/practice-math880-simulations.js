(()=>{
'use strict';

const DATA_B64_GZIP='/data/practice/math2-lilin880-24sets.json.gz.b64';
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
    if(!data?.sets?.length)throw new Error('data not ready');
    if(btn){btn.disabled=true;btn.textContent='正在生成 Excel…'}

    const xmlEsc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
    const cell=(v,style='')=>`<Cell${style?` ss:StyleID="${style}"`:''}><Data ss:Type="${typeof v==='number'?'Number':'String'}">${xmlEsc(v)}</Data></Cell>`;
    const row=(vals,header=false)=>`<Row>${vals.map(v=>cell(v,header?'Header':'')).join('')}</Row>`;
    const sheet=(name,rows)=>`<Worksheet ss:Name="${xmlEsc(name)}"><Table>${rows.join('')}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>`;

    const detailHeader=['卷号','卷内题号','QID','880定位','书内页码','B站分P','B站具体小节','真题对应','真题题型','具体考法','等级'];
    const detailRows=[row(detailHeader,true)];
    data.sets.forEach(p=>p.questions.forEach(q=>detailRows.push(row([
      p.number,q.no,q.qid,q.source,q.page,q.bPart,q.bSection,q.realExam,q.realType,q.method,q.level
    ]))));

    const paperHeader=['卷号','定位','难度','相对真题','合理得分区间','合格线','目标分','优秀线','B站定位','A','B','C','高频章节','说明'];
    const paperRows=[row(paperHeader,true),...data.sets.map(p=>row([
      p.number,p.position,p.difficulty,p.relative,p.scoreRange,p.pass,p.target,p.excellent,p.bilibiliLocated,
      p.abc?.A??0,p.abc?.B??0,p.abc?.C??0,(p.topChapters||[]).map(x=>`${x.name} ×${x.count}`).join('；'),p.note||''
    ]))];

    const examMap=new Map();
    data.sets.forEach(p=>p.questions.forEach(q=>{
      const key=[q.realExam,q.realType,q.method,q.level].join('｜');
      const cur=examMap.get(key)||{realExam:q.realExam,realType:q.realType,method:q.method,level:q.level,count:0,papers:new Set(),qids:[]};
      cur.count++;cur.papers.add(p.number);cur.qids.push(q.qid);examMap.set(key,cur);
    }));
    const examRows=[row(['真题对应','真题题型','具体考法','等级','映射次数','涉及套卷','QID'],true),
      ...[...examMap.values()].sort((a,b)=>b.count-a.count||String(a.realExam).localeCompare(String(b.realExam),'zh-CN')).map(x=>row([
        x.realExam,x.realType,x.method,x.level,x.count,[...x.papers].sort((a,b)=>a-b).join('、'),x.qids.join('、')
      ]))];

    const scoreRows=[row(['卷号','定位','难度','相对真题','合理得分区间','合格线','目标分','优秀线','说明'],true),
      ...data.sets.map(p=>row([p.number,p.position,p.difficulty,p.relative,p.scoreRange,p.pass,p.target,p.excellent,p.note||'']))];

    const xml=`<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10"/></Style><Style ss:ID="Header"><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#EDEDED" ss:Pattern="Solid"/><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style></Styles>
${sheet('01-24套逐题对照总表',detailRows)}
${sheet('02-24套卷画像',paperRows)}
${sheet('03-真题映射统计',examRows)}
${sheet('04-难度与分数标准',scoreRows)}
</Workbook>`;

    const blob=new Blob(['\ufeff',xml],{type:'application/vnd.ms-excel;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='2027数学二_李林880_24套仿真卷_逐题对照_网站导出版.xls';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }catch(e){
    console.error(e);alert('Excel 生成失败，请刷新页面后重试。');
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