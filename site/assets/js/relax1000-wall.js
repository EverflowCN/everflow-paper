import{loadRelaxData,loadRecords,patchRecord,syncAnswerCompatibility,toggleBookmark,questionState,questionNumber,questionImages,explanationImages,optionEntries,imageMarkup,usesQuestionImageFallback,esc,subjectName,idKey}from'./relax1000-core.js?v=20260825-bank1';

const sourceBar=document.querySelector('.bank-source-shell');
const root=document.createElement('main');
root.className='relax-bank-root relax-wall-root';
root.innerHTML=`<section class="relax-loading"><strong>正在读取 Relax1000…</strong><span>题库正在载入，首次打开可能稍慢。</span><i></i></section>`;
(sourceBar||document.querySelector('header'))?.after(root);

let data=null,subject='ds',chapter='all',filter='all',query='',visibleQuestions=[],selectedIndex=-1,analysisVisible=false;
try{subject=localStorage.getItem('everflow-408-relax-subject')||'ds'}catch{}

const getSubject=()=>data?.subjects?.find(item=>item.id===subject)||data?.subjects?.[0];
const chapterMap=()=>new Map((getSubject()?.chapters||[]).map(item=>[item.id,item]));
const allForSubject=()=>data.questions.filter(question=>question.subjectId===subject);
function filtered(){
  const records=loadRecords(),needle=query.trim().toLowerCase();
  return allForSubject().filter(question=>{
    if(chapter!=='all'&&question.chapterId!==chapter)return false;
    const state=questionState(question,records);
    if(filter==='unseen'&&state.seen)return false;
    if(filter==='seen'&&!state.seen)return false;
    if(filter==='wrong'&&!state.wrong)return false;
    if(filter==='bookmarked'&&!state.favorite)return false;
    if(needle){const hay=`${question.stem||''} ${question.chapter||''} ${question.explanation||''}`.toLowerCase();if(!hay.includes(needle))return false}
    return true;
  });
}
function stats(){
  const records=loadRecords(),questions=allForSubject();let seen=0,wrong=0,mastered=0;
  questions.forEach(question=>{const state=questionState(question,records);if(state.seen)seen++;if(state.wrong)wrong++;if(state.rec.status==='mastered')mastered++});
  return{total:questions.length,seen,wrong,mastered,rate:questions.length?Math.round(seen/questions.length*100):0};
}
function statusClass(question,records){
  const state=questionState(question,records),classes=[];
  if(state.rec.status)classes.push(`status-${state.rec.status}`);
  if(state.wrong)classes.push('is-wrong');else if(state.rec.correct===true)classes.push('is-correct');
  if(state.favorite)classes.push('is-bookmarked');
  if(state.seen)classes.push('is-seen');
  return classes.join(' ');
}
function render({focusSearch=false}={}){
  const subj=getSubject();if(!subj)return;
  if(!data.subjects.some(item=>item.id===subject))subject=subj.id;
  const s=stats(),records=loadRecords();visibleQuestions=filtered();
  const chapters=chapterMap(),groups=new Map();
  visibleQuestions.forEach(question=>{const key=question.chapterId||'other';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(question)});
  const subjectTabs=data.subjects.map(item=>`<button type="button" data-relax-subject="${esc(item.id)}" class="${item.id===subject?'active':''}">${esc(subjectName(item.id,item.name))}<small>${item.chapters?.reduce((n,c)=>n+(Number(c.count)||0),0)||data.questions.filter(q=>q.subjectId===item.id).length}</small></button>`).join('');
  const chapterButtons=[`<button type="button" data-relax-chapter="all" class="${chapter==='all'?'active':''}"><span>全部章节</span><b>${allForSubject().length}</b></button>`,...(subj.chapters||[]).map(item=>`<button type="button" data-relax-chapter="${esc(item.id)}" class="${item.id===chapter?'active':''}"><span>${esc(item.name)}</span><b>${item.count??data.questions.filter(q=>q.chapterId===item.id).length}</b></button>`)].join('');
  const groupHtml=[...groups.entries()].map(([chapterId,questions])=>{
    const chapterInfo=chapters.get(chapterId),title=chapterInfo?.name||questions[0]?.chapter||'其他';
    const chips=questions.map((question,index)=>`<button type="button" class="relax-q-chip ${statusClass(question,records)}" data-relax-id="${esc(idKey(question))}" title="${esc((question.stem||'').slice(0,100))}"><span>${esc(questionNumber(question,index))}</span>${questionState(question,records).favorite?'<i>★</i>':''}</button>`).join('');
    return `<section class="relax-chapter-block"><header><div><h3>${esc(title)}</h3><span>${questions.length} 题</span></div><small>${subjectName(subject)}</small></header><div class="relax-chip-grid">${chips}</div></section>`;
  }).join('')||'<section class="relax-empty"><strong>没有匹配题目</strong><p>更换章节、状态筛选或清空搜索后再试。</p></section>';
  root.innerHTML=`
    <section class="relax-wall-hero"><div><div class="eyebrow">RELAX 1000 QUESTION BANK</div><h1>${esc(subjectName(subject,subj.name))} · Relax1000</h1><p>按科目与章节整理，支持状态筛选、收藏、笔记与快捷作答。</p></div><div class="relax-stats"><div><strong>${s.seen}</strong><span>已做</span></div><div><strong>${s.wrong}</strong><span>待掌握错题</span></div><div><strong>${s.mastered}</strong><span>已掌握</span></div><div><strong>${s.rate}%</strong><span>完成率</span></div></div></section>
    <section class="relax-subject-tabs">${subjectTabs}</section>
    <div class="relax-wall-workspace"><aside class="relax-sidebar"><div class="relax-side-title"><strong>章节目录</strong><span>${subj.chapters?.length||0} 章</span></div><div class="relax-chapter-list">${chapterButtons}</div></aside><section class="relax-wall-main"><div class="relax-toolbar"><label class="relax-search"><span>⌕</span><input data-relax-search type="search" value="${esc(query)}" placeholder="搜索题干、章节或解析"></label><div class="relax-filter" role="group"><button data-relax-filter="all" class="${filter==='all'?'active':''}">全部</button><button data-relax-filter="unseen" class="${filter==='unseen'?'active':''}">未做</button><button data-relax-filter="wrong" class="${filter==='wrong'?'active':''}">错题</button><button data-relax-filter="bookmarked" class="${filter==='bookmarked'?'active':''}">收藏</button><button data-relax-filter="seen" class="${filter==='seen'?'active':''}">已做</button></div><span class="relax-result-count">当前 ${visibleQuestions.length} 题</span></div><div class="relax-question-groups">${groupHtml}</div></section></div>`;
  bindRoot();
  if(focusSearch)requestAnimationFrame(()=>{const input=root.querySelector('[data-relax-search]');if(input){input.focus({preventScroll:true});const end=input.value.length;input.setSelectionRange?.(end,end)}});
}
function bindRoot(){
  root.querySelectorAll('[data-relax-subject]').forEach(button=>button.addEventListener('click',()=>{subject=button.dataset.relaxSubject;chapter='all';query='';try{localStorage.setItem('everflow-408-relax-subject',subject)}catch{}render()}));
  root.querySelectorAll('[data-relax-chapter]').forEach(button=>button.addEventListener('click',()=>{chapter=button.dataset.relaxChapter;render()}));
  root.querySelectorAll('[data-relax-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.relaxFilter;render()}));
  const search=root.querySelector('[data-relax-search]');if(search)search.addEventListener('input',event=>{query=event.target.value;window.clearTimeout(search._timer);search._timer=window.setTimeout(()=>render({focusSearch:true}),220)});
  root.querySelectorAll('[data-relax-id]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.relaxId;selectedIndex=visibleQuestions.findIndex(question=>idKey(question)===id);openModal()}));
}

const modal=document.createElement('div');modal.className='relax-question-modal';modal.hidden=true;document.body.appendChild(modal);
function currentQuestion(){return visibleQuestions[selectedIndex]||null}
function optionButtons(question,rec){
  const entries=optionEntries(question);if(entries.length)return `<div class="relax-modal-options">${entries.map(item=>`<button type="button" data-relax-option="${esc(item.key)}" class="${String(rec.draftAnswer||rec.answer||'')===item.key?'selected':''} ${rec.reviewed&&item.key===String(question.answer)?'is-correct':''} ${rec.correct===false&&String(rec.answer)===item.key?'is-wrong':''}" ${rec.answer?'disabled':''}><b>${esc(item.key)}</b><span>${esc(item.text||'见原题图中的选项')}</span></button>`).join('')}</div>`;
  if(questionImages(question).length)return `<div class="relax-modal-options compact">${'ABCD'.split('').map(key=>`<button type="button" data-relax-option="${key}" class="${String(rec.draftAnswer||rec.answer||'')===key?'selected':''} ${rec.reviewed&&key===String(question.answer)?'is-correct':''} ${rec.correct===false&&String(rec.answer)===key?'is-wrong':''}" ${rec.answer?'disabled':''}><b>${key}</b></button>`).join('')}</div>`;
  return'';
}
function renderModal(){
  const question=currentQuestion();if(!question){closeModal();return}
  const records=loadRecords(),state=questionState(question,records),rec=state.rec,number=questionNumber(question,selectedIndex);
  const images=questionImages(question),analysisImages=explanationImages(question),fallback=usesQuestionImageFallback(question);
  const imageHtml=images.length?`<div class="relax-source-images">${images.map((src,index)=>imageMarkup(src,`原题截图 ${index+1}`)).join('')}</div>${fallback?'<p class="relax-image-fallback-note">这道题含公式或图表，文字识别不完整时请以原题图为准；仍可使用 A–D 正常作答。</p>':''}`:'';
  const result=rec.answer?`<div class="relax-answer-result ${rec.correct?'correct':'wrong'}"><strong>${rec.correct?'✓ 回答正确':'✕ 回答错误'}</strong><span>你的答案 ${esc(rec.answer)} · 正确答案 ${esc(question.answer)}</span></div>`:'';
  const analysis=(analysisVisible||rec.reviewed)?`<section class="relax-analysis"><header><strong>解析</strong><span>正确答案 ${esc(question.answer||'')}</span></header>${analysisImages.length?`<div class="relax-source-images analysis">${analysisImages.map((src,index)=>imageMarkup(src,`解析截图 ${index+1}`)).join('')}</div>`:`<p>${esc(question.explanation||'暂无文字解析。')}</p>`}</section>`:'';
  modal.innerHTML=`<div class="relax-modal-backdrop" data-relax-close></div><section class="relax-modal-card" role="dialog" aria-modal="true"><header class="relax-modal-head"><div><span>${esc(subjectName(question.subjectId,question.subject))}</span><strong>Relax1000 · 第 ${esc(number)} 题</strong><small>${esc(question.chapter||'')}</small></div><div class="relax-modal-head-actions"><button type="button" data-relax-favorite class="${state.favorite?'active':''}">${state.favorite?'★ 已收藏':'☆ 收藏'}</button><button type="button" data-relax-close aria-label="关闭">×</button></div></header><div class="relax-modal-body"><div class="relax-modal-status"><span>掌握状态</span><button data-relax-status="mastered" class="${rec.status==='mastered'?'active':''}">熟练</button><button data-relax-status="fuzzy" class="${rec.status==='fuzzy'?'active':''}">模糊</button><button data-relax-status="weak" class="${rec.status==='weak'?'active':''}">不会</button><button data-relax-status="" class="${!rec.status?'active':''}">清除</button></div>${imageHtml}<h2>${esc(question.stem||'题干以原题截图为准')}</h2>${optionButtons(question,rec)}${result}<div class="relax-modal-actions"><button type="button" data-relax-submit ${rec.answer||!rec.draftAnswer?'disabled':''}>${rec.answer?'已提交':'提交答案'}</button><button type="button" data-relax-analysis>${analysisVisible||rec.reviewed?'收起解析':'查看解析'}</button></div>${analysis}<label class="relax-note"><span>复盘笔记</span><textarea data-relax-note rows="3" placeholder="记录本题易错点或二刷提醒…">${esc(rec.note||'')}</textarea></label></div><footer class="relax-modal-footer"><button type="button" data-relax-prev ${selectedIndex<=0?'disabled':''}>← 上一题</button><span>${selectedIndex+1} / ${visibleQuestions.length}</span><button type="button" data-relax-next ${selectedIndex>=visibleQuestions.length-1?'disabled':''}>下一题 →</button></footer></section>`;
  modal.hidden=false;document.body.classList.add('evera-modal-open');bindModal();
}
function openModal(){analysisVisible=false;document.querySelector('.mobile-panel')?.classList.remove('open');document.body.classList.remove('menu-open');renderModal()}
function closeModal(){modal.hidden=true;modal.innerHTML='';document.body.classList.remove('evera-modal-open')}
function choose(key){const question=currentQuestion();if(!question)return;const rec=questionState(question).rec;if(rec.answer)return;patchRecord(question.id,{draftAnswer:key});renderModal()}
function submit(){const question=currentQuestion();if(!question)return;const rec=questionState(question).rec,answer=String(rec.draftAnswer||'');if(!answer||rec.answer)return;const correct=answer===String(question.answer);patchRecord(question.id,{answer,draftAnswer:answer,correct,reviewed:true,attempts:(Number(rec.attempts)||0)+1});syncAnswerCompatibility(question,correct);analysisVisible=true;render();const id=idKey(question);selectedIndex=visibleQuestions.findIndex(q=>idKey(q)===id);renderModal()}
function setStatus(status){const question=currentQuestion();if(!question)return;patchRecord(question.id,{status:status||undefined});render();const id=idKey(question);selectedIndex=visibleQuestions.findIndex(q=>idKey(q)===id);renderModal()}
function move(delta){const next=selectedIndex+delta;if(next<0||next>=visibleQuestions.length)return;selectedIndex=next;analysisVisible=false;renderModal()}
function bindModal(){
  modal.querySelectorAll('[data-relax-close]').forEach(button=>button.addEventListener('click',closeModal));
  modal.querySelectorAll('[data-relax-option]').forEach(button=>button.addEventListener('click',()=>choose(button.dataset.relaxOption)));
  modal.querySelector('[data-relax-submit]')?.addEventListener('click',submit);
  modal.querySelector('[data-relax-analysis]')?.addEventListener('click',()=>{analysisVisible=!analysisVisible;renderModal()});
  modal.querySelectorAll('[data-relax-status]').forEach(button=>button.addEventListener('click',()=>setStatus(button.dataset.relaxStatus)));
  modal.querySelector('[data-relax-favorite]')?.addEventListener('click',()=>{const question=currentQuestion();if(!question)return;toggleBookmark(question);render();const id=idKey(question);selectedIndex=visibleQuestions.findIndex(q=>idKey(q)===id);renderModal()});
  modal.querySelector('[data-relax-prev]')?.addEventListener('click',()=>move(-1));modal.querySelector('[data-relax-next]')?.addEventListener('click',()=>move(1));
  modal.querySelector('[data-relax-note]')?.addEventListener('input',event=>{const question=currentQuestion();if(question)patchRecord(question.id,{note:event.target.value||undefined})});
}
document.addEventListener('keydown',event=>{
  if(modal.hidden)return;const tag=document.activeElement?.tagName;if(tag==='TEXTAREA'||tag==='INPUT')return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeModal();return}
  if(event.key==='ArrowLeft'){move(-1);event.preventDefault();return}if(event.key==='ArrowRight'){move(1);event.preventDefault();return}
  const map={q:'A',w:'B',e:'C',r:'D'};if(map[event.key.toLowerCase()]){choose(map[event.key.toLowerCase()]);event.preventDefault();return}
  if(event.key==='Enter'){const rec=currentQuestion()?questionState(currentQuestion()).rec:{};rec.answer?move(1):submit();event.preventDefault();return}
  if(['1','2','3'].includes(event.key)){setStatus({1:'mastered',2:'fuzzy',3:'weak'}[event.key]);event.preventDefault()}
},true);

document.addEventListener('everflow:relax-records-change',()=>{if(modal.hidden)render()});
loadRelaxData().then(result=>{data=result;if(!data.subjects.some(item=>item.id===subject))subject=data.subjects[0]?.id||'ds';render()}).catch(error=>{console.error(error);root.innerHTML=`<section class="relax-load-error"><strong>Relax1000 题库读取失败</strong><p>题库数据暂时没有完整载入，请稍后重试。</p><button type="button" data-relax-retry>重新载入</button></section>`;root.querySelector('[data-relax-retry]')?.addEventListener('click',()=>location.reload())});
