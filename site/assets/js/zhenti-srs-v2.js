(()=>{
  if(document.body?.dataset?.view!=='zhenti')return;

  const SRS_KEY='everflow-408-srs-v1';
  const ACTIVE_KEY='everflow-408-srs-active';
  const WALL_KEY='everflow-408-zhenti-wall-v1';
  const DAY=86400000;
  const SUBJECTS={all:'全部',ds:'数据结构',co:'计算机组成原理',os:'操作系统',cn:'计算机网络'};
  const TYPES={all:'全部题型',choice:'选择题',comprehensive:'大题'};
  const SHORT={ds:'DS',co:'CO',os:'OS',cn:'CN'};
  const KEYMAP={Q:'A',W:'B',E:'C',R:'D'};
  const DISPLAY_KEY={A:'Q',B:'W',C:'E',D:'R'};

  if(!document.querySelector('link[href*="zhenti-srs.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/zhenti-srs.css?v=20260823b';document.head.appendChild(css)}

  const bar=document.querySelector('.wall-subject-bar');
  const wholeHome=document.querySelector('[data-full-paper-home]');
  const workspace=document.querySelector('[data-subject-workspace]');
  if(!bar||!wholeHome||!workspace)return;

  let srsTab=bar.querySelector('[data-srs-tab]');
  if(!srsTab){srsTab=document.createElement('button');srsTab.type='button';srsTab.className='subject-tab srs-tab';srsTab.dataset.srsTab='';srsTab.textContent='速刷卡片';const divider=bar.querySelector('.subject-divider');if(divider)bar.insertBefore(srsTab,divider);else bar.appendChild(srsTab)}

  const home=document.createElement('section');
  home.className='srs-home';home.dataset.srsHome='';home.hidden=true;
  home.innerHTML=`
    <section class="srs-hero">
      <div>
        <div class="eyebrow">SPACED REPETITION · QUICK CARDS</div>
        <h1>408 速刷卡片</h1>
        <p>把已核验真题变成按遗忘速度自动到期的复习卡。答错、标记“不会/模糊”的题会优先进入队列；支持按四科以及“选择题 / 大题”分别速刷。</p>
      </div>
      <div class="srs-stats">
        <div class="srs-stat"><strong data-srs-due>0</strong><span>今日待复习</span></div>
        <div class="srs-stat"><strong data-srs-new>0</strong><span>可学新卡</span></div>
        <div class="srs-stat"><strong data-srs-retention>--</strong><span>预计记忆率</span></div>
        <div class="srs-stat"><strong data-srs-streak>0</strong><span>连续天数</span></div>
      </div>
    </section>
    <section class="srs-toolbar srs-toolbar-v2">
      <div class="srs-filter-stack">
        <div class="srs-filters"><span class="srs-toolbar-label">科目</span>${Object.entries(SUBJECTS).map(([k,v])=>`<button class="srs-filter${k==='all'?' active':''}" type="button" data-srs-filter="${k}">${v}</button>`).join('')}</div>
        <div class="srs-filters srs-type-filters"><span class="srs-toolbar-label">题型</span>${Object.entries(TYPES).map(([k,v])=>`<button class="srs-filter${k==='all'?' active':''}" type="button" data-srs-type="${k}">${v}</button>`).join('')}</div>
      </div>
      <div class="srs-settings"><span class="srs-toolbar-label">每日新卡</span><select data-srs-new-limit><option>10</option><option selected>20</option><option>30</option><option>50</option></select><span class="srs-policy">Everflow SRS v1 · 目标记忆率约 90% · 非墨墨官方算法</span></div>
    </section>
    <section class="srs-stage">
      <div class="srs-card-shell"><div class="srs-progress"><i data-srs-progress></i></div><div data-srs-card><div class="srs-loading">正在读取已核验真题并生成今日复习队列…</div></div></div>
      <aside class="srs-side">
        <section class="srs-side-card"><h3>今日队列</h3><div class="srs-side-list"><div class="srs-side-row"><span>到期复习</span><b data-srs-side-due>0</b></div><div class="srs-side-row"><span>新卡额度</span><b data-srs-side-new>0</b></div><div class="srs-side-row"><span>今日已刷</span><b data-srs-reviewed>0</b></div><div class="srs-side-row"><span>当前卡池</span><b data-srs-total>0</b></div></div></section>
        <section class="srs-side-card"><h3>记忆曲线</h3><p>卡片到期前，系统按稳定度估计记忆保持率；答得越轻松，稳定度增长越快，下次出现越晚。</p><div class="srs-curve" data-srs-curve></div></section>
        <section class="srs-side-card"><h3>电脑速刷</h3><div class="srs-shortcuts"><span>选 A/B/C/D</span><kbd>Q W E R</kbd><span>翻面 / 提交</span><kbd>Enter</kbd><span>重来/困难/记住/简单</span><kbd>1 2 3 4</kbd><span>跳过本张</span><kbd>S</kbd><span>退出卡片模式</span><kbd>Esc</kbd></div></section>
      </aside>
    </section>`;
  wholeHome.after(home);

  const $=s=>home.querySelector(s), $$=s=>[...home.querySelectorAll(s)];
  const els={due:$('[data-srs-due]'),newCount:$('[data-srs-new]'),retention:$('[data-srs-retention]'),streak:$('[data-srs-streak]'),filter:$$('[data-srs-filter]'),typeFilter:$$('[data-srs-type]'),newLimit:$('[data-srs-new-limit]'),card:$('[data-srs-card]'),progress:$('[data-srs-progress]'),sideDue:$('[data-srs-side-due]'),sideNew:$('[data-srs-side-new]'),reviewed:$('[data-srs-reviewed]'),total:$('[data-srs-total]'),curve:$('[data-srs-curve]')};

  function loadJSON(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value&&typeof value==='object'?value:fallback}catch{return fallback}}
  function initialState(){return{version:1,settings:{dailyNew:20,targetRetention:.9},cards:{},daily:{}}}
  let state=loadJSON(SRS_KEY,initialState());
  state.settings={dailyNew:20,targetRetention:.9,...(state.settings||{})};state.cards=state.cards||{};state.daily=state.daily||{};
  let filter='all',typeFilter='all',deck=[],loaded=false,loading=false,selected=null,revealed=false,currentId=null,startedAt=0,skipped=new Set();

  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const cardId=(year,q)=>`${year}-${q}`;
  function save(){localStorage.setItem(SRS_KEY,JSON.stringify(state))}
  function today(){const key=dateKey();state.daily[key]=state.daily[key]||{reviews:0,new:0,again:0,hard:0,good:0,easy:0};return state.daily[key]}
  function wallRecords(){return loadJSON(WALL_KEY,{})}
  function isReviewed(id){return Number(state.cards[id]?.reps||0)>0}
  function recallOf(rec,now=Date.now()){
    if(!rec||!rec.reps||!rec.lastReviewAt||!rec.stability)return null;
    const elapsed=Math.max(0,(now-new Date(rec.lastReviewAt).getTime())/DAY);
    return clamp(Math.pow(.9,elapsed/Math.max(.007,Number(rec.stability))),.01,1);
  }
  function streak(){
    let d=new Date();if(!(state.daily[dateKey(d)]?.reviews>0))d=new Date(d.getTime()-DAY);
    let n=0;for(let i=0;i<3650;i++){const k=dateKey(d);if(!(state.daily[k]?.reviews>0))break;n++;d=new Date(d.getTime()-DAY)}return n;
  }
  function subjectMatch(card){return filter==='all'||card.subject===filter}
  function typeMatch(card){
    if(typeFilter==='all')return true;
    const big=card.item?.type==='comprehensive'||Number(card.q)>40;
    return typeFilter==='comprehensive'?big:!big;
  }
  function cardMatch(card){return subjectMatch(card)&&typeMatch(card)}
  function wallPriority(card){
    const r=wallRecords()[card.id]||{};
    if(r.correct===false)return-4;if(r.status==='weak')return-3;if(r.status==='fuzzy')return-2;if(r.favorite)return-1;return 0;
  }
  function queueInfo(){
    const now=Date.now(),day=today(),newSlots=Math.max(0,Number(state.settings.dailyNew||20)-Number(day.new||0));
    const eligible=deck.filter(cardMatch).filter(c=>!skipped.has(c.id));
    const due=eligible.filter(c=>isReviewed(c.id)&&new Date(state.cards[c.id].dueAt||0).getTime()<=now).sort((a,b)=>wallPriority(a)-wallPriority(b)||(new Date(state.cards[a.id].dueAt||0)-new Date(state.cards[b.id].dueAt||0)));
    const fresh=eligible.filter(c=>!isReviewed(c.id)).sort((a,b)=>wallPriority(a)-wallPriority(b)||a.year-b.year||a.q-b.q);
    return{due,fresh,newSlots,queue:[...due,...fresh.slice(0,newSlots)]};
  }
  function averageRetention(){const vals=deck.filter(cardMatch).map(c=>recallOf(state.cards[c.id])).filter(v=>v!=null);if(!vals.length)return null;return vals.reduce((a,b)=>a+b,0)/vals.length}

  async function loadDeck(){
    if(loaded||loading)return;loading=true;
    try{
      const manifest=await fetch('/data/zhenti/manifest.json?v=20260823srs2',{cache:'no-store'}).then(r=>r.ok?r.json():null);
      const entries=Object.entries(manifest?.years||{}).filter(([,meta])=>Array.isArray(meta.verifiedQuestions)&&meta.verifiedQuestions.length);
      const groups=await Promise.all(entries.map(async([year,meta])=>{
        const paper=await fetch(`/data/zhenti/${year}.json?v=20260823srs2`,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
        if(!paper)return[];
        return meta.verifiedQuestions.map(q=>paper.questions?.[String(q)]).filter(item=>item?.verification?.status==='verified').map(item=>({id:cardId(Number(year),item.number),year:Number(year),q:Number(item.number),subject:item.subject||'ds',item}));
      }));
      deck=groups.flat();loaded=true;
    }catch(err){console.error('Everflow SRS deck load failed',err);deck=[];loaded=true}
    loading=false;renderAll();
  }

  function nextStability(rec,grade){
    const reps=Number(rec?.reps||0),old=Math.max(.007,Number(rec?.stability||0)),difficulty=clamp(Number(rec?.difficulty||5),1,10);
    if(!reps)return grade===1?.007:grade===2?.5:grade===3?1:4;
    if(grade===1)return Math.max(.007,old*.2);
    if(grade===2)return Math.max(.5,old*Math.max(1.12,1.35-.03*(difficulty-5)));
    if(grade===3)return Math.max(1,old*Math.max(1.5,2.2-.08*(difficulty-5)));
    return Math.max(4,old*Math.max(2.2,3.2-.1*(difficulty-5)));
  }
  function intervalText(days){
    if(days<1/24)return`${Math.max(1,Math.round(days*24*60))} 分钟`;
    if(days<1)return`${Math.max(1,Math.round(days*24))} 小时`;
    if(days<30)return`${Math.max(1,Math.round(days))} 天`;
    if(days<365)return`${(days/30).toFixed(days<60?1:0)} 个月`;
    return`${(days/365).toFixed(1)} 年`;
  }
  function gradeLabel(g){return g===1?'重来':g===2?'困难':g===3?'记住':'简单'}
  function gradeKey(g){return g===1?'again':g===2?'hard':g===3?'good':'easy'}
  function schedule(card,grade){
    const prev=state.cards[card.id]||{},wasNew=!Number(prev.reps||0),stability=nextStability(prev,grade),difficulty=clamp(Number(prev.difficulty||5)+(grade===1?.9:grade===2?.35:grade===3?-.12:-.45),1,10),now=Date.now();
    state.cards[card.id]={...prev,stability,difficulty,reps:Number(prev.reps||0)+1,lapses:Number(prev.lapses||0)+(grade===1?1:0),lastGrade:grade,lastReviewAt:new Date(now).toISOString(),dueAt:new Date(now+stability*DAY).toISOString(),lastAnswer:selected,lastCorrect:selected&&card.item.options?String(selected)===String(card.item.answer):null,lastTimeSpent:Math.max(0,Math.round((now-startedAt)/1000))};
    const d=today();d.reviews=Number(d.reviews||0)+1;if(wasNew)d.new=Number(d.new||0)+1;const k=gradeKey(grade);d[k]=Number(d[k]||0)+1;save();
    selected=null;revealed=false;currentId=null;startedAt=0;renderAll();
  }

  function renderCurve(){
    const bars=Array.from({length:24},(_,i)=>Math.round(100*Math.pow(.9,i/6)));
    els.curve.innerHTML=bars.map(v=>`<i style="height:${v}%" title="${v}%"></i>`).join('');
  }
  function renderStats(){
    const info=queueInfo(),ret=averageRetention(),day=today();
    els.due.textContent=String(info.due.length+Math.min(info.fresh.length,info.newSlots));els.newCount.textContent=String(Math.min(info.fresh.length,info.newSlots));els.retention.textContent=ret==null?'--':`${Math.round(ret*100)}%`;els.streak.textContent=String(streak());
    els.sideDue.textContent=String(info.due.length);els.sideNew.textContent=`${Math.min(info.fresh.length,info.newSlots)}/${info.newSlots}`;els.reviewed.textContent=String(day.reviews||0);els.total.textContent=String(deck.filter(cardMatch).length);
    const done=Number(day.reviews||0),left=info.queue.length;els.progress.style.width=`${done+left?Math.min(100,Math.round(done/(done+left)*100)):100}%`;
  }
  function cardMemory(card){const r=state.cards[card.id],p=recallOf(r);return p==null?null:Math.round(p*100)}
  function currentCard(){const info=queueInfo();if(currentId){const same=info.queue.find(c=>c.id===currentId);if(same)return same}const next=info.queue[0]||null;if(next){currentId=next.id;selected=null;revealed=false;startedAt=Date.now()}return next}

  function renderCurrent(){
    if(!loaded){els.card.innerHTML='<div class="srs-loading">正在读取已核验真题并生成今日复习队列…</div>';return}
    const card=currentCard(),info=queueInfo();
    if(!card){
      els.card.innerHTML=`<div class="srs-empty"><div><div class="mark">✓</div><h2>当前筛选已刷完</h2><p>这个科目 / 题型组合下没有到期卡片，或今日新卡额度已经用完。你可以切换“选择题 / 大题”继续刷。</p><button type="button" data-srs-reset-skip>${skipped.size?'恢复本次跳过':'重新检查队列'}</button></div></div>`;
      els.card.querySelector('[data-srs-reset-skip]')?.addEventListener('click',()=>{skipped.clear();currentId=null;renderAll()});return;
    }
    const item=card.item,rec=state.cards[card.id]||{},memory=cardMemory(card),isNew=!rec.reps,choice=Boolean(item.options)&&Number(card.q)<=40;
    const options=item.options?`<div class="srs-options">${Object.entries(item.options).map(([k,v])=>{let cls='srs-option';if(selected===k)cls+=' selected';if(revealed&&String(k)===String(item.answer))cls+=' correct';if(revealed&&selected===k&&String(k)!==String(item.answer))cls+=' wrong';return`<button type="button" class="${cls}" data-srs-option="${esc(k)}" ${revealed?'disabled':''}><b>${esc(k)}.</b><span>${esc(v)}</span><kbd>${DISPLAY_KEY[k]||k}</kbd></button>`}).join('')}</div>`:'';
    const result=revealed&&choice?`<div class="srs-result ${String(selected)===String(item.answer)?'ok':'bad'}">${String(selected)===String(item.answer)?'✓ 回答正确':'✕ 回答错误'} · 你的答案 ${esc(selected||'—')} · 正确答案 ${esc(item.answer)}</div>`:'';
    const answer=revealed?`<div class="srs-answer"><strong>参考答案：${esc(item.answer)}</strong><div>${esc(item.analysis||'暂无解析')}</div>${result}</div>`:'';
    const primary=!revealed?`<div class="srs-primary-row"><button class="srs-primary" type="button" data-srs-reveal ${choice&&!selected?'disabled':''}>${choice?'提交并翻面':'显示参考答案'}<kbd>Enter</kbd></button></div>`:'';
    const grades=revealed?`<div class="srs-grade-title">回想这道题时，你感觉怎么样？</div><div class="srs-grades">${[1,2,3,4].map(g=>`<button class="srs-grade" type="button" data-srs-grade="${g}"><kbd>${g}</kbd><strong>${gradeLabel(g)}</strong><span>${intervalText(nextStability(rec,g))}后</span></button>`).join('')}</div>`:'';
    els.card.innerHTML=`<article class="srs-card"><div class="srs-card-meta"><span class="srs-chip ${isNew?'new':'due'}">${isNew?'新卡':'到期复习'}</span><span class="srs-chip">${card.year} · 第 ${card.q} 题</span><span class="srs-chip">${SHORT[card.subject]||''} ${SUBJECTS[card.subject]||''}</span><span class="srs-chip">${choice?'选择题':'大题'}</span><div class="srs-memory"><span>${memory==null?'尚未建立曲线':`预计记忆率 ${memory}%`}</span><span class="srs-memory-bar"><i style="width:${memory==null?100:memory}%"></i></span></div></div><div class="srs-question"><strong>${item.type==='comprehensive'?'综合应用题':'选择题'}</strong><div>${esc(item.stem)}</div></div>${options}${primary}${answer}${grades}<div class="srs-card-foot"><span>队列剩余 ${info.queue.length} 张 · 已核验来源优先 · 弱项自动前置</span><button class="srs-skip" type="button" data-srs-skip>跳过这张 <kbd>S</kbd></button></div></article>`;
    els.card.querySelectorAll('[data-srs-option]').forEach(btn=>btn.addEventListener('click',()=>{if(revealed)return;selected=btn.dataset.srsOption;renderCurrent()}));
    els.card.querySelector('[data-srs-reveal]')?.addEventListener('click',()=>{if(choice&&!selected)return;revealed=true;renderCurrent()});
    els.card.querySelectorAll('[data-srs-grade]').forEach(btn=>btn.addEventListener('click',()=>schedule(card,Number(btn.dataset.srsGrade))));
    els.card.querySelector('[data-srs-skip]')?.addEventListener('click',()=>{skipped.add(card.id);currentId=null;selected=null;revealed=false;renderAll()});
  }
  function renderAll(){renderStats();renderCurve();renderCurrent()}

  function resetQueue(){skipped.clear();currentId=null;selected=null;revealed=false;renderAll()}
  function activate(){
    localStorage.setItem(ACTIVE_KEY,'1');
    bar.querySelectorAll('[data-main-subject]').forEach(btn=>btn.classList.remove('active'));srsTab.classList.add('active');
    workspace.hidden=true;wholeHome.hidden=true;home.hidden=false;skipped.clear();currentId=null;selected=null;revealed=false;
    loadDeck();if(loaded)renderAll();
  }
  function deactivate(){
    localStorage.removeItem(ACTIVE_KEY);srsTab.classList.remove('active');home.hidden=true;currentId=null;selected=null;revealed=false;skipped.clear();
  }
  function exitToSubject(){
    deactivate();const wanted=localStorage.getItem('everflow-408-wall-subject')||'ds';const btn=bar.querySelector(`[data-main-subject="${wanted}"]`)||bar.querySelector('[data-main-subject="ds"]');btn?.click();
  }

  srsTab.addEventListener('click',activate);
  bar.querySelectorAll('[data-main-subject]').forEach(btn=>btn.addEventListener('click',deactivate));
  els.filter.forEach(btn=>btn.addEventListener('click',()=>{filter=btn.dataset.srsFilter||'all';els.filter.forEach(x=>x.classList.toggle('active',x===btn));resetQueue()}));
  els.typeFilter.forEach(btn=>btn.addEventListener('click',()=>{typeFilter=btn.dataset.srsType||'all';els.typeFilter.forEach(x=>x.classList.toggle('active',x===btn));resetQueue()}));
  els.newLimit.value=String(state.settings.dailyNew||20);els.newLimit.addEventListener('change',()=>{state.settings.dailyNew=Number(els.newLimit.value)||20;save();resetQueue()});

  function typing(){const el=document.activeElement;return Boolean(el&&(['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||el.isContentEditable))}
  document.addEventListener('keydown',e=>{
    if(home.hidden||typing())return;
    const upper=String(e.key||'').toUpperCase(),card=currentCard();
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();exitToSubject();return}
    if(!card)return;
    if(!revealed&&KEYMAP[upper]&&card.item.options){e.preventDefault();e.stopImmediatePropagation();selected=KEYMAP[upper];renderCurrent();return}
    if(e.key==='Enter'||e.code==='Space'){e.preventDefault();e.stopImmediatePropagation();if(!revealed){if(!card.item.options||selected){revealed=true;renderCurrent()}}else schedule(card,3);return}
    if(revealed&&['1','2','3','4'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();schedule(card,Number(e.key));return}
    if(upper==='S'){e.preventDefault();e.stopImmediatePropagation();skipped.add(card.id);currentId=null;selected=null;revealed=false;renderAll()}
  },true);

  window.addEventListener('storage',e=>{if(e.key===SRS_KEY){state=loadJSON(SRS_KEY,initialState());renderAll()}});
  if(localStorage.getItem(ACTIVE_KEY)==='1')setTimeout(activate,0);
})();
