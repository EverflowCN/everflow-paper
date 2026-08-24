(()=>{
  const CACHE_KEY='everflow-resource-hub-cache-v2';
  const CACHE_MAX_AGE=1000*60*60*24*7;
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  const fallbackSettings={
    title:'Everflow 资料中心',
    subtitle:'408、数学二与站内学习工具，按届别和科目快速查找。',
    footer_note:'Everflow · 彼时流年若水',
    announcement:'资料与功能持续整理中；失效入口可通过“更新与勘误”反馈。',
    announcement_enabled:true,
    errata_url:'/archive/',
    updated_note:'面向 27 考研持续更新',
    background_variant:'paper'
  };
  const fallbackItems=[
    ['408 强化','跟随课程完成四科强化、打卡与进度记录','/408/','408','27','强化','开始学习','',true,'available','408 数据结构 组成原理 操作系统 计算机网络'],
    ['408 整套真题','2009—2026 年整套模式、真题墙与解析','/zhenti/','408','27','真题','进入题库','/graph/',true,'available','408 真题 真题墙 整套 解析'],
    ['408 算法可视化','四科核心算法与系统过程逐步演示','/visual/','408','27','NEW','按科目学习','/visual/sandbox/',true,'available','408 算法 可视化 数据结构 操作系统 网络 组成原理'],
    ['数据结构强化','强化题、进度记录与错题复习','/study/practice/ds-reinforcement/','408','27','DS','开始练习','',false,'available','数据结构 强化 练习 错题'],
    ['408 · 1800 题','按科目练习与本地、云端进度记录','/study/practice/1800/','408','27','1800','开始刷题','',false,'available','408 1800 选择题 练习'],
    ['李林 880 · 数学二','章节练习、24 套模拟与下载入口','/study/practice/math-880/','数学二','27','880','章节练习','/study/practice/math-880/simulations.html',true,'available','数学二 李林 880 模拟卷 章节练习'],
    ['408 整体图谱','把真题、题库与知识点关系放到一张图里','/graph/','工具','通用','GRAPH','打开图谱','',false,'available','408 知识图谱 真题 关系'],
    ['智能组卷','按条件生成练习卷并保存作答进度','/relax/','工具','通用','','开始组卷','',false,'available','408 组卷 练习卷'],
    ['学习热力图','查看每日学习记录与连续打卡情况','/study/heatmap/','工具','通用','','查看进度','',false,'available','学习 热力图 打卡 进度'],
    ['通知通告','查看网站更新、维护与资料勘误','/archive/','站点','通用','','查看通知','',false,'available','通知 公告 更新 勘误'],
    ['会员与兑换码','查看会员权益、活动与兑换入口','/membership/','站点','通用','','查看会员','',false,'available','会员 Pro 兑换码']
  ].map((row,index)=>({
    id:`fallback-${index}`,
    title:row[0],subtitle:row[1],url:row[2],category:row[3],cohort:row[4],badge:row[5],
    primary_label:row[6],secondary_url:row[7],featured:row[8],status:row[9],keywords:row[10],
    secondary_label:row[7]?(row[0].includes('880')?'24 套模拟':row[0].includes('可视化')?'打开沙盒':'知识图谱'):'',
    enabled:true,sort_order:index*10
  }));

  const state={settings:fallbackSettings,items:fallbackItems,query:'',cohort:'all',category:'all',source:'local'};
  const statusLabels={available:'可用',updating:'更新中',coming:'即将开放'};
  const categoryOrder=['408','数学二','工具','站点'];

  function safeUrl(value){
    const raw=String(value||'').trim();
    if(raw.startsWith('/')&&!raw.startsWith('//'))return raw;
    try{
      const url=new URL(raw,location.origin);
      return ['http:','https:','mailto:','tel:'].includes(url.protocol)?url.href:'#';
    }catch{return '#'}
  }
  function linkAttrs(value){
    const href=safeUrl(value);
    if(href==='#')return 'href="#" aria-disabled="true"';
    try{
      const url=new URL(href,location.origin);
      return url.origin!==location.origin?`href="${esc(href)}" target="_blank" rel="noopener"`:`href="${esc(href)}"`;
    }catch{return `href="${esc(href)}"`}
  }
  function normalizeItem(item,index){
    const group=String(item.group_name||'');
    const inferredCategory=group.includes('数学')?'数学二':group.includes('工具')?'工具':group.includes('408')?'408':'站点';
    return {
      ...item,
      id:item.id||`resource-${index}`,
      title:String(item.title||'未命名资料'),
      subtitle:String(item.subtitle||''),
      category:String(item.category||inferredCategory),
      cohort:String(item.cohort||'通用'),
      status:['available','updating','coming'].includes(item.status)?item.status:'available',
      primary_label:String(item.primary_label||'立即查看'),
      secondary_label:String(item.secondary_label||''),
      secondary_url:String(item.secondary_url||''),
      keywords:String(item.keywords||''),
      enabled:item.enabled!==false,
      featured:item.featured===true,
      sort_order:Number(item.sort_order)||100
    };
  }
  function readCache(){
    try{
      const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if(!cached||!Array.isArray(cached.items)||Date.now()-Number(cached.savedAt)>CACHE_MAX_AGE)return null;
      return {settings:{...fallbackSettings,...cached.settings},items:cached.items.map(normalizeItem)};
    }catch{return null}
  }
  function writeCache(payload){
    try{localStorage.setItem(CACHE_KEY,JSON.stringify({...payload,savedAt:Date.now()}))}catch{}
  }
  function matches(item){
    if(state.cohort!=='all'&&item.cohort!==state.cohort)return false;
    if(state.category!=='all'&&item.category!==state.category)return false;
    if(!state.query)return true;
    const haystack=`${item.title} ${item.subtitle} ${item.category} ${item.cohort} ${item.badge||''} ${item.keywords}`.toLowerCase();
    return haystack.includes(state.query.toLowerCase());
  }
  function countBy(key,value){return state.items.filter(item=>item.enabled&&(value==='all'||item[key]===value)).length}
  function labelCohort(value){
    if(value==='all')return '全部';
    if(value==='通用')return '长期可用';
    return /^\d+$/.test(value)?`${value} 届`:value;
  }
  function filterButton(kind,value,label,count){
    const active=state[kind]===value;
    return `<button type="button" class="resource-filter ${kind}${active?' active':''}" data-resource-filter="${kind}" data-value="${esc(value)}" aria-pressed="${active}">${esc(label)} <b>${count}</b></button>`;
  }
  function renderFilters(){
    const cohorts=['all',...new Set(state.items.filter(item=>item.enabled).map(item=>item.cohort))]
      .sort((a,b)=>a==='all'?-1:b==='all'?1:a==='通用'?1:b==='通用'?-1:b.localeCompare(a,'zh-CN'));
    const categories=['all',...new Set(state.items.filter(item=>item.enabled).map(item=>item.category))]
      .sort((a,b)=>a==='all'?-1:b==='all'?1:(categoryOrder.indexOf(a)<0?99:categoryOrder.indexOf(a))-(categoryOrder.indexOf(b)<0?99:categoryOrder.indexOf(b)));
    $('[data-resource-cohorts]').innerHTML=cohorts.map(value=>filterButton('cohort',value,labelCohort(value),countBy('cohort',value))).join('');
    $('[data-resource-categories]').innerHTML=categories.map(value=>filterButton('category',value,value==='all'?'全部分类':value,countBy('category',value))).join('');
  }
  function renderSettings(){
    const settings={...fallbackSettings,...state.settings};
    $('[data-resource-title]').textContent=settings.title;
    $('[data-resource-subtitle]').textContent=settings.subtitle;
    $('[data-resource-updated]').textContent=settings.updated_note;
    $('[data-resource-footer]').textContent=settings.footer_note;
    const errata=$('[data-resource-errata]');
    errata.href=safeUrl(settings.errata_url);
    const announcement=$('[data-resource-announcement]');
    announcement.hidden=!settings.announcement_enabled||!settings.announcement;
    announcement.querySelector('p').textContent=settings.announcement||'';
    document.body.dataset.resourceTheme=settings.background_variant||'paper';
    document.title=`${settings.title} · Everflow`;
  }
  function renderCard(item){
    const status=item.status||'available';
    const disabled=status==='coming'||safeUrl(item.url)==='#';
    const secondary=item.secondary_url?`<a class="resource-card-button" ${linkAttrs(item.secondary_url)}>${esc(item.secondary_label||'备用入口')}</a>`:'';
    return `<article class="resource-v2-card${item.featured?' featured':''}">
      <div class="resource-card-top">
        <div class="resource-card-meta"><span>${esc(item.category)}</span><span>·</span><span>${esc(labelCohort(item.cohort))}</span>${item.badge?`<em class="resource-card-badge">${esc(item.badge)}</em>`:''}</div>
        <span class="resource-card-status ${esc(status)}">${esc(statusLabels[status]||statusLabels.available)}</span>
      </div>
      <h2>${esc(item.title)}</h2>
      <p>${esc(item.subtitle)}</p>
      <div class="resource-card-actions">
        <a class="resource-card-button primary${disabled?' disabled':''}" ${disabled?'href="#" aria-disabled="true"':linkAttrs(item.url)}>${esc(item.primary_label)}</a>
        ${secondary}
      </div>
    </article>`;
  }
  function render(){
    renderSettings();
    renderFilters();
    const rows=state.items.filter(item=>item.enabled&&matches(item)).sort((a,b)=>Number(b.featured)-Number(a.featured)||a.sort_order-b.sort_order||a.title.localeCompare(b.title,'zh-CN'));
    $('[data-resource-list]').innerHTML=rows.map(renderCard).join('');
    $('[data-resource-count]').textContent=String(rows.length);
    $('[data-resource-empty]').hidden=rows.length>0;
    $('[data-resource-state]').textContent=state.source==='cloud'?'已从云端更新':state.source==='cache'?'已先显示本地缓存，正在后台更新':'已先显示内置资料，正在后台更新';
    $('[data-resource-root]').setAttribute('aria-busy','false');
  }

  async function fetchJson(path,signal){
    const config=window.EVERFLOW_CLOUD||{};
    if(!config.url||!config.publishableKey)throw new Error('cloud_config_missing');
    const response=await fetch(`${config.url}/rest/v1/${path}`,{
      headers:{apikey:config.publishableKey,Accept:'application/json'},signal
    });
    if(!response.ok)throw new Error(`resource_fetch_${response.status}`);
    return response.json();
  }
  async function refreshFromCloud(){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),5000);
    try{
      const settingsFields='title,subtitle,avatar_url,footer_note,announcement,announcement_enabled,background_variant,errata_url,updated_note';
      const itemFields='id,title,subtitle,url,icon,group_name,sort_order,enabled,badge,accent,category,cohort,secondary_url,primary_label,secondary_label,status,featured,keywords';
      const [settingsRows,itemRows]=await Promise.all([
        fetchJson(`resource_hub_settings?select=${settingsFields}&id=eq.default&limit=1`,controller.signal),
        fetchJson(`resource_hub_items?select=${itemFields}&enabled=eq.true&order=featured.desc,sort_order.asc,updated_at.desc`,controller.signal)
      ]);
      if(!Array.isArray(itemRows)||!itemRows.length)throw new Error('resource_hub_empty');
      const payload={settings:{...fallbackSettings,...settingsRows[0]},items:itemRows.map(normalizeItem)};
      writeCache(payload);
      state.settings=payload.settings;
      state.items=payload.items;
      state.source='cloud';
      render();
    }catch(error){
      $('[data-resource-state]').textContent=state.source==='cache'?'云端更新稍慢，当前为最近缓存':'云端更新稍慢，当前资料仍可正常使用';
      if(error?.name!=='AbortError')console.warn('Everflow resource hub refresh failed',error);
    }finally{clearTimeout(timeout)}
  }

  const cached=readCache();
  if(cached){state.settings=cached.settings;state.items=cached.items;state.source='cache'}
  render();
  refreshFromCloud();

  $('[data-resource-root]').addEventListener('click',event=>{
    const filter=event.target.closest('[data-resource-filter]');
    if(filter){state[filter.dataset.resourceFilter]=filter.dataset.value;render();return}
    if(event.target.closest('[data-resource-reset]')){
      state.query='';state.cohort='all';state.category='all';
      $('[data-resource-search]').value='';render();
    }
  });
  $('[data-resource-search]').addEventListener('input',event=>{state.query=event.currentTarget.value.trim();render()});
  document.addEventListener('keydown',event=>{
    if(event.key==='/'&&!event.metaKey&&!event.ctrlKey&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'')){
      event.preventDefault();$('[data-resource-search]').focus();
    }
  });
})();
