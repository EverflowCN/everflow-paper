import{loadRelaxData,loadRecords,patchRecord,syncAnswerCompatibility,toggleBookmark,questionState,questionNumber,questionImages,explanationImages,optionEntries,imageMarkup,usesQuestionImageFallback,esc,subjectName,idKey}from'./relax1000-core.js?v=20260825-bank1';

const CONTEXT_KEY='everflow-relax-reader-context-v1';
const root=document.querySelector('[data-relax-reader]');
let data=null,queue=[],selectedIndex=0,analysisVisible=false,noteTimer=0,pendingNote=null,nav=null,stage=null;

function readContext(){try{const value=JSON.parse(sessionStorage.getItem(CONTEXT_KEY)||'null');return value&&typeof value==='object'?value:null}catch{return null}}
function targetId(){return String(new URLSearchParams(location.search).get('id')||'')}
function currentQuestion(){return queue[selectedIndex]||null}
function currentNumber(question){return questionNumber(question,selectedIndex)}
function setUrl(question){if(!question)return;const url=new URL(location.href);url.searchParams.set('id',idKey(question));history.replaceState(null,'',`${url.pathname}${url.search}${url.hash}`)}
function goBack(){flushNote();if(history.length>1)history.back();else location.href='/zhenti/'}
function flushNote(){if(noteTimer){clearTimeout(noteTimer);noteTimer=0}if(!pendingNote)return;const {id,value}=pendingNote;pendingNote=null;patchRecord(id,{note:value||undefined})}
function queueNote(question,value){pendingNote={id:question.id,value};if(noteTimer)clearTimeout(noteTimer);noteTimer=setTimeout(flushNote,240)}

