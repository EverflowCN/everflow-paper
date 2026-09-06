/* FocusPomo v2 fruit + screenshot fidelity layer. Appended in the same module as app.js. */
const FP2_FRUITS={
 tomato:{label:'番茄',src:'assets/tomato.png',small:'assets/tomato-small.png'},
 pear:{label:'香梨',src:'assets/pear.svg',small:'assets/pear.svg'}
};
const FP2_fruit=(value)=>FP2_FRUITS[value]||FP2_FRUITS.tomato;
const FP2_rows=()=>state.sessions.filter(r=>r.outcome==='finished');
const FP2_rewardRows=()=>state.sessions.filter(reward);
const FP2_seconds=rows=>rows.filter(r=>r.outcome==='finished').reduce((sum,r)=>sum+r.seconds,0);
const FP2_hm=seconds=>{const total=Math.floor(seconds/60),h=Math.floor(total/60),m=total%60;return h?`${h}<small>h</small> ${m}<small>m</small>`:`${m}<small>m</small>`};
const FP2_dayLabel=d=>['日','一','二','三','四','五','六'][d.getDay()];
const FP2_dayEnd=value=>{const d=new Date(value);d.setHours(24,0,0,0);return d.getTime()};
const FP2_escapeAttr=s=>esc(s).replace(/"/g,'&quot;');
const FP2_durationSide=seconds=>typeof fruitSide==='function'?fruitSide(seconds):Math.max(36,Math.floor(Math.min(110,(Math.max(0,seconds)/60)*.4228571428571429+33.885714285714286)));

theme.settings='light';
const FP2_settingsPage=document.createElement('section');
FP2_settingsPage.className='page page-settings';
FP2_settingsPage.dataset.page='settings';
FP2_settingsPage.innerHTML=`
 <div class="settings-scroll">
  <header class="settings-hero">
   <button class="settings-back" type="button" data-go="focus" aria-label="返回">‹</button>
   <h1>欢迎^^</h1>
   <p>What I do today is important because I<br class="phone-only"> am exchanging a day of my life for it.</p>
  </header>
  <section class="plus-card"><b>FocusPomo PLUS 永久会员</b><span>从泥土，到星辰</span></section>
  <section class="settings-section">
   <h2>使用指南</h2>
   <div class="settings-group">
    <button class="settings-row" type="button" id="fp2Faq"><span><b>常见问题</b><small>遇到了问题？你可以在这里找到答案</small></span><em>›</em></button>
    <button class="settings-row" type="button" id="fp2Wish"><span><b>新功能许愿</b><small>任何愿望都可以告诉我们，说不定就会实现呢</small></span><em>›</em></button>
   </div>
  </section>
  <section class="settings-section">
   <h2>App 屏蔽工具</h2>
   <div class="settings-group">
    <div class="settings-row"><span><b>App 黑名单</b><small>网页模式不具备系统级 App 屏蔽权限</small></span><i class="ios-switch is-on" aria-hidden="true"></i></div>
    <div class="settings-row"><span><b>已屏蔽的 App</b><small>原生端可优先屏蔽社交和娱乐类 App</small></span><strong>—</strong><em>›</em></div>
   </div>
  </section>
  <section class="settings-section fruit-settings">
   <h2>果物</h2>
   <div class="settings-group fruit-group">
    <div class="settings-row fruit-heading"><span><b>默认果物</b><small>每次专注固定一个果物；切换默认不会改写旧记录</small></span></div>
    <div class="fruit-choice-grid" id="fp2FruitChoices"></div>
   </div>
  </section>
  <section class="settings-section">
   <h2>提醒</h2>
   <div class="settings-group">
    <button class="settings-row" type="button" id="fp2Notify"><span><b>番茄钟提醒</b><small>完成番茄钟或休息结束时发送提醒</small></span><strong>开启</strong><em>›</em></button>
    <div class="settings-row"><span><b>实时活动</b><small>网页会在页面恢复后按真实时间结算</small></span><i class="ios-switch is-on" aria-hidden="true"></i></div>
   </div>
  </section>
  <section class="settings-section">
   <h2>专注</h2>
   <div class="settings-group compact-controls">
    <label class="settings-row"><span><b>短休息</b><small>每次完成后的休息时间</small></span><select id="fp2Short"></select></label>
    <label class="settings-row"><span><b>长休息</b><small>完成若干轮后的长休息</small></span><select id="fp2Long"></select></label>
    <label class="settings-row"><span><b>长休息间隔</b><small>多少个番茄触发一次长休息</small></span><select id="fp2Cycles"></select></label>
    <label class="settings-row"><span><b>首页果物范围</b><small>控制首页物理果物显示的时间范围</small></span><select id="fp2Window"></select></label>
    <label class="settings-row"><span><b>完成提示音</b><small>专注结束后播放提示音</small></span><input id="fp2Sound" type="checkbox"></label>
    <label class="settings-row"><span><b>显示放弃记录</b><small>以半透明果物显示未完成记录</small></span><input id="fp2Failed" type="checkbox"></label>
   </div>
  </section>
 </div>`;
win.append(FP2_settingsPage);

const FP2_stats=document.createElement('div');
FP2_stats.className='stats-mobile';
FP2_stats.innerHTML=`
 <header class="stats-head">
  <button class="stats-back" data-go="focus" type="button">⌃</button>
  <div class="stats-date-nav"><button type="button" data-stats-shift="-1">‹</button><b>今天</b><button type="button" data-stats-shift="1">›</button></div>
  <button class="stats-add plus-round" type="button">+</button>
 </header>
 <div class="stats-title"><h1>数据统计 <span>BETA</span></h1><p id="fp2StatsDate"></p></div>
 <section class="stats-total-card">
  <div><span>累计番茄数</span><b><img src="assets/tomato-small.png" alt=""> <i id="fp2TotalFruit">0</i></b></div>
  <div><span>总专注</span><b id="fp2TotalFocus">0<small>h</small></b></div>
 </section>
 <h2 class="stats-section-title">专注趋势</h2>
 <section class="stats-trend-card">
  <div class="trend-summary">
   <div><span>今日专注</span><b id="fp2TodayFocus">0<small>h</small></b><em id="fp2TodayDelta">——</em></div>
   <div><span>本周专注</span><b id="fp2WeekFocus">0<small>h</small></b><em id="fp2WeekDelta">——</em></div>
  </div>
  <div class="week-chart">
   <div class="daily-average"><span>日均</span><b id="fp2DailyAverage">0<small>m</small></b></div>
   <div class="average-line"></div>
   <div class="week-bars" id="fp2WeekBars"></div>
  </div>
 </section>
 <button class="stats-show-all" type="button" id="fp2ShowAll">显示全部</button>
 <h2 class="stats-section-title details-title">番茄详情</h2>
 <section class="stats-fruit-detail" id="fp2FruitDetail"></section>`;
$('.page-trend').append(FP2_stats);

const FP2_duration=$('#durationPopover');
if(FP2_duration&&!$('#fp2DurationFruit')){
 const preview=document.createElement('div');
 preview.className='duration-fruit-preview';
 preview.id='fp2DurationFruit';
 preview.innerHTML='<img alt=""><div class="duration-big-value" id="fp2DurationBig">25</div>';
 FP2_duration.insertBefore(preview,FP2_duration.firstChild);
}
const FP2_pearImage=new Image();FP2_pearImage.src='assets/pear.svg';

function FP2_renderFruitChoices(){
 const root=$('#fp2FruitChoices');if(!root)return;
 const selected=state.settings.defaultFruit||'tomato';
 root.innerHTML=[
  ['tomato','番茄','每次收获番茄'],
  ['pear','香梨','每次收获香梨'],
  ['random','随机','两种果物随机共存']
 ].map(([key,label,sub])=>{
  const preview=key==='random'
   ?`<span class="fruit-duo"><img src="${FP2_FRUITS.tomato.small}" alt=""><img src="${FP2_FRUITS.pear.small}" alt=""></span>`
   :`<img src="${FP2_fruit(key).small}" alt="">`;
  return `<button type="button" data-fruit-choice="${key}" class="${selected===key?'selected':''}">${preview}<span><b>${label}</b><small>${sub}</small></span><i>${selected===key?'✓':''}</i></button>`
 }).join('');
 root.querySelectorAll('[data-fruit-choice]').forEach(button=>button.onclick=()=>{
  state.settings.defaultFruit=button.dataset.fruitChoice;
  changed();FP2_renderFruitChoices();FP2_updateDurationPreview();
 });
}
function FP2_options(values,current,suffix=''){
 return values.map(v=>`<option value="${v}" ${Number(current)===Number(v)?'selected':''}>${v}${suffix}</option>`).join('');
}
function FP2_renderSettings(){
 const p=state.settings;
 FP2_renderFruitChoices();
 const short=$('#fp2Short'),long=$('#fp2Long'),cycles=$('#fp2Cycles'),windowSelect=$('#fp2Window'),sound=$('#fp2Sound'),failed=$('#fp2Failed');
 if(!short)return;
 short.innerHTML=FP2_options([3,5,10,15,20,25,30],p.short,' 分钟');
 long.innerHTML=FP2_options([10,15,20,25,30,45,60],p.long,' 分钟');
 cycles.innerHTML=FP2_options([2,3,4,5,6,8,10,12],p.cycles,' 次');
 windowSelect.innerHTML=[['week','本周'],['lastweek','上周'],['month','本月'],['quarter','近三个月']].map(([v,l])=>`<option value="${v}" ${p.window===v?'selected':''}>${l}</option>`).join('');
 sound.checked=p.sound;failed.checked=p.showFailed;
 short.onchange=()=>{p.short=Number(short.value);changed()};
 long.onchange=()=>{p.long=Number(long.value);changed()};
 cycles.onchange=()=>{p.cycles=Number(cycles.value);changed()};
 windowSelect.onchange=()=>{p.window=windowSelect.value;changed()};
 sound.onchange=()=>{p.sound=sound.checked;changed()};
 failed.onchange=()=>{p.showFailed=failed.checked;changed()};
 $('#fp2Notify').onclick=()=>send('focus-notification-permission');
 $('#fp2Faq').onclick=()=>toast('当前私人网页版按原应用界面还原；系统级屏蔽能力仅原生 App 可用。');
 $('#fp2Wish').onclick=()=>toast('果物系统已接入：番茄与香梨可共存，并会持续按截图完善。');
}
function FP2_weekRange(anchorValue=Date.now()){
 const start=new Date(anchorValue);start.setHours(0,0,0,0);start.setDate(start.getDate()-(start.getDay()+6)%7);
 const end=new Date(start);end.setDate(end.getDate()+7);
 return {start:start.getTime(),end:end.getTime()};
}
let FP2_statsAnchor=Date.now();
function FP2_formatDate(value){
 const d=new Date(value);
 return `${d.getMonth()+1}月${d.getDate()}日, ${dayStart(value)===dayStart(Date.now())?'今天':d.toLocaleDateString('zh-CN',{weekday:'short'})}`;
}
function FP2_deltaText(nowValue,previousValue){
 if(previousValue<=0)return nowValue>0?'▲ >999%':'——';
 const pct=Math.round((nowValue-previousValue)/previousValue*100);
 return `${pct>=0?'▲':'▼'} ${pct>999?'>999':Math.abs(pct)}%`;
}
function FP2_renderStats(){
 if(!FP2_stats)return;
 const anchorDay=dayStart(FP2_statsAnchor),anchorEnd=FP2_dayEnd(FP2_statsAnchor);
 const done=FP2_rows(),rewarded=FP2_rewardRows();
 const totalSeconds=FP2_seconds(done),totalFruit=rewarded.length;
 $('#fp2StatsDate').textContent=FP2_formatDate(FP2_statsAnchor);
 $('#fp2TotalFruit').textContent=totalFruit;
 const totalHours=Math.floor(totalSeconds/3600),totalMins=Math.floor(totalSeconds%3600/60);
 $('#fp2TotalFocus').innerHTML=totalHours?`${totalHours}<small>h</small>`:`${totalMins}<small>m</small>`;
 const todayRows=done.filter(r=>r.start>=anchorDay&&r.start<anchorEnd),today=FP2_seconds(todayRows);
 const prevStart=anchorDay-864e5,prev=FP2_seconds(done.filter(r=>r.start>=prevStart&&r.start<anchorDay));
 $('#fp2TodayFocus').innerHTML=FP2_hm(today);
 $('#fp2TodayDelta').textContent=FP2_deltaText(today,prev);
 const wr=FP2_weekRange(FP2_statsAnchor),prevWr={start:wr.start-7*864e5,end:wr.start};
 const weekRows=done.filter(r=>r.start>=wr.start&&r.start<wr.end),week=FP2_seconds(weekRows);
 const prevWeek=FP2_seconds(done.filter(r=>r.start>=prevWr.start&&r.start<prevWr.end));
 $('#fp2WeekFocus').innerHTML=FP2_hm(week);
 $('#fp2WeekDelta').textContent=FP2_deltaText(week,prevWeek);
 const daily=week/7;
 $('#fp2DailyAverage').innerHTML=FP2_hm(daily);
 const days=Array.from({length:7},(_,i)=>{
  const start=wr.start+i*864e5,end=start+864e5;
  const rows=weekRows.filter(r=>r.start>=start&&r.start<end),minutes=FP2_seconds(rows)/60;
  const byTag=new Map();
  for(const row of rows)byTag.set(row.tagId,(byTag.get(row.tagId)||0)+row.seconds/60);
  return {start,minutes,byTag};
 });
 const max=Math.max(30,daily/60,...days.map(d=>d.minutes));
 $('#fp2WeekBars').innerHTML=days.map(day=>{
  const height=day.minutes?Math.max(10,Math.min(100,day.minutes/max*100)):0;
  const segments=[...day.byTag.entries()].map(([id,m])=>`<i style="height:${Math.max(1,m/day.minutes*100)}%;background:${tag(id).color}"></i>`).join('');
  const d=new Date(day.start),isToday=dayStart(day.start)===dayStart(Date.now());
  return `<div class="week-col ${isToday?'today':''}"><div class="bar-shell" style="height:${height}%">${segments}</div><span></span><b>${FP2_dayLabel(d)}</b></div>`;
 }).join('');
 const avgLine=$('.average-line');if(avgLine)avgLine.style.bottom=`${Math.max(8,Math.min(72,(daily/60)/max*100))}%`;
 const latest=rewarded.slice(-32);
 $('#fp2FruitDetail').innerHTML=latest.length?latest.map(row=>{
  const fruit=FP2_fruit(row.fruitType),side=FP2_durationSide(row.seconds);
  return `<button type="button" data-fp2-session="${FP2_escapeAttr(row.id)}" style="--fruit-thumb:${Math.round(24+side/110*30)}px"><img src="${fruit.small}" alt="${fruit.label}"><small>${Math.round(row.seconds/60)}m</small></button>`;
 }).join(''):'<p>完成一次专注后，这里会出现你的果物。</p>';
 $$('[data-fp2-session]').forEach(b=>b.onclick=()=>editRecord(state.sessions.find(r=>r.id===b.dataset.fp2Session)));
}
FP2_stats.querySelectorAll('[data-stats-shift]').forEach(button=>button.onclick=()=>{
 const next=new Date(FP2_statsAnchor);next.setDate(next.getDate()+Number(button.dataset.statsShift));
 if(next>Date.now())return;
 FP2_statsAnchor=next.getTime();FP2_renderStats();
});
FP2_stats.querySelector('.stats-add').onclick=()=>editRecord();
$('#fp2ShowAll').onclick=()=>go('pomodoro');

function FP2_updateDurationPreview(value){
 const big=$('#fp2DurationBig'),box=$('#fp2DurationFruit');if(!big||!box)return;
 const raw=value??(durationChoice??Number($('#customMinutes')?.value||state.settings.minutes||0));
 const minutes=Number.isFinite(Number(raw))?Number(raw):state.settings.minutes;
 big.textContent=minutes===0?'∞':String(minutes);
 const choice=state.settings.defaultFruit||'tomato';
 const actual=choice==='random'?'tomato':choice;
 box.querySelector('img').src=FP2_fruit(actual).small;
 box.classList.toggle('is-random',choice==='random');
}
$$('[data-min]').forEach(button=>button.addEventListener('click',()=>FP2_updateDurationPreview(Number(button.dataset.min))));
$('#customMinutes')?.addEventListener('input',e=>FP2_updateDurationPreview(Number(e.target.value)));
const FP2_oldTimerClick=$('#timerValue').onclick;
$('#timerValue').onclick=e=>{FP2_oldTimerClick?.call($('#timerValue'),e);FP2_updateDurationPreview(state.settings.minutes)};

finished=function(row){
 if(state.settings.sound)beep();
 send('focus-notify',{title:'专注完成',body:human(row.seconds)});
 const fruit=FP2_fruit(row.fruitType);
 show('专注完成',`<img class="finish-tomato" src="${fruit.src}" alt="${fruit.label}"><p>${esc(tag(row.tagId).name)} · ${human(row.seconds)} · ${fruit.label}</p>`,[['restNow',`休息 ${nextBreak(state)} 分钟`,'primary'],['againNow','继续专注'],['closeDialog','回到首页']]);
 $('#restNow').onclick=()=>{modal.close();start(state,{rest:true,minutes:nextBreak(state)});changed()};
 $('#againNow').onclick=()=>{modal.close();startFocus()};
};

const FP2_baseRenderTags=renderTags;
renderTags=function(){
 FP2_baseRenderTags();
 const root=$('#tagsTomatoField'),fruits=visibleTomatoes().slice(-160);
 root.innerHTML=fruits.map((row,i)=>{
  const f=FP2_fruit(row.fruitType);
  const side=Math.max(20,Math.min(38,FP2_durationSide(row.seconds)*.34));
  return `<img src="${f.small}" style="left:${(i*31)%97}%;bottom:${(i*47)%260}px;width:${side}px;height:${side}px;transform:rotate(${(hash(row.id)%42)-21}deg)" alt="">`;
 }).join('');
};

const FP2_baseRenderData=renderData;
renderData=function(){
 FP2_baseRenderData();
 const rows=currentRows().filter(reward);
 $('#tomatoWall').innerHTML=rows.length?rows.map(row=>{
  const f=FP2_fruit(row.fruitType),size=FP2_durationSide(row.seconds);
  return `<button data-session="${FP2_escapeAttr(row.id)}" style="--detail-fruit:${Math.round(54+size/110*46)}%"><img src="${f.small}" alt="${esc(tag(row.tagId).name)} ${f.label} ${human(row.seconds)}"></button>`;
 }).join(''):'<p class="empty">完成一次专注，收获你的第一个果物。</p>';
 $$('[data-session]').forEach(b=>b.onclick=()=>editRecord(state.sessions.find(r=>r.id===b.dataset.session)));
 FP2_renderStats();
};

const FP2_baseRenderTimer=renderTimer;
renderTimer=function(){
 FP2_baseRenderTimer();
 const a=state.active;
 if(a&&a.mode==='focus')$('#pauseBtn').classList.remove('hidden');
 const f=FP2_fruit(a?.fruitType||(state.settings.defaultFruit==='pear'?'pear':'tomato'));
 document.documentElement.style.setProperty('--current-fruit',`url("${f.small}")`);
 const menu=$('#menuBtn');if(menu)menu.textContent=a?'⌁':'•••';
};

syncBodies=function(){
 const rows=visibleTomatoes().slice(-300),old=new Map(bodies.map(b=>[b.id,b]));
 bodies=rows.map((row,i)=>{
  const found=old.get(row.id),side=FP2_durationSide(row.seconds);
  if(found){found.failed=row.outcome==='abandoned';found.fruitType=row.fruitType||'tomato';found.r=side/2;return found}
  return{id:row.id,x:side/2+hash(row.id)%Math.max(1,Math.floor(width-side)),y:-side-i*3,r:side/2,vx:0,vy:0,a:(hash(row.id)%60-30)/50,spin:0,failed:row.outcome==='abandoned',fruitType:row.fruitType||'tomato'}
 });
};

animate=function(now){
 const dt=Math.min(2,(now-last)/16.7);last=now;
 if(page==='focus'&&!document.hidden){
  ctx.clearRect(0,0,width,height);
  for(const b of bodies){
   if(drag?.body===b)continue;
   b.vx+=gravity.x*dt;b.vy+=gravity.y*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.a+=b.spin*dt;b.spin*=.995;
   if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx)*.5}
   if(b.x>width-b.r){b.x=width-b.r;b.vx=-Math.abs(b.vx)*.5}
   if(b.y>height-b.r){b.y=height-b.r;b.vy=-Math.abs(b.vy)*.25;b.vx*=.96}
   if(b.y< -200)b.y=-200;
  }
  const grid=new Map(),cell=120;
  for(const b of bodies){
   const gx=Math.floor(b.x/cell),gy=Math.floor(b.y/cell);
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
    for(const a of grid.get(`${gx+dx},${gy+dy}`)||[]){
     const x=b.x-a.x,y=b.y-a.y,d=Math.hypot(x,y),min=a.r+b.r;
     if(d>0&&d<min){
      const nx=x/d,ny=y/d,o=(min-d)*.51;
      if(drag?.body!==a){a.x-=nx*o;a.y-=ny*o}
      if(drag?.body!==b){b.x+=nx*o;b.y+=ny*o}
      const v=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
      if(v<0){const imp=-v*.4;a.vx-=imp*nx;a.vy-=imp*ny;b.vx+=imp*nx;b.vy+=imp*ny}
     }
    }
   }
   const key=`${gx},${gy}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(b);
  }
  for(const b of bodies){
   const image=b.fruitType==='pear'?FP2_pearImage:tomatoImage;
   if(!image.complete||!image.naturalWidth)continue;
   ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);ctx.globalAlpha=b.failed?.38:1;
   ctx.drawImage(image,-b.r,-b.r,b.r*2,b.r*2);ctx.restore();
  }
 }
 requestAnimationFrame(animate);
};

const FP2_baseRender=render;
render=function(){
 FP2_baseRender();
 if(page==='settings')FP2_renderSettings();
 if(page==='trend')FP2_renderStats();
};

const FP2_baseGo=go;
go=function(name){
 FP2_baseGo(name);
 win.classList.toggle('settings-mode',name==='settings');
 win.classList.toggle('stats-mode',name==='trend');
 const back=$('#backBtn');
 if(back)back.textContent=name==='tags'?'×':'‹';
 if(name==='settings')FP2_renderSettings();
 if(name==='trend')FP2_renderStats();
};

$('#settingsBtn').onclick=()=>{$('#menuPopover').classList.add('hidden');go('settings')};
FP2_settingsPage.querySelector('[data-go="focus"]').onclick=()=>go('focus');

const FP2_oldEditRecord=editRecord;
editRecord=function(record){
 FP2_oldEditRecord(record);
 if(record){
  const form=$('#recordForm');
  form?.insertAdjacentHTML('beforeend',`<p class="record-fruit-note">果物：${FP2_fruit(record.fruitType).label} · 大小随本次实际专注时长计算</p>`);
 }
};

FP2_updateDurationPreview();
syncBodies();
render();
resize();
