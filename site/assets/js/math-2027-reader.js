import {typeset} from '/assets/js/math-papers-core.js?v=20260909-math2-papers1';
const DATA_URL='/data/math-papers/zhangyu-2027-math2.json?v=20261010-2';
const STORAGE='everflow-math2-2027-simulation-v1';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=$('#math-app');
let doc=null,paper=null,at=0,started=0,timer=null;
function record(){
 try{const r=JSON.parse(localStorage.getItem(STORAGE)||'{}');return r&&typeof r==='object'&&!Array.isArray(r)?r:{}}catch{return{}}
}
function currentRecord(){return record()[paper.id]||{answers:{},judgements:{},elapsed:0,visited:[]}}
function save(patch){
 if(!paper)return;
 try{const all=record();all[paper.id]={...currentRecord(),...patch,updatedAt:new Date().toISOString()};localStorage.setItem(STORAGE,JSON.stringify(all))}catch(error){console.warn('数学二2027本机记录存储失败',error)}
}
function countAnswers(id,items){const answers=record()[id]?.answers||{};return items.filter(q=>q.verification==='proofread'&&String(answers[q.id]||'').trim()).length}
function qualified(q){return q?.verification==='proofread'&&Boolean(q.stem)}
function readableCount(p){return p.questions.filter(qualified).length}
function drawIndex(){
 closeTimer();
 const html=doc.papers.map((p,i)=>{const n=readableCount(p),count=countAnswers(p.id,p.questions),rate=n?Math.round(count/n*100):0;return `<button class="card" type="button" data-open="${i}" aria-label="打开第${i+1}套试卷">
  <header><span>${p.year} · 张宇八套卷</span><span class="pill ${n<22?'pending':''}">${n===22?'已录入':'校核中'}</span></header>
  <h2>第 ${i+1} 套</h2><div class="stats">选择10 · 填空6 · 解答6 · ${n}/22题已完成数字转录</div>
  <div class="bar"><i style="width:${rate}%"></i></div>
  <footer><span>本机已答 ${count}/${n}</span><strong>进入试卷 →</strong></footer>
  </button>`}).join('');
 root.innerHTML=`<section class="hero"><div><div class="eyebrow">EVERFLOW / 2027 MATH II</div><h1>27模拟卷</h1><p>张宇考研数学预测八套卷 · 数学二。逐题转为可选择、可填写的文字与数学公式，不使用整页截图；适合电脑与手机作答。</p></div><div class="pill">共 8 套 · 176 题</div></section>
 <div class="notice">资料为试题分册，未提供参考答案与解析，因此不自动判分。处于「校核中」的试题禁止将残缺公式当作正式题干显示；校核完成后自动开放。当前已校核 ${doc.verificationSummary.proofread} 道，待校核 ${doc.verificationSummary.pending} 道。</div>
 <section class="cards" aria-label="八套模拟卷">${html}</section>`;
 root.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openPaper(Number(b.dataset.open))));
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
 const q=paper.questions[at],rec=currentRecord(),mine=answer(q),allCorrect=paper.questions.length;
 const buttons=paper.questions.map((x,i)=>{const a=String(rec.answers?.[x.id]||'').trim(),j=rec.judgements?.[x.id]||'';
 return `<button data-jump="${i}" class="${at===i?'current ':''}${!qualified(x)?'locked ':a?'answered ':''}${j==='wrong'?'wrong':''}" type="button" title="第 ${x.number} 题 · ${qualified(x)?a?'已记录':'可作答':'校核中'}">${x.number}</button>`}).join('');
 root.innerHTML=`<div class="paper-shell">
 <aside class="sidebar"><h3>27 模拟卷</h3><p>选取试卷，题目保留原卷顺序。</p><nav class="paper-index">${doc.papers.map((p,i)=>`<button data-select-paper="${i}" class="${i===doc.papers.indexOf(paper)?'active':''}" type="button"><span>第 ${i+1} 套</span><small>${readableCount(p)}/22</small></button>`).join('')}</nav></aside>
 <main class="viewer">
  <header class="viewer-head"><div><div class="eyebrow">2027 · MATH II · PAPER ${doc.papers.indexOf(paper)+1}</div><h2>张宇预测八套卷 · 第 ${doc.papers.indexOf(paper)+1} 套</h2><p>第 ${q.number} / ${allCorrect} 题 · ${title(q)}</p></div><button class="btn" data-exit>← 返回目录</button></header>
  <div class="type-label">${title(q)} ${qualified(q)?'· 已人工转录':'· 数学公式待人工核对'}</div>
  ${qualified(q)?`<div class="stem" data-math-display>${esc(q.stem).replace(/\n/g,'<br>')}</div>${diagram(q.diagram)}${q.type==='choice'?`<div class="choices" data-math-display>${Object.entries(q.options).map(([letter,value])=>`<button type="button" class="choice ${mine===letter?'selected':''}" data-answer-choice="${letter}"><b>${letter}</b><span>${esc(value).replace(/\n/g,'<br>')}</span></button>`).join('')}</div>`:`<label class="inputlabel" for="math-draft">${q.type==='fill'?'填写答案（可输入 LaTeX）':'作答草稿与演算思路（本机保存）'}</label><textarea id="math-draft" class="draft" data-draft placeholder="${q.type==='fill'?'填写你的答案':'写下推导过程、最终结论或留作复盘…'}">${esc(mine)}</textarea>`}`:
 `<div class="status-warning"><strong>第 ${q.number} 题尚未完成数学公式复核</strong><p>原始 PDF 的自动文字层存在积分上下限、根号、指数、矩阵等缺损。为避免错误题干误导学习，本站暂不展示未核实的 OCR 文本，也不会以整页截图代替转录。</p><p>此题已经建立序号与卷内位置，待逐字校对后开放。</p></div>`}
  ${qualified(q)?`<section class="judge"><strong>手动判定与复盘</strong><p>上传文件仅包含试题，不包含标准答案。本区不自动判对错；可在自行核对后标记。</p><div class="judge-buttons"><button class="btn" data-judge="correct" aria-pressed="${rec.judgements?.[q.id]==='correct'}">✓ 自判正确</button><button class="btn" data-judge="wrong" aria-pressed="${rec.judgements?.[q.id]==='wrong'}">✕ 自判错误</button><button class="btn" data-judge="" aria-pressed="${!rec.judgements?.[q.id]}">清除判定</button></div></section>`:''}
  <div class="viewer-nav"><button class="btn" data-prev ${at===0?'disabled':''}>← 上一题</button><span class="spacer"></span><button class="btn primary" data-next ${at===21?'disabled':''}>下一题 →</button></div>
 </main>
 <aside class="answer-sheet"><h3>答题卡</h3><p>纯文字题库 · 原题序号</p><div class="sheet">${buttons}</div><div class="mini-stats"><span>${count(paper)} 道已答</span><span>共 ${readableCount(paper)} 道已校核</span></div><div class="progress-strip"><i style="width:${Math.round(count(paper)/22*100)}%"></i></div><p style="color:var(--muted);font-size:10px;line-height:1.65;margin-top:13px">绿色：已作答；淡黄：校核中；红色：自行标错。作答与计时记录仅在当前设备保存。</p></aside></div>`;
 window.scrollTo({top:0,behavior:'instant'});
 setTimeout(()=>{root.querySelectorAll('[data-math-display]').forEach(node=>typeset(node).catch(()=>{}))},0);
 if(!keepFocus)root.querySelector('[data-math-display]')?.setAttribute('tabindex','-1');
 bindReader();
}
function openPaper(index,q=1){
 closeTimer();paper=doc.papers[index];if(!paper)return;
 const last=Number(currentRecord().lastQuestion||1);
 at=Math.max(0,Math.min(21,Number(q||last)-1));
 started=Date.now();history.replaceState(null,'',`?paper=${index+1}&q=${at+1}`);renderReader();timer=setInterval(tick,1000);
}
function persistTime(){
 if(!paper||!started)return;
 const elapsed=Math.max(0,Math.floor((Date.now()-started)/1000));
 save({elapsed:(Number(currentRecord().elapsed)||0)+elapsed,lastQuestion:at+1});
 started=Date.now();
}
function tick(){if(paper&&Date.now()-started>30000)persistTime()}
function closeTimer(){if(timer)clearInterval(timer);timer=null;if(paper)persistTime();started=0}
function changeQ(index){if(index<0||index>=22)return;persistTime();at=index;save({lastQuestion:at+1});history.replaceState(null,'',`?paper=${doc.papers.indexOf(paper)+1}&q=${at+1}`);renderReader()}
function saveAnswer(value){
 const q=paper?.questions[at];if(!qualified(q))return;
 const rec=currentRecord();save({answers:{...rec.answers,[q.id]:value},lastQuestion:at+1});
}
function bindReader(){
 root.querySelector('[data-exit]')?.addEventListener('click',()=>{closeTimer();paper=null;history.replaceState(null,'',location.pathname);drawIndex()});
 root.querySelectorAll('[data-select-paper]').forEach(b=>b.addEventListener('click',()=>openPaper(Number(b.dataset.selectPaper))));
 root.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>changeQ(Number(b.dataset.jump))));
 root.querySelector('[data-prev]')?.addEventListener('click',()=>changeQ(at-1));
 root.querySelector('[data-next]')?.addEventListener('click',()=>changeQ(at+1));
 root.querySelectorAll('[data-answer-choice]').forEach(b=>b.addEventListener('click',()=>{saveAnswer(b.dataset.answerChoice);renderReader()}));
 const draft=root.querySelector('[data-draft]');if(draft){let debounce=0;draft.addEventListener('input',()=>{const text=draft.value;clearTimeout(debounce);debounce=setTimeout(()=>saveAnswer(text),180)});draft.addEventListener('blur',()=>saveAnswer(draft.value))}
 root.querySelectorAll('[data-judge]').forEach(b=>b.addEventListener('click',()=>{const q=paper.questions[at],r=currentRecord();const j={...r.judgements};if(b.dataset.judge)j[q.id]=b.dataset.judge;else delete j[q.id];save({judgements:j});renderReader()}));
}
document.addEventListener('keydown',event=>{
 if(!paper||event.target.closest('input,textarea,select,[contenteditable]')||event.ctrlKey||event.metaKey)return;
 if(event.key==='ArrowLeft')changeQ(at-1);
 if(event.key==='ArrowRight')changeQ(at+1);
 if(/^[A-Da-d]$/.test(event.key)&&paper.questions[at]?.type==='choice'&&qualified(paper.questions[at])){saveAnswer(event.key.toUpperCase());renderReader()}
 if(event.key==='Escape'){closeTimer();paper=null;history.replaceState(null,'',location.pathname);drawIndex()}
});
window.addEventListener('pagehide',()=>{if(paper)closeTimer()});
async function main(){
 try{
 const response=await fetch(DATA_URL,{cache:'no-cache'});if(!response.ok)throw new Error('HTTP '+response.status);
 doc=await response.json();
 if(doc?.papers?.length!==8||doc.papers.some(p=>p.questions?.length!==22))throw new Error('八套题目清单结构不完整');
 const params=new URLSearchParams(location.search),n=Number(params.get('paper')),q=Number(params.get('q'));
 if(Number.isInteger(n)&&n>=1&&n<=8)openPaper(n-1,Number.isInteger(q)&&q>=1&&q<=22?q:0);else drawIndex();
 }catch(error){root.innerHTML=`<div class="error">2027 数学二套题载入失败：${esc(error?.message||error)}。请检查网络或刷新页面。</div>`}
}
main();
