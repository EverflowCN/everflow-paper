const shell=document.querySelector('[data-graph-shell]');
const matrix=shell?.querySelector('[data-overview-matrix]');
const drawer=shell?.querySelector('[data-question-drawer]');
const drawerBody=shell?.querySelector('[data-drawer-body]');
const drawerAnswer=shell?.querySelector('[data-drawer-answer]');
const shortcutTip=shell?.querySelector('.graph-shortcuts');
if(!shell||!matrix||!drawer||!drawerBody)throw new Error('graph answer enhancement shell missing');

const ZHENTI_KEY='everflow-408-zhenti-wall-v1';
const RELAX_CORE_URL='/assets/js/relax1000-core.js?v=20260828-relaxfix1';
let relaxCorePromise=null,relaxDataPromise=null,enhanceToken=0;
const zhentiCache=new Map();
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const editable=target=>Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"]'));
const source=()=>document.body.dataset.graphSource==='relax1000'?'relax1000':'zhenti';
const activeCell=()=>matrix.querySelector('.overview-cell.current');
const drawerOpen=()=>!drawer.hidden;
function readJson(key){try{const value=JSON.parse(localStorage.getItem(key)||'{}');return value&&typeof value==='object'?value:{}}catch{return{}}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
async function relaxCore(){return relaxCorePromise||(relaxCorePromise=import(RELAX_CORE_URL))}
async function relaxData(){return relaxDataPromise||(relaxDataPromise=relaxCore().then(core=>core.loadRelaxData()))}
async function loadZhenti(year){if(zhentiCache.has(year))return zhentiCache.get(year);const promise=fetch(`/data/zhenti/${year}.json?v=20260825-bank1`,{cache:'default'}).then(r=>r.ok?r.json():null).catch(()=>null);zhentiCache.set(year,promise);return promise}
function zhentiPatch(year,q,patch){const records=readJson(ZHENTI_KEY),key=`${year}-${q}`,prev=records[key]||{},next={...prev,...patch,updatedAt:new Date().toISOString()};Object.keys(next).forEach(k=>next[k]===undefined&&delete next[k]);records[key]=next;writeJson(ZHENTI_KEY,records);document.dispatchEvent(new CustomEvent('everflow:zhenti-records-change',{detail:{year,q,source:'graph-answer'}}));return next}
async function context(){
  const cell=activeCell();if(!cell)return null;
  if(source()==='relax1000'){
    const id=String(cell.dataset.relaxId||'');if(!id)return null;const [core,data]=await Promise.all([relaxCore(),relaxData()]),question=(data.questions||[]).find(q=>core.idKey(q)===id);if(!question)return null;
    const entries=core.optionEntries(question);if(!entries.length&&!core.questionImages(question).length)return null;
    return{source:'relax1000',id,question,entries:entries.length?entries:'ABCD'.split('').map(key=>({key,text:'以原题截图中的选项为准'})),answer:String(question.answer||''),record:core.questionState(question).rec||{},core};
  }
  const match=String(cell.dataset.key||'').match(/^(\d{4})-(\d{1,2})$/);if(!match)return null;const year=Number(match[1]),q=Number(match[2]);if(q>40)return null;const paper=await loadZhenti(year),question=paper?.questions?.[String(q)];if(!question||question.verification?.status!=='verified'||!question.options)return null;const entries=Object.entries(question.options).map(([key,text])=>({key:String(key),text:String(text??'')}));return{source:'zhenti',year,q,question,entries,answer:String(question.answer||''),record:readJson(ZHENTI_KEY)[`${year}-${q}`]||{}};
}
function selectedAnswer(ctx){return String(ctx.record.answer||ctx.record.draftAnswer||'')}
function submitted(ctx){return Boolean(ctx.record.answer)&&typeof ctx.record.correct==='boolean'}
function answerShown(){return Boolean(drawerBody.querySelector('.drawer-answer-box'))}
function syncOptions(ctx){
  const selected=selectedAnswer(ctx),done=submitted(ctx),show=done||answerShown();
  drawerBody.querySelectorAll('[data-graph-choice]').forEach(button=>{
    const key=button.dataset.graphChoice;button.classList.toggle('selected',selected===key);button.classList.toggle('is-answer',show&&key===ctx.answer);button.classList.toggle('is-wrong',done&&ctx.record.correct===false&&ctx.record.answer===key);button.setAttribute('aria-pressed',String(selected===key));button.setAttribute('aria-disabled',String(done));
  });
  const submit=drawerBody.querySelector('[data-graph-submit]');if(submit){submit.disabled=done||!selected;submit.textContent=done?'已提交':'提交答案'}
  const result=drawerBody.querySelector('[data-graph-answer-result]');if(!result)return;
  if(!done){result.hidden=true;result.dataset.state='';return}
  const stateKey=`${ctx.record.correct?'1':'0'}:${ctx.record.answer}:${ctx.answer}`;result.hidden=false;result.className=`graph-answer-result ${ctx.record.correct?'correct':'wrong'}`;
  if(result.dataset.state!==stateKey){result.dataset.state=stateKey;result.innerHTML=`<strong>${ctx.record.correct?'✓ 回答正确':'✕ 回答错误'}</strong><span>你的答案 ${esc(ctx.record.answer)} · 正确答案 ${esc(ctx.answer)}</span>`}
}
async function enhance(){
  if(!drawerOpen())return;const token=++enhanceToken,ctx=await context();if(token!==enhanceToken||!ctx||!drawerOpen())return;
  const optionNodes=[...drawerBody.querySelectorAll('.drawer-options .drawer-option')];if(!optionNodes.length)return;
  optionNodes.forEach((node,index)=>{const entry=ctx.entries[index],key=String(entry?.key||node.querySelector('b')?.textContent||'').replace(/[^A-D]/gi,'').toUpperCase().slice(0,1);if(!key)return;node.dataset.graphChoice=key;node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label',`选择 ${key}`);if(!node.querySelector('kbd'))node.insertAdjacentHTML('beforeend',`<kbd>${key}</kbd>`)});
  let actions=drawerBody.querySelector('[data-graph-answer-actions]');if(!actions){actions=document.createElement('div');actions.className='graph-answer-actions';actions.dataset.graphAnswerActions='';actions.innerHTML='<button type="button" data-graph-submit>提交答案</button><span>电脑：A–D 选项 · Enter 提交</span>';drawerBody.querySelector('.drawer-options')?.insertAdjacentElement('afterend',actions)}
  if(!drawerBody.querySelector('[data-graph-answer-result]'))actions.insertAdjacentHTML('afterend','<div data-graph-answer-result class="graph-answer-result" hidden></div>');
  syncOptions(ctx);
}
async function choose(key){const ctx=await context();if(!ctx||submitted(ctx)||!ctx.entries.some(item=>item.key===key))return;if(ctx.source==='relax1000'){ctx.core.patchRecord(ctx.question.id,{draftAnswer:key});ctx.record=ctx.core.questionState(ctx.question).rec||{}}else ctx.record=zhentiPatch(ctx.year,ctx.q,{draftAnswer:key});await enhance()}
async function submit(){const ctx=await context();if(!ctx||submitted(ctx))return;const answer=String(ctx.record.draftAnswer||'');if(!answer)return;const correct=answer===ctx.answer;if(ctx.source==='relax1000'){ctx.core.patchRecord(ctx.question.id,{answer,draftAnswer:answer,correct,reviewed:true,attempts:(Number(ctx.record.attempts)||0)+1});ctx.core.syncAnswerCompatibility(ctx.question,correct);ctx.record=ctx.core.questionState(ctx.question).rec||{}}else ctx.record=zhentiPatch(ctx.year,ctx.q,{answer,draftAnswer:answer,correct,reviewed:true,attempts:(Number(ctx.record.attempts)||0)+1});await enhance()}

drawerBody.addEventListener('click',event=>{const option=event.target.closest('[data-graph-choice]');if(option){event.preventDefault();choose(option.dataset.graphChoice);return}if(event.target.closest('[data-graph-submit]')){event.preventDefault();submit()}});
drawerBody.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.closest('[data-graph-choice]')){event.preventDefault();choose(event.target.closest('[data-graph-choice]').dataset.graphChoice)}});
new MutationObserver(()=>queueMicrotask(enhance)).observe(drawerBody,{childList:true,subtree:true});
new MutationObserver(()=>queueMicrotask(enhance)).observe(drawer,{attributes:true,attributeFilter:['hidden']});
document.addEventListener('everflow:relax-records-change',()=>queueMicrotask(enhance));
document.addEventListener('everflow:zhenti-records-change',()=>queueMicrotask(enhance));
window.addEventListener('keydown',event=>{
  if(!drawerOpen()||editable(event.target)||event.altKey||event.ctrlKey||event.metaKey)return;const key=event.key.toUpperCase();
  if('ABCD'.includes(key)){event.preventDefault();event.stopPropagation();choose(key);return}
  if(event.key==='Enter'){event.preventDefault();event.stopPropagation();submit();return}
  if(event.key==='1'||event.key==='2'||event.key==='3'||event.key==='0'){const status={1:'mastered',2:'fuzzy',3:'weak',0:''}[event.key],button=shell.querySelector(`[data-drawer-status="${status}"]`);if(button){event.preventDefault();event.stopPropagation();button.click()}return}
  if(key==='E'&&drawerAnswer&&!drawerAnswer.hidden){event.preventDefault();event.stopPropagation();drawerAnswer.click()}
},true);
if(shortcutTip)shortcutTip.textContent='方向键移动 · Enter 打开/提交 · A–D 选项 · 1/2/3 状态 · E 解析 · Esc 关闭';
queueMicrotask(enhance);
