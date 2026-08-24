import{loadRelaxData,loadRecords,patchRecord,syncAnswerCompatibility,toggleBookmark,compatHas,optionEntries,assetUrl,questionImages,explanationImages,questionNumber,subjectName,esc}from'./relax1000-core.js';

const app=document.querySelector('[data-relax-app]');
if(!app)throw new Error('Relax1000 app root missing');

const $=s=>app.querySelector(s),$$=s=>[...app.querySelectorAll(s)];
const els={builder:$('[data-builder]'),paper:$('[data-paper]'),result:$('[data-result]'),subjects:$('[data-subjects]'),chapters:$('[data-chapters]'),generate:$('[data-generate]'),tip:$('[data-builder-tip]'),paperTitle:$('[data-paper-title]'),progress:$('[data-progress]'),answered:$('[data-answered]'),timer:$('[data-timer]'),grid:$('[data-answer-grid]'),card:$('[data-question-card]'),prev:$('[data-prev]'),next:$('[data-next]'),submit:$('[data-submit]'),exit:$('[data-exit]'),bankTotal:$('[data-bank-total]'),seenTotal:$('[data-seen-total]'),wrongTotal:$('[data-wrong-total]')};

const SUBJECT_ORDER=['ds','co','os','cn'];
const QUOTA={ds:11,co:12,os:10,cn:7};
const WEIGHTS={ds:[.05,.16,.17,.27,.15,.1,.1],co:[.08,.2,.23,.13,.21,.15],os:[.06,.32,.22,.2,.2],cn:[.05,.09,.2,.29,.23,.14]};
const shuffle=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const choose=(list,count,random=true)=>(random?shuffle(list):[...list]).slice(0,Math.max(0,count));
const ids=list=>new Set(list.map(q=>String(q.id)));

let data=null,mode='simulation',scope='all',size=40,currentSubject='ds',selectedChapters=new Set(),paper=[],answers={},index=0,seconds=0,timer=null;

function allChapters(){return data.subjects.flatMap(s=>s.chapters.map(c=>c.id))}
function subjectObject(id){return data.subjects.find(s=>s.id===id)}
function syncStats(){
  const seen=new Set(JSON.parse(localStorage.getItem('relax-seen')||'[]').map(String));
  const wrong=new Set(JSON.parse(localStorage.getItem('relax-mistakes')||'[]').map(String));
  els.bankTotal.textContent=data?.questions?.length||0;els.seenTotal.textContent=seen.size;els.wrongTotal.textContent=wrong.size;
}
function recordState(q){
  const rec=loadRecords()[String(q.id)]||{};
  return{seen:Boolean(rec.answer)||compatHas('relax-seen',q.id),wrong:rec.correct===false||compatHas('relax-mistakes',q.id),favorite:Boolean(rec.favorite)||compatHas('relax-bookmarks',q.id)};
}
function filterState(q){
  const checked=$$('.relax-filters input:checked').map(i=>i.value);
  if(!checked.length||checked.includes('all'))return true;
  const s=recordState(q);
  return checked.some(v=>v==='unseen'?!s.seen:v==='wrong'?s.wrong:v==='seen'?s.seen:v==='favorite'?s.favorite:false);
}
function scopePool(){return data.questions.filter(q=>(scope==='all'||q.subjectId===scope)&&filterState(q))}

