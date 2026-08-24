import{RELAX_STORAGE_KEYS,SRS_KEY,loadRecords,saveRecords,clearCompat,clearRelaxStorage}from'./relax1000-core.js?v=20260825-bank1';

const subbar=document.querySelector('.relax-subview-bar');
if(!subbar)throw new Error('Relax1000 subview bar missing');

const BASELINE_KEY='everflow-408-relax-srs-reset-baseline-v1';
const TOAST_KEY='everflow-408-relax-reset-toast';
const readJson=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}};
const writeJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const sameDay=(iso,key)=>{const d=new Date(iso||0);return !Number.isNaN(d.getTime())&&dateKey(d)===key};

function ensureBaseline(){
  const key=dateKey(),data=readJson(BASELINE_KEY,{version:1,days:{}});data.days=data.days||{};
  if(!data.days[key]){
    data.days[key]={createdAt:new Date().toISOString(),srs:localStorage.getItem(SRS_KEY)};
    Object.keys(data.days).sort().reverse().slice(14).forEach(day=>delete data.days[day]);
    writeJson(BASELINE_KEY,data);
  }
}
ensureBaseline();

const trigger=document.createElement('button');
trigger.type='button';trigger.className='relax-reset-trigger';trigger.dataset.relaxResetOpen='';trigger.textContent='↺ 重置';
subbar.appendChild(trigger);

const overlay=document.createElement('div');
overlay.className='relax-reset-overlay';overlay.hidden=true;
overlay.innerHTML=`
  <div class="relax-reset-backdrop" data-relax-reset-close></div>
  <section class="relax-reset-dialog" role="dialog" aria-modal="true" aria-labelledby="relax-reset-title">
    <header class="relax-reset-head"><div><h3 id="relax-reset-title">重置 Relax1000</h3><p>按数据类型单独清理。除“全部重置”外，不会删除其它类别的数据。</p></div><button type="button" data-relax-reset-close aria-label="关闭">×</button></header>
    <div class="relax-reset-grid">
      <button type="button" data-relax-reset-choice="today"><b>今日速刷</b><span>回到今天首次打开速刷卡片时</span></button>
      <button type="button" data-relax-reset-choice="srs"><b>全部速刷</b><span>清空 SRS 曲线、复习次数与连续天数</span></button>
      <button type="button" data-relax-reset-choice="answers"><b>答题记录</b><span>清答案、对错与次数；保留状态、收藏、笔记</span></button>
      <button type="button" data-relax-reset-choice="status"><b>掌握状态</b><span>只清“熟练 / 模糊 / 不会”</span></button>
      <button type="button" data-relax-reset-choice="favorites"><b>收藏</b><span>只清 Relax1000 收藏记录</span></button>
      <button class="danger" type="button" data-relax-reset-choice="all"><b>全部重置</b><span>清空 Relax1000 本机学习数据，保留页面偏好</span></button>
    </div>
    <div class="relax-reset-confirm" data-relax-reset-confirm hidden><p data-relax-reset-text></p><div><button type="button" data-relax-reset-cancel>取消</button><button class="danger" type="button" data-relax-reset-do>确认重置</button></div></div>
  </section>`;
document.body.appendChild(overlay);

let pending='';
const confirmBox=overlay.querySelector('[data-relax-reset-confirm]');
const confirmText=overlay.querySelector('[data-relax-reset-text]');
const doBtn=overlay.querySelector('[data-relax-reset-do]');
const copy={
  today:'确认重置今天的速刷进度？今天产生的复习统计与调度会恢复到今日首次打开卡片时。',
  srs:'确认清空全部 Relax1000 速刷记忆曲线？普通答题、收藏、笔记不受影响。',
  answers:'确认清空 Relax1000 的答题记录？掌握状态、收藏和笔记会保留。',
  status:'确认清空全部 Relax1000 掌握状态？答题记录、收藏和笔记会保留。',
  favorites:'确认清空全部 Relax1000 收藏？其他学习记录会保留。',
  all:'确认全部重置 Relax1000？答案、错题、状态、收藏、笔记和速刷曲线都会删除。'
};
function open(){overlay.hidden=false;pending='';confirmBox.hidden=true;document.body.classList.add('relax-reset-open')}
function close(){overlay.hidden=true;pending='';confirmBox.hidden=true;document.body.classList.remove('relax-reset-open')}
function ask(kind){pending=kind;confirmText.textContent=copy[kind]||'确认重置？';confirmBox.hidden=false;doBtn.textContent=kind==='all'?'确认全部重置':'确认重置'}
function stripRecords(fields){
  const records=loadRecords(),next={};
  for(const [id,record] of Object.entries(records)){
    const copy={...record};fields.forEach(field=>delete copy[field]);
    delete copy.updatedAt;
    if(Object.keys(copy).length)next[id]=copy;
  }
  saveRecords(next);
}
function resetToday(){
  const key=dateKey(),base=readJson(BASELINE_KEY,{days:{}})?.days?.[key];
  if(base?.srs!=null)localStorage.setItem(SRS_KEY,base.srs);else{
    const srs=readJson(SRS_KEY,null);if(srs){delete srs.daily?.[key];const now=new Date().toISOString();Object.values(srs.cards||{}).forEach(card=>{if(sameDay(card?.lastReviewAt,key))card.dueAt=now});writeJson(SRS_KEY,srs)}
  }
}
function perform(kind){
  if(kind==='today')resetToday();
  if(kind==='srs'){localStorage.removeItem(SRS_KEY);localStorage.removeItem(BASELINE_KEY)}
  if(kind==='answers'){
    stripRecords(['answer','draftAnswer','correct','reviewed','attempts','correctCount','timeSpent']);
    clearCompat(RELAX_STORAGE_KEYS.seen,RELAX_STORAGE_KEYS.mistakes,RELAX_STORAGE_KEYS.everWrong);
  }
  if(kind==='status')stripRecords(['status']);
  if(kind==='favorites'){
    stripRecords(['favorite']);clearCompat(RELAX_STORAGE_KEYS.bookmarks);
  }
  if(kind==='all'){
    clearRelaxStorage({keepPreferences:true});localStorage.removeItem(BASELINE_KEY);
  }
  sessionStorage.setItem(TOAST_KEY,kind==='all'?'Relax1000 已全部重置。':'重置完成。');
  location.reload();
}

trigger.addEventListener('click',open);
overlay.querySelectorAll('[data-relax-reset-close]').forEach(node=>node.addEventListener('click',close));
overlay.querySelectorAll('[data-relax-reset-choice]').forEach(node=>node.addEventListener('click',()=>ask(node.dataset.relaxResetChoice)));
overlay.querySelector('[data-relax-reset-cancel]').addEventListener('click',()=>{pending='';confirmBox.hidden=true});
doBtn.addEventListener('click',()=>pending&&perform(pending));
document.addEventListener('keydown',event=>{if(!overlay.hidden&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close()}},true);

const message=sessionStorage.getItem(TOAST_KEY);
if(message){sessionStorage.removeItem(TOAST_KEY);setTimeout(()=>window.EveraUI?.toast?.(message,{type:'success',title:'Relax1000',duration:3600}),200)}