function buildQueue(){
  const wanted=targetId(),context=readContext(),byId=new Map(data.questions.map(question=>[idKey(question),question]));
  if(context?.ids?.length)queue=context.ids.map(id=>byId.get(String(id))).filter(Boolean);
  const target=byId.get(wanted);
  if(!queue.length&&target)queue=data.questions.filter(question=>question.subjectId===target.subjectId);
  if(!queue.length&&data.questions.length)queue=data.questions;
  selectedIndex=queue.findIndex(question=>idKey(question)===wanted);
  if(selectedIndex<0)selectedIndex=0;
}
function chapterOrder(question){
  const subject=(data?.subjects||[]).find(item=>item.id===question.subjectId),chapters=subject?.chapters||[];
  const index=chapters.findIndex(item=>item.id===question.chapterId);
  return index>=0?index+1:null;
}
function navGroups(){
  const groups=[],map=new Map();
  queue.forEach((question,index)=>{
    const key=`${question.subjectId||''}\u0000${question.chapterId||question.chapter||''}`;
    let group=map.get(key);
    if(!group){group={key,subjectId:question.subjectId,subject:subjectName(question.subjectId,question.subject),chapterId:question.chapterId,chapter:question.chapter||'未分章',chapterOrder:chapterOrder(question),items:[]};map.set(key,group);groups.push(group)}
    group.items.push({question,index});
  });
  return groups;
}
function optionButtons(question,rec){
  const entries=optionEntries(question);
  if(entries.length)return `<div class="relax-reader-options">${entries.map(item=>`<button type="button" data-reader-option="${esc(item.key)}" class="${String(rec.draftAnswer||rec.answer||'')===item.key?'selected':''} ${rec.reviewed&&item.key===String(question.answer)?'is-correct':''} ${rec.correct===false&&String(rec.answer)===item.key?'is-wrong':''}" ${rec.answer?'disabled':''}><b>${esc(item.key)}</b><span>${esc(item.text||'见原题图中的选项')}</span><kbd>${esc(item.key)}</kbd></button>`).join('')}</div>`;
  if(questionImages(question).length)return `<div class="relax-reader-options compact">${'ABCD'.split('').map(key=>`<button type="button" data-reader-option="${key}" class="${String(rec.draftAnswer||rec.answer||'')===key?'selected':''} ${rec.reviewed&&key===String(question.answer)?'is-correct':''} ${rec.correct===false&&String(rec.answer)===key?'is-wrong':''}" ${rec.answer?'disabled':''}><b>${key}</b><kbd>${key}</kbd></button>`).join('')}</div>`;
  return'';
}
function navClass(question,index,records=loadRecords()){
  const state=questionState(question,records),classes=['relax-reader-nav-item'];
  if(state.rec.status==='mastered')classes.push('is-mastered');
  else if(state.rec.status==='fuzzy')classes.push('is-fuzzy');
  else if(state.rec.status==='weak')classes.push('is-weak');
  else if(state.wrong)classes.push('is-wrong');
  else if(state.seen)classes.push('is-seen');
  else classes.push('is-unseen');
  if(index===selectedIndex)classes.push('current');
  return classes.join(' ');
}
function navButtonHtml(question,index,records){
  const state=questionState(question,records),number=questionNumber(question,index);
  return `<button type="button" class="${navClass(question,index,records)}" data-reader-jump="${index}" aria-label="${esc(question.chapter||'')}第 ${esc(number)} 题${index===selectedIndex?'，当前题':''}" ${index===selectedIndex?'aria-current="true"':''}><span>${esc(number)}</span>${state.favorite?'<i>★</i>':''}</button>`;
}
function ensureShell(){
  if(nav&&stage)return;
  root.innerHTML='<div class="relax-reader-layout"><aside class="relax-reader-nav" data-reader-nav></aside><section class="relax-reader-stage" data-reader-stage></section></div>';
  nav=root.querySelector('[data-reader-nav]');stage=root.querySelector('[data-reader-stage]');
  renderNav();
}
function renderNav(){
  if(!nav)return;const records=loadRecords(),groups=navGroups();
  nav.innerHTML=`<div class="relax-reader-nav-head"><div><strong>题目导航</strong><small>按科目 / 章节分组</small></div><span data-reader-nav-progress>${selectedIndex+1} / ${queue.length}</span></div><div class="relax-reader-nav-groups">${groups.map(group=>`<section class="relax-reader-nav-group" data-nav-group="${esc(group.key)}"><header><div><b>${esc(group.subject)}</b><strong>${group.chapterOrder?`第 ${group.chapterOrder} 章 · `:''}${esc(group.chapter)}</strong></div><em>${group.items.length} 题</em></header><div class="relax-reader-nav-grid">${group.items.map(({question,index})=>navButtonHtml(question,index,records)).join('')}</div></section>`).join('')}</div><div class="relax-reader-nav-legend"><span><i></i>未标记</span><span class="mastered"><i></i>熟悉</span><span class="fuzzy"><i></i>模糊</span><span class="weak"><i></i>不会</span></div>`;
  nav.querySelectorAll('[data-reader-jump]').forEach(button=>button.onclick=()=>jumpTo(Number(button.dataset.readerJump)));
}
function refreshNavButton(index){
  if(!nav||index<0||index>=queue.length)return;const button=nav.querySelector(`[data-reader-jump="${index}"]`);if(!button)return;const question=queue[index],records=loadRecords(),state=questionState(question,records),number=questionNumber(question,index);button.className=navClass(question,index,records);button.setAttribute('aria-label',`${question.chapter||''}第 ${number} 题${index===selectedIndex?'，当前题':''}`);if(index===selectedIndex)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');button.innerHTML=`<span>${esc(number)}</span>${state.favorite?'<i>★</i>':''}`;
}
function refreshNavSelection(previousIndex){
  refreshNavButton(previousIndex);refreshNavButton(selectedIndex);const progress=nav?.querySelector('[data-reader-nav-progress]');if(progress)progress.textContent=`${selectedIndex+1} / ${queue.length}`;nav?.querySelector(`[data-reader-jump="${selectedIndex}"]`)?.scrollIntoView?.({block:'nearest',inline:'nearest'});
}
function shortcutHtml(){return `<div class="relax-reader-shortcuts" aria-label="电脑快捷键"><span><kbd>A-D</kbd>选项</span><span><kbd>Enter</kbd>提交</span><span><kbd>←</kbd><kbd>→</kbd>切题</span><span><kbd>1</kbd>熟悉</span><span><kbd>2</kbd>模糊</span><span><kbd>3</kbd>不会</span><span><kbd>F</kbd>收藏</span><span><kbd>E</kbd>解析</span><span><kbd>Esc</kbd>返回</span></div>`}
function renderQuestion(){
  const question=currentQuestion();if(!question){root.innerHTML='<section class="relax-reader-error"><strong>没有找到这道题</strong><p>题目可能已更新，请返回题库墙重新打开。</p><button type="button" data-reader-back>返回题库墙</button></section>';nav=null;stage=null;bindBack();return}
  ensureShell();setUrl(question);document.title=`Relax1000 · 第 ${currentNumber(question)} 题 · Everflow`;
  const state=questionState(question,loadRecords()),rec=state.rec,images=questionImages(question),analysisImages=explanationImages(question),fallback=usesQuestionImageFallback(question);
  const imageHtml=images.length?`<div class="relax-reader-images">${images.map((src,index)=>imageMarkup(src,`原题截图 ${index+1}`)).join('')}</div>${fallback?'<p class="relax-image-fallback-note">这道题含公式或图表，文字识别不完整时请以原题图为准；仍可使用 A–D 正常作答。</p>':''}`:'';
  const result=rec.answer?`<div class="relax-reader-result ${rec.correct?'correct':'wrong'}"><strong>${rec.correct?'✓ 回答正确':'✕ 回答错误'}</strong><span>你的答案 ${esc(rec.answer)} · 正确答案 ${esc(question.answer)}</span></div>`:'';
  const showAnalysis=analysisVisible||rec.reviewed;
  const analysis=showAnalysis?`<section class="relax-reader-analysis"><header><strong>解析</strong><span>正确答案 ${esc(question.answer||'')}</span></header>${analysisImages.length?`<div class="relax-reader-images">${analysisImages.map((src,index)=>imageMarkup(src,`解析截图 ${index+1}`)).join('')}</div>`:`<p>${esc(question.explanation||'暂无文字解析。')}</p>`}</section>`:'';
  const chapterNo=chapterOrder(question);
  stage.innerHTML=`<article class="relax-reader-card"><header class="relax-reader-head"><div class="relax-reader-meta"><span>${esc(subjectName(question.subjectId,question.subject))}</span><strong>Relax1000 · 第 ${esc(currentNumber(question))} 题</strong><small>${chapterNo?`第 ${chapterNo} 章 · `:''}${esc(question.chapter||'')}</small></div><div class="relax-reader-head-actions"><button type="button" data-reader-favorite class="${state.favorite?'active':''}">${state.favorite?'★ 已收藏':'☆ 收藏'}</button></div></header><div class="relax-reader-body"><div class="relax-reader-status"><span>掌握状态</span><button data-reader-status="mastered" class="${rec.status==='mastered'?'active':''}">熟悉 <kbd>1</kbd></button><button data-reader-status="fuzzy" class="${rec.status==='fuzzy'?'active':''}">模糊 <kbd>2</kbd></button><button data-reader-status="weak" class="${rec.status==='weak'?'active':''}">不会 <kbd>3</kbd></button><button data-reader-status="" class="${!rec.status?'active':''}">清除 <kbd>0</kbd></button></div>${shortcutHtml()}${imageHtml}<h1 class="relax-reader-question">${esc(question.stem||'题干以原题截图为准')}</h1>${optionButtons(question,rec)}${result}<div class="relax-reader-actions"><button type="button" data-reader-submit ${rec.answer||!rec.draftAnswer?'disabled':''}>${rec.answer?'已提交':'提交答案'} <kbd>Enter</kbd></button><button type="button" data-reader-analysis>${showAnalysis?'收起解析':'查看解析'} <kbd>E</kbd></button></div>${analysis}<label class="relax-reader-note"><span>复盘笔记</span><textarea data-reader-note rows="4" placeholder="记录本题易错点或二刷提醒…">${esc(rec.note||'')}</textarea></label></div><footer class="relax-reader-footer"><button type="button" data-reader-prev ${selectedIndex<=0?'disabled':''}>← 上一题</button><span>${selectedIndex+1} / ${queue.length}</span><button type="button" data-reader-next ${selectedIndex>=queue.length-1?'disabled':''}>下一题 →</button></footer></article>`;
  bindQuestion();
}
function choose(key){const question=currentQuestion();if(!question)return;const rec=questionState(question).rec;if(rec.answer)return;patchRecord(question.id,{draftAnswer:key});renderQuestion()}
function submit(){const question=currentQuestion();if(!question)return;flushNote();const rec=questionState(question).rec,answer=String(rec.draftAnswer||'');if(!answer||rec.answer)return;const correct=answer===String(question.answer);patchRecord(question.id,{answer,draftAnswer:answer,correct,reviewed:true,attempts:(Number(rec.attempts)||0)+1});syncAnswerCompatibility(question,correct);analysisVisible=true;refreshNavButton(selectedIndex);renderQuestion()}
function setStatus(status){const question=currentQuestion();if(!question)return;flushNote();patchRecord(question.id,{status:status||undefined});refreshNavButton(selectedIndex);renderQuestion()}
function favorite(){const question=currentQuestion();if(!question)return;flushNote();toggleBookmark(question);refreshNavButton(selectedIndex);renderQuestion()}
function toggleAnalysis(){analysisVisible=!analysisVisible;renderQuestion()}
function move(delta){jumpTo(selectedIndex+delta)}
function jumpTo(next){if(!Number.isInteger(next)||next<0||next>=queue.length||next===selectedIndex)return;flushNote();const previous=selectedIndex;selectedIndex=next;analysisVisible=false;refreshNavSelection(previous);renderQuestion();window.scrollTo({top:0,behavior:'auto'})}
function bindBack(){document.querySelectorAll('[data-reader-back]').forEach(button=>button.onclick=goBack)}
function bindQuestion(){
  bindBack();
  stage.querySelectorAll('[data-reader-option]').forEach(button=>button.onclick=()=>choose(button.dataset.readerOption));
  stage.querySelector('[data-reader-submit]')?.addEventListener('click',submit);
  stage.querySelector('[data-reader-analysis]')?.addEventListener('click',toggleAnalysis);
  stage.querySelectorAll('[data-reader-status]').forEach(button=>button.onclick=()=>setStatus(button.dataset.readerStatus));
  stage.querySelector('[data-reader-favorite]')?.addEventListener('click',favorite);
  stage.querySelector('[data-reader-prev]')?.addEventListener('click',()=>move(-1));
  stage.querySelector('[data-reader-next]')?.addEventListener('click',()=>move(1));
  stage.querySelector('[data-reader-note]')?.addEventListener('input',event=>{const question=currentQuestion();if(question)queueNote(question,event.target.value)});
}

