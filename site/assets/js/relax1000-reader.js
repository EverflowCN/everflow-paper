import{loadRelaxData,loadRecords,patchRecord,syncAnswerCompatibility,toggleBookmark,questionState,questionNumber,questionImages,explanationImages,optionEntries,imageMarkup,usesQuestionImageFallback,esc,subjectName,idKey}from'./relax1000-core.js?v=20260825-bank1';

const CONTEXT_KEY='everflow-relax-reader-context-v1';
const root=document.querySelector('[data-relax-reader]');
let data=null,queue=[],selectedIndex=0,analysisVisible=false,noteTimer=0,pendingNote=null;

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
function optionButtons(question,rec){
  const entries=optionEntries(question);
  if(entries.length)return `<div class="relax-reader-options">${entries.map(item=>`<button type="button" data-reader-option="${esc(item.key)}" class="${String(rec.draftAnswer||rec.answer||'')===item.key?'selected':''} ${rec.reviewed&&item.key===String(question.answer)?'is-correct':''} ${rec.correct===false&&String(rec.answer)===item.key?'is-wrong':''}" ${rec.answer?'disabled':''}><b>${esc(item.key)}</b><span>${esc(item.text||'见原题图中的选项')}</span></button>`).join('')}</div>`;
  if(questionImages(question).length)return `<div class="relax-reader-options compact">${'ABCD'.split('').map(key=>`<button type="button" data-reader-option="${key}" class="${String(rec.draftAnswer||rec.answer||'')===key?'selected':''} ${rec.reviewed&&key===String(question.answer)?'is-correct':''} ${rec.correct===false&&String(rec.answer)===key?'is-wrong':''}" ${rec.answer?'disabled':''}><b>${key}</b></button>`).join('')}</div>`;
  return'';
}
function render(){
  const question=currentQuestion();if(!question){root.innerHTML='<section class="relax-reader-error"><strong>没有找到这道题</strong><p>题目可能已更新，请返回题库墙重新打开。</p><button type="button" data-reader-back>返回题库墙</button></section>';bind();return}
  setUrl(question);document.title=`Relax1000 · 第 ${currentNumber(question)} 题 · Everflow`;
  const state=questionState(question,loadRecords()),rec=state.rec,images=questionImages(question),analysisImages=explanationImages(question),fallback=usesQuestionImageFallback(question);
  const imageHtml=images.length?`<div class="relax-reader-images">${images.map((src,index)=>imageMarkup(src,`原题截图 ${index+1}`)).join('')}</div>${fallback?'<p class="relax-image-fallback-note">这道题含公式或图表，文字识别不完整时请以原题图为准；仍可使用 A–D 正常作答。</p>':''}`:'';
  const result=rec.answer?`<div class="relax-reader-result ${rec.correct?'correct':'wrong'}"><strong>${rec.correct?'✓ 回答正确':'✕ 回答错误'}</strong><span>你的答案 ${esc(rec.answer)} · 正确答案 ${esc(question.answer)}</span></div>`:'';
  const showAnalysis=analysisVisible||rec.reviewed;
  const analysis=showAnalysis?`<section class="relax-reader-analysis"><header><strong>解析</strong><span>正确答案 ${esc(question.answer||'')}</span></header>${analysisImages.length?`<div class="relax-reader-images">${analysisImages.map((src,index)=>imageMarkup(src,`解析截图 ${index+1}`)).join('')}</div>`:`<p>${esc(question.explanation||'暂无文字解析。')}</p>`}</section>`:'';
  root.innerHTML=`<article class="relax-reader-card"><header class="relax-reader-head"><div class="relax-reader-meta"><span>${esc(subjectName(question.subjectId,question.subject))}</span><strong>Relax1000 · 第 ${esc(currentNumber(question))} 题</strong><small>${esc(question.chapter||'')}</small></div><div class="relax-reader-head-actions"><button type="button" data-reader-favorite class="${state.favorite?'active':''}">${state.favorite?'★ 已收藏':'☆ 收藏'}</button></div></header><div class="relax-reader-body"><div class="relax-reader-status"><span>掌握状态</span><button data-reader-status="mastered" class="${rec.status==='mastered'?'active':''}">熟练</button><button data-reader-status="fuzzy" class="${rec.status==='fuzzy'?'active':''}">模糊</button><button data-reader-status="weak" class="${rec.status==='weak'?'active':''}">不会</button><button data-reader-status="" class="${!rec.status?'active':''}">清除</button></div>${imageHtml}<h1 class="relax-reader-question">${esc(question.stem||'题干以原题截图为准')}</h1>${optionButtons(question,rec)}${result}<div class="relax-reader-actions"><button type="button" data-reader-submit ${rec.answer||!rec.draftAnswer?'disabled':''}>${rec.answer?'已提交':'提交答案'}</button><button type="button" data-reader-analysis>${showAnalysis?'收起解析':'查看解析'}</button></div>${analysis}<label class="relax-reader-note"><span>复盘笔记</span><textarea data-reader-note rows="4" placeholder="记录本题易错点或二刷提醒…">${esc(rec.note||'')}</textarea></label></div><footer class="relax-reader-footer"><button type="button" data-reader-prev ${selectedIndex<=0?'disabled':''}>← 上一题</button><span>${selectedIndex+1} / ${queue.length}</span><button type="button" data-reader-next ${selectedIndex>=queue.length-1?'disabled':''}>下一题 →</button></footer></article>`;
  bind();
}
function choose(key){const question=currentQuestion();if(!question)return;const rec=questionState(question).rec;if(rec.answer)return;patchRecord(question.id,{draftAnswer:key});render()}
function submit(){const question=currentQuestion();if(!question)return;flushNote();const rec=questionState(question).rec,answer=String(rec.draftAnswer||'');if(!answer||rec.answer)return;const correct=answer===String(question.answer);patchRecord(question.id,{answer,draftAnswer:answer,correct,reviewed:true,attempts:(Number(rec.attempts)||0)+1});syncAnswerCompatibility(question,correct);analysisVisible=true;render()}
function setStatus(status){const question=currentQuestion();if(!question)return;flushNote();patchRecord(question.id,{status:status||undefined});render()}
function favorite(){const question=currentQuestion();if(!question)return;flushNote();toggleBookmark(question);render()}
function move(delta){const next=selectedIndex+delta;if(next<0||next>=queue.length)return;flushNote();selectedIndex=next;analysisVisible=false;render();window.scrollTo({top:0,behavior:'auto'})}
function bind(){
  document.querySelectorAll('[data-reader-back]').forEach(button=>button.onclick=goBack);
  root.querySelectorAll('[data-reader-option]').forEach(button=>button.onclick=()=>choose(button.dataset.readerOption));
  root.querySelector('[data-reader-submit]')?.addEventListener('click',submit);
  root.querySelector('[data-reader-analysis]')?.addEventListener('click',()=>{analysisVisible=!analysisVisible;render()});
  root.querySelectorAll('[data-reader-status]').forEach(button=>button.onclick=()=>setStatus(button.dataset.readerStatus));
  root.querySelector('[data-reader-favorite]')?.addEventListener('click',favorite);
  root.querySelector('[data-reader-prev]')?.addEventListener('click',()=>move(-1));
  root.querySelector('[data-reader-next]')?.addEventListener('click',()=>move(1));
  root.querySelector('[data-reader-note]')?.addEventListener('input',event=>{const question=currentQuestion();if(question)queueNote(question,event.target.value)});
}

document.addEventListener('keydown',event=>{
  if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  if(event.key==='Escape'){event.preventDefault();goBack();return}
  if(event.key==='ArrowLeft'){event.preventDefault();move(-1);return}
  if(event.key==='ArrowRight'){event.preventDefault();move(1);return}
  const key=event.key.toUpperCase();if('ABCD'.includes(key)){event.preventDefault();choose(key);return}
  if(event.key==='Enter'){const rec=currentQuestion()?questionState(currentQuestion()).rec:null;if(rec?.draftAnswer&&!rec.answer){event.preventDefault();submit()}}
});
window.addEventListener('pagehide',flushNote);

document.querySelectorAll('[data-reader-back]').forEach(button=>button.onclick=goBack);
loadRelaxData().then(value=>{data=value;buildQueue();render()}).catch(error=>{console.error('Relax1000 standalone reader failed',error);root.innerHTML=`<section class="relax-reader-error"><strong>题目载入失败</strong><p>${esc(error.message||error)}</p><button type="button" data-reader-back>返回题库墙</button></section>`;bind()});
