import{loadRelaxData,loadRecords,patchRecord,syncAnswerCompatibility,questionState,optionEntries,questionImages,imageMarkup,usesQuestionImageFallback,questionNumber,subjectName,esc}from'./relax1000-core.js?v=20260825-bank1';

const bankRoot=document.querySelector('.relax-wall-root');
const sourceBar=document.querySelector('.bank-source-shell');
if(!bankRoot||!sourceBar)throw new Error('Relax1000 bank root missing');

const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/relax1000-cards.css?v=20260825-bank1';document.head.appendChild(css);
const subbar=document.createElement('section');
subbar.className='relax-subview-bar';
subbar.innerHTML='<button class="active" type="button" data-relax-subview="bank">题库墙</button><button type="button" data-relax-subview="cards">速刷卡片</button><span>题库墙与速刷卡片共用答题、错题和掌握状态</span>';
bankRoot.before(subbar);
const root=document.createElement('main');root.className='relax-cards-root';root.hidden=true;subbar.after(root);

const SRS_KEY='everflow-408-relax-srs-v1';
const DAY=86400000;
const SUBJECTS={all:'全部',ds:'数据结构',co:'计算机组成原理',os:'操作系统',cn:'计算机网络'};
const KEYMAP={Q:'A',W:'B',E:'C',R:'D'};
const storage={json:(key,fallback={})=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'?v:fallback}catch{return fallback}},set:(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}}};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
let state=storage.json(SRS_KEY,{version:1,settings:{dailyNew:20,targetRetention:.9},cards:{},daily:{}});
state.settings={dailyNew:20,targetRetention:.9,...(state.settings||{})};state.cards=state.cards||{};state.daily=state.daily||{};
let data=null,filter='all',selected=null,revealed=false,currentId='',skipped=new Set(),startedAt=0,mounted=false;

function save(){storage.set(SRS_KEY,state)}
function today(){const k=dateKey();state.daily[k]=state.daily[k]||{reviews:0,new:0,again:0,hard:0,good:0,easy:0};return state.daily[k]}
function rec(q){return state.cards[String(q.id)]||{}}
function isReviewed(q){return Number(rec(q).reps||0)>0}
function priority(q){const s=questionState(q,loadRecords());if(s.wrong)return-5;if(s.rec.status==='weak')return-4;if(s.rec.status==='fuzzy')return-3;if(s.favorite)return-2;return 0}
function subjectMatch(q){return filter==='all'||q.subjectId===filter}
function queueInfo(){
  if(!data)return{due:[],fresh:[],queue:[],newSlots:0};
  const now=Date.now(),day=today(),newSlots=Math.max(0,Number(state.settings.dailyNew)-Number(day.new||0));
  const eligible=data.questions.filter(subjectMatch).filter(q=>!skipped.has(String(q.id)));
  const due=eligible.filter(q=>isReviewed(q)&&new Date(rec(q).dueAt||0).getTime()<=now).sort((a,b)=>priority(a)-priority(b)||(new Date(rec(a).dueAt||0)-new Date(rec(b).dueAt||0)));
  const fresh=eligible.filter(q=>!isReviewed(q)).sort((a,b)=>priority(a)-priority(b)||String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
  return{due,fresh,newSlots,queue:[...due,...fresh.slice(0,newSlots)]};
}
function recall(q,now=Date.now()){const r=rec(q);if(!r.reps||!r.lastReviewAt||!r.stability)return null;const elapsed=Math.max(0,(now-new Date(r.lastReviewAt).getTime())/DAY);return clamp(Math.pow(.9,elapsed/Math.max(.007,Number(r.stability))),.01,1)}
function streak(){let d=new Date();if(!(state.daily[dateKey(d)]?.reviews>0))d=new Date(d.getTime()-DAY);let n=0;for(let i=0;i<3650;i++){if(!(state.daily[dateKey(d)]?.reviews>0))break;n++;d=new Date(d.getTime()-DAY)}return n}
function averageRetention(){if(!data)return null;const values=data.questions.filter(subjectMatch).map(q=>recall(q)).filter(v=>v!=null);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null}
function currentCard(){const info=queueInfo();if(currentId){const same=info.queue.find(q=>String(q.id)===currentId);if(same)return same}const q=info.queue[0]||null;if(q){currentId=String(q.id);selected=null;revealed=false;startedAt=Date.now()}return q}
function intervalText(days){if(days<1/24)return`${Math.max(1,Math.round(days*24*60))} 分钟`;if(days<1)return`${Math.max(1,Math.round(days*24))} 小时`;if(days<30)return`${Math.max(1,Math.round(days))} 天`;if(days<365)return`${Math.max(1,Math.round(days/30))} 个月`;return`${(days/365).toFixed(1)} 年`}
function nextStability(r,grade){const reps=Number(r?.reps||0),old=Math.max(.007,Number(r?.stability||0)),difficulty=clamp(Number(r?.difficulty||5),1,10);if(!reps)return grade===1?.007:grade===2?.5:grade===3?1:4;if(grade===1)return Math.max(.007,old*.2);if(grade===2)return Math.max(.5,old*Math.max(1.12,1.35-.03*(difficulty-5)));if(grade===3)return Math.max(1,old*Math.max(1.5,2.2-.08*(difficulty-5)));return Math.max(4,old*Math.max(2.2,3.2-.1*(difficulty-5)))}
function gradeKey(g){return g===1?'again':g===2?'hard':g===3?'good':'easy'}
function gradeLabel(g){return g===1?'重来':g===2?'困难':g===3?'记住':'简单'}
function schedule(q,grade){
  const previous=rec(q),wasNew=!Number(previous.reps||0),stability=nextStability(previous,grade),difficulty=clamp(Number(previous.difficulty||5)+(grade===1?.9:grade===2?.35:grade===3?-.12:-.45),1,10),now=Date.now();
  state.cards[String(q.id)]={...previous,stability,difficulty,reps:Number(previous.reps||0)+1,lapses:Number(previous.lapses||0)+(grade===1?1:0),lastGrade:grade,lastReviewAt:new Date(now).toISOString(),dueAt:new Date(now+stability*DAY).toISOString(),lastAnswer:selected,lastCorrect:selected?selected===String(q.answer):null,lastTimeSpent:Math.max(0,Math.round((now-startedAt)/1000))};
  const d=today();d.reviews=Number(d.reviews||0)+1;if(wasNew)d.new=Number(d.new||0)+1;d[gradeKey(grade)]=Number(d[gradeKey(grade)]||0)+1;save();
  patchRecord(q.id,{status:grade===1?'weak':grade===2?'fuzzy':'mastered'});currentId='';selected=null;revealed=false;startedAt=0;renderAll();
}
function reveal(q){if(!selected||revealed)return;revealed=true;const correct=selected===String(q.answer),r=questionState(q).rec;patchRecord(q.id,{answer:selected,draftAnswer:selected,correct,reviewed:true,attempts:(Number(r.attempts)||0)+1});syncAnswerCompatibility(q,correct);renderAll()}
function skip(q){if(!q)return;skipped.add(String(q.id));currentId='';selected=null;revealed=false;renderAll()}
function images(q){return questionImages(q)}
function cardHtml(q){
  if(!q)return'<div class="relax-cards-empty"><div><h2>今天的卡片刷完了</h2><p>切换科目，或等下一批卡片到期后继续。</p></div></div>';
  const opts=optionEntries(q),pics=images(q),stateNow=questionState(q),r=rec(q),memory=recall(q);
  const options=(opts.length?opts:'ABCD'.split('').map(key=>({key,text:''}))).map(o=>{let cls='';if(selected===o.key)cls+=' selected';if(revealed&&String(o.key)===String(q.answer))cls+=' correct';if(revealed&&selected===o.key&&selected!==String(q.answer))cls+=' wrong';return`<button type="button" data-card-answer="${esc(o.key)}" class="${cls.trim()}" ${revealed?'disabled':''}><b>${esc(o.key)}</b><span>${esc(o.text||'见原题图中的选项')}</span><kbd>${({A:'Q',B:'W',C:'E',D:'R'})[o.key]||o.key}</kbd></button>`}).join('');
  const answer=revealed?`<div class="relax-card-answer"><strong>${selected===String(q.answer)?'回答正确':'回答错误'} · 正确答案 ${esc(q.answer)}</strong><div>${esc(q.explanation||'')}</div></div>`:'';
  const grades=revealed?`<div class="relax-grade-grid">${[1,2,3,4].map(g=>`<button type="button" data-card-grade="${g}">${g} · ${gradeLabel(g)}<small>${intervalText(nextStability(r,g))}</small></button>`).join('')}</div>`:'';
  return`<div class="relax-card-main"><div class="relax-card-meta"><span>${esc(subjectName(q.subjectId,q.subject))} · ${esc(q.chapter||'')}</span><b>原册第 ${esc(questionNumber(q))} 题</b></div><h2 class="relax-card-question">${esc(q.stem||'题干以原题截图为准')}</h2>${pics.length?`<div class="relax-card-images">${pics.map((src,i)=>imageMarkup(src,`原题截图 ${i+1}`)).join('')}</div>${usesQuestionImageFallback(q)?'<p class="relax-image-fallback-note">公式或图表请以原题图为准。</p>':''}`:''}<div class="relax-card-options">${options}</div>${answer}${grades}<div class="relax-card-actions">${revealed?'':`<button class="primary" type="button" data-card-reveal ${selected?'':'disabled'}>翻面 / 提交 · Enter</button>`}<button type="button" data-card-skip>跳过 · S</button></div><div class="relax-card-meta"><span>${stateNow.wrong?'当前错题 · ':''}${stateNow.rec.status==='weak'?'不会':stateNow.rec.status==='fuzzy'?'模糊':stateNow.rec.status==='mastered'?'熟练':'未标记'}</span><span>${memory==null?'新卡':`预计记忆率 ${Math.round(memory*100)}%`}</span></div></div>`;
}
function render(){
  const info=queueInfo(),q=currentCard(),ret=averageRetention(),day=today();
  root.innerHTML=`<section class="relax-cards-hero"><div><div class="eyebrow">RELAX1000 · QUICK CARDS</div><h1>1000题速刷卡片</h1><p>错题、“不会/模糊”题优先进入队列；按遗忘间隔自动安排下一次出现时间。</p></div><div class="relax-cards-stats"><div><strong>${info.due.length}</strong><span>到期复习</span></div><div><strong>${Math.min(info.fresh.length,info.newSlots)}</strong><span>今日新卡</span></div><div><strong>${streak()}</strong><span>连续天数</span></div></div></section><section class="relax-cards-toolbar"><div class="relax-card-filters">${Object.entries(SUBJECTS).map(([k,v])=>`<button type="button" data-card-filter="${k}" class="${filter===k?'active':''}">${v}</button>`).join('')}</div><span class="relax-card-policy">目标记忆率约 90% · 当前 ${ret==null?'--':`${Math.round(ret*100)}%`}</span></section><section class="relax-cards-stage"><div class="relax-card-shell"><div class="relax-card-progress"><i style="width:${Number(day.reviews||0)+info.queue.length?Math.min(100,Math.round(Number(day.reviews||0)/(Number(day.reviews||0)+info.queue.length)*100)):100}%"></i></div><div data-relax-card>${cardHtml(q)}</div></div><aside class="relax-cards-side"><section class="relax-cards-side-card"><h3>今日队列</h3><div class="relax-cards-side-row"><span>到期</span><b>${info.due.length}</b></div><div class="relax-cards-side-row"><span>新卡额度</span><b>${Math.min(info.fresh.length,info.newSlots)}/${info.newSlots}</b></div><div class="relax-cards-side-row"><span>今日已刷</span><b>${day.reviews||0}</b></div><div class="relax-cards-side-row"><span>当前卡池</span><b>${data?data.questions.filter(subjectMatch).length:0}</b></div></section><section class="relax-cards-side-card"><h3>电脑速刷</h3><div class="relax-cards-help">Q/W/E/R：A/B/C/D<br>Enter：翻面 / 提交<br>1/2/3/4：重来 / 困难 / 记住 / 简单<br>S：跳过本张<br>Esc：返回题库墙</div></section></aside></section>`;
  root.querySelectorAll('[data-card-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.cardFilter;currentId='';skipped.clear();renderAll()}));
  root.querySelectorAll('[data-card-answer]').forEach(b=>b.addEventListener('click',()=>{if(revealed)return;selected=b.dataset.cardAnswer;renderAll()}));
  root.querySelector('[data-card-reveal]')?.addEventListener('click',()=>reveal(q));
  root.querySelector('[data-card-skip]')?.addEventListener('click',()=>skip(q));
  root.querySelectorAll('[data-card-grade]').forEach(b=>b.addEventListener('click',()=>schedule(q,Number(b.dataset.cardGrade))));
}
function renderAll(){if(root.hidden||!data)return;render()}
async function ensureMounted(){if(mounted)return;mounted=true;root.innerHTML='<section class="relax-cards-empty"><div><h2>正在生成速刷卡片…</h2></div></section>';data=await loadRelaxData();renderAll()}
function activate(view){const cards=view==='cards';subbar.querySelectorAll('[data-relax-subview]').forEach(b=>b.classList.toggle('active',b.dataset.relaxSubview===view));root.hidden=!cards;bankRoot.hidden=cards;document.body.classList.toggle('relax-cards-active',cards);if(cards)ensureMounted().catch(error=>{root.innerHTML=`<section class="relax-cards-empty"><div><h2>速刷卡片载入失败</h2><p>${esc(error.message||error)}</p></div></section>`})}
subbar.querySelectorAll('[data-relax-subview]').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.relaxSubview)));
document.addEventListener('keydown',event=>{
  if(root.hidden||event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  const q=currentCard();if(!q)return;
  if(event.key==='Escape'){activate('bank');event.preventDefault();return}
  const key=event.key.toUpperCase();if(KEYMAP[key]&&!revealed){selected=KEYMAP[key];renderAll();event.preventDefault();return}
  if(event.key==='Enter'&&!revealed&&selected){reveal(q);event.preventDefault();return}
  if(revealed&&['1','2','3','4'].includes(event.key)){schedule(q,Number(event.key));event.preventDefault();return}
  if(key==='S'){skip(q);event.preventDefault()}
},true);