document.addEventListener('keydown',event=>{
  if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]')||event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key==='Escape'){event.preventDefault();goBack();return}
  if(event.key==='ArrowLeft'){event.preventDefault();move(-1);return}
  if(event.key==='ArrowRight'){event.preventDefault();move(1);return}
  const key=event.key.toUpperCase();
  if('ABCD'.includes(key)){event.preventDefault();choose(key);return}
  if(key==='F'){event.preventDefault();favorite();return}
  if(key==='E'){event.preventDefault();toggleAnalysis();return}
  if(event.key==='1'){event.preventDefault();setStatus('mastered');return}
  if(event.key==='2'){event.preventDefault();setStatus('fuzzy');return}
  if(event.key==='3'){event.preventDefault();setStatus('weak');return}
  if(event.key==='0'){event.preventDefault();setStatus('');return}
  if(event.key==='Enter'){const rec=currentQuestion()?questionState(currentQuestion()).rec:null;if(rec?.draftAnswer&&!rec.answer){event.preventDefault();submit()}}
});
window.addEventListener('pagehide',flushNote);

bindBack();
loadRelaxData().then(value=>{data=value;buildQueue();ensureShell();renderQuestion()}).catch(error=>{console.error('Relax1000 standalone reader failed',error);root.innerHTML=`<section class="relax-reader-error"><strong>题目载入失败</strong><p>${esc(error.message||error)}</p><button type="button" data-reader-back>返回题库墙</button></section>`;nav=null;stage=null;bindBack()});
