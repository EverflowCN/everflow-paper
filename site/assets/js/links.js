(()=>{
  const CACHE_KEY='everflow-resource-hub-cache-v3';
  const CACHE_MAX_AGE=1000*60*60*24*7;
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  const fallbackSettings={
    title:'Everflow 做题本与资料',
    subtitle:'集中查找 408、数学二做题本与课程资料；每项可同时提供百度网盘、夸克网盘或站内入口。',
    footer_note:'Everflow · 彼时流年若水',
    announcement:'网盘链接仅展示后台已配置的地址；如遇失效，请通过“更新与勘误”反馈。',
    announcement_enabled:true,
    errata_url:'/archive/',
    updated_note:'做题本 · 双网盘 · 持续更新',
    background_variant:'paper'
  };
  const fallbackItems=[
    ['408 强化课程','两套 408 课程、打卡与进度记录','/408/','课程资料','27','课程','打开课程','',true,'available','408 数据结构 组成原理 操作系统 计算机网络 课程'],
    ['408 历年真题做题本','2009—2026 年真题墙、整套模式与解析','/zhenti/','408 做题本','27','真题','进入做题本','/graph/',true,'available','408 真题 做题本 真题墙 整套 解析'],
    ['数据结构强化做题本','强化题、进度记录与错题复习','/study/practice/ds-reinforcement/','408 做题本','27','DS','开始练习','',false,'available','数据结构 强化 做题本 练习 错题'],
    ['408 · 1800 题','按科目练习与本地、云端进度记录','/study/practice/1800/','408 做题本','27','1800','开始刷题','',false,'available','408 1800 做题本 选择题 练习'],
    ['智能组卷','真题与章节题按条件生成练习卷','/relax/','408 做题本','通用','','开始组卷','',false,'available','408 组卷 做题本 练习卷'],
    ['李林 880 · 数学二','章节做题本、24 套模拟与进度记录','/study/practice/math-880/','数学做题本','27','880','章节练习','/study/practice/math-880/simulations.html',true,'available','数学二 李林 880 做题本 模拟卷 章节练习'],
    ['408 算法可视化','四科核心算法与系统过程逐步演示','/visual/','学习工具','27','NEW','按科目学习','/visual/sandbox/',true,'available','408 算法 可视化 数据结构 操作系统 网络 组成原理'],
    ['408 整体图谱','把真题、题库与知识点关系放到一张图里','/graph/','学习工具','通用','GRAPH','打开图谱','',false,'available','408 知识图谱 真题 关系'],
    ['学习热力图','查看每日学习记录与连续打卡情况','/study/heatmap/','学习工具','通用','','查看进度','',false,'available','学习 热力图 打卡 进度']
  ].map((row,index)=>({
    id:`fallback-${index}`,
    title:row[0],subtitle:row[1],url:row[2],category:row[3],cohort:row[4],badge:row[5],
    primary_label:row[6],secondary_url:row[7],featured:row[8],status:row[9],keywords:row[10],
    secondary_label:row[7]?(row[0].includes('880')?'24 套模拟':row[0].includes('可视化')?'打开沙盒':'知识图谱'):'',
    primary_provider:row[2].startsWith('/')?'site':'auto',secondary_provider:row[7]?.startsWith('/')?'site':'auto',
    resource_kind:row[3].includes('做题本')?'workbook':row[3].includes('课程')?'course':'tool',
    enabled:true,sort_order:index*10
  }));

  const state={settings:fallbackSettings,items:fallbackItems,query:'',cohort:'all',category:'all',source:'local'};
  const statusLabels={available:'可用',updating:'更新中',coming:'即将开放'};
  const categoryOrder=['408 做题本','数学做题本','课程资料','学习工具','其他'];
  const providerLabels={baidu:'百度网盘',quark:'夸克网盘',site:'站内',external:'外部链接',auto:'链接'};
  const kindLabels={workbook:'做题本',course:'课程',material:'资料',tool:'学习工具',other:'其他'};

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
  function inferProvider(value,configured='auto'){
    if(['baidu','quark','site','external'].includes(configured))return configured;
    const raw=String(value||'').trim().toLowerCase();
    if(raw.startsWith('/')&&!raw.startsWith('//'))return'site';
    if(raw.includes('pan.baidu.com'))return'baidu';
    if(raw.includes('pan.quark.cn')||raw.includes('quark.cn'))return'quark';
    return raw?'external':'auto';
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
      primary_provider:inferProvider(item.url,item.primary_provider),
      secondary_provider:inferProvider(item.secondary_url,item.secondary_provider),
      resource_kind:['workbook','course','material','tool','other'].includes(item.resource_kind)?item.resource_kind:(String(item.category||'').includes('做题本')?'workbook':String(item.category||'').includes('课程')?'course':'tool'),
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
    const haystack=`${item.title} ${item.subtitle} ${item.category} ${item.cohort} ${item.badge||''} ${item.keywords} ${providerLabels[item.primary_provider]||''} ${providerLabels[item.secondary_provider]||''} ${kindLabels[item.resource_kind]||''}`.toLowerCase();
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
    const button=(url,provider,label,primary=false)=>{const disabled=status==='coming'||safeUrl(url)==='#',name=providerLabels[provider]||providerLabels.auto;return `<a class="resource-card-button provider-${esc(provider)}${primary?' primary':''}${disabled?' disabled':''}" ${disabled?'href="#" aria-disabled="true"':linkAttrs(url)}><span class="resource-provider">${esc(name)}</span><span>${esc(label||`打开${name}`)}</span></a>`};
    const primary=button(item.url,item.primary_provider,item.primary_label,true);
    const secondary=item.secondary_url?button(item.secondary_url,item.secondary_provider,item.secondary_label):'';
    return `<article class="resource-v2-card${item.featured?' featured':''}">
      <div class="resource-card-top">
        <div class="resource-card-meta"><span>${esc(item.category)}</span><span>·</span><span>${esc(kindLabels[item.resource_kind]||kindLabels.other)}</span><span>·</span><span>${esc(labelCohort(item.cohort))}</span>${item.badge?`<em class="resource-card-badge">${esc(item.badge)}</em>`:''}</div>
        <span class="resource-card-status ${esc(status)}">${esc(statusLabels[status]||statusLabels.available)}</span>
      </div>
      <h2>${esc(item.title)}</h2>
      <p>${esc(item.subtitle)}</p>
      <div class="resource-card-actions">
        ${primary}
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
      const itemFields='id,title,subtitle,url,icon,group_name,sort_order,enabled,badge,accent,category,cohort,secondary_url,primary_label,secondary_label,primary_provider,secondary_provider,resource_kind,status,featured,keywords';
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
