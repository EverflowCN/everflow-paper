(()=>{
  const CACHE_KEY='everflow-resource-hub-cache-v4';
  const CACHE_MAX_AGE=1000*60*60*24*7;
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  const fallbackSettings={
    title:'Everflow 资料中心',
    subtitle:'做题本、讲义与其他资料链接统一收录；所有按钮与链接均由后台维护。',
    footer_note:'Everflow · 彼时流年若水',
    announcement:'资源内容仅展示后台已配置的外部链接；如遇失效，可通过更新与勘误反馈。',
    announcement_enabled:true,
    errata_url:'/archive/',
    updated_note:'资料链接 · 后台维护 · 持续更新',
    background_variant:'paper'
  };

  const state={settings:fallbackSettings,items:[],query:'',cohort:'all',category:'all',source:'local'};
  const statusLabels={available:'可用',updating:'更新中',coming:'待更新'};
  const categoryOrder=['408','数学二','英语','政治','公共课','做题本','讲义','课程资料','其他'];

  function safeUrl(value){
    const raw=String(value||'').trim();
    if(!raw)return '#';
    try{
      const url=new URL(raw,location.origin);
      return ['http:','https:'].includes(url.protocol)?url.href:'#';
    }catch{return '#'}
  }
  function linkAttrs(value){
    const href=safeUrl(value);
    if(href==='#')return 'href="#" aria-disabled="true"';
    return `href="${esc(href)}" target="_blank" rel="noopener noreferrer"`;
  }
  function inferProvider(value,configured='auto'){
    if(['baidu','quark','aliyun','github','external'].includes(configured))return configured;
    const raw=String(value||'').toLowerCase();
    if(raw.includes('pan.baidu.com'))return'baidu';
    if(raw.includes('pan.quark.cn')||raw.includes('quark.cn'))return'quark';
    if(raw.includes('alipan.com')||raw.includes('aliyundrive.com'))return'aliyun';
    if(raw.includes('github.com'))return'github';
    return'external';
  }
  function normalizeLinks(value){
    let rows=value;
    if(typeof rows==='string'){
      try{rows=JSON.parse(rows)}catch{rows=[]}
    }
    if(!Array.isArray(rows))return[];
    return rows.map((link,index)=>({
      label:String(link?.label||link?.name||'打开链接').trim().slice(0,40),
      url:String(link?.url||'').trim(),
      provider:inferProvider(link?.url,link?.provider),
      sort_order:Number(link?.sort_order??index)||0
    })).filter(link=>link.label&&safeUrl(link.url)!=='#').sort((a,b)=>a.sort_order-b.sort_order);
  }
  function normalizeTags(value){
    const rows=Array.isArray(value)?value:String(value||'').split(/[,，]/);
    return [...new Set(rows.map(tag=>String(tag||'').trim()).filter(Boolean))].slice(0,12);
  }
  function normalizeItem(item,index){
    return {
      ...item,
      id:item.id||`resource-${index}`,
      title:String(item.title||'未命名资料'),
      subtitle:String(item.subtitle||''),
      category:String(item.category||'其他'),
      cohort:String(item.cohort||'通用'),
      badge:String(item.badge||''),
      status:['available','updating','coming'].includes(item.status)?item.status:'available',
      keywords:String(item.keywords||''),
      tags:normalizeTags(item.tags),
      links:normalizeLinks(item.links),
      enabled:item.enabled!==false,
      featured:item.featured===true,
      sort_order:Number(item.sort_order)||100,
      updated_at:item.updated_at||''
    };
  }
  function visibleItem(item){return item.enabled&&(item.links.length>0||item.status==='coming')}
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
    const linkText=item.links.map(link=>`${link.label} ${link.provider} ${link.url}`).join(' ');
    const haystack=`${item.title} ${item.subtitle} ${item.category} ${item.cohort} ${item.badge} ${item.keywords} ${item.tags.join(' ')} ${linkText}`.toLowerCase();
    return haystack.includes(state.query.toLowerCase());
  }
  function countBy(key,value){return state.items.filter(item=>visibleItem(item)&&(value==='all'||item[key]===value)).length}
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
    const available=state.items.filter(visibleItem);
    const cohorts=['all',...new Set(available.map(item=>item.cohort))]
      .sort((a,b)=>a==='all'?-1:b==='all'?1:a==='通用'?1:b==='通用'?-1:b.localeCompare(a,'zh-CN'));
    const categories=['all',...new Set(available.map(item=>item.category))]
      .sort((a,b)=>{
        if(a==='all')return-1;if(b==='all')return 1;
        const ai=categoryOrder.indexOf(a),bi=categoryOrder.indexOf(b);
        if(ai<0&&bi<0)return a.localeCompare(b,'zh-CN');
        if(ai<0)return 1;if(bi<0)return-1;return ai-bi;
      });
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
    errata.href=safeUrl(settings.errata_url)==='#'?'/archive/':safeUrl(settings.errata_url);
    const announcement=$('[data-resource-announcement]');
    announcement.hidden=!settings.announcement_enabled||!settings.announcement;
    announcement.querySelector('p').textContent=settings.announcement||'';
    document.body.dataset.resourceTheme=settings.background_variant||'paper';
    document.title=`${settings.title} · Everflow`;
  }
  function renderLink(link,status){
    const disabled=status==='coming'||safeUrl(link.url)==='#';
    return `<a class="resource-card-button provider-${esc(link.provider)}${disabled?' disabled':''}" ${disabled?'href="#" aria-disabled="true"':linkAttrs(link.url)}><span>${esc(link.label)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg></a>`;
  }
  function renderCard(item){
    const status=item.status||'available';
    const tagHtml=item.tags.slice(0,6).map(tag=>`<span>${esc(tag)}</span>`).join('');
    return `<article class="resource-v2-card${item.featured?' featured':''}">
      <div class="resource-card-top">
        <div class="resource-card-meta"><span>${esc(item.category)}</span><span>·</span><span>${esc(labelCohort(item.cohort))}</span>${item.badge?`<em class="resource-card-badge">${esc(item.badge)}</em>`:''}</div>
        <span class="resource-card-status ${esc(status)}">${esc(statusLabels[status]||statusLabels.available)}</span>
      </div>
      <h2>${esc(item.title)}</h2>
      ${item.subtitle?`<p>${esc(item.subtitle)}</p>`:''}
      ${tagHtml?`<div class="resource-card-tags">${tagHtml}</div>`:''}
      <div class="resource-card-actions">${item.links.map(link=>renderLink(link,status)).join('')}</div>
    </article>`;
  }
  function render(){
    renderSettings();
    renderFilters();
    const rows=state.items.filter(item=>visibleItem(item)&&matches(item)).sort((a,b)=>Number(b.featured)-Number(a.featured)||a.sort_order-b.sort_order||a.title.localeCompare(b.title,'zh-CN'));
    $('[data-resource-list]').innerHTML=rows.map(renderCard).join('');
    $('[data-resource-count]').textContent=String(rows.length);
    $('[data-resource-empty]').hidden=rows.length>0;
    const stateText=state.source==='cloud'?(rows.length?'已读取最新资料':'暂无已发布资料'):state.source==='cache'?'已显示最近缓存，正在后台更新':state.source==='error'?'资料读取失败，请稍后刷新':'正在读取资料…';
    $('[data-resource-state]').textContent=stateText;
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
      const itemFields='id,title,subtitle,sort_order,enabled,badge,accent,category,cohort,status,featured,keywords,links,tags,updated_at';
      const [settingsRows,itemRows]=await Promise.all([
        fetchJson(`resource_hub_settings?select=${settingsFields}&id=eq.default&limit=1`,controller.signal),
        fetchJson(`resource_hub_items?select=${itemFields}&enabled=eq.true&order=featured.desc,sort_order.asc,updated_at.desc`,controller.signal)
      ]);
      if(!Array.isArray(itemRows))throw new Error('resource_hub_invalid');
      const payload={settings:{...fallbackSettings,...settingsRows[0]},items:itemRows.map(normalizeItem)};
      writeCache(payload);
      state.settings=payload.settings;
      state.items=payload.items;
      state.source='cloud';
      render();
    }catch(error){
      if(state.source==='cache')$('[data-resource-state]').textContent='云端更新稍慢，当前为最近缓存';
      else{state.source='error';render()}
      if(error?.name!=='AbortError')console.warn('Everflow resource hub refresh failed',error);
    }finally{clearTimeout(timeout)}
  }

  const cached=readCache();
  if(cached){state.settings=cached.settings;state.items=cached.items;state.source='cache'}
  if(cached)render();
  refreshFromCloud();

  $('[data-resource-search]')?.addEventListener('input',event=>{state.query=event.currentTarget.value.trim();render()});
  document.addEventListener('click',event=>{
    const filter=event.target.closest('[data-resource-filter]');
    if(filter){state[filter.dataset.resourceFilter]=filter.dataset.value;render();return}
    if(event.target.closest('[data-resource-reset]')){
      state.query='';state.cohort='all';state.category='all';
      const input=$('[data-resource-search]');if(input)input.value='';render();
    }
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='/'&&!/input|textarea|select/i.test(document.activeElement?.tagName||'')){
      event.preventDefault();$('[data-resource-search]')?.focus();
    }
  });
})();
