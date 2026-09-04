(()=>{
  if(document.body?.dataset?.view!=='zhenti')return;
  const ERROR_KEY='everflow-408-srs-error-v1';
  const WALL_KEY='everflow-408-zhenti-wall-v1';
  if(!document.querySelector('link[href*="zhenti-srs-error.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/zhenti-srs-error.css?v=20260823b';document.head.appendChild(css)}
  const home=document.querySelector('[data-srs-home]');if(!home)return;
  const cardRoot=home.querySelector('[data-srs-card]'),stats=home.querySelector('.srs-stats'),queueList=home.querySelector('.srs-side-list');if(!cardRoot||!stats||!queueList)return;
  const load=(key,fallback={})=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'?v:fallback}catch{return fallback}};
  const save=v=>localStorage.setItem(ERROR_KEY,JSON.stringify(v));
  const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const subjectForQ=q=>{if((q>=1&&q<=10)||q===41||q===42)return'ds';if((q>=11&&q<=22)||q===43||q===44)return'co';if((q>=23&&q<=32)||q===45||q===46)return'os';return'cn'};
  const parseId=id=>{const m=String(id||'').match(/^(\d{4})-(\d+)$/);return m?{year:Number(m[1]),q:Number(m[2])}:null};
  const rateText=(wrong,attempts)=>attempts?`${Math.round(wrong/attempts*100)}%`:'--';
  let state=load(ERROR_KEY,{version:1,cards:{},daily:{}});state.cards=state.cards||{};state.daily=state.daily||{};let lastAttempt={id:'',wrong:null,at:0};
  const top=document.createElement('div');top.className='srs-stat error';top.innerHTML='<strong data-srs-error-rate>--</strong><span>错误率</span>';stats.appendChild(top);
  const side=document.createElement('div');side.className='srs-side-row error';side.innerHTML='<span>今日错误率</span><b data-srs-today-error>--</b>';queueList.appendChild(side);
  const topValue=top.querySelector('[data-srs-error-rate]'),todayValue=side.querySelector('[data-srs-today-error]');
  function activeFilter(){return home.querySelector('[data-srs-filter].active')?.dataset.srsFilter||'all'}
  function activeType(){return home.querySelector('[data-srs-type].active')?.dataset.srsType||'all'}
  function matchesFilter(id,subject){const p=parseId(id);if(!p)return false;const sf=activeFilter(),tf=activeType(),sub=subject||state.cards[id]?.subject||subjectForQ(p.q);if(sf!=='all'&&sub!==sf)return false;const big=p.q>40;return tf==='all'||(tf==='comprehensive'?big:!big)}
  function combinedFor(id){const s=state.cards[id]||{},w=load(WALL_KEY,{})[id]||{};const wallAttempts=Math.max(0,Number(w.attempts||0)),wallCorrect=Math.max(0,Number(w.correctCount||0));return{attempts:Math.max(0,Number(s.attempts||0))+wallAttempts,wrong:Math.max(0,Number(s.wrong||0))+Math.max(0,wallAttempts-wallCorrect)}}
  function aggregate(){const wall=load(WALL_KEY,{}),ids=new Set([...Object.keys(state.cards),...Object.keys(wall)]);let attempts=0,wrong=0;ids.forEach(id=>{const p=parseId(id);if(!p||!matchesFilter(id,state.cards[id]?.subject))return;const x=combinedFor(id);attempts+=x.attempts;wrong+=x.wrong});return{attempts,wrong}}
  function currentCardInfo(){const text=cardRoot.querySelector('.srs-card-meta')?.textContent||'',m=text.match(/(\d{4})\s*·\s*第\s*(\d+)\s*题/);if(!m)return null;const q=Number(m[2]);return{id:`${m[1]}-${q}`,q,subject:subjectForQ(q)}}
  function renderCardRate(){const info=currentCardInfo(),meta=cardRoot.querySelector('.srs-card-meta');if(!info||!meta)return;meta.querySelector('[data-srs-card-error]')?.remove();const x=combinedFor(info.id),rate=x.attempts?Math.round(x.wrong/x.attempts*100):null;const badge=document.createElement('span');badge.dataset.srsCardError='';badge.className=`srs-error-rate ${rate==null?'empty':rate<=20?'low':''}`;badge.innerHTML=rate==null?'错误率 --':`错误率 ${rate}% <span class="srs-error-detail">${x.wrong}/${x.attempts}</span>`;const memory=meta.querySelector('.srs-memory');if(memory)meta.insertBefore(badge,memory);else meta.appendChild(badge)}
  function renderStats(){const all=aggregate(),day=state.daily[dateKey()]||{};topValue.textContent=rateText(all.wrong,all.attempts);top.title=all.attempts?`当前筛选累计错 ${all.wrong} / ${all.attempts}`:'当前筛选暂无可统计的选择题作答';todayValue.textContent=rateText(Number(day.wrong||0),Number(day.attempts||0));renderCardRate()}
  function recordAttempt(id,wrong){const now=Date.now();if(lastAttempt.id===id&&lastAttempt.wrong===wrong&&now-lastAttempt.at<1500)return;lastAttempt={id,wrong,at:now};const p=parseId(id);if(!p)return;const rec=state.cards[id]||{attempts:0,wrong:0,subject:subjectForQ(p.q)};rec.attempts=Number(rec.attempts||0)+1;rec.wrong=Number(rec.wrong||0)+(wrong?1:0);rec.subject=rec.subject||subjectForQ(p.q);rec.updatedAt=new Date(now).toISOString();state.cards[id]=rec;const key=dateKey(),d=state.daily[key]||{attempts:0,wrong:0};d.attempts=Number(d.attempts||0)+1;d.wrong=Number(d.wrong||0)+(wrong?1:0);state.daily[key]=d;save(state);renderStats()}
  function captureResult(expectedId){const info=currentCardInfo();if(!info||info.id!==expectedId)return;const result=cardRoot.querySelector('.srs-result');if(result)recordAttempt(info.id,result.classList.contains('bad'))}
  document.addEventListener('click',e=>{if(home.hidden)return;const reveal=e.target.closest?.('[data-srs-reveal]');if(reveal){const info=currentCardInfo();if(info)setTimeout(()=>captureResult(info.id),0)}if(e.target.closest?.('[data-srs-filter],[data-srs-type]'))setTimeout(renderStats,0)});
  window.addEventListener('keydown',e=>{if(home.hidden)return;const el=document.activeElement;if(el&&(['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||el.isContentEditable))return;if(e.key==='Enter'||e.code==='Space'){if(cardRoot.querySelector('[data-srs-grade]'))return;const info=currentCardInfo();if(info)setTimeout(()=>captureResult(info.id),0)}},true);
  window.addEventListener('storage',e=>{if(e.key===ERROR_KEY){state=load(ERROR_KEY,{version:1,cards:{},daily:{}});state.cards=state.cards||{};state.daily=state.daily||{};renderStats()}else if(e.key===WALL_KEY)renderStats()});
  const observer=new MutationObserver(()=>renderStats());observer.observe(cardRoot,{childList:true,subtree:false});renderStats();
})();