function renderSubjects(){
  const counts=Object.fromEntries(data.subjects.map(s=>[s.id,data.questions.filter(q=>q.subjectId===s.id).length]));
  els.subjects.innerHTML=`<button type="button" data-subject="all" class="${scope==='all'?'active':''}"><b>全部</b><small>${data.questions.length} 题</small></button>`+data.subjects.map(s=>`<button type="button" data-subject="${s.id}" class="${scope===s.id?'active':''}"><b>${esc(s.name)}</b><small>${counts[s.id]} 题</small></button>`).join('');
  els.subjects.querySelectorAll('[data-subject]').forEach(btn=>btn.addEventListener('click',()=>{scope=btn.dataset.subject;currentSubject=scope==='all'?currentSubject:scope;renderSubjects();renderChapters()}));
}
function renderChapters(){
  const subjects=scope==='all'?data.subjects:[subjectObject(scope)].filter(Boolean);
  els.chapters.innerHTML=subjects.map(s=>`<section><header><b>${esc(s.name)}</b><button type="button" data-toggle-subject="${s.id}">全选 / 取消</button></header><div>${s.chapters.map((c,i)=>{const count=data.questions.filter(q=>q.chapterId===c.id).length;return`<label class="${selectedChapters.has(c.id)?'checked':''}"><input type="checkbox" data-chapter="${c.id}" ${selectedChapters.has(c.id)?'checked':''}><span>${String(i+1).padStart(2,'0')}</span><b>${esc(c.name)}</b><small>${count}题</small></label>`}).join('')}</div></section>`).join('');
  els.chapters.querySelectorAll('[data-chapter]').forEach(input=>input.addEventListener('change',()=>{input.checked?selectedChapters.add(input.dataset.chapter):selectedChapters.delete(input.dataset.chapter);renderChapters()}));
  els.chapters.querySelectorAll('[data-toggle-subject]').forEach(btn=>btn.addEventListener('click',()=>{const s=subjectObject(btn.dataset.toggleSubject),list=s.chapters.map(c=>c.id),all=list.every(id=>selectedChapters.has(id));list.forEach(id=>all?selectedChapters.delete(id):selectedChapters.add(id));renderChapters()}));
}
function setMode(next){
  mode=next;$$('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  if(mode==='simulation'){scope='all';size=40}
  if(mode==='wrong'){size=20;const all=$('.relax-filters input[value="all"]'),wrong=$('.relax-filters input[value="wrong"]');$$('.relax-filters input').forEach(i=>i.checked=false);wrong.checked=true;all.checked=false}
  if(mode==='quick'){scope='all';size=10;renderSubjects();renderChapters();generate();return}
  renderSubjects();renderChapters();syncSizeButtons();
  els.tip.textContent=mode==='simulation'?'严格按 408 选择题 11 / 12 / 10 / 7 分科抽取。':mode==='emphasis'?'约 70% 题量来自勾选章节，其余从同范围随机补足。':'仅从当前未掌握错题中抽取，可继续限制科目。';
}
function syncSizeButtons(){$$('[data-size]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.size)===size);b.disabled=mode==='simulation'})}

function simulationPaper(pool){
  const result=[];
  for(const sid of SUBJECT_ORDER){
    const subjectPool=pool.filter(q=>q.subjectId===sid),subject=subjectObject(sid),quota=QUOTA[sid],used=new Set();
    subject.chapters.forEach((c,i)=>{
      const target=Math.max(i===subject.chapters.length-1?0:1,Math.floor(quota*(WEIGHTS[sid]?.[i]||0)));
      choose(subjectPool.filter(q=>q.chapterId===c.id&&!used.has(String(q.id))),target,true).forEach(q=>{used.add(String(q.id));result.push(q)})
    });
    const have=result.filter(q=>q.subjectId===sid).length;
    choose(subjectPool.filter(q=>!used.has(String(q.id))),quota-have,true).forEach(q=>result.push(q));
  }
  if(result.length<40){const used=ids(result);result.push(...choose(pool.filter(q=>!used.has(String(q.id))),40-result.length,true))}
  return result.slice(0,40);
}
function emphasisPaper(pool){
  const focused=pool.filter(q=>selectedChapters.has(q.chapterId)),other=pool.filter(q=>!selectedChapters.has(q.chapterId));
  const target=Math.min(focused.length,Math.round(size*.7)),result=[...choose(focused,target,true),...choose(other,size-target,true)];
  if(result.length<size){const used=ids(result);result.push(...choose(pool.filter(q=>!used.has(String(q.id))),size-result.length,true))}
  return result.slice(0,size);
}
function generate(){
  let pool=scopePool();
  if(mode==='wrong')pool=pool.filter(q=>recordState(q).wrong);
  if(!pool.length){window.EveraUI?.toast?.('当前筛选条件下没有可用题目',{type:'error'});return}
  paper=mode==='simulation'?simulationPaper(pool):mode==='emphasis'?emphasisPaper(pool):choose(pool,size,true);
  if(!paper.length)return;
  if($('[data-shuffle]')?.checked)paper=shuffle(paper);
  answers={};index=0;seconds=0;clearInterval(timer);timer=setInterval(()=>{seconds++;els.timer.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`},1000);
  els.builder.hidden=true;els.result.hidden=true;els.paper.hidden=false;els.paperTitle.textContent=mode==='simulation'?'408 仿真结构 · Relax1000':mode==='wrong'?'Relax1000 错题专项':mode==='emphasis'?'Relax1000 章节侧重练习':'Relax1000 快速练习';renderPaper();window.scrollTo({top:0,behavior:'smooth'});
}
function imageStack(list,label){return list.length?`<div class="relax-source-images">${list.map((src,i)=>`<a href="${assetUrl(src)}" target="_blank" rel="noopener"><img src="${assetUrl(src)}" alt="${label}${i+1}" loading="lazy"></a>`).join('')}</div>`:''}
function renderPaper(){
  const q=paper[index];if(!q)return;
  els.progress.textContent=`${index+1} / ${paper.length}`;els.answered.textContent=`已答 ${Object.keys(answers).length}`;
  els.grid.innerHTML=paper.map((item,i)=>`<button type="button" data-jump="${i}" class="${i===index?'current':''} ${answers[item.id]?'answered':''}">${i+1}</button>`).join('');
  els.grid.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{index=Number(b.dataset.jump);renderPaper()}));
  const opts=optionEntries(q),imgs=questionImages(q),chosen=answers[q.id]||'';
  els.card.innerHTML=`<div class="relax-q-meta"><span>${esc(subjectName(q.subjectId,q.subject))} · ${esc(q.chapter||'')}</span><b>原册第 ${esc(questionNumber(q,index))} 题</b><button type="button" data-bookmark>${compatHas('relax-bookmarks',q.id)?'★ 已收藏':'☆ 收藏'}</button></div>${imgs.length?imageStack(imgs,'原题截图'):`<h2>${esc(q.stem||'')}</h2>`}<div class="relax-options">${(opts.length?opts:'ABCD'.split('').map(key=>({key,text:''}))).map(o=>`<button type="button" data-answer="${esc(o.key)}" class="${chosen===o.key?'selected':''}"><b>${esc(o.key)}</b><span>${esc(o.text)}</span><i>✓</i></button>`).join('')}</div>`;
  els.card.querySelectorAll('[data-answer]').forEach(btn=>btn.addEventListener('click',()=>{answers[q.id]=btn.dataset.answer;renderPaper()}));
  els.card.querySelector('[data-bookmark]')?.addEventListener('click',()=>{toggleBookmark(q);renderPaper()});
  els.prev.disabled=index===0;els.next.textContent=index===paper.length-1?'交卷':'下一题 →';
}
function handIn(){
  clearInterval(timer);timer=null;
  let correct=0;const rows=[];
  paper.forEach(q=>{const answer=answers[q.id]||'',ok=answer===String(q.answer);if(ok)correct++;const prev=loadRecords()[String(q.id)]||{};patchRecord(q.id,{answer:answer||undefined,correct:answer?ok:false,reviewed:true,attempts:(prev.attempts||0)+1});syncAnswerCompatibility(q,answer?ok:false);if(!ok)rows.push(q)});
  syncStats();els.paper.hidden=true;els.result.hidden=false;const score=paper.length?Math.round(correct/paper.length*100):0;
  els.result.innerHTML=`<section class="relax-result-hero"><div><span>本次完成</span><h1>${correct} / ${paper.length}</h1><p>正确率 ${score}% · 用时 ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}</p></div><button type="button" data-again>再组一套</button></section><section class="relax-result-list"><h2>${rows.length?`错题复盘 · ${rows.length} 题`:'本套全对'}</h2>${rows.map(q=>{const expl=explanationImages(q);return`<article><header><b>${esc(subjectName(q.subjectId,q.subject))} · ${esc(q.chapter||'')}</b><span>你的答案 ${esc(answers[q.id]||'未作答')} · 正确答案 ${esc(q.answer)}</span></header>${questionImages(q).length?imageStack(questionImages(q),'错题截图'):`<h3>${esc(q.stem||'')}</h3>`}<details><summary>查看解析</summary>${expl.length?imageStack(expl,'解析截图'):`<p>${esc(q.explanation||'暂无文字解析，请查看原册解析截图。')}</p>`}</details></article>`}).join('')}</section>`;
  els.result.querySelector('[data-again]')?.addEventListener('click',()=>{els.result.hidden=true;els.builder.hidden=false;window.scrollTo({top:0,behavior:'smooth'})});window.scrollTo({top:0,behavior:'smooth'});
}

$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
$$('[data-size]').forEach(b=>b.addEventListener('click',()=>{if(mode==='simulation')return;size=Number(b.dataset.size);syncSizeButtons()}));
$$('.relax-filters input').forEach(input=>input.addEventListener('change',()=>{if(input.value==='all'&&input.checked)$$('.relax-filters input').forEach(i=>{if(i!==input)i.checked=false});else if(input.value!=='all'&&input.checked)$('.relax-filters input[value="all"]').checked=false;if(!$$('.relax-filters input:checked').length)$('.relax-filters input[value="all"]').checked=true}));
els.generate.addEventListener('click',generate);els.prev.addEventListener('click',()=>{if(index>0){index--;renderPaper()}});els.next.addEventListener('click',()=>{if(index<paper.length-1){index++;renderPaper()}else handIn()});els.submit.addEventListener('click',handIn);els.exit.addEventListener('click',()=>{clearInterval(timer);timer=null;els.paper.hidden=true;els.builder.hidden=false});
document.addEventListener('keydown',e=>{if(els.paper.hidden||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const k=e.key.toUpperCase();if(['A','B','C','D'].includes(k)){answers[paper[index].id]=k;renderPaper();e.preventDefault()}else if(e.key==='ArrowLeft'&&index>0){index--;renderPaper();e.preventDefault()}else if(e.key==='ArrowRight'){index<paper.length-1?(index++,renderPaper()):handIn();e.preventDefault()}else if(e.key==='Enter'){index<paper.length-1?(index++,renderPaper()):handIn();e.preventDefault()}});

data=await loadRelaxData();selectedChapters=new Set(allChapters());renderSubjects();renderChapters();syncStats();syncSizeButtons();
