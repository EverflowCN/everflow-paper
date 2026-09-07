/* Recording-led page completion; retains the approved home and recovered assets. */
const V={period:'D',date:Date.now(),tag:null,detail:false,calendar:Date.now(),calendarMode:'D'};
const vSum=rows=>rows.filter(r=>r.outcome==='finished').reduce((n,r)=>n+r.seconds,0);
const vDate=n=>new Date(n).toLocaleDateString('zh-CN',{month:'long',day:'numeric'});
const vRange=()=>V.period==='A'?{start:Math.min(Date.now(),...state.sessions.map(r=>r.start)),end:Date.now()+1}:V.period==='W'?vWeekRange(V.date):range(V.period,V.date);
const vRows=()=>inRange(state.sessions,vRange()).filter(r=>!V.tag||r.tagId===V.tag);
const vFruit=r=>FP2_fruit(r.fruitType).src;
function vSheet(title,html,actions=[['closeDialog','完成','primary']]){show(title,html,actions);modal.classList.add('video-sheet')}
modal.addEventListener('close',()=>modal.classList.remove('video-sheet','video-ruler-dialog','v-dark'));
function vInfo(title,copy){vSheet(title,`<p>${copy}</p>`)}
function vPersist(){changed()}
function vChoice(title,key,values,suffix=''){
 const initial=state.settings[key]??(key==='weekStart'?1:values[0][0]);
 vSheet(title,`<div class="v-wheel" role="listbox" aria-label="${title}">${values.map(([value,label])=>`<button type="button" role="option" aria-selected="${initial===value}" data-value="${value}" class="${initial===value?'chosen':''}">${label}${suffix}</button>`).join('')}</div>`);
 let value=initial;const wheel=modal.querySelector('.v-wheel'),buttons=[...wheel.children];
 function select(button){value=values.find(x=>String(x[0])===button.dataset.value)[0];buttons.forEach(b=>{b.classList.toggle('chosen',b===button);b.setAttribute('aria-selected',String(b===button))})}
 function center(button,behavior='instant'){wheel.scrollTo({top:button.offsetTop-wheel.offsetTop+button.offsetHeight/2-wheel.clientHeight/2,behavior})}
 requestAnimationFrame(()=>center(buttons.find(b=>b.classList.contains('chosen'))));
 wheel.onscroll=()=>{const middle=wheel.getBoundingClientRect().top+wheel.clientHeight/2;select(buttons.reduce((best,b)=>Math.abs(b.getBoundingClientRect().top+b.offsetHeight/2-middle)<Math.abs(best.getBoundingClientRect().top+best.offsetHeight/2-middle)?b:best))};
 buttons.forEach(b=>b.onclick=()=>{select(b);center(b,'smooth')});
 $('#closeDialog').onclick=()=>{state.settings[key]=value;modal.close();vPersist()}
}
function vDuration(initial,onDone,dark=false){
 vSheet('',`<div class="v-duration-copy"><h2 id="vDurationTitle"></h2><p id="vDurationText"></p></div><img class="v-duration-fruit" src="${FP5_HD_TOMATO}" alt="番茄"><div class="v-ruler" role="listbox" aria-label="专注时长">${Array.from({length:181},(_,m)=>`<button type="button" role="option" aria-selected="${m===initial}" data-minute="${m}" aria-label="${m===0?'正计时':m+' 分钟'}"><b>${m===0?'∞':m%5===0?m:''}</b><i class="${m%5===0?'major':''}"></i></button>`).join('')}</div><div class="v-ruler-pointer">◆</div>`,[['vDurationDone','完成','primary']]);
 modal.classList.add('video-ruler-dialog');modal.classList.toggle('v-dark',dark);let choice=initial;const ruler=$('.v-ruler');
 function display(m){choice=m;const fruit=modal.querySelector('.v-duration-fruit'),side=36+m*.422857;fruit.style.width=side+'px';fruit.style.height=side+'px';fruit.style.left=`calc(50% - ${side/2}px)`;$('#vDurationTitle').textContent=m?'':'正计时模式';$('#vDurationText').textContent=m?'':'从 0 开始正计时，过程支持暂停。专注记录可以在时间轴视图中查看';ruler.querySelectorAll('[data-minute]').forEach(b=>b.setAttribute('aria-selected',String(+b.dataset.minute===m)))}
 ruler.onscroll=()=>display(Math.max(0,Math.min(180,Math.round(ruler.scrollLeft/16))));ruler.querySelectorAll('[data-minute]').forEach(b=>b.onclick=()=>{ruler.scrollTo({left:+b.dataset.minute*16,behavior:'instant'});display(+b.dataset.minute)});
 requestAnimationFrame(()=>{ruler.scrollLeft=initial*16;display(initial)});$('#vDurationDone').onclick=()=>{modal.close();modal.classList.remove('v-dark');onDone(choice)};
}
$('#timerValue').onclick=()=>{if(!state.active)vDuration(state.settings.minutes,m=>{state.settings.minutes=m;vPersist()})};
/* Label editing and sorting use the same tag objects and preserve record references. */
let vTagEditing=false;
const vOldTags=renderTags;
renderTags=function(){vOldTags();const sort=state.settings.tagSort||'manual';if(sort==='duration'||sort==='name'){$('#tagsGrid').append(...[...$('#tagsGrid').children].sort((a,b)=>{const id=e=>e.querySelector('[data-tag]')?.dataset.tag;if(sort==='name')return tag(id(a)).name.localeCompare(tag(id(b)).name,'zh-CN');return vSum(state.sessions.filter(r=>r.tagId===id(b)))-vSum(state.sessions.filter(r=>r.tagId===id(a)))}))}
 $('#tagsGrid').classList.toggle('v-edit-tags',vTagEditing);$('#tagsGrid').querySelectorAll('[data-tag]').forEach(b=>{const t=tag(b.dataset.tag);b.ondblclick=()=>vDuration(t.minutes,m=>{t.minutes=m;if(state.selectedTag===t.id)state.settings.minutes=m;vPersist()},true);if(vTagEditing)b.onclick=()=>editTag(t)})};
