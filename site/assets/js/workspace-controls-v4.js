(()=>{
  'use strict';
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const pad=n=>String(n).padStart(2,'0');

  const ICONS={
    overview:'<path d="M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1"/><path d="M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1"/><path d="M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1"/><path d="M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1"/>',
    analytics:'<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
    users:'<path d="M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/>',
    membership:'<path d="M15 5v2M15 11v2M15 17v2"/><path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2"/>',
    codes:'<circle cx="8" cy="15" r="4"/><path d="M10.85 12.15L19 4"/><path d="M18 5l2 2"/><path d="M15 8l2 2"/>',
    notices:'<path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/>',
    resources:'<path d="M9 15l6-6"/><path d="M11 6l.463-.536a5 5 0 0 1 7.071 7.072L18 13"/><path d="M13 18l-.397.534a5.068 5.068 0 0 1-7.127 0 4.972 4.972 0 0 1 0-7.071L6 11"/>',
    quality:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    risks:'<path d="M10.3 3.7L2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0"/><path d="M12 9v4M12 17h.01"/>',
    feedback:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/>',
    oxygen:'<path d="M4 6h11a3 3 0 0 1 3 3v1"/><path d="M15 7l3 3 3-3"/><path d="M20 18H9a3 3 0 0 1-3-3v-1"/><path d="M9 17l-3-3-3 3"/>',
    audit:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    operations:'<path d="M4 7h10M4 17h16M14 4v6M9 14v6"/>',
    system:'<path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37 1 .608 2.296.07 2.572-1.065"/><path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0"/>',
    home:'<path d="M5 12l-2 0 9-9 9 9h-2"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    account:'<path d="M5 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>'
  };
  const icon=(paths)=>`<span class="ws-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${paths}</svg></span>`;

  function restoreSidebarIcons(){
    qsa('.ws3 .ws-nav [data-ws-nav]').forEach(el=>{
      const key=el.dataset.wsNav;
      if(!ICONS[key])return;
      [...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).forEach(n=>n.remove());
      if(!qs('.ws-nav-icon',el))el.insertAdjacentHTML('afterbegin',icon(ICONS[key]));
    });
    qsa('.ws3 .ws-nav a').forEach(el=>{
      const href=el.getAttribute('href')||'';
      const key=href.includes('account')?'account':'home';
      [...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).forEach(n=>n.remove());
      if(!qs('.ws-nav-icon',el))el.insertAdjacentHTML('afterbegin',icon(ICONS[key]));
    });
  }

  let openSelect=null;
  function closeSelect(){
    if(!openSelect)return;
    openSelect.classList.remove('open');
    const trigger=qs('.ws-select-trigger',openSelect);
    if(trigger)trigger.setAttribute('aria-expanded','false');
    openSelect=null;
  }
  function syncSelect(host){
    const select=qs('select',host),value=qs('.ws-select-value-text',host);
    if(!select||!value)return;
    const option=select.options[select.selectedIndex];
    value.textContent=option?.textContent||'请选择';
    qsa('.ws-select-option',host).forEach(btn=>{
      const selected=btn.dataset.value===select.value;
      btn.classList.toggle('is-selected',selected);
      btn.setAttribute('aria-selected',selected?'true':'false');
    });
  }
  function enhanceSelect(select){
    if(!select||select.dataset.wsEnhanced==='1'||select.multiple||select.size>1)return;
    select.dataset.wsEnhanced='1';
    select.classList.add('ws-select-native');
    const host=document.createElement('div');
    host.className='ws-select-host';
    select.parentNode.insertBefore(host,select);
    host.appendChild(select);
    const options=[...select.options].map(o=>`<button type="button" class="ws-select-option" role="option" data-value="${String(o.value).replaceAll('&','&amp;').replaceAll('"','&quot;')}"><span>${o.textContent}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg></button>`).join('');
    host.insertAdjacentHTML('beforeend',`<button type="button" class="ws-select-trigger" aria-haspopup="listbox" aria-expanded="false"><span class="ws-select-value-text"></span><svg class="ws-select-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div class="ws-select-menu" role="listbox">${options}</div>`);
    const trigger=qs('.ws-select-trigger',host);
    trigger.addEventListener('click',e=>{
      e.stopPropagation();
      if(openSelect&&openSelect!==host)closeSelect();
      const opening=!host.classList.contains('open');
      host.classList.toggle('open',opening);
      trigger.setAttribute('aria-expanded',opening?'true':'false');
      openSelect=opening?host:null;
    });
    qsa('.ws-select-option',host).forEach(btn=>btn.addEventListener('click',()=>{
      if(select.value!==btn.dataset.value){
        select.value=btn.dataset.value;
        select.dispatchEvent(new Event('input',{bubbles:true}));
        select.dispatchEvent(new Event('change',{bubbles:true}));
      }
      syncSelect(host);closeSelect();trigger.focus({preventScroll:true});
    }));
    select.addEventListener('change',()=>syncSelect(host));
    syncSelect(host);
  }
  function enhanceAllSelects(){qsa('.ws3 select').forEach(enhanceSelect)}
  function refreshSelects(){qsa('.ws-select-host').forEach(syncSelect)}

  let dateInput=null,dateMonth=new Date(),dateSelected=null,dateHour=0,dateMinute=0;
  const dateTargets=['[data-promo-until]','[data-code-redeem-expire]','[data-code-grant-expire]'];
  function parseDateText(value){
    const s=String(value||'').trim();
    const m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/);
    if(!m)return null;
    const d=new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0));
    return Number.isNaN(d.getTime())?null:d;
  }
  function formatInput(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`}
  function formatHuman(d){return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日  ${pad(d.getHours())}:${pad(d.getMinutes())}`}
  function ensureDateDialog(){
    if(qs('[data-ws-datetime-overlay]'))return;
    const overlay=document.createElement('div');
    overlay.className='ws-datetime-overlay';overlay.hidden=true;overlay.dataset.wsDatetimeOverlay='1';
    overlay.innerHTML=`<div class="ws-datetime-dialog" role="dialog" aria-modal="true" aria-label="选择日期和时间"><div class="ws-datetime-head"><div><span>DATE & TIME</span><strong data-ws-date-title></strong></div><div class="ws-datetime-nav"><button type="button" data-ws-date-prev aria-label="上个月"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><button type="button" data-ws-date-next aria-label="下个月"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div></div><div class="ws-datetime-week"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div><div class="ws-datetime-grid" data-ws-date-grid></div><div class="ws-datetime-time"><div class="ws-time-label"><span>时间</span><small>24 小时制</small></div><div class="ws-time-steppers"><div class="ws-time-stepper"><button type="button" data-time-hour-dec aria-label="小时减一">−</button><input data-time-hour inputmode="numeric" maxlength="2" aria-label="小时"><button type="button" data-time-hour-inc aria-label="小时加一">＋</button><small>时</small></div><b>:</b><div class="ws-time-stepper"><button type="button" data-time-minute-dec aria-label="分钟减五">−</button><input data-time-minute inputmode="numeric" maxlength="2" aria-label="分钟"><button type="button" data-time-minute-inc aria-label="分钟加五">＋</button><small>分</small></div></div></div><div class="ws-datetime-actions"><button type="button" class="subtle" data-ws-date-clear>清空</button><div><button type="button" class="subtle" data-ws-date-now>现在</button><button type="button" class="primary" data-ws-date-done>完成</button></div></div></div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeDateDialog()});
    qs('[data-ws-date-prev]').onclick=()=>{dateMonth=new Date(dateMonth.getFullYear(),dateMonth.getMonth()-1,1);renderDateDialog()};
    qs('[data-ws-date-next]').onclick=()=>{dateMonth=new Date(dateMonth.getFullYear(),dateMonth.getMonth()+1,1);renderDateDialog()};
    const adjust=(type,delta)=>{if(type==='h')dateHour=(dateHour+delta+24)%24;else dateMinute=(dateMinute+delta+60)%60;syncTimeBoxes()};
    qs('[data-time-hour-dec]').onclick=()=>adjust('h',-1);qs('[data-time-hour-inc]').onclick=()=>adjust('h',1);
    qs('[data-time-minute-dec]').onclick=()=>adjust('m',-5);qs('[data-time-minute-inc]').onclick=()=>adjust('m',5);
    qs('[data-time-hour]').addEventListener('input',e=>{dateHour=Math.max(0,Math.min(23,parseInt(e.target.value||'0',10)||0))});
    qs('[data-time-minute]').addEventListener('input',e=>{dateMinute=Math.max(0,Math.min(59,parseInt(e.target.value||'0',10)||0))});
    qs('[data-ws-date-clear]').onclick=()=>{if(dateInput){dateInput.value='';dateInput.dispatchEvent(new Event('input',{bubbles:true}));syncDateTrigger(dateInput)}closeDateDialog()};
    qs('[data-ws-date-now]').onclick=()=>{const d=new Date();dateSelected=new Date(d.getFullYear(),d.getMonth(),d.getDate());dateMonth=new Date(d.getFullYear(),d.getMonth(),1);dateHour=d.getHours();dateMinute=d.getMinutes();syncTimeBoxes();renderDateDialog()};
    qs('[data-ws-date-done]').onclick=()=>{
      if(!dateInput||!dateSelected)return closeDateDialog();
      const d=new Date(dateSelected.getFullYear(),dateSelected.getMonth(),dateSelected.getDate(),dateHour,dateMinute);
      dateInput.value=formatInput(d);dateInput.dispatchEvent(new Event('input',{bubbles:true}));dateInput.dispatchEvent(new Event('change',{bubbles:true}));syncDateTrigger(dateInput);closeDateDialog();
    };
  }
  function syncTimeBoxes(){const h=qs('[data-time-hour]'),m=qs('[data-time-minute]');if(h)h.value=pad(dateHour);if(m)m.value=pad(dateMinute)}
  function renderDateDialog(){
    const title=qs('[data-ws-date-title]'),grid=qs('[data-ws-date-grid]');if(!title||!grid)return;
    title.textContent=`${dateMonth.getFullYear()}年 ${dateMonth.getMonth()+1}月`;
    const first=new Date(dateMonth.getFullYear(),dateMonth.getMonth(),1),start=new Date(first);start.setDate(1-((first.getDay()+6)%7));
    const today=new Date();let html='';
    for(let i=0;i<42;i++){
      const d=new Date(start);d.setDate(start.getDate()+i);
      const classes=['ws-datetime-day'];
      if(d.getMonth()!==dateMonth.getMonth())classes.push('outside');
      if(d.toDateString()===today.toDateString())classes.push('today');
      if(dateSelected&&d.toDateString()===dateSelected.toDateString())classes.push('selected');
      html+=`<button type="button" class="${classes.join(' ')}" data-ws-date="${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}">${d.getDate()}</button>`;
    }
    grid.innerHTML=html;
    qsa('[data-ws-date]',grid).forEach(btn=>btn.onclick=()=>{const [y,m,d]=btn.dataset.wsDate.split('-').map(Number);dateSelected=new Date(y,m-1,d);dateMonth=new Date(y,m-1,1);renderDateDialog()});
  }
  function openDateDialog(input){
    ensureDateDialog();dateInput=input;
    const parsed=parseDateText(input.value)||new Date();
    dateSelected=new Date(parsed.getFullYear(),parsed.getMonth(),parsed.getDate());dateMonth=new Date(parsed.getFullYear(),parsed.getMonth(),1);dateHour=parsed.getHours();dateMinute=parsed.getMinutes();syncTimeBoxes();renderDateDialog();qs('[data-ws-datetime-overlay]').hidden=false;document.documentElement.classList.add('ws-modal-open');
  }
  function closeDateDialog(){const o=qs('[data-ws-datetime-overlay]');if(o)o.hidden=true;dateInput=null;document.documentElement.classList.remove('ws-modal-open')}
  function syncDateTrigger(input){
    if(!input)return;const trigger=qs(`[data-ws-date-for="${input.dataset.wsDateId||''}"]`);if(!trigger)return;
    const value=qs('.ws-date-trigger-value',trigger),parsed=parseDateText(input.value);
    if(!parsed){value.textContent='未设置时间';trigger.classList.add('empty')}else{value.textContent=formatHuman(parsed);trigger.classList.remove('empty')}
  }
  function enhanceDateInput(input,index){
    if(!input||input.dataset.wsDateReady==='1')return;
    input.dataset.wsDateReady='1';input.dataset.wsDateId=`wsdt${index}`;input.type='hidden';input.classList.add('ws-date-native');
    const trigger=document.createElement('button');trigger.type='button';trigger.className='ws-date-trigger empty';trigger.dataset.wsDateFor=input.dataset.wsDateId;trigger.innerHTML=`<span class="ws-date-trigger-value">未设置时间</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4v3M18 4v3M4 9h16"/><rect x="4" y="6" width="16" height="14" rx="3"/><path d="M8 13h3M13 13h3M8 17h3"/></svg>`;trigger.onclick=()=>openDateDialog(input);input.insertAdjacentElement('afterend',trigger);syncDateTrigger(input);
  }
  function enhanceDates(){ensureDateDialog();dateTargets.forEach((s,i)=>enhanceDateInput(qs(s),i))}
  function refreshDates(){dateTargets.forEach(s=>syncDateTrigger(qs(s)))}

  function init(){
    if(!document.body.classList.contains('ws3'))return;
    restoreSidebarIcons();enhanceAllSelects();enhanceDates();
    document.addEventListener('click',e=>{if(openSelect&&!e.target.closest('.ws-select-host'))closeSelect()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeSelect();closeDateDialog()}});
    const observer=new MutationObserver(()=>{restoreSidebarIcons();enhanceAllSelects()});
    observer.observe(document.body,{childList:true,subtree:true});
    setInterval(()=>{refreshSelects();refreshDates()},500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
