(()=>{
  const html=document.documentElement;
  const read=key=>{try{return localStorage.getItem(key)}catch{return null}};
  const write=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
  const path=location.pathname.replace(/\/{2,}/g,'/');
  const dark=read('everflow-theme')==='dark';
  html.classList.toggle('dark',dark);
  html.dataset.everaBoot='stable2';
  html.style.colorScheme=dark?'dark':'light';

  const icons={
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    moon:'<path d="M21 12.8A8 8 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    close:'<path d="M18 6 6 18M6 6l12 12"/>'
  };
  const icon=name=>`<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[name]||icons.moon}</svg>`;
  const items=[
    {href:'/',label:'首页',match:p=>p==='/'},
    {href:'/study/',label:'学习',match:p=>p.startsWith('/study/')||p.startsWith('/408/')},
    {href:'/visual/',label:'算法可视化',match:p=>p.startsWith('/visual/')},
    {href:'/zhenti/',label:'题库',match:p=>p.startsWith('/zhenti/')},
    {href:'/relax/',label:'组卷',match:p=>p.startsWith('/relax/')},
    {href:'/graph/',label:'整体图谱',match:p=>p.startsWith('/graph/')},
    {href:'/links/',label:'资源',match:p=>p.startsWith('/links/')},
    {href:'/archive/',label:'通知通告',match:p=>p.startsWith('/archive/')||p.startsWith('/notice/')||p.startsWith('/post/')},
    {href:'/account/',label:'账户',match:p=>p.startsWith('/account/')}
  ];

  function membershipEntry(mobile){
    const wrap=document.createElement(mobile?'div':'span');
    wrap.className='membership-nav-entry'+(read('everflow-membership-nav-hidden-v1')==='1'?' is-hidden':'');
    const link=document.createElement('a');link.href='/membership/';link.textContent='购买会员';
    if(path.startsWith('/membership/'))link.classList.add('active');
    const close=document.createElement('button');close.type='button';close.className='membership-nav-close ui-icon-only';close.dataset.everaNavBound='1';close.innerHTML=icon('close');close.setAttribute('aria-label','关闭购买会员入口');close.title='关闭';
    close.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();write('everflow-membership-nav-hidden-v1','1');document.querySelectorAll('.membership-nav-entry').forEach(node=>node.classList.add('is-hidden'))});
    wrap.append(link,close);return wrap;
  }
  function buildNav(container,mobile=false){
    if(!container||container.dataset.everaBootNav==='1')return;
    const frag=document.createDocumentFragment();
    for(const item of items){
      const link=document.createElement('a');link.href=item.href;link.textContent=item.label;
      if(item.match(path))link.classList.add('active');
      if(item.href==='/account/')frag.appendChild(membershipEntry(mobile));
      frag.appendChild(link);
    }
    const theme=document.createElement('button');theme.type='button';theme.className='icon-btn ui-icon-only';theme.dataset.theme='';theme.innerHTML=icon(dark?'sun':'moon');theme.setAttribute('aria-label',dark?'切换浅色主题':'切换深色主题');
    frag.appendChild(theme);container.replaceChildren(frag);container.dataset.everaBootNav='1';
  }

  function buildQuestionBank(){
    if(path!=='/zhenti/'&&path!=='/zhenti/index.html')return;
    const body=document.body,main=document.querySelector('main[data-wall-root]'),bar=document.querySelector('.wall-subject-bar');
    if(!body||!main||!bar)return;
    const source=read('everflow-408-bank-source-v1')==='relax1000'?'relax1000':'zhenti';
    body.dataset.questionBank=source;body.classList.toggle('relax1000-active',source==='relax1000');
    if(!document.querySelector('[data-bank-source-shell]')){
      const shell=document.createElement('section');shell.className='bank-source-shell';shell.dataset.bankSourceShell='';shell.setAttribute('aria-label','题库切换');
      shell.innerHTML=`<div class="bank-source-inner"><span class="bank-source-label">题库</span><div class="bank-source-segmented" role="tablist"><button type="button" data-bank-source="zhenti" class="${source==='zhenti'?'active':''}">408 真题</button><button type="button" data-bank-source="relax1000" class="${source==='relax1000'?'active':''}">Relax1000</button></div><span class="bank-source-note">${source==='relax1000'?'章节题库 · 题库墙 / 独立阅读器 / 速刷卡片':'历年真题 · 真题墙 / 整套真题 / 速刷卡片'}</span></div>`;
      shell.querySelectorAll('[data-bank-source]').forEach(button=>{button.dataset.bankSourceBound='1';button.addEventListener('click',()=>{const next=button.dataset.bankSource;if(next===source)return;write('everflow-408-bank-source-v1',next);location.reload()})});
      main.before(shell);
    }
    if(source==='relax1000'||bar.classList.contains('has-srs-groups'))return;
    const whole=bar.querySelector('[data-main-subject="all"]');
    if(!whole||bar.querySelectorAll('[data-main-subject]:not([data-main-subject="all"])').length<4)return;
    const divider=bar.querySelector('.subject-divider');
    let srs=bar.querySelector('[data-srs-tab]');if(!srs){srs=document.createElement('button');srs.type='button';srs.className='subject-tab srs-tab';srs.dataset.srsTab='';srs.textContent='速刷卡片'}
    let favorites=bar.querySelector('[data-favorites-tab]');if(!favorites){favorites=document.createElement('button');favorites.type='button';favorites.className='subject-tab favorites-tab';favorites.dataset.favoritesTab='';favorites.dataset.count='0';favorites.textContent='收藏夹'}
    const mode=document.createElement('div');mode.className='srs-mode-group';mode.setAttribute('aria-label','刷题模式');mode.append(whole,srs,favorites);
    const subjects=document.createElement('div');subjects.className='srs-subject-group';subjects.setAttribute('aria-label','408 科目');subjects.append(...bar.querySelectorAll('[data-main-subject]:not([data-main-subject="all"])'));
    const status=document.createElement('button');status.type='button';status.className='zhenti-cloud-status';status.dataset.cloudStatus='';status.innerHTML='<i></i><span>检查云同步…</span>';status.title='真题墙云同步';
    divider?.remove();bar.replaceChildren(mode,subjects,status);bar.classList.add('has-srs-groups');bar.dataset.everaBootBank='1';
  }

  function scan(){
    document.body?.classList.toggle('dark',dark);
    buildNav(document.querySelector('.links'));
    buildNav(document.querySelector('.mobile-panel'),true);
    document.querySelectorAll('[data-menu]').forEach(button=>{if(!button.querySelector('.ui-icon'))button.innerHTML=icon('menu')});
    buildQuestionBank();
  }
  const observer=new MutationObserver(scan);observer.observe(html,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>{scan();observer.disconnect()},{once:true});
  scan();
  window.EveraBoot={version:'20260904-stable2',dark,scan};
})();