function vTagMenu(){vSheet('编辑标签',`<div class="v-list"><button id="vEditTags">${vTagEditing?'完成编辑':'编辑标签'}</button><button data-sort="duration">${state.settings.tagSort==='duration'?'✓ ':''}按时间排序</button><button data-sort="manual">${!state.settings.tagSort||state.settings.tagSort==='manual'?'✓ ':''}手动排序<small>编辑标签时可调整顺序</small></button><button data-sort="name">${state.settings.tagSort==='name'?'✓ ':''}按标签排序</button><button id="vArchived">查看已归档标签</button></div>`);modal.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{state.settings.tagSort=b.dataset.sort;modal.close();vPersist()});$('#vEditTags').onclick=()=>{vTagEditing=!vTagEditing;modal.close();renderTags()};$('#vArchived').onclick=()=>{vSheet('已归档标签',`<div class="v-list">${state.tags.filter(t=>t.archived).map(t=>`<button data-archive="${esc(t.id)}">${esc(t.name)}<small>点击取消归档</small></button>`).join('')||'<p>没有已归档标签</p>'}</div>`);modal.querySelectorAll('[data-archive]').forEach(b=>b.onclick=()=>{tag(b.dataset.archive).archived=false;modal.close();vPersist()})}}
const vOldMenu=$('#menuBtn').onclick;$('#menuBtn').onclick=e=>page==='tags'?vTagMenu():vOldMenu(e);
const vOldEditTag=editTag;editTag=function(t){vOldEditTag(t);modal.classList.add('video-sheet');if(!t)return;$('#tagMinutes').readOnly=true;$('#tagMinutes').onclick=()=>{const name=$('#tagName').value,color=$('#tagColor').value;vDuration(t.minutes,m=>{t.name=name.trim()||t.name;t.color=color;t.minutes=m;if(state.selectedTag===t.id)state.settings.minutes=m;vPersist()},true)}};
/* Recording-style bottom sheet for manual records, including explicit end time. */
editRecord=function(record){
 const initial=record?.start||Date.now()-25*60e3,end=record?.end||Date.now();
 vSheet(record?'专注记录':'添加专注记录',`<form id="recordForm" class="v-record-form"><label>专注标签<select id="recordTag">${state.tags.map(t=>`<option value="${esc(t.id)}" ${t.id===(record?.tagId||state.selectedTag)?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label><label>开始时间<input id="recordStart" type="datetime-local" value="${inputTime(initial)}"></label><label>结束时间<input id="recordEnd" type="datetime-local" value="${inputTime(end)}"></label><label>持续时间<input id="recordMinutes" type="number" min="1" max="1440" value="${Math.max(1,Math.round((end-initial)/60000))}"><span>m</span></label></form>`,[['saveRecord',record?'保存':'添加','primary'],...(record?[['vDeleteRecord','删除记录','danger']]:[])]);
 function duration(){const n=(new Date($('#recordEnd').value)-new Date($('#recordStart').value))/60000;$('#recordMinutes').value=Number.isFinite(n)?Math.round(n):0}
 $('#recordStart').onchange=duration;$('#recordEnd').onchange=duration;$('#recordMinutes').oninput=()=>{const d=new Date($('#recordStart').value).getTime(),m=Number($('#recordMinutes').value);if(Number.isFinite(d)&&m>0&&m<=1440)$('#recordEnd').value=inputTime(d+m*60000)};
 $('#saveRecord').onclick=()=>{const startAt=new Date($('#recordStart').value).getTime(),endAt=new Date($('#recordEnd').value).getTime(),seconds=(endAt-startAt)/1000;if(!Number.isFinite(startAt)||!Number.isFinite(endAt)||seconds<60||seconds>86400||endAt>Date.now())return toast('请填写已经结束的有效时间段');const fields={tagId:$('#recordTag').value,start:startAt,end:endAt,seconds};if(record)Object.assign(record,fields);else state.sessions.push({...fields,id:makeId(),outcome:'finished',manual:true,fruitType:resolveFruit(state.settings.defaultFruit,makeId())});modal.close();vPersist()};
 $('#vDeleteRecord')?.addEventListener('click',()=>{vSheet('删除这条记录？','<p>对应的番茄也会移除。</p>',[['vConfirmDelete','删除','danger'],['closeDialog','取消']]);$('#vConfirmDelete').onclick=()=>{state.sessions=state.sessions.filter(r=>r!==record);modal.close();vPersist()}})
};
/* Detailed trend/fruit screens. Counts and graph values always use real records. */
const vDetails=document.createElement('div');vDetails.className='v-data';win.append(vDetails);
function vShift(n){const d=new Date(V.date);if(V.period==='D')d.setDate(d.getDate()+n);else if(V.period==='W')d.setDate(d.getDate()+7*n);else if(V.period==='M'){d.setDate(1);d.setMonth(d.getMonth()+n)}else d.setFullYear(d.getFullYear()+n);V.date=d.getTime();vRenderData()}
function vOpenData(kind='trend',tagId=null){V.tag=tagId;V.detail=true;go(kind);win.classList.add('v-data-mode');vRenderData()}
function vGraph(rows,small=false){
 const r=vRange(),count=V.period==='D'?24:V.period==='W'?7:V.period==='M'?new Date(r.end-1).getDate():12,bins=Array.from({length:count},()=>new Map());
 for(const item of rows.filter(x=>x.outcome==='finished')){const d=new Date(item.start),i=V.period==='D'?d.getHours():V.period==='W'?Math.floor((dayStart(item.start)-r.start)/864e5):V.period==='M'?d.getDate()-1:d.getMonth();if(bins[i])bins[i].set(item.tagId,(bins[i].get(item.tagId)||0)+item.seconds)}
 const max=Math.max(60,...bins.map(b=>[...b.values()].reduce((a,b)=>a+b,0)));
 return `<div class="v-chart ${small?'v-spark':''}">${bins.map((bin,i)=>{const total=[...bin.values()].reduce((a,b)=>a+b,0);return `<div class="v-chart-col"><div class="v-chart-bar" style="height:${total/max*90}%">${[...bin].map(([id,n])=>`<i style="background:${tag(id).color};height:${n/total*100}%"></i>`).join('')}</div><b>${small?'':V.period==='W'?['日','一','二','三','四','五','六'][(new Date(vRange().start).getDay()+i)%7]:i%(count>12?5:1)===0?i+(V.period==='D'?0:1):''}</b></div>`}).join('')}</div>`;
}
function vRenderData(){if(!V.detail||!['trend','pomodoro'].includes(page))return;vDetails.dataset.kind=page;vDetails.dataset.period=V.period;
 const rows=vRows(),done=rows.filter(r=>r.outcome==='finished'),sec=vSum(rows),fruit=done.filter(reward),r=vRange(),days=Math.max(1,Math.ceil((Math.min(Date.now(),r.end)-r.start)/864e5)),groups=state.tags.map(t=>({t,rows:rows.filter(x=>x.tagId===t.id)})).filter(g=>g.rows.length).sort((a,b)=>vSum(b.rows)-vSum(a.rows));
 const title=V.tag?tag(V.tag).name:page==='trend'?'专注趋势':'番茄详情';
 vDetails.innerHTML=`<header class="v-data-head"><button id="vDataBack" aria-label="返回数据统计">‹</button><div class="v-periods">${[['D','日'],['W','周'],['M','月'],['Y','年'],['A','全部']].map(([p,l])=>`<button data-v-period="${p}" class="${p===V.period?'active':''}">${l}</button>`).join('')}</div><button id="vDataAdd" aria-label="添加专注记录">+</button></header><div class="v-data-scroll"><h1>${esc(title)}</h1><div class="v-data-date"><button id="vPrev" aria-label="上一时段">‹</button><span>${V.period==='A'?'所有专注记录':V.period==='Y'?new Date(V.date).getFullYear():vDate(r.start)+(V.period==='D'?'':`—${vDate(r.end-1)}`)}</span><button id="vNext" aria-label="下一时段">›</button></div><div class="v-data-layout"><div class="v-data-primary"><section class="v-card v-pair"><div><span>${V.period==='A'?'总专注':'专注时间'}</span><b>${FP2_hm(sec)}</b></div><div><span>日均</span><b>${FP2_hm(sec/days)}</b></div></section><section class="v-card">${page==='trend'?vGraph(rows):`<div class="v-pair"><div><span>累计番茄数</span><b><img src="${FP5_HD_TOMATO}" alt="番茄">${fruit.length}</b></div><div><span>放弃</span><b>${rows.filter(x=>x.outcome==='abandoned').length}</b></div></div><div class="v-fruit-wall">${fruit.map(x=>`<button data-v-record="${esc(x.id)}" aria-label="${esc(tag(x.tagId).name)} ${Math.round(x.seconds/60)} 分钟"><img src="${vFruit(x)}" alt="番茄"></button>`).join('')||'<p>这个时段还没有番茄</p>'}</div>`}</section></div><aside class="v-group-list">${groups.map(({t,rows:g})=>`<button data-v-tag="${esc(t.id)}" class="v-card"><span><b>${esc(t.name)}</b><small>${FP2_hm(vSum(g))}</small></span>${page==='trend'?vGraph(g,true):`<img src="${vFruit(g[0])}" alt="果物"><b>${g.filter(reward).length}</b>`}<em>${sec?Math.round(vSum(g)/sec*100):0}% ›</em></button>`).join('')||'<p class="v-empty">尚无专注记录</p>'}</aside></div><section class="v-more"><h2>更多</h2><button id="vAnalysis">专注分析 <span>›</span></button><button id="vRoadmap">数据统计更新计划 <span>›</span></button></section></div>`;
 $('#vDataBack').onclick=()=>{if(V.tag){V.tag=null;vRenderData()}else{V.detail=false;go('trend')}};$('#vDataAdd').onclick=()=>editRecord();$('#vPrev').onclick=()=>vShift(-1);$('#vNext').onclick=()=>vShift(1);vDetails.querySelectorAll('[data-v-period]').forEach(b=>b.onclick=()=>{V.period=b.dataset.vPeriod;vRenderData()});vDetails.querySelectorAll('[data-v-record]').forEach(b=>b.onclick=()=>editRecord(state.sessions.find(r=>r.id===b.dataset.vRecord)));vDetails.querySelectorAll('[data-v-tag]').forEach(b=>b.onclick=()=>{V.tag=b.dataset.vTag;vRenderData()});$('#vAnalysis').onclick=()=>vSheet('专注分析',`<div class="v-list">${groups.map(({t,rows:g})=>`<div><b style="color:${t.color}">${esc(t.name)}</b><p>${FP2_hm(vSum(g))} · ${sec?Math.round(vSum(g)/sec*100):0}%</p></div>`).join('')||'<p>还没有记录</p>'}</div>`);$('#vRoadmap').onclick=()=>vInfo('数据统计路线图','统计来自你的实际专注记录。你可以按日、周、月、年查看趋势，按标签分析，并补录或编辑记录。');
}
const vOldStats=FP2_renderStats;FP2_renderStats=function(){vOldStats();$('#fp2ShowAll').onclick=()=>vOpenData('trend');let btn=$('#vAllFruit');if(!btn){btn=document.createElement('button');btn.id='vAllFruit';btn.className='stats-show-all';btn.textContent='显示全部';$('#fp2FruitDetail').after(btn)}btn.onclick=()=>vOpenData('pomodoro');FP2_stats.querySelector('.stats-back').onclick=()=>go('focus')};
/* Day and week timeline with a real selectable week strip. */
const vCalendar=document.createElement('div');vCalendar.className='v-calendar';$('.page-calendar').append(vCalendar);
function vRenderCalendar(){
 const wr=vWeekRange(V.calendar),days=V.calendarMode==='W'?7:1,begin=days===7?wr.start:dayStart(V.calendar);
 vCalendar.innerHTML=`<header class="v-calendar-head"><button id="vCalBack" aria-label="返回首页">⌃</button><button id="vCalDate">${vDate(V.calendar)}${dayStart(V.calendar)===dayStart(Date.now())?',今天':''}</button><button id="vCalMode">${days===1?'日':'周'}⌄</button><button id="vCalAdd" aria-label="添加专注记录">+</button></header><div class="v-week-strip"><button id="vWeekPrev" aria-label="上一周">‹</button>${Array.from({length:7},(_,i)=>{const date=wr.start+i*864e5;return `<button data-v-day="${date}" class="${dayStart(V.calendar)===date?'active':''}"><small>${['日','一','二','三','四','五','六'][new Date(date).getDay()]}</small><b>${new Date(date).getDate()}</b></button>`}).join('')}<button id="vWeekNext" aria-label="下一周">›</button></div><div class="v-time-scroll"><div class="v-time-grid" style="--days:${days}">${Array.from({length:24},(_,h)=>`<span class="v-hour" style="top:${h*64}px">${state.settings.hour24===false?(h%12||12)+(h<12?' AM':' PM'):String(h).padStart(2,'0')+':00'}</span>`).join('')}${state.sessions.flatMap(row=>Array.from({length:days},(_,i)=>{const ds=begin+i*864e5,de=ds+864e5;if(row.start>=de||row.end<=ds)return '';const top=(Math.max(ds,row.start)-ds)/36e5*64,height=Math.max(20,(Math.min(de,row.end)-Math.max(ds,row.start))/36e5*64);return `<button class="v-event" data-v-event="${esc(row.id)}" style="top:${top}px;height:${height}px;left:calc(44px + (100% - 44px)*${i/days});width:calc((100% - 44px)/${days} - 4px);background:${tag(row.tagId).color}"><b>${esc(tag(row.tagId).name)}</b><small>${Math.round(row.seconds/60)}m</small></button>`})).join('')}${dayStart(Date.now())>=begin&&dayStart(Date.now())<begin+days*864e5?`<div class="v-now" style="top:${(Date.now()-dayStart(Date.now()))/36e5*64}px">${new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})}</div>`:''}</div></div><button id="vCalToday">今天</button>`;
 $('#vCalBack').onclick=()=>go('focus');$('#vCalAdd').onclick=()=>editRecord();$('#vCalMode').onclick=()=>{V.calendarMode=days===1?'W':'D';vRenderCalendar()};vCalendar.querySelectorAll('[data-v-day]').forEach(b=>b.onclick=()=>{V.calendar=+b.dataset.vDay;vRenderCalendar()});for(const [id,n] of [['vWeekPrev',-7],['vWeekNext',7]])$('#'+id).onclick=()=>{V.calendar+=n*864e5;vRenderCalendar()};$('#vCalToday').onclick=()=>{V.calendar=Date.now();vRenderCalendar();vScrollNow()};$('#vCalDate').onclick=()=>{vSheet('选择日期',`<input id="vCalendarDate" type="date" value="${inputTime(V.calendar).slice(0,10)}">`);$('#closeDialog').onclick=()=>{const d=new Date($('#vCalendarDate').value+'T12:00:00').getTime();if(Number.isFinite(d))V.calendar=d;modal.close();vRenderCalendar()}};vCalendar.querySelectorAll('[data-v-event]').forEach(b=>b.onclick=()=>editRecord(state.sessions.find(r=>r.id===b.dataset.vEvent)));
}
function vScrollNow(){const root=$('.v-time-scroll');if(root)root.scrollTop=Math.max(0,(new Date().getHours()-2)*64)}
/* Settings mirror the recording's grouping; native-only capabilities stay explicit. */
const vSettingRow=(id,title,sub='',value='')=>`<button class="settings-row" id="${id}"><span><b>${title}</b>${sub?`<small>${sub}</small>`:''}</span><strong>${value}</strong><em>›</em></button>`;
const vSwitchRow=(id,title,on,sub='')=>`<button class="settings-row" id="${id}" role="switch" aria-checked="${!!on}"><span><b>${title}</b>${sub?`<small>${sub}</small>`:''}</span><i class="ios-switch ${on?'is-on':''}"></i></button>`;
const vGroup=(title,rows)=>`<section class="settings-section"><h2>${title}</h2><div class="settings-group">${rows}</div></section>`;
function vNative(title){vInfo(title,'这项功能需要 iOS 原生 App 的系统权限，当前私人网页版无法执行。网页中的计时、记录、标签及统计仍可正常使用。')}
function vRenderSettings(){
 const s=state.settings,root=FP2_settingsPage.querySelector('.settings-scroll');
 root.innerHTML=`<header class="settings-hero"><button class="settings-back" id="vSettingsBack" aria-label="返回首页">‹</button><h1>欢迎^^</h1><p>What I do today is important because I am exchanging a day of my life for it.</p></header><section class="plus-card"><b>FocusPomo</b><span>从泥土，到星辰</span></section>`+
 vGroup('使用指南',vSettingRow('vFaq','常见问题','遇到了问题？你可以在这里找到答案')+vSettingRow('vWish','新功能许愿','记录你想补充的功能'))+
 vGroup('App 屏蔽工具',vSettingRow('vBlock','App 黑名单','屏蔽选中的 App 或类别','需原生 App')+vSettingRow('vBlocked','已屏蔽的 App','','—'))+
 vGroup('果物','<div class="fruit-group"><div class="fruit-heading"><b>默认果物</b><small>每次专注固定一个果物；切换默认不会改写旧记录</small></div><div class="fruit-choice-grid" id="fp2FruitChoices"></div></div>')+
 vGroup('提醒',vSettingRow('vNotify','番茄钟提醒','完成番茄钟或休息结束时收到提醒',s.notifications?'开启':'关闭')+vSettingRow('vLive','实时活动','','需原生 App'))+
 vGroup('数据同步',vSettingRow('vCloud','云端同步','私人网页记录使用网站账号同步')+vSettingRow('vCalendarSync','同步到日历','导出专注记录为日历文件'))+
 vGroup('日期与时间',vSettingRow('vWeekStart','每周开始于','',s.weekStart===0?'周日':'周一')+vSwitchRow('vHour24','24 小时制',s.hour24!==false))+
 vGroup('番茄工作法',vSettingRow('vCycles','番茄钟循环','完成指定轮数后进入长休息',s.cycles+'')+vSettingRow('vShort','短休息','',s.short+'m')+vSettingRow('vLong','长休息','',s.long+'m'))+
 vGroup('外观','<div class="settings-row"><span><b>专注背景</b><small>手机、平板、电脑均可调节</small></span><input id="vBackground" type="color" aria-label="专注背景颜色" value="'+(s.focusBackground||'#fff0e2')+'"></div><div class="v-background-presets"><button data-bg="default">默认</button><button data-bg="#20232d">深夜</button><button data-bg="#fff0e2">暖杏</button><button data-bg="#e4ebe1">浅绿</button><button data-bg="#e5e7ef">雾蓝</button></div>')+
 vGroup('通用',vSettingRow('vLanguage','语言','','简体中文')+vSettingRow('vHealth','Apple 健康','','需原生 App'))+
 vGroup('番茄钟设置',vSettingRow('vFruitWindow','展示一周累计的小番茄','首页番茄显示范围',{week:'本周',lastweek:'上周',month:'本月',quarter:'近三个月'}[s.window])+vSwitchRow('vShowFailed','展示放弃的小番茄',s.showFailed)+vSettingRow('vFruitChoice','默认果物','',s.defaultFruit==='pear'?'香梨':s.defaultFruit==='random'?'随机':'番茄'))+
 vGroup('数据管理',vSettingRow('vBackup','导出备份','保存标签、专注记录和设置')+vSettingRow('vRestore','导入备份','从已导出的文件恢复'))+
 vGroup('更多',vSettingRow('vAbout','关于 FocusPomo','私人网页版')+vSettingRow('vVersion','版本信息','根据你提供的录屏持续还原'))+
 `<footer class="v-settings-footer"><img src="${FP5_HD_TOMATO}" alt="番茄"><p>Per aspera ad astra</p></footer>`;
 FP2_renderFruitChoices();
 $('#vBackground').onchange=e=>{s.focusBackground=e.target.value;vPersist()};root.querySelectorAll('[data-bg]').forEach(b=>b.onclick=()=>{s.focusBackground=b.dataset.bg==='default'?null:b.dataset.bg;vPersist()});
 $('#vSettingsBack').onclick=()=>go('focus');$('#vFaq').onclick=()=>vInfo('常见问题','点击计时数字可修改时长；0 为正计时并支持暂停。完成的专注会进入统计，补录记录不会额外奖励番茄。网页关闭时无法保证即时通知。');$('#vWish').onclick=()=>{vSheet('新功能许愿',`<textarea id="vWishText" placeholder="写下你想要的功能">${esc(s.wish||'')}</textarea>`,[['vSaveWish','保存','primary']]);$('#vSaveWish').onclick=()=>{s.wish=$('#vWishText').value.slice(0,2000);modal.close();vPersist()}};
 for(const id of ['vBlock','vBlocked','vLive','vHealth'])$('#'+id).onclick=()=>vNative($('#'+id+' b').textContent);
 $('#vNotify').onclick=()=>{vSheet('提醒',vSwitchRow('vNotifySwitch','番茄钟提醒',s.notifications,'网页打开期间提醒')+'<h3>提醒方式</h3>'+vSwitchRow('vSoundSwitch','声音提醒',s.sound)+vSwitchRow('vVibrateSwitch','震动提醒',s.vibration,'需浏览器支持'));$('#vNotifySwitch').onclick=()=>{s.notifications=!s.notifications;if(s.notifications)send('focus-notification-permission');vPersist();modal.close()};for(const [id,key] of [['vSoundSwitch','sound'],['vVibrateSwitch','vibration']])$('#'+id).onclick=()=>{s[key]=!s[key];$('#'+id).setAttribute('aria-checked',s[key]);$('#'+id+' i').classList.toggle('is-on',s[key]);vPersist()}};
 $('#vCloud').onclick=()=>vInfo('云端同步','记录通过当前网站的站长账号保存。保存失败时页面会提示；你也可以先导出备份。此网页使用网站云端存储，不连接原 App 的 iCloud。');
 $('#vCalendarSync').onclick=()=>{vSheet('同步到日历','<p>将已完成的专注记录导出为日历文件，可导入支持 .ics 的日历应用。</p>',[['vExportCalendar','导出日历','primary'],['closeDialog','取消']]);$('#vExportCalendar').onclick=()=>{const stamp=n=>new Date(n).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const escape=s=>String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/[,;]/g,c=>'\\'+c);const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Everflow//Focus//ZH',...state.sessions.filter(r=>r.outcome==='finished').flatMap(r=>['BEGIN:VEVENT','UID:'+escape(r.id)+'@evera.top','DTSTAMP:'+stamp(Date.now()),'DTSTART:'+stamp(r.start),'DTEND:'+stamp(r.end),'SUMMARY:'+escape(tag(r.tagId).name),'END:VEVENT']),'END:VCALENDAR'];const url=URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='FocusPomo.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);modal.close()}};
 $('#vWeekStart').onclick=()=>vChoice('每周开始于','weekStart',[[1,'周一'],[0,'周日']]);$('#vHour24').onclick=()=>{s.hour24=s.hour24===false;vPersist()};$('#vCycles').onclick=()=>vChoice('番茄钟循环','cycles',Array.from({length:12},(_,i)=>[i+1,String(i+1)]));$('#vShort').onclick=()=>vChoice('短休息','short',Array.from({length:60},(_,i)=>[i+1,String(i+1)]),' m');$('#vLong').onclick=()=>vChoice('长休息','long',Array.from({length:120},(_,i)=>[i+1,String(i+1)]),' m');$('#vFruitWindow').onclick=()=>vChoice('首页番茄范围','window',[['week','本周'],['lastweek','上周'],['month','本月'],['quarter','近三个月']]);$('#vShowFailed').onclick=()=>{s.showFailed=!s.showFailed;vPersist()};$('#vFruitChoice').onclick=()=>vChoice('默认果物','defaultFruit',[['tomato','番茄'],['pear','香梨'],['random','随机']]);$('#vLanguage').onclick=()=>vInfo('语言','当前私人网页版使用简体中文。标签名称保留你填写的原文。');$('#vAbout').onclick=()=>vInfo('关于 FocusPomo','这是你的网站私人番茄页面，沿用已找回的原版素材。原生 App 专属服务与系统权限不由网页提供。');$('#vVersion').onclick=()=>vInfo('版本信息','录屏对照版 · 2026-09<br>支持手机、平板、电脑，包含真实计时、标签、记录与统计。');$('#vBackup').onclick=()=>send('focus-export',{state});$('#vRestore').onclick=()=>{const input=document.createElement('input');input.type='file';input.accept='.json';input.onchange=async()=>{try{const file=input.files[0];if(!file)return;if(file.size>2e6)throw Error('文件过大');const incoming=validateState(JSON.parse(await file.text()));vSheet('导入备份',`<p>将替换当前数据，共 ${incoming.sessions.length} 条记录。建议先导出当前备份。</p>`,[['vConfirmRestore','替换并导入','danger'],['closeDialog','取消']]);$('#vConfirmRestore').onclick=()=>{if(state.active)return toast('请先结束当前专注');state=incoming;modal.close();vPersist()}}catch(e){toast(e.message)}};input.click()};
}
FP2_renderSettings=vRenderSettings;
const vBaseRender=render;render=function(){vBaseRender();if(V.detail)vRenderData();if(page==='calendar')vRenderCalendar()};
const vBaseGo=go;go=function(name){if(!['trend','pomodoro'].includes(name))V.detail=false;vBaseGo(name);win.classList.toggle('v-data-mode',V.detail);win.classList.toggle('v-calendar-mode',name==='calendar');if(name==='calendar'){vRenderCalendar();vScrollNow()}if(name==='pomodoro'&&!V.detail){V.detail=true;win.classList.add('v-data-mode');vRenderData()}if(name==='trend'&&V.detail)vRenderData()};
/* Rebind old listeners that captured earlier menu handlers. */
$('#settingsBtn').onclick=()=>go('settings');FP2_renderStats();render();
/* A fresh account still has interactive fruit; these bodies never become records. */
const vBaseSyncBodies=syncBodies;
let vFruitEntrancePending=true;
function vPlaceFruitAtClock(items){
 const box=canvas.getBoundingClientRect(),clock=$('#timerValue').getBoundingClientRect();
 if(!box.width||!clock.width)return;
 const cx=clock.left-box.left+clock.width/2,cy=clock.top-box.top;
 items.forEach((b,i)=>{b.x=Math.max(b.r,Math.min(width-b.r,cx+(hash(b.id)%1000/1000-.5)*clock.width));b.y=cy-b.r-(i%3)*9;b.vx=(hash(b.id)%101-50)/28;b.vy=0;b.a=(hash(b.id)%80-40)/40;b.bornAt=performance.now()});
}
syncBodies=function(){
 const old=new Map(bodies.map(b=>[b.id,b]));vBaseSyncBodies();
 if(!bodies.length)bodies=[100,72,56,64].map((side,i)=>{const id='welcome-'+i,type=state.settings.defaultFruit==='random'?(i%2?'pear':'tomato'):state.settings.defaultFruit||'tomato';const previous=old.get(id);if(previous){previous.fruitType=type;return previous}return{id,play:true,x:width/2,y:height/3,r:side/2,vx:0,vy:0,a:0,spin:0,failed:false,fruitType:type}});
 const fresh=vFruitEntrancePending?bodies:bodies.filter(b=>!old.has(b.id));if(fresh.length)vPlaceFruitAtClock(fresh);
 canvas.setAttribute('aria-label',visibleTomatoes().length?'专注收获的果物，可点击跳起和拖动':'初始互动果物，不计入专注记录');
};
requestAnimationFrame(()=>{resize();syncBodies();vFruitEntrancePending=false});
function vWeekRange(value){const d=new Date(dayStart(value)),startDay=state.settings.weekStart===0?0:1;d.setDate(d.getDate()-(d.getDay()-startDay+7)%7);const end=new Date(d);end.setDate(end.getDate()+7);return {start:d.getTime(),end:end.getTime()}}
FP2_weekRange=vWeekRange;
syncBodies();
const vControlRenderTimer=renderTimer;
renderTimer=function(){vControlRenderTimer();$('#pauseIcon').dataset.paused=String(!!state.active?.paused)};
renderTimer();

/* One authoritative control state; original image renditions on every device. */
function vApplyFocusAppearance(){
 const surface=$('.page-focus'),c=state.settings.focusBackground;
 if(c)surface.style.setProperty('background',c,'important');else surface.style.removeProperty('background');
 const dark=FP4_isDark(),ink=dark?'#f6f3ed':'#62564b';if(page==='focus')$('#menuBtn').style.filter=dark?'none':'brightness(0) opacity(.55)';else $('#menuBtn').style.filter='none';
 $('#timerValue').style.setProperty('color',ink,'important');$('#focusTask').style.setProperty('color',ink,'important');
 const a=state.active,controls=$('#focusControls');controls.style.setProperty('display',a?'flex':'none','important');controls.style.setProperty('z-index','30','important');
 for(const [id,visible] of [['pauseBtn',!!a&&a.mode==='focus'&&a.kind==='up'],['finishBtn',!!a]]){const b=$('#'+id);b.style.setProperty('display',visible?'flex':'none','important');b.style.setProperty('visibility','visible','important');b.style.setProperty('opacity','1','important');b.querySelector('small').style.setProperty('color',ink,'important')}
 FP4_applyTimerAssets();
 for(const el of controls.querySelectorAll('.original-control-icon img'))el.alt='';
}
const vAppearanceTimer=renderTimer;renderTimer=function(){vAppearanceTimer();vApplyFocusAppearance()};
window.addEventListener('resize',vApplyFocusAppearance);vApplyFocusAppearance();
function vExtractedChrome(){
 for(const [id,key] of [['vDataBack','prevData'],['vSettingsBack','prevData'],['vCalBack','prevData'],['vPrev','prevData'],['vNext','nextData'],['vWeekPrev','prevData'],['vWeekNext','nextData'],['vDataAdd','newSession'],['vCalAdd','newSession']]){const el=$('#'+id),src=FP4_ASSETS[key];if(el&&src){el.classList.add('v-native-nav');el.innerHTML=FP4_img(src,'v-extracted-icon','')}}
 for(const el of FP2_settingsPage.querySelectorAll('.settings-row em'))if(FP4_ASSETS.tagArrow)el.innerHTML=FP4_img(FP4_ASSETS.tagArrow,'v-extracted-chevron','');
}
const vAssetSettings=vRenderSettings;vRenderSettings=function(){vAssetSettings();vExtractedChrome()};FP2_renderSettings=vRenderSettings;
const vAssetData=vRenderData;vRenderData=function(){vAssetData();vExtractedChrome()};
const vAssetCalendar=vRenderCalendar;vRenderCalendar=function(){vAssetCalendar();vExtractedChrome()};
vExtractedChrome();
