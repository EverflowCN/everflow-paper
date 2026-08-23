(()=>{
  if(document.body?.dataset?.view!=='zhenti')return;

  const SRS_KEY='everflow-408-srs-v1';
  const ERROR_KEY='everflow-408-srs-error-v1';
  const ACTIVE_KEY='everflow-408-srs-active';
  const BASELINE_KEY='everflow-408-srs-reset-baseline-v1';
  const TOAST_KEY='everflow-408-srs-reset-toast';

  const home=document.querySelector('[data-srs-home]');
  const settings=home?.querySelector('.srs-settings');
  if(!home||!settings)return;

  function dateKey(d=new Date()){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function readJSON(key,fallback){
    try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'?v:fallback}catch{return fallback}
  }
  function writeRaw(key,value){
    if(value==null)localStorage.removeItem(key);else localStorage.setItem(key,value);
  }
  function sameDay(iso,key){
    if(!iso)return false;const d=new Date(iso);return !Number.isNaN(d.getTime())&&dateKey(d)===key;
  }

  function baselines(){
    const data=readJSON(BASELINE_KEY,{version:1,days:{}});data.version=1;data.days=data.days||{};return data;
  }
  function ensureTodayBaseline(){
    const key=dateKey(),data=baselines();
    if(!data.days[key]){
      data.days[key]={
        createdAt:new Date().toISOString(),
        srs:localStorage.getItem(SRS_KEY),
        error:localStorage.getItem(ERROR_KEY)
      };
      const keys=Object.keys(data.days).sort().reverse();
      keys.slice(14).forEach(k=>delete data.days[k]);
      localStorage.setItem(BASELINE_KEY,JSON.stringify(data));
    }
    return data.days[key];
  }
  ensureTodayBaseline();

  const style=document.createElement('style');
  style.id='everflow-srs-reset-style';
  style.textContent=`
    .srs-reset-btn{height:31px;border:1px solid var(--line);border-radius:9px;background:var(--soft);color:var(--ink);padding:0 10px;font:800 10px/1 system-ui;cursor:pointer}.srs-reset-btn:hover{border-color:color-mix(in srgb,var(--red) 45%,var(--line));color:var(--red)}
    .srs-reset-overlay[hidden]{display:none!important}.srs-reset-overlay{position:fixed;inset:0;z-index:10040;display:grid;place-items:center;padding:20px}.srs-reset-backdrop{position:absolute;inset:0;background:rgba(10,12,18,.52);backdrop-filter:blur(8px)}.srs-reset-dialog{position:relative;width:min(560px,100%);border:1px solid var(--line);border-radius:22px;background:var(--card);box-shadow:0 30px 100px rgba(0,0,0,.28);overflow:hidden}.srs-reset-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid var(--line)}.srs-reset-head h3{margin:0;font-size:18px}.srs-reset-head p{margin:5px 0 0;color:var(--muted);font-size:11px;line-height:1.6}.srs-reset-close{width:34px;height:34px;border:1px solid var(--line);border-radius:999px;background:var(--soft);color:var(--ink);font-size:20px;cursor:pointer}.srs-reset-options{display:grid;gap:10px;padding:18px 22px}.srs-reset-option{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:15px 16px;border:1px solid var(--line);border-radius:15px;background:var(--soft)}.srs-reset-option strong{display:block;font-size:13px}.srs-reset-option p{margin:5px 0 0;color:var(--muted);font-size:10px;line-height:1.65}.srs-reset-option button{min-width:94px;height:36px;border:0;border-radius:10px;background:var(--ink);color:var(--paper);font:850 11px/1 system-ui;cursor:pointer}.srs-reset-option.danger{border-color:color-mix(in srgb,var(--red) 30%,var(--line));background:color-mix(in srgb,var(--red) 4%,var(--card))}.srs-reset-option.danger button{background:var(--red);color:#fff}.srs-reset-note{padding:0 22px 20px;color:var(--muted);font-size:10px;line-height:1.7}.srs-reset-confirm{padding:16px 22px 20px;border-top:1px solid var(--line);background:var(--card)}.srs-reset-confirm[hidden]{display:none}.srs-reset-confirm p{margin:0 0 12px;font-size:11px;line-height:1.7}.srs-reset-actions{display:flex;justify-content:flex-end;gap:8px}.srs-reset-actions button{height:36px;padding:0 14px;border:1px solid var(--line);border-radius:10px;background:var(--soft);color:var(--ink);font-weight:800;cursor:pointer}.srs-reset-actions .confirm-danger{border-color:var(--red);background:var(--red);color:#fff}
    @media(max-width:620px){.srs-reset-option{grid-template-columns:1fr}.srs-reset-option button{width:100%}.srs-reset-dialog{border-radius:18px}}
  `;
  document.head.appendChild(style);

  const trigger=document.createElement('button');
  trigger.type='button';trigger.className='srs-reset-btn';trigger.dataset.srsResetOpen='';trigger.textContent='↺ 重置';
  settings.appendChild(trigger);

  const overlay=document.createElement('div');
  overlay.className='srs-reset-overlay';overlay.hidden=true;
  overlay.innerHTML=`
    <div class="srs-reset-backdrop" data-srs-reset-close></div>
    <section class="srs-reset-dialog" role="dialog" aria-modal="true" aria-label="速刷卡片重置">
      <header class="srs-reset-head"><div><h3>重置速刷卡片</h3><p>只处理速刷卡片 SRS 数据，不删除真题墙普通答题、熟练度、收藏、笔记。</p></div><button class="srs-reset-close" type="button" data-srs-reset-close aria-label="关闭">×</button></header>
      <div class="srs-reset-options">
        <div class="srs-reset-option"><div><strong>今日重置</strong><p>恢复到今天首次加载速刷卡片时的状态：今日已刷、今日错误率、今日调度一并回退，可从头重刷今天的队列。</p></div><button type="button" data-srs-reset-choice="today">今日重置</button></div>
        <div class="srs-reset-option danger"><div><strong>全部重置</strong><p>清空全部 SRS 记忆曲线、复习次数、连续天数和速刷错误率，所有已核验卡片重新按新卡开始。</p></div><button type="button" data-srs-reset-choice="all">全部重置</button></div>
      </div>
      <div class="srs-reset-note">为避免误删，执行前会再次确认。全部重置不会清除普通真题模式中的答案、笔记与掌握状态。</div>
      <div class="srs-reset-confirm" data-srs-reset-confirm hidden><p data-srs-reset-confirm-text></p><div class="srs-reset-actions"><button type="button" data-srs-reset-cancel>取消</button><button type="button" class="confirm-danger" data-srs-reset-do>确认重置</button></div></div>
    </section>`;
  document.body.appendChild(overlay);

  const confirmBox=overlay.querySelector('[data-srs-reset-confirm]');
  const confirmText=overlay.querySelector('[data-srs-reset-confirm-text]');
  const doBtn=overlay.querySelector('[data-srs-reset-do]');
  let pending='';

  function open(){overlay.hidden=false;confirmBox.hidden=true;pending='';document.body.style.overflow='hidden'}
  function close(){overlay.hidden=true;confirmBox.hidden=true;pending='';document.body.style.overflow=''}
  function ask(kind){
    pending=kind;confirmBox.hidden=false;
    confirmText.textContent=kind==='today'
      ?'确认重置今天的速刷进度？今天的复习统计、错误率和调度会回到今日首次加载速刷卡片时。'
      :'确认全部重置速刷卡片？SRS 记忆曲线、连续天数、复习历史和速刷错误率都会清空。';
    doBtn.textContent=kind==='today'?'确认今日重置':'确认全部重置';
  }

  function fallbackResetToday(){
    const key=dateKey(),now=new Date().toISOString();
    const srs=readJSON(SRS_KEY,null);
    if(srs){
      srs.daily=srs.daily||{};delete srs.daily[key];
      Object.values(srs.cards||{}).forEach(rec=>{if(sameDay(rec?.lastReviewAt,key))rec.dueAt=now});
      localStorage.setItem(SRS_KEY,JSON.stringify(srs));
    }
    const error=readJSON(ERROR_KEY,null);
    if(error){error.daily=error.daily||{};delete error.daily[key];localStorage.setItem(ERROR_KEY,JSON.stringify(error))}
  }

  function resetToday(){
    const key=dateKey(),data=baselines(),base=data.days[key];
    if(base){
      writeRaw(SRS_KEY,base.srs);writeRaw(ERROR_KEY,base.error);
      sessionStorage.setItem(TOAST_KEY,'今日速刷已重置：已恢复到今天首次加载速刷卡片时的状态。');
    }else{
      fallbackResetToday();
      sessionStorage.setItem(TOAST_KEY,'今日统计已重置；由于没有今日起点快照，今天刷过的卡片已重新设为到期。');
    }
    localStorage.setItem(ACTIVE_KEY,'1');location.reload();
  }

  function resetAll(){
    localStorage.removeItem(SRS_KEY);localStorage.removeItem(ERROR_KEY);localStorage.removeItem(BASELINE_KEY);
    localStorage.setItem(ACTIVE_KEY,'1');
    sessionStorage.setItem(TOAST_KEY,'速刷卡片已全部重置；普通真题答题、笔记和掌握状态未删除。');
    location.reload();
  }

  trigger.addEventListener('click',open);
  overlay.querySelectorAll('[data-srs-reset-close]').forEach(el=>el.addEventListener('click',close));
  overlay.querySelectorAll('[data-srs-reset-choice]').forEach(btn=>btn.addEventListener('click',()=>ask(btn.dataset.srsResetChoice)));
  overlay.querySelector('[data-srs-reset-cancel]').addEventListener('click',()=>{confirmBox.hidden=true;pending=''});
  doBtn.addEventListener('click',()=>{if(pending==='today')resetToday();else if(pending==='all')resetAll()});
  document.addEventListener('keydown',e=>{if(!overlay.hidden&&e.key==='Escape'){e.preventDefault();close()}},true);

  const message=sessionStorage.getItem(TOAST_KEY);
  if(message){
    sessionStorage.removeItem(TOAST_KEY);
    setTimeout(()=>window.EveraUI?.toast?.(message,{type:'success',title:'重置完成',duration:4200}),250);
  }
})();